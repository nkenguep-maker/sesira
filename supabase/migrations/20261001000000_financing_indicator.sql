-- SESIRA Core Workflow — financing indicator (C35, WAVE 5).
--
-- REGULATORY.md D-1: **Option A — Indicateur** (art. R519-2 CMF).
-- SESIRA peut signaler un financeur partenaire, transmettre les
-- coordonnées du prospect (avec consentement tracé) et suivre un
-- statut déclaré par l'humain. SESIRA NE PEUT PAS conseiller,
-- présenter plusieurs offres, comparer, collecter/transmettre des
-- documents contractuels, ni décider d'un crédit.
--
-- Two tables:
--   * financing_partners  — per-org partner registry
--   * financing_referrals — per-referral (customer × partner) with
--     human-declared status lifecycle
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   INV-05 (SESIRA ne touche jamais aux fonds):
--     No table stores IBAN, payment amount initiated by SESIRA, or
--     balance of any kind. commission_amount is an AUDIT-ONLY
--     recorded value (what the partner reported paying), never a
--     payment SESIRA initiates.
--
--   INV-06 (SESIRA ne score jamais une personne physique):
--     Schema has NO income / credit_score / debt_ratio /
--     monthly_payment / interest_rate / eligibility_score columns.
--     Attempting to store one is a doctrine violation caught in
--     code review, not enforced at the DB level (any client can
--     add a column) — but the schema here refuses to model it.
--
--   Documents pipeline separation:
--     financing_referrals has NO FK to public.documents (C27).
--     Financial pieces are a CLIENT-SIDE checklist only; SESIRA
--     never stores the actual documents (REGULATORY.md 3.2).
--
--   INV-04 (traced human validation for status changes):
--     transition_financing_referral_status requires an ACTIVE org
--     member as actor. Status labels (INITIATED / IN_REVIEW /
--     ACCEPTED / DECLINED / ABANDONED) come from that human
--     declaration, NEVER from SESIRA inferring anything.
--
--   Consent proof:
--     initiate_financing_referral REQUIRES consent_recorded_at at
--     insert time. Referrals in INITIATED status without a consent
--     date are structurally impossible.
--
-- Wording (UI U35):
--   « Signaler un financeur » / « Statut renseigné » / « Prochaine
--   étape » / « Pièces à réunir » — NEVER « SESIRA finance vous » /
--   « SESIRA décide » / « Comparer les offres ».

-- =========================================================================
-- financing_partners
-- =========================================================================
create table public.financing_partners (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  name                  text not null check (length(name) between 1 and 200),
  partner_type          text not null default 'OTHER'
    check (partner_type in ('BANK', 'FINANCE_COMPANY', 'LEASING',
                            'ECO_LOAN_OPERATOR', 'OTHER')),
  external_ref          text check (external_ref is null or length(external_ref) <= 200),
  contact_email         text check (contact_email is null or length(contact_email) <= 254),
  contact_phone         text check (contact_phone is null or length(contact_phone) <= 50),
  commission_terms_note text check (commission_terms_note is null or length(commission_terms_note) <= 1000),
  status                text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'PAUSED', 'ARCHIVED')),
  activated_at          timestamptz not null default now(),
  archived_at           timestamptz,
  archive_reason        text check (archive_reason is null or length(archive_reason) <= 500),
  provenance            jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (organization_id, external_ref) deferrable initially deferred,
  unique (id, organization_id)
);

comment on table public.financing_partners is
  'Financing partners the org can refer clients to. commission_terms_note is FREE-FORM PROSE — not a computable formula. SESIRA never applies commission logic itself. NO income / score / rate fields anywhere (INV-05, INV-06).';

comment on column public.financing_partners.commission_terms_note is
  'Human prose describing the commission arrangement with this partner. Reference only — never used to auto-derive commission amounts. Amounts are recorded per-referral via record_financing_commission when the partner reports paying.';

create index financing_partners_org_status_idx on public.financing_partners (organization_id, status);
create index financing_partners_org_type_idx on public.financing_partners (organization_id, partner_type);

alter table public.financing_partners enable row level security;

create policy financing_partners_select on public.financing_partners
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy financing_partners_insert on public.financing_partners
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy financing_partners_update on public.financing_partners
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.financing_partners to authenticated;
grant select, insert, update on public.financing_partners to service_role;

create trigger set_financing_partners_updated_at
  before update on public.financing_partners
  for each row execute function private.set_updated_at();

