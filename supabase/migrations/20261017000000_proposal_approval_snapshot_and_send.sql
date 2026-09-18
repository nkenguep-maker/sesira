-- SESIRA Service — immutable approval snapshots + controlled proposal send.
-- External delivery stays behind the existing guarded email boundary.

create table if not exists public.proposal_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null,
  quote_revision integer not null,
  snapshot_data jsonb not null check (jsonb_typeof(snapshot_data)='object'),
  snapshot_hash text not null,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint proposal_snapshots_quote_org_fkey
    foreign key (quote_id, organization_id)
    references public.quotes(id, organization_id)
    on delete restrict
);

create index if not exists proposal_snapshots_quote_idx
  on public.proposal_snapshots (organization_id,quote_id,approved_at desc);

alter table public.proposal_snapshots enable row level security;
drop policy if exists proposal_snapshots_select_members on public.proposal_snapshots;
create policy proposal_snapshots_select_members
on public.proposal_snapshots
for select to authenticated
using (private.is_organization_member(organization_id));

alter table public.quotes
  add column if not exists active_proposal_snapshot_id uuid references public.proposal_snapshots(id) on delete set null;

create table if not exists public.proposal_send_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null,
  snapshot_id uuid not null references public.proposal_snapshots(id) on delete restrict,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED','SENDING','SENT','FAILED','CANCELLED','MANUAL_REVIEW')),
  worker_id text,
  locked_at timestamptz,
  lease_expires_at timestamptz,
  outbound_message_id uuid references public.outbound_messages(id) on delete set null,
  provider_message_id text,
  error_class text check (error_class is null or error_class in ('TRANSIENT','PERMANENT','UNKNOWN')),
  error_message text check (error_message is null or length(error_message) <= 4000),
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  failed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint proposal_send_requests_quote_org_fkey
    foreign key (quote_id, organization_id)
    references public.quotes(id, organization_id)
    on delete cascade
);

create unique index if not exists proposal_send_one_active_idx
  on public.proposal_send_requests (organization_id,quote_id)
  where status in ('REQUESTED','SENDING');

create index if not exists proposal_send_queue_idx
  on public.proposal_send_requests (status,requested_at)
  where status in ('REQUESTED','SENDING');

alter table public.proposal_send_requests enable row level security;
drop policy if exists proposal_send_requests_select_members on public.proposal_send_requests;
create policy proposal_send_requests_select_members
on public.proposal_send_requests
for select to authenticated
using (private.is_organization_member(organization_id));

create or replace function private.reject_proposal_snapshot_mutation()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  raise exception 'proposal snapshots are immutable' using errcode='42501';
end;
$$;

drop trigger if exists proposal_snapshots_immutable_update on public.proposal_snapshots;
create trigger proposal_snapshots_immutable_update
before update or delete on public.proposal_snapshots
for each row execute function private.reject_proposal_snapshot_mutation();

-- Commercial values are editable only before/subsequent to requested changes.
create or replace function private.enforce_proposal_commercial_freeze()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if old.proposal_review_state not in ('DRAFT','CHANGES_REQUESTED') and (
    new.customer_id is distinct from old.customer_id
    or new.opportunity_id is distinct from old.opportunity_id
    or new.title is distinct from old.title
    or new.amount is distinct from old.amount
    or new.currency is distinct from old.currency
    or new.variant_key is distinct from old.variant_key
    or new.revision is distinct from old.revision
    or new.is_current_revision is distinct from old.is_current_revision
  ) then
    raise exception 'commercial proposal values are frozen after submission; reopen for editing'
      using errcode='22023';
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_proposal_commercial_freeze on public.quotes;
create trigger quotes_proposal_commercial_freeze
before update on public.quotes
for each row execute function private.enforce_proposal_commercial_freeze();

