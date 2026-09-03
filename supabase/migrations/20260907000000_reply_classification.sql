-- SESIRA Core Workflow — inbound reply classification (C11).
--
-- C11 introduces the *structured reply classification boundary*. An
-- inbound message arrives via the C10 webhook; a classifier (LLM)
-- reads its subject and body and emits a typed intent + confidence.
-- The result is persisted TWICE:
--
--   1. Full audit trail on `public.ai_runs` (feature=`reply_classification`,
--      provider, model, prompt_version, tokens, cost, latency, output).
--   2. Denormalized quick-read on `public.messages`: `intent`,
--      `confidence`, `classified_at`.
--
-- DOCTRINE INVARIANTS (enforced structurally where possible):
--
--   * AI confidence is NEVER an authorization. The classification
--     result is a signal for the Attention operator, not a trigger
--     for an autonomous action. Sensitive decisions (accepting a
--     price objection, escalating a complaint) remain human.
--
--   * `classified_at` is a marker so the classifier does not re-run
--     against the same message. A caller may re-classify by NULLing
--     it out (an operational-console action later); the code path
--     does not do it implicitly.
--
--   * `ai_runs.idempotency_key` (new) is a partial unique per
--     (organization_id, idempotency_key). The key is built from the
--     stable message id + prompt_version so a redeploy that bumps the
--     prompt version legitimately re-classifies, while a webhook retry
--     collapses to the same run.

-- =========================================================================
-- 1. messages.classified_at
-- =========================================================================
alter table public.messages
  add column classified_at timestamptz;

comment on column public.messages.classified_at is
  'When the reply classifier last wrote intent/confidence on this row. NULL means the row is either not a candidate (outbound) or awaiting classification. Never rewritten silently — a re-classification path must explicitly NULL it out first.';

create index messages_pending_classification_idx
  on public.messages (organization_id, received_at)
  where direction = 'INBOUND' and classified_at is null;

-- =========================================================================
-- 2. ai_runs.idempotency_key + partial unique
-- =========================================================================
alter table public.ai_runs
  add column idempotency_key text;

comment on column public.ai_runs.idempotency_key is
  'Stable operational identity for this AI invocation. Built by src/lib/idempotency/keys.ts:aiRunKey(feature, entityId, promptVersion). NULL for legacy manual invocations; C11 classifier always sets a key so a webhook retry that reaches the ai layer twice observes one row.';

create unique index ai_runs_idempotency_key_idx
  on public.ai_runs (organization_id, idempotency_key)
  where idempotency_key is not null;

-- =========================================================================
-- 3. insert_ai_run_once — replay-safe ai_runs insert
-- =========================================================================
create or replace function public.insert_ai_run_once(
  target_organization_id uuid,
  target_idempotency_key text,
  target_feature         text,
  target_entity_type     text,
  target_entity_id       uuid,
  target_provider        text,
  target_model           text,
  target_prompt_version  text,
  target_input_summary   jsonb,
  target_output          jsonb,
  target_confidence      numeric,
  target_action          text,
  target_status          text,
  target_latency_ms      integer,
  target_input_tokens    integer,
  target_output_tokens   integer,
  target_estimated_cost  numeric,
  target_error           text
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
    raise exception 'insert_ai_run_once: idempotency_key is required'
      using errcode = '22023';
  end if;
  if target_status not in ('SUCCEEDED', 'FAILED', 'REJECTED') then
    raise exception 'insert_ai_run_once: status must be SUCCEEDED|FAILED|REJECTED (got %)', target_status
      using errcode = '22023';
  end if;
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'insert_ai_run_once: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  insert into public.ai_runs (
    organization_id, idempotency_key, feature, entity_type, entity_id,
    provider, model, prompt_version, input_summary, output,
    confidence, action, status, latency_ms,
    input_tokens, output_tokens, estimated_cost, error
  )
  values (
    target_organization_id, target_idempotency_key, target_feature,
    target_entity_type, target_entity_id,
    target_provider, target_model, target_prompt_version,
    coalesce(target_input_summary, '{}'::jsonb), target_output,
    target_confidence, target_action, target_status, target_latency_ms,
    target_input_tokens, target_output_tokens, target_estimated_cost,
    target_error
  )
  on conflict (organization_id, idempotency_key)
    where idempotency_key is not null
    do nothing
  returning ai_runs.id into inserted_id;

  if inserted_id is not null then
    id := inserted_id;
    created := true;
    return next;
    return;
  end if;

  select ai_runs.id into existing_id
  from public.ai_runs
  where organization_id = target_organization_id
    and idempotency_key = target_idempotency_key;

  id := existing_id;
  created := false;
  return next;
  return;
end;
$$;

revoke all on function public.insert_ai_run_once(uuid, text, text, text, uuid, text, text, text, jsonb, jsonb, numeric, text, text, integer, integer, integer, numeric, text)
  from public, anon;
grant execute on function public.insert_ai_run_once(uuid, text, text, text, uuid, text, text, text, jsonb, jsonb, numeric, text, text, integer, integer, integer, numeric, text)
  to authenticated, service_role;

comment on function public.insert_ai_run_once(uuid, text, text, text, uuid, text, text, text, jsonb, jsonb, numeric, text, text, integer, integer, integer, numeric, text) is
  'Replay-safe ai_runs insert. Two callers with the same (organization_id, idempotency_key) observe one row and one created=true. Enforces status enum and idempotency_key non-empty.';

-- =========================================================================
-- 4. record_message_classification — service_role only
-- =========================================================================
-- The classifier writes to `public.messages` denorm columns AFTER
-- inserting the ai_run. This RPC does the two-column atomic update
-- and refuses to touch a message that:
--   * belongs to a different organization,
--   * is not INBOUND,
--   * is already classified (classified_at is not null) — the caller
--     must first re-arm the row by NULLing classified_at through an
--     explicit ops action.
create or replace function public.record_message_classification(
  target_organization_id uuid,
  target_message_id      uuid,
  target_intent          text,
  target_confidence      numeric
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if target_intent is null or length(target_intent) = 0 or length(target_intent) > 64 then
    raise exception 'record_message_classification: intent must be a non-empty string <= 64 chars'
      using errcode = '22023';
  end if;
  if target_confidence is null or target_confidence < 0 or target_confidence > 1 then
    raise exception 'record_message_classification: confidence must be in [0, 1]'
      using errcode = '22023';
  end if;
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'record_message_classification: only service_role may record classifications'
      using errcode = '42501';
  end if;

  update public.messages
    set intent = target_intent,
        confidence = target_confidence,
        classified_at = now(),
        updated_at = now()
  where id = target_message_id
    and organization_id = target_organization_id
    and direction = 'INBOUND'
    and classified_at is null;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.record_message_classification(uuid, uuid, text, numeric)
  from public, anon, authenticated;
grant execute on function public.record_message_classification(uuid, uuid, text, numeric)
  to service_role;

comment on function public.record_message_classification(uuid, uuid, text, numeric) is
  'Denormalize the classifier output on the messages row. service_role only. Idempotent: returns false if the row is already classified (a caller who wants to re-classify must first NULL out classified_at via an ops action).';
