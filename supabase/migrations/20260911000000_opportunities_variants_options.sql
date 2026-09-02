-- SESIRA Core Workflow — opportunities + quote variants + options (C18).
--
-- Introduces the commercial-container abstraction:
--
--     Opportunity  ──┬── Variant "standard" ── Revision 1 ── Revision 2 (current)
--                    ├── Variant "premium"   ── Revision 1 (current)
--                    └── Variant "quick"     ── Revision 1 (current)
--
-- and per-quote line-item options (quote_options).
--
-- Design decisions:
--
--   * `quotes.opportunity_id` is NULLABLE. Every existing quote is
--     backfilled with a fresh 1:1 opportunity so the app code that
--     does not yet know about opportunities keeps working. A new
--     quote written by legacy code without an opportunity_id is
--     still valid (a caller who cares can lazily attach one via
--     `attach_quote_to_opportunity`).
--   * `variant_key` + `revision` + `is_current_revision` live on
--     `quotes` (rather than a separate `quote_revisions` table)
--     because the invariants (state machine, RLS, sent_at, follow-up
--     scheduling) apply per-revision — moving them to a sibling
--     table would double every foreign-key relationship.
--   * A partial unique index enforces at-most-one current revision
--     per (opportunity_id, variant_key). Historical revisions stay
--     queryable but do not compete for the follow-up scheduler's
--     attention.
--   * `quote_options` is a new table. Options are line-items the
--     customer can pick — status transitions from PROPOSED to
--     INCLUDED / EXCLUDED / REJECTED via a dedicated RPC that
--     records `selected_at`. The parent quote's amount is NOT
--     mutated by option selection — a caller that wants the sum
--     of INCLUDED options computes it from the read model.
--   * Opportunity state machine is enforced by a trigger AND
--     restated inside `transition_opportunity_state` so a
--     service_role bypass still respects valid transitions.

-- =========================================================================
-- 1. opportunities table
-- =========================================================================
create table public.opportunities (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  customer_id           uuid not null,
  request_id            uuid,
  commercial_state      text not null default 'NEW'
    check (commercial_state in ('NEW', 'QUALIFYING', 'ACTIVE', 'WON', 'LOST', 'CANCELLED')),
  owner_user_id         uuid,
  estimated_value       numeric(12,2) check (estimated_value is null or estimated_value >= 0),
  currency              text not null default 'EUR' check (char_length(currency) between 3 and 3),
  opened_at             timestamptz not null default now(),
  expected_close_date   date,
  closed_at             timestamptz,
  closed_reason         text check (closed_reason is null or length(closed_reason) <= 500),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete restrict,
  foreign key (request_id, organization_id) references public.requests(id, organization_id) on delete set null,
  unique (id, organization_id)
);

comment on table public.opportunities is
  'Commercial container. One opportunity may hold multiple quote variants and multiple revisions per variant; each is a single quote row. State machine: NEW -> QUALIFYING -> ACTIVE -> (WON | LOST | CANCELLED).';

create index opportunities_org_state_idx on public.opportunities (organization_id, commercial_state);
create index opportunities_org_customer_idx on public.opportunities (organization_id, customer_id);
create index opportunities_org_owner_idx on public.opportunities (organization_id, owner_user_id) where owner_user_id is not null;

alter table public.opportunities enable row level security;

create policy opportunities_select on public.opportunities
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy opportunities_insert on public.opportunities
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy opportunities_update on public.opportunities
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.opportunities to authenticated;
grant select, insert, update on public.opportunities to service_role;

-- Opportunity state-machine trigger (same short-circuit pattern as
-- the quote trigger — authenticated writes only; the RPC re-imposes
-- the invariant for service_role callers).
create or replace function private.enforce_opportunity_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.commercial_state in ('WON', 'LOST', 'CANCELLED') then
    raise exception 'opportunity % is terminal (state=%) and cannot transition to %',
      old.id, old.commercial_state, new.commercial_state
      using errcode = '22023';
  end if;

  if not (
    (old.commercial_state = 'NEW'         and new.commercial_state in ('QUALIFYING', 'ACTIVE', 'WON', 'LOST', 'CANCELLED')) or
    (old.commercial_state = 'QUALIFYING'  and new.commercial_state in ('ACTIVE', 'WON', 'LOST', 'CANCELLED')) or
    (old.commercial_state = 'ACTIVE'      and new.commercial_state in ('WON', 'LOST', 'CANCELLED')) or
    (old.commercial_state = new.commercial_state)
  ) then
    raise exception 'opportunity % cannot transition from % to %',
      old.id, old.commercial_state, new.commercial_state
      using errcode = '22023';
  end if;

  if new.commercial_state in ('WON', 'LOST', 'CANCELLED') and new.closed_at is null then
    new.closed_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger opportunities_state_transition
  before update on public.opportunities
  for each row execute function private.enforce_opportunity_state_transition();

