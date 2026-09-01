-- SESIRA Core Workflow — durable workflow idempotency (P0)
--
-- Extends the (organization_id, idempotency_key) unique invariant already
-- present on public.automation_runs to every surface the Core workflow
-- can create as a side effect:
--
--   * public.events              — a durable business event; a replay
--                                  must never emit a duplicate row.
--   * public.attention_items     — an Attention derived from a workflow
--                                  decision (a quote reply, a stuck run,
--                                  a complaint) must not duplicate on
--                                  replay.
--   * public.provider_delivery_receipts (new)
--                                — provider callbacks (email delivered,
--                                  webhook receipt) are the canonical
--                                  proof of an external effect. The
--                                  provider's own event id is the stable
--                                  identity; two receipts with the same
--                                  (provider, provider_event_id) for the
--                                  same org must resolve to one row.
--
-- The idempotency key is NULLABLE on events / attention_items because
-- some rows have no stable operational identity (manual attention items
-- created by a user, ad-hoc events from an admin action). The uniqueness
-- constraint is therefore a *partial* index that only applies to keys
-- that are set — a NULL key is always allowed.
--
-- Rules encoded here and enforced by the TS `idempotency` utility:
--
--   * Never dedupe on mutable business values (customer email, quote
--     amount, message text, title). The key must be a function of
--     stable operational identifiers: an entity id, an external
--     provider event id, a workflow decision coordinate
--     (quote_followup:{quote_id}:step:{n}).
--   * Failed validation must not consume a valid business key — the
--     TS caller computes the key AFTER validating input, so a rejected
--     payload never touches the DB and never burns the key.
--   * A replay observes the original result: the helper RPCs return
--     the pre-existing row id, so the caller can distinguish "created"
--     from "already existed" without a second read.
--
-- Not encoded here (documented for callers):
--   * The TS key builders live in src/lib/idempotency/keys.ts.
--   * The replay-safe insert helpers live in src/lib/idempotency/store.ts.

-- =========================================================================
-- 1. Idempotency key on public.events
-- =========================================================================
alter table public.events
  add column idempotency_key text;

comment on column public.events.idempotency_key is
  'Stable operational identity for this event. NULL for events with no natural key (ad-hoc / manual). Enforced unique per organization via events_idempotency_key_idx when set. Must never be derived from mutable business values.';

create unique index events_idempotency_key_idx
  on public.events (organization_id, idempotency_key)
  where idempotency_key is not null;

-- =========================================================================
-- 2. Idempotency key on public.attention_items
-- =========================================================================
alter table public.attention_items
  add column idempotency_key text;

comment on column public.attention_items.idempotency_key is
  'Stable operational identity for this attention item. NULL for manual items created by a user via the Attention inbox. Enforced unique per organization via attention_items_idempotency_key_idx when set.';

create unique index attention_items_idempotency_key_idx
  on public.attention_items (organization_id, idempotency_key)
  where idempotency_key is not null;

-- =========================================================================
-- 3. Provider delivery receipts — external effect identity table
-- =========================================================================
-- One row per external provider callback (email delivered, webhook
-- receipt, SMS status). The (provider, provider_event_id) pair is the
-- stable identity supplied by the provider — a retry from the provider
-- with the same event id resolves to the same row.
--
-- `related_entity_type` / `related_entity_id` are optional back-references
-- to the domain object the receipt is about (a message, a quote, a run).
-- They are NOT part of the identity — provider identity is authoritative.
create table public.provider_delivery_receipts (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  provider              text not null,
  provider_event_id     text not null,
  event_type            text not null,
  related_entity_type   text,
  related_entity_id     uuid,
  payload               jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  received_at           timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  unique (organization_id, provider, provider_event_id)
);

comment on table public.provider_delivery_receipts is
  'External provider delivery callbacks. (organization_id, provider, provider_event_id) is the stable identity — a retried callback resolves to the same row via ON CONFLICT DO NOTHING.';

create index provider_delivery_receipts_related_entity_idx
  on public.provider_delivery_receipts (organization_id, related_entity_type, related_entity_id)
  where related_entity_id is not null;

alter table public.provider_delivery_receipts enable row level security;

create policy tenant_select on public.provider_delivery_receipts
  for select to authenticated
  using (private.is_organization_member(organization_id));

-- Writes are only performed by service_role (the webhook receiver runs
-- as service_role). Tenants may read receipts scoped to their org but
-- cannot forge them.
grant select on public.provider_delivery_receipts to authenticated;
grant select, insert on public.provider_delivery_receipts to service_role;

-- =========================================================================
-- 4. Replay-safe insert helpers
-- =========================================================================
-- Each helper is SECURITY DEFINER so it can bypass tenant RLS while
-- enforcing membership on the caller. Semantics:
--   * If a row with (organization_id, idempotency_key) already exists
--     → return its id, `created=false`. No side effect.
--   * Otherwise insert the new row → return its id, `created=true`.
-- The caller distinguishes the two via the `created` column, so a
-- replay can observe the original result without a second query.
--
-- The write happens in a single INSERT ... ON CONFLICT DO NOTHING
-- RETURNING id; when the conflict fires we resolve the id via a
-- SELECT scoped to the same (organization_id, idempotency_key).

