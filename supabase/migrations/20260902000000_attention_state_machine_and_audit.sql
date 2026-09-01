-- SESIRA Core Workflow — Attention state machine + audit RPC (C6).
--
-- Two concerns bundled because they form one indivisible boundary:
--
-- 1. `attention_items` gains a BEFORE UPDATE trigger that rejects any
--    status transition outside the documented state machine. Today the
--    guard exists only in TypeScript (`canCloseAttentionItem` in
--    src/lib/attention/schema.ts) — a direct PostgREST UPDATE from a
--    tenant user bypasses it and can, e.g., resurrect a DISMISSED item
--    into IN_PROGRESS without any observer. The trigger raises 22023
--    (invalid_parameter_value) on any illegal (from → to) pair.
--
--    The `resolved_at` column is also enforced: it must be non-null iff
--    the row is in a closed status. Reopening → resolved_at is cleared.
--
-- 2. `public.record_audit_log` — the missing write-side wrapper for the
--    `public.audit_logs` append-only table. RLS already grants INSERT
--    to authenticated tenants, but the raw INSERT relies on the caller
--    to pass a consistent (actor_type, actor_id) tuple. The RPC:
--
--      * refuses if the caller is neither an ACTIVE member of the org
--        nor a service_role JWT;
--      * pins `actor_type = 'user'` and `actor_id = auth.uid()` when
--        called from an authenticated tenant session — the caller
--        cannot forge another user's identity;
--      * accepts `actor_type = 'system'` (with actor_id = null) only
--        when called from a service_role JWT;
--      * writes the row with a stable server-side timestamp.
--
-- Both trigger and RPC follow the corrected `auth.role()` idiom from
-- 20260831 — session_user is unreliable on Supabase.

-- =========================================================================
-- 1. attention_items — status transition trigger
-- =========================================================================

-- Valid state graph:
--   OPEN         → IN_PROGRESS | RESOLVED | DISMISSED
--   IN_PROGRESS  → OPEN         | RESOLVED | DISMISSED
--   RESOLVED     → OPEN                                  (reopen)
--   DISMISSED    → OPEN                                  (reopen)
--
-- A row that has never left OPEN can go straight to a closed status
-- (bulk-resolve). Reopening always lands back in OPEN (not IN_PROGRESS
-- directly): assignment is a separate follow-up action.

create or replace function private.enforce_attention_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  legal boolean := false;
begin
  if old.status = new.status then
    return new;
  end if;

  legal := (
    (old.status = 'OPEN'        and new.status in ('IN_PROGRESS', 'RESOLVED', 'DISMISSED'))
    or (old.status = 'IN_PROGRESS' and new.status in ('OPEN', 'RESOLVED', 'DISMISSED'))
    or (old.status = 'RESOLVED'    and new.status = 'OPEN')
    or (old.status = 'DISMISSED'   and new.status = 'OPEN')
  );

  if not legal then
    raise exception
      'attention_items status transition % -> % is not allowed', old.status, new.status
      using errcode = '22023';
  end if;

  -- Reopening clears resolved_at; closing must set it (defense in depth
  -- alongside application layer).
  if new.status in ('RESOLVED', 'DISMISSED') and new.resolved_at is null then
    new.resolved_at := now();
  end if;
  if new.status in ('OPEN', 'IN_PROGRESS') then
    new.resolved_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

comment on function private.enforce_attention_state_transition() is
  'BEFORE UPDATE trigger on attention_items.status. Rejects invalid transitions (22023) and enforces the resolved_at invariant. Same enforcement mechanism as the quote state machine.';

drop trigger if exists attention_items_state_transition on public.attention_items;

create trigger attention_items_state_transition
before update of status on public.attention_items
for each row
when (old.status is distinct from new.status)
execute function private.enforce_attention_state_transition();

comment on trigger attention_items_state_transition on public.attention_items is
  'Enforces the OPEN <-> IN_PROGRESS -> RESOLVED/DISMISSED -> OPEN state graph at the DB boundary. Without it, a direct Data API UPDATE from a tenant user could revive a dismissed item without observation.';

-- =========================================================================
-- 2. record_audit_log — server-side append-only audit RPC
-- =========================================================================
-- The private primitive does the write with search_path=''; the public
-- wrapper enforces membership and pins actor identity.

create or replace function private.record_audit_log(
  target_organization_id uuid,
  target_actor_type      text,
  target_actor_id        uuid,
  target_action          text,
  target_entity_type     text,
  target_entity_id       uuid,
  target_metadata        jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id uuid;
begin
  insert into public.audit_logs (
    organization_id, actor_type, actor_id, action,
    entity_type, entity_id, metadata
  )
  values (
    target_organization_id, target_actor_type, target_actor_id, target_action,
    target_entity_type, target_entity_id, coalesce(target_metadata, '{}'::jsonb)
  )
  returning id into inserted_id;
  return inserted_id;
end;
$$;

revoke all on function private.record_audit_log(uuid, text, uuid, text, text, uuid, jsonb)
  from public, anon, authenticated, service_role;

comment on function private.record_audit_log(uuid, text, uuid, text, text, uuid, jsonb) is
  'Append-only audit primitive. Called from the public wrapper which enforces membership and pins actor identity.';

create or replace function public.record_audit_log(
  target_organization_id uuid,
  target_action          text,
  target_entity_type     text default null,
  target_entity_id       uuid default null,
  target_metadata        jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  effective_actor_type text;
  effective_actor_id   uuid;
  role_claim           text;
begin
  if target_action is null or length(target_action) = 0 or length(target_action) > 200 then
    raise exception 'record_audit_log: action must be a non-empty string ≤200 chars'
      using errcode = '22023';
  end if;

  role_claim := (select auth.role());

  if role_claim = 'service_role' then
    effective_actor_type := 'system';
    effective_actor_id   := null;
  else
    if not private.is_organization_member(target_organization_id) then
      raise exception 'record_audit_log: caller is not authorized for organization %', target_organization_id
        using errcode = '42501';
    end if;
    effective_actor_type := 'user';
    effective_actor_id   := (select auth.uid());
    if effective_actor_id is null then
      raise exception 'record_audit_log: authenticated caller has no auth.uid()'
        using errcode = '42501';
    end if;
  end if;

  return private.record_audit_log(
    target_organization_id,
    effective_actor_type,
    effective_actor_id,
    target_action,
    target_entity_type,
    target_entity_id,
    target_metadata
  );
end;
$$;

revoke all on function public.record_audit_log(uuid, text, text, uuid, jsonb)
  from public, anon;
grant execute on function public.record_audit_log(uuid, text, text, uuid, jsonb)
  to authenticated, service_role;

comment on function public.record_audit_log(uuid, text, text, uuid, jsonb) is
  'Postgrest-exposed audit writer. Pins actor identity server-side: (user, auth.uid()) for tenant callers, (system, null) for service_role. Caller cannot spoof another user. Append-only — no dedup: repeated calls create repeated rows on purpose (audit is a stream, not a set).';
