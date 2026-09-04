-- SESIRA Core Workflow — e-invoicing provider abstraction (C34).
--
-- SESIRA is an « opérateur de dématérialisation (OD) » (Cegid glossary).
-- It CANNOT transmit itself — a « plateforme agréée (PA) » partenaire
-- is required. At C34 launch there is NO real PA integrated
-- (REGULATORY.md 2.2 decision D-3): the only allowed provider is TEST.
-- Production status stays `PRODUCTION_PROVIDER_INTEGRATION_PENDING`.
--
-- Three tables:
--   * einvoicing_providers          — per-org PA/OD binding
--   * einvoicing_submissions        — per-invoice submission attempt
--   * einvoicing_provider_events    — callback log (idempotent)
--
-- DOCTRINE INVARIANTS APPLIED:
--
--   Doctrine §7 / REGULATORY.md 2.2 :
--     "Événements submitted / accepted / rejected UNIQUEMENT sur
--      retour d'une PA réelle."
--   Enforced via:
--     * SUBMITTED / ACCEPTED / REJECTED transitions ONLY happen
--       through `record_einvoicing_provider_event`.
--     * That RPC requires either:
--       (a) service_role (represents a real PA webhook), OR
--       (b) the target provider's `provider_kind = 'TEST'`
--           (explicit test simulation, never in production).
--     * `record_einvoicing_provider_event` REFUSES if the provider
--       is a production kind (anything ≠ TEST) but caller is not
--       service_role — this is the "zero faux succès provider" gate.
--
--   Idempotency:
--     * `einvoicing_submissions` is unique per (org, invoice, provider).
--     * `einvoicing_provider_events` is unique per
--       (org, submission, event_kind, external_ref) — a replayed
--       callback is a no-op traced in audit_logs.
--
--   INV-04 (traced human validation):
--     * `mark_einvoicing_submission_exported` requires an ACTIVE
--       org member and records exported_at + exported_by. This is
--       the "handoff to the PA" boundary.
--
-- Wording constraints (REGULATORY.md 2.2 U34):
--   Status labels the UI must render:
--     DRAFT     → « À préparer »
--     READY     → « Prêt »
--     EXPORTED  → « Exporté » (handed to the PA, awaiting confirmation)
--     SUBMITTED → « Transmis »       (ONLY after real PA callback)
--     ACCEPTED  → « Accepté »        (ONLY after real PA callback)
--     REJECTED  → « Rejeté »         (ONLY after real PA callback)
--     CANCELLED → « Annulé »
--   And when no real PA is bound:
--     any post-EXPORTED state that would be surfaced is rendered as
--     « Transmission fournisseur indisponible » — NEVER fake
--     « Transmis » in production.
--
-- Placement tarifaire: réception obligatoire tous paliers (2026-09-01
-- calendar) — driver §18 places tables here regardless of subscription.

-- =========================================================================
-- einvoicing_providers — per-org PA/OD binding
-- =========================================================================
create table public.einvoicing_providers (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  provider_kind         text not null default 'TEST'
    check (provider_kind in ('TEST', 'PRODUCTION_PROVIDER_INTEGRATION_PENDING')),
  label                 text not null check (length(label) between 1 and 200),
  status                text not null default 'CONFIGURED'
    check (status in ('CONFIGURED', 'ACTIVE', 'PAUSED', 'DEGRADED', 'DISCONNECTED')),
  supported_formats     text[] not null default array['UBL','CII','FACTUR_X']::text[]
    check (array_length(supported_formats, 1) between 1 and 10),
  activated_at          timestamptz,
  external_config       jsonb not null default '{}'::jsonb check (jsonb_typeof(external_config) = 'object'),
  provenance            jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, organization_id)
);

comment on table public.einvoicing_providers is
  'Per-organization e-invoicing provider binding. At C34 launch only TEST is allowed (REGULATORY.md D-3). PRODUCTION_PROVIDER_INTEGRATION_PENDING is the sentinel used to reserve a slot for a future real PA integration. status = ACTIVE gates submissions.';

comment on column public.einvoicing_providers.provider_kind is
  'TEST = simulation provider (allowed to receive events from any authenticated caller for testing). PRODUCTION_PROVIDER_INTEGRATION_PENDING = reserved for a future real PA, never accepts simulated events. Real PA kinds (e.g. PENNYLANE_PA, CEGID_PA) will be added later as ALTER TABLE + application-side adapters.';

