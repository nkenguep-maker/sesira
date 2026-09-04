-- SESIRA Core Workflow — maintenance & renewals (C29).
--
-- Recurring maintenance contract lifecycle. NOT a scheduling
-- planner — visit interventions are created via the C25
-- intervention workflow; contracts track cadence, expiry, and
-- renewal cycle only.
--
-- Model:
--   contract ↔ customer (required) + optional link to an
--   originating quote. A contract owns:
--     - cadence_days: nominal interval between maintenance visits
--     - start_date / end_date: contract term
--     - last_visit_at / next_visit_due_at: sliding window
--   Visits themselves are `public.interventions` rows that carry
--   `metadata->>'maintenance_contract_id' = <contract_id>`
--   (no schema change to interventions; keeps C25 shape stable).
--
-- Lifecycle:
--   DRAFT → ACTIVE → EXPIRING_SOON → EXPIRED (terminal)
--   ACTIVE → EXPIRED (fallback if scan missed EXPIRING_SOON)
--   EXPIRING_SOON → ACTIVE (contract extended before expiry)
--   any non-terminal → CANCELLED (terminal — early termination)
--
-- DOCTRINE INVARIANTS:
--
--   * AI is NEVER involved in renewal pricing, contract terms,
--     cancellation decisions, or dispute handling. AI may only
--     DRAFT renewal wording in a separate boundary (out of
--     scope here).
--   * scan_maintenance_renewals is deterministic (rule =
--     end_date <= now() + N days) and idempotent — emits ONE
--     RENEWAL_DUE attention per contract flip.
--   * record_maintenance_visit only records a visit if the
--     linked intervention is COMPLETED in the same org (SoD +
--     tenant safety). next_visit_due_at is bumped by cadence.
--   * cancel_maintenance_contract requires a non-empty reason
--     and an ACTIVE org member as canceller (audit).
--   * Renewal notification (`record_renewal_notice`) is human-
--     triggered — sender must be ACTIVE org member. AI never
--     sends renewal comms directly.

create table public.maintenance_contracts (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  customer_id               uuid not null,
  quote_id                  uuid,
  title                     text not null check (length(title) between 1 and 200),
  external_ref              text check (external_ref is null or length(external_ref) <= 200),
  cadence_days              integer not null check (cadence_days between 7 and 3650),
  amount                    numeric(14,2) check (amount is null or amount >= 0),
  currency                  text not null default 'EUR' check (char_length(currency) = 3),
  status                    text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED')),
  start_date                date,
  end_date                  date,
  last_visit_at             timestamptz,
  next_visit_due_at         timestamptz,
  renewal_notice_sent_at    timestamptz,
  cancellation_reason       text check (cancellation_reason is null or length(cancellation_reason) <= 500),
  cancelled_at              timestamptz,
  provenance                jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata                  jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete restrict,
  foreign key (quote_id, organization_id) references public.quotes(id, organization_id) on delete set null,
  unique (organization_id, external_ref) deferrable initially deferred,
  unique (id, organization_id),
  check (end_date is null or start_date is null or end_date >= start_date)
);

comment on table public.maintenance_contracts is
  'Recurring maintenance contract. Cadence + expiry tracking. Visits are public.interventions rows carrying metadata->>maintenance_contract_id. State machine: DRAFT → ACTIVE → EXPIRING_SOON → EXPIRED; any non-terminal → CANCELLED. AI never involved in renewal/pricing decisions.';

create index maintenance_contracts_org_status_idx on public.maintenance_contracts (organization_id, status);
create index maintenance_contracts_org_customer_idx on public.maintenance_contracts (organization_id, customer_id);
create index maintenance_contracts_org_next_visit_idx on public.maintenance_contracts (organization_id, next_visit_due_at)
  where status in ('ACTIVE', 'EXPIRING_SOON') and next_visit_due_at is not null;
create index maintenance_contracts_org_end_date_idx on public.maintenance_contracts (organization_id, end_date)
  where status in ('ACTIVE', 'EXPIRING_SOON') and end_date is not null;

alter table public.maintenance_contracts enable row level security;

create policy maintenance_contracts_select on public.maintenance_contracts
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy maintenance_contracts_insert on public.maintenance_contracts
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy maintenance_contracts_update on public.maintenance_contracts
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.maintenance_contracts to authenticated;
grant select, insert, update on public.maintenance_contracts to service_role;

