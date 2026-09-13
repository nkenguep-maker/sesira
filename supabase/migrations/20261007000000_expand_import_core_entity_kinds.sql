-- SESIRA — expand CSV imports to core business entities.
--
-- The importer keeps existing request values for backward compatibility while
-- exposing customers, quotes, invoices, equipment and maintenance contracts.

alter table public.imports
  drop constraint if exists imports_kind_check;

alter table public.imports
  add constraint imports_kind_check
  check (kind in (
    'customers',
    'requests',
    'quotes',
    'invoices',
    'equipment',
    'maintenance_contracts'
  ));

alter table public.import_rows
  drop constraint if exists import_rows_entity_type_check;

alter table public.import_rows
  add constraint import_rows_entity_type_check
  check (
    entity_type is null or entity_type in (
      'customer',
      'request',
      'quote',
      'invoice',
      'equipment',
      'maintenance_contract'
    )
  );

comment on column public.imports.kind is
  'CSV import domain. Core imports support customers, quotes, invoices, equipment and maintenance contracts; requests remains reserved for compatibility.';