create or replace function public.insert_event_once(
  target_organization_id uuid,
  target_idempotency_key text,
  target_type            text,
  target_source          text,
  target_entity_type     text default null,
  target_entity_id       uuid default null,
  target_payload         jsonb default '{}'::jsonb
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
    raise exception 'insert_event_once: idempotency_key is required'
      using errcode = '22023';
  end if;
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'insert_event_once: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  insert into public.events (
    organization_id, idempotency_key, type, source,
    entity_type, entity_id, payload
  )
  values (
    target_organization_id, target_idempotency_key, target_type, target_source,
    target_entity_type, target_entity_id, coalesce(target_payload, '{}'::jsonb)
  )
  on conflict (organization_id, idempotency_key)
    where idempotency_key is not null
    do nothing
  returning events.id into inserted_id;

  if inserted_id is not null then
    id := inserted_id;
    created := true;
    return next;
    return;
  end if;

  select events.id into existing_id
  from public.events
  where organization_id = target_organization_id
    and idempotency_key = target_idempotency_key;

  id := existing_id;
  created := false;
  return next;
  return;
end;
$$;

revoke all on function public.insert_event_once(uuid, text, text, text, text, uuid, jsonb)
  from public, anon;
grant execute on function public.insert_event_once(uuid, text, text, text, text, uuid, jsonb)
  to authenticated, service_role;

comment on function public.insert_event_once(uuid, text, text, text, text, uuid, jsonb) is
  'Replay-safe event insert. Returns the row id and a `created` flag. Two concurrent callers with the same (organization_id, idempotency_key) observe one row and one `created=true`. Never dedupes on payload.';

create or replace function public.insert_attention_once(
  target_organization_id uuid,
  target_idempotency_key text,
  target_category        text,
  target_reason          text,
  target_title           text,
  target_priority        text default 'NORMAL',
  target_entity_type     text default null,
  target_entity_id       uuid default null,
  target_explanation     text default null,
  target_suggested_action text default null,
  target_assigned_user_id uuid default null,
  target_due_at          timestamptz default null,
  target_metadata        jsonb default '{}'::jsonb
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
    raise exception 'insert_attention_once: idempotency_key is required'
      using errcode = '22023';
  end if;
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'insert_attention_once: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  insert into public.attention_items (
    organization_id, idempotency_key, category, reason, title, priority,
    entity_type, entity_id, explanation, suggested_action,
    assigned_user_id, due_at, metadata
  )
  values (
    target_organization_id, target_idempotency_key, target_category,
    target_reason, target_title, target_priority,
    target_entity_type, target_entity_id, target_explanation,
    target_suggested_action, target_assigned_user_id, target_due_at,
    coalesce(target_metadata, '{}'::jsonb)
  )
  on conflict (organization_id, idempotency_key)
    where idempotency_key is not null
    do nothing
  returning attention_items.id into inserted_id;

  if inserted_id is not null then
    id := inserted_id;
    created := true;
    return next;
    return;
  end if;

  select attention_items.id into existing_id
  from public.attention_items
  where organization_id = target_organization_id
    and idempotency_key = target_idempotency_key;

  id := existing_id;
  created := false;
  return next;
  return;
end;
$$;

revoke all on function public.insert_attention_once(
  uuid, text, text, text, text, text, text, uuid, text, text, uuid, timestamptz, jsonb
) from public, anon;
grant execute on function public.insert_attention_once(
  uuid, text, text, text, text, text, text, uuid, text, text, uuid, timestamptz, jsonb
) to authenticated, service_role;

comment on function public.insert_attention_once(
  uuid, text, text, text, text, text, text, uuid, text, text, uuid, timestamptz, jsonb
) is
  'Replay-safe attention insert. Returns the row id and a `created` flag. Two concurrent callers with the same (organization_id, idempotency_key) observe one row. Never dedupes on title / explanation.';

-- Provider delivery receipts: single helper, callable only by
-- service_role (webhook receivers). Tenant users cannot forge a receipt.
create or replace function public.record_provider_delivery(
  target_organization_id     uuid,
  target_provider            text,
  target_provider_event_id   text,
  target_event_type          text,
  target_related_entity_type text default null,
  target_related_entity_id   uuid default null,
  target_payload             jsonb default '{}'::jsonb,
  target_received_at         timestamptz default null
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
  if target_provider is null or length(target_provider) = 0 then
    raise exception 'record_provider_delivery: provider is required'
      using errcode = '22023';
  end if;
  if target_provider_event_id is null or length(target_provider_event_id) = 0 then
    raise exception 'record_provider_delivery: provider_event_id is required'
      using errcode = '22023';
  end if;
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'record_provider_delivery: only service_role may record receipts'
      using errcode = '42501';
  end if;

  insert into public.provider_delivery_receipts (
    organization_id, provider, provider_event_id, event_type,
    related_entity_type, related_entity_id, payload, received_at
  )
  values (
    target_organization_id, target_provider, target_provider_event_id,
    target_event_type, target_related_entity_type, target_related_entity_id,
    coalesce(target_payload, '{}'::jsonb),
    coalesce(target_received_at, now())
  )
  on conflict (organization_id, provider, provider_event_id) do nothing
  returning provider_delivery_receipts.id into inserted_id;

  if inserted_id is not null then
    id := inserted_id;
    created := true;
    return next;
    return;
  end if;

  select provider_delivery_receipts.id into existing_id
  from public.provider_delivery_receipts
  where organization_id = target_organization_id
    and provider = target_provider
    and provider_event_id = target_provider_event_id;

  id := existing_id;
  created := false;
  return next;
  return;
end;
$$;

revoke all on function public.record_provider_delivery(
  uuid, text, text, text, text, uuid, jsonb, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_provider_delivery(
  uuid, text, text, text, text, uuid, jsonb, timestamptz
) to service_role;

comment on function public.record_provider_delivery(
  uuid, text, text, text, text, uuid, jsonb, timestamptz
) is
  'Replay-safe provider receipt insert. Restricted to service_role. Uses (organization_id, provider, provider_event_id) as the durable identity — never dedupes on payload.';