-- =========================================================================
-- State machine trigger — same short-circuit pattern as C28 invoices
-- =========================================================================
create or replace function private.enforce_maintenance_contract_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('EXPIRED', 'CANCELLED') then
    raise exception 'maintenance_contract % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'DRAFT'          and new.status in ('ACTIVE', 'CANCELLED')) or
    (old.status = 'ACTIVE'         and new.status in ('EXPIRING_SOON', 'EXPIRED', 'CANCELLED')) or
    (old.status = 'EXPIRING_SOON'  and new.status in ('ACTIVE', 'EXPIRED', 'CANCELLED')) or
    (old.status = new.status)
  ) then
    raise exception 'maintenance_contract % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger maintenance_contracts_state_transition
  before update on public.maintenance_contracts
  for each row execute function private.enforce_maintenance_contract_state_transition();

-- =========================================================================
-- activate_maintenance_contract — DRAFT → ACTIVE
-- =========================================================================
create or replace function public.activate_maintenance_contract(
  target_organization_id uuid,
  target_contract_id     uuid,
  target_start_date      date,
  target_end_date        date,
  target_cadence_days    integer,
  target_amount          numeric,
  target_currency        text,
  target_external_ref    text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  computed_next_visit timestamptz;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'activate_maintenance_contract: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_start_date is null then
    raise exception 'activate_maintenance_contract: start_date is required'
      using errcode = '22023';
  end if;
  if target_end_date is not null and target_end_date < target_start_date then
    raise exception 'activate_maintenance_contract: end_date (%) cannot be before start_date (%)',
      target_end_date, target_start_date
      using errcode = '22023';
  end if;
  if target_cadence_days is null or target_cadence_days < 7 or target_cadence_days > 3650 then
    raise exception 'activate_maintenance_contract: cadence_days must be between 7 and 3650 (got %)', target_cadence_days
      using errcode = '22023';
  end if;

  computed_next_visit := (target_start_date::timestamptz);

  update public.maintenance_contracts
    set status            = 'ACTIVE',
        start_date        = target_start_date,
        end_date          = coalesce(target_end_date, end_date),
        cadence_days      = target_cadence_days,
        amount            = coalesce(target_amount, amount),
        currency          = coalesce(target_currency, currency),
        external_ref      = coalesce(target_external_ref, external_ref),
        next_visit_due_at = computed_next_visit
  where id = target_contract_id
    and organization_id = target_organization_id
    and status = 'DRAFT';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'maintenance_contract.activate',
      'maintenance_contract', target_contract_id,
      jsonb_build_object(
        'start_date', target_start_date,
        'end_date', target_end_date,
        'cadence_days', target_cadence_days,
        'amount', target_amount,
        'currency', target_currency
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.activate_maintenance_contract(uuid, uuid, date, date, integer, numeric, text, text) from public, anon;
grant execute on function public.activate_maintenance_contract(uuid, uuid, date, date, integer, numeric, text, text) to authenticated, service_role;

-- =========================================================================
-- record_maintenance_visit — visit intervention COMPLETED → advance window
-- =========================================================================
-- Requires the linked intervention to be COMPLETED in the same org
-- (tenant safety + SoD). Bumps last_visit_at + next_visit_due_at
-- (by cadence_days). Does not change contract status.
create or replace function public.record_maintenance_visit(
  target_organization_id uuid,
  target_contract_id     uuid,
  target_intervention_id uuid,
  target_visited_at      timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  contract_cadence integer;
  intervention_ok  boolean;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_maintenance_visit: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_visited_at is null then
    raise exception 'record_maintenance_visit: visited_at is required'
      using errcode = '22023';
  end if;

  select exists (
    select 1 from public.interventions
    where id = target_intervention_id
      and organization_id = target_organization_id
      and status = 'COMPLETED'
  ) into intervention_ok;

  if not intervention_ok then
    raise exception 'record_maintenance_visit: intervention % must be COMPLETED in organization %',
      target_intervention_id, target_organization_id
      using errcode = '22023';
  end if;

  select cadence_days into contract_cadence
  from public.maintenance_contracts
  where id = target_contract_id
    and organization_id = target_organization_id
    and status in ('ACTIVE', 'EXPIRING_SOON');

  if contract_cadence is null then
    return false;
  end if;

  update public.maintenance_contracts
    set last_visit_at     = target_visited_at,
        next_visit_due_at = target_visited_at + make_interval(days => contract_cadence)
  where id = target_contract_id
    and organization_id = target_organization_id
    and status in ('ACTIVE', 'EXPIRING_SOON');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'maintenance_contract.visit_recorded',
      'maintenance_contract', target_contract_id,
      jsonb_build_object(
        'intervention_id', target_intervention_id,
        'visited_at', to_char(target_visited_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'cadence_days', contract_cadence
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_maintenance_visit(uuid, uuid, uuid, timestamptz) from public, anon;
grant execute on function public.record_maintenance_visit(uuid, uuid, uuid, timestamptz) to authenticated, service_role;

-- =========================================================================
-- scan_maintenance_renewals — bulk transition + attention emit
-- =========================================================================
-- Deterministic scan. For each ACTIVE contract with
-- end_date <= now() + N days → EXPIRING_SOON + attention.
-- For each ACTIVE/EXPIRING_SOON contract with end_date < now() → EXPIRED.
-- Idempotent: attention has an idempotency key per contract flip.
create or replace function public.scan_maintenance_renewals(
  target_organization_id uuid,
  target_days_ahead      integer
)
returns table (
  contract_id uuid,
  new_status  text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.maintenance_contracts%rowtype;
  soon_cutoff date;
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'scan_maintenance_renewals: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_days_ahead is null or target_days_ahead < 0 or target_days_ahead > 365 then
    raise exception 'scan_maintenance_renewals: days_ahead must be in [0, 365] (got %)', target_days_ahead
      using errcode = '22023';
  end if;

  soon_cutoff := (now() + make_interval(days => target_days_ahead))::date;

  -- 1) EXPIRED first (unambiguous terminal)
  for rec in
    select * from public.maintenance_contracts
    where organization_id = target_organization_id
      and status in ('ACTIVE', 'EXPIRING_SOON')
      and end_date is not null
      and end_date < now()::date
    for update
  loop
    update public.maintenance_contracts
      set status = 'EXPIRED'
    where id = rec.id
      and organization_id = target_organization_id
      and status in ('ACTIVE', 'EXPIRING_SOON');

    perform public.record_audit_log(
      target_organization_id, 'maintenance_contract.expire',
      'maintenance_contract', rec.id,
      jsonb_build_object('end_date', rec.end_date)
    );

    contract_id := rec.id;
    new_status  := 'EXPIRED';
    return next;
  end loop;

  -- 2) EXPIRING_SOON — attention emitted once per contract
  for rec in
    select * from public.maintenance_contracts
    where organization_id = target_organization_id
      and status = 'ACTIVE'
      and end_date is not null
      and end_date <= soon_cutoff
    for update
  loop
    update public.maintenance_contracts
      set status = 'EXPIRING_SOON'
    where id = rec.id
      and organization_id = target_organization_id
      and status = 'ACTIVE';

    perform public.insert_attention_once(
      target_organization_id,
      'attention:maintenance_renewal_due:' || rec.id::text,
      'OPERATIONS',
      'RENEWAL_DUE',
      format('Contrat maintenance à renouveler (%s)', rec.title),
      'NORMAL',
      'maintenance_contract',
      rec.id,
      format('Contrat %s expire le %s. Préparer proposition de renouvellement.',
             coalesce(rec.external_ref, rec.id::text),
             rec.end_date),
      'Contacter client, proposer renouvellement ou décider de laisser expirer.',
      null, null,
      jsonb_build_object(
        'contract_id', rec.id,
        'end_date', rec.end_date,
        'customer_id', rec.customer_id,
        'amount', rec.amount,
        'currency', rec.currency
      )
    );

    perform public.record_audit_log(
      target_organization_id, 'maintenance_contract.expiring_soon',
      'maintenance_contract', rec.id,
      jsonb_build_object('end_date', rec.end_date, 'days_ahead', target_days_ahead)
    );

    contract_id := rec.id;
    new_status  := 'EXPIRING_SOON';
    return next;
  end loop;
end;
$$;

revoke all on function public.scan_maintenance_renewals(uuid, integer) from public, anon;
grant execute on function public.scan_maintenance_renewals(uuid, integer) to authenticated, service_role;

comment on function public.scan_maintenance_renewals(uuid, integer) is
  'Deterministic scan. ACTIVE contracts past end_date → EXPIRED. ACTIVE with end_date ≤ now() + N days → EXPIRING_SOON + ONE RENEWAL_DUE attention per flip. NOT AI. Idempotent.';

-- =========================================================================
-- record_renewal_notice — track a manual renewal notice send
-- =========================================================================
create or replace function public.record_renewal_notice(
  target_organization_id uuid,
  target_contract_id     uuid,
  target_sent_by_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_renewal_notice: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_sent_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'record_renewal_notice: sender % is not an ACTIVE member of organization %',
      target_sent_by_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.maintenance_contracts
    set renewal_notice_sent_at = now()
  where id = target_contract_id
    and organization_id = target_organization_id
    and status in ('ACTIVE', 'EXPIRING_SOON');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'maintenance_contract.renewal_notice',
      'maintenance_contract', target_contract_id,
      jsonb_build_object('sent_by_user_id', target_sent_by_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_renewal_notice(uuid, uuid, uuid) from public, anon;
grant execute on function public.record_renewal_notice(uuid, uuid, uuid) to authenticated, service_role;

-- =========================================================================
-- cancel_maintenance_contract — any non-terminal → CANCELLED
-- =========================================================================
create or replace function public.cancel_maintenance_contract(
  target_organization_id uuid,
  target_contract_id     uuid,
  target_reason          text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'cancel_maintenance_contract: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 500 then
    raise exception 'cancel_maintenance_contract: reason must be a non-empty string ≤500 chars'
      using errcode = '22023';
  end if;

  update public.maintenance_contracts
    set status              = 'CANCELLED',
        cancelled_at        = now(),
        cancellation_reason = target_reason
  where id = target_contract_id
    and organization_id = target_organization_id
    and status in ('DRAFT', 'ACTIVE', 'EXPIRING_SOON');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'maintenance_contract.cancel',
      'maintenance_contract', target_contract_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.cancel_maintenance_contract(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_maintenance_contract(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- due_maintenance_visits — read function for scheduling
-- =========================================================================
create or replace function public.due_maintenance_visits(
  target_organization_id uuid,
  target_days_ahead      integer
)
returns table (
  contract_id       uuid,
  customer_id       uuid,
  title             text,
  external_ref      text,
  cadence_days      integer,
  next_visit_due_at timestamptz,
  last_visit_at     timestamptz,
  end_date          date
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'due_maintenance_visits: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_days_ahead is null or target_days_ahead < 0 or target_days_ahead > 365 then
    raise exception 'due_maintenance_visits: days_ahead must be in [0, 365] (got %)', target_days_ahead
      using errcode = '22023';
  end if;

  return query
  select
    c.id,
    c.customer_id,
    c.title,
    c.external_ref,
    c.cadence_days,
    c.next_visit_due_at,
    c.last_visit_at,
    c.end_date
  from public.maintenance_contracts c
  where c.organization_id = target_organization_id
    and c.status in ('ACTIVE', 'EXPIRING_SOON')
    and c.next_visit_due_at is not null
    and c.next_visit_due_at <= now() + make_interval(days => target_days_ahead)
  order by c.next_visit_due_at asc;
end;
$$;

revoke all on function public.due_maintenance_visits(uuid, integer) from public, anon;
grant execute on function public.due_maintenance_visits(uuid, integer) to authenticated, service_role;

comment on function public.due_maintenance_visits(uuid, integer) is
  'List maintenance contracts whose next_visit_due_at is within N days. Feeds the scheduling UI.';

-- =========================================================================
-- expiring_maintenance_contracts — read function for renewal triage
-- =========================================================================
create or replace function public.expiring_maintenance_contracts(
  target_organization_id uuid,
  target_days_ahead      integer
)
returns table (
  contract_id            uuid,
  customer_id            uuid,
  title                  text,
  external_ref           text,
  end_date               date,
  amount                 numeric,
  currency               text,
  renewal_notice_sent_at timestamptz,
  status                 text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'expiring_maintenance_contracts: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_days_ahead is null or target_days_ahead < 0 or target_days_ahead > 365 then
    raise exception 'expiring_maintenance_contracts: days_ahead must be in [0, 365] (got %)', target_days_ahead
      using errcode = '22023';
  end if;

  return query
  select
    c.id,
    c.customer_id,
    c.title,
    c.external_ref,
    c.end_date,
    c.amount,
    c.currency,
    c.renewal_notice_sent_at,
    c.status
  from public.maintenance_contracts c
  where c.organization_id = target_organization_id
    and c.status in ('ACTIVE', 'EXPIRING_SOON')
    and c.end_date is not null
    and c.end_date <= (now() + make_interval(days => target_days_ahead))::date
  order by c.end_date asc;
end;
$$;

revoke all on function public.expiring_maintenance_contracts(uuid, integer) from public, anon;
grant execute on function public.expiring_maintenance_contracts(uuid, integer) to authenticated, service_role;

comment on function public.expiring_maintenance_contracts(uuid, integer) is
  'List maintenance contracts expiring within N days. Feeds the renewal-triage UI.';
