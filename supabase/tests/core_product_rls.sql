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

select 'core product RLS, event, state-machine, assignment/safety, follow-up scheduling, durable idempotency and Shadow execution assertions passed' as result;

rollback;
