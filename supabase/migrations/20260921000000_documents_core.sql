-- SESIRA Core Workflow — documents (C27).
--
-- Document workflow, NOT a file-drive replacement. Metadata only.
-- File bytes live in an external store (Supabase Storage / S3);
-- this table records the reference + classification lifecycle.
--
--   UPLOADED → CLASSIFIED → VALIDATED → ARCHIVED
--   any → REJECTED (terminal — wrong doc / cross-tenant leak
--         attempt / expired)
--
-- AI may classify + extract fields. Low-confidence classification
-- (`extraction_confidence < 0.5`) auto-emits an Attention (SALES
-- REPLY_NEEDS_REVIEW reused for now; a dedicated DOCUMENT_REVIEW
-- reason lands with the ops screen in Wave 6).

create table public.documents (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  entity_type           text check (entity_type is null or entity_type in
    ('customer', 'quote', 'opportunity', 'intervention', 'field_report', 'invoice')),
  entity_id             uuid,
  file_reference        text not null check (length(file_reference) between 1 and 500),
  file_name             text not null check (length(file_name) between 1 and 300),
  content_type          text check (content_type is null or length(content_type) <= 200),
  size_bytes            bigint check (size_bytes is null or size_bytes >= 0),
  kind                  text not null default 'OTHER'
    check (kind in ('CONTRACT', 'INVOICE', 'PROOF_OF_DELIVERY',
                    'REGULATORY', 'PHOTO', 'REPORT', 'OTHER')),
  status                text not null default 'UPLOADED'
    check (status in ('UPLOADED', 'CLASSIFIED', 'VALIDATED', 'ARCHIVED', 'REJECTED')),
  extracted_fields      jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_fields) = 'object'),
  extraction_confidence numeric(4,3) check (extraction_confidence is null or (extraction_confidence >= 0 and extraction_confidence <= 1)),
  uploaded_by_user_id   uuid,
  validated_by_user_id  uuid,
  uploaded_at           timestamptz not null default now(),
  classified_at         timestamptz,
  validated_at          timestamptz,
  archived_at           timestamptz,
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (organization_id, file_reference)
);

comment on table public.documents is
  'Document metadata + classification lifecycle. NOT a file-drive replacement — bytes live in Supabase Storage / S3. AI-classifiable with low-confidence Attention escalation.';

create index documents_org_status_idx on public.documents (organization_id, status);
create index documents_org_entity_idx on public.documents (organization_id, entity_type, entity_id) where entity_id is not null;

alter table public.documents enable row level security;

create policy documents_select on public.documents
  for select to authenticated
  using (private.is_organization_member(organization_id));
create policy documents_insert on public.documents
  for insert to authenticated
  with check (private.is_organization_member(organization_id));
create policy documents_update on public.documents
  for update to authenticated
  using (private.is_organization_member(organization_id))
  with check (private.is_organization_member(organization_id));

grant select, insert, update on public.documents to authenticated;
grant select, insert, update on public.documents to service_role;

-- =========================================================================
-- State machine trigger — same short-circuit pattern as field_reports (C26)
-- =========================================================================
create or replace function private.enforce_document_state_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_role <> 'authenticated' then
    return new;
  end if;

  if old.status in ('ARCHIVED', 'REJECTED') then
    raise exception 'document % is terminal (status=%) and cannot transition to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;

  if not (
    (old.status = 'UPLOADED'   and new.status in ('CLASSIFIED', 'REJECTED')) or
    (old.status = 'CLASSIFIED' and new.status in ('VALIDATED', 'REJECTED', 'UPLOADED')) or
    (old.status = 'VALIDATED'  and new.status in ('ARCHIVED', 'REJECTED')) or
    (old.status = new.status)
  ) then
    raise exception 'document % cannot transition from % to %',
      old.id, old.status, new.status
      using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger documents_state_transition
  before update on public.documents
  for each row execute function private.enforce_document_state_transition();

