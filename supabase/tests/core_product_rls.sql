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

reset role;

select 'core product RLS and event assertions passed' as result;

rollback;
