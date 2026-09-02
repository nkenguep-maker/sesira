-- SESIRA Core Workflow — speed-to-lead (C22).
--
-- Persists reliable timing data on inbound requests:
--   * `received_at` — moment the request became visible to the org.
--     Distinct from `created_at` (the DB insert timestamp) for
--     imported requests whose original arrival time can be provided
--     by the source.
--   * `first_response_at` — moment the first outbound response (any
--     channel) was recorded against the request. Written ONCE by
--     `record_request_first_response`; a replay observes the
--     already-populated timestamp and returns FALSE without
--     mutation.
--   * `acknowledged_at` — moment SESIRA sent the auto-acknowledgement
--     (distinct from first_response_at; an auto-ack is not a
--     qualified reply).
--
-- Median / p90 are computed by the read layer, not persisted. The
-- inputs are cheap to aggregate on demand and any stored aggregate
-- would immediately be stale.

alter table public.requests
  add column received_at        timestamptz not null default now(),
  add column acknowledged_at    timestamptz,
  add column first_response_at  timestamptz;

comment on column public.requests.received_at is
  'Moment the request became visible to the org. Import path sets this from the source; app-created requests default to now(). Distinct from created_at (the DB insert).';
comment on column public.requests.acknowledged_at is
  'Moment SESIRA sent the automated acknowledgement. Distinct from first_response_at; an auto-ack is not a qualified human reply.';
comment on column public.requests.first_response_at is
  'Moment the first qualified human response was recorded. Written once by record_request_first_response; a replay returns FALSE.';

create index requests_org_speed_idx
  on public.requests (organization_id, received_at desc)
  where first_response_at is null;

-- =========================================================================
-- record_request_acknowledged — auto-ack timestamp (idempotent)
-- =========================================================================
create or replace function public.record_request_acknowledged(
  target_organization_id uuid,
  target_request_id      uuid
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
    raise exception 'record_request_acknowledged: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.requests
    set acknowledged_at = now()
  where id = target_request_id
    and organization_id = target_organization_id
    and acknowledged_at is null;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.record_request_acknowledged(uuid, uuid) from public, anon;
grant execute on function public.record_request_acknowledged(uuid, uuid) to authenticated, service_role;

-- =========================================================================
-- record_request_first_response — human first response timestamp (once)
-- =========================================================================
create or replace function public.record_request_first_response(
  target_organization_id uuid,
  target_request_id      uuid,
  target_responder_user_id uuid
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
    raise exception 'record_request_first_response: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_responder_user_id is not null and not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_responder_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'record_request_first_response: responder % is not an ACTIVE member of organization %',
      target_responder_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.requests
    set first_response_at = now()
  where id = target_request_id
    and organization_id = target_organization_id
    and first_response_at is null;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'request.first_response',
      'request', target_request_id,
      jsonb_build_object('responder_user_id', target_responder_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_request_first_response(uuid, uuid, uuid) from public, anon;
grant execute on function public.record_request_first_response(uuid, uuid, uuid) to authenticated, service_role;

comment on function public.record_request_first_response(uuid, uuid, uuid) is
  'Set requests.first_response_at exactly once. Returns TRUE on the transition, FALSE on replay. Responder must be an ACTIVE member.';

-- =========================================================================
-- speed_to_lead_stats — read function returning aggregate stats
-- =========================================================================
create or replace function public.speed_to_lead_stats(
  target_organization_id uuid,
  target_period_start    timestamptz,
  target_period_end      timestamptz
)
returns table (
  responded_count      integer,
  unresponded_count    integer,
  median_response_seconds numeric,
  p90_response_seconds numeric,
  fastest_response_seconds numeric,
  slowest_response_seconds numeric
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'speed_to_lead_stats: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  with responded as (
    select
      extract(epoch from (r.first_response_at - r.received_at))::numeric as response_seconds
    from public.requests r
    where r.organization_id = target_organization_id
      and r.received_at >= target_period_start
      and r.received_at <= target_period_end
      and r.first_response_at is not null
  ),
  unresponded as (
    select 1 as row_marker
    from public.requests r
    where r.organization_id = target_organization_id
      and r.received_at >= target_period_start
      and r.received_at <= target_period_end
      and r.first_response_at is null
  )
  select
    (select count(*)::integer from responded),
    (select count(*)::integer from unresponded),
    (select percentile_cont(0.5) within group (order by response_seconds) from responded),
    (select percentile_cont(0.9) within group (order by response_seconds) from responded),
    (select min(response_seconds) from responded),
    (select max(response_seconds) from responded);
end;
$$;

revoke all on function public.speed_to_lead_stats(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.speed_to_lead_stats(uuid, timestamptz, timestamptz) to authenticated, service_role;

comment on function public.speed_to_lead_stats(uuid, timestamptz, timestamptz) is
  'Aggregate speed-to-lead over a period. Median + p90 + min + max in seconds. Unresponded count is the queue depth for the window. Pure aggregate; no persisted derived rows.';
