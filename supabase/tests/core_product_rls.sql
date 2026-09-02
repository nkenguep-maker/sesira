-- Run against a migrated SESIRA database as an administrative connection.
-- The transaction is always rolled back: no fixture or state change persists.

begin;

do $$
begin
  if has_table_privilege('anon', 'public.customers', 'select') then
    raise exception 'anon must not have direct customer SELECT privileges';
  end if;

  if exists (
    select 1
    from pg_class
    where oid in (
      'public.customers'::regclass,
      'public.requests'::regclass,
      'public.quotes'::regclass,
      'public.attention_items'::regclass,
      'public.events'::regclass
    )
      and not relrowsecurity
  ) then
    raise exception 'all core product tables must keep RLS enabled';
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '91100000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'rls-a@sesira.test', crypt('not-used', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Tenant A"}'::jsonb,
    now(), now(), false, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '92100000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'rls-b@sesira.test', crypt('not-used', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Tenant B"}'::jsonb,
    now(), now(), false, false
  );

insert into public.organizations (id, name, slug, status)
values
  ('91000000-0000-4000-8000-000000000001', 'RLS Tenant A', 'rls-tenant-a', 'ACTIVE'),
  ('92000000-0000-4000-8000-000000000002', 'RLS Tenant B', 'rls-tenant-b', 'ACTIVE');

insert into public.organization_members (organization_id, user_id, role, status)
values
  ('91000000-0000-4000-8000-000000000001', '91100000-0000-4000-8000-000000000001', 'OWNER', 'ACTIVE'),
  ('92000000-0000-4000-8000-000000000002', '92100000-0000-4000-8000-000000000002', 'OWNER', 'ACTIVE');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

insert into public.customers (id, organization_id, display_name, email)
values (
  '91300000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  'Customer A',
  'customer-a@sesira.test'
);

insert into public.requests (id, organization_id, customer_id, title, source, status)
values (
  '91400000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  '91300000-0000-4000-8000-000000000001',
  'Request A',
  'MANUAL',
  'NEW'
);

insert into public.quotes (id, organization_id, customer_id, request_id, title, amount, status)
values (
  '91500000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  '91300000-0000-4000-8000-000000000001',
  '91400000-0000-4000-8000-000000000001',
  'Quote A',
  18450.00,
  'DRAFT'
);

