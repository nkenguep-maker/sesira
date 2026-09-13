-- SESIRA — document intelligence and multi-entity links
--
-- A document can belong to several business objects at once (for example an
-- invoice belongs to an invoice record, a customer and often a quote).  The
-- legacy documents.entity_type/entity_id pair remains the primary link for
-- compatibility; document_links stores the complete relation graph.

alter table public.documents
  drop constraint if exists documents_entity_type_check;

alter table public.documents
  add constraint documents_entity_type_check
  check (
    entity_type is null or entity_type in (
      'customer', 'quote', 'opportunity', 'intervention', 'field_report',
      'invoice', 'maintenance_contract', 'equipment'
    )
  );

create table if not exists public.document_links (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  document_id           uuid not null references public.documents(id) on delete cascade,
  entity_type           text not null check (entity_type in (
    'customer', 'quote', 'opportunity', 'intervention', 'field_report',
    'invoice', 'maintenance_contract', 'equipment'
  )),
  entity_id             uuid not null,
  relation_kind         text not null default 'RELATED' check (relation_kind in ('PRIMARY', 'RELATED')),
  source                text not null check (source in (
    'EXACT_REFERENCE', 'EXACT_CUSTOMER', 'DERIVED_RELATION', 'HEURISTIC', 'MANUAL'
  )),
  confidence            numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  status                text not null default 'SUGGESTED' check (status in ('SUGGESTED', 'CONFIRMED', 'REJECTED')),
  reason                text check (reason is null or length(reason) <= 1000),
  is_primary            boolean not null default false,
  confirmed_by_user_id  uuid,
  confirmed_at          timestamptz,
  rejected_by_user_id   uuid,
  rejected_at           timestamptz,
  metadata              jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (document_id, entity_type, entity_id)
);

create index if not exists document_links_org_document_idx
  on public.document_links (organization_id, document_id, status);

create index if not exists document_links_org_entity_idx
  on public.document_links (organization_id, entity_type, entity_id, status);

create unique index if not exists document_links_one_confirmed_primary_idx
  on public.document_links (document_id)
  where is_primary = true and status = 'CONFIRMED';

alter table public.document_links enable row level security;

drop policy if exists document_links_select on public.document_links;
create policy document_links_select on public.document_links
  for select to authenticated
  using (private.is_organization_member(organization_id));

revoke all on public.document_links from public, anon, authenticated;
grant select on public.document_links to authenticated;
grant select, insert, update, delete on public.document_links to service_role;

comment on table public.document_links is
  'Relations inferred or confirmed between a document and SESIRA business objects. High-confidence exact matches may be auto-confirmed; ambiguous matches stay SUGGESTED.';

-- Persist a document analysis atomically enough for retry.  The service role is
-- the only writer because the output originates from the document-analysis
-- pipeline, not from browser input.
create or replace function public.record_document_intelligence(
  target_organization_id uuid,
  target_document_id uuid,
  target_kind text,
  target_extracted_fields jsonb,
  target_extraction_confidence numeric,
  target_primary_entity_type text default null,
  target_primary_entity_id uuid default null
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
    raise exception 'record_document_intelligence: only service_role may write analysis output'
      using errcode = '42501';
  end if;

  if target_kind not in ('CONTRACT', 'INVOICE', 'PROOF_OF_DELIVERY', 'REGULATORY', 'PHOTO', 'REPORT', 'OTHER') then
    raise exception 'record_document_intelligence: invalid document kind %', target_kind
      using errcode = '22023';
  end if;

  if target_extraction_confidence is null or target_extraction_confidence < 0 or target_extraction_confidence > 1 then
    raise exception 'record_document_intelligence: confidence must be in [0, 1]'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(target_extracted_fields, '{}'::jsonb)) <> 'object' then
    raise exception 'record_document_intelligence: extracted fields must be an object'
      using errcode = '22023';
  end if;

  if target_primary_entity_type is not null and target_primary_entity_type not in (
    'customer', 'quote', 'opportunity', 'intervention', 'field_report',
    'invoice', 'maintenance_contract', 'equipment'
  ) then
    raise exception 'record_document_intelligence: invalid primary entity type %', target_primary_entity_type
      using errcode = '22023';
  end if;

  if (target_primary_entity_type is null) <> (target_primary_entity_id is null) then
    raise exception 'record_document_intelligence: primary entity type and id must both be null or both be set'
      using errcode = '22023';
  end if;

  update public.documents
     set kind = target_kind,
         extracted_fields = coalesce(target_extracted_fields, '{}'::jsonb),
         extraction_confidence = target_extraction_confidence,
         status = 'CLASSIFIED',
         classified_at = now(),
         entity_type = target_primary_entity_type,
         entity_id = target_primary_entity_id,
         metadata = coalesce(metadata, '{}'::jsonb)
           || jsonb_build_object(
                'document_intelligence_version', 'v1',
                'document_intelligence_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
              ),
         updated_at = now()
   where id = target_document_id
     and organization_id = target_organization_id
     and status in ('UPLOADED', 'CLASSIFIED');

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
      format('Analyse documentaire en dessous de 50%% (%s)', target_extraction_confidence),
      'Vérifier le type, les champs extraits et les rattachements proposés.',
      null, null,
      jsonb_build_object('document_id', target_document_id, 'confidence', target_extraction_confidence)
    );
  end if;

  return affected = 1;
