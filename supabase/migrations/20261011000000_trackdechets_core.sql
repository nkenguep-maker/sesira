-- SESIRA Core Workflow — Trackdéchets waste dossier + provider boundary (C46).
--
-- Adds the backend contract for waste dossier tracking (déchets fluide,
-- CED codes) with a strict provider seam. NEVER produces a "bordereau
-- officiel" locally — a bordereau is a provider-issued reference.
--
-- Reference: docs/core/CORE_EXTENSIONS_PLAN.md §7 C46.
--
-- Adds:
--   * NEW `waste_dossiers` — one row per waste event (fluid recovery,
--     equipment disposal). Payload includes waste_code (CED, free text
--     — no hardcoded catalogue), quantity, unit, producer / carrier /
--     destination references (raw strings from operator).
--   * NEW `trackdechets_submissions` — one row per submission attempt.
--     status ∈ PREPARING | READY | PROVIDER_PENDING | SUBMITTED |
--     ACKNOWLEDGED | REJECTED | FAILED | CANCELLED. Terminal
--     immutability via trigger.
--   * 5 SECURITY DEFINER RPCs.
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   Never fake success:
--     * SUBMITTED requires service_role (only after provider HANDED_OFF).
--     * ACKNOWLEDGED requires service_role (only after webhook).
--     * REJECTED requires service_role.
--     * Application code writes PREPARING / READY / PROVIDER_PENDING;
--       real provider outcomes go through service_role RPCs.
--
--   Wording strict:
--     * `dossier_external_id` is the provider identifier — SESIRA never
--       invents one. UI must render it verbatim.
--     * CED codes stored as free text — SESIRA does NOT auto-classify
--       waste (a wrong classification is a regulatory violation).
--
--   Validation observability:
--     * `validation_gaps text[]` on the submission — the calling code
--       populates gaps at prepare time (missing fields, malformed
--       codes). Submission remains PREPARING until gaps are cleared.
--     * Empty gaps + non-null provider_id → moves to READY.
--
--   Terminal immutability:
--     * SUBMITTED / ACKNOWLEDGED / REJECTED / FAILED / CANCELLED are
--       terminal — trigger blocks further mutation.
--
-- Non-goals (deferred):
--   * Trackdéchets XML/JSON payload serializer — provider-adapter
--     concern (TS side, hors périmètre migration).
--   * Auto-verification of CED codes against an official catalogue —
--     deferred until an official reference lands.

-- =========================================================================
-- Section 1 — waste_dossiers
-- =========================================================================
create table public.waste_dossiers (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  intervention_id   uuid,
  customer_id       uuid,
  site_id           uuid,
  waste_category    text not null check (length(waste_category) between 1 and 120),
  waste_code        text check (waste_code is null or length(waste_code) between 1 and 20),
  quantity          numeric(12, 3) not null check (quantity >= 0),
  unit              text not null check (length(unit) between 1 and 10),
  producer_ref      text check (producer_ref is null or length(producer_ref) between 1 and 200),
  carrier_ref       text check (carrier_ref is null or length(carrier_ref) between 1 and 200),
  destination_ref   text check (destination_ref is null or length(destination_ref) between 1 and 200),
  status            text not null default 'PREPARING'
    check (status in ('PREPARING', 'READY', 'SUBMITTED', 'CANCELLED')),
  metadata          jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (intervention_id, organization_id) references public.interventions(id, organization_id) on delete set null,
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete set null,
  unique (id, organization_id)
);

comment on table public.waste_dossiers is
  'One row per waste event. waste_code is free text (CED / European waste codes) — SESIRA does NOT auto-classify. producer_ref / carrier_ref / destination_ref are operator-provided strings.';

create index wd_org_status_idx on public.waste_dossiers (organization_id, status);
create index wd_org_intervention_idx on public.waste_dossiers (organization_id, intervention_id)
  where intervention_id is not null;

alter table public.waste_dossiers enable row level security;

create policy wd_select on public.waste_dossiers
  for select to authenticated using (private.is_organization_member(organization_id));
create policy wd_insert on public.waste_dossiers
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy wd_update on public.waste_dossiers
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.waste_dossiers to authenticated;
grant select, insert, update on public.waste_dossiers to service_role;

