-- SESIRA Core Workflow — interventions core (C25).
--
-- Lightweight intervention domain. NOT a full ERP planner —
-- assignment/dispatch UIs live in a future product surface.
--
-- Model:
--   * intervention scoped to an org, a customer, and an
--     originating commercial record (opportunity_id nullable —
--     an ad-hoc intervention without a commercial trail is
--     allowed for backwards compat with imported jobs);
--   * assignee = auth.users.id, must be an ACTIVE org member;
--   * scheduled_at nullable — a NEEDS_SCHEDULING intervention
--     is a valid state;
--   * lifecycle:
--       PLANNED → CONFIRMED → IN_PROGRESS → COMPLETED
--       (any) → CANCELLED
--       (any non-terminal) → NEEDS_ATTENTION → back to PLANNED
--                                     or → CANCELLED
--   * `intervention.scheduled` and `intervention.completed`
--     events emitted on those transitions — feeds the C19
--     sold_not_scheduled_opportunities detector (which was
--     watching for exactly these markers).
--
-- DOCTRINE INVARIANTS:
--
--   * Assignment integrity: `assert_tenant_active_assignment`
--     (existing helper from C0 assignment safety) — an
--     intervention cannot be assigned to a non-ACTIVE or
--     cross-tenant user.
--   * State machine authoritative — trigger enforces valid
--     transitions on authenticated writes; RPC re-imposes
--     for service_role callers.
--   * Events atomic: state transitions in the same statement
--     as the `insert_event_once` call so a replay observes
--     the same event.

create table public.interventions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  customer_id           uuid not null,
  opportunity_id        uuid,
  quote_id              uuid,
  title                 text not null check (length(title) between 1 and 200),
  description           text check (description is null or length(description) <= 4000),
  address_line1         text check (address_line1 is null or length(address_line1) <= 200),
  address_line2         text check (address_line2 is null or length(address_line2) <= 200),
  address_postal_code   text check (address_postal_code is null or length(address_postal_code) <= 20),
  address_city          text check (address_city is null or length(address_city) <= 100),
  address_country_code  text check (address_country_code is null or char_length(address_country_code) = 2),
  assigned_user_id      uuid,
  scheduled_at          timestamptz,
  duration_minutes      integer check (duration_minutes is null or duration_minutes between 5 and 1440),
  status                text not null default 'PLANNED'
    check (status in ('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_ATTENTION')),
  notes                 text check (notes is null or length(notes) <= 4000),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  completed_at          timestamptz,
  cancelled_at          timestamptz,
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete restrict,
  foreign key (opportunity_id, organization_id) references public.opportunities(id, organization_id) on delete set null,
  foreign key (quote_id, organization_id) references public.quotes(id, organization_id) on delete set null,
  unique (id, organization_id)
);

comment on table public.interventions is
  'Lightweight intervention domain. NOT an ERP. Scoped to a customer + optionally an opportunity/quote. Assignment via assert_tenant_active_assignment. State machine: PLANNED → CONFIRMED → IN_PROGRESS → COMPLETED, any → CANCELLED, any → NEEDS_ATTENTION → (PLANNED | CANCELLED).';

create index interventions_org_status_idx on public.interventions (organization_id, status);
create index interventions_org_scheduled_idx on public.interventions (organization_id, scheduled_at)
  where scheduled_at is not null and status in ('PLANNED', 'CONFIRMED');
create index interventions_org_assignee_idx on public.interventions (organization_id, assigned_user_id)
  where assigned_user_id is not null;
create index interventions_org_opportunity_idx on public.interventions (organization_id, opportunity_id)
  where opportunity_id is not null;

alter table public.interventions enable row level security;

create policy interventions_select on public.interventions
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy interventions_insert on public.interventions
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy interventions_update on public.interventions
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.interventions to authenticated;
grant select, insert, update on public.interventions to service_role;

