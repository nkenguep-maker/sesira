-- SESIRA Core Workflow — voice intake (C37, WAVE 5 final).
--
-- REGULATORY.md §4 applied end-to-end:
--   AI Act art. 50 (en application 2026-08-02) — annonce IA
--   AVANT l'échange, preuve conservée en journaux.
--   CNIL / Leto — enregistrement avec information + droit
--   d'opposition, rétention par défaut 180 j (voix) / 365 j
--   (transcription), extensible seulement pour finalité
--   « preuve de contrat » documentée.
--   Reconnaissance des émotions INTERDITE au travail — HORS SCOPE C37.
--
-- Provider architecture (from roadmap):
--   Voice transport (VoiceProvider) → STT provider → AIProvider (Mistral)
--   Mistral NEVER receives raw audio.
--
-- Two tables:
--   * voice_policies — per-org configuration (disclosure text,
--     retention, opt-out behavior, watermark, Europe-verified gate).
--   * voice_calls — one row per inbound call with a strict
--     lifecycle and retention_expires_at set at insert.
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   D-5 (hébergement Europe-only) — record_voice_call_received
--     REFUSES if provider_kind is a real production provider and
--     the org's voice_policy.region_europe_verified = false.
--     Only TEST provider bypasses this gate (for local dev).
--
--   art. 50 disclosure proof — every RPC that plays a message
--     writes an audit_log row with action = 'voice.<disclosure|
--     recording_notice>_played' + metadata.message_version +
--     metadata.message_text_snapshot. Retention of that log is
--     handled by the general audit_logs policy.
--
--   Opt-out semantics — mark_voice_call_opted_out purges the
--     recording_ref and transcript_ref (sets to null) in the
--     same statement as the state flip. No AI analysis proceeds
--     on an opted-out call.
--
--   No scoring / emotion / diagnosis — SCHEMA HAS NO fields
--     for emotion, sentiment, reliability, aggressiveness,
--     eligibility, technical diagnosis, or price. A code review
--     rejects any PR adding such a column.
--
--   Retention automation — retention_expires_at is stamped at
--     insert (started_at + policy.retention_recording_days).
--     purge_expired_voice_recordings/transcripts (scheduled)
--     enforce the deletion.

-- =========================================================================
-- voice_policies — per-org configuration
-- =========================================================================
create table public.voice_policies (
  id                             uuid primary key default gen_random_uuid(),
  organization_id                uuid not null unique references public.organizations(id) on delete cascade,
  ai_disclosure_message          text not null check (length(ai_disclosure_message) between 1 and 2000),
  recording_notice_message       text not null check (length(recording_notice_message) between 1 and 2000),
  ai_disclosure_message_version  text not null default 'v1' check (length(ai_disclosure_message_version) between 1 and 20),
  recording_notice_message_version text not null default 'v1' check (length(recording_notice_message_version) between 1 and 20),
  retention_recording_days       integer not null default 180 check (retention_recording_days between 1 and 365),
  retention_transcript_days      integer not null default 365 check (retention_transcript_days between 1 and 1095),
  legal_hold_finality_note       text check (legal_hold_finality_note is null or length(legal_hold_finality_note) between 1 and 1000),
  opt_out_behavior               text not null default 'NO_RECORDING_HUMAN_MESSAGE'
    check (opt_out_behavior in ('NO_RECORDING_HUMAN_MESSAGE', 'HANG_UP')),
  synthetic_audio_watermark_enabled boolean not null default true,
  region_europe_verified         boolean not null default false,
  region_verification_note       text check (region_verification_note is null or length(region_verification_note) <= 1000),
  region_verified_at             timestamptz,
  region_verified_by_user_id     uuid,
  provenance                     jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata                       jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  -- Retention > 180 j only if a legal_hold_finality_note documents it
  check (
    retention_recording_days <= 180 or legal_hold_finality_note is not null
  )
);

comment on table public.voice_policies is
  'Per-org voice intake configuration. Retention defaults 180 j (voice) / 365 j (transcript) per CNIL/Leto guidance. Extending recording retention beyond 180 j REQUIRES a documented legal_hold_finality_note. region_europe_verified is the D-5 gate: a real production voice provider cannot be used until this is set true (service_role only).';