-- =========================================================================
-- Section 2 — trackdechets_submissions
-- =========================================================================
create table public.trackdechets_submissions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  waste_dossier_id      uuid not null,
  provider_id           uuid,  -- FK trust_providers or a future integrations row
  dossier_external_id   text check (dossier_external_id is null or length(dossier_external_id) between 1 and 200),
  payload_snapshot      jsonb not null default '{}'::jsonb check (jsonb_typeof(payload_snapshot) = 'object'),
  validation_gaps       text[] not null default '{}',
  status                text not null default 'PREPARING'
    check (status in (
      'PREPARING', 'READY', 'PROVIDER_PENDING', 'SUBMITTED',
      'ACKNOWLEDGED', 'REJECTED', 'FAILED', 'CANCELLED'
    )),
  external_ref          text check (external_ref is null or length(external_ref) between 1 and 200),
  submitted_at          timestamptz,
  acknowledged_at       timestamptz,
  rejection_reason      text check (rejection_reason is null or length(rejection_reason) <= 1000),
  idempotency_key       text check (idempotency_key is null or length(idempotency_key) between 1 and 200),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (waste_dossier_id, organization_id) references public.waste_dossiers(id, organization_id) on delete cascade,
  unique (organization_id, idempotency_key)
);

comment on table public.trackdechets_submissions is
  'One row per submission attempt to Trackdéchets. state machine PREPARING → READY → PROVIDER_PENDING → SUBMITTED → ACKNOWLEDGED (+ REJECTED / FAILED / CANCELLED terminal branches). external_ref is the provider bordereau id — SESIRA never invents one.';

create index tds_org_status_idx on public.trackdechets_submissions (organization_id, status);
create index tds_org_dossier_idx on public.trackdechets_submissions (organization_id, waste_dossier_id);

alter table public.trackdechets_submissions enable row level security;

create policy tds_select on public.trackdechets_submissions
  for select to authenticated using (private.is_organization_member(organization_id));
create policy tds_insert on public.trackdechets_submissions
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy tds_update on public.trackdechets_submissions
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.trackdechets_submissions to authenticated;
grant select, insert, update on public.trackdechets_submissions to service_role;

create or replace function private.enforce_trackdechets_submission_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = old.status then
    return new;
  end if;
  if old.status in ('SUBMITTED', 'ACKNOWLEDGED', 'REJECTED', 'FAILED', 'CANCELLED') then
    raise exception 'trackdechets_submission: terminal state % is immutable (id=%)', old.status, old.id
      using errcode = '22023';
  end if;
  if not (
    (old.status = 'PREPARING'         and new.status in ('READY', 'CANCELLED'))
    or (old.status = 'READY'             and new.status in ('PROVIDER_PENDING', 'CANCELLED'))
    or (old.status = 'PROVIDER_PENDING'  and new.status in ('SUBMITTED', 'FAILED', 'CANCELLED'))
    or (old.status = 'SUBMITTED'         and new.status in ('ACKNOWLEDGED', 'REJECTED', 'FAILED'))
  ) then
    raise exception 'trackdechets_submission: illegal transition % → % (id=%)', old.status, new.status, old.id
      using errcode = '22023';
  end if;
  if new.status = 'SUBMITTED' and new.submitted_at is null then
    new.submitted_at := now();
  end if;
  if new.status = 'ACKNOWLEDGED' and new.acknowledged_at is null then
    new.acknowledged_at := now();
  end if;
  return new;
end;
$$;

create trigger tds_enforce_state
  before update on public.trackdechets_submissions
  for each row execute function private.enforce_trackdechets_submission_state();

