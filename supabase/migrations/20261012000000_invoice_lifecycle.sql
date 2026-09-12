-- SESIRA Core Workflow — Invoice lifecycle: deposit/final invoices,
-- line items, payment tracking, Factur-X status (C47).
--
-- Extends `invoices` (invoice_kind, parent_invoice_id) and
-- `einvoicing_submissions` (facturx_status). Adds `invoice_line_items`
-- and `payment_records`.
--
-- Reference: docs/core/CORE_EXTENSIONS_PLAN.md §7 C47.
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   SESIRA never touches funds (INV-05):
--     * payment_records source ∈ MANUAL | ACCOUNTING_PROVIDER — never
--       SESIRA-initiated. MANUAL is an operator recording what the
--       customer paid; ACCOUNTING_PROVIDER is a webhook echo from
--       the real accounting/ERP system.
--     * SESIRA never triggers a bank transfer. reconcile_payment is
--       service_role (webhook path). record_payment MANUAL requires an
--       ACTIVE org member.
--
--   Currency uniformity per allocation:
--     * A payment can only allocate to an invoice sharing its currency.
--       Guard enforced in record_payment RPC (payment.currency =
--       invoice.currency, else 22023).
--
--   REVERSED preserved (never DELETE):
--     * reverse_payment flips status RECORDED/CONFIRMED → REVERSED and
--       keeps the row for audit. No DELETE path.
--
--   Overpayment forbidden by default:
--     * Sum(CONFIRMED payments on invoice) may not exceed invoice.amount.
--       An `allow_overpayment` org-level flag can be introduced later;
--       for now the guard is strict.
--     * When Sum(CONFIRMED) >= invoice.amount, invoices.status →
--       PAID + paid_at stamped (via the RPC that ties allocation to
--       reconciliation).
--
--   Factur-X honest status:
--     * facturx_status ∈ NOT_APPLICABLE | PREPARING | READY |
--       VALIDATION_FAILED | EXPORTED.
--     * READY = ready to be embedded in the exported PDF/A-3; EXPORTED
--       = a real PDF/A-3 file has been produced. VALIDATION_FAILED is
--       explicit (never elided into EXPORTED).
--
--   Deposit / final ties + line items:
--     * DEPOSIT and FINAL invoices link back to the parent (opportunity/
--       contract invoice) via parent_invoice_id.
--     * invoice_line_items is required for Factur-X (CII XML embed).
--       ordinal unique per invoice, VAT rate + totals stored per line.
--
-- Non-goals (deferred):
--   * Multi-payment allocation split across invoices (single-invoice
--     allocation for this milestone). A `payment_allocations` table can
--     land later if the need appears.
--   * PDF/A-3 generation itself — the migration only stores the READY
--     / EXPORTED status; the PDF builder is a TS-side concern.

-- =========================================================================
-- Section 1 — extend invoices with invoice_kind + parent_invoice_id
-- =========================================================================
alter table public.invoices
  add column invoice_kind text not null default 'STANDARD'
    check (invoice_kind in ('STANDARD', 'DEPOSIT', 'FINAL', 'CREDIT_NOTE'));
alter table public.invoices
  add column parent_invoice_id uuid;

alter table public.invoices
  add constraint invoices_parent_composite_fk
  foreign key (parent_invoice_id, organization_id)
  references public.invoices(id, organization_id)
  on delete set null;

create index invoices_org_kind_idx on public.invoices (organization_id, invoice_kind);
create index invoices_org_parent_idx on public.invoices (organization_id, parent_invoice_id)
  where parent_invoice_id is not null;

comment on column public.invoices.invoice_kind is
  'STANDARD | DEPOSIT | FINAL | CREDIT_NOTE. DEPOSIT and FINAL reference a parent via parent_invoice_id (typically the contract invoice). CREDIT_NOTE references the invoice it credits.';

-- =========================================================================
-- Section 2 — extend einvoicing_submissions with facturx_status
-- =========================================================================
alter table public.einvoicing_submissions
  add column facturx_status text not null default 'NOT_APPLICABLE'
    check (facturx_status in ('NOT_APPLICABLE', 'PREPARING', 'READY', 'VALIDATION_FAILED', 'EXPORTED'));