-- =========================================================================
-- financing_referrals
-- =========================================================================
create table public.financing_referrals (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  customer_id               uuid not null,
  partner_id                uuid not null,
  opportunity_id            uuid,
  quote_id                  uuid,
  status                    text not null default 'INITIATED'
    check (status in ('INITIATED', 'IN_REVIEW', 'ACCEPTED', 'DECLINED', 'ABANDONED')),
  referred_by_user_id       uuid not null,
  referred_at               timestamptz not null default now(),
  consent_recorded_at       timestamptz not null,
  consent_scope             text not null check (length(consent_scope) between 1 and 1000),
  consent_evidence_note     text check (consent_evidence_note is null or length(consent_evidence_note) <= 2000),
  client_document_checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(client_document_checklist) = 'array'),
  status_notes              text check (status_notes is null or length(status_notes) <= 2000),
  status_changed_at         timestamptz,
  status_changed_by_user_id uuid,
  commission_amount         numeric(14,2) check (commission_amount is null or commission_amount >= 0),
  commission_currency       text check (commission_currency is null or char_length(commission_currency) = 3),
  commission_recorded_at    timestamptz,
  commission_recorded_by_user_id uuid,
  commission_note           text check (commission_note is null or length(commission_note) <= 1000),
  provenance                jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata                  jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete restrict,
  foreign key (partner_id, organization_id) references public.financing_partners(id, organization_id) on delete restrict,
  foreign key (opportunity_id, organization_id) references public.opportunities(id, organization_id) on delete set null,
  foreign key (quote_id, organization_id) references public.quotes(id, organization_id) on delete set null,
  unique (id, organization_id),
  check (
    (commission_amount is null and commission_currency is null and commission_recorded_at is null and commission_recorded_by_user_id is null)
    or
    (commission_amount is not null and commission_currency is not null and commission_recorded_at is not null and commission_recorded_by_user_id is not null)
  )
);

comment on table public.financing_referrals is
  'Referral to a financing partner. Consent is REQUIRED at insert (consent_recorded_at + consent_scope). Status is a HUMAN declaration (INITIATED → IN_REVIEW → ACCEPTED / DECLINED / ABANDONED) — SESIRA never infers it. client_document_checklist is a checklist SESIRA hands to the client; the documents themselves live outside SESIRA (never in public.documents).';

comment on column public.financing_referrals.client_document_checklist is
  'JSON array of items the CLIENT must gather themselves: [{"code":"ID_CARD","label":"Pièce d''identité","required":true}, ...]. SESIRA NEVER stores the actual documents (R519-2 CMF: indicateur cannot collect/transmit contractual documents).';

comment on column public.financing_referrals.commission_amount is
  'AUDIT-ONLY record of the commission the partner reported paying. INV-05: SESIRA never initiates any payment. Recorded via record_financing_commission by an ACTIVE org member.';

create index financing_referrals_org_status_idx on public.financing_referrals (organization_id, status);
create index financing_referrals_org_customer_idx on public.financing_referrals (organization_id, customer_id);
create index financing_referrals_org_partner_idx on public.financing_referrals (organization_id, partner_id);
create index financing_referrals_org_opportunity_idx on public.financing_referrals (organization_id, opportunity_id)
  where opportunity_id is not null;
create index financing_referrals_org_open_idx on public.financing_referrals (organization_id, referred_at desc)
  where status in ('INITIATED', 'IN_REVIEW');

alter table public.financing_referrals enable row level security;

create policy financing_referrals_select on public.financing_referrals
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy financing_referrals_insert on public.financing_referrals
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy financing_referrals_update on public.financing_referrals
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.financing_referrals to authenticated;
grant select, insert, update on public.financing_referrals to service_role;

create trigger set_financing_referrals_updated_at
  before update on public.financing_referrals
  for each row execute function private.set_updated_at();

-- =========================================================================
-- State machine trigger — financing_referrals
-- =========================================================================
create or replace function private.enforce_financing_referral_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('ACCEPTED', 'DECLINED', 'ABANDONED') then
    raise exception 'financing_referral % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'INITIATED' and new.status in ('IN_REVIEW', 'ACCEPTED', 'DECLINED', 'ABANDONED')) or
    (old.status = 'IN_REVIEW' and new.status in ('ACCEPTED', 'DECLINED', 'ABANDONED', 'INITIATED')) or
    (old.status = new.status)
  ) then
    raise exception 'financing_referral % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger financing_referrals_state_transition
  before update on public.financing_referrals
  for each row execute function private.enforce_financing_referral_state_transition();

