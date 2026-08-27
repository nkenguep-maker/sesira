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

reset role;

select 'core product RLS, event, state-machine and assignment/safety assertions passed' as result;

rollback;
