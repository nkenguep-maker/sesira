-- C22 hardening: create the deterministic Attention immediately with a future due_at.
-- The existing Attention read model hides future due items, so no cron is required
-- for an overdue item to become visible at the configured deadline.

create or replace function private.sync_speed_to_lead_attention(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req record;
  policy jsonb;
  enabled boolean := false;
  target_minutes integer;
  policy_note text;
  attention_key text;
  due_at_value timestamptz;
begin
  select r.id, r.organization_id, r.status, r.created_at, r.first_handled_at
    into req
  from public.requests r
  where r.id = target_request_id;

  if req.id is null then return; end if;

  policy := private.get_speed_to_lead_policy(req.organization_id);
  if jsonb_typeof(policy -> 'enabled') = 'boolean' then enabled := (policy ->> 'enabled')::boolean; end if;
  if jsonb_typeof(policy -> 'target_minutes') = 'number' then target_minutes := (policy ->> 'target_minutes')::integer; end if;
  policy_note := nullif(policy ->> 'note', '');
  attention_key := 'attention:speed_to_lead:' || req.id::text;

  if req.first_handled_at is not null or req.status <> 'NEW' then
    update public.attention_items a
      set status = 'RESOLVED', resolved_at = coalesce(a.resolved_at, now()), updated_at = now()
    where a.organization_id = req.organization_id
      and a.idempotency_key = attention_key
      and a.status in ('OPEN', 'IN_PROGRESS');
    return;
  end if;

  if not enabled or target_minutes is null then
    update public.attention_items a
      set status = 'DISMISSED', resolved_at = coalesce(a.resolved_at, now()), updated_at = now()
    where a.organization_id = req.organization_id
      and a.idempotency_key = attention_key
      and a.status in ('OPEN', 'IN_PROGRESS');
    return;
  end if;

  due_at_value := req.created_at + make_interval(mins => target_minutes);

  perform public.insert_attention_once(
    req.organization_id,
    attention_key,
    'REQUESTS',
    'SPEED_TO_LEAD_OVERDUE',
    'Nouvelle demande encore sans prise en charge',
    'HIGH',
    'request',
    req.id,
    'Cette demande dépassera le délai de prise en charge défini par votre organisation si elle reste en Nouvelle. SESIRA mesure une prise en charge interne, pas l’envoi d’une réponse au client.',
    'Ouvrir la demande et décider de la prochaine action',
    null,
    due_at_value,
    jsonb_strip_nulls(jsonb_build_object(
      'schema_version', 1,
      'source_kind', 'speed_to_lead',
      'source_id', req.id,
      'reason', 'SPEED_TO_LEAD_OVERDUE',
      'policy_key', 'speed_to_lead',
      'target_minutes', target_minutes,
      'policy_note', policy_note,
      'created_at', req.created_at,
      'human_required', true,
      'automation_eligible', false,
      'measurement', 'FIRST_INTERNAL_HANDLING'
    ))
  );

  update public.attention_items a
    set priority = 'HIGH',
        due_at = due_at_value,
        explanation = 'Cette demande dépassera le délai de prise en charge défini par votre organisation si elle reste en Nouvelle. SESIRA mesure une prise en charge interne, pas l’envoi d’une réponse au client.',
        suggested_action = 'Ouvrir la demande et décider de la prochaine action',
        metadata = a.metadata || jsonb_strip_nulls(jsonb_build_object(
          'policy_key', 'speed_to_lead',
          'target_minutes', target_minutes,
          'policy_note', policy_note,
          'human_required', true,
          'automation_eligible', false,
          'measurement', 'FIRST_INTERNAL_HANDLING'
        )),
        status = case when a.status in ('RESOLVED', 'DISMISSED') then 'OPEN' else a.status end,
        resolved_at = null,
        updated_at = now()
  where a.organization_id = req.organization_id
    and a.idempotency_key = attention_key;
end;
$$;

revoke all on function private.sync_speed_to_lead_attention(uuid)
  from public, anon, authenticated, service_role;

drop trigger if exists requests_sync_speed_to_lead_insert on public.requests;
create trigger requests_sync_speed_to_lead_insert
  after insert on public.requests
  for each row execute function private.sync_speed_to_lead_attention_trigger();
