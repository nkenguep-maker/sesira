-- SESIRA C28 completion — explicit collection exceptions.
-- Forward-only migration after C32 hardening.
--
-- The invoice lifecycle remains accounting-mirror state:
-- DRAFT -> ISSUED -> OVERDUE -> PAID, with CANCELLED terminal.
-- Collection exceptions are a separate human-owned dimension:
-- NORMAL | PROMISE_TO_PAY | DISPUTED.
--
-- No AI decision, no automatic legal action, no write-off, no hidden
-- universal days-past-due benchmark. A due date can deterministically
-- make an invoice OVERDUE; what to do next remains an operator decision.

alter table public.invoices
  add column if not exists collection_state text not null default 'NORMAL',
  add column if not exists payment_promise_due_at timestamptz,
  add column if not exists payment_promise_recorded_at timestamptz,
  add column if not exists payment_promise_recorded_by_user_id uuid,
  add column if not exists payment_promise_note text,
  add column if not exists dispute_opened_at timestamptz,
  add column if not exists dispute_opened_by_user_id uuid,
  add column if not exists dispute_reason text,
  add column if not exists dispute_resolved_at timestamptz,
  add column if not exists dispute_resolved_by_user_id uuid,
  add column if not exists dispute_resolution_note text;

alter table public.invoices
  drop constraint if exists invoices_collection_state_check;
alter table public.invoices
  add constraint invoices_collection_state_check
  check (collection_state in ('NORMAL', 'PROMISE_TO_PAY', 'DISPUTED'));

alter table public.invoices
  drop constraint if exists invoices_payment_promise_note_check;
alter table public.invoices
  add constraint invoices_payment_promise_note_check
  check (payment_promise_note is null or length(payment_promise_note) <= 2000);

alter table public.invoices
  drop constraint if exists invoices_dispute_reason_check;
alter table public.invoices
  add constraint invoices_dispute_reason_check
  check (dispute_reason is null or length(dispute_reason) between 1 and 2000);

alter table public.invoices
  drop constraint if exists invoices_dispute_resolution_note_check;
alter table public.invoices
  add constraint invoices_dispute_resolution_note_check
  check (dispute_resolution_note is null or length(dispute_resolution_note) <= 2000);

create index if not exists invoices_org_collection_state_idx
  on public.invoices (organization_id, collection_state)
  where status in ('ISSUED', 'OVERDUE');

comment on column public.invoices.collection_state is
  'Human-owned collection exception. NORMAL, PROMISE_TO_PAY, or DISPUTED. Independent from accounting-mirror invoice status.';

-- Direct Data API edits cannot forge the exception state.
create or replace function private.require_rpc_managed_invoice_collection_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role = 'authenticated'
     and old.collection_state is distinct from new.collection_state then
    raise exception 'invoice collection_state transitions are RPC-managed (% -> %)',
      old.collection_state, new.collection_state
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_rpc_collection_state_only on public.invoices;
create trigger invoices_rpc_collection_state_only
  before update on public.invoices
  for each row execute function private.require_rpc_managed_invoice_collection_state();

-- Paid or cancelled invoices cannot remain presented as an open promise/dispute.
create or replace function private.normalize_invoice_collection_terminal_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status in ('PAID', 'CANCELLED') then
    new.collection_state := 'NORMAL';
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_normalize_collection_terminal on public.invoices;
create trigger invoices_normalize_collection_terminal
  before update on public.invoices
  for each row execute function private.normalize_invoice_collection_terminal_state();