-- =========================================================================
-- Section 3 — create_waste_dossier RPC
-- =========================================================================
create or replace function public.create_waste_dossier(
  target_organization_id  uuid,
  target_intervention_id  uuid,
  target_customer_id      uuid,
  target_site_id          uuid,
  target_waste_category   text,
  target_waste_code       text,
  target_quantity         numeric,
  target_unit             text,
  target_producer_ref     text,
  target_carrier_ref      text,
  target_destination_ref  text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'create_waste_dossier: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_waste_category is null or length(target_waste_category) = 0 then
    raise exception 'create_waste_dossier: waste_category required'
      using errcode = '22023';
  end if;
  if target_quantity is null or target_quantity < 0 then
    raise exception 'create_waste_dossier: quantity must be >= 0'
      using errcode = '22023';
  end if;
  if target_unit is null or length(target_unit) = 0 then
    raise exception 'create_waste_dossier: unit required'
      using errcode = '22023';
  end if;

  insert into public.waste_dossiers (
    organization_id, intervention_id, customer_id, site_id,
    waste_category, waste_code, quantity, unit,
    producer_ref, carrier_ref, destination_ref, status
  ) values (
    target_organization_id, target_intervention_id, target_customer_id, target_site_id,
    target_waste_category, target_waste_code, target_quantity, target_unit,
    target_producer_ref, target_carrier_ref, target_destination_ref, 'PREPARING'
  )
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'waste_dossier.create',
    'waste_dossier', new_id,
    jsonb_build_object(
      'waste_category', target_waste_category,
      'waste_code', target_waste_code,
      'quantity', target_quantity,
      'unit', target_unit
    )
  );
  return new_id;
end;
$$;

revoke all on function public.create_waste_dossier(uuid, uuid, uuid, uuid, text, text, numeric, text, text, text, text) from public, anon;
grant execute on function public.create_waste_dossier(uuid, uuid, uuid, uuid, text, text, numeric, text, text, text, text) to authenticated, service_role;

-- =========================================================================
-- Section 4 — prepare_trackdechets_submission RPC
-- =========================================================================
create or replace function public.prepare_trackdechets_submission(
  target_organization_id  uuid,
  target_waste_dossier_id uuid,
  target_provider_id      uuid,
  target_idempotency_key  text,
  target_payload_snapshot jsonb
)
returns table (
  submission_id uuid,
  status        text,
  gaps          text[],
  created       boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  dossier_row   public.waste_dossiers%rowtype;
  existing_id   uuid;
  existing_st   text;
  computed_gaps text[] := '{}';
  new_status    text;
  new_id        uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'prepare_trackdechets_submission: caller not authorized'
      using errcode = '42501';
  end if;

  -- Idempotency lookup
  if target_idempotency_key is not null then
    select id, status into existing_id, existing_st
    from public.trackdechets_submissions
    where organization_id = target_organization_id
      and idempotency_key = target_idempotency_key;
    if existing_id is not null then
      submission_id := existing_id;
      status        := existing_st;
      gaps          := (select validation_gaps from public.trackdechets_submissions where id = existing_id);
      created       := false;
      return next;
      return;
    end if;
  end if;

  select * into dossier_row
  from public.waste_dossiers
  where id = target_waste_dossier_id
    and organization_id = target_organization_id;
  if dossier_row.id is null then
    raise exception 'prepare_trackdechets_submission: dossier % not found', target_waste_dossier_id
      using errcode = '22023';
  end if;

  -- Compute validation gaps (observable — not blocking)
  if dossier_row.waste_code is null or length(dossier_row.waste_code) = 0 then
    computed_gaps := array_append(computed_gaps, 'waste_code');
  end if;
  if dossier_row.producer_ref is null then
    computed_gaps := array_append(computed_gaps, 'producer_ref');
  end if;
  if dossier_row.destination_ref is null then
    computed_gaps := array_append(computed_gaps, 'destination_ref');
  end if;

  new_status := case
    when array_length(computed_gaps, 1) is not null then 'PREPARING'
    when target_provider_id is null then 'PREPARING'
    else 'READY'
  end;

  insert into public.trackdechets_submissions (
    organization_id, waste_dossier_id, provider_id, payload_snapshot,
    validation_gaps, status, idempotency_key
  ) values (
    target_organization_id, target_waste_dossier_id, target_provider_id, target_payload_snapshot,
    computed_gaps, new_status, target_idempotency_key
  )
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'trackdechets.prepare',
    'trackdechets_submission', new_id,
    jsonb_build_object('status', new_status, 'gaps', to_jsonb(computed_gaps))
  );

  submission_id := new_id;
  status        := new_status;
  gaps          := computed_gaps;
  created       := true;
  return next;
end;
$$;