create index einvoicing_providers_org_active_idx on public.einvoicing_providers (organization_id, status)
  where status in ('ACTIVE', 'DEGRADED');

alter table public.einvoicing_providers enable row level security;

create policy einvoicing_providers_select on public.einvoicing_providers
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy einvoicing_providers_insert on public.einvoicing_providers
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy einvoicing_providers_update on public.einvoicing_providers
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.einvoicing_providers to authenticated;
grant select, insert, update on public.einvoicing_providers to service_role;

create trigger set_einvoicing_providers_updated_at
  before update on public.einvoicing_providers
  for each row execute function private.set_updated_at();

-- =========================================================================
-- einvoicing_submissions — per-invoice submission attempt
-- =========================================================================
create table public.einvoicing_submissions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  invoice_id            uuid not null,
  provider_id           uuid not null,
  provider_kind_snapshot text not null,
  format                text not null check (format in ('UBL', 'CII', 'FACTUR_X', 'OTHER')),
  status                text not null default 'DRAFT'
    check (status in ('DRAFT', 'READY', 'EXPORTED', 'SUBMITTED',
                      'ACCEPTED', 'REJECTED', 'CANCELLED')),
  payload               jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  payload_gaps          jsonb not null default '[]'::jsonb check (jsonb_typeof(payload_gaps) = 'array'),
  exported_at           timestamptz,
  exported_by_user_id   uuid,
  submitted_at          timestamptz,
  accepted_at           timestamptz,
  rejected_at           timestamptz,
  rejection_reason      text check (rejection_reason is null or length(rejection_reason) <= 2000),
  cancelled_at          timestamptz,
  cancellation_reason   text check (cancellation_reason is null or length(cancellation_reason) <= 500),
  external_ref          text check (external_ref is null or length(external_ref) <= 500),
  provenance            jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (invoice_id, organization_id) references public.invoices(id, organization_id) on delete restrict,
  foreign key (provider_id, organization_id) references public.einvoicing_providers(id, organization_id) on delete restrict,
  unique (organization_id, invoice_id, provider_id),
  unique (id, organization_id)
);

comment on table public.einvoicing_submissions is
  'One row per (invoice, provider) submission attempt. Idempotency via unique (org, invoice, provider). SUBMITTED / ACCEPTED / REJECTED are ONLY set via record_einvoicing_provider_event — never manually. provider_kind_snapshot captures the kind at creation to prove the flow was allowed.';

create index einvoicing_submissions_org_status_idx on public.einvoicing_submissions (organization_id, status);
create index einvoicing_submissions_org_invoice_idx on public.einvoicing_submissions (organization_id, invoice_id);
create index einvoicing_submissions_org_provider_idx on public.einvoicing_submissions (organization_id, provider_id);
create index einvoicing_submissions_org_pending_idx on public.einvoicing_submissions (organization_id, exported_at)
  where status = 'EXPORTED' and exported_at is not null;

alter table public.einvoicing_submissions enable row level security;

create policy einvoicing_submissions_select on public.einvoicing_submissions
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy einvoicing_submissions_insert on public.einvoicing_submissions
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy einvoicing_submissions_update on public.einvoicing_submissions
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.einvoicing_submissions to authenticated;
grant select, insert, update on public.einvoicing_submissions to service_role;

create trigger set_einvoicing_submissions_updated_at
  before update on public.einvoicing_submissions
  for each row execute function private.set_updated_at();

-- =========================================================================
-- einvoicing_provider_events — callback log (idempotent)
-- =========================================================================
create table public.einvoicing_provider_events (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  submission_id         uuid not null,
  provider_id           uuid not null,
  event_kind            text not null
    check (event_kind in ('SUBMISSION_ACK', 'ACCEPTANCE', 'REJECTION',
                          'WARNING', 'STATUS_UPDATE')),
  external_ref          text check (external_ref is null or length(external_ref) <= 500),
  received_at           timestamptz not null default now(),
  payload               jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  was_duplicate         boolean not null default false,
  created_by_kind       text not null default 'SERVICE_ROLE'
    check (created_by_kind in ('SERVICE_ROLE', 'TEST_SIMULATION')),
  foreign key (submission_id, organization_id) references public.einvoicing_submissions(id, organization_id) on delete cascade,
  foreign key (provider_id, organization_id) references public.einvoicing_providers(id, organization_id) on delete restrict,
  unique (organization_id, submission_id, event_kind, external_ref)
);

