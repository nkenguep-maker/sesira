-- SESIRA Core Workflow — platform observability + costs (C38, WAVE 6 kickoff).
--
-- Backend registry + heartbeat/outcome event log + kill-switch RPCs.
-- Feeds the operator « Control Center » UI (dashboard is out of
-- scope here — Codex product-workflows branch).
--
-- Observable components (roadmap): Email · Mistral AI · Documents ·
-- Voice · E-invoicing · Growth · Automations · Webhooks · Queues ·
-- Database · Storage.
--
-- DOCTRINE: « Pas de métrique inventée. » Every number rendered in
-- the UI must trace back to either:
--   * a real `platform_component_events` row posted by a worker /
--     provider webhook / scheduled job, or
--   * a real `ai_runs` row (for Mistral tokens/cost), or
--   * a real backlog measurement in `platform_component_backlogs`.
--
-- The dashboard read RPCs (platform_component_dashboard,
-- ai_provider_stats) AGGREGATE those rows — they do NOT synthesize
-- a "health score" out of nothing.
--
-- Kill switch: `is_platform_component_enabled(org, kind)` is the
-- single seam workers check before making an external call. Human
-- operators toggle via engage_kill_switch / release_kill_switch
-- (ACTIVE org member required). All toggles land in audit_logs.

-- =========================================================================
-- platform_components — per-org registry of observable components
-- =========================================================================
create table public.platform_components (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  component_kind        text not null
    check (component_kind in (
      'EMAIL', 'AI_MISTRAL', 'DOCUMENTS', 'VOICE', 'EINVOICING',
      'GROWTH', 'AUTOMATIONS', 'WEBHOOKS', 'QUEUES', 'DATABASE',
      'STORAGE', 'REGULATORY', 'OTHER'
    )),
  display_label         text not null check (length(display_label) between 1 and 200),
  provider_kind         text check (provider_kind is null or length(provider_kind) <= 100),
  region                text check (region is null or length(region) <= 60),
  status                text not null default 'ENABLED'
    check (status in ('ENABLED', 'DEGRADED', 'DISABLED_MANUAL', 'DISABLED_INCIDENT')),
  status_reason         text check (status_reason is null or length(status_reason) <= 1000),
  status_changed_at     timestamptz,
  status_changed_by_user_id uuid,
  config                jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (organization_id, component_kind),
  unique (id, organization_id)
);

comment on table public.platform_components is
  'Per-org registry of observable platform components. One row per (org, component_kind). status = DISABLED_MANUAL is the operator kill switch; DISABLED_INCIDENT is auto-set by incident automation. config jsonb holds provider-specific settings (Mistral zdr_enabled, region, etc.).';

comment on column public.platform_components.config is
  'Provider-specific config as JSON. Examples:
   AI_MISTRAL: {"model_default":"mistral-large-latest","zdr_enabled":true,"endpoint":"https://api.eu.mistral.ai"}
   EMAIL: {"provider":"resend","from_domain":"..."}
   VOICE: {"transport":"TEST","stt":"TEST"}
   The dashboard renders selected keys per component_kind.';

create index platform_components_org_kind_idx on public.platform_components (organization_id, component_kind);
create index platform_components_org_status_idx on public.platform_components (organization_id, status);

alter table public.platform_components enable row level security;

create policy platform_components_select on public.platform_components
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy platform_components_insert on public.platform_components
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy platform_components_update on public.platform_components
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.platform_components to authenticated;
grant select, insert, update on public.platform_components to service_role;

create trigger set_platform_components_updated_at
  before update on public.platform_components
  for each row execute function private.set_updated_at();

