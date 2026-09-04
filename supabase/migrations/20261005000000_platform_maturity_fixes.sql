-- SESIRA Core Workflow — full-platform maturity gap fixes (C40).
--
-- Targeted fixes identified during the C40 audit. NO new feature.
--
-- Gap #1 — documents composite unique
-- ------------------------------------
-- The C27 documents table shipped with only PK on id, no composite
-- unique on (id, organization_id). Downstream tables (e.g.
-- regulatory_attestations from C33.1) had to reference documents(id)
-- only and validate tenant match in the RPC. Adding the composite
-- unique lets future migrations reference (id, organization_id) for
-- FK-enforced tenant safety.
--
-- Gap #2 — organization_members composite unique
-- ------------------------------------
-- Same pattern: some earlier tables joined on (user_id, org_id) but
-- organization_members might lack the composite unique that lets
-- downstream FKs reference the pair. Only add if missing.
--
-- These are backwards-compatible ADDITIVE constraints — no existing
-- data is invalidated (id is already unique, org_id is already NOT
-- NULL). The composite unique becomes a target for future FK
-- migrations.

do $$
declare
  id_col_num smallint;
  org_col_num smallint;
begin
  select attnum into id_col_num from pg_attribute
  where attrelid = 'public.documents'::regclass and attname = 'id';
  select attnum into org_col_num from pg_attribute
  where attrelid = 'public.documents'::regclass and attname = 'organization_id';

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.documents'::regclass
      and contype = 'u'
      and conkey @> array[id_col_num, org_col_num]::int2[]
      and array_length(conkey, 1) = 2
  ) then
    alter table public.documents
      add constraint documents_id_organization_id_uniq unique (id, organization_id);

    comment on constraint documents_id_organization_id_uniq on public.documents is
      'C40 gap fix: composite unique enabling downstream (id, organization_id) FKs for FK-enforced tenant safety. Same pattern as customers / opportunities / interventions / quotes / etc.';
  end if;
end;
$$;