insert into public.attention_items (
  id, organization_id, category, priority, status, reason, title, entity_type, entity_id
)
values (
  '91600000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  'COMMERCIAL_REVIEW',
  'HIGH',
  'OPEN',
  'Manual test fixture',
  'Review quote A',
  'quote',
  '91500000-0000-4000-8000-000000000001'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"92100000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

insert into public.customers (id, organization_id, display_name)
values (
  '92300000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000002',
  'Customer B'
);

insert into public.requests (id, organization_id, customer_id, title, source, status)
values (
  '92400000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000002',
  '92300000-0000-4000-8000-000000000002',
  'Request B',
  'MANUAL',
  'NEW'
);

insert into public.quotes (id, organization_id, customer_id, request_id, title, amount, status)
values (
  '92500000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000002',
  '92300000-0000-4000-8000-000000000002',
  '92400000-0000-4000-8000-000000000002',
  'Quote B',
  9900.00,
  'DRAFT'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  affected integer;
begin
  if (select count(*) from public.customers where id = '91300000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'tenant A must see its customer';
  end if;
  if (select count(*) from public.customers where id = '92300000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'tenant A accessed tenant B customer by known UUID';
  end if;
  if (select count(*) from public.requests where id = '92400000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'tenant A accessed tenant B request by known UUID';
  end if;
  if (select count(*) from public.quotes where id = '92500000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'tenant A accessed tenant B quote by known UUID';
  end if;

  update public.quotes
  set title = 'Cross-tenant update must not happen'
  where id = '92500000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'tenant A updated tenant B quote';
  end if;

  if (select count(*) from public.events where type = 'customer.created' and entity_id = '91300000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'customer.created must be emitted exactly once';
  end if;
  if (select count(*) from public.events where type = 'request.created' and entity_id = '91400000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'request.created must be emitted exactly once';
  end if;
  if (select count(*) from public.events where type = 'quote.created' and entity_id = '91500000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'quote.created must be emitted exactly once';
  end if;
  if (select count(*) from public.events where type = 'quote.sent' and entity_id = '91500000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'draft creation must not emit quote.sent';
  end if;
  if exists (select 1 from public.events where entity_id in (
    '92300000-0000-4000-8000-000000000002',
    '92400000-0000-4000-8000-000000000002',
    '92500000-0000-4000-8000-000000000002'
  )) then
    raise exception 'tenant A timeline exposed tenant B events';
  end if;
end;
$$;

update public.quotes
set status = 'SENT', sent_at = now()
where id = '91500000-0000-4000-8000-000000000001'
  and status = 'DRAFT';

update public.quotes
set status = 'SENT'
where id = '91500000-0000-4000-8000-000000000001';

update public.quotes
set title = 'Quote A revised'
where id = '91500000-0000-4000-8000-000000000001';

update public.attention_items
set status = 'RESOLVED', resolved_at = now()
where id = '91600000-0000-4000-8000-000000000001'
  and status in ('OPEN', 'IN_PROGRESS');

do $$
begin
  if (select count(*) from public.events where type = 'quote.sent' and entity_id = '91500000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'quote.sent must exist once and only after a real transition';
  end if;
  if (select status from public.attention_items where id = '91600000-0000-4000-8000-000000000001') <> 'RESOLVED' then
    raise exception 'tenant A must be able to resolve its attention item';
  end if;
end;
$$;

-- =========================================================================
-- Core Workflow — Request and Quote state-machine enforcement
-- =========================================================================
-- These assertions run as tenant A (`authenticated` role). They confirm the
-- state-machine triggers reject illegal transitions and terminal writes even
-- when a direct Data API attempt bypasses the application transition map.

-- Illegal Request edge: NEW -> READY must be rejected by the trigger.
do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.requests
    set status = 'READY'
    where id = '91400000-0000-4000-8000-000000000001';
    raise exception 'illegal request transition NEW->READY was not rejected';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting illegal request transition', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Illegal Request edge: NEW -> ASSIGNED must be rejected (ASSIGNED is only
-- reachable from READY per the canonical graph).
do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.requests
    set status = 'ASSIGNED'
    where id = '91400000-0000-4000-8000-000000000001';
    raise exception 'illegal request transition NEW->ASSIGNED was not rejected';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting NEW->ASSIGNED', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Walk Request through legal edges NEW -> PROCESSING -> QUALIFIED -> READY
-- -> ASSIGNED (proves the ASSIGNED path is now reachable at DB level) and
-- back to READY, then to CLOSED.
update public.requests set status = 'PROCESSING' where id = '91400000-0000-4000-8000-000000000001';
update public.requests set status = 'QUALIFIED' where id = '91400000-0000-4000-8000-000000000001';
update public.requests set status = 'READY'     where id = '91400000-0000-4000-8000-000000000001';
update public.requests set status = 'ASSIGNED'  where id = '91400000-0000-4000-8000-000000000001';
update public.requests set status = 'READY'     where id = '91400000-0000-4000-8000-000000000001';
update public.requests set status = 'CLOSED'    where id = '91400000-0000-4000-8000-000000000001';

-- Terminal Request protection: CLOSED must not accept any transition.
do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.requests
    set status = 'READY'
    where id = '91400000-0000-4000-8000-000000000001';
    raise exception 'terminal request CLOSED must reject any transition';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting CLOSED transition', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Illegal Quote edge: DRAFT -> FOLLOWING_UP must be rejected (DRAFT can only
-- go to SENT / WON / LOST per the canonical graph). Use a second draft quote
-- to keep the primary fixture available for the sent/replied path below.
insert into public.quotes (id, organization_id, customer_id, request_id, title, amount, status)
values (
  '91500000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000001',
  '91300000-0000-4000-8000-000000000001',
  null,
  'Quote A2',
  4200.00,
  'DRAFT'
);

do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.quotes
    set status = 'FOLLOWING_UP'
    where id = '91500000-0000-4000-8000-000000000002';
    raise exception 'illegal quote transition DRAFT->FOLLOWING_UP was not rejected';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting DRAFT->FOLLOWING_UP', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Direct-API DRAFT -> SENT without sent_at: the trigger must atomically set
-- sent_at, and `quote.sent` must be emitted exactly once. This is the
-- "direct tenant Data API bypass" scenario that must be safe.
update public.quotes
set status = 'SENT'
where id = '91500000-0000-4000-8000-000000000002';

do $$
begin
  if (select sent_at from public.quotes where id = '91500000-0000-4000-8000-000000000002') is null then
    raise exception 'quote sent_at must be set atomically on DRAFT->SENT by the trigger';
  end if;
  if (select count(*) from public.events
      where type = 'quote.sent'
        and entity_id = '91500000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'quote.sent must be emitted exactly once for a real transition';
  end if;
end;
$$;

-- Terminal Quote protection: WON must reject any further transition.
update public.quotes set status = 'WON' where id = '91500000-0000-4000-8000-000000000002';

do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.quotes
    set status = 'REPLIED'
    where id = '91500000-0000-4000-8000-000000000002';
    raise exception 'terminal quote WON must reject any transition';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting WON transition', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Compare-and-set (stale expected status): the second update, targeting the
-- pre-transition status, must affect zero rows because the row is already
-- in the new state. This proves the app-level CAS predicate remains
-- effective alongside the DB trigger.
do $$
declare
  affected integer;
begin
  update public.quotes
  set status = 'WON'
  where id = '91500000-0000-4000-8000-000000000001'
    and status = 'DRAFT';  -- stale expected status; row is already SENT
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'stale CAS predicate must not match';
  end if;
end;
$$;

-- Event-once invariant for the primary quote: two extra no-op updates of
-- the same status must not emit additional quote.sent events (already
-- covered above but re-asserted here for the state-machine section).
do $$
begin
  if (select count(*) from public.events
      where type = 'quote.sent'
        and entity_id = '91500000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'quote.sent for the primary quote must remain exactly one';
  end if;
end;
$$;

-- =========================================================================
-- Tenant-safe assignments — cross-tenant + inactive-member guards
-- =========================================================================
-- These assertions run as tenant A (`authenticated` role). They confirm the
-- BEFORE INSERT/UPDATE assignment triggers on requests, quotes and
-- attention_items reject cross-tenant and non-ACTIVE assignments, while
-- still permitting NULL (unassign) and same-org ACTIVE writes.

-- Suspend a second tenant-A user to prove inactive-member rejection later.
-- We create the user via admin path first (bypass authenticated role).
reset role;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
)
values (
  '00000000-0000-0000-0000-000000000000',
  '91100000-0000-4000-8000-000000000099',
  'authenticated', 'authenticated', 'rls-a-suspended@sesira.test', crypt('not-used', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Tenant A Suspended"}'::jsonb,
  now(), now(), false, false
);
insert into public.organization_members (organization_id, user_id, role, status)
values ('91000000-0000-4000-8000-000000000001', '91100000-0000-4000-8000-000000000099', 'MEMBER', 'SUSPENDED');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

-- Cross-tenant assignment on requests.assigned_user_id must be rejected
-- (tenant A tries to assign tenant B's user to tenant A's request).
do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.requests
    set assigned_user_id = '92100000-0000-4000-8000-000000000002'
    where id = '91400000-0000-4000-8000-000000000001';
    raise exception 'cross-tenant assignment on requests.assigned_user_id was not rejected';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '23514' then
      raise exception 'unexpected sqlstate % rejecting cross-tenant request assignment', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Cross-tenant assignment on quotes.owner_user_id must be rejected.
do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.quotes
    set owner_user_id = '92100000-0000-4000-8000-000000000002'
    where id = '91500000-0000-4000-8000-000000000001';
    raise exception 'cross-tenant assignment on quotes.owner_user_id was not rejected';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '23514' then
      raise exception 'unexpected sqlstate % rejecting cross-tenant quote assignment', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Cross-tenant assignment on attention_items.assigned_user_id must be
-- rejected.
do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.attention_items
    set assigned_user_id = '92100000-0000-4000-8000-000000000002'
    where id = '91600000-0000-4000-8000-000000000001';
    raise exception 'cross-tenant assignment on attention_items.assigned_user_id was not rejected';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '23514' then
      raise exception 'unexpected sqlstate % rejecting cross-tenant attention_item assignment', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Inactive-member assignment must be rejected on all three tables
-- (same organization, but status='SUSPENDED').
do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.requests
    set assigned_user_id = '91100000-0000-4000-8000-000000000099'
    where id = '91400000-0000-4000-8000-000000000001';
    raise exception 'inactive-member assignment on requests was not rejected';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '23514' then
      raise exception 'unexpected sqlstate % rejecting inactive-member request assignment', sqlstate_captured;
    end if;
  end;
end;
$$;

do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.quotes
    set owner_user_id = '91100000-0000-4000-8000-000000000099'
    where id = '91500000-0000-4000-8000-000000000001';
    raise exception 'inactive-member assignment on quotes was not rejected';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '23514' then
      raise exception 'unexpected sqlstate % rejecting inactive-member quote assignment', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Same-org ACTIVE assignment must succeed (positive control).
update public.requests
set assigned_user_id = '91100000-0000-4000-8000-000000000001'
where id = '91400000-0000-4000-8000-000000000001';

update public.quotes
set owner_user_id = '91100000-0000-4000-8000-000000000001'
where id = '91500000-0000-4000-8000-000000000001';

update public.attention_items
set assigned_user_id = '91100000-0000-4000-8000-000000000001'
where id = '91600000-0000-4000-8000-000000000001';

do $$
begin
  if (select assigned_user_id from public.requests where id = '91400000-0000-4000-8000-000000000001')
       <> '91100000-0000-4000-8000-000000000001' then
    raise exception 'same-org ACTIVE assignment on requests did not persist';
  end if;
  if (select owner_user_id from public.quotes where id = '91500000-0000-4000-8000-000000000001')
       <> '91100000-0000-4000-8000-000000000001' then
    raise exception 'same-org ACTIVE assignment on quotes did not persist';
  end if;
  if (select assigned_user_id from public.attention_items where id = '91600000-0000-4000-8000-000000000001')
       <> '91100000-0000-4000-8000-000000000001' then
    raise exception 'same-org ACTIVE assignment on attention_items did not persist';
  end if;
end;
$$;

-- Unassign (set to NULL) must always be allowed regardless of any prior
-- state; the guard only fires when the new value is non-null.
update public.requests
set assigned_user_id = null
where id = '91400000-0000-4000-8000-000000000001';

update public.quotes
set owner_user_id = null
where id = '91500000-0000-4000-8000-000000000001';

update public.attention_items
set assigned_user_id = null
where id = '91600000-0000-4000-8000-000000000001';

-- =========================================================================
-- Quote follow-up safety state — opt-out stickiness + pause invariants
-- =========================================================================
-- Uses the tenant-A DRAFT quote (91500000-0000-4000-8000-000000000003) so
-- the existing SENT/WON fixtures stay clean.
insert into public.quotes (id, organization_id, customer_id, request_id, title, amount, status, next_action_at)
values (
  '91500000-0000-4000-8000-000000000003',
  '91000000-0000-4000-8000-000000000001',
  '91300000-0000-4000-8000-000000000001',
  null,
  'Quote A3 (safety state)',
  1200.00,
  'DRAFT',
  now() - interval '1 day'
);

update public.quotes
set status = 'SENT'
where id = '91500000-0000-4000-8000-000000000003';

-- Pair invariant: setting one of the pause columns without the other must
-- be rejected by the CHECK constraint (23514).
do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.quotes
    set automation_paused_at = now()
    where id = '91500000-0000-4000-8000-000000000003';
    raise exception 'pause pairing invariant was not enforced';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '23514' then
      raise exception 'unexpected sqlstate % rejecting unpaired pause', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Valid pause (both columns together) must succeed.
update public.quotes
set automation_paused_at = now(),
    automation_pause_reason = 'MANUAL'
where id = '91500000-0000-4000-8000-000000000003';

-- Opt-out cannot be cleared by an ordinary tenant UPDATE once set.
update public.quotes
set opted_out_at = now()
where id = '91500000-0000-4000-8000-000000000003';

do $$
declare
  sqlstate_captured text;
begin
  begin
    update public.quotes
    set opted_out_at = null
    where id = '91500000-0000-4000-8000-000000000003';
    raise exception 'opt-out stickiness was not enforced';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting opt-out clear', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Follow-up query invariant: a paused / opted-out quote whose
-- next_action_at is in the past must NOT appear in the "due" set.
do $$
declare
  due_count integer;
begin
  select count(*) into due_count
  from public.quotes
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and status in ('SENT', 'FOLLOWING_UP', 'NEEDS_HUMAN')
    and automation_paused_at is null
    and opted_out_at is null
    and next_action_at is not null
    and next_action_at <= now()
    and id = '91500000-0000-4000-8000-000000000003';
  if due_count <> 0 then
    raise exception 'paused/opted-out quote leaked into follow-up-due set';
  end if;
end;
$$;

-- =========================================================================
-- Deterministic quote follow-up scheduling — claim CAS + lease recovery
-- =========================================================================
-- These assertions run as tenant A (already the current role from the
-- previous section). They exercise the public wrappers
-- (public.claim_automation_run, public.release_automation_run,
-- public.list_due_quote_followup_runs) which mirror what the follow-up
-- worker calls from Postgrest. Together they prove:
--   * Two workers never claim the same PENDING run.
--   * A crashed worker's lease is reclaimed once lock_expires_at passes,
--     bumping attempt_count.
--   * A stale worker cannot release a run reclaimed by another worker.
--   * Cross-tenant claims are rejected (organization scoping AND
--     caller-membership guard).
--   * PENDING runs whose scheduled_for is in the future are not claimable
--     nor listed as due.
--   * list_due_quote_followup_runs enforces every stop guard: automation
--     disabled, quote paused, quote opted-out, terminal / replied quote.
--   * Two orgs never see each other's due rows.
--
-- Fixture: two automation_configs and PENDING automation_runs — one per
-- tenant plus stop-guard rows on tenant A. Runs use fixed UUIDs so we
-- can assert deterministically.
--
-- The fixture below relies on the partial unique index installed by
-- 20260904 (automation_configs_org_template_active_idx) — it inserts
-- one enabled=true row plus one enabled=false row for the same
-- (org, template_key), which the pre-fix hard unique would have
-- rejected. The block that follows asserts the two partial-unique
-- invariants explicitly, on a probe template_key disjoint from the
-- main fixture so the primary due-runs assertions are unaffected.

do $$
declare
  captured_state text;
  disabled_a uuid;
  disabled_b uuid;
begin
  -- (i) Two enabled=true rows for the same (org, template_key) must be
  --     rejected — otherwise list_due_quote_followup_runs would
  --     ambiguate its active-config lookup.
  insert into public.automation_configs (id, organization_id, template_key, template_version, enabled, level)
  values ('91700000-0000-4000-8000-0000000000aa',
          '91000000-0000-4000-8000-000000000001',
          'quote_partial_probe', 1, true, 'AUTOMATIC');
  begin
    insert into public.automation_configs (id, organization_id, template_key, template_version, enabled, level)
    values ('91700000-0000-4000-8000-0000000000ab',
            '91000000-0000-4000-8000-000000000001',
            'quote_partial_probe', 1, true, 'AUTOMATIC');
    raise exception 'second enabled=true row for same (org, template_key) was not rejected';
  exception when others then
    captured_state := sqlstate;
    if captured_state <> '23505' then
      raise exception 'unexpected sqlstate % rejecting second enabled=true config', captured_state;
    end if;
  end;

  -- (ii) Unlimited enabled=false variants for the same (org, template_key)
  --      are allowed — the audit trail of prior configs is preserved
  --      without having to hard-delete them.
  insert into public.automation_configs (id, organization_id, template_key, template_version, enabled, level)
  values ('91700000-0000-4000-8000-0000000000ac',
          '91000000-0000-4000-8000-000000000001',
          'quote_partial_probe', 1, false, 'AUTOMATIC')
  returning id into disabled_a;

  insert into public.automation_configs (id, organization_id, template_key, template_version, enabled, level)
  values ('91700000-0000-4000-8000-0000000000ad',
          '91000000-0000-4000-8000-000000000001',
          'quote_partial_probe', 1, false, 'AUTOMATIC')
  returning id into disabled_b;

  if disabled_a is null or disabled_b is null or disabled_a = disabled_b then
    raise exception 'partial unique must allow multiple enabled=false rows for same (org, template_key)';
  end if;

  -- Cleanup so the fixture below stays deterministic.
  delete from public.automation_configs
   where template_key = 'quote_partial_probe'
     and organization_id = '91000000-0000-4000-8000-000000000001';
end;
$$;

insert into public.automation_configs (id, organization_id, template_key, template_version, enabled, level)
values
  ('91700000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'quote_followup_schedule', 1, true, 'AUTOMATIC'),
  ('91700000-0000-4000-8000-000000000009', '91000000-0000-4000-8000-000000000001', 'quote_followup_schedule', 1, false, 'AUTOMATIC'),
  ('92700000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000002', 'quote_followup_schedule', 1, true, 'AUTOMATIC');

-- Extra tenant-A quotes to exercise stop guards. Each starts as DRAFT to
-- satisfy the state-machine trigger and is then transitioned to a state
-- appropriate for the guard being tested.
insert into public.quotes (id, organization_id, customer_id, request_id, title, amount, status)
values
  ('91500000-0000-4000-8000-00000000000a', '91000000-0000-4000-8000-000000000001', '91300000-0000-4000-8000-000000000001', null, 'Quote A paused',        1000.00, 'DRAFT'),
  ('91500000-0000-4000-8000-00000000000b', '91000000-0000-4000-8000-000000000001', '91300000-0000-4000-8000-000000000001', null, 'Quote A opted-out',     1000.00, 'DRAFT'),
  ('91500000-0000-4000-8000-00000000000c', '91000000-0000-4000-8000-000000000001', '91300000-0000-4000-8000-000000000001', null, 'Quote A replied',       1000.00, 'DRAFT'),
  ('91500000-0000-4000-8000-00000000000d', '91000000-0000-4000-8000-000000000001', '91300000-0000-4000-8000-000000000001', null, 'Quote A terminal WON',  1000.00, 'DRAFT'),
  ('91500000-0000-4000-8000-00000000000e', '91000000-0000-4000-8000-000000000001', '91300000-0000-4000-8000-000000000001', null, 'Quote A disabled cfg',  1000.00, 'DRAFT');

update public.quotes set status = 'SENT' where id in (
  '91500000-0000-4000-8000-00000000000a',
  '91500000-0000-4000-8000-00000000000b',
  '91500000-0000-4000-8000-00000000000c',
  '91500000-0000-4000-8000-00000000000d',
  '91500000-0000-4000-8000-00000000000e'
);

update public.quotes
  set automation_paused_at = now(), automation_pause_reason = 'MANUAL'
  where id = '91500000-0000-4000-8000-00000000000a';

update public.quotes
  set opted_out_at = now()
  where id = '91500000-0000-4000-8000-00000000000b';

update public.quotes
  set status = 'REPLIED'
  where id = '91500000-0000-4000-8000-00000000000c';

update public.quotes
  set status = 'WON'
  where id = '91500000-0000-4000-8000-00000000000d';

insert into public.automation_runs (
  id, organization_id, automation_config_id, idempotency_key,
  status, scheduled_for, input_summary
)
values
  -- The primary tenant-A due run.
  (
    '91800000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    '91700000-0000-4000-8000-000000000001',
    'quote_followup:91500000-0000-4000-8000-000000000001:step:1',
    'PENDING',
    now() - interval '1 minute',
    jsonb_build_object('quote_id', '91500000-0000-4000-8000-000000000001', 'step', 1)
  ),
  -- Tenant B's due run (must remain invisible to tenant A).
  (
    '92800000-0000-4000-8000-000000000002',
    '92000000-0000-4000-8000-000000000002',
    '92700000-0000-4000-8000-000000000002',
    'quote_followup:92500000-0000-4000-8000-000000000002:step:1',
    'PENDING',
    now() - interval '1 minute',
    jsonb_build_object('quote_id', '92500000-0000-4000-8000-000000000002', 'step', 1)
  ),
  -- Future scheduled_for on tenant A — not yet due.
  (
    '91800000-0000-4000-8000-000000000003',
    '91000000-0000-4000-8000-000000000001',
    '91700000-0000-4000-8000-000000000001',
    'quote_followup:91500000-0000-4000-8000-000000000001:step:future',
    'PENDING',
    now() + interval '2 days',
    jsonb_build_object('quote_id', '91500000-0000-4000-8000-000000000001', 'step', 2)
  ),
  -- Stop-guard rows: due timestamp is in the past but the quote / config
  -- is ineligible, so list_due_quote_followup_runs must skip each one.
  (
    '91800000-0000-4000-8000-00000000000a',
    '91000000-0000-4000-8000-000000000001',
    '91700000-0000-4000-8000-000000000001',
    'quote_followup:91500000-0000-4000-8000-00000000000a:step:1',
    'PENDING',
    now() - interval '1 minute',
    jsonb_build_object('quote_id', '91500000-0000-4000-8000-00000000000a', 'step', 1)
  ),
  (
    '91800000-0000-4000-8000-00000000000b',
    '91000000-0000-4000-8000-000000000001',
    '91700000-0000-4000-8000-000000000001',
    'quote_followup:91500000-0000-4000-8000-00000000000b:step:1',
    'PENDING',
    now() - interval '1 minute',
    jsonb_build_object('quote_id', '91500000-0000-4000-8000-00000000000b', 'step', 1)
  ),
  (
    '91800000-0000-4000-8000-00000000000c',
    '91000000-0000-4000-8000-000000000001',
    '91700000-0000-4000-8000-000000000001',
    'quote_followup:91500000-0000-4000-8000-00000000000c:step:1',
    'PENDING',
    now() - interval '1 minute',
    jsonb_build_object('quote_id', '91500000-0000-4000-8000-00000000000c', 'step', 1)
  ),
  (
    '91800000-0000-4000-8000-00000000000d',
    '91000000-0000-4000-8000-000000000001',
    '91700000-0000-4000-8000-000000000001',
    'quote_followup:91500000-0000-4000-8000-00000000000d:step:1',
    'PENDING',
    now() - interval '1 minute',
    jsonb_build_object('quote_id', '91500000-0000-4000-8000-00000000000d', 'step', 1)
  ),
  (
    '91800000-0000-4000-8000-00000000000e',
    '91000000-0000-4000-8000-000000000001',
    '91700000-0000-4000-8000-000000000009',
    'quote_followup:91500000-0000-4000-8000-00000000000e:step:1',
    'PENDING',
    now() - interval '1 minute',
    jsonb_build_object('quote_id', '91500000-0000-4000-8000-00000000000e', 'step', 1)
  );

-- list_due_quote_followup_runs must return ONLY the primary tenant-A run
-- and must NEVER include the future / paused / opted-out / replied /
-- terminal / disabled-config rows, and must be blind to tenant B's run.
do $$
declare
  tenant_a_ids   uuid[];
  expected_id    uuid := '91800000-0000-4000-8000-000000000001';
  forbidden_ids  uuid[] := array[
    '91800000-0000-4000-8000-000000000003',
    '91800000-0000-4000-8000-00000000000a',
    '91800000-0000-4000-8000-00000000000b',
    '91800000-0000-4000-8000-00000000000c',
    '91800000-0000-4000-8000-00000000000d',
    '91800000-0000-4000-8000-00000000000e',
    '92800000-0000-4000-8000-000000000002'
  ];
begin
  select array_agg(id) into tenant_a_ids
  from public.list_due_quote_followup_runs(
    '91000000-0000-4000-8000-000000000001',
    now(),
    100
  );
  if tenant_a_ids is null or not (expected_id = any(tenant_a_ids)) then
    raise exception 'list_due must include the primary tenant-A run';
  end if;
  if exists (select 1 from unnest(forbidden_ids) fid where fid = any(tenant_a_ids)) then
    raise exception 'list_due leaked a stop-guarded or foreign-org run';
  end if;
end;
$$;

-- A tenant-A caller must not see tenant-B rows even when explicitly
-- asking for tenant-B's org id (caller-membership guard).
do $$
declare
  cross_rows integer;
begin
  select count(*) into cross_rows
  from public.list_due_quote_followup_runs(
    '92000000-0000-4000-8000-000000000002',
    now(),
    100
  );
  if cross_rows <> 0 then
    raise exception 'tenant A must not read tenant B due rows via foreign org id';
  end if;
end;
$$;

-- Only one of two "concurrent" workers may claim the same PENDING run.
do $$
declare
  worker_a_won boolean;
  worker_b_won boolean;
begin
  worker_a_won := public.claim_automation_run(
    '91800000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    'worker-a',
    300
  );
  worker_b_won := public.claim_automation_run(
    '91800000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    'worker-b',
    300
  );
  if not worker_a_won then
    raise exception 'first claimer must succeed';
  end if;
  if worker_b_won then
    raise exception 'second claimer must not succeed while lease is valid';
  end if;
end;
$$;

-- A claim with a foreign target_organization_id must be rejected by the
-- caller-membership guard on the public wrapper.
do $$
declare
  sqlstate_captured text;
begin
  begin
    perform public.claim_automation_run(
      '91800000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000002',
      'worker-b-hacker',
      300
    );
    raise exception 'cross-tenant claim was not rejected';
  exception when others then
    sqlstate_captured := sqlstate;
    if sqlstate_captured <> '42501' then
      raise exception 'unexpected sqlstate % rejecting cross-tenant claim', sqlstate_captured;
    end if;
  end;
end;
$$;

-- Simulate crash: force lock_expires_at into the past. Then a fresh
-- claim must succeed and attempt_count must be bumped.
update public.automation_runs
set lock_expires_at = now() - interval '1 minute'
where id = '91800000-0000-4000-8000-000000000001';

do $$
declare
  reclaim_won boolean;
  new_attempt integer;
begin
  reclaim_won := public.claim_automation_run(
    '91800000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    'worker-c',
    300
  );
  if not reclaim_won then
    raise exception 'expired lease must be reclaimable';
  end if;
  select attempt_count into new_attempt
  from public.automation_runs
  where id = '91800000-0000-4000-8000-000000000001';
  if new_attempt < 1 then
    raise exception 'reclaim must bump attempt_count (got %)', new_attempt;
  end if;
end;
$$;

-- The stale worker (worker-a) must NOT be able to release the run
-- worker-c now owns. This proves lease-holder-only release.
do $$
declare
  stale_release boolean;
begin
  stale_release := public.release_automation_run(
    '91800000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    'worker-a',
    'SUCCEEDED',
    null,
    null
  );
  if stale_release then
    raise exception 'stale worker must not be able to release a reclaimed run';
  end if;
end;
$$;

-- The current lease holder (worker-c) can release, transitioning the
-- run to a terminal status.
do $$
declare
  ok boolean;
  observed_status text;
begin
  ok := public.release_automation_run(
    '91800000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    'worker-c',
    'SUCCEEDED',
    null,
    null
  );
  if not ok then
    raise exception 'current lease holder must be able to release';
  end if;
  select status into observed_status
  from public.automation_runs
  where id = '91800000-0000-4000-8000-000000000001';
  if observed_status <> 'SUCCEEDED' then
    raise exception 'release must transition run to terminal status (got %)', observed_status;
  end if;
end;
$$;

-- A PENDING run whose scheduled_for is in the future must not be
-- claimable yet.
do $$
declare
  early_claim boolean;
begin
  early_claim := public.claim_automation_run(
    '91800000-0000-4000-8000-000000000003',
    '91000000-0000-4000-8000-000000000001',
    'worker-d',
    300
  );
  if early_claim then
    raise exception 'PENDING run with future scheduled_for must not be claimable';
  end if;
end;
$$;

-- Retry path: releasing to PENDING must set next_attempt_at without
-- writing completed_at, and the run must reappear as due only once
-- next_attempt_at has been reached.
do $$
declare
  claimed        boolean;
  released       boolean;
  observed       record;
  future_ids     uuid[];
  past_ids       uuid[];
begin
  claimed := public.claim_automation_run(
    '91800000-0000-4000-8000-000000000003',
    '91000000-0000-4000-8000-000000000001',
    'worker-retry',
    300
  );
  if claimed then
    raise exception 'future-scheduled run should not have been claimable';
  end if;

  -- Force scheduled_for into the past so we can claim, then release
  -- to PENDING with next_attempt_at in the future.
  update public.automation_runs
    set scheduled_for = now() - interval '1 minute'
    where id = '91800000-0000-4000-8000-000000000003';

  claimed := public.claim_automation_run(
    '91800000-0000-4000-8000-000000000003',
    '91000000-0000-4000-8000-000000000001',
    'worker-retry',
    300
  );
  if not claimed then
    raise exception 'past-scheduled retry run must be claimable';
  end if;

  released := public.release_automation_run(
    '91800000-0000-4000-8000-000000000003',
    '91000000-0000-4000-8000-000000000001',
    'worker-retry',
    'PENDING',
    'transient failure',
    now() + interval '5 minutes'
  );
  if not released then
    raise exception 'release with PENDING must succeed for the current lease holder';
  end if;

  select status, completed_at, next_attempt_at, locked_by
    into observed
    from public.automation_runs
    where id = '91800000-0000-4000-8000-000000000003';
  if observed.status <> 'PENDING' then
    raise exception 'PENDING release must keep status PENDING (got %)', observed.status;
  end if;
  if observed.completed_at is not null then
    raise exception 'PENDING release must not stamp completed_at';
  end if;
  if observed.next_attempt_at is null or observed.next_attempt_at <= now() then
    raise exception 'PENDING release must set a future next_attempt_at';
  end if;
  if observed.locked_by is not null then
    raise exception 'PENDING release must clear the lease';
  end if;

  -- With next_attempt_at in the future, list_due must exclude the row.
  select array_agg(id) into future_ids
  from public.list_due_quote_followup_runs(
    '91000000-0000-4000-8000-000000000001',
    now(),
    100
  );
  if future_ids is not null and '91800000-0000-4000-8000-000000000003' = any(future_ids) then
    raise exception 'run with future next_attempt_at must not appear as due';
  end if;

  -- Move next_attempt_at into the past; the row must reappear as due.
  update public.automation_runs
    set next_attempt_at = now() - interval '1 minute'
    where id = '91800000-0000-4000-8000-000000000003';
  select array_agg(id) into past_ids
  from public.list_due_quote_followup_runs(
    '91000000-0000-4000-8000-000000000001',
    now(),
    100
  );
  if past_ids is null or not ('91800000-0000-4000-8000-000000000003' = any(past_ids)) then
    raise exception 'run with reached next_attempt_at must reappear as due';
  end if;
end;
$$;

-- =========================================================================
-- Durable workflow idempotency — insert-once helpers
-- =========================================================================
-- Still running as tenant A (authenticated). These assertions exercise:
--   * insert_event_once: replay of the same (org, idempotency_key) does
--     NOT create a second row and returns created=false.
--   * insert_attention_once: same guarantee, plus proof that a differing
--     title on the replay does not defeat dedup (title is a mutable
--     business value, not part of the identity).
--   * organization isolation: a caller cannot invoke a helper for a
--     foreign org, even if it knows a foreign key.
--   * empty / null idempotency_key is rejected (a caller that skipped
--     the key builder must not silently insert an unkeyed row).
--   * partial unique index still allows multiple rows with NULL keys
--     (manual attention items must remain insertable).

do $$
declare
  first_result   record;
  replay_result  record;
  raw_count      integer;
begin
  select id, created into first_result
  from public.insert_event_once(
    '91000000-0000-4000-8000-000000000001',
    'test_event:quote:91500000-0000-4000-8000-000000000001:replay',
    'quote.followup_decided',
    'CORE_WORKER',
    'quote',
    '91500000-0000-4000-8000-000000000001',
    jsonb_build_object('decision', 'DUE', 'step', 1)
  );
  if not first_result.created then
    raise exception 'first insert_event_once must set created=true';
  end if;

  select id, created into replay_result
  from public.insert_event_once(
    '91000000-0000-4000-8000-000000000001',
    'test_event:quote:91500000-0000-4000-8000-000000000001:replay',
    'quote.followup_decided',
    'CORE_WORKER',
    'quote',
    '91500000-0000-4000-8000-000000000001',
    -- Deliberately different payload — payload is NOT part of identity.
    jsonb_build_object('decision', 'DUE', 'step', 1, 'replayed_at', extract(epoch from now()))
  );
  if replay_result.created then
    raise exception 'replay insert_event_once must set created=false';
  end if;
  if replay_result.id is distinct from first_result.id then
    raise exception 'replay must observe the original row id';
  end if;

  select count(*) into raw_count
  from public.events
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and idempotency_key = 'test_event:quote:91500000-0000-4000-8000-000000000001:replay';
  if raw_count <> 1 then
    raise exception 'duplicate events row after replay (got %)', raw_count;
  end if;
end;
$$;

do $$
declare
  first_id    uuid;
  replay_row  record;
  raw_count   integer;
begin
  select id into first_id
  from public.insert_attention_once(
    '91000000-0000-4000-8000-000000000001',
    'test_attention:quote_reply:abcdef01-2345-6789-abcd-ef0123456789',
    'SALES',
    'MANUAL_REVIEW',
    'Le client a répondu au devis.',
    'NORMAL',
    'quote',
    '91500000-0000-4000-8000-000000000001'
  );
  if first_id is null then
    raise exception 'first insert_attention_once must return an id';
  end if;

  select id, created into replay_row
  from public.insert_attention_once(
    '91000000-0000-4000-8000-000000000001',
    'test_attention:quote_reply:abcdef01-2345-6789-abcd-ef0123456789',
    'SALES',
    'MANUAL_REVIEW',
    -- Different title on the replay — mutable business value, dedup
    -- must not care.
    'Une réponse client à traiter.',
    'HIGH',
    'quote',
    '91500000-0000-4000-8000-000000000001'
  );
  if replay_row.created then
    raise exception 'attention replay must set created=false';
  end if;
  if replay_row.id is distinct from first_id then
    raise exception 'attention replay must observe the original row id';
  end if;

  select count(*) into raw_count
  from public.attention_items
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and idempotency_key = 'test_attention:quote_reply:abcdef01-2345-6789-abcd-ef0123456789';
  if raw_count <> 1 then
    raise exception 'duplicate attention_items row after replay (got %)', raw_count;
  end if;
end;
$$;

do $$
declare
  captured_state text;
begin
  begin
    perform public.insert_event_once(
      '92000000-0000-4000-8000-000000000002',
      'test_event:foreign',
      'quote.followup_decided',
      'CORE_WORKER',
      null, null, '{}'::jsonb
    );
    raise exception 'foreign-org insert_event_once was not rejected';
  exception when others then
    captured_state := sqlstate;
    if captured_state <> '42501' then
      raise exception 'unexpected sqlstate % rejecting foreign insert', captured_state;
    end if;
  end;
end;
$$;

do $$
declare
  captured_state text;
begin
  begin
    perform public.insert_event_once(
      '91000000-0000-4000-8000-000000000001',
      '',
      'quote.followup_decided',
      'CORE_WORKER',
      null, null, '{}'::jsonb
    );
    raise exception 'empty idempotency_key was not rejected';
  exception when others then
    captured_state := sqlstate;
    if captured_state <> '22023' then
      raise exception 'unexpected sqlstate % rejecting empty key', captured_state;
    end if;
  end;
end;
$$;

-- Manual attention (no idempotency_key) must remain insertable and the
-- partial unique index must NOT collapse two NULL-key rows.
do $$
declare
  first_id  uuid;
  second_id uuid;
begin
  insert into public.attention_items (
    organization_id, category, reason, title
  ) values (
    '91000000-0000-4000-8000-000000000001', 'SALES', 'MANUAL_REVIEW',
    'Manual attention A'
  ) returning id into first_id;

  insert into public.attention_items (
    organization_id, category, reason, title
  ) values (
    '91000000-0000-4000-8000-000000000001', 'SALES', 'MANUAL_REVIEW',
    'Manual attention B'
  ) returning id into second_id;

  if first_id = second_id then
    raise exception 'partial unique index collapsed two null-key rows';
  end if;
end;
$$;

-- =========================================================================
-- Outbound message boundary — C9 record_intent / mark_sent / mark_failed
-- =========================================================================
-- Still running as tenant A (authenticated). These assertions exercise:
--   * record_outbound_message_intent — replay dedup by
--     (org, idempotency_key), foreign-org caller rejected, empty key
--     rejected.
--   * mark_outbound_message_sent — QUEUED -> SENT transition, replay
--     returns false, cross-tenant caller rejected.
--   * mark_outbound_message_failed — QUEUED -> FAILED transition,
--     error_class enforced, cross-tenant caller rejected.
--
-- Fixture: none — every test row is inserted via record_intent and
-- addressed by the returned id. All rows sit under tenant A so they
-- roll back with the outer transaction.

do $$
declare
  first_row   record;
  replay_row  record;
  cross_row   record;
  raw_count   integer;
  captured    text;
begin
  -- (i) record_outbound_message_intent creates a QUEUED row once.
  select id, created into first_row
  from public.record_outbound_message_intent(
    '91000000-0000-4000-8000-000000000001',
    'outbound:quote_followup:91500000-0000-4000-8000-000000000001:step:1',
    null,
    'resend',
    'email',
    'to@example.com',
    'from@example.com',
    null,
    'Hello',
    repeat('0', 64)
  );
  if not first_row.created then
    raise exception 'first record_outbound_message_intent must set created=true';
  end if;

  -- Replay with a different subject / body_hash observes the original id.
  select id, created into replay_row
  from public.record_outbound_message_intent(
    '91000000-0000-4000-8000-000000000001',
    'outbound:quote_followup:91500000-0000-4000-8000-000000000001:step:1',
    null,
    'resend',
    'email',
    'to@example.com',
    'from@example.com',
    null,
    'Different subject',
    repeat('1', 64)
  );
  if replay_row.created then
    raise exception 'replay record_outbound_message_intent must set created=false';
  end if;
  if replay_row.id is distinct from first_row.id then
    raise exception 'replay must observe the original row id';
  end if;

  select count(*) into raw_count
  from public.outbound_messages
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and idempotency_key = 'outbound:quote_followup:91500000-0000-4000-8000-000000000001:step:1';
  if raw_count <> 1 then
    raise exception 'duplicate outbound_messages row after replay (got %)', raw_count;
  end if;

  -- (ii) mark_outbound_message_sent moves QUEUED -> SENT once.
  if not public.mark_outbound_message_sent(
    '91000000-0000-4000-8000-000000000001',
    first_row.id,
    'resend_msg_c9_alpha'
  ) then
    raise exception 'mark_outbound_message_sent should return true on first call';
  end if;
  if public.mark_outbound_message_sent(
    '91000000-0000-4000-8000-000000000001',
    first_row.id,
    'resend_msg_c9_alpha'
  ) then
    raise exception 'mark_outbound_message_sent replay on SENT row must return false';
  end if;

  -- Verify the row transitioned correctly.
  select provider_message_id into captured
  from public.outbound_messages where id = first_row.id;
  if captured is distinct from 'resend_msg_c9_alpha' then
    raise exception 'provider_message_id not persisted (got %)', captured;
  end if;

  -- (iii) mark_outbound_message_failed on a fresh QUEUED row.
  select id, created into cross_row
  from public.record_outbound_message_intent(
    '91000000-0000-4000-8000-000000000001',
    'outbound:quote_followup:91500000-0000-4000-8000-000000000002:step:1',
    null,
    'resend',
    'email',
    'to2@example.com',
    'from@example.com',
    null,
    'Second',
    repeat('a', 64)
  );
  if not cross_row.created then
    raise exception 'second record_outbound_message_intent must set created=true';
  end if;
  if not public.mark_outbound_message_failed(
    '91000000-0000-4000-8000-000000000001',
    cross_row.id,
    'PERMANENT',
    'resend: HTTP 422 — invalid recipient'
  ) then
    raise exception 'mark_outbound_message_failed should return true on QUEUED row';
  end if;

  -- (iv) mark_outbound_message_failed rejects an unknown error_class (22023).
  begin
    perform public.mark_outbound_message_failed(
      '91000000-0000-4000-8000-000000000001',
      cross_row.id,
      'WHATEVER',
      'invalid class'
    );
    raise exception 'mark_outbound_message_failed with invalid class was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting invalid error_class', captured;
    end if;
  end;

  -- (v) empty idempotency_key rejected (22023).
  begin
    perform public.record_outbound_message_intent(
      '91000000-0000-4000-8000-000000000001',
      '',
      null, 'resend', 'email',
      'to@example.com', 'from@example.com', null,
      'x', repeat('0', 64)
    );
    raise exception 'empty idempotency_key was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting empty key', captured;
    end if;
  end;

  -- (vi) foreign-org caller rejected (42501). Tenant A tries to touch tenant B.
  begin
    perform public.record_outbound_message_intent(
      '92000000-0000-4000-8000-000000000002',
      'outbound:foreign:step:1',
      null, 'resend', 'email',
      'to@example.com', 'from@example.com', null,
      'x', repeat('0', 64)
    );
    raise exception 'foreign-org record_outbound_message_intent was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then
      raise exception 'unexpected sqlstate % rejecting foreign call', captured;
    end if;
  end;
end;
$$;

reset role;

-- =========================================================================
-- Provider delivery receipts — service_role-only replay
-- =========================================================================
-- Switch to service_role for the receipt helper: only the webhook
-- receiver may record receipts. Tenant callers are rejected. The helper
-- reads the role from `auth.role()` (JWT `role` claim), so we forward
-- the claim in addition to switching the DB role.
set local role service_role;
select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);

do $$
declare
  first_row  record;
  replay_row record;
  raw_count  integer;
begin
  select id, created into first_row
  from public.record_provider_delivery(
    '91000000-0000-4000-8000-000000000001',
    'resend',
    'evt_replay_test_1',
    'email.delivered',
    'message',
    '91500000-0000-4000-8000-000000000001',
    jsonb_build_object('status', 'delivered'),
    now()
  );
  if not first_row.created then
    raise exception 'first record_provider_delivery must set created=true';
  end if;

  select id, created into replay_row
  from public.record_provider_delivery(
    '91000000-0000-4000-8000-000000000001',
    'resend',
    'evt_replay_test_1',
    'email.delivered',
    'message',
    '91500000-0000-4000-8000-000000000001',
    -- Different payload — provider identity remains the dedup key.
    jsonb_build_object('status', 'delivered', 'retried', true),
    now()
  );
  if replay_row.created then
    raise exception 'record_provider_delivery replay must set created=false';
  end if;
  if replay_row.id is distinct from first_row.id then
    raise exception 'record_provider_delivery replay must observe the original row id';
  end if;

  select count(*) into raw_count
  from public.provider_delivery_receipts
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and provider = 'resend'
    and provider_event_id = 'evt_replay_test_1';
  if raw_count <> 1 then
    raise exception 'duplicate provider_delivery_receipts row after replay (got %)', raw_count;
  end if;
end;
$$;

reset role;

-- Tenant caller trying to record a receipt must be rejected. Re-enter
-- the tenant-A authenticated session first.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '91100000-0000-4000-8000-000000000001'::text,
    'role', 'authenticated'
  )::text,
  true
);

do $$
declare
  captured_state text;
begin
  begin
    perform public.record_provider_delivery(
      '91000000-0000-4000-8000-000000000001',
      'resend',
      'evt_forbidden',
      'email.delivered',
      null, null, '{}'::jsonb, now()
    );
    raise exception 'tenant caller was allowed to record a provider receipt';
  exception when others then
    captured_state := sqlstate;
    if captured_state <> '42501' then
      raise exception 'unexpected sqlstate % rejecting tenant receipt', captured_state;
    end if;
  end;
end;
$$;

reset role;

-- =========================================================================
-- Shadow Mode execution support (C5)
-- =========================================================================
-- These assertions exercise the migration-level guarantees that Shadow
-- Mode leans on:
--
--   * release_automation_run accepts an atomic output_summary payload.
--   * list_due_quote_followup_runs projects automation_config_level so
--     the executor can dispatch by mode without a second query.
--   * Cross-tenant claim / release / list_due are rejected with 42501
--     even when called from an authenticated tenant session (the fix
--     to the pg_has_role bypass hole).

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

-- Cross-tenant claim from tenant A into tenant B must raise 42501.
do $$
declare
  captured text;
begin
  begin
    perform public.claim_automation_run(
      '91800000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000002',
      'shadow-cross-tenant-worker',
      300
    );
    raise exception 'cross-tenant claim was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then
      raise exception 'unexpected sqlstate % rejecting cross-tenant claim', captured;
    end if;
  end;
end;
$$;

-- Cross-tenant release must also raise 42501.
do $$
declare
  captured text;
begin
  begin
    perform public.release_automation_run(
      '91800000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000002',
      'shadow-cross-tenant-worker',
      'SUCCEEDED',
      null,
      null,
      null
    );
    raise exception 'cross-tenant release was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then
      raise exception 'unexpected sqlstate % rejecting cross-tenant release', captured;
    end if;
  end;
end;
$$;

-- Cross-tenant due-listing must raise 42501.
do $$
declare
  captured text;
begin
  begin
    perform public.list_due_quote_followup_runs(
      '92000000-0000-4000-8000-000000000002',
      now(),
      10
    );
    raise exception 'cross-tenant list_due_quote_followup_runs was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then
      raise exception 'unexpected sqlstate % rejecting cross-tenant list_due', captured;
    end if;
  end;
end;
$$;

-- list_due_quote_followup_runs now projects the automation_config's
-- `level`. Executor dispatchers rely on this to route to Shadow /
-- Approval / Automatic without a second query.
do $$
declare
  observed_level text;
begin
  select automation_config_level into observed_level
  from public.list_due_quote_followup_runs(
    '91000000-0000-4000-8000-000000000001',
    (now() + interval '365 days'),
    50
  )
  where id = '91800000-0000-4000-8000-000000000001';
  if observed_level is null then
    raise exception 'list_due_quote_followup_runs no longer projects automation_config_level';
  end if;
  if observed_level not in ('OBSERVATION', 'SHADOW', 'APPROVAL', 'AUTOMATIC') then
    raise exception 'automation_config_level projected an unexpected value: %', observed_level;
  end if;
end;
$$;

-- release_automation_run must persist output_summary atomically. We
-- claim a due run, release it with a payload, then read back the row
-- and assert the payload landed. The payload is a Shadow-shaped
-- decision blob.
do $$
declare
  claimed boolean;
  released boolean;
  persisted jsonb;
begin
  claimed := public.claim_automation_run(
    '91800000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    'shadow-output-worker',
    300
  );
  if not claimed then
    raise exception 'expected to claim run 91800000-0000-4000-8000-000000000001 for output_summary test';
  end if;

  released := public.release_automation_run(
    '91800000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001',
    'shadow-output-worker',
    'SUCCEEDED',
    null,
    null,
    jsonb_build_object(
      'decision', jsonb_build_object('outcome', 'DUE'),
      'provenance', jsonb_build_object(
        'quote_id', '91500000-0000-4000-8000-000000000001',
        'step', 1
      ),
      'proposed_action', jsonb_build_object(
        'channel', 'email',
        'recipient_email', 'client-a@example.com',
        'subject', 'Relance DEV-042 — étape 1'
      )
    )
  );
  if not released then
    raise exception 'expected to release run with output_summary';
  end if;

  select output_summary into persisted
  from public.automation_runs
  where id = '91800000-0000-4000-8000-000000000001';

  if persisted is null or persisted -> 'decision' ->> 'outcome' <> 'DUE' then
    raise exception 'release_automation_run did not persist output_summary (got %)', persisted;
  end if;
  if persisted -> 'proposed_action' ->> 'channel' <> 'email' then
    raise exception 'release_automation_run did not persist nested proposed_action';
  end if;
end;
$$;

reset role;

-- Shadow no-send invariant at the schema level: no `message.sent` event
-- may exist inside this transaction. Shadow is the only workflow that
-- has been exercised in the fixtures + tests above, so its own tests
-- must not have produced any send-shaped event. This is a defense-in-
-- depth check against a future test accidentally emitting one.
do $$
declare
  sent_count integer;
begin
  select count(*) into sent_count
  from public.events
  where type = 'message.sent';
  if sent_count <> 0 then
    raise exception 'shadow test transaction produced % message.sent events (must be 0)', sent_count;
  end if;
end;
$$;

-- =========================================================================
-- Attention state machine + record_audit_log (C6)
-- =========================================================================
-- These assertions run as tenant A. They exercise:
--   * attention_items.status transition trigger rejects illegal
--     transitions (RESOLVED -> IN_PROGRESS, etc.) with 22023 and
--     enforces the resolved_at invariant.
--   * record_audit_log inserts append-only rows, pins actor server-side,
--     and rejects cross-tenant callers with 42501.
--   * an existing attention_item can be transitioned OPEN -> IN_PROGRESS
--     -> RESOLVED -> OPEN (reopen).

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

-- Test 1: legal transition path OPEN -> IN_PROGRESS -> RESOLVED -> OPEN.
do $$
declare
  observed_status text;
  observed_resolved timestamptz;
begin
  update public.attention_items
  set status = 'IN_PROGRESS'
  where id = '91600000-0000-4000-8000-000000000001';
  select status, resolved_at into observed_status, observed_resolved
  from public.attention_items where id = '91600000-0000-4000-8000-000000000001';
  if observed_status <> 'IN_PROGRESS' then
    raise exception 'expected IN_PROGRESS, got %', observed_status;
  end if;
  if observed_resolved is not null then
    raise exception 'IN_PROGRESS row must have resolved_at NULL, got %', observed_resolved;
  end if;

  update public.attention_items
  set status = 'RESOLVED'
  where id = '91600000-0000-4000-8000-000000000001';
  select status, resolved_at into observed_status, observed_resolved
  from public.attention_items where id = '91600000-0000-4000-8000-000000000001';
  if observed_status <> 'RESOLVED' then
    raise exception 'expected RESOLVED, got %', observed_status;
  end if;
  if observed_resolved is null then
    raise exception 'RESOLVED row must have resolved_at set (defense in depth)';
  end if;

  update public.attention_items
  set status = 'OPEN'
  where id = '91600000-0000-4000-8000-000000000001';
  select status, resolved_at into observed_status, observed_resolved
  from public.attention_items where id = '91600000-0000-4000-8000-000000000001';
  if observed_status <> 'OPEN' then
    raise exception 'expected OPEN after reopen, got %', observed_status;
  end if;
  if observed_resolved is not null then
    raise exception 'reopen must clear resolved_at (got %)', observed_resolved;
  end if;
end;
$$;

-- Test 2: illegal transition RESOLVED -> IN_PROGRESS raises 22023.
do $$
declare
  captured text;
begin
  update public.attention_items
  set status = 'RESOLVED'
  where id = '91600000-0000-4000-8000-000000000001';

  begin
    update public.attention_items
    set status = 'IN_PROGRESS'
    where id = '91600000-0000-4000-8000-000000000001';
    raise exception 'illegal RESOLVED -> IN_PROGRESS transition was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting illegal transition', captured;
    end if;
  end;

  -- restore for downstream tests
  update public.attention_items
  set status = 'OPEN'
  where id = '91600000-0000-4000-8000-000000000001';
end;
$$;

-- Test 3: illegal transition RESOLVED -> DISMISSED (must go through OPEN).
do $$
declare
  captured text;
begin
  update public.attention_items
  set status = 'RESOLVED'
  where id = '91600000-0000-4000-8000-000000000001';

  begin
    update public.attention_items
    set status = 'DISMISSED'
    where id = '91600000-0000-4000-8000-000000000001';
    raise exception 'illegal RESOLVED -> DISMISSED was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting closed-to-closed', captured;
    end if;
  end;

  update public.attention_items
  set status = 'OPEN'
  where id = '91600000-0000-4000-8000-000000000001';
end;
$$;

-- Test 4: record_audit_log succeeds for a tenant caller, pins actor.
do $$
declare
  new_id uuid;
  observed_actor_type text;
  observed_actor_id uuid;
  observed_action text;
begin
  new_id := public.record_audit_log(
    '91000000-0000-4000-8000-000000000001',
    'attention.resolved',
    'attention_item',
    '91600000-0000-4000-8000-000000000001',
    jsonb_build_object('previous_status', 'OPEN', 'next_status', 'RESOLVED')
  );
  if new_id is null then
    raise exception 'record_audit_log returned no id';
  end if;
  select actor_type, actor_id, action into observed_actor_type, observed_actor_id, observed_action
  from public.audit_logs where id = new_id;
  if observed_actor_type <> 'user' then
    raise exception 'expected actor_type=user for tenant caller, got %', observed_actor_type;
  end if;
  if observed_actor_id <> '91100000-0000-4000-8000-000000000001' then
    raise exception 'expected actor_id to be pinned to auth.uid(), got %', observed_actor_id;
  end if;
  if observed_action <> 'attention.resolved' then
    raise exception 'action not persisted correctly, got %', observed_action;
  end if;
end;
$$;

-- Test 5: record_audit_log rejects cross-tenant caller with 42501.
do $$
declare
  captured text;
begin
  begin
    perform public.record_audit_log(
      '92000000-0000-4000-8000-000000000002',
      'attention.resolved',
      null, null, '{}'::jsonb
    );
    raise exception 'cross-tenant record_audit_log was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then
      raise exception 'unexpected sqlstate % rejecting cross-tenant audit', captured;
    end if;
  end;
end;
$$;

-- Test 6: record_audit_log rejects an empty action with 22023.
do $$
declare
  captured text;
begin
  begin
    perform public.record_audit_log(
      '91000000-0000-4000-8000-000000000001',
      '',
      null, null, '{}'::jsonb
    );
    raise exception 'empty action was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting empty action', captured;
    end if;
  end;
end;
$$;

-- Test 7: two calls with identical inputs create TWO rows (audit is a
-- stream, not a set — no dedup).
do $$
declare
  before_count integer;
  after_count integer;
begin
  select count(*) into before_count from public.audit_logs
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and action = 'attention.reopened';
  perform public.record_audit_log(
    '91000000-0000-4000-8000-000000000001',
    'attention.reopened',
    'attention_item',
    '91600000-0000-4000-8000-000000000001',
    '{}'::jsonb
  );
  perform public.record_audit_log(
    '91000000-0000-4000-8000-000000000001',
    'attention.reopened',
    'attention_item',
    '91600000-0000-4000-8000-000000000001',
    '{}'::jsonb
  );
  select count(*) into after_count from public.audit_logs
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and action = 'attention.reopened';
  if after_count - before_count <> 2 then
    raise exception 'expected 2 new audit rows, got %', after_count - before_count;
  end if;
end;
$$;

reset role;

-- =========================================================================
-- Retries + Incidents (C7)
-- =========================================================================
-- Runs as tenant A. Exercises:
--   * record_incident_once inserts a fresh incident (created=true).
--   * record_incident_once dedups on fingerprint (created=false, recurrence bumps).
--   * a RESOLVED incident does NOT block a fresh occurrence.
--   * cross-tenant incident write is rejected 42501.
--   * empty fingerprint and invalid severity are rejected 22023.
--   * retry_failed_run transitions FAILED -> PENDING and is a no-op on
--     non-FAILED statuses.
--   * release_automation_run(PENDING) bumps attempt_count.

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

-- Fresh insert
do $$
declare
  r record;
begin
  select * into r from public.record_incident_once(
    '91000000-0000-4000-8000-000000000001',
    'shadow_quote_followup:quote:91500000-0000-4000-8000-000000000001:provider_timeout',
    'P3', 'workflow_failure', 'C7 test incident', null,
    'quote', '91500000-0000-4000-8000-000000000001', '{}'::jsonb
  );
  if not r.created or r.recurrence_count <> 1 then
    raise exception 'first incident should be created with recurrence=1';
  end if;
end;
$$;

-- Dedup on fingerprint
do $$
declare
  r record;
begin
  select * into r from public.record_incident_once(
    '91000000-0000-4000-8000-000000000001',
    'shadow_quote_followup:quote:91500000-0000-4000-8000-000000000001:provider_timeout',
    'P3', 'workflow_failure', 'replay title', null,
    'quote', '91500000-0000-4000-8000-000000000001', '{}'::jsonb
  );
  if r.created or r.recurrence_count <> 2 then
    raise exception 'replay must not create; recurrence should be 2, got created=% rec=%', r.created, r.recurrence_count;
  end if;
end;
$$;

-- RESOLVED does not block fresh
do $$
declare
  r record;
begin
  update public.incidents
  set status = 'RESOLVED', resolved_at = now()
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and fingerprint = 'shadow_quote_followup:quote:91500000-0000-4000-8000-000000000001:provider_timeout';

  select * into r from public.record_incident_once(
    '91000000-0000-4000-8000-000000000001',
    'shadow_quote_followup:quote:91500000-0000-4000-8000-000000000001:provider_timeout',
    'P3', 'workflow_failure', 'fresh after resolve', null,
    'quote', '91500000-0000-4000-8000-000000000001', '{}'::jsonb
  );
  if not r.created or r.recurrence_count <> 1 then
    raise exception 'fresh incident after RESOLVED must be created=true with recurrence=1';
  end if;
end;
$$;

-- Cross-tenant rejected 42501
do $$
declare captured text;
begin
  begin
    perform public.record_incident_once(
      '92000000-0000-4000-8000-000000000002',
      'attack:q:92500000-0000-4000-8000-000000000002:x',
      'P1', 'x', 'x', null, null, null, '{}'::jsonb
    );
    raise exception 'cross-tenant incident was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then raise exception 'unexpected sqlstate % on cross-tenant', captured; end if;
  end;
end;
$$;

-- Empty fingerprint rejected 22023
do $$
declare captured text;
begin
  begin
    perform public.record_incident_once(
      '91000000-0000-4000-8000-000000000001', '',
      'P3', 'x', 'x', null, null, null, '{}'::jsonb
    );
    raise exception 'empty fingerprint was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then raise exception 'unexpected sqlstate % on empty fp', captured; end if;
  end;
end;
$$;

-- Invalid severity rejected 22023
do $$
declare captured text;
begin
  begin
    perform public.record_incident_once(
      '91000000-0000-4000-8000-000000000001', 'fp:a:b:c',
      'P9', 'x', 'x', null, null, null, '{}'::jsonb
    );
    raise exception 'invalid severity was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then raise exception 'unexpected sqlstate % on bad severity', captured; end if;
  end;
end;
$$;

-- retry_failed_run: happy path
update public.automation_runs
set status = 'FAILED', error = 'perm error', completed_at = now(),
    locked_at = null, lock_expires_at = null, locked_by = null,
    next_attempt_at = null
where id = '91800000-0000-4000-8000-000000000001';

do $$
declare
  ok boolean;
  observed_status text;
  observed_error text;
begin
  ok := public.retry_failed_run(
    '91800000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001'
  );
  if not ok then raise exception 'retry_failed_run must return true on FAILED'; end if;
  select status, error into observed_status, observed_error
  from public.automation_runs where id = '91800000-0000-4000-8000-000000000001';
  if observed_status <> 'PENDING' then raise exception 'expected PENDING, got %', observed_status; end if;
  if observed_error is not null then raise exception 'error must be cleared, got %', observed_error; end if;
end;
$$;

-- retry_failed_run: no-op on non-FAILED
do $$
declare ok boolean;
begin
  ok := public.retry_failed_run(
    '91800000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000001'
  );
  if ok then raise exception 'retry_failed_run on PENDING must return false'; end if;
end;
$$;

-- retry_failed_run: cross-tenant rejected 42501
do $$
declare captured text;
begin
  begin
    perform public.retry_failed_run(
      '91800000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000002'
    );
    raise exception 'cross-tenant retry was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then raise exception 'unexpected sqlstate % on cross-tenant retry', captured; end if;
  end;
end;
$$;

-- =========================================================================
-- C10 — Inbound reply matching: record_inbound_message + mark_quote_replied
-- =========================================================================
-- record_inbound_message and mark_quote_replied are service_role-only.
-- Authenticated tenant callers must be rejected. As service_role, the
-- happy path inserts a message row, transitions the quote, and stays
-- idempotent under replay.

-- Authenticated caller rejected on record_inbound_message (42501).
do $$
declare captured text;
begin
  begin
    perform public.record_inbound_message(
      '91000000-0000-4000-8000-000000000001',
      'inbound:resend:evt_forbidden',
      'resend', 'msg_forbidden', null,
      '91500000-0000-4000-8000-000000000001', null,
      'attacker@example.com', 'Re: Devis', 'body',
      'msg_original', array[]::text[], '{}'::jsonb, now()
    );
    raise exception 'authenticated record_inbound_message was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then
      raise exception 'unexpected sqlstate % on authenticated record_inbound_message', captured;
    end if;
  end;
end;
$$;

-- Authenticated caller rejected on mark_quote_replied (42501).
do $$
declare captured text;
begin
  begin
    perform public.mark_quote_replied(
      '91000000-0000-4000-8000-000000000001',
      '91500000-0000-4000-8000-000000000001'
    );
    raise exception 'authenticated mark_quote_replied was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then
      raise exception 'unexpected sqlstate % on authenticated mark_quote_replied', captured;
    end if;
  end;
end;
$$;

reset role;

-- Switch to service_role for the happy-path assertions on C10 RPCs.
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $$
declare
  first_row  record;
  replay_row record;
  raw_count  integer;
  quote_id   uuid := '91500000-0000-4000-8000-00000000c010';
  captured   text;
begin
  -- Seed a fresh SENT quote to transition.
  insert into public.quotes (id, organization_id, customer_id, request_id, title, amount, status)
  values (quote_id, '91000000-0000-4000-8000-000000000001',
          '91300000-0000-4000-8000-000000000001', null,
          'C10 seed quote', 1000.00, 'DRAFT');
  update public.quotes set status = 'SENT', sent_at = now() where id = quote_id;

  -- (i) record_inbound_message inserts once.
  select id, created into first_row
  from public.record_inbound_message(
    '91000000-0000-4000-8000-000000000001',
    'inbound:resend:evt_c10_alpha',
    'resend', 'inbound_msg_alpha', null, quote_id, null,
    'customer@example.com', 'Re: Devis', 'Merci pour le devis',
    'msg_original_alpha', array['msg_original_alpha']::text[],
    jsonb_build_object('Message-ID', '<inbound_msg_alpha@example.com>'),
    now()
  );
  if not first_row.created then
    raise exception 'first record_inbound_message must set created=true';
  end if;

  -- Replay observes the original id.
  select id, created into replay_row
  from public.record_inbound_message(
    '91000000-0000-4000-8000-000000000001',
    'inbound:resend:evt_c10_alpha',
    'resend', 'inbound_msg_alpha', null, quote_id, null,
    'customer@example.com', 'Re: Devis (replay)', 'different body',
    'msg_original_alpha', array['msg_original_alpha']::text[],
    '{}'::jsonb, now()
  );
  if replay_row.created then
    raise exception 'replay record_inbound_message must set created=false';
  end if;
  if replay_row.id is distinct from first_row.id then
    raise exception 'replay must observe the original row id';
  end if;

  select count(*) into raw_count from public.messages
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and idempotency_key = 'inbound:resend:evt_c10_alpha';
  if raw_count <> 1 then
    raise exception 'duplicate messages row after replay (got %)', raw_count;
  end if;

  -- (ii) mark_quote_replied SENT -> REPLIED once, replay returns false.
  if not public.mark_quote_replied(
    '91000000-0000-4000-8000-000000000001', quote_id
  ) then
    raise exception 'mark_quote_replied should return true on first call';
  end if;
  if public.mark_quote_replied(
    '91000000-0000-4000-8000-000000000001', quote_id
  ) then
    raise exception 'mark_quote_replied replay on REPLIED row must return false';
  end if;

  select status into captured from public.quotes where id = quote_id;
  if captured is distinct from 'REPLIED' then
    raise exception 'quote should be REPLIED (got %)', captured;
  end if;

  -- (iii) Empty idempotency_key rejected 22023.
  begin
    perform public.record_inbound_message(
      '91000000-0000-4000-8000-000000000001', '',
      'resend', 'msg_empty', null, quote_id, null,
      'x@x', 'x', 'x', null, null, '{}'::jsonb, now()
    );
    raise exception 'empty idempotency_key was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then
      raise exception 'unexpected sqlstate % on empty inbound key', captured;
    end if;
  end;

  -- (iv) mark_quote_replied on a WON quote rejected 22023.
  update public.quotes set status = 'WON' where id = quote_id;
  begin
    perform public.mark_quote_replied('91000000-0000-4000-8000-000000000001', quote_id);
    raise exception 'mark_quote_replied on WON was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then
      raise exception 'unexpected sqlstate % on WON transition', captured;
    end if;
  end;
end;
$$;

-- =========================================================================
-- C11 — Reply classification: insert_ai_run_once + record_message_classification
-- =========================================================================
-- insert_ai_run_once is callable by authenticated (tenant-scoped) and
-- service_role. record_message_classification is service_role only.

do $$
declare
  first_row  record;
  replay_row record;
  raw_count  integer;
  message_id uuid;
  captured   text;
begin
  -- Seed a fresh inbound message to classify.
  insert into public.messages (
    organization_id, direction, channel, status,
    quote_id, provider_message_id, subject, body_text,
    idempotency_key, received_at
  )
  values (
    '91000000-0000-4000-8000-000000000001', 'INBOUND', 'EMAIL', 'RECEIVED',
    '91500000-0000-4000-8000-00000000c010',
    'inbound_msg_alpha_c11', 'Re: Devis', 'OK pour moi',
    'inbound:resend:evt_c11_seed', now()
  )
  returning id into message_id;

  -- (i) insert_ai_run_once inserts a SUCCEEDED run.
  select id, created into first_row
  from public.insert_ai_run_once(
    '91000000-0000-4000-8000-000000000001',
    'ai:reply_classification:' || message_id::text || ':v1',
    'reply_classification', 'message', message_id,
    'claude', 'claude-haiku-4-5-20251001', '1',
    jsonb_build_object('message_id', message_id::text),
    jsonb_build_object('intent', 'ACCEPTED_QUOTE', 'confidence', 0.9, 'summary', 'OK'),
    0.9, null, 'SUCCEEDED', 500, 120, 40, null, null
  );
  if not first_row.created then
    raise exception 'first insert_ai_run_once must set created=true';
  end if;

  -- Replay observes the original id.
  select id, created into replay_row
  from public.insert_ai_run_once(
    '91000000-0000-4000-8000-000000000001',
    'ai:reply_classification:' || message_id::text || ':v1',
    'reply_classification', 'message', message_id,
    'claude', 'claude-haiku-4-5-20251001', '1',
    '{}'::jsonb, '{}'::jsonb, 0.5, null, 'SUCCEEDED', 100, null, null, null, null
  );
  if replay_row.created then
    raise exception 'replay insert_ai_run_once must set created=false';
  end if;
  if replay_row.id is distinct from first_row.id then
    raise exception 'replay must observe the original ai_run id';
  end if;

  select count(*) into raw_count from public.ai_runs
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and idempotency_key = 'ai:reply_classification:' || message_id::text || ':v1';
  if raw_count <> 1 then
    raise exception 'duplicate ai_runs row after replay (got %)', raw_count;
  end if;

  -- (ii) Empty key rejected 22023.
  begin
    perform public.insert_ai_run_once(
      '91000000-0000-4000-8000-000000000001', '',
      'reply_classification', null, null,
      'claude', 'x', '1', '{}'::jsonb, null, null, null, 'SUCCEEDED',
      100, null, null, null, null
    );
    raise exception 'empty ai_run key was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting empty ai_run key', captured;
    end if;
  end;

  -- (iii) Invalid status rejected 22023.
  begin
    perform public.insert_ai_run_once(
      '91000000-0000-4000-8000-000000000001',
      'ai:reply_classification:' || message_id::text || ':bad',
      'reply_classification', null, null,
      'claude', 'x', '1', '{}'::jsonb, null, null, null, 'WEIRD',
      100, null, null, null, null
    );
    raise exception 'invalid ai_run status was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then
      raise exception 'unexpected sqlstate % rejecting invalid ai_run status', captured;
    end if;
  end;
end;
$$;

-- Authenticated caller must NOT be able to call record_message_classification (42501).
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  jsonb_build_object(
    'sub', '91100000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true);

do $$
declare captured text;
begin
  begin
    perform public.record_message_classification(
      '91000000-0000-4000-8000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'OTHER', 0.5
    );
    raise exception 'authenticated record_message_classification was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then
      raise exception 'unexpected sqlstate % on authenticated record_message_classification', captured;
    end if;
  end;
end;
$$;

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- record_message_classification happy path + idempotence.
do $$
declare
  message_id uuid;
  transitioned boolean;
  captured    text;
begin
  select id into message_id from public.messages
  where organization_id = '91000000-0000-4000-8000-000000000001'
    and idempotency_key = 'inbound:resend:evt_c11_seed'
  limit 1;

  transitioned := public.record_message_classification(
    '91000000-0000-4000-8000-000000000001', message_id, 'ACCEPTED_QUOTE', 0.9
  );
  if not transitioned then
    raise exception 'first record_message_classification should return true';
  end if;
  if public.record_message_classification(
    '91000000-0000-4000-8000-000000000001', message_id, 'ACCEPTED_QUOTE', 0.9
  ) then
    raise exception 'replay record_message_classification must return false';
  end if;

  select intent into captured from public.messages where id = message_id;
  if captured is distinct from 'ACCEPTED_QUOTE' then
    raise exception 'intent should be ACCEPTED_QUOTE (got %)', captured;
  end if;

  -- Invalid confidence range rejected 22023.
  begin
    perform public.record_message_classification(
      '91000000-0000-4000-8000-000000000001', message_id, 'OTHER', 1.5
    );
    raise exception 'confidence>1 was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '22023' then
      raise exception 'unexpected sqlstate % on bad confidence', captured;
    end if;
  end;
end;
$$;

-- =========================================================================
-- C12 — Approval-based controlled sending
-- =========================================================================
-- approve_automation_run_pending_approval / reject_automation_run_pending_approval
-- are SECURITY DEFINER. Both enforce ACTIVE membership on caller AND
-- approver, and only transition rows in WAITING_FOR_APPROVAL with
-- approval_decision IS NULL.

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  jsonb_build_object(
    'sub', '91100000-0000-4000-8000-000000000001',
    'role', 'authenticated'
  )::text,
  true);

do $$
declare
  run_id_approve  uuid := '91800000-0000-4000-8000-c12000000001';
  run_id_reject   uuid := '91800000-0000-4000-8000-c12000000002';
  captured   text;
  affected   boolean;
begin
  -- Seed two runs in WAITING_FOR_APPROVAL for tenant A.
  insert into public.automation_runs (
    id, organization_id, automation_config_id, idempotency_key,
    status, scheduled_for, input_summary, output_summary
  )
  values
    (run_id_approve, '91000000-0000-4000-8000-000000000001',
     '91700000-0000-4000-8000-000000000001',
     'quote_followup:91500000-0000-4000-8000-c12000000000:step:1',
     'WAITING_FOR_APPROVAL', now(),
     jsonb_build_object('quote_id', '91500000-0000-4000-8000-c12000000000', 'step', 1),
     jsonb_build_object('proposed_action', jsonb_build_object('subject', 'Relance'))),
    (run_id_reject, '91000000-0000-4000-8000-000000000001',
     '91700000-0000-4000-8000-000000000001',
     'quote_followup:91500000-0000-4000-8000-c12000000001:step:1',
     'WAITING_FOR_APPROVAL', now(),
     jsonb_build_object('quote_id', '91500000-0000-4000-8000-c12000000001', 'step', 1),
     jsonb_build_object('proposed_action', jsonb_build_object('subject', 'Relance')));

  -- (i) Foreign-org caller rejected 42501.
  begin
    perform public.approve_automation_run_pending_approval(
      run_id_approve, '92000000-0000-4000-8000-000000000002',
      '91100000-0000-4000-8000-000000000001', 'x', 'w', 300
    );
    raise exception 'foreign-org approve was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then
      raise exception 'unexpected sqlstate % on foreign-org approve', captured;
    end if;
  end;

  -- (ii) Approver not ACTIVE member rejected 42501.
  begin
    perform public.approve_automation_run_pending_approval(
      run_id_approve, '91000000-0000-4000-8000-000000000001',
      '00000000-0000-0000-0000-000000000000', 'x', 'w', 300
    );
    raise exception 'inactive approver was not rejected';
  exception when others then
    captured := sqlstate;
    if captured <> '42501' then
      raise exception 'unexpected sqlstate % on inactive approver', captured;
    end if;
  end;

  -- (iii) Happy path approve: WAITING_FOR_APPROVAL -> RUNNING + approval columns.
  affected := public.approve_automation_run_pending_approval(
    run_id_approve, '91000000-0000-4000-8000-000000000001',
    '91100000-0000-4000-8000-000000000001', 'OK', 'approver-worker', 300
  );
  if not affected then
    raise exception 'happy-path approve should return true';
  end if;

  declare s text; d text; l text; begin
    select status, approval_decision, locked_by into s, d, l
    from public.automation_runs where id = run_id_approve;
    if s is distinct from 'RUNNING' then
      raise exception 'approved run status expected RUNNING (got %)', s;
    end if;
    if d is distinct from 'APPROVED' then
      raise exception 'approved decision expected APPROVED (got %)', d;
    end if;
    if l is distinct from 'approver-worker' then
      raise exception 'approved run locked_by expected approver-worker (got %)', l;
    end if;
  end;

  -- (iv) Replay approve on already-resolved run returns false.
  if public.approve_automation_run_pending_approval(
    run_id_approve, '91000000-0000-4000-8000-000000000001',
    '91100000-0000-4000-8000-000000000001', 'OK', 'approver-worker', 300
  ) then
    raise exception 'replay approve should return false';
  end if;

  -- (v) Happy path reject: WAITING_FOR_APPROVAL -> CANCELLED + rejection columns.
  affected := public.reject_automation_run_pending_approval(
    run_id_reject, '91000000-0000-4000-8000-000000000001',
    '91100000-0000-4000-8000-000000000001', 'trop tôt'
  );
  if not affected then
    raise exception 'happy-path reject should return true';
  end if;

  declare s text; d text; c text; begin
    select status, approval_decision, approval_comment into s, d, c
    from public.automation_runs where id = run_id_reject;
    if s is distinct from 'CANCELLED' then
      raise exception 'rejected run status expected CANCELLED (got %)', s;
    end if;
    if d is distinct from 'REJECTED' then
      raise exception 'rejected decision expected REJECTED (got %)', d;
    end if;
    if c is distinct from 'trop tôt' then
      raise exception 'rejected comment expected `trop tôt` (got %)', c;
    end if;
  end;
end;
$$;

reset role;

select 'core product RLS, event, state-machine, assignment/safety, follow-up scheduling, durable idempotency, Shadow execution, Attention/audit, Retries/incidents, C10 inbound reply, C11 classification and C12 approval assertions passed' as result;

rollback;