-- -------------------------------------------------------------------------
-- Human records a customer payment promise.
-- -------------------------------------------------------------------------
create or replace function public.record_invoice_payment_promise(
  target_organization_id uuid,
  target_invoice_id uuid,
  target_promised_for timestamptz,
  target_note text,
  target_recorded_by_user_id uuid
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
    raise exception 'record_invoice_payment_promise: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_recorded_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'record_invoice_payment_promise: recorder is not an ACTIVE organization member'
      using errcode = '42501';
  end if;
  if target_promised_for is null or target_promised_for <= now() then
    raise exception 'record_invoice_payment_promise: promised_for must be in the future'
      using errcode = '22023';
  end if;
  if target_note is not null and length(target_note) > 2000 then
    raise exception 'record_invoice_payment_promise: note exceeds 2000 characters'
      using errcode = '22023';
  end if;

  update public.invoices
    set collection_state = 'PROMISE_TO_PAY',
        payment_promise_due_at = target_promised_for,
        payment_promise_recorded_at = now(),
        payment_promise_recorded_by_user_id = target_recorded_by_user_id,
        payment_promise_note = nullif(trim(target_note), ''),
        updated_at = now()
  where id = target_invoice_id
    and organization_id = target_organization_id
    and status in ('ISSUED', 'OVERDUE')
    and collection_state <> 'DISPUTED';

  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      'invoice.payment_promise_recorded',
      'invoice',
      target_invoice_id,
      jsonb_build_object(
        'promised_for', to_char(target_promised_for at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'recorded_by_user_id', target_recorded_by_user_id
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_invoice_payment_promise(uuid, uuid, timestamptz, text, uuid) from public, anon;
grant execute on function public.record_invoice_payment_promise(uuid, uuid, timestamptz, text, uuid) to authenticated, service_role;

-- -------------------------------------------------------------------------
-- Human opens a dispute. This blocks the promise state but preserves its
-- historical fields for audit; no dunning/legal decision is made here.
-- -------------------------------------------------------------------------
create or replace function public.open_invoice_dispute(
  target_organization_id uuid,
  target_invoice_id uuid,
  target_reason text,
  target_opened_by_user_id uuid
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
    raise exception 'open_invoice_dispute: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_opened_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'open_invoice_dispute: opener is not an ACTIVE organization member'
      using errcode = '42501';
  end if;
  if target_reason is null or length(trim(target_reason)) = 0 or length(target_reason) > 2000 then
    raise exception 'open_invoice_dispute: reason is required and must be <= 2000 characters'
      using errcode = '22023';
  end if;

  update public.invoices
    set collection_state = 'DISPUTED',
        dispute_opened_at = now(),
        dispute_opened_by_user_id = target_opened_by_user_id,
        dispute_reason = trim(target_reason),
        dispute_resolved_at = null,
        dispute_resolved_by_user_id = null,
        dispute_resolution_note = null,
        updated_at = now()
  where id = target_invoice_id
    and organization_id = target_organization_id
    and status in ('ISSUED', 'OVERDUE')
    and collection_state <> 'DISPUTED';

  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      'invoice.dispute_opened',
      'invoice',
      target_invoice_id,
      jsonb_build_object(
        'reason', trim(target_reason),
        'opened_by_user_id', target_opened_by_user_id
      )
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.open_invoice_dispute(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.open_invoice_dispute(uuid, uuid, text, uuid) to authenticated, service_role;

-- -------------------------------------------------------------------------
-- Human resolves the dispute. Resolution returns collection_state to NORMAL;
-- it does not mark the invoice paid, change its amount, or trigger collection.
-- -------------------------------------------------------------------------
create or replace function public.resolve_invoice_dispute(
  target_organization_id uuid,
  target_invoice_id uuid,
  target_resolution_note text,
  target_resolved_by_user_id uuid
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
    raise exception 'resolve_invoice_dispute: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_resolved_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'resolve_invoice_dispute: resolver is not an ACTIVE organization member'
      using errcode = '42501';
  end if;
  if target_resolution_note is not null and length(target_resolution_note) > 2000 then
    raise exception 'resolve_invoice_dispute: note exceeds 2000 characters'
      using errcode = '22023';
  end if;

  update public.invoices
    set collection_state = 'NORMAL',
        dispute_resolved_at = now(),
        dispute_resolved_by_user_id = target_resolved_by_user_id,
        dispute_resolution_note = nullif(trim(target_resolution_note), ''),
        updated_at = now()
  where id = target_invoice_id
    and organization_id = target_organization_id
    and status in ('ISSUED', 'OVERDUE')
    and collection_state = 'DISPUTED';

  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      'invoice.dispute_resolved',
      'invoice',
      target_invoice_id,
      jsonb_build_object('resolved_by_user_id', target_resolved_by_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.resolve_invoice_dispute(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.resolve_invoice_dispute(uuid, uuid, text, uuid) to authenticated, service_role;

-- -------------------------------------------------------------------------
-- Remove the historical hidden 60-day escalation from overdue detection.
-- Overdue is deterministic from due_at; priority stays NORMAL. Any later
-- escalation comes from an explicit workflow event, such as a human-recorded
-- final reminder or a dispute, never from a universal age benchmark.
-- -------------------------------------------------------------------------
create or replace function public.mark_invoice_overdue(
  target_organization_id uuid,
  target_invoice_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  invoice_row public.invoices%rowtype;
  days_past_due integer;
begin
  if not (
    private.is_organization_member(target_organization_id)
    or coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
  ) then
    raise exception 'mark_invoice_overdue: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  select * into invoice_row
  from public.invoices
  where id = target_invoice_id
    and organization_id = target_organization_id;

  if invoice_row.id is null or invoice_row.status <> 'ISSUED' then
    return false;
  end if;
  if invoice_row.due_at is null or invoice_row.due_at >= now() then
    return false;
  end if;

  update public.invoices
    set status = 'OVERDUE', updated_at = now()
  where id = target_invoice_id
    and organization_id = target_organization_id
    and status = 'ISSUED';

  get diagnostics affected = row_count;
  if affected = 1 then
    days_past_due := greatest(0, extract(day from now() - invoice_row.due_at)::integer);

    perform public.insert_attention_once(
      target_organization_id,
      'attention:invoice_overdue:' || target_invoice_id::text,
      'BILLING',
      'INVOICE_OVERDUE',
      format('Facture en retard (%s j)', days_past_due),
      'NORMAL',
      'invoice',
      target_invoice_id,
      format('Facture %s en retard de %s jours (%s %s). Examiner le dossier et décider de la suite.',
             coalesce(invoice_row.external_ref, target_invoice_id::text),
             days_past_due, invoice_row.amount, invoice_row.currency),
      'Examiner le dossier et choisir la prochaine action.',
      null, null,
      jsonb_build_object(
        'invoice_id', target_invoice_id,
        'external_ref', invoice_row.external_ref,
        'days_past_due', days_past_due,
        'amount', invoice_row.amount,
        'currency', invoice_row.currency
      )
    );

    perform public.record_audit_log(
      target_organization_id,
      'invoice.mark_overdue',
      'invoice',
      target_invoice_id,
      jsonb_build_object('days_past_due', days_past_due)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_invoice_overdue(uuid, uuid) from public, anon;
grant execute on function public.mark_invoice_overdue(uuid, uuid) to authenticated, service_role;

comment on function public.mark_invoice_overdue(uuid, uuid) is
  'Deterministic ISSUED -> OVERDUE when now() > due_at. Emits NORMAL billing attention. No universal age threshold chooses the business escalation.';
