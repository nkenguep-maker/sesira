-- SESIRA Core Workflow — Growth publishing + conversations (C31).
--
-- Three tables:
--   * public.growth_content_pieces — content awaiting review/approval
--   * public.growth_publications   — publication events (per channel)
--   * public.growth_conversations  — inbound conversation threads
--                                    tied to leads/campaigns (pre-
--                                    opportunity — post-opportunity
--                                    messaging lives in public.messages)
--
-- DOCTRINE INVARIANTS:
--
--   * AI may DRAFT content, SUGGEST publication timing, CLASSIFY
--     conversations. AI must NEVER auto-approve, auto-publish, or
--     auto-reply. Publication and reply are always human-gated
--     via a SECURITY DEFINER RPC that requires an ACTIVE org
--     member as approver/sender (same SoD pattern as C12).
--   * mark_publication_published is the ONLY path from
--     APPROVED → PUBLISHED. A caller wiring the external send
--     (LinkedIn / X / newsletter provider) does so BEFORE calling
--     the RPC and passes the external_ref back. This mirrors the
--     C9 outbound_message boundary discipline.
--   * The publication record carries the external_ref (post URL,
--     newsletter message id). The content_piece.published_at
--     stamps the FIRST publication only — a piece can be
--     re-published to multiple channels (each a distinct
--     publication row).
--   * growth_conversations do NOT store individual messages;
--     they are a lightweight thread wrapper. Full message
--     bodies live in the provider or in future
--     growth_conversation_messages (not this milestone).

-- =========================================================================
-- growth_content_pieces
-- =========================================================================
create table public.growth_content_pieces (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  title                 text not null check (length(title) between 1 and 300),
  body_draft            text check (body_draft is null or length(body_draft) <= 50000),
  kind                  text not null default 'OTHER'
    check (kind in ('ARTICLE', 'SOCIAL_POST', 'VIDEO', 'EMAIL_TEMPLATE',
                    'ADS_COPY', 'CASE_STUDY', 'OTHER')),
  language              text check (language is null or char_length(language) = 2),
  author_user_id        uuid,
  status                text not null default 'DRAFT'
    check (status in ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
  reviewed_by_user_id   uuid,
  reviewed_at           timestamptz,
  approved_by_user_id   uuid,
  approved_at           timestamptz,
  published_at          timestamptz,
  archived_at           timestamptz,
  archive_reason        text check (archive_reason is null or length(archive_reason) <= 500),
  provenance            jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, organization_id)
);

comment on table public.growth_content_pieces is
  'Content pieces (article, social post, video, template, etc.) with a review/approval lifecycle. AI may draft; publication is always human-gated. State machine DRAFT → REVIEW → APPROVED → PUBLISHED; any non-published → ARCHIVED. published_at stamps FIRST publication only.';

create index growth_content_pieces_org_status_idx on public.growth_content_pieces (organization_id, status);
create index growth_content_pieces_org_kind_idx on public.growth_content_pieces (organization_id, kind);
create index growth_content_pieces_org_review_idx on public.growth_content_pieces (organization_id, updated_at desc)
  where status = 'REVIEW';

alter table public.growth_content_pieces enable row level security;

create policy growth_content_pieces_select on public.growth_content_pieces
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy growth_content_pieces_insert on public.growth_content_pieces
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy growth_content_pieces_update on public.growth_content_pieces
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.growth_content_pieces to authenticated;
grant select, insert, update on public.growth_content_pieces to service_role;

-- =========================================================================
-- growth_publications — per publication event
-- =========================================================================
create table public.growth_publications (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  content_piece_id      uuid not null,
  growth_campaign_id    uuid,
  channel               text not null
    check (channel in ('PAID_SEARCH', 'ORGANIC', 'REFERRAL', 'EMAIL',
                       'EVENT', 'WORD_OF_MOUTH', 'CONTENT', 'OTHER')),
  external_ref          text check (external_ref is null or length(external_ref) <= 500),
  scheduled_for         timestamptz,
  status                text not null default 'SCHEDULED'
    check (status in ('SCHEDULED', 'PUBLISHED', 'CANCELLED')),
  published_at          timestamptz,
  published_by_user_id  uuid,
  cancelled_at          timestamptz,
  cancellation_reason   text check (cancellation_reason is null or length(cancellation_reason) <= 500),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (content_piece_id, organization_id) references public.growth_content_pieces(id, organization_id) on delete restrict,
  foreign key (growth_campaign_id, organization_id) references public.growth_campaigns(id, organization_id) on delete set null,
  unique (organization_id, channel, external_ref) deferrable initially deferred,
  unique (id, organization_id)
);