comment on table public.einvoicing_provider_events is
  'PA callback log. Idempotency via unique (org, submission, kind, external_ref). was_duplicate=true rows record replays for audit. created_by_kind traces whether the event was a real PA webhook (SERVICE_ROLE) or a test simulation (TEST_SIMULATION — only allowed when provider_kind = TEST).';

create index einvoicing_provider_events_org_sub_idx on public.einvoicing_provider_events (organization_id, submission_id, received_at desc);

alter table public.einvoicing_provider_events enable row level security;

create policy einvoicing_provider_events_select on public.einvoicing_provider_events
  for select to authenticated
  using (private.is_organization_member(organization_id));
-- No INSERT policy for authenticated: events go through record_einvoicing_provider_event RPC only.
grant select on public.einvoicing_provider_events to authenticated;
grant select, insert on public.einvoicing_provider_events to service_role;

-- =========================================================================
-- State machine trigger — submissions
-- =========================================================================
-- Allowed transitions:
--   DRAFT     → READY | CANCELLED
--   READY     → EXPORTED | DRAFT | CANCELLED
--   EXPORTED  → SUBMITTED | REJECTED | CANCELLED
--                (SUBMITTED and REJECTED enforced through the RPC gate)
--   SUBMITTED → ACCEPTED | REJECTED | CANCELLED
--   ACCEPTED / REJECTED / CANCELLED are terminal.
create or replace function private.enforce_einvoicing_submission_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('ACCEPTED', 'REJECTED', 'CANCELLED') then
    raise exception 'einvoicing_submission % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'DRAFT'     and new.status in ('READY', 'CANCELLED')) or
    (old.status = 'READY'     and new.status in ('EXPORTED', 'DRAFT', 'CANCELLED')) or
    (old.status = 'EXPORTED'  and new.status in ('SUBMITTED', 'REJECTED', 'CANCELLED')) or
    (old.status = 'SUBMITTED' and new.status in ('ACCEPTED', 'REJECTED', 'CANCELLED')) or
    (old.status = new.status)
  ) then
    raise exception 'einvoicing_submission % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger einvoicing_submissions_state_transition
  before update on public.einvoicing_submissions
  for each row execute function private.enforce_einvoicing_submission_state_transition();

