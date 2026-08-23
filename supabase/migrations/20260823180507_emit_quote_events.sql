create or replace function private.emit_quote_created_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  insert into public.events (
    organization_id,
    type,
    entity_type,
    entity_id,
    source,
    payload
  )
  values (
    new.organization_id,
    'quote.created',
    'quote',
    new.id,
    'APP',
    jsonb_strip_nulls(
      jsonb_build_object(
        'actor_id', actor_id,
        'customer_id', new.customer_id,
        'request_id', new.request_id,
        'amount', new.amount,
        'currency', new.currency,
        'status', new.status
      )
    )
  );

  return new;
end;
$$;

revoke all on function private.emit_quote_created_event() from public, anon, authenticated, service_role;

create trigger quote_created_event
  after insert on public.quotes
  for each row execute function private.emit_quote_created_event();

create or replace function private.emit_quote_status_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  event_type text;
begin
  event_type := case new.status
    when 'SENT' then 'quote.sent'
    when 'REPLIED' then 'quote.replied'
    when 'WON' then 'quote.won'
    when 'LOST' then 'quote.lost'
    else 'quote.status_changed'
  end;

  insert into public.events (
    organization_id,
    type,
    entity_type,
    entity_id,
    source,
    payload
  )
  values (
    new.organization_id,
    event_type,
    'quote',
    new.id,
    'APP',
    jsonb_strip_nulls(
      jsonb_build_object(
        'actor_id', actor_id,
        'previous_status', old.status,
        'status', new.status,
        'sent_at', new.sent_at
      )
    )
  );

  return new;
end;
$$;

revoke all on function private.emit_quote_status_event() from public, anon, authenticated, service_role;

create trigger quote_status_event
  after update of status on public.quotes
  for each row
  when (old.status is distinct from new.status)
  execute function private.emit_quote_status_event();
