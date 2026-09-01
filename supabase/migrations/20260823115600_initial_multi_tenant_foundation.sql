-- SESIRA OS — initial multi-tenant foundation
-- All tables exposed through the Data API are protected by RLS.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sector_key text not null default 'general',
  status text not null default 'ACTIVE' check (status in ('TRIAL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  timezone text not null default 'Europe/Paris',
  language text not null default 'fr',
  currency text not null default 'EUR' check (char_length(currency) = 3),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  feature_flags jsonb not null default '{}'::jsonb check (jsonb_typeof(feature_flags) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER')),
  status text not null default 'ACTIVE' check (status in ('INVITED', 'ACTIVE', 'SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

create index organization_members_user_id_idx
  on public.organization_members (user_id, organization_id)
  where status = 'ACTIVE';

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members membership
      where membership.organization_id = target_organization_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'ACTIVE'
    );
$$;

create or replace function private.has_organization_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members membership
      where membership.organization_id = target_organization_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'ACTIVE'
        and membership.role = any(allowed_roles)
    );
$$;

create or replace function private.shares_organization(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members viewer
      join public.organization_members target
        on target.organization_id = viewer.organization_id
       and target.status = 'ACTIVE'
      where viewer.user_id = (select auth.uid())
        and viewer.status = 'ACTIVE'
        and target.user_id = target_user_id
    );
$$;

revoke all on function private.is_organization_member(uuid) from public, anon, authenticated;
revoke all on function private.has_organization_role(uuid, text[]) from public, anon, authenticated;
revoke all on function private.shares_organization(uuid) from public, anon, authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.has_organization_role(uuid, text[]) to authenticated;
grant execute on function private.shares_organization(uuid) to authenticated;

create table public.service_catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  code text,
  description text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null default 'PERSON' check (type in ('PERSON', 'COMPANY')),
  display_name text not null check (char_length(display_name) between 1 and 200),
  company_name text,
  email text,
  phone text,
  external_id text,
  external_provider text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index customers_external_identity_idx
  on public.customers (organization_id, external_provider, external_id)
  where external_provider is not null and external_id is not null;

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid,
  service_catalog_item_id uuid,
  title text not null,
  source text not null default 'MANUAL',
  status text not null default 'NEW' check (
    status in ('NEW', 'PROCESSING', 'NEEDS_INFO', 'QUALIFIED', 'READY', 'ASSIGNED', 'CLOSED', 'SPAM', 'LOST')
  ),
  qualification_score numeric(5,2) check (qualification_score between 0 and 100),
  assigned_user_id uuid references auth.users(id) on delete set null,
  external_id text,
  external_provider text,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (customer_id, organization_id)
    references public.customers(id, organization_id) on delete restrict,
  foreign key (service_catalog_item_id, organization_id)
    references public.service_catalog_items(id, organization_id) on delete restrict
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null,
  request_id uuid,
  reference text,
  title text not null,
  amount numeric(14,2) check (amount >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  status text not null default 'DRAFT' check (
    status in ('DRAFT', 'SENT', 'FOLLOWING_UP', 'REPLIED', 'NEEDS_HUMAN', 'WON', 'LOST', 'EXPIRED')
  ),
  owner_user_id uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  expires_at timestamptz,
  next_action_at timestamptz,
  external_id text,
  external_provider text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (customer_id, organization_id)
    references public.customers(id, organization_id) on delete restrict,
  foreign key (request_id, organization_id)
    references public.requests(id, organization_id) on delete restrict
);

create unique index quotes_external_identity_idx
  on public.quotes (organization_id, external_provider, external_id)
  where external_provider is not null and external_id is not null;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid,
  request_id uuid,
  quote_id uuid,
  direction text not null check (direction in ('INBOUND', 'OUTBOUND')),
  channel text not null default 'EMAIL',
  status text not null default 'RECEIVED' check (
    status in ('DRAFT', 'READY', 'SENT', 'RECEIVED', 'FAILED', 'DISMISSED')
  ),
  thread_key text,
  provider_message_id text,
  subject text,
  body_text text,
  intent text,
  confidence numeric(4,3) check (confidence between 0 and 1),
  sent_at timestamptz,
  received_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, organization_id)
    references public.customers(id, organization_id) on delete restrict,
  foreign key (request_id, organization_id)
    references public.requests(id, organization_id) on delete restrict,
  foreign key (quote_id, organization_id)
    references public.quotes(id, organization_id) on delete restrict
);

create unique index messages_provider_identity_idx
  on public.messages (organization_id, channel, provider_message_id)
  where provider_message_id is not null;

create table public.attention_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED')),
  reason text not null,
  title text not null,
  explanation text,
  entity_type text,
  entity_id uuid,
  suggested_action text,
  assigned_user_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  type text not null,
  status text not null default 'DISCONNECTED' check (
    status in ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'DEGRADED', 'EXPIRED', 'FAILED', 'PAUSED')
  ),
  credentials_reference text,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  connected_at timestamptz,
  last_sync_at timestamptz,
  expires_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, type)
);