create or replace function private.enforce_proposal_option_freeze()
returns trigger
language plpgsql
set search_path=''
as $$
declare q_state text;
begin
  select proposal_review_state into q_state
  from public.quotes
  where id=coalesce(new.quote_id,old.quote_id)
    and organization_id=coalesce(new.organization_id,old.organization_id);

  if q_state is null then
    raise exception 'proposal option parent quote not found' using errcode='22023';
  end if;
  if q_state not in ('DRAFT','CHANGES_REQUESTED') then
    raise exception 'proposal options are frozen after submission; reopen for editing'
      using errcode='22023';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$;

drop trigger if exists quote_options_proposal_freeze on public.quote_options;
create trigger quote_options_proposal_freeze
before insert or update or delete on public.quote_options
for each row execute function private.enforce_proposal_option_freeze();

-- Extend state machine with explicit approval invalidation/reopen.
create or replace function private.enforce_proposal_review_state_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.proposal_review_state = old.proposal_review_state then return new; end if;

  if current_role = 'authenticated' then
    raise exception 'proposal review state must be changed through proposal RPCs'
      using errcode='42501';
  end if;

  if not (
    (old.proposal_review_state='DRAFT' and new.proposal_review_state='SUBMITTED')
    or (old.proposal_review_state='SUBMITTED' and new.proposal_review_state='UNDER_REVIEW')
    or (old.proposal_review_state='UNDER_REVIEW' and new.proposal_review_state in ('CHANGES_REQUESTED','APPROVED','REJECTED'))
    or (old.proposal_review_state='CHANGES_REQUESTED' and new.proposal_review_state='DRAFT')
    or (old.proposal_review_state='APPROVED' and new.proposal_review_state in ('READY_TO_SEND','DRAFT'))
    or (old.proposal_review_state='READY_TO_SEND' and new.proposal_review_state in ('SEND_REQUESTED','DRAFT'))
    or (old.proposal_review_state='SEND_REQUESTED' and new.proposal_review_state in ('SENT','FAILED'))
    or (old.proposal_review_state='FAILED' and new.proposal_review_state in ('READY_TO_SEND','DRAFT'))
  ) then
    raise exception 'invalid proposal review transition % -> % for quote %',
      old.proposal_review_state,new.proposal_review_state,old.id
      using errcode='22023';
  end if;
  return new;
end;
$$;

create or replace function private.build_proposal_snapshot(
  target_organization_id uuid,
  target_quote_id uuid,
  target_approver_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  payload jsonb;
  snapshot_id uuid;
  snapshot_digest text;
  q_revision integer;
begin
  select
    q.revision,
    jsonb_build_object(
      'quote',jsonb_build_object(
        'id',q.id,'reference',q.reference,'title',q.title,'amount',q.amount,
        'currency',q.currency,'variant_key',q.variant_key,'revision',q.revision,
        'expires_at',q.expires_at
      ),
      'customer',jsonb_build_object(
        'id',c.id,'display_name',c.display_name,'company_name',c.company_name,
        'email',c.email,'phone',c.phone
      ),
      'options',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',o.id,'option_key',o.option_key,'name',o.name,'amount',o.amount,
          'currency',o.currency,'status',o.status,'ordinal',o.ordinal,'metadata',o.metadata
        ) order by o.ordinal,o.created_at,o.id)
        from public.quote_options o
        where o.organization_id=target_organization_id and o.quote_id=q.id
      ),'[]'::jsonb),
      'approved_at',to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    )
  into q_revision,payload
  from public.quotes q
  join public.customers c
    on c.id=q.customer_id and c.organization_id=q.organization_id
  where q.id=target_quote_id
    and q.organization_id=target_organization_id
    and q.is_current_revision=true
    and q.status='DRAFT'
  for update of q;

  if payload is null then
    raise exception 'build_proposal_snapshot: quote not found or not current draft' using errcode='22023';
  end if;

  snapshot_digest := encode(extensions.digest(payload::text,'sha256'),'hex');

  insert into public.proposal_snapshots(
    organization_id,quote_id,quote_revision,snapshot_data,snapshot_hash,approved_by_user_id
  ) values (
    target_organization_id,target_quote_id,q_revision,payload,snapshot_digest,target_approver_user_id
  ) returning id into snapshot_id;

  return snapshot_id;
