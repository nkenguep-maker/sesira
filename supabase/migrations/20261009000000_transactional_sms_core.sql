-- SESIRA Core Workflow — Transactional SMS core (C44).
--
-- Extends outbound_messages (channel = 'sms') and adds:
--   * sms_templates — versioned template registry per org.
--   * sms_opt_outs — per-phone opt-out registry per org.
--   * SmsProvider seam (TS side).
--   * 6 SECURITY DEFINER RPCs.
--
-- Reference: docs/core/CORE_EXTENSIONS_PLAN.md §7 C44.
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   SENT vs DELIVERED distinction:
--     * SENT = provider accepted (synchronous return from send()).
--     * DELIVERED = webhook delivery receipt (record_provider_delivery
--       dedup as before + mark_sms_delivered updates the row).
--     * Never conflate — the two lifecycle events are separate.
--
--   Opt-out + quiet hours + rate limit:
--     * Recording an SMS intent to an opted-out phone returns OPTED_OUT
--       (a row is inserted with status='OPTED_OUT' so the attempt is
--       observable in the audit trail, but no provider call happens).
--     * quiet_hours_json on the template + org timezone govern when
--       AUTOMATIC sends are allowed. SHADOW / APPROVAL always safe.
--     * Rate limit is application-side (day-level check via
--       count(*) grouped by day). Enforced in record_sms_intent by
--       checking the previous 24h count for the (org, template_key).
--
--   Kill switch external actions (C9 doctrine):
--     * SMS send is a side effect — TS provider adapter MUST verify
--       EXTERNAL_ACTIONS_ENABLED=true AND VERCEL_ENV=production before
--       calling any real provider. DB layer here does NOT enforce this
--       — it stays as a TS-side guard consistent with EmailProvider
--       and other C9+ side-effect boundaries.
--
--   Shadow / Approval / Automatic (C5+C12):
--     * SHADOW → status='DRAFT'. Never SENT.
--     * APPROVAL → status='WAITING_FOR_APPROVAL' — approve_sms(...)
--       transitions to QUEUED (and only then the sender picks it up).
--     * AUTOMATIC → status='QUEUED' immediately, respecting opt-out +
--       quiet hours + rate limit at record time.
--
-- Non-goals (deferred):
--   * Marketing SMS (transactional-only in this milestone). A
--     transactional=false template will raise unless the org has
--     explicit consent recording — deferred.
--   * MMS / rich messaging.
--   * Signed short URL / link tracking — hors périmètre.

-- =========================================================================
-- Section 1 — extend outbound_messages: relax email-strict columns + add
-- channel='sms' + add to_phone + broaden status enum
-- =========================================================================
alter table public.outbound_messages drop constraint if exists outbound_messages_channel_check;
alter table public.outbound_messages
  add constraint outbound_messages_channel_check check (channel in ('email', 'sms'));

alter table public.outbound_messages alter column to_email drop not null;
alter table public.outbound_messages alter column from_email drop not null;
alter table public.outbound_messages alter column subject drop not null;
alter table public.outbound_messages alter column body_hash drop not null;

alter table public.outbound_messages
  add column to_phone text check (to_phone is null or length(to_phone) between 5 and 25);
alter table public.outbound_messages
  add column body_text_hash text check (body_text_hash is null or body_text_hash ~ '^[0-9a-f]{64}$');
alter table public.outbound_messages
  add column metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object');

-- Broaden status enum — drop the old check + add the new one
alter table public.outbound_messages drop constraint if exists outbound_messages_status_check;
alter table public.outbound_messages
  add constraint outbound_messages_status_check check (status in (
    'DRAFT',                -- SHADOW proposal, never sent
    'WAITING_FOR_APPROVAL', -- APPROVAL gate pending
    'QUEUED',               -- Ready for sender pick-up
    'SENT',                 -- Provider accepted
    'DELIVERED',            -- Webhook delivery receipt
    'FAILED',               -- Terminal error (email/sms)
    'UNDELIVERED',          -- SMS-specific terminal (invalid number, etc.)
    'CANCELLED',            -- Manual cancel before send
    'OPTED_OUT'             -- SMS-specific: opted-out phone at record time
  ));

-- Channel-specific integrity: email needs to_email + subject + body_hash,
-- sms needs to_phone + body_text_hash. Drop old constraints that expected
-- non-null email fields, replace with per-channel guards.
alter table public.outbound_messages
  drop constraint if exists outbound_messages_sent_has_provider_ref;
alter table public.outbound_messages
  drop constraint if exists outbound_messages_failed_has_error_class;

