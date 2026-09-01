-- SESIRA Core Workflow — inbound email reply matching (C10).
--
-- C10 introduces the *server-side inbound reply boundary*. A verified
-- provider webhook (Resend / Sendgrid inbound) hands us a parsed
-- envelope; the C10 ingest pipeline persists the inbound message,
-- links it to the originating quote via the In-Reply-To header, and
-- transitions the quote to REPLIED.
--
-- Design decisions worth calling out:
--
--   * The `messages` table already holds outbound sends (C0+); C10
--     ADDS the inbound columns (`idempotency_key`, `in_reply_to`,
--     `references_headers`, `raw_headers`) rather than creating a
--     parallel `inbound_messages` table. Doctrine: preserve existing
--     surface, never create parallel systems.
--
--   * `idempotency_key` on messages is NULLABLE and partial-unique
--     per (organization_id, idempotency_key) — same pattern as
--     `events.idempotency_key` (C7). Legacy manual outbound sends
--     stay keyless; inbound rows always carry a key derived from
--     the provider event id.
--
--   * `mark_quote_replied` is SECURITY DEFINER and enforces the
--     state-machine transition itself. The state-machine trigger
--     (private.enforce_quote_state_transition) short-circuits when
--     current_role <> 'authenticated', so a naked service_role
--     UPDATE would bypass the invariant — this RPC re-imposes it.
--
--   * `record_inbound_message` is SECURITY DEFINER + service_role
--     only. Tenant users cannot forge inbound messages. Same
--     doctrine as `record_provider_delivery` (C7).

-- =========================================================================
-- 1. Extend public.messages with inbound-specific columns
-- =========================================================================
alter table public.messages
  add column idempotency_key    text,
  add column in_reply_to        text,
  add column references_headers text[],
  add column raw_headers        jsonb not null default '{}'::jsonb
    check (jsonb_typeof(raw_headers) = 'object');

comment on column public.messages.idempotency_key is
  'Stable operational identity for this message row. NULL for legacy manual outbound rows; inbound rows always carry a key built from the provider event id (see src/lib/idempotency/keys.ts:inboundMessageKey). Enforced unique per organization via messages_idempotency_key_idx when set.';

comment on column public.messages.in_reply_to is
  'RFC 5322 In-Reply-To header value from the inbound provider payload (bracketed or bare). Matched against outbound_messages.provider_message_id at ingest time to link the reply to the originating quote.';

comment on column public.messages.references_headers is
  'RFC 5322 References header chain (ordered). Retained for future thread reconstruction; not consulted by the current match logic.';

comment on column public.messages.raw_headers is
  'Full header dump from the provider payload. Audit artifact — the ingest layer must NOT read business fields (subject, from) from here (those come from the parsed envelope). Kept as jsonb object for debug replay.';

create unique index messages_idempotency_key_idx
  on public.messages (organization_id, idempotency_key)
  where idempotency_key is not null;

create index messages_in_reply_to_idx
  on public.messages (organization_id, in_reply_to)
  where in_reply_to is not null;

-- =========================================================================
-- 2. record_inbound_message — service_role only
-- =========================================================================
create or replace function public.record_inbound_message(
  target_organization_id uuid,
  target_idempotency_key text,
  target_provider        text,
  target_provider_message_id text,
  target_customer_id     uuid,
  target_quote_id        uuid,
  target_request_id      uuid,
  target_from_email      text,
  target_subject         text,
  target_body_text       text,
  target_in_reply_to     text,
  target_references_headers text[],
  target_raw_headers     jsonb,
  target_received_at     timestamptz
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
    raise exception 'record_inbound_message: idempotency_key is required'
      using errcode = '22023';
  end if;
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'record_inbound_message: only service_role may record inbound messages'
      using errcode = '42501';
  end if;

  insert into public.messages (
    organization_id, idempotency_key, direction, channel, status,
    customer_id, quote_id, request_id,
    provider_message_id, subject, body_text,
    in_reply_to, references_headers, raw_headers,
    received_at, metadata
  )
  values (
    target_organization_id, target_idempotency_key, 'INBOUND', 'EMAIL', 'RECEIVED',
    target_customer_id, target_quote_id, target_request_id,
    target_provider_message_id, target_subject, target_body_text,
    target_in_reply_to, target_references_headers,
    coalesce(target_raw_headers, '{}'::jsonb),
    coalesce(target_received_at, now()),
    jsonb_build_object('provider', target_provider, 'from_email', target_from_email)
  )
  on conflict (organization_id, idempotency_key)
    where idempotency_key is not null
    do nothing
  returning messages.id into inserted_id;

  if inserted_id is not null then
    id := inserted_id;
    created := true;
    return next;
    return;
  end if;

  select messages.id into existing_id
  from public.messages
  where organization_id = target_organization_id
    and idempotency_key = target_idempotency_key;

  id := existing_id;
  created := false;
  return next;
  return;
end;
$$;

revoke all on function public.record_inbound_message(uuid, text, text, text, uuid, uuid, uuid, text, text, text, text, text[], jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_inbound_message(uuid, text, text, text, uuid, uuid, uuid, text, text, text, text, text[], jsonb, timestamptz)
  to service_role;

comment on function public.record_inbound_message(uuid, text, text, text, uuid, uuid, uuid, text, text, text, text, text[], jsonb, timestamptz) is
  'Replay-safe inbound message insert. service_role only (the webhook receiver runs as service_role). Two callbacks with the same (organization_id, idempotency_key) observe one row and one created=true.';

-- =========================================================================
-- 3. mark_quote_replied — service_role only, transition-enforced
-- =========================================================================
-- The `enforce_quote_state_transition` trigger short-circuits when
-- current_role <> 'authenticated', so a webhook running as service_role
-- would bypass the state-machine invariant. This RPC re-imposes the
-- valid transitions:
--   * SENT         -> REPLIED  ✓
--   * FOLLOWING_UP -> REPLIED  ✓
--   * NEEDS_HUMAN  -> REPLIED  ✓
--   * REPLIED (already)        → no-op returns false
--   * WON / LOST / EXPIRED / DRAFT → REJECT
create or replace function public.mark_quote_replied(
  target_organization_id uuid,
  target_quote_id        uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
  current_status text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'mark_quote_replied: only service_role may transition on inbound reply'
      using errcode = '42501';
  end if;

  select status into current_status
  from public.quotes
  where id = target_quote_id and organization_id = target_organization_id
  for update;

  if current_status is null then
    return false;
  end if;

  if current_status = 'REPLIED' then
    -- Already there — idempotent replay.
    return false;
  end if;

  if current_status not in ('SENT', 'FOLLOWING_UP', 'NEEDS_HUMAN') then
    raise exception 'mark_quote_replied: quote % cannot transition from % to REPLIED',
      target_quote_id, current_status
      using errcode = '22023';
  end if;

  update public.quotes
    set status = 'REPLIED',
        updated_at = now()
  where id = target_quote_id
    and organization_id = target_organization_id
    and status = current_status;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.mark_quote_replied(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.mark_quote_replied(uuid, uuid)
  to service_role;

comment on function public.mark_quote_replied(uuid, uuid) is
  'Transition quote to REPLIED on inbound reply match. service_role only. Enforces the same valid transitions the authenticated state-machine trigger enforces (SENT/FOLLOWING_UP/NEEDS_HUMAN -> REPLIED); the trigger itself no-ops for service_role so this RPC re-imposes the invariant. Returns true iff exactly one row transitioned.';