end;
$$;

create or replace function public.approve_proposal(
  target_organization_id uuid,
  target_quote_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  actor_id uuid := (select auth.uid());
  snapshot_id uuid;
begin
  if not private.has_organization_role(target_organization_id,array['OWNER','ADMIN','MANAGER']) then
    raise exception 'approve_proposal: manager role required' using errcode='42501';
  end if;

  perform 1 from public.quotes
  where id=target_quote_id and organization_id=target_organization_id
    and proposal_review_state='UNDER_REVIEW'
    and status='DRAFT'
    and is_current_revision=true
    and jsonb_array_length(draft_gaps)=0
  for update;
  if not found then return null; end if;

  snapshot_id := private.build_proposal_snapshot(target_organization_id,target_quote_id,actor_id);

  update public.quotes
  set proposal_review_state='APPROVED',
      proposal_review_decided_at=now(),
      proposal_review_decided_by_user_id=actor_id,
      proposal_review_note=null,
      active_proposal_snapshot_id=snapshot_id,
      updated_at=now()
  where id=target_quote_id and organization_id=target_organization_id;

  perform private.record_proposal_review_event(
    target_organization_id,target_quote_id,'APPROVED','UNDER_REVIEW','APPROVED',
    actor_id,null,jsonb_build_object('snapshot_id',snapshot_id)
  );
  perform public.record_audit_log(
    target_organization_id,'proposal.approved','quote',target_quote_id,
    jsonb_build_object('snapshot_id',snapshot_id)
  );
  return snapshot_id;
end;
$$;

create or replace function public.mark_proposal_ready_to_send(
  target_organization_id uuid,
  target_quote_id uuid
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare actor_id uuid := (select auth.uid()); snapshot_payload jsonb;
begin
  if not private.has_organization_role(target_organization_id,array['OWNER','ADMIN','MANAGER']) then
    raise exception 'mark_proposal_ready_to_send: manager role required' using errcode='42501';
  end if;

  select s.snapshot_data into snapshot_payload
  from public.quotes q
  join public.proposal_snapshots s
    on s.id=q.active_proposal_snapshot_id and s.organization_id=q.organization_id
  where q.id=target_quote_id and q.organization_id=target_organization_id
    and q.proposal_review_state='APPROVED' and q.status='DRAFT'
  for update of q;

  if snapshot_payload is null then return false; end if;
  if nullif(btrim(snapshot_payload #>> '{customer,email}'),'') is null then
    raise exception 'mark_proposal_ready_to_send: approved snapshot has no customer email'
      using errcode='22023';
  end if;

  update public.quotes
  set proposal_review_state='READY_TO_SEND',updated_at=now()
  where id=target_quote_id and organization_id=target_organization_id;

  perform private.record_proposal_review_event(
    target_organization_id,target_quote_id,'READY_TO_SEND','APPROVED','READY_TO_SEND',
    actor_id,null,'{}'::jsonb
  );
  perform public.record_audit_log(
    target_organization_id,'proposal.ready_to_send','quote',target_quote_id,'{}'::jsonb
  );
  return true;
end;
$$;

create or replace function public.reopen_proposal_for_editing(
  target_organization_id uuid,
  target_quote_id uuid,
  target_reason text
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare actor_id uuid := (select auth.uid()); old_state text; old_snapshot uuid;
begin
  if not private.has_organization_role(target_organization_id,array['OWNER','ADMIN','MANAGER']) then
    raise exception 'reopen_proposal_for_editing: manager role required' using errcode='42501';
  end if;
  if target_reason is null or length(btrim(target_reason))=0 or length(target_reason)>2000 then
    raise exception 'reopen_proposal_for_editing: reason required (<=2000)' using errcode='22023';
  end if;

  select proposal_review_state,active_proposal_snapshot_id
  into old_state,old_snapshot
  from public.quotes
  where id=target_quote_id and organization_id=target_organization_id
  for update;

  if old_state not in ('APPROVED','READY_TO_SEND','FAILED') then return false; end if;

  update public.quotes
  set proposal_review_state='DRAFT',
      active_proposal_snapshot_id=null,
      proposal_review_started_at=null,
      proposal_review_started_by_user_id=null,
      proposal_review_decided_at=null,
      proposal_review_decided_by_user_id=null,
      proposal_review_note=target_reason,
      updated_at=now()
  where id=target_quote_id and organization_id=target_organization_id;

  perform private.record_proposal_review_event(
    target_organization_id,target_quote_id,'RETURNED_TO_DRAFT',old_state,'DRAFT',
    actor_id,target_reason,jsonb_build_object('invalidated_snapshot_id',old_snapshot)
  );
  perform public.record_audit_log(
    target_organization_id,'proposal.reopened_for_editing','quote',target_quote_id,
    jsonb_build_object('reason',target_reason,'invalidated_snapshot_id',old_snapshot)
  );
  return true;
end;
$$;

create or replace function public.request_proposal_send(
  target_organization_id uuid,
  target_quote_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  actor_id uuid := (select auth.uid());
  snapshot_id uuid;
  request_id uuid;
begin
  if not private.has_organization_role(target_organization_id,array['OWNER','ADMIN','MANAGER']) then
    raise exception 'request_proposal_send: manager role required' using errcode='42501';
  end if;

  select active_proposal_snapshot_id into snapshot_id
  from public.quotes
  where id=target_quote_id and organization_id=target_organization_id
  for update;

  if snapshot_id is null then return null; end if;

  select id into request_id
  from public.proposal_send_requests
  where organization_id=target_organization_id and quote_id=target_quote_id
    and status in ('REQUESTED','SENDING')
  order by requested_at desc limit 1;

  if request_id is not null then return request_id; end if;

  perform 1 from public.quotes
  where id=target_quote_id and organization_id=target_organization_id
    and proposal_review_state='READY_TO_SEND' and status='DRAFT';
  if not found then return null; end if;

  insert into public.proposal_send_requests(
    organization_id,quote_id,snapshot_id,requested_by_user_id,status
  ) values (
    target_organization_id,target_quote_id,snapshot_id,actor_id,'REQUESTED'
  ) returning id into request_id;

  update public.quotes
  set proposal_review_state='SEND_REQUESTED',updated_at=now()
  where id=target_quote_id and organization_id=target_organization_id;

  perform private.record_proposal_review_event(
    target_organization_id,target_quote_id,'SEND_REQUESTED','READY_TO_SEND','SEND_REQUESTED',
    actor_id,null,jsonb_build_object('send_request_id',request_id,'snapshot_id',snapshot_id)
  );
  perform public.record_audit_log(
    target_organization_id,'proposal.send_requested','quote',target_quote_id,
    jsonb_build_object('send_request_id',request_id,'snapshot_id',snapshot_id)
  );
  return request_id;
end;
$$;

create or replace function public.claim_proposal_send_request(
  target_organization_id uuid,
  target_request_id uuid,
  target_worker_id text,
  target_lease_seconds integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare payload jsonb; claimed boolean;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'claim_proposal_send_request: service_role required' using errcode='42501';
  end if;
  if target_worker_id is null or length(target_worker_id)=0 or length(target_worker_id)>200 then
    raise exception 'claim_proposal_send_request: worker id required' using errcode='22023';
  end if;
  if target_lease_seconds < 30 or target_lease_seconds > 900 then
    raise exception 'claim_proposal_send_request: lease seconds must be 30..900' using errcode='22023';
  end if;

  update public.proposal_send_requests
  set status='SENDING',
      worker_id=target_worker_id,
      locked_at=now(),
      lease_expires_at=now()+make_interval(secs=>target_lease_seconds),
      updated_at=now()
  where id=target_request_id
    and organization_id=target_organization_id
    and (
      status='REQUESTED'
      or (status='SENDING' and lease_expires_at < now())
    );
  claimed := found;
  if not claimed then return null; end if;

  select jsonb_build_object(
    'request_id',r.id,
    'organization_id',r.organization_id,
    'quote_id',r.quote_id,
    'snapshot_id',r.snapshot_id,
    'snapshot',s.snapshot_data,
    'snapshot_hash',s.snapshot_hash
  ) into payload
  from public.proposal_send_requests r
  join public.proposal_snapshots s on s.id=r.snapshot_id and s.organization_id=r.organization_id
  where r.id=target_request_id and r.organization_id=target_organization_id;

  return payload;
end;
$$;

create or replace function public.record_proposal_send_success(
  target_organization_id uuid,
  target_request_id uuid,
  target_worker_id text,
  target_outbound_message_id uuid,
  target_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare q_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'record_proposal_send_success: service_role required' using errcode='42501';
  end if;

  update public.proposal_send_requests
  set status='SENT',
      outbound_message_id=target_outbound_message_id,
      provider_message_id=target_provider_message_id,
      sent_at=now(),
      lease_expires_at=null,
      updated_at=now()
  where id=target_request_id
    and organization_id=target_organization_id
    and status='SENDING'
    and worker_id=target_worker_id
    and lease_expires_at>=now()
  returning quote_id into q_id;

  if q_id is null then return false; end if;

  update public.quotes
  set proposal_review_state='SENT',
      status='SENT',
      sent_at=coalesce(sent_at,now()),
      updated_at=now()
  where id=q_id and organization_id=target_organization_id
    and proposal_review_state='SEND_REQUESTED'
    and status='DRAFT';

  if not found then
    raise exception 'record_proposal_send_success: quote state changed during send'
      using errcode='40001';
  end if;

  perform private.record_proposal_review_event(
    target_organization_id,q_id,'SENT','SEND_REQUESTED','SENT',
    null,null,jsonb_build_object(
      'send_request_id',target_request_id,
      'outbound_message_id',target_outbound_message_id,
      'provider_message_id',target_provider_message_id
    )
  );
  perform public.record_audit_log(
    target_organization_id,'proposal.sent','quote',q_id,
    jsonb_build_object('send_request_id',target_request_id,'outbound_message_id',target_outbound_message_id)
  );
  return true;
end;
$$;

create or replace function public.record_proposal_send_failure(
  target_organization_id uuid,
  target_request_id uuid,
  target_worker_id text,
  target_outbound_message_id uuid,
  target_error_class text,
  target_error_message text
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare q_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'record_proposal_send_failure: service_role required' using errcode='42501';
  end if;
  if target_error_class not in ('TRANSIENT','PERMANENT','UNKNOWN') then
    raise exception 'record_proposal_send_failure: invalid error class' using errcode='22023';
  end if;

  update public.proposal_send_requests
  set status='FAILED',
      outbound_message_id=target_outbound_message_id,
      error_class=target_error_class,
      error_message=left(coalesce(target_error_message,''),4000),
      failed_at=now(),
      lease_expires_at=null,
      updated_at=now()
  where id=target_request_id
    and organization_id=target_organization_id
    and status='SENDING'
    and worker_id=target_worker_id
  returning quote_id into q_id;

  if q_id is null then return false; end if;

  update public.quotes
  set proposal_review_state='FAILED',updated_at=now()
  where id=q_id and organization_id=target_organization_id
    and proposal_review_state='SEND_REQUESTED' and status='DRAFT';

  perform private.record_proposal_review_event(
    target_organization_id,q_id,'FAILED','SEND_REQUESTED','FAILED',
    null,null,jsonb_build_object(
      'send_request_id',target_request_id,
      'outbound_message_id',target_outbound_message_id,
      'error_class',target_error_class
    )
  );
  perform public.record_audit_log(
    target_organization_id,'proposal.send_failed','quote',q_id,
    jsonb_build_object('send_request_id',target_request_id,'error_class',target_error_class)
  );
  return true;
end;
$$;

create or replace function public.reconcile_proposal_send_from_outbound(
  target_organization_id uuid,
  target_request_id uuid,
  target_worker_id text,
  target_outbound_message_id uuid
)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
  outbound_status text;
  provider_id text;
  error_cls text;
  error_msg text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'reconcile_proposal_send_from_outbound: service_role required' using errcode='42501';
  end if;

  select status,provider_message_id,error_class,error_message
  into outbound_status,provider_id,error_cls,error_msg
  from public.outbound_messages
  where id=target_outbound_message_id and organization_id=target_organization_id;

  if outbound_status='SENT' and provider_id is not null then
    if public.record_proposal_send_success(
      target_organization_id,target_request_id,target_worker_id,target_outbound_message_id,provider_id
    ) then return 'SENT'; end if;
    return 'NOT_ELIGIBLE';
  elsif outbound_status='FAILED' then
    if public.record_proposal_send_failure(
      target_organization_id,target_request_id,target_worker_id,target_outbound_message_id,
      coalesce(error_cls,'UNKNOWN'),coalesce(error_msg,'replayed outbound failure')
    ) then return 'FAILED'; end if;
    return 'NOT_ELIGIBLE';
  end if;

  update public.proposal_send_requests
  set status='MANUAL_REVIEW',outbound_message_id=target_outbound_message_id,
      lease_expires_at=null,updated_at=now()
  where id=target_request_id and organization_id=target_organization_id
    and status='SENDING' and worker_id=target_worker_id;

  return 'MANUAL_REVIEW';
end;
$$;

create or replace function public.retry_failed_proposal_send(
  target_organization_id uuid,
  target_quote_id uuid
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare actor_id uuid := (select auth.uid());
begin
  if not private.has_organization_role(target_organization_id,array['OWNER','ADMIN','MANAGER']) then
    raise exception 'retry_failed_proposal_send: manager role required' using errcode='42501';
  end if;

  update public.quotes
  set proposal_review_state='READY_TO_SEND',updated_at=now()
  where id=target_quote_id and organization_id=target_organization_id
    and proposal_review_state='FAILED'
    and status='DRAFT'
    and active_proposal_snapshot_id is not null;

  if not found then return false; end if;

  perform private.record_proposal_review_event(
    target_organization_id,target_quote_id,'READY_TO_SEND','FAILED','READY_TO_SEND',
    actor_id,null,jsonb_build_object('retry',true)
  );
  perform public.record_audit_log(
    target_organization_id,'proposal.send_retry_ready','quote',target_quote_id,'{}'::jsonb
  );
  return true;
end;
$$;

revoke all on function public.approve_proposal(uuid,uuid) from public,anon;
revoke all on function public.mark_proposal_ready_to_send(uuid,uuid) from public,anon;
revoke all on function public.reopen_proposal_for_editing(uuid,uuid,text) from public,anon;
revoke all on function public.request_proposal_send(uuid,uuid) from public,anon;
revoke all on function public.claim_proposal_send_request(uuid,uuid,text,integer) from public,anon,authenticated;
revoke all on function public.record_proposal_send_success(uuid,uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.record_proposal_send_failure(uuid,uuid,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.reconcile_proposal_send_from_outbound(uuid,uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.retry_failed_proposal_send(uuid,uuid) from public,anon;

grant execute on function public.approve_proposal(uuid,uuid) to authenticated;
grant execute on function public.mark_proposal_ready_to_send(uuid,uuid) to authenticated;
grant execute on function public.reopen_proposal_for_editing(uuid,uuid,text) to authenticated;
grant execute on function public.request_proposal_send(uuid,uuid) to authenticated;
grant execute on function public.retry_failed_proposal_send(uuid,uuid) to authenticated;

grant execute on function public.claim_proposal_send_request(uuid,uuid,text,integer) to service_role;
grant execute on function public.record_proposal_send_success(uuid,uuid,text,uuid,text) to service_role;
grant execute on function public.record_proposal_send_failure(uuid,uuid,text,uuid,text,text) to service_role;
grant execute on function public.reconcile_proposal_send_from_outbound(uuid,uuid,text,uuid) to service_role;