comment on column public.einvoicing_submissions.facturx_status is
  'Factur-X (PDF/A-3 + CII XML embedded) status. NOT_APPLICABLE for non-Factur-X submissions. VALIDATION_FAILED is explicit — never elide into EXPORTED. EXPORTED requires an actual PDF/A-3 produced by the TS builder.';

-- =========================================================================
-- Section 3 — invoice_line_items
-- =========================================================================
create table public.invoice_line_items (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references public.invoices(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ordinal        integer not null check (ordinal between 1 and 500),
  label          text not null check (length(label) between 1 and 200),
  description    text check (description is null or length(description) <= 2000),
  quantity       numeric(12, 3) not null check (quantity >= 0),
  unit           text not null default 'unit' check (length(unit) between 1 and 20),
  unit_price     numeric(14, 4) not null check (unit_price >= 0),
  vat_rate       numeric(5, 2) not null default 20 check (vat_rate >= 0 and vat_rate <= 100),
  total_ht       numeric(14, 2) not null check (total_ht >= 0),
  total_ttc      numeric(14, 2) not null check (total_ttc >= 0),
  metadata       jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at     timestamptz not null default now(),
  foreign key (invoice_id, organization_id) references public.invoices(id, organization_id) on delete cascade,
  unique (invoice_id, ordinal)
);

comment on table public.invoice_line_items is
  'Line items for an invoice. Required for Factur-X (CII XML embed). Amounts total_ht / total_ttc denormalized for reporting; the TS builder is responsible for recomputing on emit.';

create index ili_org_invoice_idx on public.invoice_line_items (organization_id, invoice_id, ordinal);

alter table public.invoice_line_items enable row level security;

create policy ili_select on public.invoice_line_items
  for select to authenticated using (private.is_organization_member(organization_id));
create policy ili_insert on public.invoice_line_items
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy ili_update on public.invoice_line_items
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.invoice_line_items to authenticated;
grant select, insert, update, delete on public.invoice_line_items to service_role;

-- =========================================================================
-- Section 4 — payment_records
-- =========================================================================
create table public.payment_records (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  invoice_id            uuid not null,
  amount                numeric(14, 2) not null check (amount > 0),
  currency              text not null check (char_length(currency) = 3),
  received_at           timestamptz not null,
  method                text not null check (method in ('WIRE', 'CARD', 'CASH', 'CHECK', 'OTHER')),
  source                text not null check (source in ('MANUAL', 'ACCOUNTING_PROVIDER')),
  external_ref          text check (external_ref is null or length(external_ref) between 1 and 200),
  status                text not null default 'RECORDED'
    check (status in ('RECORDED', 'CONFIRMED', 'REVERSED')),
  evidence_document_id  uuid,
  note                  text check (note is null or length(note) <= 2000),
  created_by_user_id    uuid not null,
  reversed_at           timestamptz,
  reversal_reason       text check (reversal_reason is null or length(reversal_reason) <= 500),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (invoice_id, organization_id) references public.invoices(id, organization_id) on delete restrict,
  foreign key (evidence_document_id, organization_id) references public.documents(id, organization_id) on delete set null
);

comment on table public.payment_records is
  'One row per payment observation. source=MANUAL is an operator recording; source=ACCOUNTING_PROVIDER is a webhook echo from the real accounting/ERP. SESIRA never triggers a bank transfer (INV-05). REVERSED preserved for audit — never DELETE.';

create unique index pr_org_external_ref_uniq on public.payment_records
  (organization_id, external_ref)
  where external_ref is not null;
create index pr_org_invoice_status_idx on public.payment_records
  (organization_id, invoice_id, status);

alter table public.payment_records enable row level security;

create policy pr_select on public.payment_records
  for select to authenticated using (private.is_organization_member(organization_id));
create policy pr_insert on public.payment_records
  for insert to authenticated with check (private.is_organization_member(organization_id));
create policy pr_update on public.payment_records
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.payment_records to authenticated;
grant select, insert, update on public.payment_records to service_role;

-- =========================================================================
-- Section 5 — prepare_deposit_invoice + prepare_final_invoice RPCs
-- =========================================================================
create or replace function public.prepare_deposit_invoice(
  target_organization_id uuid,
  target_customer_id     uuid,
  target_parent_invoice_id uuid,
  target_amount          numeric,
  target_currency        text,
  target_external_ref    text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_row public.invoices%rowtype;
  new_id     uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'prepare_deposit_invoice: caller not authorized'
      using errcode = '42501';
  end if;
  if target_amount is null or target_amount <= 0 then
    raise exception 'prepare_deposit_invoice: amount must be > 0'
      using errcode = '22023';
  end if;
  if char_length(coalesce(target_currency, '')) <> 3 then
    raise exception 'prepare_deposit_invoice: currency must be a 3-letter ISO code'
      using errcode = '22023';
  end if;
  if target_parent_invoice_id is not null then
    select * into parent_row from public.invoices
      where id = target_parent_invoice_id
        and organization_id = target_organization_id;
    if parent_row.id is null then
      raise exception 'prepare_deposit_invoice: parent invoice % not found', target_parent_invoice_id
        using errcode = '22023';
    end if;
    if parent_row.currency <> target_currency then
      raise exception 'prepare_deposit_invoice: currency mismatch with parent (parent=% deposit=%)',
        parent_row.currency, target_currency
        using errcode = '22023';
    end if;
  end if;

  insert into public.invoices (
    organization_id, customer_id, amount, currency, status,
    invoice_kind, parent_invoice_id, external_ref
  ) values (
    target_organization_id, target_customer_id, target_amount, target_currency, 'DRAFT',
    'DEPOSIT', target_parent_invoice_id, target_external_ref
  )
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'invoice.prepare_deposit',
    'invoice', new_id,
    jsonb_build_object(
      'parent_invoice_id', target_parent_invoice_id,
      'amount', target_amount,
      'currency', target_currency
    )
  );
  return new_id;
end;
$$;

revoke all on function public.prepare_deposit_invoice(uuid, uuid, uuid, numeric, text, text) from public, anon;
grant execute on function public.prepare_deposit_invoice(uuid, uuid, uuid, numeric, text, text) to authenticated, service_role;

create or replace function public.prepare_final_invoice(
  target_organization_id uuid,
  target_customer_id     uuid,
  target_parent_invoice_id uuid,
  target_amount          numeric,
  target_currency        text,
  target_external_ref    text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_row public.invoices%rowtype;
  deposits_total numeric := 0;
  new_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'prepare_final_invoice: caller not authorized'
      using errcode = '42501';
  end if;
  if target_amount is null or target_amount <= 0 then
    raise exception 'prepare_final_invoice: amount must be > 0'
      using errcode = '22023';
  end if;
  if target_parent_invoice_id is null then
    raise exception 'prepare_final_invoice: parent_invoice_id required'
      using errcode = '22023';
  end if;

  select * into parent_row from public.invoices
    where id = target_parent_invoice_id
      and organization_id = target_organization_id;
  if parent_row.id is null then
    raise exception 'prepare_final_invoice: parent % not found', target_parent_invoice_id
      using errcode = '22023';
  end if;
  if parent_row.currency <> target_currency then
    raise exception 'prepare_final_invoice: currency mismatch with parent (parent=% final=%)',
      parent_row.currency, target_currency
      using errcode = '22023';
  end if;

  -- Sum non-CANCELLED deposits linked to same parent
  select coalesce(sum(amount), 0) into deposits_total
  from public.invoices
  where organization_id = target_organization_id
    and parent_invoice_id = target_parent_invoice_id
    and invoice_kind = 'DEPOSIT'
    and status <> 'CANCELLED';

  if (deposits_total + target_amount) > parent_row.amount then
    raise exception 'prepare_final_invoice: deposits (%) + final (%) exceed parent amount (%)',
      deposits_total, target_amount, parent_row.amount
      using errcode = '22023';
  end if;

  insert into public.invoices (
    organization_id, customer_id, amount, currency, status,
    invoice_kind, parent_invoice_id, external_ref
  ) values (
    target_organization_id, target_customer_id, target_amount, target_currency, 'DRAFT',
    'FINAL', target_parent_invoice_id, target_external_ref
  )
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'invoice.prepare_final',
    'invoice', new_id,
    jsonb_build_object(
      'parent_invoice_id', target_parent_invoice_id,
      'deposits_total', deposits_total,
      'amount', target_amount
    )
  );
  return new_id;
end;
$$;

revoke all on function public.prepare_final_invoice(uuid, uuid, uuid, numeric, text, text) from public, anon;
grant execute on function public.prepare_final_invoice(uuid, uuid, uuid, numeric, text, text) to authenticated, service_role;

-- =========================================================================
-- Section 6 — record_payment RPC (MANUAL only via authenticated; ACCOUNTING_PROVIDER service_role)
-- =========================================================================
create or replace function public.record_payment(
  target_organization_id     uuid,
  target_invoice_id          uuid,
  target_amount              numeric,
  target_currency            text,
  target_received_at         timestamptz,
  target_method              text,
  target_source              text,
  target_external_ref        text,
  target_evidence_document_id uuid,
  target_note                text,
  target_created_by_user_id  uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invoice_row public.invoices%rowtype;
  existing_id uuid;
  sum_confirmed numeric := 0;
  new_id      uuid;
begin
  if target_source = 'ACCOUNTING_PROVIDER' then
    if (select auth.role()) <> 'service_role' then
      raise exception 'record_payment: source=ACCOUNTING_PROVIDER requires service_role'
        using errcode = '42501';
    end if;
  else
    if not private.is_organization_member(target_organization_id) then
      raise exception 'record_payment: caller not authorized'
        using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.organization_members
      where organization_id = target_organization_id
        and user_id = target_created_by_user_id
        and status = 'ACTIVE'
    ) then
      raise exception 'record_payment: created_by % not ACTIVE member', target_created_by_user_id
        using errcode = '42501';
    end if;
  end if;

  if target_amount is null or target_amount <= 0 then
    raise exception 'record_payment: amount must be > 0'
      using errcode = '22023';
  end if;
  if target_method not in ('WIRE', 'CARD', 'CASH', 'CHECK', 'OTHER') then
    raise exception 'record_payment: invalid method %', target_method
      using errcode = '22023';
  end if;
  if target_source not in ('MANUAL', 'ACCOUNTING_PROVIDER') then
    raise exception 'record_payment: invalid source %', target_source
      using errcode = '22023';
  end if;

  select * into invoice_row from public.invoices
    where id = target_invoice_id and organization_id = target_organization_id;
  if invoice_row.id is null then
    raise exception 'record_payment: invoice % not found', target_invoice_id
      using errcode = '22023';
  end if;
  if invoice_row.currency <> target_currency then
    raise exception 'record_payment: currency mismatch invoice=% payment=%',
      invoice_row.currency, target_currency
      using errcode = '22023';
  end if;

  -- Idempotency on external_ref
  if target_external_ref is not null then
    select id into existing_id from public.payment_records
      where organization_id = target_organization_id
        and external_ref = target_external_ref;
    if existing_id is not null then
      return existing_id;
    end if;
  end if;

  -- Overpayment guard: sum of CONFIRMED (incl. this new one if source=ACCOUNTING_PROVIDER
  -- lands directly CONFIRMED) may not exceed invoice.amount.
  select coalesce(sum(amount), 0) into sum_confirmed
  from public.payment_records
  where organization_id = target_organization_id
    and invoice_id = target_invoice_id
    and status = 'CONFIRMED';

  if (sum_confirmed + target_amount) > invoice_row.amount then
    raise exception 'record_payment: overpayment blocked (sum_confirmed=% + amount=% > invoice_amount=%)',
      sum_confirmed, target_amount, invoice_row.amount
      using errcode = '22023';
  end if;

  insert into public.payment_records (
    organization_id, invoice_id, amount, currency, received_at, method, source,
    external_ref, status, evidence_document_id, note, created_by_user_id
  ) values (
    target_organization_id, target_invoice_id, target_amount, target_currency,
    target_received_at, target_method, target_source, target_external_ref,
    case when target_source = 'ACCOUNTING_PROVIDER' then 'CONFIRMED' else 'RECORDED' end,
    target_evidence_document_id, target_note, target_created_by_user_id
  )
  returning id into new_id;

  perform public.record_audit_log(
    target_organization_id, 'payment.record',
    'payment_record', new_id,
    jsonb_build_object(
      'invoice_id', target_invoice_id,
      'amount', target_amount,
      'source', target_source,
      'method', target_method
    )
  );

  -- If auto-confirmed (ACCOUNTING_PROVIDER), check if invoice → PAID
  if target_source = 'ACCOUNTING_PROVIDER' and (sum_confirmed + target_amount) >= invoice_row.amount then
    update public.invoices
      set status = 'PAID', paid_at = coalesce(paid_at, now())
    where id = target_invoice_id
      and organization_id = target_organization_id
      and status <> 'CANCELLED';
  end if;

  return new_id;
end;
$$;

revoke all on function public.record_payment(uuid, uuid, numeric, text, timestamptz, text, text, text, uuid, text, uuid) from public, anon;
grant execute on function public.record_payment(uuid, uuid, numeric, text, timestamptz, text, text, text, uuid, text, uuid) to authenticated, service_role;

-- =========================================================================
-- Section 7 — reconcile_payment RPC (service_role — RECORDED → CONFIRMED)
-- =========================================================================
create or replace function public.reconcile_payment(
  target_organization_id uuid,
  target_payment_id      uuid,
  target_external_ref    text,
  target_provider_confirmed_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_before   public.payment_records%rowtype;
  invoice_row  public.invoices%rowtype;
  sum_after    numeric;
  affected     integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'reconcile_payment: service_role required'
      using errcode = '42501';
  end if;

  select * into row_before from public.payment_records
    where id = target_payment_id and organization_id = target_organization_id;
  if row_before.id is null then
    raise exception 'reconcile_payment: payment % not found', target_payment_id
      using errcode = '22023';
  end if;
  if row_before.status <> 'RECORDED' then
    return false;
  end if;

  update public.payment_records
    set status       = 'CONFIRMED',
        external_ref = coalesce(external_ref, target_external_ref)
  where id = target_payment_id and organization_id = target_organization_id and status = 'RECORDED';
  get diagnostics affected = row_count;
  if affected <> 1 then
    return false;
  end if;

  perform public.record_audit_log(
    target_organization_id, 'payment.reconcile',
    'payment_record', target_payment_id,
    jsonb_build_object('external_ref', target_external_ref)
  );

  -- Update invoice status if fully paid
  select * into invoice_row from public.invoices
    where id = row_before.invoice_id and organization_id = target_organization_id;
  select coalesce(sum(amount), 0) into sum_after
  from public.payment_records
  where organization_id = target_organization_id
    and invoice_id = row_before.invoice_id
    and status = 'CONFIRMED';
  if sum_after >= invoice_row.amount then
    update public.invoices
      set status = 'PAID', paid_at = coalesce(paid_at, now())
    where id = row_before.invoice_id and organization_id = target_organization_id and status <> 'CANCELLED';
  end if;

  return true;
end;
$$;

revoke all on function public.reconcile_payment(uuid, uuid, text, timestamptz) from public, anon;
grant execute on function public.reconcile_payment(uuid, uuid, text, timestamptz) to service_role;

-- =========================================================================
-- Section 8 — reverse_payment RPC (CONFIRMED → REVERSED; row preserved)
-- =========================================================================
create or replace function public.reverse_payment(
  target_organization_id uuid,
  target_payment_id      uuid,
  target_reason          text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_before public.payment_records%rowtype;
  invoice_row public.invoices%rowtype;
  sum_after   numeric;
  affected    integer;
begin
  if not private.is_organization_member(target_organization_id)
     and (select auth.role()) <> 'service_role' then
    raise exception 'reverse_payment: caller not authorized'
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 500 then
    raise exception 'reverse_payment: reason required (1..500)'
      using errcode = '22023';
  end if;

  select * into row_before from public.payment_records
    where id = target_payment_id and organization_id = target_organization_id;
  if row_before.id is null then
    raise exception 'reverse_payment: payment % not found', target_payment_id
      using errcode = '22023';
  end if;
  if row_before.status = 'REVERSED' then
    return false;
  end if;
  if row_before.status not in ('RECORDED', 'CONFIRMED') then
    raise exception 'reverse_payment: cannot reverse payment in status %', row_before.status
      using errcode = '22023';
  end if;

  update public.payment_records
    set status         = 'REVERSED',
        reversed_at    = now(),
        reversal_reason = target_reason
  where id = target_payment_id
    and organization_id = target_organization_id
    and status in ('RECORDED', 'CONFIRMED');
  get diagnostics affected = row_count;

  perform public.record_audit_log(
    target_organization_id, 'payment.reverse',
    'payment_record', target_payment_id,
    jsonb_build_object('reason', target_reason, 'previous_status', row_before.status)
  );

  perform public.insert_attention_once(
    target_organization_id,
    'attention:payment_reversed:' || target_payment_id::text,
    'FINANCIAL',
    'PAYMENT_REVERSED',
    'Paiement inversé',
    'HIGH',
    'payment_record', target_payment_id,
    target_reason,
    'Vérifier l''état de la facture liée.',
    null, null, '{}'::jsonb
  );

  -- If invoice was PAID and reversal drops sum_confirmed below amount, revert
  select * into invoice_row from public.invoices
    where id = row_before.invoice_id and organization_id = target_organization_id;
  if invoice_row.status = 'PAID' then
    select coalesce(sum(amount), 0) into sum_after
    from public.payment_records
    where organization_id = target_organization_id
      and invoice_id = row_before.invoice_id
      and status = 'CONFIRMED';
    if sum_after < invoice_row.amount then
      update public.invoices
        set status = 'ISSUED', paid_at = null
      where id = row_before.invoice_id and organization_id = target_organization_id;
    end if;
  end if;

  return affected = 1;
end;
$$;

revoke all on function public.reverse_payment(uuid, uuid, text) from public, anon;
grant execute on function public.reverse_payment(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- Section 9 — prepare_facturx + mark_facturx_exported
-- =========================================================================
create or replace function public.prepare_facturx(
  target_organization_id uuid,
  target_submission_id   uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub_row public.einvoicing_submissions%rowtype;
  line_count integer;
  new_status text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'prepare_facturx: caller not authorized'
      using errcode = '42501';
  end if;

  select * into sub_row from public.einvoicing_submissions
    where id = target_submission_id and organization_id = target_organization_id;
  if sub_row.id is null then
    raise exception 'prepare_facturx: submission % not found', target_submission_id
      using errcode = '22023';
  end if;

  select count(*) into line_count from public.invoice_line_items
    where invoice_id = sub_row.invoice_id
      and organization_id = target_organization_id;
  new_status := case
    when line_count = 0 then 'VALIDATION_FAILED'
    else 'READY'
  end;

  update public.einvoicing_submissions
    set facturx_status = new_status,
        format = case when new_status = 'READY' then 'FACTUR_X' else format end
  where id = target_submission_id
    and organization_id = target_organization_id;

  perform public.record_audit_log(
    target_organization_id, 'facturx.prepare',
    'einvoicing_submission', target_submission_id,
    jsonb_build_object('facturx_status', new_status, 'line_count', line_count)
  );

  if new_status = 'VALIDATION_FAILED' then
    perform public.insert_attention_once(
      target_organization_id,
      'attention:facturx_validation_failed:' || target_submission_id::text,
      'FINANCIAL',
      'FACTURX_VALIDATION_FAILED',
      'Facturation électronique invalide',
      'HIGH',
      'einvoicing_submission', target_submission_id,
      'Aucune ligne de facturation présente.',
      'Ajouter les lignes de facture avant de préparer Factur-X.',
      null, null, '{}'::jsonb
    );
  end if;

  return new_status;
end;
$$;

revoke all on function public.prepare_facturx(uuid, uuid) from public, anon;
grant execute on function public.prepare_facturx(uuid, uuid) to authenticated, service_role;

create or replace function public.mark_facturx_exported(
  target_organization_id uuid,
  target_submission_id   uuid,
  target_exported_at     timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'mark_facturx_exported: service_role required'
      using errcode = '42501';
  end if;
  update public.einvoicing_submissions
    set facturx_status = 'EXPORTED',
        exported_at = coalesce(exported_at, target_exported_at)
  where id = target_submission_id
    and organization_id = target_organization_id
    and facturx_status = 'READY';
  get diagnostics affected = row_count;
  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'facturx.exported',
      'einvoicing_submission', target_submission_id,
      jsonb_build_object('exported_at', to_char(target_exported_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_facturx_exported(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.mark_facturx_exported(uuid, uuid, timestamptz) to service_role;
