-- SESIRA Core Workflow — honest Growth attribution (C32, WAVE 4 finale).
--
-- One table + 3 write RPCs + 2 read RPCs.
--
-- Attribution model — THREE CONFIDENCE LEVELS, NEVER MIXED:
--
--   OBSERVED  — direct signal. The opportunity carries a
--               technical link back to a Growth source (UTM tag,
--               referral header, tracked click, form field, or a
--               human explicitly attesting "customer told us it
--               came from X"). Attribution IS the source.
--
--   ESTIMATED — heuristic correlation. E.g. "the same customer
--               engaged with content Y within 30 days of opening
--               this opportunity" or "conversation Z happened on
--               the same day this opportunity was created". This
--               is CORRELATION, not causation. Reports MUST
--               display it separately.
--
--   UNKNOWN   — no signal at all. Recorded to make the gap
--               visible (dark funnel). Reports MUST NOT hide it
--               as "organic".
--
-- Reporting doctrine (enforced by the read RPC shape):
--
--   * attribution_report_by_source returns opportunity counts +
--     estimated value BROKEN DOWN BY CONFIDENCE. Callers MUST
--     NOT collapse OBSERVED + ESTIMATED into a single "attributed"
--     bucket. UI code that hides UNKNOWN violates the doctrine.
--   * NEVER report "campaign X drove Y conversions" unless every
--     underlying row is confidence = OBSERVED.
--   * A single opportunity can carry multiple attributions
--     (e.g. one OBSERVED to a campaign + one ESTIMATED to a
--     content piece). This is DESIRED — the model rewards
--     honesty over false single-attribution.
--   * Revoked attributions are kept for audit; the partial
--     unique index only enforces uniqueness among active rows.
--
-- DOCTRINE INVARIANTS:
--
--   * AI may PROPOSE an ESTIMATED attribution (heuristic
--     inference), but a human OR a service_role worker with
--     documented evidence in `provenance` must record it.
--     AI must NEVER assert OBSERVED unilaterally — OBSERVED
--     requires either a technical signal (UTM parsed by a
--     deterministic parser) or a human attestation.
--   * revoke_opportunity_attribution requires a non-empty
--     reason and an ACTIVE org member as revoker.

create table public.opportunity_attributions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  opportunity_id        uuid not null,
  source_type           text not null
    check (source_type in ('CAMPAIGN', 'LEAD', 'CONVERSATION',
                           'PUBLICATION', 'MANUAL', 'UNKNOWN')),
  source_id             uuid,
  confidence            text not null
    check (confidence in ('OBSERVED', 'ESTIMATED', 'UNKNOWN')),
  reason                text not null check (length(reason) between 1 and 1000),
  attributed_by_user_id uuid,
  attributed_at         timestamptz not null default now(),
  revoked_at            timestamptz,
  revoked_by_user_id    uuid,
  revoke_reason         text check (revoke_reason is null or length(revoke_reason) <= 500),
  provenance            jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (opportunity_id, organization_id) references public.opportunities(id, organization_id) on delete cascade,
  -- Consistency between source_type / source_id / confidence
  check (
    (source_type = 'UNKNOWN'  and source_id is null and confidence = 'UNKNOWN') or
    (source_type = 'MANUAL'   and source_id is null) or
    (source_type in ('CAMPAIGN', 'LEAD', 'CONVERSATION', 'PUBLICATION')
       and source_id is not null)
  )
);

comment on table public.opportunity_attributions is
  'Attribution of an opportunity to a Growth source with an explicit confidence label (OBSERVED | ESTIMATED | UNKNOWN). Multiple attributions per opportunity allowed. Revoked rows kept for audit. Reports MUST break down by confidence; NEVER collapse.';

create index opportunity_attributions_org_opp_idx
  on public.opportunity_attributions (organization_id, opportunity_id);
create index opportunity_attributions_org_source_idx
  on public.opportunity_attributions (organization_id, source_type, source_id)
  where source_id is not null;
create index opportunity_attributions_org_active_idx
  on public.opportunity_attributions (organization_id, confidence)
  where revoked_at is null;

-- Uniqueness among ACTIVE rows. Two variants to cover NULL source_id.
create unique index opportunity_attributions_active_with_source_uniq
  on public.opportunity_attributions (organization_id, opportunity_id, source_type, source_id)
  where revoked_at is null and source_id is not null;
create unique index opportunity_attributions_active_nullsrc_uniq
  on public.opportunity_attributions (organization_id, opportunity_id, source_type)
  where revoked_at is null and source_id is null;

alter table public.opportunity_attributions enable row level security;

create policy opportunity_attributions_select on public.opportunity_attributions
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy opportunity_attributions_insert on public.opportunity_attributions
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy opportunity_attributions_update on public.opportunity_attributions
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.opportunity_attributions to authenticated;
grant select, insert, update on public.opportunity_attributions to service_role;

create trigger set_opportunity_attributions_updated_at
  before update on public.opportunity_attributions
  for each row execute function private.set_updated_at();