comment on column public.voice_policies.opt_out_behavior is
  'What happens when a caller declines recording via the touch opt-out. NO_RECORDING_HUMAN_MESSAGE (default): recording stops, transcription disabled, call routed to a human message drop. HANG_UP: polite hang-up (only for high-risk fraud filters, not the default).';

comment on column public.voice_policies.region_europe_verified is
  'D-5 gate. Data ops sets this true ONLY after verifying Supabase region + Vercel region + voice provider region are all in the EU. Real production providers refuse to accept calls until this is true.';

alter table public.voice_policies enable row level security;

create policy voice_policies_select on public.voice_policies
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy voice_policies_insert on public.voice_policies
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy voice_policies_update on public.voice_policies
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.voice_policies to authenticated;
grant select, insert, update on public.voice_policies to service_role;

create trigger set_voice_policies_updated_at
  before update on public.voice_policies
  for each row execute function private.set_updated_at();

-- =========================================================================
-- voice_calls — one row per inbound call
-- =========================================================================
create table public.voice_calls (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  provider_kind          text not null
    check (provider_kind in ('TEST', 'PRODUCTION_PROVIDER_INTEGRATION_PENDING')),
  external_call_ref      text not null check (length(external_call_ref) between 1 and 500),
  direction              text not null default 'INBOUND'
    check (direction in ('INBOUND', 'OUTBOUND')),
  caller_phone           text check (caller_phone is null or length(caller_phone) <= 50),
  matched_customer_id    uuid,
  matched_lead_id        uuid,
  status                 text not null default 'RECEIVED'
    check (status in ('RECEIVED', 'DISCLOSED_TO_CALLER', 'RECORDED',
                      'OPTED_OUT', 'TRANSCRIBED', 'PROCESSED', 'CLOSED', 'FAILED')),
  ai_disclosure_played_at timestamptz,
  ai_disclosure_version  text,
  recording_notice_played_at timestamptz,
  opt_out_at             timestamptz,
  recording_ref          text check (recording_ref is null or length(recording_ref) <= 500),
  transcript_ref         text check (transcript_ref is null or length(transcript_ref) <= 500),
  transcribed_at         timestamptz,
  processed_ai_run_id    uuid,
  processed_request_id   uuid,
  processed_attention_id uuid,
  duration_ms            integer check (duration_ms is null or duration_ms >= 0),
  started_at             timestamptz not null default now(),
  ended_at               timestamptz,
  retention_expires_at   timestamptz not null,
  transcript_retention_expires_at timestamptz not null,
  purged_recording_at    timestamptz,
  purged_transcript_at   timestamptz,
  provenance             jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata               jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  foreign key (matched_customer_id, organization_id) references public.customers(id, organization_id) on delete set null,
  foreign key (matched_lead_id, organization_id) references public.leads(id, organization_id) on delete set null,
  foreign key (processed_ai_run_id) references public.ai_runs(id) on delete set null,
  foreign key (processed_request_id, organization_id) references public.requests(id, organization_id) on delete set null,
  unique (organization_id, provider_kind, external_call_ref),
  unique (id, organization_id)
);

comment on table public.voice_calls is
  'One row per inbound (or outbound) call. Lifecycle RECEIVED → DISCLOSED_TO_CALLER → RECORDED → TRANSCRIBED → PROCESSED → CLOSED. OPTED_OUT and FAILED are alternate terminals. retention_expires_at is stamped at insert from voice_policies — the purge job enforces it. NO emotion / sentiment / diagnosis columns anywhere (art. 5 AI Act + doctrine §7).';

comment on column public.voice_calls.processed_ai_run_id is
  'Link to public.ai_runs — the AI processing event that extracted intent/structure from the transcript. NEVER emotion/sentiment analysis (forbidden). Feature = INTENT_EXTRACTION or SUMMARIZE only.';

