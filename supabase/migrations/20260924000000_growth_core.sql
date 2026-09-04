-- SESIRA Core Workflow — Growth core (C30, WAVE 4 kickoff).
--
-- Foundational Growth entities:
--   * public.growth_campaigns — per-channel marketing campaign
--   * public.leads             — inbound leads, pre-opportunity
--
-- Content publishing + conversations land in C31. Attribution
-- (OBSERVED / ESTIMATED / UNKNOWN) lands in C32. This milestone
-- is the DATA MODEL only — no cost tracking, no attribution
-- computation, no ROI claims.
--
-- Channel enum reserves `CONTENT` for C31 and leaves `OTHER` as
-- an escape hatch.
--
-- Lifecycle (campaign):
--   DRAFT → ACTIVE → PAUSED → ACTIVE (resume)
--   ACTIVE → ENDED (terminal)
--   PAUSED → ENDED (terminal)
--   any non-terminal → CANCELLED (terminal — never launched or aborted)
--
-- Lifecycle (lead):
--   NEW → QUALIFIED → CONVERTED (terminal, opportunity_id required)
--   NEW → DISQUALIFIED (terminal)
--   QUALIFIED → DISQUALIFIED (terminal)
--   any non-terminal → ARCHIVED (terminal — noise / spam / duplicate)
--
-- DOCTRINE INVARIANTS:
--
--   * AI may classify a lead source, suggest a qualification
--     score, or draft outreach. AI must NEVER auto-qualify,
--     auto-convert, auto-disqualify, or send outreach directly.
--     Humans decide who is a real opportunity.
--   * No ROI or attribution claims here. C32 introduces the
--     honest attribution model. Until then, do not compute
--     conversion rates from these tables — the mapping
--     `lead → opportunity` is captured but not weighted.
--   * Campaign budget is metadata, not accounting. Real spend
--     tracking (with the accounting seam) is out of scope.
--   * Lead qualification requires an ACTIVE org member as
--     qualifier (audit + separation-of-duties).

-- =========================================================================
-- growth_campaigns
-- =========================================================================
create table public.growth_campaigns (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null check (length(name) between 1 and 200),
  channel             text not null
    check (channel in ('PAID_SEARCH', 'ORGANIC', 'REFERRAL', 'EMAIL',
                       'EVENT', 'WORD_OF_MOUTH', 'CONTENT', 'OTHER')),
  status              text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED')),
  external_ref        text check (external_ref is null or length(external_ref) <= 200),
  budget              numeric(14,2) check (budget is null or budget >= 0),
  currency            text not null default 'EUR' check (char_length(currency) = 3),
  start_at            timestamptz,
  end_at              timestamptz,
  ended_at            timestamptz,
  cancelled_at        timestamptz,
  cancellation_reason text check (cancellation_reason is null or length(cancellation_reason) <= 500),
  metadata            jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (organization_id, external_ref) deferrable initially deferred,
  unique (id, organization_id),
  check (end_at is null or start_at is null or end_at >= start_at)
);

comment on table public.growth_campaigns is
  'Per-channel marketing campaign. State machine DRAFT → ACTIVE → PAUSED/ENDED; any non-terminal → CANCELLED. No cost tracking (metadata only). Attribution lands in C32.';

create index growth_campaigns_org_status_idx on public.growth_campaigns (organization_id, status);
create index growth_campaigns_org_channel_idx on public.growth_campaigns (organization_id, channel);
create index growth_campaigns_org_active_idx on public.growth_campaigns (organization_id, start_at)
  where status = 'ACTIVE';

alter table public.growth_campaigns enable row level security;

create policy growth_campaigns_select on public.growth_campaigns
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy growth_campaigns_insert on public.growth_campaigns
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy growth_campaigns_update on public.growth_campaigns
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.growth_campaigns to authenticated;
grant select, insert, update on public.growth_campaigns to service_role;

