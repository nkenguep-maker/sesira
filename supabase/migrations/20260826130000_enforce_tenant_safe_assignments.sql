-- SESIRA Core Workflow — tenant-safe assignments (P0)
-- Prevents cross-tenant or inactive-member assignments on:
--   requests.assigned_user_id
--   quotes.owner_user_id
--   attention_items.assigned_user_id
--
-- Rules encoded here:
--   * NULL assignment is always allowed (unassign path).
--   * Any non-null assignment MUST be an ACTIVE member of the row's own
--     organization. Suspended/invited members cannot be freshly assigned.
--   * Historical assignments are NOT destroyed automatically when a member
--     later becomes suspended — this migration only guards NEW writes.
--   * Fires only when the assignment column actually changes (or is set on
--     insert), so no-op UPDATEs (e.g., updating title) do not re-validate.
--   * SECURITY DEFINER on the helper so it can consult
--     `public.organization_members` regardless of the caller's RLS scope
--     (RLS on organization_members hides rows for other tenants otherwise).
--
-- Interaction with existing components:
--   * Existing state-machine triggers (20260826120000, 20260826120100)
--     guard `status`. This trigger is independent and guards assignment
--     columns only.
--   * The `on delete set null` FK on auth.users(id) still handles
--     hard-deleted user cleanup; that path bypasses the trigger because
--     PostgreSQL cascades run as the owner (superuser), not `authenticated`.

create or replace function private.assert_tenant_active_assignment(
  target_organization_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_user_id
      and status = 'ACTIVE'
  ) then
    raise exception
      'user % is not an ACTIVE member of organization % and cannot be assigned',
      target_user_id, target_organization_id
      using errcode = '23514';
  end if;
end;
$$;

revoke all on function private.assert_tenant_active_assignment(uuid, uuid)
  from public, anon, authenticated, service_role;

comment on function private.assert_tenant_active_assignment(uuid, uuid) is
  'Guard used by BEFORE INSERT/UPDATE triggers on requests.assigned_user_id, quotes.owner_user_id and attention_items.assigned_user_id. Raises errcode 23514 (check_violation) when the assignee is not an ACTIVE member of the row''s organization. NULL passes through.';

-- Per-table trigger functions. Each reads the assignment column its trigger
-- fires for, so the shared helper stays column-agnostic.

create or replace function private.enforce_requests_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.assert_tenant_active_assignment(new.organization_id, new.assigned_user_id);
  return new;
end;
$$;

create or replace function private.enforce_quotes_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.assert_tenant_active_assignment(new.organization_id, new.owner_user_id);
  return new;
end;
$$;

create or replace function private.enforce_attention_items_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.assert_tenant_active_assignment(new.organization_id, new.assigned_user_id);
  return new;
end;
$$;

revoke all on function private.enforce_requests_assignment()
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_quotes_assignment()
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_attention_items_assignment()
  from public, anon, authenticated, service_role;

create trigger requests_assignment_guard_insert
  before insert on public.requests
  for each row
  when (new.assigned_user_id is not null)
  execute function private.enforce_requests_assignment();

create trigger requests_assignment_guard_update
  before update of assigned_user_id on public.requests
  for each row
  when (new.assigned_user_id is distinct from old.assigned_user_id)
  execute function private.enforce_requests_assignment();

create trigger quotes_assignment_guard_insert
  before insert on public.quotes
  for each row
  when (new.owner_user_id is not null)
  execute function private.enforce_quotes_assignment();

create trigger quotes_assignment_guard_update
  before update of owner_user_id on public.quotes
  for each row
  when (new.owner_user_id is distinct from old.owner_user_id)
  execute function private.enforce_quotes_assignment();

create trigger attention_items_assignment_guard_insert
  before insert on public.attention_items
  for each row
  when (new.assigned_user_id is not null)
  execute function private.enforce_attention_items_assignment();

create trigger attention_items_assignment_guard_update
  before update of assigned_user_id on public.attention_items
  for each row
  when (new.assigned_user_id is distinct from old.assigned_user_id)
  execute function private.enforce_attention_items_assignment();

comment on trigger requests_assignment_guard_insert on public.requests is
  'Blocks non-null cross-tenant / inactive-member assignments at insert time.';
comment on trigger requests_assignment_guard_update on public.requests is
  'Blocks non-null cross-tenant / inactive-member reassignments at update time. Historical values are preserved when the member is later suspended.';
comment on trigger quotes_assignment_guard_insert on public.quotes is
  'Blocks non-null cross-tenant / inactive-member assignments at insert time.';
comment on trigger quotes_assignment_guard_update on public.quotes is
  'Blocks non-null cross-tenant / inactive-member reassignments at update time.';
comment on trigger attention_items_assignment_guard_insert on public.attention_items is
  'Blocks non-null cross-tenant / inactive-member assignments at insert time.';
comment on trigger attention_items_assignment_guard_update on public.attention_items is
  'Blocks non-null cross-tenant / inactive-member reassignments at update time.';