-- =========================================================================
-- State machine trigger — same short-circuit pattern as quotes
-- =========================================================================
create or replace function private.enforce_intervention_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('COMPLETED', 'CANCELLED') then
    raise exception 'intervention % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'PLANNED'         and new.status in ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_ATTENTION')) or
    (old.status = 'CONFIRMED'       and new.status in ('IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_ATTENTION')) or
    (old.status = 'IN_PROGRESS'     and new.status in ('COMPLETED', 'CANCELLED', 'NEEDS_ATTENTION')) or
    (old.status = 'NEEDS_ATTENTION' and new.status in ('PLANNED', 'CANCELLED')) or
    (old.status = new.status)
  ) then
    raise exception 'intervention % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if new.status = 'COMPLETED' and new.completed_at is null then
    new.completed_at := now();
  end if;
  if new.status = 'CANCELLED' and new.cancelled_at is null then
    new.cancelled_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger interventions_state_transition
  before update on public.interventions
  for each row execute function private.enforce_intervention_state_transition();

-- =========================================================================
-- Assignment integrity — reuse the C0 guard
-- =========================================================================
create or replace function private.enforce_interventions_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_tenant_active_assignment(new.organization_id, new.assigned_user_id);
  return new;
end;
$$;

create trigger interventions_enforce_assignment
  before insert or update on public.interventions
  for each row execute function private.enforce_interventions_assignment();

comment on function private.enforce_interventions_assignment() is
  'BEFORE INSERT/UPDATE trigger on interventions.assigned_user_id. SECURITY DEFINER so it can invoke the (revoked-from-all) private.assert_tenant_active_assignment helper. Same pattern as enforce_requests_assignment (C8).';

-- =========================================================================
-- schedule_intervention — schedule + emit intervention.scheduled event
-- =========================================================================
create or replace function public.schedule_intervention(
  target_organization_id uuid,
  target_intervention_id uuid,
  target_scheduled_at    timestamptz,
  target_duration_minutes integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected  integer;
  opp_id    uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'schedule_intervention: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_scheduled_at is null or target_scheduled_at <= now() then
    raise exception 'schedule_intervention: scheduled_at must be in the future'
      using errcode = '22023';
  end if;

  update public.interventions
    set scheduled_at    = target_scheduled_at,
        duration_minutes = target_duration_minutes,
        status          = case when status = 'PLANNED' then 'CONFIRMED' else status end
  where id = target_intervention_id
    and organization_id = target_organization_id
    and status in ('PLANNED', 'CONFIRMED')
  returning opportunity_id into opp_id;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.insert_event_once(
      target_organization_id,
      'intervention:scheduled:' || target_intervention_id::text || ':' || target_scheduled_at::text,
      'intervention.scheduled', 'CORE',
      case when opp_id is not null then 'opportunity' else 'intervention' end,
      coalesce(opp_id, target_intervention_id),
      jsonb_build_object(
        'intervention_id', target_intervention_id,
        'scheduled_at', to_char(target_scheduled_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.schedule_intervention(uuid, uuid, timestamptz, integer) from public, anon;
grant execute on function public.schedule_intervention(uuid, uuid, timestamptz, integer) to authenticated, service_role;

-- =========================================================================
-- complete_intervention — mark COMPLETED + emit intervention.completed event
-- =========================================================================
create or replace function public.complete_intervention(
  target_organization_id uuid,
  target_intervention_id uuid,
  target_notes           text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected  integer;
  opp_id    uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'complete_intervention: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.interventions
    set status       = 'COMPLETED',
        completed_at = now(),
        notes        = coalesce(target_notes, notes)
  where id = target_intervention_id
    and organization_id = target_organization_id
    and status in ('CONFIRMED', 'IN_PROGRESS')
  returning opportunity_id into opp_id;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.insert_event_once(
      target_organization_id,
      'intervention:completed:' || target_intervention_id::text,
      'intervention.completed', 'CORE',
      case when opp_id is not null then 'opportunity' else 'intervention' end,
      coalesce(opp_id, target_intervention_id),
      jsonb_build_object('intervention_id', target_intervention_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.complete_intervention(uuid, uuid, text) from public, anon;
grant execute on function public.complete_intervention(uuid, uuid, text) to authenticated, service_role;

comment on function public.complete_intervention(uuid, uuid, text) is
  'Transition an intervention CONFIRMED/IN_PROGRESS → COMPLETED. Emits intervention.completed event on the opportunity so the C19 sold_not_scheduled detector clears it.';