-- =========================================================================
-- record_opportunity_attribution — insert an attribution row
-- =========================================================================
-- Enforces the source_type/source_id/confidence consistency AGAIN in
-- the RPC (in addition to the table CHECK) so the raised error is
-- explicit. Verifies the source_id exists in the correct source table.
-- Idempotent: if an ACTIVE row with the same (opp, source_type,
-- source_id) exists, returns its id without duplicating.
create or replace function public.record_opportunity_attribution(
  target_organization_id uuid,
  target_opportunity_id  uuid,
  target_source_type     text,
  target_source_id       uuid,
  target_confidence      text,
  target_reason          text,
  target_attributed_by_user_id uuid,
  target_provenance      jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_id uuid;
  new_id      uuid;
  source_ok   boolean;
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'record_opportunity_attribution: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_source_type not in ('CAMPAIGN', 'LEAD', 'CONVERSATION', 'PUBLICATION', 'MANUAL', 'UNKNOWN') then
    raise exception 'record_opportunity_attribution: invalid source_type %', target_source_type
      using errcode = '22023';
  end if;
  if target_confidence not in ('OBSERVED', 'ESTIMATED', 'UNKNOWN') then
    raise exception 'record_opportunity_attribution: invalid confidence %', target_confidence
      using errcode = '22023';
  end if;
  if target_source_type = 'UNKNOWN' and (target_source_id is not null or target_confidence <> 'UNKNOWN') then
    raise exception 'record_opportunity_attribution: source_type UNKNOWN requires source_id=null and confidence=UNKNOWN'
      using errcode = '22023';
  end if;
  if target_source_type = 'MANUAL' and target_source_id is not null then
    raise exception 'record_opportunity_attribution: source_type MANUAL must have source_id=null (context in provenance)'
      using errcode = '22023';
  end if;
  if target_source_type in ('CAMPAIGN', 'LEAD', 'CONVERSATION', 'PUBLICATION') and target_source_id is null then
    raise exception 'record_opportunity_attribution: source_type % requires a source_id', target_source_type
      using errcode = '22023';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 1000 then
    raise exception 'record_opportunity_attribution: reason must be a non-empty string ≤1000 chars'
      using errcode = '22023';
  end if;

  -- Verify opportunity exists in org
  if not exists (
    select 1 from public.opportunities
    where id = target_opportunity_id
      and organization_id = target_organization_id
  ) then
    raise exception 'record_opportunity_attribution: opportunity % not found in organization %',
      target_opportunity_id, target_organization_id
      using errcode = '22023';
  end if;

  -- Verify source exists in the correct table
  if target_source_type = 'CAMPAIGN' then
    select exists (
      select 1 from public.growth_campaigns
      where id = target_source_id and organization_id = target_organization_id
    ) into source_ok;
  elsif target_source_type = 'LEAD' then
    select exists (
      select 1 from public.leads
      where id = target_source_id and organization_id = target_organization_id
    ) into source_ok;
  elsif target_source_type = 'CONVERSATION' then
    select exists (
      select 1 from public.growth_conversations
      where id = target_source_id and organization_id = target_organization_id
    ) into source_ok;
  elsif target_source_type = 'PUBLICATION' then
    select exists (
      select 1 from public.growth_publications
      where id = target_source_id and organization_id = target_organization_id
    ) into source_ok;
  else
    source_ok := true; -- MANUAL / UNKNOWN
  end if;

  if not source_ok then
    raise exception 'record_opportunity_attribution: source_id % of type % not found in organization %',
      target_source_id, target_source_type, target_organization_id
      using errcode = '22023';
  end if;

  -- Idempotency: return existing ACTIVE row if any
  if target_source_id is not null then
    select id into existing_id
    from public.opportunity_attributions
    where organization_id = target_organization_id
      and opportunity_id = target_opportunity_id
      and source_type = target_source_type
      and source_id = target_source_id
      and revoked_at is null;
  else
    select id into existing_id
    from public.opportunity_attributions
    where organization_id = target_organization_id
      and opportunity_id = target_opportunity_id
      and source_type = target_source_type
      and source_id is null
      and revoked_at is null;
  end if;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.opportunity_attributions (
    organization_id, opportunity_id, source_type, source_id,
    confidence, reason, attributed_by_user_id, provenance
  ) values (
    target_organization_id, target_opportunity_id, target_source_type, target_source_id,
    target_confidence, target_reason, target_attributed_by_user_id,
    coalesce(target_provenance, '{}'::jsonb)
  ) returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'opportunity_attribution.record',
    'opportunity_attribution', new_id,
    jsonb_build_object(
      'opportunity_id', target_opportunity_id,
      'source_type', target_source_type,
      'source_id', target_source_id,
      'confidence', target_confidence
    )
  );
  return new_id;
end;
$$;

revoke all on function public.record_opportunity_attribution(uuid, uuid, text, uuid, text, text, uuid, jsonb) from public, anon;
grant execute on function public.record_opportunity_attribution(uuid, uuid, text, uuid, text, text, uuid, jsonb) to authenticated, service_role;

