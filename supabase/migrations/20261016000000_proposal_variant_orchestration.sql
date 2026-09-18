-- SESIRA Service — proposal variant orchestration.
-- Reuses existing quote variants (quotes sharing opportunity_id) rather than
-- introducing a second commercial model.

alter table public.quotes
  add column if not exists proposal_variant_order integer not null default 0,
  add column if not exists proposal_is_recommended boolean not null default false;

alter table public.quotes drop constraint if exists quotes_proposal_variant_order_check;
alter table public.quotes add constraint quotes_proposal_variant_order_check
  check (proposal_variant_order >= 0);

create unique index if not exists quotes_one_recommended_variant_per_opportunity_idx
  on public.quotes (organization_id, opportunity_id)
  where proposal_is_recommended = true
    and opportunity_id is not null
    and is_current_revision = true;

create index if not exists quotes_proposal_variant_order_idx
  on public.quotes (organization_id, opportunity_id, proposal_variant_order, created_at)
  where opportunity_id is not null and is_current_revision = true;

create or replace function public.set_proposal_variant_presentation(
  target_organization_id uuid,
  target_quote_id uuid,
  target_order integer,
  target_recommended boolean
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare target_opportunity uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'set_proposal_variant_presentation: unauthorized' using errcode='42501';
  end if;
  if target_order is null or target_order < 0 then
    raise exception 'set_proposal_variant_presentation: order must be >= 0' using errcode='22023';
  end if;

  select opportunity_id into target_opportunity
  from public.quotes
  where id=target_quote_id
    and organization_id=target_organization_id
    and status='DRAFT'
    and proposal_review_state in ('DRAFT','CHANGES_REQUESTED')
    and is_current_revision=true
  for update;

  if not found then return false; end if;

  if coalesce(target_recommended,false) and target_opportunity is not null then
    update public.quotes
    set proposal_is_recommended=false, updated_at=now()
    where organization_id=target_organization_id
      and opportunity_id=target_opportunity
      and id<>target_quote_id
      and is_current_revision=true
      and proposal_is_recommended=true;
  end if;

  update public.quotes
  set proposal_variant_order=target_order,
      proposal_is_recommended=coalesce(target_recommended,false),
      updated_at=now()
  where id=target_quote_id and organization_id=target_organization_id;

  perform public.record_audit_log(
    target_organization_id,'proposal.variant_presentation_updated','quote',target_quote_id,
    jsonb_build_object('order',target_order,'recommended',coalesce(target_recommended,false))
  );
  return true;
end;
$$;

create or replace function public.submit_opportunity_proposal_bundle(
  target_organization_id uuid,
  target_opportunity_id uuid
)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  actor_id uuid := (select auth.uid());
  variant_count integer;
  distinct_currency_count integer;
  blocked_count integer;
  q record;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'submit_opportunity_proposal_bundle: unauthorized' using errcode='42501';
  end if;

  perform 1 from public.opportunities
  where id=target_opportunity_id and organization_id=target_organization_id
  for update;
  if not found then
    raise exception 'submit_opportunity_proposal_bundle: opportunity not found' using errcode='22023';
  end if;

  select count(*),
         count(distinct currency),
         count(*) filter (
           where status <> 'DRAFT'
              or proposal_review_state <> 'DRAFT'
              or is_current_revision is not true
              or amount is null
              or jsonb_array_length(draft_gaps) > 0
         )
  into variant_count, distinct_currency_count, blocked_count
  from public.quotes
  where organization_id=target_organization_id
    and opportunity_id=target_opportunity_id
    and is_current_revision=true;

  if variant_count < 1 then
    raise exception 'submit_opportunity_proposal_bundle: no current variants' using errcode='22023';
  end if;
  if variant_count > 5 then
    raise exception 'submit_opportunity_proposal_bundle: at most 5 current variants are supported' using errcode='22023';
  end if;
  if distinct_currency_count <> 1 then
    raise exception 'submit_opportunity_proposal_bundle: all variants must use the same currency' using errcode='22023';
  end if;
  if blocked_count <> 0 then
    raise exception 'submit_opportunity_proposal_bundle: every current variant must be ready, DRAFT and gap-free'
      using errcode='22023';
  end if;

  for q in
    select id, proposal_review_state
    from public.quotes
    where organization_id=target_organization_id
      and opportunity_id=target_opportunity_id
      and is_current_revision=true
    order by proposal_variant_order, created_at, id
    for update
  loop
    update public.quotes
    set proposal_review_state='SUBMITTED',
        proposal_submitted_at=now(),
        proposal_submitted_by_user_id=actor_id,
        proposal_review_note=null,
        updated_at=now()
    where id=q.id and organization_id=target_organization_id;

    perform private.record_proposal_review_event(
      target_organization_id,q.id,'SUBMITTED','DRAFT','SUBMITTED',
      actor_id,null,jsonb_build_object('bundle_opportunity_id',target_opportunity_id)
    );
  end loop;

  perform public.record_audit_log(
    target_organization_id,'proposal.bundle_submitted','opportunity',target_opportunity_id,
    jsonb_build_object('variant_count',variant_count)
  );
  return variant_count;
end;
$$;

create or replace function public.begin_opportunity_proposal_bundle_review(
  target_organization_id uuid,
  target_opportunity_id uuid
)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  actor_id uuid := (select auth.uid());
  affected integer;
  q record;
begin
  if not private.has_organization_role(target_organization_id,array['OWNER','ADMIN','MANAGER']) then
    raise exception 'begin_opportunity_proposal_bundle_review: manager role required' using errcode='42501';
  end if;

  for q in
    select id
    from public.quotes
    where organization_id=target_organization_id
      and opportunity_id=target_opportunity_id
      and is_current_revision=true
      and proposal_review_state='SUBMITTED'
      and status='DRAFT'
    order by proposal_variant_order,created_at,id
    for update
  loop
    update public.quotes
    set proposal_review_state='UNDER_REVIEW',
        proposal_review_started_at=now(),
        proposal_review_started_by_user_id=actor_id,
        updated_at=now()
    where id=q.id and organization_id=target_organization_id;

    perform private.record_proposal_review_event(
      target_organization_id,q.id,'REVIEW_STARTED','SUBMITTED','UNDER_REVIEW',
      actor_id,null,jsonb_build_object('bundle_opportunity_id',target_opportunity_id)
    );
  end loop;

  get diagnostics affected = row_count;
  -- row_count after the loop is not the number of loop iterations. Count the
  -- resulting rows instead for a deterministic return value.
  select count(*) into affected
  from public.quotes
  where organization_id=target_organization_id
    and opportunity_id=target_opportunity_id
    and is_current_revision=true
    and proposal_review_state='UNDER_REVIEW';

  if affected > 0 then
    perform public.record_audit_log(
      target_organization_id,'proposal.bundle_review_started','opportunity',target_opportunity_id,
      jsonb_build_object('variant_count',affected)
    );
  end if;
  return affected;
end;
$$;

create or replace function public.proposal_bundle_for_opportunity(
  target_organization_id uuid,
  target_opportunity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
stable
as $$
declare payload jsonb;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'proposal_bundle_for_opportunity: unauthorized' using errcode='42501';
  end if;

  select jsonb_build_object(
    'opportunity_id', target_opportunity_id,
    'variants', coalesce(jsonb_agg(
      jsonb_build_object(
        'quote_id',q.id,
        'variant_key',q.variant_key,
        'title',q.title,
        'amount',q.amount,
        'currency',q.currency,
        'order',q.proposal_variant_order,
        'recommended',q.proposal_is_recommended,
        'review_state',q.proposal_review_state,
        'quote_status',q.status,
        'revision',q.revision,
        'draft_gaps',q.draft_gaps
      )
      order by q.proposal_variant_order,q.created_at,q.id
    ),'[]'::jsonb)
  )
  into payload
  from public.quotes q
  where q.organization_id=target_organization_id
    and q.opportunity_id=target_opportunity_id
    and q.is_current_revision=true;

  return coalesce(payload,jsonb_build_object('opportunity_id',target_opportunity_id,'variants','[]'::jsonb));
end;
$$;

revoke all on function public.set_proposal_variant_presentation(uuid,uuid,integer,boolean) from public,anon;
revoke all on function public.submit_opportunity_proposal_bundle(uuid,uuid) from public,anon;
revoke all on function public.begin_opportunity_proposal_bundle_review(uuid,uuid) from public,anon;
revoke all on function public.proposal_bundle_for_opportunity(uuid,uuid) from public,anon;

grant execute on function public.set_proposal_variant_presentation(uuid,uuid,integer,boolean) to authenticated;
grant execute on function public.submit_opportunity_proposal_bundle(uuid,uuid) to authenticated;
grant execute on function public.begin_opportunity_proposal_bundle_review(uuid,uuid) to authenticated;
grant execute on function public.proposal_bundle_for_opportunity(uuid,uuid) to authenticated;