comment on table public.growth_publications is
  'Publication event for a content piece to a channel. A piece can be published multiple times to different channels. State SCHEDULED → PUBLISHED; SCHEDULED → CANCELLED (terminal). external_ref is the provider URL / message id.';

create index growth_publications_org_status_idx on public.growth_publications (organization_id, status);
create index growth_publications_org_content_idx on public.growth_publications (organization_id, content_piece_id);
create index growth_publications_org_scheduled_idx on public.growth_publications (organization_id, scheduled_for)
  where status = 'SCHEDULED' and scheduled_for is not null;

alter table public.growth_publications enable row level security;

create policy growth_publications_select on public.growth_publications
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy growth_publications_insert on public.growth_publications
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy growth_publications_update on public.growth_publications
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.growth_publications to authenticated;
grant select, insert, update on public.growth_publications to service_role;

-- =========================================================================
-- growth_conversations — pre-opportunity inbound threads
-- =========================================================================
create table public.growth_conversations (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  lead_id               uuid,
  growth_campaign_id    uuid,
  channel               text not null
    check (channel in ('EMAIL', 'CHAT', 'SOCIAL', 'PHONE',
                       'SMS', 'WEBHOOK', 'OTHER')),
  external_thread_ref   text check (external_thread_ref is null or length(external_thread_ref) <= 500),
  subject               text check (subject is null or length(subject) <= 500),
  status                text not null default 'OPEN'
    check (status in ('OPEN', 'PENDING_REPLY', 'REPLIED', 'CLOSED', 'ARCHIVED')),
  last_inbound_at       timestamptz,
  last_outbound_at      timestamptz,
  assigned_user_id      uuid,
  closed_at             timestamptz,
  close_reason          text check (close_reason is null or length(close_reason) <= 500),
  provenance            jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (lead_id, organization_id) references public.leads(id, organization_id) on delete set null,
  foreign key (growth_campaign_id, organization_id) references public.growth_campaigns(id, organization_id) on delete set null,
  unique (organization_id, channel, external_thread_ref) deferrable initially deferred,
  unique (id, organization_id)
);

comment on table public.growth_conversations is
  'Pre-opportunity inbound conversation thread (comment on a post, DM, chat, cold email). Once a lead becomes a customer/opportunity, subsequent messaging flows into public.messages. State OPEN → PENDING_REPLY → REPLIED → CLOSED; any → ARCHIVED. Individual message bodies NOT stored here — live in the provider.';

create index growth_conversations_org_status_idx on public.growth_conversations (organization_id, status);
create index growth_conversations_org_lead_idx on public.growth_conversations (organization_id, lead_id)
  where lead_id is not null;
create index growth_conversations_org_assignee_idx on public.growth_conversations (organization_id, assigned_user_id)
  where assigned_user_id is not null;
create index growth_conversations_org_pending_reply_idx on public.growth_conversations (organization_id, last_inbound_at desc)
  where status = 'PENDING_REPLY';

alter table public.growth_conversations enable row level security;

create policy growth_conversations_select on public.growth_conversations
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy growth_conversations_insert on public.growth_conversations
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy growth_conversations_update on public.growth_conversations
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.growth_conversations to authenticated;
grant select, insert, update on public.growth_conversations to service_role;

-- =========================================================================
-- State machine trigger — growth_content_pieces
-- =========================================================================
create or replace function private.enforce_growth_content_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('PUBLISHED', 'ARCHIVED') then
    raise exception 'growth_content_piece % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'DRAFT'    and new.status in ('REVIEW', 'ARCHIVED')) or
    (old.status = 'REVIEW'   and new.status in ('APPROVED', 'DRAFT', 'ARCHIVED')) or
    (old.status = 'APPROVED' and new.status in ('PUBLISHED', 'ARCHIVED')) or
    (old.status = new.status)
  ) then
    raise exception 'growth_content_piece % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger growth_content_pieces_state_transition
  before update on public.growth_content_pieces
  for each row execute function private.enforce_growth_content_state_transition();

-- =========================================================================
-- State machine trigger — growth_publications
-- =========================================================================
create or replace function private.enforce_growth_publication_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('PUBLISHED', 'CANCELLED') then
    raise exception 'growth_publication % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'SCHEDULED' and new.status in ('PUBLISHED', 'CANCELLED')) or
    (old.status = new.status)
  ) then
    raise exception 'growth_publication % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger growth_publications_state_transition
  before update on public.growth_publications
  for each row execute function private.enforce_growth_publication_state_transition();