-- =========================================================================
-- 2. Extend quotes with opportunity + variant + revision
-- =========================================================================
alter table public.quotes
  add column opportunity_id      uuid,
  add column variant_key         text not null default 'default'
    check (variant_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$' and length(variant_key) between 1 and 64),
  add column revision            integer not null default 1 check (revision >= 1),
  add column is_current_revision boolean not null default true,
  add column previous_quote_id   uuid;

comment on column public.quotes.opportunity_id is
  'Nullable FK to opportunities. Backfilled 1:1 for pre-C18 quotes; a fresh legacy INSERT is allowed to leave it null and attach later via attach_quote_to_opportunity.';
comment on column public.quotes.variant_key is
  'Distinguishes coexisting variants of the same opportunity (e.g. `standard`, `premium`, `quick`). kebab-underscore-only, max 64 chars.';
comment on column public.quotes.revision is
  'Monotonic revision number within (opportunity_id, variant_key). Starts at 1; a caller creates a new revision via create_quote_revision (which flips is_current_revision on the previous row).';
comment on column public.quotes.is_current_revision is
  'At most one row per (opportunity_id, variant_key) may have this = true. Enforced by a partial unique index below.';

-- FK on opportunity_id + (opportunity_id, organization_id) for cross-tenant safety.
alter table public.quotes
  add constraint quotes_opportunity_id_org_fkey
  foreign key (opportunity_id, organization_id)
  references public.opportunities(id, organization_id) on delete set null;

-- Self-FK for previous_quote_id (must also match org via existing (id, org) unique).
alter table public.quotes
  add constraint quotes_previous_quote_id_org_fkey
  foreign key (previous_quote_id, organization_id)
  references public.quotes(id, organization_id) on delete set null;

-- Backfill: every existing quote → its own opportunity (1:1 for now).
-- Legacy code that never touched opportunities keeps working; new code
-- can start rolling multiple variants under one opportunity.
do $$
declare
  q record;
  new_opp_id uuid;
begin
  for q in select id, organization_id, customer_id, request_id, amount, currency, status, sent_at
           from public.quotes
           where opportunity_id is null
  loop
    insert into public.opportunities (
      organization_id, customer_id, request_id, commercial_state,
      estimated_value, currency, opened_at, closed_at, closed_reason
    )
    values (
      q.organization_id, q.customer_id, q.request_id,
      case q.status
        when 'DRAFT'        then 'NEW'
        when 'SENT'         then 'ACTIVE'
        when 'FOLLOWING_UP' then 'ACTIVE'
        when 'REPLIED'      then 'ACTIVE'
        when 'NEEDS_HUMAN'  then 'ACTIVE'
        when 'WON'          then 'WON'
        when 'LOST'         then 'LOST'
        when 'EXPIRED'      then 'LOST'
        else 'NEW'
      end,
      q.amount, coalesce(q.currency, 'EUR'),
      coalesce(q.sent_at, now()),
      case when q.status in ('WON', 'LOST', 'EXPIRED') then now() else null end,
      case when q.status = 'EXPIRED' then 'auto-closed on expiry' else null end
    )
    returning id into new_opp_id;

    update public.quotes set opportunity_id = new_opp_id where id = q.id;
  end loop;
end;
$$;

-- Partial unique: at most one current revision per (opportunity, variant).
create unique index quotes_current_variant_revision_idx
  on public.quotes (opportunity_id, variant_key)
  where is_current_revision = true and opportunity_id is not null;

create index quotes_opportunity_idx on public.quotes (opportunity_id) where opportunity_id is not null;

-- =========================================================================
-- 3. quote_options table
-- =========================================================================
create table public.quote_options (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  quote_id          uuid not null,
  option_key        text not null check (option_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$' and length(option_key) between 1 and 64),
  name              text not null check (length(name) between 1 and 200),
  amount            numeric(12,2) check (amount is null or amount >= 0),
  currency          text not null default 'EUR' check (char_length(currency) between 3 and 3),
  status            text not null default 'PROPOSED'
    check (status in ('PROPOSED', 'INCLUDED', 'EXCLUDED', 'REJECTED')),
  selected_at       timestamptz,
  ordinal           integer not null default 0 check (ordinal >= 0),
  metadata          jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (quote_id, organization_id) references public.quotes(id, organization_id) on delete cascade,
  unique (quote_id, option_key)
);

comment on table public.quote_options is
  'Line-item options on a quote. Status transitions PROPOSED -> INCLUDED / EXCLUDED / REJECTED via select_quote_option. The parent quote.amount is NOT mutated by selection — the read layer computes the sum of INCLUDED options if needed.';

create index quote_options_quote_status_idx on public.quote_options (quote_id, status);
create index quote_options_org_idx on public.quote_options (organization_id);

alter table public.quote_options enable row level security;

create policy quote_options_select on public.quote_options
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy quote_options_insert on public.quote_options
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy quote_options_update on public.quote_options
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.quote_options to authenticated;
grant select, insert, update on public.quote_options to service_role;

-- =========================================================================
-- 4. RPCs
-- =========================================================================
create or replace function public.create_opportunity_with_quote(
  target_organization_id uuid,
  target_customer_id     uuid,
  target_request_id      uuid,
  target_owner_user_id   uuid,
  target_estimated_value numeric,
  target_currency        text,
  target_quote_title     text,
  target_variant_key     text,
  target_metadata        jsonb
)
returns table (opportunity_id uuid, quote_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_opp_id   uuid;
  new_quote_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'create_opportunity_with_quote: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  insert into public.opportunities (
    organization_id, customer_id, request_id, commercial_state,
    owner_user_id, estimated_value, currency, metadata
  )
  values (
    target_organization_id, target_customer_id, target_request_id, 'NEW',
    target_owner_user_id, target_estimated_value,
    coalesce(target_currency, 'EUR'),
    coalesce(target_metadata, '{}'::jsonb)
  )
  returning id into new_opp_id;

  insert into public.quotes (
    organization_id, customer_id, request_id, title, amount, currency, status,
    opportunity_id, variant_key, revision, is_current_revision
  )
  values (
    target_organization_id, target_customer_id, target_request_id,
    target_quote_title, target_estimated_value, coalesce(target_currency, 'EUR'), 'DRAFT',
    new_opp_id, coalesce(target_variant_key, 'default'), 1, true
  )
  returning id into new_quote_id;

  opportunity_id := new_opp_id;
  quote_id := new_quote_id;
  return next;
  return;
end;
$$;

revoke all on function public.create_opportunity_with_quote(uuid, uuid, uuid, uuid, numeric, text, text, text, jsonb) from public, anon;
grant execute on function public.create_opportunity_with_quote(uuid, uuid, uuid, uuid, numeric, text, text, text, jsonb) to authenticated, service_role;

comment on function public.create_opportunity_with_quote(uuid, uuid, uuid, uuid, numeric, text, text, text, jsonb) is
  'Atomically create an opportunity + its first quote (variant default, revision 1). Membership on caller enforced. Returns both ids.';

create or replace function public.add_quote_variant_to_opportunity(
  target_organization_id uuid,
  target_opportunity_id  uuid,
  target_variant_key     text,
  target_quote_title     text,
  target_amount          numeric,
  target_currency        text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  opp_row      record;
  new_quote_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'add_quote_variant_to_opportunity: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select id, organization_id, customer_id, request_id, commercial_state
    into opp_row
  from public.opportunities
  where id = target_opportunity_id and organization_id = target_organization_id;

  if opp_row is null then
    raise exception 'add_quote_variant_to_opportunity: opportunity % not found', target_opportunity_id
      using errcode = 'P0002';
  end if;
  if opp_row.commercial_state in ('WON', 'LOST', 'CANCELLED') then
    raise exception 'add_quote_variant_to_opportunity: opportunity % is terminal (state=%)',
      target_opportunity_id, opp_row.commercial_state
      using errcode = '22023';
  end if;

  insert into public.quotes (
    organization_id, customer_id, request_id, title, amount, currency, status,
    opportunity_id, variant_key, revision, is_current_revision
  )
  values (
    target_organization_id, opp_row.customer_id, opp_row.request_id,
    target_quote_title, target_amount, coalesce(target_currency, 'EUR'), 'DRAFT',
    target_opportunity_id, coalesce(target_variant_key, 'default'), 1, true
  )
  returning id into new_quote_id;

  return new_quote_id;
end;
$$;

revoke all on function public.add_quote_variant_to_opportunity(uuid, uuid, text, text, numeric, text) from public, anon;
grant execute on function public.add_quote_variant_to_opportunity(uuid, uuid, text, text, numeric, text) to authenticated, service_role;

create or replace function public.create_quote_revision(
  target_organization_id uuid,
  target_previous_quote_id uuid,
  target_quote_title     text,
  target_amount          numeric,
  target_currency        text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  prev record;
  new_quote_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'create_quote_revision: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select id, organization_id, customer_id, request_id, opportunity_id, variant_key, revision, is_current_revision, status
    into prev
  from public.quotes
  where id = target_previous_quote_id and organization_id = target_organization_id;

  if prev is null then
    raise exception 'create_quote_revision: previous_quote_id % not found', target_previous_quote_id
      using errcode = 'P0002';
  end if;
  if not prev.is_current_revision then
    raise exception 'create_quote_revision: previous quote is not the current revision'
      using errcode = '22023';
  end if;
  if prev.opportunity_id is null then
    raise exception 'create_quote_revision: previous quote has no opportunity_id — attach one first'
      using errcode = '22023';
  end if;
  if prev.status in ('WON', 'LOST', 'EXPIRED') then
    raise exception 'create_quote_revision: previous quote is terminal (status=%)', prev.status
      using errcode = '22023';
  end if;

  -- Flip the previous row's current flag BEFORE inserting the new
  -- revision so the partial unique index is honored.
  update public.quotes set is_current_revision = false
    where id = target_previous_quote_id and organization_id = target_organization_id;

  insert into public.quotes (
    organization_id, customer_id, request_id, title, amount, currency, status,
    opportunity_id, variant_key, revision, is_current_revision, previous_quote_id
  )
  values (
    target_organization_id, prev.customer_id, prev.request_id,
    target_quote_title, target_amount, coalesce(target_currency, 'EUR'), 'DRAFT',
    prev.opportunity_id, prev.variant_key, prev.revision + 1, true, target_previous_quote_id
  )
  returning id into new_quote_id;

  return new_quote_id;
end;
$$;

revoke all on function public.create_quote_revision(uuid, uuid, text, numeric, text) from public, anon;
grant execute on function public.create_quote_revision(uuid, uuid, text, numeric, text) to authenticated, service_role;

create or replace function public.select_quote_option(
  target_organization_id uuid,
  target_option_id       uuid,
  target_new_status      text
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
    raise exception 'select_quote_option: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_new_status not in ('PROPOSED', 'INCLUDED', 'EXCLUDED', 'REJECTED') then
    raise exception 'select_quote_option: status must be PROPOSED|INCLUDED|EXCLUDED|REJECTED (got %)', target_new_status
      using errcode = '22023';
  end if;

  update public.quote_options
    set status = target_new_status,
        selected_at = case when target_new_status in ('INCLUDED', 'EXCLUDED', 'REJECTED') then now() else null end,
        updated_at = now()
  where id = target_option_id
    and organization_id = target_organization_id;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.select_quote_option(uuid, uuid, text) from public, anon;
grant execute on function public.select_quote_option(uuid, uuid, text) to authenticated, service_role;

create or replace function public.transition_opportunity_state(
  target_organization_id uuid,
  target_opportunity_id  uuid,
  target_new_state       text,
  target_closed_reason   text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state text;
  affected      integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'transition_opportunity_state: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_new_state not in ('NEW', 'QUALIFYING', 'ACTIVE', 'WON', 'LOST', 'CANCELLED') then
    raise exception 'transition_opportunity_state: invalid state %', target_new_state
      using errcode = '22023';
  end if;

  select commercial_state into current_state
  from public.opportunities
  where id = target_opportunity_id and organization_id = target_organization_id
  for update;

  if current_state is null then
    return false;
  end if;
  if current_state in ('WON', 'LOST', 'CANCELLED') then
    raise exception 'transition_opportunity_state: opportunity % is terminal (state=%)',
      target_opportunity_id, current_state
      using errcode = '22023';
  end if;
  if not (
    (current_state = 'NEW'         and target_new_state in ('QUALIFYING', 'ACTIVE', 'WON', 'LOST', 'CANCELLED')) or
    (current_state = 'QUALIFYING'  and target_new_state in ('ACTIVE', 'WON', 'LOST', 'CANCELLED')) or
    (current_state = 'ACTIVE'      and target_new_state in ('WON', 'LOST', 'CANCELLED'))
  ) then
    raise exception 'transition_opportunity_state: cannot transition from % to %',
      current_state, target_new_state
      using errcode = '22023';
  end if;

  update public.opportunities
    set commercial_state = target_new_state,
        closed_reason = target_closed_reason
  where id = target_opportunity_id
    and organization_id = target_organization_id
    and commercial_state = current_state;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.transition_opportunity_state(uuid, uuid, text, text) from public, anon;
grant execute on function public.transition_opportunity_state(uuid, uuid, text, text) to authenticated, service_role;

comment on function public.transition_opportunity_state(uuid, uuid, text, text) is
  'Transition an opportunity state. Enforces the same transitions the authenticated trigger does — the trigger short-circuits for service_role, so this RPC re-imposes the invariant unconditionally.';