create table public.automation_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_key text not null,
  template_version integer not null default 1 check (template_version > 0),
  enabled boolean not null default false,
  level text not null default 'OBSERVATION' check (level in ('OBSERVATION', 'SHADOW', 'APPROVAL', 'AUTOMATIC')),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, template_key),
  unique (id, organization_id)
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  automation_config_id uuid,
  idempotency_key text not null,
  status text not null default 'PENDING' check (
    status in ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'WAITING_FOR_APPROVAL')
  ),
  trigger_event_id uuid,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  input_summary jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key),
  foreign key (automation_config_id, organization_id)
    references public.automation_configs(id, organization_id) on delete restrict
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feature text not null,
  entity_type text,
  entity_id uuid,
  provider text not null,
  model text not null,
  prompt_version text not null,
  input_summary jsonb not null default '{}'::jsonb,
  output jsonb,
  confidence numeric(4,3) check (confidence between 0 and 1),
  action text,
  latency_ms integer check (latency_ms >= 0),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  estimated_cost numeric(12,6) check (estimated_cost >= 0),
  status text not null check (status in ('SUCCEEDED', 'FAILED', 'REJECTED')),
  error text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  entity_type text,
  entity_id uuid,
  source text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

alter table public.automation_runs
  add constraint automation_runs_trigger_event_id_fkey
  foreign key (trigger_event_id, organization_id)
  references public.events(id, organization_id) on delete restrict;

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  severity text not null check (severity in ('P1', 'P2', 'P3', 'P4')),
  status text not null default 'OPEN' check (status in ('OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED')),
  category text not null,
  title text not null,
  description text,
  entity_type text,
  entity_id uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_type text not null,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'organizations',
    'organization_members',
    'service_catalog_items',
    'customers',
    'requests',
    'quotes',
    'messages',
    'attention_items',
    'integrations',
    'automation_configs',
    'incidents'
  ]
  loop
    execute format(
      'create trigger set_%1$s_updated_at before update on public.%1$I for each row execute function private.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create index service_catalog_items_org_idx on public.service_catalog_items (organization_id, active);
create index customers_org_created_idx on public.customers (organization_id, created_at desc);
create index requests_org_status_idx on public.requests (organization_id, status, created_at desc);
create index quotes_org_status_idx on public.quotes (organization_id, status, next_action_at);
create index messages_org_thread_idx on public.messages (organization_id, thread_key, created_at);
create index attention_items_org_status_idx on public.attention_items (organization_id, status, priority, created_at desc);
create index integrations_org_status_idx on public.integrations (organization_id, status);
create index automation_configs_org_idx on public.automation_configs (organization_id, enabled);
create index automation_runs_org_status_idx on public.automation_runs (organization_id, status, created_at desc);
create index ai_runs_org_created_idx on public.ai_runs (organization_id, created_at desc);
create index events_org_created_idx on public.events (organization_id, created_at desc);
create index events_org_type_idx on public.events (organization_id, type, created_at desc);
create index incidents_org_status_idx on public.incidents (organization_id, status, severity, created_at desc);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.service_catalog_items enable row level security;
alter table public.customers enable row level security;
alter table public.requests enable row level security;
alter table public.quotes enable row level security;
alter table public.messages enable row level security;
alter table public.attention_items enable row level security;
alter table public.integrations enable row level security;
alter table public.automation_configs enable row level security;
alter table public.automation_runs enable row level security;
alter table public.ai_runs enable row level security;
alter table public.events enable row level security;
alter table public.incidents enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_organization(id));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy organizations_select on public.organizations
  for select to authenticated
  using (private.is_organization_member(id));

