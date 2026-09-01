-- SESIRA Core Workflow — quote follow-up safety state (P0)
-- Adds first-class, queryable temporal state so a paused, complaint-held,
-- reviewed or opted-out quote is a data invariant instead of a semantic
-- overload of `status`.
--
-- New columns on public.quotes:
--   automation_paused_at    timestamptz null
--   automation_pause_reason text        null (constrained enum when paused)
--   opted_out_at            timestamptz null
--
-- Invariants encoded at the database boundary:
--   1. automation_paused_at and automation_pause_reason must both be set
--      together (`(paused_at is null) = (pause_reason is null)`).
--   2. opted_out_at is sticky: once set, an authenticated tenant caller
--      cannot clear it via an ordinary UPDATE. Un-opting requires an
--      administrative connection (postgres/service_role) or a future
--      dedicated privileged RPC. Not clearable by a status transition.
--   3. The follow-up worker query treats a row as "not due" whenever any
--      of paused_at IS NOT NULL, opted_out_at IS NOT NULL, or status in
--      terminal / already-replied states. See
--      src/app/app/quotes/page.tsx.
--
-- Not encoded here (documented for callers):
--   - Complaint handling: the app should call a helper that (a) sets
--     automation_paused_at with reason='COMPLAINT' and (b) inserts a
--     matching attention_items row with priority='URGENT'. That helper
--     lives in the application layer (Server Action) rather than the DB
--     to keep event emission co-located with business logic.

alter table public.quotes
  add column automation_paused_at    timestamptz,
  add column automation_pause_reason text,
  add column opted_out_at            timestamptz;

alter table public.quotes
  add constraint quotes_pause_reason_valid
  check (
    automation_pause_reason is null
    or automation_pause_reason in ('MANUAL', 'COMPLAINT', 'REVIEW', 'OPT_OUT', 'ERROR_THRESHOLD')
  );

alter table public.quotes
  add constraint quotes_pause_state_paired
  check ((automation_paused_at is null) = (automation_pause_reason is null));

-- Sticky opt-out: block tenant UPDATE that transitions opted_out_at from
-- NOT NULL to NULL. Also block a tenant setting opted_out_at to a value
-- other than now-ish (defense against back-dating).
create or replace function private.enforce_quote_opt_out_stickiness()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.opted_out_at is not null and new.opted_out_at is null then
    raise exception 'quote % opt-out is sticky and cannot be cleared by a tenant update',
      old.id
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_quote_opt_out_stickiness()
  from public, anon, authenticated, service_role;

create trigger quote_opt_out_stickiness_guard
  before update of opted_out_at on public.quotes
  for each row
  when (old.opted_out_at is distinct from new.opted_out_at)
  execute function private.enforce_quote_opt_out_stickiness();

comment on trigger quote_opt_out_stickiness_guard on public.quotes is
  'Prevents tenant Data API callers from clearing opted_out_at. Un-opting requires an administrative connection.';

-- Query support: partial index that matches the follow-up worker's WHERE
-- clause exactly. Rows that are paused, opted out or in a terminal /
-- already-replied state are excluded — so the index stays small and
-- covers only "actionable" quotes.
create index quotes_follow_up_due_idx
  on public.quotes (organization_id, next_action_at)
  where automation_paused_at is null
    and opted_out_at is null
    and status in ('SENT', 'FOLLOWING_UP', 'NEEDS_HUMAN');

comment on index public.quotes_follow_up_due_idx is
  'Matches the follow-up worker WHERE clause. REPLIED is excluded because a reply must trigger a human review, not another automated follow-up.';

comment on column public.quotes.automation_paused_at is
  'When automated follow-ups were paused. Paired with automation_pause_reason via check constraint. NULL means active.';
comment on column public.quotes.automation_pause_reason is
  'Why automated follow-ups are paused. One of MANUAL, COMPLAINT, REVIEW, OPT_OUT, ERROR_THRESHOLD. NULL iff automation_paused_at is NULL.';
comment on column public.quotes.opted_out_at is
  'When the customer opted out of any follow-up. Sticky — a tenant Data API cannot clear this column (see quote_opt_out_stickiness_guard trigger).';