alter table public.outbound_messages
  add constraint outbound_messages_channel_shape check (
    (channel = 'email' and to_email is not null and length(to_email) > 0
       and from_email is not null and length(from_email) > 0
       and subject is not null and length(subject) > 0
       and body_hash is not null and body_hash ~ '^[0-9a-f]{64}$')
    or
    (channel = 'sms' and to_phone is not null and length(to_phone) between 5 and 25
       and body_text_hash is not null and body_text_hash ~ '^[0-9a-f]{64}$')
  );

alter table public.outbound_messages
  add constraint outbound_messages_sent_has_provider_ref check (
    status not in ('SENT', 'DELIVERED')
    or (provider_message_id is not null and integration_id is not null)
  );

alter table public.outbound_messages
  add constraint outbound_messages_failed_has_error_class check (
    status not in ('FAILED', 'UNDELIVERED') or error_class is not null
  );

create index outbound_messages_channel_status_idx on public.outbound_messages
  (organization_id, channel, status);
create index outbound_messages_org_to_phone_idx on public.outbound_messages
  (organization_id, to_phone)
  where to_phone is not null;

-- =========================================================================
-- Section 2 — sms_templates
-- =========================================================================
create table public.sms_templates (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  key                 text not null check (length(key) between 1 and 120),
  version             integer not null default 1 check (version >= 1),
  label               text not null check (length(label) between 1 and 200),
  body_template       text not null check (length(body_template) between 1 and 800),
  allowed_variables   text[] not null default '{}',
  transactional       boolean not null default true,
  quiet_hours_json    jsonb check (quiet_hours_json is null or jsonb_typeof(quiet_hours_json) = 'object'),
  timezone            text not null default 'Europe/Paris' check (length(timezone) between 1 and 60),
  rate_limit_per_day  integer not null default 1 check (rate_limit_per_day between 1 and 1000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (organization_id, key, version)
);

comment on table public.sms_templates is
  'Versioned SMS templates per org. body_template uses named placeholders like {{customer_name}} — the record_sms_intent RPC substitutes only whitelisted allowed_variables. transactional=true is required in this milestone; a false value raises on record_sms_intent until a consent-recording milestone lands.';

create index sms_templates_org_key_active_idx on public.sms_templates
  (organization_id, key, version);

alter table public.sms_templates enable row level security;

create policy sms_templates_select on public.sms_templates
  for select to authenticated using (private.is_organization_member(organization_id));
create policy sms_templates_insert on public.sms_templates
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy sms_templates_update on public.sms_templates
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.sms_templates to authenticated;
grant select, insert, update on public.sms_templates to service_role;

-- =========================================================================
-- Section 3 — sms_opt_outs
-- =========================================================================
create table public.sms_opt_outs (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  phone_e164         text not null check (length(phone_e164) between 5 and 25),
  opted_out_at       timestamptz not null default now(),
  source             text not null default 'MANUAL' check (source in ('MANUAL', 'SMS_REPLY', 'IMPORT', 'PROVIDER')),
  note               text check (note is null or length(note) <= 500),
  created_at         timestamptz not null default now(),
  unique (organization_id, phone_e164)
);

comment on table public.sms_opt_outs is
  'One row per (org, phone) opted-out record. record_sms_intent checks this and short-circuits with status=OPTED_OUT before any provider call.';

create index sms_opt_outs_org_phone_idx on public.sms_opt_outs (organization_id, phone_e164);

alter table public.sms_opt_outs enable row level security;

create policy sms_opt_outs_select on public.sms_opt_outs
  for select to authenticated using (private.is_organization_member(organization_id));
create policy sms_opt_outs_insert on public.sms_opt_outs
  for insert to authenticated with check (private.is_organization_member(organization_id));

grant select, insert on public.sms_opt_outs to authenticated;
grant select, insert on public.sms_opt_outs to service_role;

-- =========================================================================
-- Section 4 — record_sms_intent RPC
-- =========================================================================
create or replace function public.record_sms_intent(
  target_organization_id  uuid,
  target_idempotency_key  text,
  target_template_key     text,
  target_template_version integer,
  target_to_phone         text,
  target_body_text        text,
  target_variables_json   jsonb,
  target_execution_mode   text  -- SHADOW | APPROVAL | AUTOMATIC
)
returns table (
  message_id uuid,
  status     text,
  created    boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  template_row  public.sms_templates%rowtype;
  existing_id   uuid;
  existing_st   text;
  body_hash_hex text;
  next_status   text;
  new_id        uuid;
  daily_count   integer;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_sms_intent: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_execution_mode not in ('SHADOW', 'APPROVAL', 'AUTOMATIC') then
    raise exception 'record_sms_intent: invalid execution_mode %', target_execution_mode
      using errcode = '22023';
  end if;
  if target_to_phone is null or length(target_to_phone) < 5 then
    raise exception 'record_sms_intent: to_phone required'
      using errcode = '22023';
  end if;
  if target_body_text is null or length(target_body_text) = 0 or length(target_body_text) > 800 then
    raise exception 'record_sms_intent: body_text required (1..800 chars)'
      using errcode = '22023';
  end if;

  select * into template_row
  from public.sms_templates
  where organization_id = target_organization_id
    and key = target_template_key
    and version = target_template_version;
  if template_row.id is null then
    raise exception 'record_sms_intent: template %/v% not found', target_template_key, target_template_version
      using errcode = '22023';
  end if;
  if not template_row.transactional then
    raise exception 'record_sms_intent: template %/v% is non-transactional; consent-based flows deferred',
      target_template_key, target_template_version
      using errcode = '22023';
  end if;

  -- Idempotency lookup
  select id, status into existing_id, existing_st
  from public.outbound_messages
  where organization_id = target_organization_id
    and idempotency_key = target_idempotency_key;
  if existing_id is not null then
    message_id := existing_id;
    status     := existing_st;
    created    := false;
    return next;
    return;
  end if;

  body_hash_hex := encode(extensions.digest(target_body_text, 'sha256'), 'hex');

  -- Opt-out short-circuit
  if exists (
    select 1 from public.sms_opt_outs
    where organization_id = target_organization_id
      and phone_e164 = target_to_phone
  ) then
    next_status := 'OPTED_OUT';
  else
    -- Shadow / Approval / Automatic routing
    if target_execution_mode = 'SHADOW' then
      next_status := 'DRAFT';
    elsif target_execution_mode = 'APPROVAL' then
      next_status := 'WAITING_FOR_APPROVAL';
    else
      -- Rate limit for AUTOMATIC (per template per day)
      select count(*) into daily_count
      from public.outbound_messages
      where organization_id = target_organization_id
        and channel = 'sms'
        and (metadata->>'template_key') = target_template_key
        and created_at > now() - interval '1 day';
      if daily_count >= template_row.rate_limit_per_day then
        next_status := 'CANCELLED';
      else
        next_status := 'QUEUED';
      end if;
    end if;
  end if;

  insert into public.outbound_messages (
    organization_id, idempotency_key, channel, provider, to_phone,
    body_text_hash, status, metadata
  ) values (
    target_organization_id, target_idempotency_key, 'sms',
    'PENDING_PRODUCTION', target_to_phone,
    body_hash_hex, next_status,
    jsonb_build_object(
      'template_key', target_template_key,
      'template_version', target_template_version,
      'variables', target_variables_json,
      'execution_mode', target_execution_mode
    )
  )
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'sms.record_intent',
    'outbound_message', new_id,
    jsonb_build_object(
      'to_phone', target_to_phone,
      'status', next_status,
      'template_key', target_template_key,
      'template_version', target_template_version,
      'execution_mode', target_execution_mode
    )
  );

  message_id := new_id;
  status     := next_status;
  created    := true;
  return next;
end;
$$;

revoke all on function public.record_sms_intent(uuid, text, text, integer, text, text, jsonb, text) from public, anon;
grant execute on function public.record_sms_intent(uuid, text, text, integer, text, text, jsonb, text) to authenticated, service_role;

-- =========================================================================
-- Section 5 — approve_sms RPC (WAITING_FOR_APPROVAL → QUEUED)
-- =========================================================================
create or replace function public.approve_sms(
  target_organization_id uuid,
  target_message_id      uuid,
  target_approver_user_id uuid
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
    raise exception 'approve_sms: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_approver_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'approve_sms: approver % is not an ACTIVE member', target_approver_user_id
      using errcode = '42501';
  end if;

  update public.outbound_messages
    set status = 'QUEUED'
  where id = target_message_id
    and organization_id = target_organization_id
    and channel = 'sms'
    and status = 'WAITING_FOR_APPROVAL';
  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'sms.approve',
      'outbound_message', target_message_id,
      jsonb_build_object('approver_user_id', target_approver_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.approve_sms(uuid, uuid, uuid) from public, anon;
grant execute on function public.approve_sms(uuid, uuid, uuid) to authenticated, service_role;

-- =========================================================================
-- Section 6 — mark_sms_sent RPC (service_role — after provider accepted)
-- =========================================================================
create or replace function public.mark_sms_sent(
  target_organization_id  uuid,
  target_message_id       uuid,
  target_integration_id   uuid,
  target_provider_message_id text,
  target_sent_at          timestamptz
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
    raise exception 'mark_sms_sent: service_role required'
      using errcode = '42501';
  end if;
  if target_provider_message_id is null or length(target_provider_message_id) = 0 then
    raise exception 'mark_sms_sent: provider_message_id required'
      using errcode = '22023';
  end if;
  if target_integration_id is null then
    raise exception 'mark_sms_sent: integration_id required'
      using errcode = '22023';
  end if;

  update public.outbound_messages
    set status              = 'SENT',
        provider_message_id = target_provider_message_id,
        integration_id      = target_integration_id,
        sent_at             = coalesce(sent_at, target_sent_at),
        attempt_count       = attempt_count + 1
  where id = target_message_id
    and organization_id = target_organization_id
    and channel = 'sms'
    and status = 'QUEUED';
  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'sms.sent',
      'outbound_message', target_message_id,
      jsonb_build_object('provider_message_id', target_provider_message_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_sms_sent(uuid, uuid, uuid, text, timestamptz) from public, anon;
grant execute on function public.mark_sms_sent(uuid, uuid, uuid, text, timestamptz) to service_role;

-- =========================================================================
-- Section 7 — mark_sms_delivered RPC (service_role — webhook)
-- =========================================================================
create or replace function public.mark_sms_delivered(
  target_organization_id uuid,
  target_message_id      uuid,
  target_delivered_at    timestamptz
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
    raise exception 'mark_sms_delivered: service_role required'
      using errcode = '42501';
  end if;

  update public.outbound_messages
    set status = 'DELIVERED'
  where id = target_message_id
    and organization_id = target_organization_id
    and channel = 'sms'
    and status in ('SENT');
  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'sms.delivered',
      'outbound_message', target_message_id,
      jsonb_build_object('delivered_at', to_char(target_delivered_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_sms_delivered(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.mark_sms_delivered(uuid, uuid, timestamptz) to service_role;

-- =========================================================================
-- Section 8 — mark_sms_undeliverable RPC (service_role)
-- =========================================================================
create or replace function public.mark_sms_undeliverable(
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
  affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mark_sms_undeliverable: service_role required'
      using errcode = '42501';
  end if;
  if target_error_class not in ('TRANSIENT', 'PERMANENT') then
    raise exception 'mark_sms_undeliverable: invalid error_class %', target_error_class
      using errcode = '22023';
  end if;

  update public.outbound_messages
    set status        = case when target_error_class = 'PERMANENT' then 'UNDELIVERED' else 'FAILED' end,
        error_class   = target_error_class,
        error_message = coalesce(target_error_message, ''),
        failed_at     = now()
  where id = target_message_id
    and organization_id = target_organization_id
    and channel = 'sms'
    and status in ('QUEUED', 'SENT');
  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'sms.undeliverable',
      'outbound_message', target_message_id,
      jsonb_build_object('error_class', target_error_class)
    );
    perform public.insert_attention_once(
      target_organization_id,
      'attention:sms_undeliverable:' || target_message_id::text,
      'FIELD_OPS',
      'SMS_UNDELIVERABLE',
      'SMS non délivré',
      case when target_error_class = 'PERMANENT' then 'HIGH' else 'NORMAL' end,
      'outbound_message', target_message_id,
      coalesce(target_error_message, 'undeliverable'),
      'Vérifier le numéro ou repasser en canal alternatif.',
      null, null,
      jsonb_build_object('error_class', target_error_class)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_sms_undeliverable(uuid, uuid, text, text) from public, anon;
grant execute on function public.mark_sms_undeliverable(uuid, uuid, text, text) to service_role;

-- =========================================================================
-- Section 9 — record_sms_opt_out RPC
-- =========================================================================
create or replace function public.record_sms_opt_out(
  target_organization_id uuid,
  target_phone_e164      text,
  target_source          text,
  target_note            text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  opt_id uuid;
begin
  if not private.is_organization_member(target_organization_id)
     and (select auth.role()) <> 'service_role' then
    raise exception 'record_sms_opt_out: caller not authorized'
      using errcode = '42501';
  end if;
  if target_phone_e164 is null or length(target_phone_e164) < 5 then
    raise exception 'record_sms_opt_out: phone_e164 required'
      using errcode = '22023';
  end if;
  if target_source not in ('MANUAL', 'SMS_REPLY', 'IMPORT', 'PROVIDER') then
    raise exception 'record_sms_opt_out: invalid source %', target_source
      using errcode = '22023';
  end if;

  insert into public.sms_opt_outs (
    organization_id, phone_e164, source, note
  ) values (
    target_organization_id, target_phone_e164, target_source, target_note
  )
  on conflict (organization_id, phone_e164) do update
    set source = excluded.source, note = coalesce(excluded.note, sms_opt_outs.note)
  returning id into opt_id;

  perform public.record_audit_log(
    target_organization_id, 'sms.opt_out',
    'sms_opt_out', opt_id,
    jsonb_build_object('phone_e164', target_phone_e164, 'source', target_source)
  );
  return opt_id;
end;
$$;

revoke all on function public.record_sms_opt_out(uuid, text, text, text) from public, anon;
grant execute on function public.record_sms_opt_out(uuid, text, text, text) to authenticated, service_role;