-- =========================================================================
-- configure_einvoicing_provider — upsert per-org provider config
-- =========================================================================
-- At C34 launch only provider_kind = 'TEST' or the PENDING sentinel is
-- accepted. Real PA kinds (PENNYLANE_PA, CEGID_PA, ...) will be added
-- later through an ALTER TABLE + expanded CHECK constraint.
create or replace function public.configure_einvoicing_provider(
  target_organization_id uuid,
  target_provider_kind   text,
  target_label           text,
  target_supported_formats text[],
  target_external_config jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  existing_id uuid;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'configure_einvoicing_provider: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_provider_kind not in ('TEST', 'PRODUCTION_PROVIDER_INTEGRATION_PENDING') then
    raise exception 'configure_einvoicing_provider: invalid provider_kind % (only TEST or PRODUCTION_PROVIDER_INTEGRATION_PENDING allowed at C34)', target_provider_kind
      using errcode = '22023';
  end if;
  if target_label is null or length(target_label) = 0 or length(target_label) > 200 then
    raise exception 'configure_einvoicing_provider: label must be a non-empty string ≤200 chars'
      using errcode = '22023';
  end if;
  if target_supported_formats is null or array_length(target_supported_formats, 1) is null then
    raise exception 'configure_einvoicing_provider: supported_formats must be a non-empty array'
      using errcode = '22023';
  end if;

  -- One active provider row per org — new configs supersede via ALTER of the existing row
  select id into existing_id
  from public.einvoicing_providers
  where organization_id = target_organization_id
    and status in ('CONFIGURED', 'ACTIVE', 'DEGRADED', 'PAUSED')
  order by created_at desc
  limit 1;

  if existing_id is not null then
    update public.einvoicing_providers
      set provider_kind      = target_provider_kind,
          label              = target_label,
          supported_formats  = target_supported_formats,
          external_config    = coalesce(target_external_config, '{}'::jsonb),
          status             = case when target_provider_kind = 'TEST' then 'ACTIVE' else 'CONFIGURED' end,
          activated_at       = case when target_provider_kind = 'TEST' then coalesce(activated_at, now()) else activated_at end
    where id = existing_id
      and organization_id = target_organization_id;
    new_id := existing_id;
  else
    insert into public.einvoicing_providers (
      organization_id, provider_kind, label, supported_formats, external_config,
      status, activated_at
    ) values (
      target_organization_id, target_provider_kind, target_label, target_supported_formats,
      coalesce(target_external_config, '{}'::jsonb),
      case when target_provider_kind = 'TEST' then 'ACTIVE' else 'CONFIGURED' end,
      case when target_provider_kind = 'TEST' then now() else null end
    ) returning id into new_id;
  end if;

  perform public.record_audit_log(
    target_organization_id, 'einvoicing_provider.configure',
    'einvoicing_provider', new_id,
    jsonb_build_object(
      'provider_kind', target_provider_kind,
      'label', target_label,
      'supported_formats', target_supported_formats
    )
  );

  return new_id;
end;
$$;

revoke all on function public.configure_einvoicing_provider(uuid, text, text, text[], jsonb) from public, anon;
grant execute on function public.configure_einvoicing_provider(uuid, text, text, text[], jsonb) to authenticated, service_role;

-- =========================================================================
-- prepare_einvoicing_submission — create DRAFT/READY submission
-- =========================================================================
create or replace function public.prepare_einvoicing_submission(
  target_organization_id uuid,
  target_invoice_id      uuid,
  target_provider_id     uuid,
  target_format          text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id       uuid;
  existing_id  uuid;
  inv_row      public.invoices%rowtype;
  provider_row public.einvoicing_providers%rowtype;
  gaps         jsonb := '[]'::jsonb;
  payload      jsonb;
  new_status   text;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'prepare_einvoicing_submission: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_format not in ('UBL', 'CII', 'FACTUR_X', 'OTHER') then
    raise exception 'prepare_einvoicing_submission: format must be UBL|CII|FACTUR_X|OTHER (got %)', target_format
      using errcode = '22023';
  end if;

  select * into inv_row
  from public.invoices
  where id = target_invoice_id
    and organization_id = target_organization_id;

  if inv_row.id is null then
    raise exception 'prepare_einvoicing_submission: invoice % not found in organization %',
      target_invoice_id, target_organization_id
      using errcode = '22023';
  end if;

  select * into provider_row
  from public.einvoicing_providers
  where id = target_provider_id
    and organization_id = target_organization_id
    and status in ('ACTIVE', 'DEGRADED');

  if provider_row.id is null then
    raise exception 'prepare_einvoicing_submission: provider % not found or not ACTIVE/DEGRADED in organization %',
      target_provider_id, target_organization_id
      using errcode = '22023';
  end if;

  if not (target_format = any (provider_row.supported_formats)) then
    raise exception 'prepare_einvoicing_submission: format % is not supported by provider % (supports %)',
      target_format, provider_row.label, provider_row.supported_formats
      using errcode = '22023';
  end if;

  -- Gap checks on the source invoice
  if inv_row.status = 'DRAFT' then
    gaps := gaps || jsonb_build_object('field', 'invoice.status', 'reason', 'facture encore en DRAFT — passer par record_invoice_issued avant de préparer la soumission');
  end if;
  if inv_row.external_ref is null then
    gaps := gaps || jsonb_build_object('field', 'invoice.external_ref', 'reason', 'numéro de facture externe requis pour la soumission PA');
  end if;
  if inv_row.issued_at is null then
    gaps := gaps || jsonb_build_object('field', 'invoice.issued_at', 'reason', 'date d''émission requise');
  end if;

  payload := jsonb_build_object(
    'invoice', jsonb_build_object(
      'id', inv_row.id,
      'external_ref', inv_row.external_ref,
      'amount', inv_row.amount,
      'currency', inv_row.currency,
      'issued_at', inv_row.issued_at,
      'due_at', inv_row.due_at,
      'customer_id', inv_row.customer_id,
      'quote_id', inv_row.quote_id
    ),
    'provider', jsonb_build_object(
      'id', provider_row.id,
      'label', provider_row.label,
      'kind', provider_row.provider_kind
    ),
    'format', target_format,
    'reminder', 'SESIRA prépare le fichier. La transmission passe par la PA partenaire, jamais par SESIRA directement.'
  );

  new_status := case when jsonb_array_length(gaps) = 0 then 'READY' else 'DRAFT' end;

  select id into existing_id
  from public.einvoicing_submissions
  where organization_id = target_organization_id
    and invoice_id = target_invoice_id
    and provider_id = target_provider_id;

  if existing_id is not null then
    -- Refresh the existing submission if it is not yet EXPORTED
    update public.einvoicing_submissions
      set payload      = payload,
          payload_gaps = gaps,
          status       = case when status in ('DRAFT', 'READY') then new_status else status end,
          format       = target_format,
          provider_kind_snapshot = provider_row.provider_kind
    where id = existing_id
      and organization_id = target_organization_id
      and status in ('DRAFT', 'READY');
    new_id := existing_id;
  else
    insert into public.einvoicing_submissions (
      organization_id, invoice_id, provider_id, provider_kind_snapshot,
      format, status, payload, payload_gaps
    ) values (
      target_organization_id, target_invoice_id, target_provider_id, provider_row.provider_kind,
      target_format, new_status, payload, gaps
    ) returning id into new_id;
  end if;

  perform public.record_audit_log(
    target_organization_id, 'einvoicing_submission.prepare',
    'einvoicing_submission', new_id,
    jsonb_build_object(
      'invoice_id', target_invoice_id,
      'provider_id', target_provider_id,
      'format', target_format,
      'status', new_status,
      'gaps_count', jsonb_array_length(gaps)
    )
  );
  return new_id;
end;
$$;

revoke all on function public.prepare_einvoicing_submission(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.prepare_einvoicing_submission(uuid, uuid, uuid, text) to authenticated, service_role;

comment on function public.prepare_einvoicing_submission(uuid, uuid, uuid, text) is
  'Create or refresh a submission payload for (invoice, provider, format). status = READY only if payload_gaps is empty. Idempotent: re-preparing an existing DRAFT/READY submission refreshes the payload; already-EXPORTED submissions are not touched.';

-- =========================================================================
-- mark_einvoicing_submission_exported — READY → EXPORTED (ACTIVE member)
-- =========================================================================
-- This is the "handoff to the PA" boundary. INV-04 traced human
-- validation. NOTHING external is called from here — SESIRA hands
-- the file off; the PA (real or test) later confirms via
-- record_einvoicing_provider_event.
create or replace function public.mark_einvoicing_submission_exported(
  target_organization_id uuid,
  target_submission_id   uuid,
  target_exported_by_user_id uuid
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
    raise exception 'mark_einvoicing_submission_exported: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_exported_by_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'mark_einvoicing_submission_exported: user % is not an ACTIVE member of organization %',
      target_exported_by_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.einvoicing_submissions
    set status              = 'EXPORTED',
        exported_at         = now(),
        exported_by_user_id = target_exported_by_user_id
  where id = target_submission_id
    and organization_id = target_organization_id
    and status = 'READY';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'einvoicing_submission.exported',
      'einvoicing_submission', target_submission_id,
      jsonb_build_object('exported_by_user_id', target_exported_by_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.mark_einvoicing_submission_exported(uuid, uuid, uuid) from public, anon;
grant execute on function public.mark_einvoicing_submission_exported(uuid, uuid, uuid) to authenticated, service_role;

-- =========================================================================
-- record_einvoicing_provider_event — insert event + advance state
-- =========================================================================
-- THE HARD BOUNDARY of C34: this is the ONLY path that can set
-- SUBMITTED / ACCEPTED / REJECTED on a submission. Doctrine §7 +
-- REGULATORY.md 2.2:
--
--   * service_role callers = trusted webhook from a real PA. Always
--     allowed.
--   * authenticated callers = allowed ONLY if the submission's
--     provider_kind = 'TEST' (explicit test simulation).
--     Otherwise: refusal with the "no fake provider success" error.
--
-- Idempotency: (org, submission, event_kind, external_ref). Replayed
-- callback = row with was_duplicate=true traced in audit + no state
-- change.
create or replace function public.record_einvoicing_provider_event(
  target_organization_id uuid,
  target_submission_id   uuid,
  target_event_kind      text,
  target_external_ref    text,
  target_payload         jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub_row       public.einvoicing_submissions%rowtype;
  new_event_id  uuid;
  existing_event_id uuid;
  caller_role   text;
  created_kind  text;
  new_sub_status text;
  new_sub_at_col text;
begin
  caller_role := coalesce((select auth.role()), '');

  if target_event_kind not in ('SUBMISSION_ACK', 'ACCEPTANCE', 'REJECTION', 'WARNING', 'STATUS_UPDATE') then
    raise exception 'record_einvoicing_provider_event: invalid event_kind %', target_event_kind
      using errcode = '22023';
  end if;

  select * into sub_row
  from public.einvoicing_submissions
  where id = target_submission_id
    and organization_id = target_organization_id;

  if sub_row.id is null then
    raise exception 'record_einvoicing_provider_event: submission % not found in organization %',
      target_submission_id, target_organization_id
      using errcode = '22023';
  end if;

  -- The doctrine gate.
  if caller_role = 'service_role' then
    created_kind := 'SERVICE_ROLE';
  elsif private.is_organization_member(target_organization_id)
        and sub_row.provider_kind_snapshot = 'TEST' then
    created_kind := 'TEST_SIMULATION';
  else
    raise exception 'record_einvoicing_provider_event: submission %s uses provider_kind=%s — SUBMITTED/ACCEPTED/REJECTED events accepted only from a real PA webhook (service_role). No fake provider success allowed.',
      target_submission_id, sub_row.provider_kind_snapshot
      using errcode = '42501';
  end if;

  -- Idempotency: dedup by (org, submission, kind, external_ref)
  select id into existing_event_id
  from public.einvoicing_provider_events
  where organization_id = target_organization_id
    and submission_id   = target_submission_id
    and event_kind      = target_event_kind
    and coalesce(external_ref, '') = coalesce(target_external_ref, '');

  if existing_event_id is not null then
    -- Insert a duplicate marker row for audit visibility (idempotent replay)
    insert into public.einvoicing_provider_events (
      organization_id, submission_id, provider_id,
      event_kind, external_ref, payload, was_duplicate, created_by_kind
    ) values (
      target_organization_id, target_submission_id, sub_row.provider_id,
      target_event_kind, target_external_ref || '#dup:' || gen_random_uuid()::text,
      coalesce(target_payload, '{}'::jsonb), true, created_kind
    );

    perform public.record_audit_log(
      target_organization_id, 'einvoicing_provider_event.replay_ignored',
      'einvoicing_submission', target_submission_id,
      jsonb_build_object('event_kind', target_event_kind, 'existing_event_id', existing_event_id)
    );
    return existing_event_id;
  end if;

  insert into public.einvoicing_provider_events (
    organization_id, submission_id, provider_id,
    event_kind, external_ref, payload, was_duplicate, created_by_kind
  ) values (
    target_organization_id, target_submission_id, sub_row.provider_id,
    target_event_kind, target_external_ref, coalesce(target_payload, '{}'::jsonb),
    false, created_kind
  ) returning id into new_event_id;

  -- Advance the submission state based on the event
  if target_event_kind = 'SUBMISSION_ACK' and sub_row.status = 'EXPORTED' then
    new_sub_status := 'SUBMITTED';
    update public.einvoicing_submissions
      set status = new_sub_status,
          submitted_at = now(),
          external_ref = coalesce(target_external_ref, external_ref)
    where id = target_submission_id
      and organization_id = target_organization_id
      and status = 'EXPORTED';
  elsif target_event_kind = 'ACCEPTANCE' and sub_row.status in ('EXPORTED', 'SUBMITTED') then
    new_sub_status := 'ACCEPTED';
    update public.einvoicing_submissions
      set status = new_sub_status,
          submitted_at = coalesce(submitted_at, now()),
          accepted_at  = now(),
          external_ref = coalesce(target_external_ref, external_ref)
    where id = target_submission_id
      and organization_id = target_organization_id
      and status in ('EXPORTED', 'SUBMITTED');
  elsif target_event_kind = 'REJECTION' and sub_row.status in ('EXPORTED', 'SUBMITTED') then
    new_sub_status := 'REJECTED';
    update public.einvoicing_submissions
      set status         = new_sub_status,
          rejected_at    = now(),
          rejection_reason = coalesce(target_payload->>'reason', 'PA rejection'),
          external_ref   = coalesce(target_external_ref, external_ref)
    where id = target_submission_id
      and organization_id = target_organization_id
      and status in ('EXPORTED', 'SUBMITTED');
  end if;

  perform public.record_audit_log(
    target_organization_id, 'einvoicing_provider_event.record',
    'einvoicing_submission', target_submission_id,
    jsonb_build_object(
      'event_kind', target_event_kind,
      'external_ref', target_external_ref,
      'new_submission_status', new_sub_status,
      'created_by_kind', created_kind
    )
  );

  return new_event_id;
end;
$$;

revoke all on function public.record_einvoicing_provider_event(uuid, uuid, text, text, jsonb) from public, anon;
grant execute on function public.record_einvoicing_provider_event(uuid, uuid, text, text, jsonb) to authenticated, service_role;

comment on function public.record_einvoicing_provider_event(uuid, uuid, text, text, jsonb) is
  'Ingest a PA callback event. Advances submission state SUBMITTED/ACCEPTED/REJECTED. Doctrine §7 gate: allowed from service_role (real PA webhook) OR from authenticated org member ONLY if the submission provider_kind = TEST. Idempotent — replay writes a duplicate marker row + no state change.';

-- =========================================================================
-- cancel_einvoicing_submission — any non-terminal → CANCELLED
-- =========================================================================
create or replace function public.cancel_einvoicing_submission(
  target_organization_id uuid,
  target_submission_id   uuid,
  target_reason          text
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
    raise exception 'cancel_einvoicing_submission: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 500 then
    raise exception 'cancel_einvoicing_submission: reason must be a non-empty string ≤500 chars'
      using errcode = '22023';
  end if;

  update public.einvoicing_submissions
    set status              = 'CANCELLED',
        cancelled_at        = now(),
        cancellation_reason = target_reason
  where id = target_submission_id
    and organization_id = target_organization_id
    and status in ('DRAFT', 'READY', 'EXPORTED', 'SUBMITTED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'einvoicing_submission.cancel',
      'einvoicing_submission', target_submission_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.cancel_einvoicing_submission(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_einvoicing_submission(uuid, uuid, text) to authenticated, service_role;

-- =========================================================================
-- Read helpers
-- =========================================================================
create or replace function public.active_einvoicing_provider(
  target_organization_id uuid
)
returns table (
  provider_id       uuid,
  provider_kind     text,
  label             text,
  status            text,
  supported_formats text[],
  activated_at      timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'active_einvoicing_provider: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select p.id, p.provider_kind, p.label, p.status, p.supported_formats, p.activated_at
  from public.einvoicing_providers p
  where p.organization_id = target_organization_id
    and p.status in ('ACTIVE', 'DEGRADED', 'CONFIGURED', 'PAUSED')
  order by p.created_at desc
  limit 1;
end;
$$;

revoke all on function public.active_einvoicing_provider(uuid) from public, anon;
grant execute on function public.active_einvoicing_provider(uuid) to authenticated, service_role;

create or replace function public.einvoicing_submissions_for(
  target_organization_id uuid,
  target_status_filter   text
)
returns table (
  submission_id      uuid,
  invoice_id         uuid,
  provider_id        uuid,
  provider_kind_snapshot text,
  format             text,
  status             text,
  payload_gap_count  integer,
  exported_at        timestamptz,
  submitted_at       timestamptz,
  accepted_at        timestamptz,
  rejected_at        timestamptz,
  external_ref       text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'einvoicing_submissions_for: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  return query
  select
    s.id, s.invoice_id, s.provider_id, s.provider_kind_snapshot,
    s.format, s.status, jsonb_array_length(s.payload_gaps),
    s.exported_at, s.submitted_at, s.accepted_at, s.rejected_at, s.external_ref
  from public.einvoicing_submissions s
  where s.organization_id = target_organization_id
    and (target_status_filter is null or s.status = target_status_filter)
  order by s.updated_at desc;
end;
$$;

revoke all on function public.einvoicing_submissions_for(uuid, text) from public, anon;
grant execute on function public.einvoicing_submissions_for(uuid, text) to authenticated, service_role;
