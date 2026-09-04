-- SESIRA Core Workflow — invoice monitoring (C28).
--
-- Invoice metadata + collection lifecycle. NOT an accounting/ERP
-- replacement — the authoritative invoice lives in the customer's
-- accounting system. This table mirrors the ref + amount + due
-- dates so SESIRA can *monitor* payment status, detect overdue,
-- and drive controlled dunning reminders.
--
-- Model:
--   invoice ↔ customer (required) + quote (optional — an ad-hoc
--   invoice without a commercial trail is allowed for imported
--   accounting data).
--
-- Lifecycle:
--   DRAFT → ISSUED → PAID (terminal)
--   ISSUED → OVERDUE (auto via mark_invoice_overdue when past due_at)
--   OVERDUE → PAID (terminal)
--   any non-terminal → CANCELLED (terminal — voided invoice)
--
-- DOCTRINE INVARIANTS:
--
--   * AI is NEVER involved in payment decisions, amount changes,
--     write-offs, or dispute resolution. AI may only DRAFT
--     dunning wording (out of scope here) — sending remains human.
--   * mark_invoice_overdue is deterministic (rule = now() > due_at)
--     and idempotent. It emits ONE BILLING attention per invoice.
--   * record_dunning_reminder requires an ACTIVE org member as
--     sender (audit + separation-of-duties for compliance).
--   * Final-notice threshold escalates the attention priority to
--     HIGH (>= 60 days past due) — humans decide next action
--     (legal, write-off, settlement).

create table public.invoices (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  customer_id           uuid not null,
  quote_id              uuid,
  external_ref          text check (external_ref is null or length(external_ref) <= 200),
  amount                numeric(14,2) not null check (amount >= 0),
  currency              text not null default 'EUR' check (char_length(currency) = 3),
  status                text not null default 'DRAFT'
    check (status in ('DRAFT', 'ISSUED', 'OVERDUE', 'PAID', 'CANCELLED')),
  issued_at             timestamptz,
  due_at                timestamptz,
  paid_at               timestamptz,
  cancelled_at          timestamptz,
  reminder_stage        integer not null default 0 check (reminder_stage between 0 and 3),
  reminder_last_sent_at timestamptz,
  final_notice_sent_at  timestamptz,
  provenance            jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id) on delete restrict,
  foreign key (quote_id, organization_id) references public.quotes(id, organization_id) on delete set null,
  unique (organization_id, external_ref) deferrable initially deferred,
  unique (id, organization_id)
);

comment on table public.invoices is
  'Invoice metadata + collection lifecycle. NOT an accounting/ERP replacement — authoritative invoice lives in the customer accounting system. State machine: DRAFT → ISSUED → OVERDUE → PAID; any non-terminal → CANCELLED. AI never involved in payment decisions.';

create index invoices_org_status_idx on public.invoices (organization_id, status);
create index invoices_org_customer_idx on public.invoices (organization_id, customer_id);
create index invoices_org_quote_idx on public.invoices (organization_id, quote_id) where quote_id is not null;
create index invoices_org_due_at_idx on public.invoices (organization_id, due_at)
  where status in ('ISSUED', 'OVERDUE');
create index invoices_overdue_needs_dunning_idx on public.invoices (organization_id, reminder_last_sent_at)
  where status = 'OVERDUE';

alter table public.invoices enable row level security;

create policy invoices_select on public.invoices
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy invoices_insert on public.invoices
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy invoices_update on public.invoices
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.invoices to authenticated;
grant select, insert, update on public.invoices to service_role;

-- =========================================================================
-- State machine trigger — same short-circuit pattern as C27 documents
-- =========================================================================
create or replace function private.enforce_invoice_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('PAID', 'CANCELLED') then
    raise exception 'invoice % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'DRAFT'    and new.status in ('ISSUED', 'CANCELLED')) or
    (old.status = 'ISSUED'   and new.status in ('OVERDUE', 'PAID', 'CANCELLED')) or
    (old.status = 'OVERDUE'  and new.status in ('PAID', 'CANCELLED', 'ISSUED')) or
    (old.status = new.status)
  ) then
    raise exception 'invoice % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger invoices_state_transition
  before update on public.invoices
  for each row execute function private.enforce_invoice_state_transition();