-- =========================================================================
-- platform_component_events — heartbeat + outcome + error log
-- =========================================================================
create table public.platform_component_events (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  component_id          uuid not null,
  event_kind            text not null
    check (event_kind in ('HEARTBEAT', 'SUCCESS', 'ERROR', 'RETRY',
                          'TIMEOUT', 'FALLBACK', 'RATE_LIMIT',
                          'CONFIG_CHANGE', 'KILL_SWITCH_TOGGLE')),
  severity              text not null default 'INFO'
    check (severity in ('INFO', 'WARN', 'ERROR', 'CRITICAL')),
  latency_ms            integer check (latency_ms is null or latency_ms >= 0),
  external_ref          text check (external_ref is null or length(external_ref) <= 500),
  error_code            text check (error_code is null or length(error_code) <= 100),
  error_message         text check (error_message is null or length(error_message) <= 2000),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  recorded_at           timestamptz not null default now(),
  foreign key (component_id, organization_id) references public.platform_components(id, organization_id) on delete cascade
);

comment on table public.platform_component_events is
  'Heartbeat + outcome + error log per component. Every entry is a REAL event from a worker / webhook / scheduled job — no synthetic health scores. Dashboard aggregates counts, error rates, latency percentiles from this table.';

create index pce_org_component_recorded_idx on public.platform_component_events (organization_id, component_id, recorded_at desc);
create index pce_org_severity_recent_idx on public.platform_component_events (organization_id, severity, recorded_at desc)
  where severity in ('ERROR', 'CRITICAL');
create index pce_org_kind_recent_idx on public.platform_component_events (organization_id, event_kind, recorded_at desc);

alter table public.platform_component_events enable row level security;

create policy pce_select on public.platform_component_events
  for select to authenticated
  using (private.is_organization_member(organization_id));
-- INSERT via RPC only (record_platform_component_event) to avoid clients
-- writing arbitrary events; keep events trusted.
grant select on public.platform_component_events to authenticated;
grant select, insert on public.platform_component_events to service_role;

-- =========================================================================
-- platform_component_backlogs — periodic backlog measurements
-- =========================================================================
create table public.platform_component_backlogs (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  component_id          uuid not null,
  measured_at           timestamptz not null default now(),
  backlog_size          integer not null check (backlog_size >= 0),
  oldest_item_age_seconds integer check (oldest_item_age_seconds is null or oldest_item_age_seconds >= 0),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  foreign key (component_id, organization_id) references public.platform_components(id, organization_id) on delete cascade
);

comment on table public.platform_component_backlogs is
  'Periodic backlog measurements per component (e.g. queue depth, unprocessed webhooks). Feeds the dashboard « Backlog » column.';

create index pcb_org_component_measured_idx on public.platform_component_backlogs (organization_id, component_id, measured_at desc);

alter table public.platform_component_backlogs enable row level security;

create policy pcb_select on public.platform_component_backlogs
  for select to authenticated
  using (private.is_organization_member(organization_id));
grant select on public.platform_component_backlogs to authenticated;
grant select, insert on public.platform_component_backlogs to service_role;

-- =========================================================================
-- configure_platform_component — upsert per-org component
-- =========================================================================
create or replace function public.configure_platform_component(
  target_organization_id uuid,
  target_actor_user_id   uuid,
  target_component_kind  text,
  target_display_label   text,
  target_provider_kind   text,
  target_region          text,
  target_config          jsonb
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
    raise exception 'configure_platform_component: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'configure_platform_component: actor % is not an ACTIVE member of organization %',
      target_actor_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_component_kind not in (
    'EMAIL', 'AI_MISTRAL', 'DOCUMENTS', 'VOICE', 'EINVOICING',
    'GROWTH', 'AUTOMATIONS', 'WEBHOOKS', 'QUEUES', 'DATABASE',
    'STORAGE', 'REGULATORY', 'OTHER'
  ) then
    raise exception 'configure_platform_component: invalid component_kind %', target_component_kind
      using errcode = '22023';
  end if;

  insert into public.platform_components (
    organization_id, component_kind, display_label, provider_kind, region, config
  ) values (
    target_organization_id, target_component_kind, target_display_label,
    target_provider_kind, target_region, coalesce(target_config, '{}'::jsonb)
  )
  on conflict (organization_id, component_kind) do update
    set display_label = excluded.display_label,
        provider_kind = excluded.provider_kind,
        region        = excluded.region,
        config        = excluded.config
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'platform_component.configure',
    'platform_component', new_id,
    jsonb_build_object(
      'actor_user_id', target_actor_user_id,
      'component_kind', target_component_kind,
      'provider_kind', target_provider_kind,
      'region', target_region
    )
  );

  -- Record a CONFIG_CHANGE event so the timeline shows configuration edits
  insert into public.platform_component_events (
    organization_id, component_id, event_kind, severity, metadata
  ) values (
    target_organization_id, new_id, 'CONFIG_CHANGE', 'INFO',
    jsonb_build_object(
      'actor_user_id', target_actor_user_id,
      'provider_kind', target_provider_kind,
      'region', target_region
    )
  );

  return new_id;
