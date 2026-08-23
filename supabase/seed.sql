-- Demo-only organizations. These are not customer claims or production references.
insert into public.organizations (
  id,
  name,
  slug,
  sector_key,
  status,
  config,
  feature_flags
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Atelier Horizon — Démo',
    'atelier-horizon-demo',
    'technical_services',
    'ACTIVE',
    '{"terminology":{"request":"Demande","quote":"Devis"}}'::jsonb,
    '{"requests_enabled":true,"quotes_enabled":true}'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Studio Nova — Démo',
    'studio-nova-demo',
    'professional_services',
    'ACTIVE',
    '{"terminology":{"request":"Brief","quote":"Proposition"}}'::jsonb,
    '{"requests_enabled":true,"quotes_enabled":true}'::jsonb
  )
on conflict (id) do nothing;

insert into public.service_catalog_items (organization_id, name, code, description)
values
  ('10000000-0000-4000-8000-000000000001', 'Maintenance préventive', 'maintenance', 'Service de démonstration'),
  ('20000000-0000-4000-8000-000000000002', 'Mission de conseil', 'consulting', 'Service de démonstration')
on conflict (organization_id, code) do nothing;