comment on function public.record_opportunity_attribution(uuid, uuid, text, uuid, text, text, uuid, jsonb) is
  'Insert an attribution row for an opportunity. Idempotent — returns the existing ACTIVE row id if one already exists for (opp, source_type, source_id). Validates source_id exists in the correct source table. AI must NEVER assert OBSERVED unilaterally; use ESTIMATED with heuristic evidence in provenance.';

-- =========================================================================
-- revoke_opportunity_attribution — mark an attribution as revoked
-- =========================================================================
create or replace function public.revoke_opportunity_attribution(
  target_organization_id uuid,
  target_attribution_id  uuid,
  target_revoked_by_user_id uuid,
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
    raise exception 'revoke_opportunity_attribution: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_revoked_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'revoke_opportunity_attribution: revoker % is not an ACTIVE member of organization %',
      target_revoked_by_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 500 then
    raise exception 'revoke_opportunity_attribution: reason must be a non-empty string ≤500 chars'
      using errcode = '22023';
  end if;

  update public.opportunity_attributions
    set revoked_at         = now(),
        revoked_by_user_id = target_revoked_by_user_id,
        revoke_reason      = target_reason
  where id = target_attribution_id
    and organization_id = target_organization_id
    and revoked_at is null;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'opportunity_attribution.revoke',
      'opportunity_attribution', target_attribution_id,
      jsonb_build_object('reason', target_reason, 'revoked_by_user_id', target_revoked_by_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.revoke_opportunity_attribution(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.revoke_opportunity_attribution(uuid, uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- attribution_report_by_source — aggregate BY confidence (READ)
-- =========================================================================
-- Returns one row per (source_type, source_id, confidence) with counts
-- and estimated value. CALLERS MUST NOT collapse OBSERVED + ESTIMATED —
-- the shape forces callers to display all three confidence buckets
-- distinctly.
create or replace function public.attribution_report_by_source(
  target_organization_id uuid,
  target_since           timestamptz,
  target_until           timestamptz
)
returns table (
  source_type            text,
  source_id              uuid,
  confidence             text,
  opportunity_count      bigint,
  distinct_opportunities bigint,
  total_estimated_value  numeric,
  currency_mix           text[]
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'attribution_report_by_source: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_since is null or target_until is null then
    raise exception 'attribution_report_by_source: since and until are required'
      using errcode = '22023';
  end if;
  if target_since >= target_until then
    raise exception 'attribution_report_by_source: since (%) must be < until (%)', target_since, target_until
      using errcode = '22023';
  end if;

  return query
  select
    a.source_type,
    a.source_id,
    a.confidence,
    count(*)::bigint                       as opportunity_count,
    count(distinct a.opportunity_id)::bigint as distinct_opportunities,
    coalesce(sum(o.estimated_value), 0)    as total_estimated_value,
    array_agg(distinct o.currency)         as currency_mix
  from public.opportunity_attributions a
  join public.opportunities o
    on o.id = a.opportunity_id
   and o.organization_id = a.organization_id
  where a.organization_id = target_organization_id
    and a.revoked_at is null
    and a.attributed_at >= target_since
    and a.attributed_at <  target_until
  group by a.source_type, a.source_id, a.confidence
  order by a.source_type, a.confidence, opportunity_count desc;
end;
$$;

revoke all on function public.attribution_report_by_source(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.attribution_report_by_source(uuid, timestamptz, timestamptz) to authenticated, service_role;

comment on function public.attribution_report_by_source(uuid, timestamptz, timestamptz) is
  'Aggregate attributions by (source_type, source_id, confidence). Callers MUST NOT collapse OBSERVED + ESTIMATED into a single bucket. UNKNOWN rows must be shown (dark funnel). currency_mix flags multi-currency source rows for report renderers.';

-- =========================================================================
-- opportunity_attributions_for — read all attributions for one opp
-- =========================================================================
create or replace function public.opportunity_attributions_for(
  target_organization_id uuid,
  target_opportunity_id  uuid,
  target_include_revoked boolean
)
returns table (
  attribution_id        uuid,
  source_type           text,
  source_id             uuid,
  confidence            text,
  reason                text,
  attributed_by_user_id uuid,
  attributed_at         timestamptz,
  revoked_at            timestamptz,
  revoked_by_user_id    uuid,
  revoke_reason         text,
  provenance            jsonb
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'opportunity_attributions_for: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    a.id, a.source_type, a.source_id, a.confidence, a.reason,
    a.attributed_by_user_id, a.attributed_at, a.revoked_at,
    a.revoked_by_user_id, a.revoke_reason, a.provenance
  from public.opportunity_attributions a
  where a.organization_id = target_organization_id
    and a.opportunity_id = target_opportunity_id
    and (target_include_revoked or a.revoked_at is null)
  order by a.attributed_at desc;
end;
$$;

revoke all on function public.opportunity_attributions_for(uuid, uuid, boolean) from public, anon;
grant execute on function public.opportunity_attributions_for(uuid, uuid, boolean) to authenticated, service_role;