-- =========================================================================
-- leads
-- =========================================================================
create table public.leads (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  customer_id               uuid,
  contact_name              text not null check (length(contact_name) between 1 and 200),
  contact_email             text check (contact_email is null or length(contact_email) <= 254),
  contact_phone             text check (contact_phone is null or length(contact_phone) <= 50),
  source                    text not null default 'OTHER'
    check (source in ('FORM', 'EMAIL', 'PHONE', 'CHAT', 'REFERRAL',
                      'EVENT', 'WALK_IN', 'IMPORT', 'OTHER')),
  source_campaign_id        uuid,
  status                    text not null default 'NEW'
    check (status in ('NEW', 'QUALIFIED', 'CONVERTED',
                      'DISQUALIFIED', 'ARCHIVED')),
  qualification_notes       text check (qualification_notes is null or length(qualification_notes) <= 4000),
  qualified_by_user_id      uuid,
  qualified_at              timestamptz,
  converted_opportunity_id  uuid,
  converted_at              timestamptz,
  disqualification_reason   text check (disqualification_reason is null or length(disqualification_reason) <= 500),
  disqualified_at           timestamptz,
  archived_at               timestamptz,
  provenance                jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata                  jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete set null,
  foreign key (source_campaign_id, organization_id) references public.growth_campaigns(id, organization_id) on delete set null,
  foreign key (converted_opportunity_id, organization_id) references public.opportunities(id, organization_id) on delete set null,
  unique (id, organization_id),
  check (contact_email is not null or contact_phone is not null)
);

comment on table public.leads is
  'Inbound lead (pre-opportunity). Contact info + source + optional campaign link. State machine NEW → QUALIFIED → CONVERTED (opportunity linked); NEW/QUALIFIED → DISQUALIFIED; any → ARCHIVED. Requires either email or phone.';

create index leads_org_status_idx on public.leads (organization_id, status);
create index leads_org_created_idx on public.leads (organization_id, created_at desc);
create index leads_org_source_campaign_idx on public.leads (organization_id, source_campaign_id)
  where source_campaign_id is not null;
create index leads_org_customer_idx on public.leads (organization_id, customer_id)
  where customer_id is not null;
create index leads_org_email_lower_idx on public.leads (organization_id, lower(contact_email))
  where contact_email is not null;

alter table public.leads enable row level security;

create policy leads_select on public.leads
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy leads_insert on public.leads
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy leads_update on public.leads
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.leads to authenticated;
grant select, insert, update on public.leads to service_role;

-- =========================================================================
-- State machine trigger — growth_campaigns
-- =========================================================================
create or replace function private.enforce_growth_campaign_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('ENDED', 'CANCELLED') then
    raise exception 'growth_campaign % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'DRAFT'  and new.status in ('ACTIVE', 'CANCELLED')) or
    (old.status = 'ACTIVE' and new.status in ('PAUSED', 'ENDED', 'CANCELLED')) or
    (old.status = 'PAUSED' and new.status in ('ACTIVE', 'ENDED', 'CANCELLED')) or
    (old.status = new.status)
  ) then
    raise exception 'growth_campaign % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger growth_campaigns_state_transition
  before update on public.growth_campaigns
  for each row execute function private.enforce_growth_campaign_state_transition();

-- =========================================================================
-- State machine trigger — leads
-- =========================================================================
create or replace function private.enforce_lead_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('CONVERTED', 'DISQUALIFIED', 'ARCHIVED') then
    raise exception 'lead % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'NEW'       and new.status in ('QUALIFIED', 'DISQUALIFIED', 'ARCHIVED')) or
    (old.status = 'QUALIFIED' and new.status in ('CONVERTED', 'DISQUALIFIED', 'ARCHIVED')) or
    (old.status = new.status)
  ) then
    raise exception 'lead % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger leads_state_transition
  before update on public.leads
  for each row execute function private.enforce_lead_state_transition();