revoke all on function public.prepare_trackdechets_submission(uuid, uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.prepare_trackdechets_submission(uuid, uuid, uuid, text, jsonb) to authenticated, service_role;

-- =========================================================================
-- Section 5 — mark_provider_pending / submitted / acknowledged / rejected
-- =========================================================================
create or replace function public.mark_trackdechets_provider_pending(
  target_organization_id uuid,
  target_submission_id   uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if not private.is_organization_member(target_organization_id)
     and (select auth.role()) <> 'service_role' then
    raise exception 'mark_trackdechets_provider_pending: not authorized'
      using errcode = '42501';
  end if;
  update public.trackdechets_submissions
    set status = 'PROVIDER_PENDING'
  where id = target_submission_id
    and organization_id = target_organization_id
    and status = 'READY';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'trackdechets.provider_pending',
      'trackdechets_submission', target_submission_id, '{}'::jsonb
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_trackdechets_provider_pending(uuid, uuid) from public, anon;
grant execute on function public.mark_trackdechets_provider_pending(uuid, uuid) to authenticated, service_role;

create or replace function public.mark_trackdechets_submitted(
  target_organization_id uuid,
  target_submission_id   uuid,
  target_external_ref    text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mark_trackdechets_submitted: service_role required'
      using errcode = '42501';
  end if;
  if target_external_ref is null or length(target_external_ref) = 0 then
    raise exception 'mark_trackdechets_submitted: external_ref required'
      using errcode = '22023';
  end if;
  update public.trackdechets_submissions
    set status       = 'SUBMITTED',
        external_ref = target_external_ref,
        submitted_at = now()
  where id = target_submission_id
    and organization_id = target_organization_id
    and status = 'PROVIDER_PENDING';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'trackdechets.submitted',
      'trackdechets_submission', target_submission_id,
      jsonb_build_object('external_ref', target_external_ref)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_trackdechets_submitted(uuid, uuid, text) from public, anon;
grant execute on function public.mark_trackdechets_submitted(uuid, uuid, text) to service_role;

create or replace function public.mark_trackdechets_acknowledged(
  target_organization_id uuid,
  target_submission_id   uuid,
  target_provider_ref    text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mark_trackdechets_acknowledged: service_role required'
      using errcode = '42501';
  end if;
  update public.trackdechets_submissions
    set status          = 'ACKNOWLEDGED',
        acknowledged_at = now(),
        dossier_external_id = coalesce(target_provider_ref, dossier_external_id)
  where id = target_submission_id
    and organization_id = target_organization_id
    and status = 'SUBMITTED';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'trackdechets.acknowledged',
      'trackdechets_submission', target_submission_id,
      jsonb_build_object('provider_ref', target_provider_ref)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_trackdechets_acknowledged(uuid, uuid, text) from public, anon;
grant execute on function public.mark_trackdechets_acknowledged(uuid, uuid, text) to service_role;

create or replace function public.mark_trackdechets_rejected(
  target_organization_id uuid,
  target_submission_id   uuid,
  target_reason          text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mark_trackdechets_rejected: service_role required'
      using errcode = '42501';
  end if;
  update public.trackdechets_submissions
    set status = 'REJECTED',
        rejection_reason = target_reason
  where id = target_submission_id
    and organization_id = target_organization_id
    and status = 'SUBMITTED';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'trackdechets.rejected',
      'trackdechets_submission', target_submission_id,
      jsonb_build_object('reason', target_reason)
    );
    perform public.insert_attention_once(
      target_organization_id,
      'attention:waste_submission_rejected:' || target_submission_id::text,
      'REGULATORY',
      'WASTE_SUBMISSION_REJECTED',
      'Bordereau déchets rejeté',
      'HIGH',
      'trackdechets_submission', target_submission_id,
      coalesce(target_reason, 'REJECTED'),
      'Corriger le dossier et resoumettre.',
      null, null, '{}'::jsonb
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_trackdechets_rejected(uuid, uuid, text) from public, anon;
grant execute on function public.mark_trackdechets_rejected(uuid, uuid, text) to service_role;

create or replace function public.cancel_trackdechets_submission(
  target_organization_id uuid,
  target_submission_id   uuid,
  target_reason          text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'cancel_trackdechets_submission: caller not authorized'
      using errcode = '42501';
  end if;
  update public.trackdechets_submissions
    set status = 'CANCELLED',
        rejection_reason = target_reason
  where id = target_submission_id
    and organization_id = target_organization_id
    and status in ('PREPARING', 'READY', 'PROVIDER_PENDING');
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'trackdechets.cancel',
      'trackdechets_submission', target_submission_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.cancel_trackdechets_submission(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_trackdechets_submission(uuid, uuid, text) to authenticated, service_role;
