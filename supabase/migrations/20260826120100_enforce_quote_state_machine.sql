-- SESIRA Core Workflow — canonical Quote state machine
-- Enforces the transition graph at the database boundary, protects terminal
-- statuses, and guarantees `sent_at` is set atomically on the real DRAFT→SENT
-- transition even if a direct tenant Data API bypass omits it. The existing
-- `quote_status_event` trigger already emits `quote.sent` only when the stored
-- status changes to SENT, so combined with this guard the event invariant
-- holds regardless of client path.

create or replace function private.enforce_quote_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Bypass for non-authenticated callers (seed/administrative connections).
  if current_role <> 'authenticated' then
    return new;
  end if;

  -- Terminal statuses are protected.
  if old.status in ('WON', 'LOST', 'EXPIRED') then
    raise exception 'quote % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'DRAFT'        and new.status in ('SENT', 'WON', 'LOST')) or
    (old.status = 'SENT'         and new.status in ('FOLLOWING_UP', 'REPLIED', 'NEEDS_HUMAN', 'WON', 'LOST', 'EXPIRED')) or
    (old.status = 'FOLLOWING_UP' and new.status in ('REPLIED', 'NEEDS_HUMAN', 'WON', 'LOST', 'EXPIRED')) or
    (old.status = 'REPLIED'      and new.status in ('NEEDS_HUMAN', 'WON', 'LOST', 'EXPIRED')) or
    (old.status = 'NEEDS_HUMAN'  and new.status in ('REPLIED', 'WON', 'LOST', 'EXPIRED'))
  ) then
    raise exception 'quote % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  -- On the real transition to SENT, guarantee `sent_at` is set even if the
  -- caller (e.g., direct Data API) omitted it.
  if new.status = 'SENT' and new.sent_at is null then
    new.sent_at := now();
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_quote_state_transition()
  from public, anon, authenticated, service_role;

create trigger quote_state_transition_guard
  before update of status on public.quotes
  for each row
  when (old.status is distinct from new.status)
  execute function private.enforce_quote_state_transition();

comment on function private.enforce_quote_state_transition() is
  'Canonical Quote transition source of truth. Mirrors QUOTE_STATUS_TRANSITIONS in src/lib/quotes/schema.ts. Sets sent_at atomically on the real DRAFT→SENT transition. Fires only for the `authenticated` role.';