-- =========================================================================
-- record_invoice_issued — DRAFT → ISSUED
-- =========================================================================
create or replace function public.record_invoice_issued(
  target_organization_id uuid,
  target_invoice_id      uuid,
  target_issued_at       timestamptz,
  target_due_at          timestamptz,
  target_external_ref    text
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
    raise exception 'record_invoice_issued: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_issued_at is null then
    raise exception 'record_invoice_issued: issued_at is required'
      using errcode = '22023';
  end if;
  if target_due_at is not null and target_due_at < target_issued_at then
    raise exception 'record_invoice_issued: due_at (%) cannot be before issued_at (%)',
      target_due_at, target_issued_at
      using errcode = '22023';
  end if;

  update public.invoices
    set status       = 'ISSUED',
        issued_at    = target_issued_at,
        due_at       = coalesce(target_due_at, due_at),
        external_ref = coalesce(target_external_ref, external_ref)
  where id = target_invoice_id
    and organization_id = target_organization_id
    and status = 'DRAFT';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'invoice.issue',
      'invoice', target_invoice_id,
      jsonb_build_object('issued_at', to_char(target_issued_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                         'due_at', case when target_due_at is null then null else to_char(target_due_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_invoice_issued(uuid, uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.record_invoice_issued(uuid, uuid, timestamptz, timestamptz, text) to authenticated, service_role;

-- =========================================================================
-- record_invoice_payment — ISSUED|OVERDUE → PAID
-- =========================================================================
-- Single-payment semantics for the monitoring loop. Partial payments
-- (if the accounting system reports them) are tracked in metadata by
-- the caller; the invoice only flips to PAID when the paid amount
-- matches the total.
create or replace function public.record_invoice_payment(
  target_organization_id uuid,
  target_invoice_id      uuid,
  target_amount          numeric,
  target_paid_at         timestamptz,
  target_metadata        jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  invoice_amount numeric;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_invoice_payment: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_amount is null or target_amount <= 0 then
    raise exception 'record_invoice_payment: amount must be > 0 (got %)', target_amount
      using errcode = '22023';
  end if;
  if target_paid_at is null then
    raise exception 'record_invoice_payment: paid_at is required'
      using errcode = '22023';
  end if;

  select amount into invoice_amount
  from public.invoices
  where id = target_invoice_id
    and organization_id = target_organization_id;

  if invoice_amount is null then
    return false;
  end if;

  if target_amount > invoice_amount then
    raise exception 'record_invoice_payment: paid amount (%) exceeds invoice amount (%) — investigate overpayment before flipping status',
      target_amount, invoice_amount
      using errcode = '22023';
  end if;

  if target_amount < invoice_amount then
    -- partial payment — do NOT flip status; only record trace in metadata
    update public.invoices
      set metadata = coalesce(metadata, '{}'::jsonb)
                     || jsonb_build_object('partial_payments',
                          coalesce(metadata -> 'partial_payments', '[]'::jsonb) ||
                          jsonb_build_array(jsonb_build_object(
                            'amount', target_amount,
                            'paid_at', to_char(target_paid_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                            'extra', coalesce(target_metadata, '{}'::jsonb)
                          )))
    where id = target_invoice_id
      and organization_id = target_organization_id
      and status in ('ISSUED', 'OVERDUE');

    get diagnostics affected = row_count;

    if affected = 1 then
      perform public.record_audit_log(
        target_organization_id, 'invoice.partial_payment',
        'invoice', target_invoice_id,
        jsonb_build_object('amount', target_amount, 'invoice_amount', invoice_amount)
      );
    end if;
    return affected = 1;
  end if;

  -- full payment
  update public.invoices
    set status   = 'PAID',
        paid_at  = target_paid_at,
        metadata = coalesce(metadata, '{}'::jsonb) || coalesce(target_metadata, '{}'::jsonb)
  where id = target_invoice_id
    and organization_id = target_organization_id
    and status in ('ISSUED', 'OVERDUE');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'invoice.pay',
      'invoice', target_invoice_id,
      jsonb_build_object('amount', target_amount,
                         'paid_at', to_char(target_paid_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_invoice_payment(uuid, uuid, numeric, timestamptz, jsonb) from public, anon;
grant execute on function public.record_invoice_payment(uuid, uuid, numeric, timestamptz, jsonb) to authenticated, service_role;

-- =========================================================================
-- mark_invoice_overdue — ISSUED → OVERDUE (deterministic, idempotent)
-- =========================================================================
-- Emits ONE BILLING attention_item per invoice (idempotency key on the
-- invoice id). Priority = HIGH when >= 60 days past due, NORMAL else.
-- Not AI. Rule = now() > due_at.
create or replace function public.mark_invoice_overdue(
  target_organization_id uuid,
  target_invoice_id      uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected      integer;
  invoice_row   public.invoices%rowtype;
  days_past_due integer;
  attention_priority text;
begin
  if not (
    private.is_organization_member(target_organization_id)
    or (select auth.role()) = 'service_role'
  ) then
    raise exception 'mark_invoice_overdue: caller is not authorized for organization %', target_organization_id
      using errcode = '42501';
  end if;

  select * into invoice_row
  from public.invoices
  where id = target_invoice_id
    and organization_id = target_organization_id;

  if invoice_row.id is null then
    return false;
  end if;
  if invoice_row.status <> 'ISSUED' then
    return false;
  end if;
  if invoice_row.due_at is null or invoice_row.due_at >= now() then
    return false;
  end if;

  update public.invoices
    set status = 'OVERDUE'
  where id = target_invoice_id
    and organization_id = target_organization_id
    and status = 'ISSUED';

  get diagnostics affected = row_count;

  if affected = 1 then
    days_past_due := greatest(0, extract(day from now() - invoice_row.due_at)::integer);
    attention_priority := case when days_past_due >= 60 then 'HIGH' else 'NORMAL' end;

    perform public.insert_attention_once(
      target_organization_id,
      'attention:invoice_overdue:' || target_invoice_id::text,
      'BILLING',
      'INVOICE_OVERDUE',
      format('Facture en retard (%s j)', days_past_due),
      attention_priority,
      'invoice',
      target_invoice_id,
      format('Facture %s en retard de %s jours (%s %s). Décider : relance manuelle, litige, ou write-off.',
             coalesce(invoice_row.external_ref, target_invoice_id::text),
             days_past_due, invoice_row.amount, invoice_row.currency),
      'Relance client, ou escalader si retard > 60 jours.',
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
      target_organization_id, 'invoice.mark_overdue',
      'invoice', target_invoice_id,
      jsonb_build_object('days_past_due', days_past_due)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_invoice_overdue(uuid, uuid) from public, anon;
grant execute on function public.mark_invoice_overdue(uuid, uuid) to authenticated, service_role;

comment on function public.mark_invoice_overdue(uuid, uuid) is
  'Transition ISSUED → OVERDUE when now() > due_at. Idempotent. Emits ONE BILLING attention per invoice. Priority HIGH when ≥60 days past due. NOT AI — deterministic rule.';

-- =========================================================================
-- record_dunning_reminder — track a manual reminder send + escalate
-- =========================================================================
-- Sender must be an ACTIVE org member (separation-of-duties audit).
-- Stage 1/2/3 increments reminder_stage; stage 3 sets final_notice_sent_at
-- and escalates the existing INVOICE_OVERDUE attention to HIGH via a
-- second insert_attention_once with a distinct idempotency key.
create or replace function public.record_dunning_reminder(
  target_organization_id uuid,
  target_invoice_id      uuid,
  target_stage           integer,
  target_sent_by_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  invoice_row public.invoices%rowtype;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'record_dunning_reminder: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_stage is null or target_stage not in (1, 2, 3) then
    raise exception 'record_dunning_reminder: stage must be 1, 2, or 3 (got %)', target_stage
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_sent_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'record_dunning_reminder: sender % is not an ACTIVE member of organization %',
      target_sent_by_user_id, target_organization_id
      using errcode = '42501';
  end if;

  select * into invoice_row
  from public.invoices
  where id = target_invoice_id
    and organization_id = target_organization_id;

  if invoice_row.id is null then
    return false;
  end if;
  if invoice_row.status not in ('ISSUED', 'OVERDUE') then
    return false;
  end if;
  if target_stage <= invoice_row.reminder_stage then
    -- do not regress; caller can inspect the row and re-issue the same stage explicitly
    return false;
  end if;

  update public.invoices
    set reminder_stage        = target_stage,
        reminder_last_sent_at = now(),
        final_notice_sent_at  = case when target_stage = 3 then now() else final_notice_sent_at end
  where id = target_invoice_id
    and organization_id = target_organization_id;

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id,
      case when target_stage = 3 then 'invoice.dunning_final_notice' else 'invoice.dunning_reminder' end,
      'invoice', target_invoice_id,
      jsonb_build_object('stage', target_stage, 'sent_by_user_id', target_sent_by_user_id)
    );

    if target_stage = 3 then
      perform public.insert_attention_once(
        target_organization_id,
        'attention:invoice_final_notice:' || target_invoice_id::text,
        'BILLING',
        'INVOICE_FINAL_NOTICE_SENT',
        'Facture — dernier avis envoyé',
        'HIGH',
        'invoice',
        target_invoice_id,
        format('Dernier avis envoyé pour la facture %s (%s %s). Décider : recouvrement, litige, ou write-off.',
               coalesce(invoice_row.external_ref, target_invoice_id::text),
               invoice_row.amount, invoice_row.currency),
        'Escalader vers recouvrement ou décider d''un write-off.',
        null, null,
        jsonb_build_object(
          'invoice_id', target_invoice_id,
          'external_ref', invoice_row.external_ref,
          'amount', invoice_row.amount,
          'currency', invoice_row.currency
        )
      );
    end if;
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_dunning_reminder(uuid, uuid, integer, uuid) from public, anon;
grant execute on function public.record_dunning_reminder(uuid, uuid, integer, uuid) to authenticated, service_role;

comment on function public.record_dunning_reminder(uuid, uuid, integer, uuid) is
  'Track a manual dunning reminder send (stages 1/2/3). Sender must be ACTIVE org member. Stage cannot regress. Stage 3 = final notice — emits HIGH BILLING attention.';

-- =========================================================================
-- overdue_invoices — read function for dunning candidates
-- =========================================================================
create or replace function public.overdue_invoices(
  target_organization_id uuid,
  target_min_days_past_due integer
)
returns table (
  invoice_id      uuid,
  customer_id     uuid,
  external_ref    text,
  amount          numeric,
  currency        text,
  issued_at       timestamptz,
  due_at          timestamptz,
  days_past_due   integer,
  reminder_stage  integer,
  reminder_last_sent_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'overdue_invoices: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_min_days_past_due is null or target_min_days_past_due < 0 then
    raise exception 'overdue_invoices: min_days_past_due must be >= 0 (got %)', target_min_days_past_due
      using errcode = '22023';
  end if;

  return query
  select
    i.id,
    i.customer_id,
    i.external_ref,
    i.amount,
    i.currency,
    i.issued_at,
    i.due_at,
    greatest(0, extract(day from now() - i.due_at)::integer),
    i.reminder_stage,
    i.reminder_last_sent_at
  from public.invoices i
  where i.organization_id = target_organization_id
    and i.status = 'OVERDUE'
    and i.due_at is not null
    and now() - i.due_at >= make_interval(days => target_min_days_past_due)
  order by i.due_at asc;
end;
$$;

revoke all on function public.overdue_invoices(uuid, integer) from public, anon;
grant execute on function public.overdue_invoices(uuid, integer) to authenticated, service_role;

comment on function public.overdue_invoices(uuid, integer) is
  'List OVERDUE invoices past a minimum days-past-due threshold. Read-only. Feeds the dunning UI + attention triage.';