-- =========================================================================
-- activate_growth_campaign — DRAFT → ACTIVE
-- =========================================================================
create or replace function public.activate_growth_campaign(
  target_organization_id uuid,
  target_campaign_id     uuid,
  target_start_at        timestamptz,
  target_end_at          timestamptz,
  target_budget          numeric,
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
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'activate_growth_campaign: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_start_at is null then
    raise exception 'activate_growth_campaign: start_at is required'
      using errcode = '22023';
  end if;
  if target_end_at is not null and target_end_at < target_start_at then
    raise exception 'activate_growth_campaign: end_at (%) cannot be before start_at (%)',
      target_end_at, target_start_at
      using errcode = '22023';
  end if;

  update public.growth_campaigns
    set status       = 'ACTIVE',
        start_at     = target_start_at,
        end_at       = coalesce(target_end_at, end_at),
        budget       = coalesce(target_budget, budget),
        currency     = coalesce(target_currency, currency),
        external_ref = coalesce(target_external_ref, external_ref)
  where id = target_campaign_id
    and organization_id = target_organization_id
    and status = 'DRAFT';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'growth_campaign.activate',
      'growth_campaign', target_campaign_id,
      jsonb_build_object(
        'start_at', to_char(target_start_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'end_at', case when target_end_at is null then null else to_char(target_end_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end,
        'budget', target_budget,
        'currency', target_currency
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.activate_growth_campaign(uuid, uuid, timestamptz, timestamptz, numeric, text, text) from public, anon;
grant execute on function public.activate_growth_campaign(uuid, uuid, timestamptz, timestamptz, numeric, text, text) to authenticated, service_role;

-- =========================================================================
-- transition_growth_campaign — pause/resume/end/cancel
-- =========================================================================
create or replace function public.transition_growth_campaign(
  target_organization_id uuid,
  target_campaign_id     uuid,
  target_new_status      text,
  target_reason          text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  old_status text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'transition_growth_campaign: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_new_status not in ('PAUSED', 'ACTIVE', 'ENDED', 'CANCELLED') then
    raise exception 'transition_growth_campaign: new_status must be PAUSED|ACTIVE|ENDED|CANCELLED (got %)', target_new_status
      using errcode = '22023';
  end if;
  if target_new_status = 'CANCELLED' and (target_reason is null or length(target_reason) = 0 or length(target_reason) > 500) then
    raise exception 'transition_growth_campaign: reason is required (≤500 chars) for CANCELLED'
      using errcode = '22023';
  end if;

  select status into old_status
  from public.growth_campaigns
  where id = target_campaign_id
    and organization_id = target_organization_id;

  if old_status is null then
    return false;
  end if;

  if target_new_status = 'PAUSED' then
    update public.growth_campaigns
      set status = 'PAUSED'
    where id = target_campaign_id
      and organization_id = target_organization_id
      and status = 'ACTIVE';
  elsif target_new_status = 'ACTIVE' then
    update public.growth_campaigns
      set status = 'ACTIVE'
    where id = target_campaign_id
      and organization_id = target_organization_id
      and status = 'PAUSED';
  elsif target_new_status = 'ENDED' then
    update public.growth_campaigns
      set status = 'ENDED', ended_at = now()
    where id = target_campaign_id
      and organization_id = target_organization_id
      and status in ('ACTIVE', 'PAUSED');
  else -- CANCELLED
    update public.growth_campaigns
      set status              = 'CANCELLED',
          cancelled_at        = now(),
          cancellation_reason = target_reason
    where id = target_campaign_id
      and organization_id = target_organization_id
      and status in ('DRAFT', 'ACTIVE', 'PAUSED');
  end if;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      'growth_campaign.transition_' || lower(target_new_status),
      'growth_campaign', target_campaign_id,
      jsonb_build_object('from_status', old_status,
                         'to_status', target_new_status,
                         'reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.transition_growth_campaign(uuid, uuid, text, text) from public, anon;
grant execute on function public.transition_growth_campaign(uuid, uuid, text, text) to authenticated, service_role;

comment on function public.transition_growth_campaign(uuid, uuid, text, text) is
  'Transition a growth_campaign to PAUSED|ACTIVE|ENDED|CANCELLED. Reason required only for CANCELLED. Audit log on each transition.';

-- =========================================================================
-- qualify_lead — NEW → QUALIFIED
-- =========================================================================
create or replace function public.qualify_lead(
  target_organization_id uuid,
  target_lead_id         uuid,
  target_qualified_by_user_id uuid,
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
    raise exception 'qualify_lead: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_qualified_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'qualify_lead: qualifier % is not an ACTIVE member of organization %',
      target_qualified_by_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.leads
    set status               = 'QUALIFIED',
        qualified_by_user_id = target_qualified_by_user_id,
        qualified_at         = now(),
        qualification_notes  = coalesce(target_notes, qualification_notes)
  where id = target_lead_id
    and organization_id = target_organization_id
    and status = 'NEW';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'lead.qualify',
      'lead', target_lead_id,
      jsonb_build_object('qualified_by_user_id', target_qualified_by_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.qualify_lead(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.qualify_lead(uuid, uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- convert_lead — QUALIFIED → CONVERTED (opportunity_id required)
-- =========================================================================
-- The opportunity MUST exist in the same organization (tenant safety).
-- The lead only records the mapping; it does not create the opportunity.
-- Do NOT hijack this to auto-convert leads via AI — a human decides
-- when a lead is real enough to become an opportunity.
create or replace function public.convert_lead(
  target_organization_id uuid,
  target_lead_id         uuid,
  target_opportunity_id  uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  opp_exists boolean;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'convert_lead: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_opportunity_id is null then
    raise exception 'convert_lead: opportunity_id is required'
      using errcode = '22023';
  end if;

  select exists (
    select 1 from public.opportunities
    where id = target_opportunity_id
      and organization_id = target_organization_id
  ) into opp_exists;

  if not opp_exists then
    raise exception 'convert_lead: opportunity % not found in organization %',
      target_opportunity_id, target_organization_id
      using errcode = '22023';
  end if;

  update public.leads
    set status                   = 'CONVERTED',
        converted_opportunity_id = target_opportunity_id,
        converted_at             = now()
  where id = target_lead_id
    and organization_id = target_organization_id
    and status = 'QUALIFIED';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'lead.convert',
      'lead', target_lead_id,
      jsonb_build_object('opportunity_id', target_opportunity_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.convert_lead(uuid, uuid, uuid) from public, anon;
grant execute on function public.convert_lead(uuid, uuid, uuid) to authenticated, service_role;

-- =========================================================================
-- disqualify_lead — NEW/QUALIFIED → DISQUALIFIED
-- =========================================================================
create or replace function public.disqualify_lead(
  target_organization_id uuid,
  target_lead_id         uuid,
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
    raise exception 'disqualify_lead: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 500 then
    raise exception 'disqualify_lead: reason must be a non-empty string ≤500 chars'
      using errcode = '22023';
  end if;

  update public.leads
    set status                  = 'DISQUALIFIED',
        disqualification_reason = target_reason,
        disqualified_at         = now()
  where id = target_lead_id
    and organization_id = target_organization_id
    and status in ('NEW', 'QUALIFIED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'lead.disqualify',
      'lead', target_lead_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.disqualify_lead(uuid, uuid, text) from public, anon;
grant execute on function public.disqualify_lead(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- archive_lead — any non-terminal → ARCHIVED (noise / spam / duplicate)
-- =========================================================================
create or replace function public.archive_lead(
  target_organization_id uuid,
  target_lead_id         uuid,
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
    raise exception 'archive_lead: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.leads
    set status      = 'ARCHIVED',
        archived_at = now(),
        metadata    = coalesce(metadata, '{}'::jsonb)
                       || case when target_reason is null then '{}'::jsonb
                               else jsonb_build_object('archive_reason', target_reason) end
  where id = target_lead_id
    and organization_id = target_organization_id
    and status in ('NEW', 'QUALIFIED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'lead.archive',
      'lead', target_lead_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.archive_lead(uuid, uuid, text) from public, anon;
grant execute on function public.archive_lead(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- pending_leads — read function for triage
-- =========================================================================
create or replace function public.pending_leads(
  target_organization_id uuid
)
returns table (
  lead_id            uuid,
  contact_name       text,
  contact_email      text,
  contact_phone      text,
  source             text,
  source_campaign_id uuid,
  status             text,
  created_at         timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'pending_leads: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.contact_name,
    l.contact_email,
    l.contact_phone,
    l.source,
    l.source_campaign_id,
    l.status,
    l.created_at
  from public.leads l
  where l.organization_id = target_organization_id
    and l.status in ('NEW', 'QUALIFIED')
  order by l.created_at asc;
end;
$$;

revoke all on function public.pending_leads(uuid) from public, anon;
grant execute on function public.pending_leads(uuid) to authenticated, service_role;

comment on function public.pending_leads(uuid) is
  'List NEW + QUALIFIED leads awaiting human decision. Feeds the growth triage UI.';

-- =========================================================================
-- active_growth_campaigns — read function for dashboards
-- =========================================================================
create or replace function public.active_growth_campaigns(
  target_organization_id uuid
)
returns table (
  campaign_id  uuid,
  name         text,
  channel      text,
  external_ref text,
  budget       numeric,
  currency     text,
  start_at     timestamptz,
  end_at       timestamptz,
  status       text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'active_growth_campaigns: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.name,
    c.channel,
    c.external_ref,
    c.budget,
    c.currency,
    c.start_at,
    c.end_at,
    c.status
  from public.growth_campaigns c
  where c.organization_id = target_organization_id
    and c.status in ('ACTIVE', 'PAUSED')
  order by c.start_at asc nulls last, c.name asc;
end;
$$;

revoke all on function public.active_growth_campaigns(uuid) from public, anon;
grant execute on function public.active_growth_campaigns(uuid) to authenticated, service_role;

comment on function public.active_growth_campaigns(uuid) is
  'List ACTIVE + PAUSED growth_campaigns. Feeds the growth dashboard.';
