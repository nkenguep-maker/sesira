-- SESIRA Service — proposal internal review workflow.
-- Human-controlled review state independent from the existing quote lifecycle.
-- No external side effect is performed by this migration.

alter table public.quotes
  add column if not exists proposal_review_state text not null default 'DRAFT',
  add column if not exists proposal_submitted_at timestamptz,
  add column if not exists proposal_submitted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists proposal_review_started_at timestamptz,
  add column if not exists proposal_review_started_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists proposal_review_decided_at timestamptz,
  add column if not exists proposal_review_decided_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists proposal_review_note text;

alter table public.quotes drop constraint if exists quotes_proposal_review_state_check;
alter table public.quotes add constraint quotes_proposal_review_state_check
  check (proposal_review_state in (
    'DRAFT','SUBMITTED','UNDER_REVIEW','CHANGES_REQUESTED',
    'APPROVED','READY_TO_SEND','SEND_REQUESTED','SENT','FAILED','REJECTED'
  ));

alter table public.quotes drop constraint if exists quotes_proposal_review_note_check;
alter table public.quotes add constraint quotes_proposal_review_note_check
  check (proposal_review_note is null or length(proposal_review_note) <= 4000);

create index if not exists quotes_proposal_review_queue_idx
  on public.quotes (organization_id, proposal_review_state, updated_at desc)
  where proposal_review_state in ('SUBMITTED','UNDER_REVIEW','CHANGES_REQUESTED','READY_TO_SEND','FAILED');

create table if not exists public.proposal_review_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null,
  event_kind text not null check (event_kind in (
    'SUBMITTED','REVIEW_STARTED','CHANGES_REQUESTED','RETURNED_TO_DRAFT',
    'APPROVED','REJECTED','READY_TO_SEND','SEND_REQUESTED','SENT','FAILED'
  )),
  from_state text,
  to_state text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text check (note is null or length(note) <= 4000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint proposal_review_events_quote_org_fkey
    foreign key (quote_id, organization_id)
    references public.quotes(id, organization_id)
    on delete cascade
);

create index if not exists proposal_review_events_quote_idx
  on public.proposal_review_events (organization_id, quote_id, created_at desc);

alter table public.proposal_review_events enable row level security;

drop policy if exists proposal_review_events_select_members on public.proposal_review_events;
create policy proposal_review_events_select_members
on public.proposal_review_events
for select
to authenticated
using (private.is_organization_member(organization_id));

create or replace function private.enforce_proposal_review_state_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.proposal_review_state = old.proposal_review_state then
    return new;
  end if;

  -- Direct authenticated Data API writes may never drive proposal state.
  -- SECURITY DEFINER RPCs below execute under the function owner and are
  -- the only supported mutation seam.
  if current_role = 'authenticated' then
    raise exception 'proposal review state must be changed through proposal RPCs'
      using errcode = '42501';
  end if;

  if not (
    (old.proposal_review_state = 'DRAFT' and new.proposal_review_state = 'SUBMITTED')
    or (old.proposal_review_state = 'SUBMITTED' and new.proposal_review_state = 'UNDER_REVIEW')
    or (old.proposal_review_state = 'UNDER_REVIEW' and new.proposal_review_state in ('CHANGES_REQUESTED','APPROVED','REJECTED'))
    or (old.proposal_review_state = 'CHANGES_REQUESTED' and new.proposal_review_state = 'DRAFT')
    or (old.proposal_review_state = 'APPROVED' and new.proposal_review_state = 'READY_TO_SEND')
    or (old.proposal_review_state = 'READY_TO_SEND' and new.proposal_review_state in ('SEND_REQUESTED','DRAFT'))
    or (old.proposal_review_state = 'SEND_REQUESTED' and new.proposal_review_state in ('SENT','FAILED'))
    or (old.proposal_review_state = 'FAILED' and new.proposal_review_state in ('READY_TO_SEND','DRAFT'))
  ) then
    raise exception 'invalid proposal review transition % -> % for quote %',
      old.proposal_review_state, new.proposal_review_state, old.id
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists quotes_proposal_review_state_guard on public.quotes;
create trigger quotes_proposal_review_state_guard
before update of proposal_review_state on public.quotes
for each row execute function private.enforce_proposal_review_state_transition();