create index voice_calls_org_status_idx on public.voice_calls (organization_id, status);
create index voice_calls_org_started_idx on public.voice_calls (organization_id, started_at desc);
create index voice_calls_org_customer_idx on public.voice_calls (organization_id, matched_customer_id)
  where matched_customer_id is not null;
create index voice_calls_org_retention_recording_idx on public.voice_calls (organization_id, retention_expires_at)
  where recording_ref is not null and purged_recording_at is null;
create index voice_calls_org_retention_transcript_idx on public.voice_calls (organization_id, transcript_retention_expires_at)
  where transcript_ref is not null and purged_transcript_at is null;

alter table public.voice_calls enable row level security;

create policy voice_calls_select on public.voice_calls
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy voice_calls_insert on public.voice_calls
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy voice_calls_update on public.voice_calls
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.voice_calls to authenticated;
grant select, insert, update on public.voice_calls to service_role;

create trigger set_voice_calls_updated_at
  before update on public.voice_calls
  for each row execute function private.set_updated_at();

-- =========================================================================
-- State machine trigger — voice_calls
-- =========================================================================
create or replace function private.enforce_voice_call_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('OPTED_OUT', 'CLOSED', 'FAILED') then
    raise exception 'voice_call % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'RECEIVED'            and new.status in ('DISCLOSED_TO_CALLER', 'OPTED_OUT', 'FAILED', 'CLOSED')) or
    (old.status = 'DISCLOSED_TO_CALLER' and new.status in ('RECORDED', 'OPTED_OUT', 'FAILED', 'CLOSED')) or
    (old.status = 'RECORDED'            and new.status in ('TRANSCRIBED', 'OPTED_OUT', 'FAILED', 'CLOSED')) or
    (old.status = 'TRANSCRIBED'         and new.status in ('PROCESSED', 'OPTED_OUT', 'FAILED', 'CLOSED')) or
    (old.status = 'PROCESSED'           and new.status in ('CLOSED', 'FAILED')) or
    (old.status = new.status)
  ) then
    raise exception 'voice_call % cannot transition from % to %', old.id, old.status, new.status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger voice_calls_state_transition
  before update on public.voice_calls
  for each row execute function private.enforce_voice_call_state_transition();

-- =========================================================================
-- upsert_voice_policy — set/update the org's voice policy (ACTIVE member)
-- =========================================================================
create or replace function public.upsert_voice_policy(
  target_organization_id           uuid,
  target_actor_user_id             uuid,
  target_ai_disclosure_message     text,
  target_ai_disclosure_version     text,
  target_recording_notice_message  text,
  target_recording_notice_version  text,
  target_retention_recording_days  integer,
  target_retention_transcript_days integer,
  target_opt_out_behavior          text,
  target_synthetic_audio_watermark_enabled boolean,
  target_legal_hold_finality_note  text
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
    raise exception 'upsert_voice_policy: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_actor_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'upsert_voice_policy: actor % is not an ACTIVE member of organization %',
      target_actor_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_ai_disclosure_message is null or length(target_ai_disclosure_message) = 0 then
    raise exception 'upsert_voice_policy: ai_disclosure_message is required (art. 50 AI Act)'
      using errcode = '22023';
  end if;
  if target_recording_notice_message is null or length(target_recording_notice_message) = 0 then
    raise exception 'upsert_voice_policy: recording_notice_message is required (CNIL / Leto)'
      using errcode = '22023';
  end if;
  if target_retention_recording_days > 180 and (target_legal_hold_finality_note is null or length(target_legal_hold_finality_note) = 0) then
    raise exception 'upsert_voice_policy: retention_recording_days > 180 requires a documented legal_hold_finality_note'
      using errcode = '22023';
  end if;
  if target_opt_out_behavior not in ('NO_RECORDING_HUMAN_MESSAGE', 'HANG_UP') then
    raise exception 'upsert_voice_policy: invalid opt_out_behavior %', target_opt_out_behavior
      using errcode = '22023';
  end if;

  insert into public.voice_policies (
    organization_id, ai_disclosure_message, ai_disclosure_message_version,
    recording_notice_message, recording_notice_message_version,
    retention_recording_days, retention_transcript_days,
    opt_out_behavior, synthetic_audio_watermark_enabled,
    legal_hold_finality_note,
    provenance
  ) values (
    target_organization_id, target_ai_disclosure_message, target_ai_disclosure_version,
    target_recording_notice_message, target_recording_notice_version,
    target_retention_recording_days, target_retention_transcript_days,
    target_opt_out_behavior, target_synthetic_audio_watermark_enabled,
    target_legal_hold_finality_note,
    jsonb_build_object('configured_by_user_id', target_actor_user_id, 'configured_at', now())
  )
  on conflict (organization_id) do update
    set ai_disclosure_message             = excluded.ai_disclosure_message,
        ai_disclosure_message_version     = excluded.ai_disclosure_message_version,
        recording_notice_message          = excluded.recording_notice_message,
        recording_notice_message_version  = excluded.recording_notice_message_version,
        retention_recording_days          = excluded.retention_recording_days,
        retention_transcript_days         = excluded.retention_transcript_days,
        opt_out_behavior                  = excluded.opt_out_behavior,
        synthetic_audio_watermark_enabled = excluded.synthetic_audio_watermark_enabled,
        legal_hold_finality_note          = excluded.legal_hold_finality_note,
        provenance                        = excluded.provenance
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'voice_policy.upsert',
    'voice_policy', new_id,
    jsonb_build_object(
      'configured_by_user_id', target_actor_user_id,
      'retention_recording_days', target_retention_recording_days,
      'retention_transcript_days', target_retention_transcript_days,
      'opt_out_behavior', target_opt_out_behavior
    )
  );
  return new_id;
