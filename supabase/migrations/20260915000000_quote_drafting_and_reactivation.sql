-- SESIRA Core — C23 controlled quote drafting + reactivation candidates.
-- No AI is required. No provider effect. No autonomous reactivation.

alter table public.quotes
  add column draft_gaps jsonb not null default '[]'::jsonb
    check (jsonb_typeof(draft_gaps) = 'array'),
  add column draft_analysis_at timestamptz;

create index quotes_draft_gaps_pending_idx
  on public.quotes (organization_id, created_at desc)
  where status = 'DRAFT' and (draft_analysis_at is null or jsonb_array_length(draft_gaps) > 0);

-- Authenticated tenant writes cannot forge the analyzer output. The SECURITY DEFINER
-- RPC below is the only tenant-facing mutation boundary for these fields.
create or replace function private.protect_quote_draft_analysis_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role = 'authenticated'
     and (old.draft_gaps is distinct from new.draft_gaps
          or old.draft_analysis_at is distinct from new.draft_analysis_at) then
    raise exception 'quote draft analysis fields are RPC-managed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_quote_draft_analysis_fields() from public, anon, authenticated, service_role;

drop trigger if exists quotes_protect_draft_analysis_fields on public.quotes;
create trigger quotes_protect_draft_analysis_fields
  before update of draft_gaps, draft_analysis_at on public.quotes
  for each row execute function private.protect_quote_draft_analysis_fields();

-- A DRAFT cannot become SENT until the deterministic analysis has been recorded
-- and every gap has been resolved. WON/LOST remain available for manual closure.
create or replace function private.enforce_quote_draft_readiness()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'DRAFT' and new.status = 'SENT' then
    if new.draft_analysis_at is null then
      raise exception 'quote % cannot be sent before draft analysis', old.id using errcode = '22023';
    end if;
    if jsonb_array_length(new.draft_gaps) > 0 then
      raise exception 'quote % cannot be sent with unresolved draft gaps', old.id using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_quote_draft_readiness() from public, anon, authenticated, service_role;

drop trigger if exists quotes_enforce_draft_readiness on public.quotes;
create trigger quotes_enforce_draft_readiness
  before update of status on public.quotes
  for each row when (old.status is distinct from new.status)
  execute function private.enforce_quote_draft_readiness();

create or replace function public.record_quote_draft_gaps(
  target_organization_id uuid,
  target_quote_id uuid,
  target_draft_gaps jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  invalid_gap boolean;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_quote_draft_gaps: organization membership required' using errcode = '42501';
  end if;
  if target_draft_gaps is null or jsonb_typeof(target_draft_gaps) <> 'array' then
    raise exception 'record_quote_draft_gaps: JSON array required' using errcode = '22023';
  end if;
  if jsonb_array_length(target_draft_gaps) > 50 then
    raise exception 'record_quote_draft_gaps: maximum 50 gaps' using errcode = '22023';
  end if;

  select exists (
    select 1
    from jsonb_array_elements(target_draft_gaps) as gap
    where jsonb_typeof(gap) <> 'object'
       or gap ->> 'field' not in ('amount','currency','customer_display_name','recipient_email','customer_confirmation','technical_diagnosis','regulatory_documents','delivery_terms','warranty_terms','other')
       or nullif(trim(gap ->> 'reason'), '') is null
       or length(gap ->> 'reason') > 500
  ) into invalid_gap;
  if invalid_gap then
    raise exception 'record_quote_draft_gaps: invalid gap shape' using errcode = '22023';
  end if;

  update public.quotes
    set draft_gaps = target_draft_gaps,
        draft_analysis_at = now(),
        updated_at = now()
  where id = target_quote_id
    and organization_id = target_organization_id
    and status = 'DRAFT';
  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      'quote.draft_gaps_recorded',
      'quote',
      target_quote_id,
      jsonb_build_object('gap_count', jsonb_array_length(target_draft_gaps), 'human_required', true)
    );
  end if;
  return affected = 1;
end;
$$;
revoke all on function public.record_quote_draft_gaps(uuid, uuid, jsonb) from public, anon;
grant execute on function public.record_quote_draft_gaps(uuid, uuid, jsonb) to authenticated, service_role;

create or replace function public.get_quote_draft_readiness(target_organization_id uuid)
returns table (
  quote_id uuid,
  analyzed_at timestamptz,
  gap_count integer,
  gaps jsonb,
  send_eligible boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'get_quote_draft_readiness: organization membership required' using errcode = '42501';
  end if;
  return query
  select q.id,
         q.draft_analysis_at,
         jsonb_array_length(q.draft_gaps)::integer,
         q.draft_gaps,
         (q.status = 'DRAFT' and q.draft_analysis_at is not null and jsonb_array_length(q.draft_gaps) = 0)
  from public.quotes q
  where q.organization_id = target_organization_id
    and q.status = 'DRAFT'
  order by q.updated_at desc
  limit 500;
end;
$$;
revoke all on function public.get_quote_draft_readiness(uuid) from public, anon;
grant execute on function public.get_quote_draft_readiness(uuid) to authenticated;

create or replace function public.dormant_opportunities(
  target_organization_id uuid,
  target_dormant_since_days integer
)
returns table (
  opportunity_id uuid,
  customer_id uuid,
  commercial_state text,
  estimated_value numeric,
  currency text,
  opened_at timestamptz,
  last_activity_at timestamptz,
  dormant_days integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cutoff timestamptz;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'dormant_opportunities: organization membership required' using errcode = '42501';
  end if;
  if target_dormant_since_days is null or target_dormant_since_days < 1 or target_dormant_since_days > 365 then
    raise exception 'dormant_opportunities: days must be between 1 and 365' using errcode = '22023';
  end if;
  cutoff := now() - make_interval(days => target_dormant_since_days);

  return query
  with per_opp_activity as (
    select
      o.id as opp_id,
      o.customer_id,
      o.commercial_state,
      o.estimated_value,
      o.currency,
      o.opened_at,
      greatest(
        o.opened_at,
        coalesce((select max(q.updated_at) from public.quotes q where q.organization_id = target_organization_id and q.opportunity_id = o.id), o.opened_at),
        coalesce((select max(m.received_at) from public.messages m join public.quotes q on q.id = m.quote_id and q.organization_id = m.organization_id where m.organization_id = target_organization_id and m.direction = 'INBOUND' and q.opportunity_id = o.id), o.opened_at)
      ) as last_activity,
      exists (
        select 1 from public.quotes q
        where q.organization_id = target_organization_id
          and q.opportunity_id = o.id
          and (q.opted_out_at is not null or q.automation_pause_reason = 'COMPLAINT')
      ) or exists (
        select 1 from public.commercial_objections co
        where co.organization_id = target_organization_id
          and co.opportunity_id = o.id
          and co.status = 'OPEN'
          and co.kind = 'COMPLAINT'
      ) as has_excluded
    from public.opportunities o
    where o.organization_id = target_organization_id
      and o.commercial_state not in ('WON','LOST','CANCELLED')
  )
  select opp_id, customer_id, commercial_state, estimated_value, currency, opened_at,
         last_activity, extract(day from (now() - last_activity))::integer
  from per_opp_activity
  where has_excluded = false and last_activity <= cutoff
  order by last_activity asc
  limit 500;
end;
$$;
revoke all on function public.dormant_opportunities(uuid, integer) from public, anon;
grant execute on function public.dormant_opportunities(uuid, integer) to authenticated, service_role;

comment on function public.dormant_opportunities(uuid, integer) is
  'Read-only C23 reactivation candidate detector. Excludes terminal opportunities, opt-outs and complaints. Never sends or transitions anything.';
