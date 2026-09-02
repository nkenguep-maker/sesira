-- SESIRA Core Workflow — value policies + sold-not-scheduled (C19).
--
-- Two related pieces:
--
--   1. `value_policies` — org-scoped, deterministic rules that map
--      (amount, currency) → required workflow mode (SHADOW |
--      APPROVAL | AUTOMATIC | HUMAN_FIRST). No universal threshold
--      is hardcoded — each org configures its bands. When multiple
--      policies match, the highest-specificity policy wins
--      (smallest amount range covering the value).
--
--   2. `sold_not_scheduled_opportunities` (RPC, not a table) —
--      detects WON opportunities that have no downstream operational
--      signal (`intervention.scheduled` event or similar) within a
--      configurable window. Since interventions (C25) do not exist
--      yet, the detector reads `events` of the marker type generically;
--      today it returns the WON opportunities without any followup
--      event. C25 will emit the marker event when interventions ship.
--
-- DOCTRINE INVARIANTS:
--
--   * `HUMAN_FIRST` is emitted only for policies flagged as such —
--     it is NOT a synonym for "high value ≥ N". An org can choose
--     to require human-first review at any band, including low-value.
--   * The policy resolver is DETERMINISTIC and pure. Given the
--     same (org, amount, currency) it always returns the same
--     policy id. No AI in the resolution path.
--   * Currency comparison is exact (no auto-conversion). A policy
--     configured for `EUR` does not match a `USD` quote.

-- =========================================================================
-- 1. value_policies table
-- =========================================================================
create table public.value_policies (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  name                      text not null check (length(name) between 1 and 120),
  applies_to                text not null check (applies_to in ('quote', 'opportunity')),
  min_amount                numeric(12,2) not null check (min_amount >= 0),
  max_amount                numeric(12,2) check (max_amount is null or max_amount >= min_amount),
  currency                  text not null default 'EUR' check (char_length(currency) between 3 and 3),
  required_workflow_mode    text not null
    check (required_workflow_mode in ('OBSERVATION', 'SHADOW', 'APPROVAL', 'AUTOMATIC', 'HUMAN_FIRST')),
  reason                    text not null check (length(reason) between 1 and 500),
  priority                  integer not null default 0 check (priority >= 0),
  enabled                   boolean not null default true,
  metadata                  jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.value_policies is
  'Org-scoped deterministic policies mapping (amount, currency, applies_to) to a required workflow mode. Resolution is pure: highest priority + tightest range wins.';

comment on column public.value_policies.reason is
  'Human-readable explanation returned by resolve_value_policy so a UI or Attention can render the "why".';
comment on column public.value_policies.priority is
  'Tie-breaker when two policies could match. Higher priority wins. When equal, the tighter range wins.';
comment on column public.value_policies.required_workflow_mode is
  'HUMAN_FIRST forces human handling regardless of AI confidence. Reserve for high-value or explicitly sensitive bands.';

create index value_policies_org_applies_idx
  on public.value_policies (organization_id, applies_to)
  where enabled = true;

alter table public.value_policies enable row level security;

create policy value_policies_select on public.value_policies
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy value_policies_insert on public.value_policies
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy value_policies_update on public.value_policies
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.value_policies to authenticated;
grant select, insert, update on public.value_policies to service_role;

-- =========================================================================
-- 2. resolve_value_policy — deterministic resolver
-- =========================================================================
create or replace function public.resolve_value_policy(
  target_organization_id uuid,
  target_applies_to      text,
  target_amount          numeric,
  target_currency        text
)
returns table (
  policy_id              uuid,
  required_workflow_mode text,
  reason                 text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen record;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'resolve_value_policy: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_applies_to not in ('quote', 'opportunity') then
    raise exception 'resolve_value_policy: applies_to must be quote|opportunity (got %)', target_applies_to
      using errcode = '22023';
  end if;
  if target_amount is null or target_amount < 0 then
    raise exception 'resolve_value_policy: amount must be >= 0 (got %)', target_amount
      using errcode = '22023';
  end if;

  -- Highest priority wins; on tie the tightest range (smallest
  -- (max-min)) wins; on further tie the most recent insert wins.
  select
    id,
    required_workflow_mode,
    reason
  into chosen
  from public.value_policies
  where organization_id = target_organization_id
    and applies_to = target_applies_to
    and currency = coalesce(target_currency, 'EUR')
    and enabled = true
    and target_amount >= min_amount
    and (max_amount is null or target_amount <= max_amount)
  order by
    priority desc,
    (coalesce(max_amount, target_amount + 1) - min_amount) asc,
    created_at desc
  limit 1;

  if chosen is null then
    return; -- No matching policy — caller renders the org's default mode.
  end if;

  policy_id := chosen.id;
  required_workflow_mode := chosen.required_workflow_mode;
  reason := chosen.reason;
  return next;
end;
$$;

revoke all on function public.resolve_value_policy(uuid, text, numeric, text) from public, anon;
grant execute on function public.resolve_value_policy(uuid, text, numeric, text) to authenticated, service_role;

comment on function public.resolve_value_policy(uuid, text, numeric, text) is
  'Deterministic policy resolver. Returns the winning policy id + required workflow mode + reason, or an empty result set when no policy matches (caller falls back to the org default). Pure; no AI.';

-- =========================================================================
-- 3. sold_not_scheduled_opportunities — read function
-- =========================================================================
create or replace function public.sold_not_scheduled_opportunities(
  target_organization_id uuid,
  target_since           timestamptz,
  target_marker_types    text[]
)
returns table (
  opportunity_id     uuid,
  customer_id        uuid,
  estimated_value    numeric,
  currency           text,
  closed_at          timestamptz,
  age_hours          numeric
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'sold_not_scheduled_opportunities: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    o.id,
    o.customer_id,
    o.estimated_value,
    o.currency,
    o.closed_at,
    extract(epoch from (now() - o.closed_at)) / 3600.0 as age_hours
  from public.opportunities o
  where o.organization_id = target_organization_id
    and o.commercial_state = 'WON'
    and o.closed_at is not null
    and o.closed_at >= target_since
    and not exists (
      select 1
      from public.events e
      where e.organization_id = target_organization_id
        and e.entity_type = 'opportunity'
        and e.entity_id = o.id
        and e.type = any(coalesce(target_marker_types, array['intervention.scheduled', 'intervention.completed']))
        and e.created_at >= o.closed_at
    )
  order by o.closed_at desc;
end;
$$;

revoke all on function public.sold_not_scheduled_opportunities(uuid, timestamptz, text[]) from public, anon;
grant execute on function public.sold_not_scheduled_opportunities(uuid, timestamptz, text[]) to authenticated, service_role;

comment on function public.sold_not_scheduled_opportunities(uuid, timestamptz, text[]) is
  'Detect WON opportunities that have no operational-next-step event (marker types, default intervention.scheduled/completed) since closed_at. Placeholder marker set until C25 interventions ship; the query itself is generic and honors any future marker.';