end;
$$;

revoke all on function public.configure_platform_component(uuid, uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.configure_platform_component(uuid, uuid, text, text, text, text, jsonb) to authenticated, service_role;

-- =========================================================================
-- engage_kill_switch — ENABLED/DEGRADED → DISABLED_MANUAL (ACTIVE member)
-- =========================================================================
create or replace function public.engage_kill_switch(
  target_organization_id uuid,
  target_component_kind  text,
  target_actor_user_id   uuid,
  target_reason          text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  comp_id  uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'engage_kill_switch: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'engage_kill_switch: actor % is not an ACTIVE member of organization %',
      target_actor_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 1000 then
    raise exception 'engage_kill_switch: reason is required (non-empty ≤1000)'
      using errcode = '22023';
  end if;

  update public.platform_components
    set status                    = 'DISABLED_MANUAL',
        status_reason             = target_reason,
        status_changed_at         = now(),
        status_changed_by_user_id = target_actor_user_id
  where organization_id = target_organization_id
    and component_kind  = target_component_kind
    and status in ('ENABLED', 'DEGRADED')
  returning id into comp_id;

  get diagnostics affected = row_count;

  if affected = 1 then
    insert into public.platform_component_events (
      organization_id, component_id, event_kind, severity, error_message, metadata
    ) values (
      target_organization_id, comp_id, 'KILL_SWITCH_TOGGLE', 'CRITICAL',
      target_reason,
      jsonb_build_object('toggle', 'ENGAGE', 'actor_user_id', target_actor_user_id)
    );

    perform public.record_audit_log(
      target_organization_id, 'platform_component.kill_switch_engaged',
      'platform_component', comp_id,
      jsonb_build_object('actor_user_id', target_actor_user_id, 'reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.engage_kill_switch(uuid, text, uuid, text) from public, anon;
grant execute on function public.engage_kill_switch(uuid, text, uuid, text) to authenticated, service_role;

-- =========================================================================
-- release_kill_switch — DISABLED_MANUAL → ENABLED (ACTIVE member)
-- =========================================================================
create or replace function public.release_kill_switch(
  target_organization_id uuid,
  target_component_kind  text,
  target_actor_user_id   uuid,
  target_reason          text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  comp_id  uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'release_kill_switch: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'release_kill_switch: actor % is not an ACTIVE member of organization %',
      target_actor_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 1000 then
    raise exception 'release_kill_switch: reason is required (non-empty ≤1000)'
      using errcode = '22023';
  end if;

  update public.platform_components
    set status                    = 'ENABLED',
        status_reason             = target_reason,
        status_changed_at         = now(),
        status_changed_by_user_id = target_actor_user_id
  where organization_id = target_organization_id
    and component_kind  = target_component_kind
    and status = 'DISABLED_MANUAL'
  returning id into comp_id;

  get diagnostics affected = row_count;

  if affected = 1 then
    insert into public.platform_component_events (
      organization_id, component_id, event_kind, severity, metadata
    ) values (
      target_organization_id, comp_id, 'KILL_SWITCH_TOGGLE', 'INFO',
      jsonb_build_object('toggle', 'RELEASE', 'actor_user_id', target_actor_user_id, 'reason', target_reason)
    );

    perform public.record_audit_log(
      target_organization_id, 'platform_component.kill_switch_released',
      'platform_component', comp_id,
      jsonb_build_object('actor_user_id', target_actor_user_id, 'reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.release_kill_switch(uuid, text, uuid, text) from public, anon;
grant execute on function public.release_kill_switch(uuid, text, uuid, text) to authenticated, service_role;

-- =========================================================================
-- record_platform_component_event — worker posts an event
-- =========================================================================
-- Workers use this to post SUCCESS / ERROR / RETRY / TIMEOUT / FALLBACK /
-- RATE_LIMIT / HEARTBEAT events. service_role only — workers run on
-- service_role, humans use the dashboard read helpers.
create or replace function public.record_platform_component_event(
  target_organization_id uuid,
  target_component_kind  text,
  target_event_kind      text,
  target_severity        text,
  target_latency_ms      integer,
  target_external_ref    text,
  target_error_code      text,
  target_error_message   text,
  target_metadata        jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  comp_id uuid;
  new_id  uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'record_platform_component_event: service_role only (worker/webhook)'
      using errcode = '42501';
  end if;
  if target_event_kind not in (
    'HEARTBEAT', 'SUCCESS', 'ERROR', 'RETRY', 'TIMEOUT',
    'FALLBACK', 'RATE_LIMIT', 'CONFIG_CHANGE', 'KILL_SWITCH_TOGGLE'
  ) then
    raise exception 'record_platform_component_event: invalid event_kind %', target_event_kind
      using errcode = '22023';
  end if;
  if target_severity not in ('INFO', 'WARN', 'ERROR', 'CRITICAL') then
    raise exception 'record_platform_component_event: invalid severity %', target_severity
      using errcode = '22023';
  end if;

  select id into comp_id
  from public.platform_components
  where organization_id = target_organization_id
    and component_kind  = target_component_kind;

  if comp_id is null then
    raise exception 'record_platform_component_event: component % not registered for organization % (call configure_platform_component first)',
      target_component_kind, target_organization_id
      using errcode = '22023';
  end if;

  insert into public.platform_component_events (
    organization_id, component_id, event_kind, severity,
    latency_ms, external_ref, error_code, error_message, metadata
  ) values (
    target_organization_id, comp_id, target_event_kind, target_severity,
    target_latency_ms, target_external_ref, target_error_code, target_error_message,
    coalesce(target_metadata, '{}'::jsonb)
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.record_platform_component_event(uuid, text, text, text, integer, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_platform_component_event(uuid, text, text, text, integer, text, text, text, jsonb) to service_role;

-- =========================================================================
-- record_platform_component_backlog — worker posts a backlog snapshot
-- =========================================================================
create or replace function public.record_platform_component_backlog(
  target_organization_id uuid,
  target_component_kind  text,
  target_backlog_size    integer,
  target_oldest_item_age_seconds integer,
  target_metadata        jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  comp_id uuid;
  new_id  uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'record_platform_component_backlog: service_role only'
      using errcode = '42501';
  end if;
  if target_backlog_size is null or target_backlog_size < 0 then
    raise exception 'record_platform_component_backlog: backlog_size must be >= 0'
      using errcode = '22023';
  end if;

  select id into comp_id
  from public.platform_components
  where organization_id = target_organization_id
    and component_kind  = target_component_kind;

  if comp_id is null then
    raise exception 'record_platform_component_backlog: component % not registered', target_component_kind
      using errcode = '22023';
  end if;

  insert into public.platform_component_backlogs (
    organization_id, component_id, backlog_size, oldest_item_age_seconds, metadata
  ) values (
    target_organization_id, comp_id, target_backlog_size, target_oldest_item_age_seconds,
    coalesce(target_metadata, '{}'::jsonb)
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.record_platform_component_backlog(uuid, text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.record_platform_component_backlog(uuid, text, integer, integer, jsonb) to service_role;

-- =========================================================================
-- is_platform_component_enabled — the kill-switch check (workers use this)
-- =========================================================================
create or replace function public.is_platform_component_enabled(
  target_organization_id uuid,
  target_component_kind  text
)
returns boolean
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  comp_status text;
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'is_platform_component_enabled: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  select status into comp_status
  from public.platform_components
  where organization_id = target_organization_id
    and component_kind  = target_component_kind;

  -- If the component is not registered yet, default to true (opt-in kill
  -- switch — no explicit registration = no explicit disable).
  if comp_status is null then
    return true;
  end if;

  return comp_status in ('ENABLED', 'DEGRADED');
end;
$$;

revoke all on function public.is_platform_component_enabled(uuid, text) from public, anon;
grant execute on function public.is_platform_component_enabled(uuid, text) to authenticated, service_role;

comment on function public.is_platform_component_enabled(uuid, text) is
  'The kill-switch check every worker consults before making an external call. Returns TRUE when the component is ENABLED or DEGRADED (degraded still processes; a human intervened only if DISABLED). Unregistered components default to TRUE.';

-- =========================================================================
-- Read helpers — dashboard
-- =========================================================================
-- One row per component with aggregated stats over the last hour /
-- last 24h + latest backlog + latest events. NEVER synthesizes a
-- "health score" — the UI is free to derive one from these raw
-- numbers.
create or replace function public.platform_component_dashboard(
  target_organization_id uuid
)
returns table (
  component_id                uuid,
  component_kind              text,
  display_label               text,
  provider_kind               text,
  region                      text,
  status                      text,
  status_reason               text,
  status_changed_at           timestamptz,
  config                      jsonb,
  last_heartbeat_at           timestamptz,
  last_success_at             timestamptz,
  last_error_at               timestamptz,
  last_error_message          text,
  success_count_last_hour     bigint,
  error_count_last_hour       bigint,
  retry_count_last_hour       bigint,
  fallback_count_last_hour    bigint,
  avg_latency_ms_last_hour    numeric,
  latest_backlog_size         integer,
  latest_backlog_measured_at  timestamptz,
  latest_backlog_oldest_age_seconds integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'platform_component_dashboard: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    c.id, c.component_kind, c.display_label, c.provider_kind, c.region,
    c.status, c.status_reason, c.status_changed_at, c.config,
    (select max(e.recorded_at) from public.platform_component_events e
       where e.component_id = c.id and e.event_kind = 'HEARTBEAT'),
    (select max(e.recorded_at) from public.platform_component_events e
       where e.component_id = c.id and e.event_kind = 'SUCCESS'),
    (select max(e.recorded_at) from public.platform_component_events e
       where e.component_id = c.id and e.event_kind = 'ERROR'),
    (select e.error_message from public.platform_component_events e
       where e.component_id = c.id and e.event_kind = 'ERROR'
       order by e.recorded_at desc limit 1),
    (select count(*) from public.platform_component_events e
       where e.component_id = c.id
         and e.event_kind = 'SUCCESS'
         and e.recorded_at > now() - interval '1 hour'),
    (select count(*) from public.platform_component_events e
       where e.component_id = c.id
         and e.event_kind = 'ERROR'
         and e.recorded_at > now() - interval '1 hour'),
    (select count(*) from public.platform_component_events e
       where e.component_id = c.id
         and e.event_kind = 'RETRY'
         and e.recorded_at > now() - interval '1 hour'),
    (select count(*) from public.platform_component_events e
       where e.component_id = c.id
         and e.event_kind = 'FALLBACK'
         and e.recorded_at > now() - interval '1 hour'),
    (select round(avg(e.latency_ms)::numeric, 2) from public.platform_component_events e
       where e.component_id = c.id
         and e.latency_ms is not null
         and e.recorded_at > now() - interval '1 hour'),
    (select b.backlog_size from public.platform_component_backlogs b
       where b.component_id = c.id order by b.measured_at desc limit 1),
    (select b.measured_at from public.platform_component_backlogs b
       where b.component_id = c.id order by b.measured_at desc limit 1),
    (select b.oldest_item_age_seconds from public.platform_component_backlogs b
       where b.component_id = c.id order by b.measured_at desc limit 1)
  from public.platform_components c
  where c.organization_id = target_organization_id
  order by c.component_kind;
end;
$$;

revoke all on function public.platform_component_dashboard(uuid) from public, anon;
grant execute on function public.platform_component_dashboard(uuid) to authenticated, service_role;

-- Component-specific event trail (recent events, optionally filtered)
create or replace function public.platform_component_events_for(
  target_organization_id uuid,
  target_component_kind  text,
  target_since           timestamptz,
  target_severity_filter text
)
returns table (
  event_id       uuid,
  event_kind     text,
  severity       text,
  latency_ms     integer,
  external_ref   text,
  error_code     text,
  error_message  text,
  metadata       jsonb,
  recorded_at    timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  comp_id uuid;
  from_ts timestamptz;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'platform_component_events_for: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select id into comp_id
  from public.platform_components
  where organization_id = target_organization_id
    and component_kind  = target_component_kind;
  if comp_id is null then
    return;
  end if;

  from_ts := coalesce(target_since, now() - interval '24 hours');

  return query
  select
    e.id, e.event_kind, e.severity, e.latency_ms, e.external_ref,
    e.error_code, e.error_message, e.metadata, e.recorded_at
  from public.platform_component_events e
  where e.organization_id = target_organization_id
    and e.component_id    = comp_id
    and e.recorded_at    >= from_ts
    and (target_severity_filter is null or e.severity = target_severity_filter)
  order by e.recorded_at desc
  limit 500;
end;
$$;

revoke all on function public.platform_component_events_for(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.platform_component_events_for(uuid, text, timestamptz, text) to authenticated, service_role;

-- Mistral-specific stats — reads from ai_runs (the source of truth).
create or replace function public.ai_provider_stats(
  target_organization_id uuid,
  target_since           timestamptz,
  target_until           timestamptz
)
returns table (
  model           text,
  provider        text,
  call_count      bigint,
  success_count   bigint,
  error_count     bigint,
  tokens_input    bigint,
  tokens_output   bigint,
  total_estimated_cost numeric,
  avg_latency_ms  numeric,
  p95_latency_ms  numeric
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'ai_provider_stats: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_since is null or target_until is null or target_since >= target_until then
    raise exception 'ai_provider_stats: since and until required (since < until)'
      using errcode = '22023';
  end if;

  return query
  select
    a.model,
    a.provider,
    count(*)::bigint                                 as call_count,
    count(*) filter (where a.status = 'SUCCESS')::bigint as success_count,
    count(*) filter (where a.status = 'ERROR')::bigint   as error_count,
    coalesce(sum(a.input_tokens), 0)::bigint          as tokens_input,
    coalesce(sum(a.output_tokens), 0)::bigint         as tokens_output,
    coalesce(sum(a.estimated_cost), 0)                as total_estimated_cost,
    round(avg(a.latency_ms)::numeric, 2)              as avg_latency_ms,
    round(percentile_cont(0.95) within group (order by a.latency_ms)::numeric, 2) as p95_latency_ms
  from public.ai_runs a
  where a.organization_id = target_organization_id
    and a.created_at >= target_since
    and a.created_at <  target_until
  group by a.model, a.provider
  order by call_count desc;
end;
$$;

revoke all on function public.ai_provider_stats(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.ai_provider_stats(uuid, timestamptz, timestamptz) to authenticated, service_role;

comment on function public.ai_provider_stats(uuid, timestamptz, timestamptz) is
  'Aggregate AI provider (Mistral etc.) usage/cost from ai_runs — the ONLY source of truth for AI numbers. NEVER synthesized. Callers pair this with platform_component_dashboard row for AI_MISTRAL (region, zdr, kill-switch state).';