-- =========================================================================
-- record_document_classification — write AI extraction result
-- =========================================================================
create or replace function public.record_document_classification(
  target_organization_id uuid,
  target_document_id     uuid,
  target_kind            text,
  target_extracted_fields jsonb,
  target_extraction_confidence numeric
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'record_document_classification: only service_role may write classifier output'
      using errcode = '42501';
  end if;
  if target_extraction_confidence is null or target_extraction_confidence < 0 or target_extraction_confidence > 1 then
    raise exception 'record_document_classification: confidence must be in [0, 1]'
      using errcode = '22023';
  end if;

  update public.documents
    set kind = coalesce(target_kind, kind),
        extracted_fields = coalesce(target_extracted_fields, '{}'::jsonb),
        extraction_confidence = target_extraction_confidence,
        status = 'CLASSIFIED',
        classified_at = now()
  where id = target_document_id
    and organization_id = target_organization_id
    and status = 'UPLOADED';

  get diagnostics affected = row_count;

  if affected = 1 and target_extraction_confidence < 0.5 then
    perform public.insert_attention_once(
      target_organization_id,
      'attention:document_low_confidence:' || target_document_id::text,
      'OPERATIONS',
      'LOW_AI_CONFIDENCE',
      'Document à valider manuellement (confiance faible)',
      'NORMAL',
      'document',
      target_document_id,
      format('Classification AI en dessous de 50%% (%s)', target_extraction_confidence),
      'Vérifier le type + les champs extraits, puis valider ou rejeter.',
      null, null,
      jsonb_build_object('document_id', target_document_id, 'confidence', target_extraction_confidence)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.record_document_classification(uuid, uuid, text, jsonb, numeric) from public, anon, authenticated;
grant execute on function public.record_document_classification(uuid, uuid, text, jsonb, numeric) to service_role;

comment on function public.record_document_classification(uuid, uuid, text, jsonb, numeric) is
  'Persist the document classifier output (kind, extracted_fields, confidence). service_role only. Low-confidence (< 0.5) auto-emits LOW_AI_CONFIDENCE Attention.';

-- =========================================================================
-- validate_document — CLASSIFIED → VALIDATED
-- =========================================================================
create or replace function public.validate_document(
  target_organization_id uuid,
  target_document_id     uuid,
  target_validator_user_id uuid
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
    raise exception 'validate_document: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_validator_user_id
      and status = 'ACTIVE'
  ) then
    raise exception 'validate_document: validator % is not an ACTIVE member of organization %',
      target_validator_user_id, target_organization_id
      using errcode = '42501';
  end if;

  update public.documents
    set status = 'VALIDATED',
        validated_by_user_id = target_validator_user_id,
        validated_at = now()
  where id = target_document_id
    and organization_id = target_organization_id
    and status = 'CLASSIFIED';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'document.validate',
      'document', target_document_id,
      jsonb_build_object('validator_user_id', target_validator_user_id)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.validate_document(uuid, uuid, uuid) from public, anon;
grant execute on function public.validate_document(uuid, uuid, uuid) to authenticated, service_role;

comment on function public.validate_document(uuid, uuid, uuid) is
  'Transition a document CLASSIFIED → VALIDATED. Validator must be ACTIVE org member (independent from the caller; matches C12 approval separation-of-duties idea). Audit log on transition.';

-- =========================================================================
-- reject_document — any non-terminal → REJECTED (terminal)
-- =========================================================================
create or replace function public.reject_document(
  target_organization_id uuid,
  target_document_id     uuid,
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
    raise exception 'reject_document: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_reason is null or length(target_reason) = 0 or length(target_reason) > 500 then
    raise exception 'reject_document: reason must be a non-empty string ≤500 chars'
      using errcode = '22023';
  end if;

  update public.documents
    set status   = 'REJECTED',
        metadata = coalesce(metadata, '{}'::jsonb)
                   || jsonb_build_object(
                        'rejection_reason', target_reason,
                        'rejected_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                      )
  where id = target_document_id
    and organization_id = target_organization_id
    and status in ('UPLOADED', 'CLASSIFIED', 'VALIDATED');

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'document.reject',
      'document', target_document_id,
      jsonb_build_object('reason', target_reason)
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.reject_document(uuid, uuid, text) from public, anon;
grant execute on function public.reject_document(uuid, uuid, text) to authenticated, service_role;

comment on function public.reject_document(uuid, uuid, text) is
  'Reject a document (wrong doc / cross-tenant leak attempt / expired). Terminal. Persists reason in metadata + audit_log.';

-- =========================================================================
-- archive_document — VALIDATED → ARCHIVED (terminal)
-- =========================================================================
create or replace function public.archive_document(
  target_organization_id uuid,
  target_document_id     uuid
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
    raise exception 'archive_document: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  update public.documents
    set status       = 'ARCHIVED',
        archived_at  = now()
  where id = target_document_id
    and organization_id = target_organization_id
    and status = 'VALIDATED';

  get diagnostics affected = row_count;

  if affected = 1 then
    perform public.record_audit_log(
      target_organization_id, 'document.archive',
      'document', target_document_id,
      '{}'::jsonb
    );
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.archive_document(uuid, uuid) from public, anon;
grant execute on function public.archive_document(uuid, uuid) to authenticated, service_role;

comment on function public.archive_document(uuid, uuid) is
  'Archive a VALIDATED document. Terminal. Audit log on transition.';
