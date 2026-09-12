-- SESIRA Core Workflow — Contract renewals + amendments (C48).
--
-- Adds contract versioning, renewal case workflow with strict guard
-- against silent auto-renewal, and amendment versions signed via C45
-- document trust.
-- Reference: docs/core/CORE_EXTENSIONS_PLAN.md §7 C48.
--
-- Adds:
--   * NEW `contract_versions` — immutable snapshot per version.
--   * NEW `renewal_cases` — state machine
--     DRAFT → REVIEW_REQUIRED → APPROVED → READY_TO_SEND → SENT →
--     CLIENT_ACCEPTED → CANCELLATION_WINDOW → EFFECTIVE
--     + branches DECLINED, CANCELLED, NEEDS_ATTENTION.
--     One active per contract (unique partial).
--   * NEW `amendment_versions` — state machine
--     DRAFT → APPROVED → SENT → EFFECTIVE + SUPERSEDED / CANCELLED.
--     Links to document_versions (C45) via document_version_id.
--   * 7 SECURITY DEFINER RPCs.
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   NO silent auto-renewal:
--     * mark_renewal_effective requires human_approved_at set AND
--       (client_response_at set with source ≠ ambiguous) AND
--       cancellation_deadline < now(). Any missing piece → 22023.
--
--   INV-03 style formula snapshot:
--     * pricing_formula_snapshot captured at propose time — immutable
--       once written (enforced by trigger).
--
--   Wording strict (INV — no "Syntec" hardcoded anywhere in code):
--     * pricing formula reference is text stored on the snapshot,
--       provided by the operator. SESIRA does NOT ship a Syntec
--       coefficient table.
--
--   Amendment trust:
--     * sent_evidence_id references document_trust_evidence (C45).
--       Sending an amendment without a trust evidence is allowed but
--       the read model must render it as "signature interne (non
--       qualifiée)" — that gate lives in C49.
--
-- Non-goals:
--   * pricing_formulas table (deferred — snapshot is enough for now).

-- =========================================================================
-- Section 1 — contract_versions
-- =========================================================================
create table public.contract_versions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id     uuid not null,
  version         integer not null default 1 check (version >= 1),
  effective_from  date not null,
  effective_to    date,
  snapshot_json   jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot_json) = 'object'),
  created_at      timestamptz not null default now(),
  foreign key (contract_id, organization_id) references public.maintenance_contracts(id, organization_id) on delete cascade,
  unique (contract_id, version)
);

comment on table public.contract_versions is
  'Immutable snapshot of a maintenance contract at a given version. Trigger blocks UPDATE.';

create index cv_org_contract_idx on public.contract_versions (organization_id, contract_id, version desc);

alter table public.contract_versions enable row level security;

create policy cv_select on public.contract_versions
  for select to authenticated using (private.is_organization_member(organization_id));
create policy cv_insert on public.contract_versions
  for insert to authenticated with check (private.is_organization_member(organization_id));

grant select, insert on public.contract_versions to authenticated;
grant select, insert on public.contract_versions to service_role;

create or replace function private.enforce_contract_version_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'contract_versions: rows are immutable (id=%)', old.id
    using errcode = '22023';
end;
$$;

create trigger cv_immutable
  before update on public.contract_versions
  for each row execute function private.enforce_contract_version_immutable();

-- =========================================================================
-- Section 2 — renewal_cases
-- =========================================================================
create table public.renewal_cases (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  contract_id              uuid not null,
  opened_at                timestamptz not null default now(),
  status                   text not null default 'DRAFT'
    check (status in (
      'DRAFT', 'REVIEW_REQUIRED', 'APPROVED', 'READY_TO_SEND', 'SENT',
      'CLIENT_ACCEPTED', 'CANCELLATION_WINDOW', 'EFFECTIVE',
      'DECLINED', 'CANCELLED', 'NEEDS_ATTENTION'
    )),
  proposed_amount          numeric(14, 2) check (proposed_amount is null or proposed_amount >= 0),
  proposed_currency        text check (proposed_currency is null or char_length(proposed_currency) = 3),
  pricing_formula_snapshot jsonb check (pricing_formula_snapshot is null or jsonb_typeof(pricing_formula_snapshot) = 'object'),
  formula_captured_at      timestamptz,
  human_approved_at        timestamptz,
  human_approved_by        uuid,
  sent_at                  timestamptz,
  sent_evidence_id         uuid,
  client_response_at       timestamptz,
  client_response_source   text check (client_response_source is null or client_response_source in ('MANUAL', 'EMAIL', 'SIGNED_DOCUMENT')),
  effective_at             timestamptz,
  cancellation_deadline    timestamptz,
  notes                    text check (notes is null or length(notes) <= 2000),
  version                  integer not null default 1 check (version >= 1),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  foreign key (contract_id, organization_id) references public.maintenance_contracts(id, organization_id) on delete cascade,
  foreign key (sent_evidence_id, organization_id) references public.document_trust_evidence(id, organization_id) on delete set null,
  unique (id, organization_id)
);