create or replace function private.record_proposal_review_event(
  target_organization_id uuid,
  target_quote_id uuid,
  target_event_kind text,
  target_from_state text,
  target_to_state text,
  target_actor_user_id uuid,
  target_note text default null,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare inserted_id uuid;
begin
  insert into public.proposal_review_events (
    organization_id, quote_id, event_kind, from_state, to_state,
    actor_user_id, note, metadata
  ) values (
    target_organization_id, target_quote_id, target_event_kind,
    target_from_state, target_to_state, target_actor_user_id,
    target_note, coalesce(target_metadata, '{}'::jsonb)
  )
  returning id into inserted_id;
  return inserted_id;
end;
$$;

create or replace function public.submit_proposal_for_review(
  target_organization_id uuid,
  target_quote_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  old_state text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'submit_proposal_for_review: unauthorized' using errcode='42501';
  end if;

  select proposal_review_state into old_state
  from public.quotes
  where id = target_quote_id
    and organization_id = target_organization_id
    and status = 'DRAFT'
    and is_current_revision = true
  for update;

  if old_state is null or old_state <> 'DRAFT' then return false; end if;

  update public.quotes
  set proposal_review_state = 'SUBMITTED',
      proposal_submitted_at = now(),
      proposal_submitted_by_user_id = actor_id,
      proposal_review_note = null,
      updated_at = now()
  where id = target_quote_id and organization_id = target_organization_id;

  perform private.record_proposal_review_event(
    target_organization_id, target_quote_id, 'SUBMITTED',
    old_state, 'SUBMITTED', actor_id, null, '{}'::jsonb
  );
  perform public.record_audit_log(
    target_organization_id, 'proposal.submitted',
    'quote', target_quote_id, '{}'::jsonb
  );
  return true;
end;
$$;

create or replace function public.begin_proposal_review(
  target_organization_id uuid,
  target_quote_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if not private.has_organization_role(target_organization_id, array['OWNER','ADMIN','MANAGER']) then
    raise exception 'begin_proposal_review: manager role required' using errcode='42501';
  end if;

  update public.quotes
  set proposal_review_state = 'UNDER_REVIEW',
      proposal_review_started_at = now(),
      proposal_review_started_by_user_id = actor_id,
      updated_at = now()
  where id = target_quote_id
    and organization_id = target_organization_id
    and proposal_review_state = 'SUBMITTED'
    and status = 'DRAFT';

  if not found then return false; end if;

  perform private.record_proposal_review_event(
    target_organization_id, target_quote_id, 'REVIEW_STARTED',
    'SUBMITTED', 'UNDER_REVIEW', actor_id, null, '{}'::jsonb
  );
  perform public.record_audit_log(
    target_organization_id, 'proposal.review_started',
    'quote', target_quote_id, '{}'::jsonb
  );
  return true;
end;
$$;

create or replace function public.request_proposal_changes(
  target_organization_id uuid,
  target_quote_id uuid,
  target_note text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid());
begin
  if not private.has_organization_role(target_organization_id, array['OWNER','ADMIN','MANAGER']) then
    raise exception 'request_proposal_changes: manager role required' using errcode='42501';
  end if;
  if target_note is null or length(btrim(target_note)) = 0 or length(target_note) > 4000 then
    raise exception 'request_proposal_changes: note required (<=4000)' using errcode='22023';
  end if;

  update public.quotes
  set proposal_review_state='CHANGES_REQUESTED',
      proposal_review_decided_at=now(),
      proposal_review_decided_by_user_id=actor_id,
      proposal_review_note=target_note,
      updated_at=now()
  where id=target_quote_id and organization_id=target_organization_id
    and proposal_review_state='UNDER_REVIEW' and status='DRAFT';

  if not found then return false; end if;

  perform private.record_proposal_review_event(
    target_organization_id,target_quote_id,'CHANGES_REQUESTED',
    'UNDER_REVIEW','CHANGES_REQUESTED',actor_id,target_note,'{}'::jsonb
  );
  perform public.record_audit_log(
    target_organization_id,'proposal.changes_requested','quote',target_quote_id,
    jsonb_build_object('note',target_note)
  );
  return true;
end;
$$;

create or replace function public.return_proposal_to_draft(
  target_organization_id uuid,
  target_quote_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid()); old_state text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'return_proposal_to_draft: unauthorized' using errcode='42501';
  end if;

  select proposal_review_state into old_state
  from public.quotes
  where id=target_quote_id and organization_id=target_organization_id
  for update;

  if old_state not in ('CHANGES_REQUESTED','FAILED') then return false; end if;

  update public.quotes
  set proposal_review_state='DRAFT',
      proposal_review_started_at=null,
      proposal_review_started_by_user_id=null,
      proposal_review_decided_at=null,
      proposal_review_decided_by_user_id=null,
      updated_at=now()
  where id=target_quote_id and organization_id=target_organization_id;

  perform private.record_proposal_review_event(
    target_organization_id,target_quote_id,'RETURNED_TO_DRAFT',
    old_state,'DRAFT',actor_id,null,'{}'::jsonb
  );
  perform public.record_audit_log(
    target_organization_id,'proposal.returned_to_draft','quote',target_quote_id,
    jsonb_build_object('from_state',old_state)
  );
  return true;
end;
$$;

create or replace function public.reject_proposal(
  target_organization_id uuid,
  target_quote_id uuid,
  target_note text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid());
begin
  if not private.has_organization_role(target_organization_id, array['OWNER','ADMIN','MANAGER']) then
    raise exception 'reject_proposal: manager role required' using errcode='42501';
  end if;
  if target_note is null or length(btrim(target_note)) = 0 or length(target_note) > 4000 then
    raise exception 'reject_proposal: note required (<=4000)' using errcode='22023';
  end if;

  update public.quotes
  set proposal_review_state='REJECTED',
      proposal_review_decided_at=now(),
      proposal_review_decided_by_user_id=actor_id,
      proposal_review_note=target_note,
      updated_at=now()
  where id=target_quote_id and organization_id=target_organization_id
    and proposal_review_state='UNDER_REVIEW' and status='DRAFT';

  if not found then return false; end if;

  perform private.record_proposal_review_event(
    target_organization_id,target_quote_id,'REJECTED',
    'UNDER_REVIEW','REJECTED',actor_id,target_note,'{}'::jsonb
  );
  perform public.record_audit_log(
    target_organization_id,'proposal.rejected','quote',target_quote_id,
    jsonb_build_object('note',target_note)
  );
  return true;
end;
$$;

revoke all on function public.submit_proposal_for_review(uuid,uuid) from public,anon;
revoke all on function public.begin_proposal_review(uuid,uuid) from public,anon;
revoke all on function public.request_proposal_changes(uuid,uuid,text) from public,anon;
revoke all on function public.return_proposal_to_draft(uuid,uuid) from public,anon;
revoke all on function public.reject_proposal(uuid,uuid,text) from public,anon;

grant execute on function public.submit_proposal_for_review(uuid,uuid) to authenticated;
grant execute on function public.begin_proposal_review(uuid,uuid) to authenticated;
grant execute on function public.request_proposal_changes(uuid,uuid,text) to authenticated;
grant execute on function public.return_proposal_to_draft(uuid,uuid) to authenticated;
grant execute on function public.reject_proposal(uuid,uuid,text) to authenticated;
