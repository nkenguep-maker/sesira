-- SESIRA Core Workflow — guarded email provider boundary (C9).
--
-- C9 introduces the *server-side outbound message boundary*. Every email
-- Sesira sends passes through a single choke point:
--
--   1. `assertGuardedEmailAllowed()` in TypeScript enforces
--      `EXTERNAL_ACTIONS_ENABLED=true` AND `VERCEL_ENV=production`.
--      Shadow and every non-production deployment fail closed.
--
--   2. `record_outbound_message_intent` inserts a QUEUED row keyed by
--      `(organization_id, idempotency_key)`. Two concurrent callers with
--      the same key observe one row and one `created=true` — the loser
--      short-circuits before touching the provider. This is the *only*
--      insert path exposed to the app; direct INSERT is REVOKED.
--
--   3. Provider adapter runs (Resend for now).
--
--   4. `mark_outbound_message_sent` (on success) or
--      `mark_outbound_message_failed` (on error) closes the row and
--      records the provider message id + error classification.
--
-- Design decisions worth calling out:
--
--   * `provider_delivery_receipts` (from 20260830) records *inbound*
--     provider callbacks (delivered, bounced). `outbound_messages`
--     records *outbound* send attempts. Both share the concept of
--     idempotency by external identity; neither replaces the other.
--
--   * `integration_id` is a nullable FK. Nullable because a send can
--     legitimately fail before an integration is chosen (the intent is
--     still recorded for audit); NOT NULL was rejected to keep the
--     insert path from silently failing on integration lookup edge
--     cases. A CHECK enforces that `integration_id` is set once the
--     row moves to SENT.
--
--   * `body_hash` (sha256) is an audit artifact, not a dedup key. The
--     dedup identity is `idempotency_key`, computed from stable
--     operational identifiers by the caller (never from the body).
--
--   * `error_class` mirrors the retry runner's TRANSIENT / PERMANENT
--     split so C15's manual-retry UI can decide surface. FAILED rows
--     are NOT re-QUEUED here; the caller (worker) may schedule a new
--     intent with a fresh idempotency_key if a retry is warranted.

-- =========================================================================
-- 1. Table
-- =========================================================================
create table public.outbound_messages (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  integration_id         uuid references public.integrations(id) on delete set null,
  idempotency_key        text not null,
  channel                text not null default 'email' check (channel in ('email')),
  provider               text not null,
  to_email               text not null check (length(to_email) > 0 and length(to_email) <= 320),
  from_email             text not null check (length(from_email) > 0 and length(from_email) <= 320),
  reply_to               text check (length(reply_to) <= 320),
  subject                text not null check (length(subject) > 0 and length(subject) <= 512),
  body_hash              text not null check (body_hash ~ '^[0-9a-f]{64}$'),
  status                 text not null default 'QUEUED' check (status in ('QUEUED', 'SENT', 'FAILED')),
  provider_message_id    text check (length(provider_message_id) <= 200),
  error_class            text check (error_class in ('TRANSIENT', 'PERMANENT')),
  error_message          text check (length(error_message) <= 2000),
  attempt_count          integer not null default 0 check (attempt_count >= 0),
  sent_at                timestamptz,
  failed_at              timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (organization_id, idempotency_key),
  -- SENT rows require a provider_message_id and a resolved integration.
  constraint outbound_messages_sent_has_provider_ref check (
    status <> 'SENT' or (provider_message_id is not null and integration_id is not null)
  ),
  -- FAILED rows require an error_class.
  constraint outbound_messages_failed_has_error_class check (
    status <> 'FAILED' or error_class is not null
  )
);

comment on table public.outbound_messages is
  'Server-side outbound message ledger. One row per send *intent* (QUEUED), transitioning to SENT or FAILED. (organization_id, idempotency_key) is the boundary identity — the send adapter cannot enter the provider path twice for the same key. See src/lib/email/send.ts.';

comment on column public.outbound_messages.idempotency_key is
  'Stable operational identity for this send intent. Built by src/lib/idempotency/keys.ts:outboundMessageIntentKey. Never derived from mutable business values (subject, body, recipient).';

comment on column public.outbound_messages.body_hash is
  'sha256 hex of (text ++ html). Audit artifact — NOT part of the identity. Two intents with different bodies but the same idempotency_key resolve to one row (the loser is dropped before touching the provider).';

comment on column public.outbound_messages.error_class is
  'TRANSIENT (5xx / network / rate-limit) vs PERMANENT (4xx / invalid address / blocked). Mirrors src/lib/retry/runner.ts classification so C15 manual-retry UI can decide surface.';

create index outbound_messages_org_status_idx
  on public.outbound_messages (organization_id, status);
create index outbound_messages_integration_idx
  on public.outbound_messages (organization_id, integration_id)
  where integration_id is not null;

-- =========================================================================
-- 2. RLS
-- =========================================================================
alter table public.outbound_messages enable row level security;