comment on table public.renewal_cases is
  'One active renewal case per contract (unique partial on non-terminal statuses). Guards against silent auto-renewal: mark_renewal_effective requires human_approved_at AND client_response_at AND cancellation_deadline < now().';

create unique index rc_org_contract_active_uniq on public.renewal_cases
  (organization_id, contract_id)
  where status not in ('EFFECTIVE', 'DECLINED', 'CANCELLED');
create index rc_org_status_idx on public.renewal_cases (organization_id, status);

alter table public.renewal_cases enable row level security;

create policy rc_select on public.renewal_cases
  for select to authenticated using (private.is_organization_member(organization_id));
create policy rc_insert on public.renewal_cases
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy rc_update on public.renewal_cases
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.renewal_cases to authenticated;
grant select, insert, update on public.renewal_cases to service_role;

create or replace function private.enforce_renewal_case_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  -- pricing_formula_snapshot immutable once captured
  if old.pricing_formula_snapshot is not null and new.pricing_formula_snapshot is distinct from old.pricing_formula_snapshot then
    raise exception 'renewal_case: pricing_formula_snapshot immutable (id=%)', old.id
      using errcode = '22023';
  end if;
  if new.status = old.status then
    return new;
  end if;
  if old.status in ('EFFECTIVE', 'DECLINED', 'CANCELLED') then
    raise exception 'renewal_case: terminal state % is immutable (id=%)', old.status, old.id
      using errcode = '22023';
  end if;
  -- Allowed transitions
  if not (
    (old.status = 'DRAFT'                and new.status in ('REVIEW_REQUIRED', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.status = 'REVIEW_REQUIRED'      and new.status in ('APPROVED', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.status = 'APPROVED'             and new.status in ('READY_TO_SEND', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.status = 'READY_TO_SEND'        and new.status in ('SENT', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.status = 'SENT'                 and new.status in ('CLIENT_ACCEPTED', 'DECLINED', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.status = 'CLIENT_ACCEPTED'      and new.status in ('CANCELLATION_WINDOW', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.status = 'CANCELLATION_WINDOW'  and new.status in ('EFFECTIVE', 'CANCELLED', 'NEEDS_ATTENTION'))
    or (old.status = 'NEEDS_ATTENTION'      and new.status in ('REVIEW_REQUIRED', 'APPROVED', 'READY_TO_SEND', 'CANCELLED'))
  ) then
    raise exception 'renewal_case: illegal transition % → % (id=%)', old.status, new.status, old.id
      using errcode = '22023';
  end if;
  -- Guard against silent auto-renewal on → EFFECTIVE
  if new.status = 'EFFECTIVE' then
    if new.human_approved_at is null then
      raise exception 'renewal_case: EFFECTIVE requires human_approved_at (id=%)', old.id
        using errcode = '22023';
    end if;
    if new.client_response_at is null or new.client_response_source is null then
      raise exception 'renewal_case: EFFECTIVE requires client_response_at + source (id=%)', old.id
        using errcode = '22023';
    end if;
    if new.cancellation_deadline is not null and new.cancellation_deadline > now() then
      raise exception 'renewal_case: EFFECTIVE forbidden before cancellation_deadline (id=%)', old.id
        using errcode = '22023';
    end if;
  end if;
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger rc_enforce_state
  before update on public.renewal_cases
  for each row execute function private.enforce_renewal_case_state();

-- =========================================================================
-- Section 3 — amendment_versions
-- =========================================================================
create table public.amendment_versions (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  contract_id         uuid not null,
  amendment_kind      text not null check (length(amendment_kind) between 1 and 60),
  document_version_id uuid,
  drafted_at          timestamptz not null default now(),
  approved_at         timestamptz,
  approved_by         uuid,
  sent_at             timestamptz,
  effective_from      date,
  effective_to        date,
  snapshot_json       jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot_json) = 'object'),
  status              text not null default 'DRAFT'
    check (status in ('DRAFT', 'APPROVED', 'SENT', 'EFFECTIVE', 'SUPERSEDED', 'CANCELLED')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  foreign key (contract_id, organization_id) references public.maintenance_contracts(id, organization_id) on delete cascade,
  foreign key (document_version_id, organization_id) references public.document_versions(id, organization_id) on delete set null
);

comment on table public.amendment_versions is
  'Contract amendments. State machine DRAFT → APPROVED → SENT → EFFECTIVE + SUPERSEDED / CANCELLED. document_version_id points at the C45 document version holding the signed PDF.';

create index av_org_contract_idx on public.amendment_versions (organization_id, contract_id, drafted_at desc);
create index av_org_status_idx on public.amendment_versions (organization_id, status);

alter table public.amendment_versions enable row level security;

create policy av_select on public.amendment_versions
  for select to authenticated using (private.is_organization_member(organization_id));
create policy av_insert on public.amendment_versions
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy av_update on public.amendment_versions
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.amendment_versions to authenticated;
grant select, insert, update on public.amendment_versions to service_role;

create or replace function private.enforce_amendment_version_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = old.status then return new; end if;
  if old.status in ('EFFECTIVE', 'SUPERSEDED', 'CANCELLED') then
    raise exception 'amendment_version: terminal state % immutable (id=%)', old.status, old.id
      using errcode = '22023';
  end if;
  if not (
    (old.status = 'DRAFT'    and new.status in ('APPROVED', 'CANCELLED'))
    or (old.status = 'APPROVED' and new.status in ('SENT', 'CANCELLED'))
    or (old.status = 'SENT'     and new.status in ('EFFECTIVE', 'SUPERSEDED', 'CANCELLED'))
  ) then
    raise exception 'amendment_version: illegal transition % → % (id=%)', old.status, new.status, old.id
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger av_enforce_state
  before update on public.amendment_versions
  for each row execute function private.enforce_amendment_version_state();

-- =========================================================================
-- Section 4 — RPCs (7)
-- =========================================================================
create or replace function public.open_renewal_case(
  target_organization_id uuid,
  target_contract_id     uuid,
  target_cancellation_deadline timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare new_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'open_renewal_case: caller not authorized'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.maintenance_contracts
    where id = target_contract_id and organization_id = target_organization_id
  ) then
    raise exception 'open_renewal_case: contract % not found', target_contract_id
      using errcode = '22023';
  end if;

  insert into public.renewal_cases (
    organization_id, contract_id, status, cancellation_deadline
  ) values (
    target_organization_id, target_contract_id, 'DRAFT', target_cancellation_deadline
  )
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'renewal_case.open',
    'renewal_case', new_id,
    jsonb_build_object('contract_id', target_contract_id)
  );
  return new_id;
end;
$$;

revoke all on function public.open_renewal_case(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.open_renewal_case(uuid, uuid, timestamptz) to authenticated, service_role;

create or replace function public.propose_renewal_amount(
  target_organization_id uuid,
  target_case_id         uuid,
  target_amount          numeric,
  target_currency        text,
  target_formula_snapshot jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'propose_renewal_amount: caller not authorized'
      using errcode = '42501';
  end if;
  if target_amount is null or target_amount < 0 then
    raise exception 'propose_renewal_amount: amount required and >= 0'
      using errcode = '22023';
  end if;
  if char_length(coalesce(target_currency, '')) <> 3 then
    raise exception 'propose_renewal_amount: currency must be 3-letter'
      using errcode = '22023';
  end if;

  update public.renewal_cases
    set status                   = 'REVIEW_REQUIRED',
        proposed_amount          = target_amount,
        proposed_currency        = target_currency,
        pricing_formula_snapshot = coalesce(pricing_formula_snapshot, target_formula_snapshot),
        formula_captured_at      = coalesce(formula_captured_at, now())
  where id = target_case_id
    and organization_id = target_organization_id
    and status = 'DRAFT';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'renewal_case.propose_amount',
      'renewal_case', target_case_id,
      jsonb_build_object('amount', target_amount, 'currency', target_currency)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.propose_renewal_amount(uuid, uuid, numeric, text, jsonb) from public, anon;
grant execute on function public.propose_renewal_amount(uuid, uuid, numeric, text, jsonb) to authenticated, service_role;

create or replace function public.approve_renewal_case(
  target_organization_id uuid,
  target_case_id         uuid,
  target_approver_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'approve_renewal_case: caller not authorized'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_approver_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'approve_renewal_case: approver not ACTIVE member'
      using errcode = '42501';
  end if;

  update public.renewal_cases
    set status            = 'APPROVED',
        human_approved_at = now(),
        human_approved_by = target_approver_user_id
  where id = target_case_id
    and organization_id = target_organization_id
    and status = 'REVIEW_REQUIRED';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'renewal_case.approve',
      'renewal_case', target_case_id,
      jsonb_build_object('approver_user_id', target_approver_user_id)
    );
    -- Mark READY_TO_SEND (single transition path from APPROVED)
    update public.renewal_cases
      set status = 'READY_TO_SEND'
    where id = target_case_id
      and organization_id = target_organization_id
      and status = 'APPROVED';
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.approve_renewal_case(uuid, uuid, uuid) from public, anon;
grant execute on function public.approve_renewal_case(uuid, uuid, uuid) to authenticated, service_role;

create or replace function public.send_renewal_proposal(
  target_organization_id uuid,
  target_case_id         uuid,
  target_sent_evidence_id uuid,
  target_sent_at         timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'send_renewal_proposal: service_role required'
      using errcode = '42501';
  end if;
  update public.renewal_cases
    set status           = 'SENT',
        sent_at          = target_sent_at,
        sent_evidence_id = target_sent_evidence_id
  where id = target_case_id
    and organization_id = target_organization_id
    and status = 'READY_TO_SEND';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'renewal_case.sent',
      'renewal_case', target_case_id,
      jsonb_build_object('sent_evidence_id', target_sent_evidence_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.send_renewal_proposal(uuid, uuid, uuid, timestamptz) from public, anon;
grant execute on function public.send_renewal_proposal(uuid, uuid, uuid, timestamptz) to service_role;

create or replace function public.record_client_response(
  target_organization_id uuid,
  target_case_id         uuid,
  target_response        text,   -- ACCEPTED | DECLINED
  target_source          text,   -- MANUAL | EMAIL | SIGNED_DOCUMENT
  target_at              timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_status text;
  affected   integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_client_response: caller not authorized'
      using errcode = '42501';
  end if;
  if target_response not in ('ACCEPTED', 'DECLINED') then
    raise exception 'record_client_response: response must be ACCEPTED or DECLINED'
      using errcode = '22023';
  end if;
  if target_source not in ('MANUAL', 'EMAIL', 'SIGNED_DOCUMENT') then
    raise exception 'record_client_response: invalid source %', target_source
      using errcode = '22023';
  end if;

  new_status := case when target_response = 'ACCEPTED' then 'CLIENT_ACCEPTED' else 'DECLINED' end;

  update public.renewal_cases
    set status                 = new_status,
        client_response_at     = target_at,
        client_response_source = target_source
  where id = target_case_id
    and organization_id = target_organization_id
    and status = 'SENT';
  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'renewal_case.client_response',
      'renewal_case', target_case_id,
      jsonb_build_object('response', target_response, 'source', target_source)
    );
    -- Auto-transition CLIENT_ACCEPTED → CANCELLATION_WINDOW
    if new_status = 'CLIENT_ACCEPTED' then
      update public.renewal_cases
        set status = 'CANCELLATION_WINDOW'
      where id = target_case_id
        and organization_id = target_organization_id
        and status = 'CLIENT_ACCEPTED';
    end if;
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_client_response(uuid, uuid, text, text, timestamptz) from public, anon;
grant execute on function public.record_client_response(uuid, uuid, text, text, timestamptz) to authenticated, service_role;

create or replace function public.mark_renewal_effective(
  target_organization_id uuid,
  target_case_id         uuid,
  target_effective_at    timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_before public.renewal_cases%rowtype;
  affected integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'mark_renewal_effective: caller not authorized'
      using errcode = '42501';
  end if;
  select * into row_before from public.renewal_cases
    where id = target_case_id and organization_id = target_organization_id;
  if row_before.id is null then
    raise exception 'mark_renewal_effective: case % not found', target_case_id
      using errcode = '22023';
  end if;
  -- Trigger will re-check these; we validate here for a clearer error
  if row_before.human_approved_at is null then
    raise exception 'mark_renewal_effective: human_approved_at missing'
      using errcode = '22023';
  end if;
  if row_before.client_response_at is null or row_before.client_response_source is null then
    raise exception 'mark_renewal_effective: client_response_at + source missing'
      using errcode = '22023';
  end if;
  if row_before.cancellation_deadline is not null and row_before.cancellation_deadline > now() then
    raise exception 'mark_renewal_effective: cancellation_deadline not yet passed'
      using errcode = '22023';
  end if;

  update public.renewal_cases
    set status       = 'EFFECTIVE',
        effective_at = target_effective_at
  where id = target_case_id
    and organization_id = target_organization_id
    and status = 'CANCELLATION_WINDOW';
  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'renewal_case.effective',
      'renewal_case', target_case_id,
      jsonb_build_object('effective_at', to_char(target_effective_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_renewal_effective(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.mark_renewal_effective(uuid, uuid, timestamptz) to authenticated, service_role;

create or replace function public.cancel_renewal_case(
  target_organization_id uuid,
  target_case_id         uuid,
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
    raise exception 'cancel_renewal_case: caller not authorized'
      using errcode = '42501';
  end if;
  update public.renewal_cases
    set status = 'CANCELLED',
        notes  = coalesce(notes, '') || ' | cancelled: ' || coalesce(target_reason, '(no reason)')
  where id = target_case_id
    and organization_id = target_organization_id
    and status not in ('EFFECTIVE', 'DECLINED', 'CANCELLED');
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'renewal_case.cancel',
      'renewal_case', target_case_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.cancel_renewal_case(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_renewal_case(uuid, uuid, text) to authenticated, service_role;