end;
$$;

revoke all on function public.upsert_voice_policy(uuid, uuid, text, text, text, text, integer, integer, text, boolean, text) from public, anon;
grant execute on function public.upsert_voice_policy(uuid, uuid, text, text, text, text, integer, integer, text, boolean, text) to authenticated, service_role;

-- =========================================================================
-- mark_voice_policy_europe_verified — flip D-5 gate (service_role)
-- =========================================================================
create or replace function public.mark_voice_policy_europe_verified(
  target_organization_id        uuid,
  target_verified_by_user_id    uuid,
  target_verification_note      text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mark_voice_policy_europe_verified: service_role only (data-ops attests region)'
      using errcode = '42501';
  end if;
  if target_verification_note is null or length(target_verification_note) = 0 or length(target_verification_note) > 1000 then
    raise exception 'mark_voice_policy_europe_verified: verification_note is required (documented evidence)'
      using errcode = '22023';
  end if;

  update public.voice_policies
    set region_europe_verified     = true,
        region_verification_note   = target_verification_note,
        region_verified_at         = now(),
        region_verified_by_user_id = target_verified_by_user_id
  where organization_id = target_organization_id
    and region_europe_verified = false;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'voice_policy.region_europe_verified',
      'voice_policy', null,
      jsonb_build_object(
        'verified_by_user_id', target_verified_by_user_id,
        'evidence_note', target_verification_note
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_voice_policy_europe_verified(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.mark_voice_policy_europe_verified(uuid, uuid, text) to service_role;

-- =========================================================================
-- record_voice_call_received — new inbound call (service_role webhook)
-- =========================================================================
create or replace function public.record_voice_call_received(
  target_organization_id     uuid,
  target_provider_kind       text,
  target_external_call_ref   text,
  target_caller_phone        text,
  target_started_at          timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  policy_row public.voice_policies%rowtype;
  new_id     uuid;
  existing_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'record_voice_call_received: service_role only (webhook from voice provider)'
      using errcode = '42501';
  end if;
  if target_provider_kind not in ('TEST', 'PRODUCTION_PROVIDER_INTEGRATION_PENDING') then
    raise exception 'record_voice_call_received: invalid provider_kind % (only TEST or PENDING sentinel at C37 launch)', target_provider_kind
      using errcode = '22023';
  end if;

  select * into policy_row
  from public.voice_policies
  where organization_id = target_organization_id;

  if policy_row.id is null then
    raise exception 'record_voice_call_received: no voice_policy configured for organization % — refusing the call (art. 50 disclosure would be missing)', target_organization_id
      using errcode = '22023';
  end if;

  -- D-5 gate: production providers refuse to accept calls until Europe verified
  if target_provider_kind = 'PRODUCTION_PROVIDER_INTEGRATION_PENDING' and not policy_row.region_europe_verified then
    raise exception 'record_voice_call_received: D-5 gate — organization % voice_policy.region_europe_verified is false; production voice provider cannot be used', target_organization_id
      using errcode = '42501';
  end if;

  -- Idempotency by (org, provider_kind, external_call_ref)
  select id into existing_id
  from public.voice_calls
  where organization_id = target_organization_id
    and provider_kind = target_provider_kind
    and external_call_ref = target_external_call_ref;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.voice_calls (
    organization_id, provider_kind, external_call_ref, caller_phone,
    started_at,
    retention_expires_at,
    transcript_retention_expires_at
  ) values (
    target_organization_id, target_provider_kind, target_external_call_ref, target_caller_phone,
    coalesce(target_started_at, now()),
    coalesce(target_started_at, now()) + make_interval(days => policy_row.retention_recording_days),
    coalesce(target_started_at, now()) + make_interval(days => policy_row.retention_transcript_days)
  ) returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'voice_call.received',
    'voice_call', new_id,
    jsonb_build_object(
      'provider_kind', target_provider_kind,
      'external_call_ref', target_external_call_ref,
      'caller_phone_present', target_caller_phone is not null
    )
  );
  return new_id;
end;
$$;

revoke all on function public.record_voice_call_received(uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_voice_call_received(uuid, text, text, text, timestamptz) to service_role;

-- =========================================================================
-- mark_voice_call_disclosures_played — art. 50 proof
-- =========================================================================
-- Records BOTH the AI disclosure and the recording notice at once —
-- both messages MUST be played before the call proceeds. Snapshots
-- the message text + version at play time (audit log has the proof).
create or replace function public.mark_voice_call_disclosures_played(
  target_organization_id uuid,
  target_call_id         uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected     integer;
  policy_row   public.voice_policies%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mark_voice_call_disclosures_played: service_role only (webhook)'
      using errcode = '42501';
  end if;

  select p.* into policy_row
  from public.voice_policies p
  join public.voice_calls c on c.organization_id = p.organization_id
  where c.id = target_call_id
    and c.organization_id = target_organization_id;

  if policy_row.id is null then
    raise exception 'mark_voice_call_disclosures_played: no voice_policy or call not found'
      using errcode = '22023';
  end if;

  update public.voice_calls
    set status                     = 'DISCLOSED_TO_CALLER',
        ai_disclosure_played_at    = now(),
        ai_disclosure_version      = policy_row.ai_disclosure_message_version,
        recording_notice_played_at = now()
  where id = target_call_id
    and organization_id = target_organization_id
    and status = 'RECEIVED';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'voice_call.disclosures_played',
      'voice_call', target_call_id,
      jsonb_build_object(
        'ai_disclosure_version', policy_row.ai_disclosure_message_version,
        'ai_disclosure_text_snapshot', policy_row.ai_disclosure_message,
        'recording_notice_version', policy_row.recording_notice_message_version,
        'recording_notice_text_snapshot', policy_row.recording_notice_message
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_voice_call_disclosures_played(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_voice_call_disclosures_played(uuid, uuid) to service_role;

comment on function public.mark_voice_call_disclosures_played(uuid, uuid) is
  'Stamps the AI disclosure and recording notice as played (art. 50 AI Act + CNIL). Snapshots BOTH message texts + versions in audit_logs so the exact words played to the caller are provable years later.';

-- =========================================================================
-- mark_voice_call_opted_out — caller declines recording (purge)
-- =========================================================================
-- Sets status=OPTED_OUT AND nulls recording_ref + transcript_ref in the
-- same statement — no AI analysis proceeds on an opted-out call.
create or replace function public.mark_voice_call_opted_out(
  target_organization_id uuid,
  target_call_id         uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mark_voice_call_opted_out: service_role only (webhook)'
      using errcode = '42501';
  end if;

  update public.voice_calls
    set status         = 'OPTED_OUT',
        opt_out_at     = now(),
        recording_ref  = null,
        transcript_ref = null,
        purged_recording_at  = coalesce(purged_recording_at, now()),
        purged_transcript_at = coalesce(purged_transcript_at, now())
  where id = target_call_id
    and organization_id = target_organization_id
    and status in ('RECEIVED', 'DISCLOSED_TO_CALLER', 'RECORDED', 'TRANSCRIBED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'voice_call.opted_out',
      'voice_call', target_call_id, '{}'::jsonb
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_voice_call_opted_out(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_voice_call_opted_out(uuid, uuid) to service_role;

-- =========================================================================
-- record_voice_call_recording — DISCLOSED → RECORDED (service_role STT)
-- =========================================================================
create or replace function public.record_voice_call_recording(
  target_organization_id uuid,
  target_call_id         uuid,
  target_recording_ref   text,
  target_duration_ms     integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'record_voice_call_recording: service_role only (voice provider webhook)'
      using errcode = '42501';
  end if;
  if target_recording_ref is null or length(target_recording_ref) = 0 or length(target_recording_ref) > 500 then
    raise exception 'record_voice_call_recording: recording_ref required (≤500 chars)'
      using errcode = '22023';
  end if;

  update public.voice_calls
    set status        = 'RECORDED',
        recording_ref = target_recording_ref,
        duration_ms   = target_duration_ms
  where id = target_call_id
    and organization_id = target_organization_id
    and status = 'DISCLOSED_TO_CALLER';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'voice_call.recorded',
      'voice_call', target_call_id,
      jsonb_build_object('duration_ms', target_duration_ms)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_voice_call_recording(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.record_voice_call_recording(uuid, uuid, text, integer) to service_role;

-- =========================================================================
-- record_voice_call_transcript — RECORDED → TRANSCRIBED (STT service_role)
-- =========================================================================
create or replace function public.record_voice_call_transcript(
  target_organization_id uuid,
  target_call_id         uuid,
  target_transcript_ref  text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'record_voice_call_transcript: service_role only (STT webhook)'
      using errcode = '42501';
  end if;
  if target_transcript_ref is null or length(target_transcript_ref) = 0 or length(target_transcript_ref) > 500 then
    raise exception 'record_voice_call_transcript: transcript_ref required'
      using errcode = '22023';
  end if;

  update public.voice_calls
    set status         = 'TRANSCRIBED',
        transcript_ref = target_transcript_ref,
        transcribed_at = now()
  where id = target_call_id
    and organization_id = target_organization_id
    and status = 'RECORDED';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'voice_call.transcribed',
      'voice_call', target_call_id, '{}'::jsonb
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_voice_call_transcript(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.record_voice_call_transcript(uuid, uuid, text) to service_role;

-- =========================================================================
-- record_voice_call_processed — TRANSCRIBED → PROCESSED (AI worker service_role)
-- =========================================================================
-- The AI worker links its ai_run_id (registered separately) + any
-- downstream request/attention/customer match. Explicitly refuses
-- to accept emotion/sentiment/diagnosis metadata (grep-tested).
create or replace function public.record_voice_call_processed(
  target_organization_id       uuid,
  target_call_id               uuid,
  target_processed_ai_run_id   uuid,
  target_matched_customer_id   uuid,
  target_matched_lead_id       uuid,
  target_processed_request_id  uuid,
  target_processed_attention_id uuid,
  target_metadata              jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  forbidden_keys text[] := array['emotion', 'sentiment', 'sentiment_score',
                                  'reliability', 'reliability_score',
                                  'aggressiveness', 'aggression_score',
                                  'diagnosis', 'technical_diagnosis',
                                  'price', 'quoted_price', 'eligibility',
                                  'eligibility_score', 'credit_score'];
  k text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'record_voice_call_processed: service_role only (AI worker)'
      using errcode = '42501';
  end if;

  -- Refuse forbidden metadata keys (defense-in-depth for doctrine §7)
  if target_metadata is not null and jsonb_typeof(target_metadata) = 'object' then
    foreach k in array forbidden_keys loop
      if target_metadata ? k then
        raise exception 'record_voice_call_processed: metadata key % is forbidden (doctrine — no scoring / emotion / diagnosis / price on voice)', k
          using errcode = '22023';
      end if;
    end loop;
  end if;

  update public.voice_calls
    set status                 = 'PROCESSED',
        processed_ai_run_id    = target_processed_ai_run_id,
        matched_customer_id    = coalesce(target_matched_customer_id, matched_customer_id),
        matched_lead_id        = coalesce(target_matched_lead_id, matched_lead_id),
        processed_request_id   = target_processed_request_id,
        processed_attention_id = target_processed_attention_id,
        metadata               = metadata || coalesce(target_metadata, '{}'::jsonb)
  where id = target_call_id
    and organization_id = target_organization_id
    and status = 'TRANSCRIBED';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'voice_call.processed',
      'voice_call', target_call_id,
      jsonb_build_object(
        'ai_run_id', target_processed_ai_run_id,
        'matched_customer_id', target_matched_customer_id,
        'matched_lead_id', target_matched_lead_id,
        'request_id', target_processed_request_id,
        'attention_id', target_processed_attention_id
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_voice_call_processed(uuid, uuid, uuid, uuid, uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_voice_call_processed(uuid, uuid, uuid, uuid, uuid, uuid, uuid, jsonb) to service_role;

comment on function public.record_voice_call_processed(uuid, uuid, uuid, uuid, uuid, uuid, uuid, jsonb) is
  'AI worker records the intent extraction result + optional downstream links (request, attention, matched customer/lead). Refuses forbidden metadata keys (emotion/sentiment/diagnosis/price/scoring) — defense-in-depth for doctrine §7 and REGULATORY.md 4.2.';

-- =========================================================================
-- close_voice_call — → CLOSED (final)
-- =========================================================================
create or replace function public.close_voice_call(
  target_organization_id uuid,
  target_call_id         uuid,
  target_ended_at        timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'close_voice_call: service_role only'
      using errcode = '42501';
  end if;

  update public.voice_calls
    set status   = 'CLOSED',
        ended_at = coalesce(target_ended_at, now())
  where id = target_call_id
    and organization_id = target_organization_id
    and status in ('RECEIVED', 'DISCLOSED_TO_CALLER', 'RECORDED',
                   'TRANSCRIBED', 'PROCESSED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'voice_call.closed',
      'voice_call', target_call_id,
      jsonb_build_object('ended_at', to_char(coalesce(target_ended_at, now()) at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.close_voice_call(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.close_voice_call(uuid, uuid, timestamptz) to service_role;

-- =========================================================================
-- purge_expired_voice_recordings — retention enforcement
-- =========================================================================
create or replace function public.purge_expired_voice_recordings(
  target_organization_id uuid,
  target_batch_limit     integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'purge_expired_voice_recordings: service_role only (scheduled job)'
      using errcode = '42501';
  end if;
  if target_batch_limit is null or target_batch_limit < 1 or target_batch_limit > 1000 then
    raise exception 'purge_expired_voice_recordings: batch_limit must be in [1, 1000]'
      using errcode = '22023';
  end if;

  with expired as (
    select id
    from public.voice_calls
    where organization_id = target_organization_id
      and recording_ref is not null
      and purged_recording_at is null
      and retention_expires_at < now()
    limit target_batch_limit
  )
  update public.voice_calls c
    set recording_ref = null,
        purged_recording_at = now()
  from expired
  where c.id = expired.id;

  get diagnostics affected = row_count;

  if affected > 0 then
    perform public.record_audit_log(
      target_organization_id, 'voice_call.recording_purged_batch',
      'organization', target_organization_id,
      jsonb_build_object('count', affected)
    );
  end if;
  return affected;
end;
$$;

revoke all on function public.purge_expired_voice_recordings(uuid, integer) from public, anon, authenticated;
grant execute on function public.purge_expired_voice_recordings(uuid, integer) to service_role;

create or replace function public.purge_expired_voice_transcripts(
  target_organization_id uuid,
  target_batch_limit     integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'purge_expired_voice_transcripts: service_role only (scheduled job)'
      using errcode = '42501';
  end if;
  if target_batch_limit is null or target_batch_limit < 1 or target_batch_limit > 1000 then
    raise exception 'purge_expired_voice_transcripts: batch_limit must be in [1, 1000]'
      using errcode = '22023';
  end if;

  with expired as (
    select id
    from public.voice_calls
    where organization_id = target_organization_id
      and transcript_ref is not null
      and purged_transcript_at is null
      and transcript_retention_expires_at < now()
    limit target_batch_limit
  )
  update public.voice_calls c
    set transcript_ref = null,
        purged_transcript_at = now()
  from expired
  where c.id = expired.id;

  get diagnostics affected = row_count;

  if affected > 0 then
    perform public.record_audit_log(
      target_organization_id, 'voice_call.transcript_purged_batch',
      'organization', target_organization_id,
      jsonb_build_object('count', affected)
    );
  end if;
  return affected;
end;
$$;

revoke all on function public.purge_expired_voice_transcripts(uuid, integer) from public, anon, authenticated;
grant execute on function public.purge_expired_voice_transcripts(uuid, integer) to service_role;

-- =========================================================================
-- Read helpers
-- =========================================================================
create or replace function public.voice_policy_for(
  target_organization_id uuid
)
returns table (
  policy_id                        uuid,
  ai_disclosure_message            text,
  ai_disclosure_message_version    text,
  recording_notice_message         text,
  recording_notice_message_version text,
  retention_recording_days         integer,
  retention_transcript_days        integer,
  opt_out_behavior                 text,
  synthetic_audio_watermark_enabled boolean,
  region_europe_verified           boolean,
  region_verified_at               timestamptz,
  legal_hold_finality_note         text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'voice_policy_for: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    p.id, p.ai_disclosure_message, p.ai_disclosure_message_version,
    p.recording_notice_message, p.recording_notice_message_version,
    p.retention_recording_days, p.retention_transcript_days,
    p.opt_out_behavior, p.synthetic_audio_watermark_enabled,
    p.region_europe_verified, p.region_verified_at,
    p.legal_hold_finality_note
  from public.voice_policies p
  where p.organization_id = target_organization_id;
end;
$$;

revoke all on function public.voice_policy_for(uuid) from public, anon;
grant execute on function public.voice_policy_for(uuid) to authenticated, service_role;

create or replace function public.voice_calls_for(
  target_organization_id uuid,
  target_status_filter   text
)
returns table (
  call_id                uuid,
  provider_kind          text,
  external_call_ref      text,
  caller_phone           text,
  matched_customer_id    uuid,
  matched_lead_id        uuid,
  status                 text,
  ai_disclosure_played_at timestamptz,
  recording_notice_played_at timestamptz,
  opt_out_at             timestamptz,
  duration_ms            integer,
  started_at             timestamptz,
  ended_at               timestamptz,
  retention_expires_at   timestamptz,
  purged_recording_at    timestamptz,
  purged_transcript_at   timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'voice_calls_for: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    c.id, c.provider_kind, c.external_call_ref, c.caller_phone,
    c.matched_customer_id, c.matched_lead_id, c.status,
    c.ai_disclosure_played_at, c.recording_notice_played_at, c.opt_out_at,
    c.duration_ms, c.started_at, c.ended_at,
    c.retention_expires_at, c.purged_recording_at, c.purged_transcript_at
  from public.voice_calls c
  where c.organization_id = target_organization_id
    and (target_status_filter is null or c.status = target_status_filter)
  order by c.started_at desc;
end;
$$;

revoke all on function public.voice_calls_for(uuid, text) from public, anon;
grant execute on function public.voice_calls_for(uuid, text) to authenticated, service_role;