-- Members of the org can read their own outbound ledger (Ops screens,
-- Attention drill-down). No direct INSERT/UPDATE/DELETE — writes go
-- through the SECURITY DEFINER helpers below.
create policy outbound_messages_select on public.outbound_messages
  for select to authenticated
  using (private.is_organization_member(organization_id));

grant select on public.outbound_messages to authenticated;
grant select, insert, update on public.outbound_messages to service_role;

-- =========================================================================
-- 3. record_outbound_message_intent — insert-once
-- =========================================================================
create or replace function public.record_outbound_message_intent(
  target_organization_id uuid,
  target_idempotency_key text,
  target_integration_id  uuid,
  target_provider        text,
  target_channel         text,
  target_to_email        text,
  target_from_email      text,
  target_reply_to        text,
  target_subject         text,
  target_body_hash       text
)
returns table (id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id uuid;
  existing_id uuid;
begin
  if target_idempotency_key is null or length(target_idempotency_key) = 0 then
    raise exception 'record_outbound_message_intent: idempotency_key is required'
      using errcode = '22023';
  end if;
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'record_outbound_message_intent: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  insert into public.outbound_messages (
    organization_id, idempotency_key, integration_id, provider, channel,
    to_email, from_email, reply_to, subject, body_hash
  )
  values (
    target_organization_id, target_idempotency_key, target_integration_id,
    target_provider, coalesce(target_channel, 'email'),
    target_to_email, target_from_email, target_reply_to,
    target_subject, target_body_hash
  )
  on conflict (organization_id, idempotency_key)
    do nothing
  returning outbound_messages.id into inserted_id;

  if inserted_id is not null then
    id := inserted_id;
    created := true;
    return next;
    return;
  end if;

  select outbound_messages.id into existing_id
  from public.outbound_messages
  where organization_id = target_organization_id
    and idempotency_key = target_idempotency_key;

  id := existing_id;
  created := false;
  return next;
  return;
end;
$$;

revoke all on function public.record_outbound_message_intent(uuid, text, uuid, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.record_outbound_message_intent(uuid, text, uuid, text, text, text, text, text, text, text)
  to authenticated, service_role;

comment on function public.record_outbound_message_intent(uuid, text, uuid, text, text, text, text, text, text, text) is
  'Replay-safe outbound send intent. Returns (id, created). Two concurrent callers with the same (organization_id, idempotency_key) observe one row and one created=true; the loser short-circuits before touching the provider.';

-- =========================================================================
-- 4. mark_outbound_message_sent — transition QUEUED -> SENT
-- =========================================================================
create or replace function public.mark_outbound_message_sent(
  target_organization_id  uuid,
  target_message_id       uuid,
  target_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if target_provider_message_id is null or length(target_provider_message_id) = 0 then
    raise exception 'mark_outbound_message_sent: provider_message_id is required'
      using errcode = '22023';
  end if;
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'mark_outbound_message_sent: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.outbound_messages
    set status = 'SENT',
        provider_message_id = target_provider_message_id,
        sent_at = coalesce(sent_at, now()),
        attempt_count = attempt_count + 1,
        updated_at = now()
  where id = target_message_id
    and organization_id = target_organization_id
    and status = 'QUEUED';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.mark_outbound_message_sent(uuid, uuid, text)
  from public, anon;
grant execute on function public.mark_outbound_message_sent(uuid, uuid, text)
  to authenticated, service_role;

comment on function public.mark_outbound_message_sent(uuid, uuid, text) is
  'Close an outbound_messages row on success (QUEUED -> SENT). Returns true iff exactly one row transitioned. Idempotent: a replay on an already-SENT row returns false without side effect.';

-- =========================================================================
-- 5. mark_outbound_message_failed — transition QUEUED -> FAILED
-- =========================================================================
create or replace function public.mark_outbound_message_failed(
  target_organization_id uuid,
  target_message_id      uuid,
  target_error_class     text,
  target_error_message   text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if target_error_class not in ('TRANSIENT', 'PERMANENT') then
    raise exception 'mark_outbound_message_failed: error_class must be TRANSIENT or PERMANENT (got %)', target_error_class
      using errcode = '22023';
  end if;
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'mark_outbound_message_failed: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.outbound_messages
    set status = 'FAILED',
        error_class = target_error_class,
        error_message = target_error_message,
        failed_at = coalesce(failed_at, now()),
        attempt_count = attempt_count + 1,
        updated_at = now()
  where id = target_message_id
    and organization_id = target_organization_id
    and status = 'QUEUED';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.mark_outbound_message_failed(uuid, uuid, text, text)
  from public, anon;
grant execute on function public.mark_outbound_message_failed(uuid, uuid, text, text)
  to authenticated, service_role;

comment on function public.mark_outbound_message_failed(uuid, uuid, text, text) is
  'Close an outbound_messages row on failure (QUEUED -> FAILED). error_class must be TRANSIENT or PERMANENT. Returns true iff exactly one row transitioned. Idempotent: a replay on an already-FAILED row returns false without side effect.';