-- =========================================================================
-- configure_financing_partner — upsert per-org partner
-- =========================================================================
create or replace function public.configure_financing_partner(
  target_organization_id  uuid,
  target_partner_id       uuid,
  target_name             text,
  target_partner_type     text,
  target_contact_email    text,
  target_contact_phone    text,
  target_external_ref     text,
  target_commission_terms_note text
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
    raise exception 'configure_financing_partner: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_partner_type not in ('BANK', 'FINANCE_COMPANY', 'LEASING', 'ECO_LOAN_OPERATOR', 'OTHER') then
    raise exception 'configure_financing_partner: invalid partner_type %', target_partner_type
      using errcode = '22023';
  end if;
  if target_name is null or length(target_name) = 0 or length(target_name) > 200 then
    raise exception 'configure_financing_partner: name must be a non-empty string ≤200 chars'
      using errcode = '22023';
  end if;

  if target_partner_id is null then
    insert into public.financing_partners (
      organization_id, name, partner_type, contact_email, contact_phone,
      external_ref, commission_terms_note
    ) values (
      target_organization_id, target_name, target_partner_type,
      target_contact_email, target_contact_phone, target_external_ref,
      target_commission_terms_note
    ) returning id into new_id;
  else
    update public.financing_partners
      set name                  = target_name,
          partner_type          = target_partner_type,
          contact_email         = target_contact_email,
          contact_phone         = target_contact_phone,
          external_ref          = coalesce(target_external_ref, external_ref),
          commission_terms_note = target_commission_terms_note
    where id = target_partner_id
      and organization_id = target_organization_id
      and status in ('ACTIVE', 'PAUSED');
    if not found then
      raise exception 'configure_financing_partner: partner % not found or ARCHIVED in organization %',
        target_partner_id, target_organization_id
        using errcode = '22023';
    end if;
    new_id := target_partner_id;
  end if;

  perform public.record_audit_log(
    target_organization_id, 'financing_partner.configure',
    'financing_partner', new_id,
    jsonb_build_object(
      'name', target_name,
      'partner_type', target_partner_type,
      'is_update', target_partner_id is not null
    )
  );
  return new_id;
end;
$$;

revoke all on function public.configure_financing_partner(uuid, uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.configure_financing_partner(uuid, uuid, text, text, text, text, text, text) to authenticated, service_role;

-- =========================================================================
-- archive_financing_partner — ACTIVE|PAUSED → ARCHIVED
-- =========================================================================
create or replace function public.archive_financing_partner(
  target_organization_id uuid,
  target_partner_id      uuid,
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
    raise exception 'archive_financing_partner: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 500 then
    raise exception 'archive_financing_partner: reason must be a non-empty string ≤500 chars'
      using errcode = '22023';
  end if;

  update public.financing_partners
    set status         = 'ARCHIVED',
        archived_at    = now(),
        archive_reason = target_reason
  where id = target_partner_id
    and organization_id = target_organization_id
    and status in ('ACTIVE', 'PAUSED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'financing_partner.archive',
      'financing_partner', target_partner_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.archive_financing_partner(uuid, uuid, text) from public, anon;
grant execute on function public.archive_financing_partner(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- initiate_financing_referral — create INITIATED (consent required)
-- =========================================================================
create or replace function public.initiate_financing_referral(
  target_organization_id     uuid,
  target_customer_id         uuid,
  target_partner_id          uuid,
  target_opportunity_id      uuid,
  target_quote_id            uuid,
  target_referred_by_user_id uuid,
  target_consent_scope       text,
  target_consent_evidence_note text,
  target_client_document_checklist jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  partner_status text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'initiate_financing_referral: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_referred_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'initiate_financing_referral: referrer % is not an ACTIVE member of organization %',
      target_referred_by_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_consent_scope is null or length(target_consent_scope) = 0 or length(target_consent_scope) > 1000 then
    raise exception 'initiate_financing_referral: consent_scope is required (non-empty, ≤1000 chars) — indicateur regime requires proof of client consent'
      using errcode = '22023';
  end if;
  if target_client_document_checklist is not null
     and jsonb_typeof(target_client_document_checklist) <> 'array' then
    raise exception 'initiate_financing_referral: client_document_checklist must be a JSON array'
      using errcode = '22023';
  end if;

  select status into partner_status
  from public.financing_partners
  where id = target_partner_id
    and organization_id = target_organization_id;

  if partner_status is null then
    raise exception 'initiate_financing_referral: partner % not found in organization %',
      target_partner_id, target_organization_id
      using errcode = '22023';
  end if;
  if partner_status <> 'ACTIVE' then
    raise exception 'initiate_financing_referral: partner % is not ACTIVE (status=%)',
      target_partner_id, partner_status
      using errcode = '22023';
  end if;

  -- Verify customer belongs to the org (redundant with FK but explicit)
  if not exists (
    select 1 from public.customers
    where id = target_customer_id
      and organization_id = target_organization_id
  ) then
    raise exception 'initiate_financing_referral: customer % not found in organization %',
      target_customer_id, target_organization_id
      using errcode = '22023';
  end if;

  if target_opportunity_id is not null and not exists (
    select 1 from public.opportunities
    where id = target_opportunity_id
      and organization_id = target_organization_id
  ) then
    raise exception 'initiate_financing_referral: opportunity % not found in organization %',
      target_opportunity_id, target_organization_id
      using errcode = '22023';
  end if;

  if target_quote_id is not null and not exists (
    select 1 from public.quotes
    where id = target_quote_id
      and organization_id = target_organization_id
  ) then
    raise exception 'initiate_financing_referral: quote % not found in organization %',
      target_quote_id, target_organization_id
      using errcode = '22023';
  end if;

  insert into public.financing_referrals (
    organization_id, customer_id, partner_id, opportunity_id, quote_id,
    status, referred_by_user_id, referred_at,
    consent_recorded_at, consent_scope, consent_evidence_note,
    client_document_checklist
  ) values (
    target_organization_id, target_customer_id, target_partner_id, target_opportunity_id, target_quote_id,
    'INITIATED', target_referred_by_user_id, now(),
    now(), target_consent_scope, target_consent_evidence_note,
    coalesce(target_client_document_checklist, '[]'::jsonb)
  ) returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'financing_referral.initiate',
    'financing_referral', new_id,
    jsonb_build_object(
      'customer_id', target_customer_id,
      'partner_id', target_partner_id,
      'opportunity_id', target_opportunity_id,
      'quote_id', target_quote_id,
      'referred_by_user_id', target_referred_by_user_id
    )
  );
  return new_id;
end;
$$;

revoke all on function public.initiate_financing_referral(uuid, uuid, uuid, uuid, uuid, uuid, text, text, jsonb) from public, anon;
grant execute on function public.initiate_financing_referral(uuid, uuid, uuid, uuid, uuid, uuid, text, text, jsonb) to authenticated, service_role;

comment on function public.initiate_financing_referral(uuid, uuid, uuid, uuid, uuid, uuid, text, text, jsonb) is
  'Create a financing referral in INITIATED status. Consent is REQUIRED (consent_scope + consent_recorded_at) — indicateur regime (R519-2 CMF) mandates client consent proof. SESIRA never collects the actual financial documents; client_document_checklist is a checklist for the CLIENT.';

-- =========================================================================
-- transition_financing_referral_status — human-declared state change
-- =========================================================================
-- Status is HUMAN-DECLARED (INV-06). SESIRA NEVER infers ACCEPTED /
-- DECLINED from any signal. The actor_user_id must be an ACTIVE
-- org member (INV-04 traced human validation). notes optional but
-- recommended (audit trail context).
create or replace function public.transition_financing_referral_status(
  target_organization_id uuid,
  target_referral_id     uuid,
  target_new_status      text,
  target_actor_user_id   uuid,
  target_notes           text
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
    raise exception 'transition_financing_referral_status: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'transition_financing_referral_status: actor % is not an ACTIVE member of organization %',
      target_actor_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_new_status not in ('IN_REVIEW', 'ACCEPTED', 'DECLINED', 'ABANDONED', 'INITIATED') then
    raise exception 'transition_financing_referral_status: invalid target status %', target_new_status
      using errcode = '22023';
  end if;

  update public.financing_referrals
    set status                    = target_new_status,
        status_notes              = target_notes,
        status_changed_at         = now(),
        status_changed_by_user_id = target_actor_user_id
  where id = target_referral_id
    and organization_id = target_organization_id
    and status in ('INITIATED', 'IN_REVIEW');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      'financing_referral.transition_' || lower(target_new_status),
      'financing_referral', target_referral_id,
      jsonb_build_object(
        'actor_user_id', target_actor_user_id,
        'new_status', target_new_status
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.transition_financing_referral_status(uuid, uuid, text, uuid, text) from public, anon;
grant execute on function public.transition_financing_referral_status(uuid, uuid, text, uuid, text) to authenticated, service_role;

-- =========================================================================
-- record_financing_commission — audit-only record of partner payment
-- =========================================================================
-- INV-05: SESIRA never touches funds. This RPC ONLY records what the
-- partner reports paying. It does NOT initiate any payment or move
-- any balance. Requires ACTIVE org member + ACCEPTED referral status.
-- Any subsequent call replaces the recorded amount (audit-logged).
create or replace function public.record_financing_commission(
  target_organization_id uuid,
  target_referral_id     uuid,
  target_amount          numeric,
  target_currency        text,
  target_actor_user_id   uuid,
  target_note            text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  ref_status text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_financing_commission: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'record_financing_commission: actor % is not an ACTIVE member of organization %',
      target_actor_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_amount is null or target_amount < 0 then
    raise exception 'record_financing_commission: amount must be >= 0'
      using errcode = '22023';
  end if;
  if target_currency is null or char_length(target_currency) <> 3 then
    raise exception 'record_financing_commission: currency must be a 3-letter code'
      using errcode = '22023';
  end if;

  select status into ref_status
  from public.financing_referrals
  where id = target_referral_id
    and organization_id = target_organization_id;

  if ref_status is null then
    raise exception 'record_financing_commission: referral % not found in organization %',
      target_referral_id, target_organization_id
      using errcode = '22023';
  end if;
  if ref_status <> 'ACCEPTED' then
    raise exception 'record_financing_commission: referral % is not ACCEPTED (status=%) — commissions are only recorded for accepted referrals',
      target_referral_id, ref_status
      using errcode = '22023';
  end if;

  update public.financing_referrals
    set commission_amount              = target_amount,
        commission_currency            = target_currency,
        commission_recorded_at         = now(),
        commission_recorded_by_user_id = target_actor_user_id,
        commission_note                = target_note
  where id = target_referral_id
    and organization_id = target_organization_id;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'financing_referral.commission_recorded',
      'financing_referral', target_referral_id,
      jsonb_build_object(
        'amount', target_amount,
        'currency', target_currency,
        'actor_user_id', target_actor_user_id
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_financing_commission(uuid, uuid, numeric, text, uuid, text) from public, anon;
grant execute on function public.record_financing_commission(uuid, uuid, numeric, text, uuid, text) to authenticated, service_role;

comment on function public.record_financing_commission(uuid, uuid, numeric, text, uuid, text) is
  'AUDIT-ONLY record of the commission the partner reported paying (INV-05). SESIRA does NOT initiate any payment. Only allowed on ACCEPTED referrals. ACTIVE org member required.';

-- =========================================================================
-- Read helpers
-- =========================================================================
create or replace function public.active_financing_partners(
  target_organization_id uuid
)
returns table (
  partner_id            uuid,
  name                  text,
  partner_type          text,
  external_ref          text,
  contact_email         text,
  contact_phone         text,
  commission_terms_note text,
  status                text,
  activated_at          timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'active_financing_partners: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    p.id, p.name, p.partner_type, p.external_ref, p.contact_email, p.contact_phone,
    p.commission_terms_note, p.status, p.activated_at
  from public.financing_partners p
  where p.organization_id = target_organization_id
    and p.status in ('ACTIVE', 'PAUSED')
  order by p.name asc;
end;
$$;

revoke all on function public.active_financing_partners(uuid) from public, anon;
grant execute on function public.active_financing_partners(uuid) to authenticated, service_role;

create or replace function public.financing_referrals_for(
  target_organization_id uuid,
  target_status_filter   text,
  target_customer_id     uuid
)
returns table (
  referral_id             uuid,
  customer_id             uuid,
  partner_id              uuid,
  partner_name            text,
  opportunity_id          uuid,
  quote_id                uuid,
  status                  text,
  referred_by_user_id     uuid,
  referred_at             timestamptz,
  status_changed_at       timestamptz,
  status_notes            text,
  commission_amount       numeric,
  commission_currency     text,
  checklist_item_count    integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'financing_referrals_for: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    r.id, r.customer_id, r.partner_id, p.name,
    r.opportunity_id, r.quote_id, r.status,
    r.referred_by_user_id, r.referred_at,
    r.status_changed_at, r.status_notes,
    r.commission_amount, r.commission_currency,
    jsonb_array_length(r.client_document_checklist)
  from public.financing_referrals r
  join public.financing_partners p
    on p.id = r.partner_id and p.organization_id = r.organization_id
  where r.organization_id = target_organization_id
    and (target_status_filter is null or r.status = target_status_filter)
    and (target_customer_id is null or r.customer_id = target_customer_id)
  order by r.referred_at desc;
end;
$$;

revoke all on function public.financing_referrals_for(uuid, text, uuid) from public, anon;
grant execute on function public.financing_referrals_for(uuid, text, uuid) to authenticated, service_role;
