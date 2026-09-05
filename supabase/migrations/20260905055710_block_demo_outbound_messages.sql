-- Demo tenants must never reach an external email provider.
create or replace function public.record_outbound_message_intent(
  target_organization_id uuid,
  target_idempotency_key text,
  target_integration_id uuid,
  target_provider text,
  target_channel text,
  target_to_email text,
  target_from_email text,
  target_reply_to text,
  target_subject text,
  target_body_hash text
)
returns table(id uuid, created boolean)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  inserted_id uuid;
  existing_id uuid;
  target_is_demo boolean;
begin
  if target_idempotency_key is null or length(target_idempotency_key) = 0 then
    raise exception 'record_outbound_message_intent: idempotency_key is required' using errcode = '22023';
  end if;
  if not (private.is_organization_member(target_organization_id) or (select auth.role()) = 'service_role') then
    raise exception 'record_outbound_message_intent: caller is not authorized for organization %', target_organization_id using errcode = '42501';
  end if;

  select coalesce((o.feature_flags ->> 'demo_mode') = 'true' or (o.config ->> 'demo_mode') = 'true' or (o.config ->> 'demo_data') = 'true', false)
    into target_is_demo from public.organizations o where o.id = target_organization_id;
  if coalesce(target_is_demo, false) then
    raise exception 'record_outbound_message_intent: external actions are disabled for demo organizations' using errcode = '42501';
  end if;

  insert into public.outbound_messages (organization_id,idempotency_key,integration_id,provider,channel,to_email,from_email,reply_to,subject,body_hash)
  values (target_organization_id,target_idempotency_key,target_integration_id,target_provider,coalesce(target_channel,'email'),target_to_email,target_from_email,target_reply_to,target_subject,target_body_hash)
  on conflict (organization_id,idempotency_key) do nothing
  returning outbound_messages.id into inserted_id;

  if inserted_id is not null then id := inserted_id; created := true; return next; return; end if;
  select outbound_messages.id into existing_id from public.outbound_messages where organization_id = target_organization_id and idempotency_key = target_idempotency_key;
  id := existing_id; created := false; return next; return;
end;
$function$;