end;
$$;

revoke all on function public.record_document_intelligence(uuid, uuid, text, jsonb, numeric, text, uuid) from public, anon, authenticated;
grant execute on function public.record_document_intelligence(uuid, uuid, text, jsonb, numeric, text, uuid) to service_role;

-- A human can confirm a suggested relation.  This also updates the legacy
-- primary pair when the link was marked primary by the matcher.
create or replace function public.confirm_document_link(
  target_organization_id uuid,
  target_link_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_row public.document_links%rowtype;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'confirm_document_link: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  if (select auth.uid()) is distinct from target_user_id then
    raise exception 'confirm_document_link: target user must be the authenticated user'
      using errcode = '42501';
  end if;

  select * into link_row
    from public.document_links
   where id = target_link_id
     and organization_id = target_organization_id
     and status <> 'REJECTED'
   for update;

  if not found then return false; end if;

  if link_row.is_primary then
    update public.document_links
       set is_primary = false, updated_at = now()
     where document_id = link_row.document_id
       and id <> link_row.id
       and is_primary = true;
  end if;

  update public.document_links
     set status = 'CONFIRMED',
         confirmed_by_user_id = target_user_id,
         confirmed_at = now(),
         rejected_by_user_id = null,
         rejected_at = null,
         updated_at = now()
   where id = link_row.id;

  if link_row.is_primary then
    update public.documents
       set entity_type = link_row.entity_type,
           entity_id = link_row.entity_id,
           updated_at = now()
     where id = link_row.document_id
       and organization_id = target_organization_id;
  end if;

  perform public.record_audit_log(
    target_organization_id,
    'document.link.confirm',
    'document',
    link_row.document_id,
    jsonb_build_object(
      'link_id', link_row.id,
      'entity_type', link_row.entity_type,
      'entity_id', link_row.entity_id,
      'confidence', link_row.confidence
    )
  );

  return true;
end;
$$;

revoke all on function public.confirm_document_link(uuid, uuid, uuid) from public, anon;
grant execute on function public.confirm_document_link(uuid, uuid, uuid) to authenticated, service_role;

create or replace function public.reject_document_link(
  target_organization_id uuid,
  target_link_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_row public.document_links%rowtype;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'reject_document_link: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  if (select auth.uid()) is distinct from target_user_id then
    raise exception 'reject_document_link: target user must be the authenticated user'
      using errcode = '42501';
  end if;

  select * into link_row
    from public.document_links
   where id = target_link_id
     and organization_id = target_organization_id
     and status = 'SUGGESTED'
   for update;

  if not found then return false; end if;

  update public.document_links
     set status = 'REJECTED',
         is_primary = false,
         rejected_by_user_id = target_user_id,
         rejected_at = now(),
         updated_at = now()
   where id = link_row.id;

  perform public.record_audit_log(
    target_organization_id,
    'document.link.reject',
    'document',
    link_row.document_id,
    jsonb_build_object(
      'link_id', link_row.id,
      'entity_type', link_row.entity_type,
      'entity_id', link_row.entity_id
    )
  );

  return true;
end;
$$;

revoke all on function public.reject_document_link(uuid, uuid, uuid) from public, anon;
grant execute on function public.reject_document_link(uuid, uuid, uuid) to authenticated, service_role;