-- =========================================================================
-- State machine trigger — growth_conversations
-- =========================================================================
create or replace function private.enforce_growth_conversation_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('CLOSED', 'ARCHIVED') then
    raise exception 'growth_conversation % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'OPEN'          and new.status in ('PENDING_REPLY', 'REPLIED', 'CLOSED', 'ARCHIVED')) or
    (old.status = 'PENDING_REPLY' and new.status in ('REPLIED', 'CLOSED', 'ARCHIVED', 'OPEN')) or
    (old.status = 'REPLIED'       and new.status in ('OPEN', 'PENDING_REPLY', 'CLOSED', 'ARCHIVED')) or
    (old.status = new.status)
  ) then
    raise exception 'growth_conversation % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger growth_conversations_state_transition
  before update on public.growth_conversations
  for each row execute function private.enforce_growth_conversation_state_transition();

-- =========================================================================
-- submit_content_for_review — DRAFT → REVIEW
-- =========================================================================
create or replace function public.submit_content_for_review(
  target_organization_id uuid,
  target_content_id      uuid
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
    raise exception 'submit_content_for_review: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.growth_content_pieces
    set status = 'REVIEW'
  where id = target_content_id
    and organization_id = target_organization_id
    and status = 'DRAFT';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'growth_content.submit_for_review',
      'growth_content_piece', target_content_id, '{}'::jsonb
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.submit_content_for_review(uuid, uuid) from public, anon;
grant execute on function public.submit_content_for_review(uuid, uuid) to authenticated, service_role;

-- =========================================================================
-- approve_content_piece — REVIEW → APPROVED (ACTIVE org member required)
-- =========================================================================
create or replace function public.approve_content_piece(
  target_organization_id uuid,
  target_content_id      uuid,
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
    raise exception 'approve_content_piece: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_approver_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'approve_content_piece: approver % is not an ACTIVE member of organization %',
      target_approver_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.growth_content_pieces
    set status              = 'APPROVED',
        reviewed_by_user_id = coalesce(reviewed_by_user_id, target_approver_user_id),
        reviewed_at         = coalesce(reviewed_at, now()),
        approved_by_user_id = target_approver_user_id,
        approved_at         = now()
  where id = target_content_id
    and organization_id = target_organization_id
    and status = 'REVIEW';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'growth_content.approve',
      'growth_content_piece', target_content_id,
      jsonb_build_object('approver_user_id', target_approver_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.approve_content_piece(uuid, uuid, uuid) from public, anon;
grant execute on function public.approve_content_piece(uuid, uuid, uuid) to authenticated, service_role;

comment on function public.approve_content_piece(uuid, uuid, uuid) is
  'Transition growth_content_piece REVIEW → APPROVED. Approver must be an ACTIVE org member. AI must NEVER call this — approval is always human.';

-- =========================================================================
-- archive_content_piece — any non-published → ARCHIVED
-- =========================================================================
create or replace function public.archive_content_piece(
  target_organization_id uuid,
  target_content_id      uuid,
  target_reason          text
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
    raise exception 'archive_content_piece: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.growth_content_pieces
    set status         = 'ARCHIVED',
        archived_at    = now(),
        archive_reason = target_reason
  where id = target_content_id
    and organization_id = target_organization_id
    and status in ('DRAFT', 'REVIEW', 'APPROVED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'growth_content.archive',
      'growth_content_piece', target_content_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.archive_content_piece(uuid, uuid, text) from public, anon;
grant execute on function public.archive_content_piece(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- schedule_publication — SCHEDULED insert (content must be APPROVED)
-- =========================================================================
create or replace function public.schedule_publication(
  target_organization_id uuid,
  target_content_id      uuid,
  target_campaign_id     uuid,
  target_channel         text,
  target_scheduled_for   timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  content_status text;
  new_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'schedule_publication: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_channel not in ('PAID_SEARCH', 'ORGANIC', 'REFERRAL', 'EMAIL',
                            'EVENT', 'WORD_OF_MOUTH', 'CONTENT', 'OTHER') then
    raise exception 'schedule_publication: invalid channel %', target_channel
      using errcode = '22023';
  end if;
  if target_scheduled_for is not null and target_scheduled_for < now() - make_interval(mins => 5) then
    raise exception 'schedule_publication: scheduled_for cannot be in the past'
      using errcode = '22023';
  end if;

  select status into content_status
  from public.growth_content_pieces
  where id = target_content_id
    and organization_id = target_organization_id;

  if content_status is null then
    raise exception 'schedule_publication: content_piece % not found in organization %',
      target_content_id, target_organization_id
      using errcode = '22023';
  end if;
  if content_status <> 'APPROVED' then
    raise exception 'schedule_publication: content_piece % must be APPROVED (got %)',
      target_content_id, content_status
      using errcode = '22023';
  end if;

  if target_campaign_id is not null and not exists (
    select 1 from public.growth_campaigns
    where id = target_campaign_id
      and organization_id = target_organization_id
  ) then
    raise exception 'schedule_publication: campaign % not found in organization %',
      target_campaign_id, target_organization_id
      using errcode = '22023';
  end if;

  insert into public.growth_publications (
    organization_id, content_piece_id, growth_campaign_id,
    channel, scheduled_for, status
  ) values (
    target_organization_id, target_content_id, target_campaign_id,
    target_channel, target_scheduled_for, 'SCHEDULED'
  ) returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'growth_publication.schedule',
    'growth_publication', new_id,
    jsonb_build_object(
      'content_piece_id', target_content_id,
      'campaign_id', target_campaign_id,
      'channel', target_channel,
      'scheduled_for', case when target_scheduled_for is null then null else to_char(target_scheduled_for at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end
    )
  );
  return new_id;
end;
$$;

revoke all on function public.schedule_publication(uuid, uuid, uuid, text, timestamptz) from public, anon;
grant execute on function public.schedule_publication(uuid, uuid, uuid, text, timestamptz) to authenticated, service_role;

-- =========================================================================
-- mark_publication_published — SCHEDULED → PUBLISHED (ACTIVE member)
-- =========================================================================
-- Called AFTER the external provider (LinkedIn / X / newsletter) has
-- accepted the publish request and returned an external_ref (post URL /
-- message id). The caller is responsible for the actual send — this
-- RPC only records the outcome. Same discipline as C9 outbound_message
-- boundary.
create or replace function public.mark_publication_published(
  target_organization_id     uuid,
  target_publication_id      uuid,
  target_published_by_user_id uuid,
  target_external_ref        text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  pub_row  public.growth_publications%rowtype;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'mark_publication_published: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_published_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'mark_publication_published: publisher % is not an ACTIVE member of organization %',
      target_published_by_user_id, target_organization_id
      using errcode = '42501';
  end if;
  if target_external_ref is null or length(target_external_ref) = 0 or length(target_external_ref) > 500 then
    raise exception 'mark_publication_published: external_ref is required (≤500 chars)'
      using errcode = '22023';
  end if;

  select * into pub_row
  from public.growth_publications
  where id = target_publication_id
    and organization_id = target_organization_id;

  if pub_row.id is null then
    return false;
  end if;
  if pub_row.status <> 'SCHEDULED' then
    return false;
  end if;

  update public.growth_publications
    set status               = 'PUBLISHED',
        published_at         = now(),
        published_by_user_id = target_published_by_user_id,
        external_ref         = target_external_ref
  where id = target_publication_id
    and organization_id = target_organization_id
    and status = 'SCHEDULED';

  get diagnostics affected = row_count;

  if affected = 1 then
    update public.growth_content_pieces
      set status       = case when status = 'APPROVED' then 'PUBLISHED' else status end,
          published_at = coalesce(published_at, now())
    where id = pub_row.content_piece_id
      and organization_id = target_organization_id;

    perform public.record_audit_log(
      target_organization_id, 'growth_publication.publish',
      'growth_publication', target_publication_id,
      jsonb_build_object(
        'published_by_user_id', target_published_by_user_id,
        'external_ref', target_external_ref,
        'content_piece_id', pub_row.content_piece_id
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_publication_published(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.mark_publication_published(uuid, uuid, uuid, text) to authenticated, service_role;

comment on function public.mark_publication_published(uuid, uuid, uuid, text) is
  'Records that a growth_publication landed on the external channel. Publisher must be ACTIVE org member. external_ref is REQUIRED (provider post URL / message id). AI must NEVER call this — publication is always human-gated. Flips the linked content_piece APPROVED → PUBLISHED on first publish.';

-- =========================================================================
-- cancel_publication — SCHEDULED → CANCELLED
-- =========================================================================
create or replace function public.cancel_publication(
  target_organization_id uuid,
  target_publication_id  uuid,
  target_reason          text
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
    raise exception 'cancel_publication: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 500 then
    raise exception 'cancel_publication: reason must be a non-empty string ≤500 chars'
      using errcode = '22023';
  end if;

  update public.growth_publications
    set status              = 'CANCELLED',
        cancelled_at        = now(),
        cancellation_reason = target_reason
  where id = target_publication_id
    and organization_id = target_organization_id
    and status = 'SCHEDULED';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'growth_publication.cancel',
      'growth_publication', target_publication_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.cancel_publication(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_publication(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- record_conversation_reply — PENDING_REPLY → REPLIED (ACTIVE member)
-- =========================================================================
-- Called AFTER a human sender pushed a reply through the provider.
-- Marks the thread REPLIED, stamps last_outbound_at, records audit.
-- AI must NEVER auto-reply — this seam is human-only.
create or replace function public.record_conversation_reply(
  target_organization_id uuid,
  target_conversation_id uuid,
  target_replied_by_user_id uuid
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
    raise exception 'record_conversation_reply: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_replied_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'record_conversation_reply: replier % is not an ACTIVE member of organization %',
      target_replied_by_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.growth_conversations
    set status           = 'REPLIED',
        last_outbound_at = now()
  where id = target_conversation_id
    and organization_id = target_organization_id
    and status in ('OPEN', 'PENDING_REPLY');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'growth_conversation.reply',
      'growth_conversation', target_conversation_id,
      jsonb_build_object('replied_by_user_id', target_replied_by_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_conversation_reply(uuid, uuid, uuid) from public, anon;
grant execute on function public.record_conversation_reply(uuid, uuid, uuid) to authenticated, service_role;

comment on function public.record_conversation_reply(uuid, uuid, uuid) is
  'Record that a human replied to a growth_conversation. Replier must be an ACTIVE org member. AI must NEVER call this — replies are always human.';

-- =========================================================================
-- close_conversation — any non-terminal → CLOSED
-- =========================================================================
create or replace function public.close_conversation(
  target_organization_id uuid,
  target_conversation_id uuid,
  target_reason          text
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
    raise exception 'close_conversation: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.growth_conversations
    set status       = 'CLOSED',
        closed_at    = now(),
        close_reason = target_reason
  where id = target_conversation_id
    and organization_id = target_organization_id
    and status in ('OPEN', 'PENDING_REPLY', 'REPLIED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'growth_conversation.close',
      'growth_conversation', target_conversation_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.close_conversation(uuid, uuid, text) from public, anon;
grant execute on function public.close_conversation(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- Read helpers
-- =========================================================================
create or replace function public.pending_content_reviews(
  target_organization_id uuid
)
returns table (
  content_id uuid,
  title      text,
  kind       text,
  language   text,
  author_user_id uuid,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'pending_content_reviews: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select c.id, c.title, c.kind, c.language, c.author_user_id, c.updated_at
  from public.growth_content_pieces c
  where c.organization_id = target_organization_id
    and c.status = 'REVIEW'
  order by c.updated_at asc;
end;
$$;

revoke all on function public.pending_content_reviews(uuid) from public, anon;
grant execute on function public.pending_content_reviews(uuid) to authenticated, service_role;

create or replace function public.upcoming_publications(
  target_organization_id uuid,
  target_days_ahead      integer
)
returns table (
  publication_id  uuid,
  content_piece_id uuid,
  channel         text,
  scheduled_for   timestamptz,
  campaign_id     uuid
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'upcoming_publications: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_days_ahead is null or target_days_ahead < 0 or target_days_ahead > 365 then
    raise exception 'upcoming_publications: days_ahead must be in [0, 365] (got %)', target_days_ahead
      using errcode = '22023';
  end if;

  return query
  select p.id, p.content_piece_id, p.channel, p.scheduled_for, p.growth_campaign_id
  from public.growth_publications p
  where p.organization_id = target_organization_id
    and p.status = 'SCHEDULED'
    and p.scheduled_for is not null
    and p.scheduled_for <= now() + make_interval(days => target_days_ahead)
  order by p.scheduled_for asc;
end;
$$;

revoke all on function public.upcoming_publications(uuid, integer) from public, anon;
grant execute on function public.upcoming_publications(uuid, integer) to authenticated, service_role;

create or replace function public.open_conversations(
  target_organization_id uuid
)
returns table (
  conversation_id     uuid,
  lead_id             uuid,
  channel             text,
  external_thread_ref text,
  subject             text,
  status              text,
  last_inbound_at     timestamptz,
  assigned_user_id    uuid
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'open_conversations: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    c.id, c.lead_id, c.channel, c.external_thread_ref, c.subject,
    c.status, c.last_inbound_at, c.assigned_user_id
  from public.growth_conversations c
  where c.organization_id = target_organization_id
    and c.status in ('OPEN', 'PENDING_REPLY')
  order by c.last_inbound_at desc nulls last;
end;
$$;

revoke all on function public.open_conversations(uuid) from public, anon;
grant execute on function public.open_conversations(uuid) to authenticated, service_role;