create policy organizations_update on public.organizations
  for update to authenticated
  using (private.has_organization_role(id, array['OWNER', 'ADMIN']))
  with check (private.has_organization_role(id, array['OWNER', 'ADMIN']));

create policy organization_members_select on public.organization_members
  for select to authenticated
  using (private.is_organization_member(organization_id));

create policy organization_members_insert on public.organization_members
  for insert to authenticated
  with check (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']));

create policy organization_members_update on public.organization_members
  for update to authenticated
  using (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']))
  with check (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']));

create policy organization_members_delete on public.organization_members
  for delete to authenticated
  using (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'service_catalog_items',
    'customers',
    'requests',
    'quotes',
    'messages',
    'attention_items',
    'automation_runs',
    'ai_runs',
    'events',
    'incidents',
    'audit_logs'
  ]
  loop
    execute format(
      'create policy tenant_select on public.%1$I for select to authenticated using (private.is_organization_member(organization_id))',
      table_name
    );
    execute format(
      'create policy tenant_insert on public.%1$I for insert to authenticated with check (private.is_organization_member(organization_id))',
      table_name
    );
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'service_catalog_items',
    'customers',
    'requests',
    'quotes',
    'messages',
    'attention_items',
    'automation_runs',
    'incidents'
  ]
  loop
    execute format(
      'create policy tenant_update on public.%1$I for update to authenticated using (private.is_organization_member(organization_id)) with check (private.is_organization_member(organization_id))',
      table_name
    );
    execute format(
      'create policy tenant_delete on public.%1$I for delete to authenticated using (private.has_organization_role(organization_id, array[''OWNER'', ''ADMIN'']))',
      table_name
    );
  end loop;
end;
$$;

create policy integrations_select on public.integrations
  for select to authenticated
  using (private.is_organization_member(organization_id));

create policy integrations_insert on public.integrations
  for insert to authenticated
  with check (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']));

create policy integrations_update on public.integrations
  for update to authenticated
  using (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']))
  with check (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']));

create policy integrations_delete on public.integrations
  for delete to authenticated
  using (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']));

create policy automation_configs_select on public.automation_configs
  for select to authenticated
  using (private.is_organization_member(organization_id));

create policy automation_configs_insert on public.automation_configs
  for insert to authenticated
  with check (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']));

create policy automation_configs_update on public.automation_configs
  for update to authenticated
  using (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']))
  with check (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']));

create policy automation_configs_delete on public.automation_configs
  for delete to authenticated
  using (private.has_organization_role(organization_id, array['OWNER', 'ADMIN']));

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.service_catalog_items to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.requests to authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.attention_items to authenticated;
grant select, insert, update, delete on public.integrations to authenticated;
grant select, insert, update, delete on public.automation_configs to authenticated;
grant select, insert, update, delete on public.automation_runs to authenticated;
grant select, insert on public.ai_runs to authenticated;
grant select, insert on public.events to authenticated;
grant select, insert, update, delete on public.incidents to authenticated;
grant select, insert on public.audit_logs to authenticated;

revoke all on all tables in schema public from anon;

comment on schema private is 'Internal authorization helpers; not exposed through the Data API.';
comment on table public.organizations is 'Sesira tenant. Sector differences belong in configuration, not application branches.';
comment on column public.organizations.sector_key is 'Configuration selector only; never used as a tenant authorization boundary.';
comment on table public.events is 'Append-oriented domain event log.';
comment on table public.audit_logs is 'Append-only security and business audit trail.';
