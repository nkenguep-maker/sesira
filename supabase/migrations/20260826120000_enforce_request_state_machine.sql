-- SESIRA Core Workflow — canonical Request state machine
-- Enforces the transition graph at the database boundary so that any
-- authenticated tenant Data API attempt cannot bypass the application
-- transition contract in src/lib/requests/schema.ts.

create or replace function private.enforce_request_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Bypass for non-authenticated callers (seed/administrative connections
  -- run as postgres/supabase_admin; only PostgREST tenant traffic runs as
  -- the `authenticated` role and needs enforcement).
  if current_role <> 'authenticated' then
    return new;
  end if;

  -- Terminal statuses are protected.
  if old.status in ('CLOSED', 'SPAM', 'LOST') then
    raise exception 'request % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'NEW'         and new.status in ('PROCESSING', 'NEEDS_INFO', 'QUALIFIED', 'SPAM', 'LOST')) or
    (old.status = 'PROCESSING'  and new.status in ('NEEDS_INFO', 'QUALIFIED', 'SPAM', 'LOST')) or
    (old.status = 'NEEDS_INFO'  and new.status in ('PROCESSING', 'QUALIFIED', 'LOST')) or
    (old.status = 'QUALIFIED'   and new.status in ('READY', 'NEEDS_INFO', 'LOST')) or
    (old.status = 'READY'       and new.status in ('ASSIGNED', 'CLOSED', 'LOST')) or
    (old.status = 'ASSIGNED'    and new.status in ('READY', 'CLOSED', 'LOST'))
  ) then
    raise exception 'request % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_request_state_transition()
  from public, anon, authenticated, service_role;

create trigger request_state_transition_guard
  before update of status on public.requests
  for each row
  when (old.status is distinct from new.status)
  execute function private.enforce_request_state_transition();

comment on function private.enforce_request_state_transition() is
  'Canonical Request transition source of truth. Mirrors REQUEST_STATUS_TRANSITIONS in src/lib/requests/schema.ts. Fires only for the `authenticated` role (PostgREST tenant traffic).';
