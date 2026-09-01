-- SESIRA OS development/demo data.
-- Every person, company, message and business fact below is fictional.
-- Do not load this file in a production database.

begin;

-- Organizations are the tenant boundary. Deterministic IDs make every
-- organization-scoped relationship straightforward to audit.
insert into public.organizations (
  id, name, slug, sector_key, status, timezone, language, currency, config, feature_flags, created_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Clima Rhône — Démo',
    'clima-rhone-demo',
    'heating_cooling',
    'ACTIVE',
    'Europe/Paris',
    'fr',
    'EUR',
    '{
      "demo_data": true,
      "company_profile": {
        "employees": 34,
        "technicians": 15,
        "administrative_staff": 3,
        "sales_staff": 2,
        "requests_per_month": 70,
        "quotes_per_month": 45,
        "average_quote_amount": 12000
      },
      "terminology": {"request": "Demande", "quote": "Devis"}
    }'::jsonb,
    '{"requests_enabled": true, "quotes_enabled": true}'::jsonb,
    now() - interval '90 days'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Studio Nova — Démo',
    'studio-nova-demo',
    'professional_services',
    'ACTIVE',
    'Europe/Paris',
    'fr',
    'EUR',
    '{
      "demo_data": true,
      "company_profile": {
        "employees": 12,
        "requests_per_month": 24,
        "quotes_per_month": 16,
        "average_quote_amount": 6800
      },
      "terminology": {"request": "Brief", "quote": "Proposition"}
    }'::jsonb,
    '{"requests_enabled": true, "quotes_enabled": true}'::jsonb,
    now() - interval '75 days'
  )
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  sector_key = excluded.sector_key,
  status = excluded.status,
  timezone = excluded.timezone,
  language = excluded.language,
  currency = excluded.currency,
  config = excluded.config,
  feature_flags = excluded.feature_flags;

-- Login-capable local demo users. The shared password is intentionally
-- restricted to fictional demo tenants: Sesira-Demo-2026!
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'claire.morel@clima-rhone.example',
    crypt('Sesira-Demo-2026!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Claire Morel"}'::jsonb,
    now() - interval '90 days',
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'marc.duval@clima-rhone.example',
    crypt('Sesira-Demo-2026!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Marc Duval"}'::jsonb,
    now() - interval '86 days',
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'nadia.petit@studio-nova.example',
    crypt('Sesira-Demo-2026!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Nadia Petit"}'::jsonb,
    now() - interval '75 days',
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'thomas.bernard@studio-nova.example',
    crypt('Sesira-Demo-2026!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Thomas Bernard"}'::jsonb,
    now() - interval '72 days',
    now(),
    false,
    false
  )
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at,
  is_sso_user = false,
  is_anonymous = false;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  (
    '11100000-0000-4000-8000-000000000001',
    'claire.morel@clima-rhone.example',
    '11000000-0000-4000-8000-000000000001',
    '{"sub": "11000000-0000-4000-8000-000000000001", "email": "claire.morel@clima-rhone.example", "email_verified": true, "phone_verified": false}'::jsonb,
    'email',
    now() - interval '1 day',
    now() - interval '90 days',
    now()
  ),
  (
    '11100000-0000-4000-8000-000000000002',
    'marc.duval@clima-rhone.example',
    '11000000-0000-4000-8000-000000000002',
    '{"sub": "11000000-0000-4000-8000-000000000002", "email": "marc.duval@clima-rhone.example", "email_verified": true, "phone_verified": false}'::jsonb,
    'email',
    now() - interval '3 days',
    now() - interval '86 days',
    now()
  ),
  (
    '22200000-0000-4000-8000-000000000001',
    'nadia.petit@studio-nova.example',
    '22000000-0000-4000-8000-000000000001',
    '{"sub": "22000000-0000-4000-8000-000000000001", "email": "nadia.petit@studio-nova.example", "email_verified": true, "phone_verified": false}'::jsonb,
    'email',
    now() - interval '2 days',
    now() - interval '75 days',
    now()
  ),
  (
    '22200000-0000-4000-8000-000000000002',
    'thomas.bernard@studio-nova.example',
    '22000000-0000-4000-8000-000000000002',
    '{"sub": "22000000-0000-4000-8000-000000000002", "email": "thomas.bernard@studio-nova.example", "email_verified": true, "phone_verified": false}'::jsonb,
    'email',
    now() - interval '5 days',
    now() - interval '72 days',
    now()
  )
on conflict (id) do update set
  provider_id = excluded.provider_id,
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  provider = excluded.provider,
  updated_at = excluded.updated_at;

-- Auth user creation invokes SESIRA's normal onboarding trigger. Move only
-- these fixed demo users out of their temporary onboarding tenants, then
-- remove those empty tenants. No unrelated membership is touched.
with removed_bootstrap_memberships as (
  delete from public.organization_members
  where user_id in (
    '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000002'
  )
    and organization_id not in (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002'
    )
  returning organization_id
)
delete from public.organizations organization
using removed_bootstrap_memberships membership
where organization.id = membership.organization_id
  and organization.slug like 'organisation-%'
  and organization.config @> '{"onboarding_required": true}'::jsonb;

insert into public.profiles (id, full_name, created_at)
values
  ('11000000-0000-4000-8000-000000000001', 'Claire Morel', now() - interval '90 days'),
  ('11000000-0000-4000-8000-000000000002', 'Marc Duval', now() - interval '86 days'),
  ('22000000-0000-4000-8000-000000000001', 'Nadia Petit', now() - interval '75 days'),
  ('22000000-0000-4000-8000-000000000002', 'Thomas Bernard', now() - interval '72 days')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.organization_members (
  id, organization_id, user_id, role, status, created_at
)
values
  ('11200000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'OWNER', 'ACTIVE', now() - interval '90 days'),
  ('11200000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', 'MANAGER', 'ACTIVE', now() - interval '86 days'),
  ('22200000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001', 'OWNER', 'ACTIVE', now() - interval '75 days'),
  ('22200000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', 'MEMBER', 'ACTIVE', now() - interval '72 days')
on conflict (organization_id, user_id) do update set
  role = excluded.role,
  status = excluded.status;

insert into public.service_catalog_items (
  id, organization_id, name, code, description, metadata, created_at
)
values
  ('12000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Pompe à chaleur air/eau', 'pac-air-eau', 'Étude, fourniture et pose pour maison individuelle.', '{"demo_data": true}'::jsonb, now() - interval '80 days'),
  ('12000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Climatisation réversible', 'climatisation-reversible', 'Installation résidentielle et petit tertiaire.', '{"demo_data": true}'::jsonb, now() - interval '80 days'),
  ('12000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Entretien chauffage', 'entretien-chauffage', 'Entretien et remise en service des installations.', '{"demo_data": true}'::jsonb, now() - interval '80 days'),
  ('22000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000002', 'Audit opérationnel', 'audit-operationnel', 'Diagnostic des opérations et recommandations prioritaires.', '{"demo_data": true}'::jsonb, now() - interval '65 days'),
  ('22000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000002', 'Accompagnement organisation', 'accompagnement-organisation', 'Mission de structuration et d’accompagnement.', '{"demo_data": true}'::jsonb, now() - interval '65 days')
on conflict (id) do update set
  organization_id = excluded.organization_id,
  name = excluded.name,
  code = excluded.code,
  description = excluded.description,
  metadata = excluded.metadata,
  active = true;

insert into public.customers (
  id, organization_id, type, display_name, company_name, email, phone, metadata, created_at
)
values
  ('13000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'PERSON', 'Sophie Lefèvre', null, 'sophie.lefevre@example.com', '+33 6 12 34 56 78', '{"demo_data": true, "city": "Lyon"}'::jsonb, now() - interval '21 days'),
  ('13000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'PERSON', 'Julien Caron', null, 'julien.caron@example.com', '+33 6 45 72 18 09', '{"demo_data": true, "city": "Villeurbanne"}'::jsonb, now() - interval '10 days'),
  ('13000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'COMPANY', 'Résidence des Tilleuls', 'Résidence des Tilleuls', 'conseil.syndical@example.com', '+33 4 72 00 18 40', '{"demo_data": true, "city": "Bron"}'::jsonb, now() - interval '7 days'),
  ('23000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'COMPANY', 'Maison Mistral', 'Maison Mistral', 'contact@maison-mistral.example', '+33 4 91 20 30 40', '{"demo_data": true, "city": "Marseille"}'::jsonb, now() - interval '18 days'),
  ('23000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'PERSON', 'Camille Roy', null, 'camille.roy@example.com', '+33 6 80 14 22 31', '{"demo_data": true, "city": "Aix-en-Provence"}'::jsonb, now() - interval '8 days')
on conflict (id) do update set
  organization_id = excluded.organization_id,
  type = excluded.type,
  display_name = excluded.display_name,
  company_name = excluded.company_name,
  email = excluded.email,
  phone = excluded.phone,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

insert into public.requests (
  id, organization_id, customer_id, service_catalog_item_id, title, source,
  status, qualification_score, assigned_user_id, data, created_at
)
values
  (
    '14000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000001',
    '12000000-0000-4000-8000-000000000001',
    'Pompe à chaleur',
    'WEBSITE',
    'READY',
    92,
    '11000000-0000-4000-8000-000000000001',
    '{
      "demo_data": true,
      "description": "Projet de pompe à chaleur pour une maison individuelle à Lyon.\n\nSurface : 145 m²\nChauffage actuel : Chaudière gaz\nAnnée de construction : 1998\n\nLa cliente souhaite réduire sa consommation tout en conservant un bon confort en hiver.",
      "qualification": {
        "surface_m2": 145,
        "current_heating": "Chaudière gaz",
        "home_year": 1998,
        "city": "Lyon"
      }
    }'::jsonb,
    now() - interval '20 days'
  ),
  (
    '14000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000002',
    '12000000-0000-4000-8000-000000000002',
    'Climatisation du séjour et des chambres',
    'PHONE',
    'NEEDS_INFO',
    45,
    '11000000-0000-4000-8000-000000000002',
    '{"demo_data": true, "description": "Maison à Villeurbanne. Le plan des pièces et la puissance électrique restent à confirmer."}'::jsonb,
    now() - interval '9 days'
  ),
  (
    '14000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000003',
    '12000000-0000-4000-8000-000000000003',
    'Remise en service de la chaufferie',
    'MANUAL',
    'NEW',
    null,
    null,
    '{"demo_data": true, "description": "Demande du conseil syndical après un arrêt intermittent de la chaufferie collective."}'::jsonb,
    now() - interval '2 days'
  ),
  (
    '24000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000021',
    'Audit des opérations e-commerce',
    'REFERRAL',
    'QUALIFIED',
    84,
    '22000000-0000-4000-8000-000000000001',
    '{"demo_data": true, "description": "La direction souhaite prioriser les chantiers qui réduiront les délais de préparation des commandes."}'::jsonb,
    now() - interval '16 days'
  ),
  (
    '24000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000022',
    'Organisation de l’équipe support',
    'MANUAL',
    'PROCESSING',
    68,
    '22000000-0000-4000-8000-000000000002',
    '{"demo_data": true, "description": "Clarifier les rôles et préparer un rituel hebdomadaire simple pour l’équipe support."}'::jsonb,
    now() - interval '7 days'
  )
on conflict (id) do update set
  organization_id = excluded.organization_id,
  customer_id = excluded.customer_id,
  service_catalog_item_id = excluded.service_catalog_item_id,
  title = excluded.title,
  source = excluded.source,
  status = excluded.status,
  qualification_score = excluded.qualification_score,
  assigned_user_id = excluded.assigned_user_id,
  data = excluded.data,
  created_at = excluded.created_at;

insert into public.quotes (
  id, organization_id, customer_id, request_id, reference, title, amount,
  currency, status, owner_user_id, sent_at, expires_at, next_action_at, metadata, created_at
)
values
  (
    '15000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001',
    'DEV-2026-0812',
    'Pompe à chaleur air/eau',
    18450,
    'EUR',
    'SENT',
    '11000000-0000-4000-8000-000000000001',
    now() - interval '12 days',
    now() + interval '18 days',
    now() - interval '8 days',
    '{"demo_data": true, "created_manually": true}'::jsonb,
    now() - interval '18 days'
  ),
  (
    '15000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000002',
    '14000000-0000-4000-8000-000000000002',
    'DEV-2026-0821',
    'Climatisation réversible',
    7650,
    'EUR',
    'DRAFT',
    '11000000-0000-4000-8000-000000000002',
    null,
    now() + interval '25 days',
    now() + interval '3 days',
    '{"demo_data": true, "created_manually": true}'::jsonb,
    now() - interval '5 days'
  ),
  (
    '25000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000001',
    '24000000-0000-4000-8000-000000000001',
    'PROP-2026-031',
    'Audit opérationnel — 6 semaines',
    12800,
    'EUR',
    'FOLLOWING_UP',
    '22000000-0000-4000-8000-000000000001',
    now() - interval '10 days',
    now() + interval '20 days',
    now() + interval '2 days',
    '{"demo_data": true, "created_manually": true}'::jsonb,
    now() - interval '14 days'
  ),
  (
    '25000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000002',
    '24000000-0000-4000-8000-000000000002',
    'PROP-2026-036',
    'Accompagnement équipe support',
    5400,
    'EUR',
    'DRAFT',
    '22000000-0000-4000-8000-000000000002',
    null,
    now() + interval '28 days',
    now() + interval '5 days',
    '{"demo_data": true, "created_manually": true}'::jsonb,
    now() - interval '4 days'
  )
on conflict (id) do update set
  organization_id = excluded.organization_id,
  customer_id = excluded.customer_id,
  request_id = excluded.request_id,
  reference = excluded.reference,
  title = excluded.title,
  amount = excluded.amount,
  currency = excluded.currency,
  status = excluded.status,
  owner_user_id = excluded.owner_user_id,
  sent_at = excluded.sent_at,
  expires_at = excluded.expires_at,
  next_action_at = excluded.next_action_at,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

-- These fictional replies make the manual demo story concrete. No intent,
-- confidence, AI run or outgoing communication is created.
insert into public.messages (
  id, organization_id, customer_id, request_id, quote_id, direction, channel,
  status, thread_key, subject, body_text, intent, confidence, received_at, metadata, created_at
)
values
  (
    '16000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000001',
    'INBOUND',
    'EMAIL',
    'RECEIVED',
    'demo-sophie-pac',
    'Re: Devis pompe à chaleur',
    'Bonjour,\n\nMerci pour votre proposition. Le devis dépasse légèrement notre budget. Serait-il possible de faire un geste sur le prix ?\n\nCordialement,\nSophie Lefèvre',
    null,
    null,
    now() - interval '7 days',
    '{"demo_data": true, "created_manually": true, "external_communication_sent": false, "ai_classified": false}'::jsonb,
    now() - interval '7 days'
  ),
  (
    '26000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000001',
    '24000000-0000-4000-8000-000000000001',
    '25000000-0000-4000-8000-000000000001',
    'INBOUND',
    'EMAIL',
    'RECEIVED',
    'demo-maison-mistral-audit',
    'Disponibilités pour le lancement',
    'Bonjour, nous pouvons réunir l’équipe de direction mardi ou jeudi matin pour lancer la mission.',
    null,
    null,
    now() - interval '6 days',
    '{"demo_data": true, "created_manually": true, "external_communication_sent": false, "ai_classified": false}'::jsonb,
    now() - interval '6 days'
  )
on conflict (id) do update set
  organization_id = excluded.organization_id,
  customer_id = excluded.customer_id,
  request_id = excluded.request_id,
  quote_id = excluded.quote_id,
  direction = excluded.direction,
  channel = excluded.channel,
  status = excluded.status,
  thread_key = excluded.thread_key,
  subject = excluded.subject,
  body_text = excluded.body_text,
  intent = null,
  confidence = null,
  received_at = excluded.received_at,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

insert into public.attention_items (
  id, organization_id, category, priority, status, reason, title, explanation,
  entity_type, entity_id, suggested_action, assigned_user_id, due_at, resolved_at, metadata, created_at
)
values
  (
    '17000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'SALES',
    'HIGH',
    'OPEN',
    'PRICE_OBJECTION',
    'La cliente reste intéressée mais demande un geste sur le prix.',
    'Donnée de démonstration créée manuellement à partir d’un scénario fictif. Aucune analyse automatique n’a été effectuée.',
    'quote',
    '15000000-0000-4000-8000-000000000001',
    'Ouvrir le devis, définir la marge de négociation puis rappeler Sophie Lefèvre.',
    '11000000-0000-4000-8000-000000000001',
    now() + interval '1 day',
    null,
    '{"demo_data": true, "created_manually": true, "ai_classified": false, "automation_triggered": false}'::jsonb,
    now() - interval '7 days'
  ),
  (
    '17000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'CUSTOMER',
    'NORMAL',
    'RESOLVED',
    'MISSING_INFORMATION',
    'Les plans des pièces ont été demandés.',
    'Élément fictif créé manuellement pour montrer l’historique des décisions terminées.',
    'request',
    '14000000-0000-4000-8000-000000000002',
    'Vérifier les documents reçus avec le technicien.',
    '11000000-0000-4000-8000-000000000002',
    now() - interval '3 days',
    now() - interval '2 days',
    '{"demo_data": true, "created_manually": true, "ai_classified": false, "automation_triggered": false}'::jsonb,
    now() - interval '6 days'
  ),
  (
    '27000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'CUSTOMER',
    'NORMAL',
    'OPEN',
    'INTERESTED_CUSTOMER',
    'Le client souhaite confirmer la date de lancement.',
    'Donnée de démonstration créée manuellement. Aucun message n’a été classé automatiquement.',
    'quote',
    '25000000-0000-4000-8000-000000000001',
    'Choisir une date avec l’équipe puis confirmer le lancement au client.',
    '22000000-0000-4000-8000-000000000001',
    now() + interval '2 days',
    null,
    '{"demo_data": true, "created_manually": true, "ai_classified": false, "automation_triggered": false}'::jsonb,
    now() - interval '6 days'
  )
on conflict (id) do update set
  organization_id = excluded.organization_id,
  category = excluded.category,
  priority = excluded.priority,
  status = excluded.status,
  reason = excluded.reason,
  title = excluded.title,
  explanation = excluded.explanation,
  entity_type = excluded.entity_type,
  entity_id = excluded.entity_id,
  suggested_action = excluded.suggested_action,
  assigned_user_id = excluded.assigned_user_id,
  due_at = excluded.due_at,
  resolved_at = excluded.resolved_at,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

-- Replace trigger-generated events for deterministic demo entities with a
-- stable history in the existing events table. No parallel activity model is
-- introduced.
delete from public.events
where organization_id in (
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002'
)
  and entity_id in (
    '13000000-0000-4000-8000-000000000001',
    '13000000-0000-4000-8000-000000000002',
    '13000000-0000-4000-8000-000000000003',
    '14000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000002',
    '14000000-0000-4000-8000-000000000003',
    '15000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000002',
    '24000000-0000-4000-8000-000000000001',
    '24000000-0000-4000-8000-000000000002',
    '25000000-0000-4000-8000-000000000001',
    '25000000-0000-4000-8000-000000000002'
  );

insert into public.events (
  id, organization_id, type, entity_type, entity_id, source, payload, created_at
)
values
  ('18000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'customer.created', 'customer', '13000000-0000-4000-8000-000000000001', 'APP', '{"actor_id": "11000000-0000-4000-8000-000000000001", "display_name": "Sophie Lefèvre", "demo_data": true}'::jsonb, now() - interval '21 days'),
  ('18000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'request.created', 'request', '14000000-0000-4000-8000-000000000001', 'APP', '{"actor_id": "11000000-0000-4000-8000-000000000001", "customer_id": "13000000-0000-4000-8000-000000000001", "source": "WEBSITE", "status": "READY", "demo_data": true}'::jsonb, now() - interval '20 days'),
  ('18000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'quote.created', 'quote', '15000000-0000-4000-8000-000000000001', 'APP', '{"actor_id": "11000000-0000-4000-8000-000000000001", "customer_id": "13000000-0000-4000-8000-000000000001", "request_id": "14000000-0000-4000-8000-000000000001", "amount": 18450, "currency": "EUR", "status": "DRAFT", "demo_data": true}'::jsonb, now() - interval '18 days'),
  ('18000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'quote.sent', 'quote', '15000000-0000-4000-8000-000000000001', 'APP', jsonb_build_object('actor_id', '11000000-0000-4000-8000-000000000001', 'previous_status', 'DRAFT', 'status', 'SENT', 'sent_at', now() - interval '12 days', 'demo_data', true), now() - interval '12 days'),
  ('18000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'message.received', 'quote', '15000000-0000-4000-8000-000000000001', 'APP', '{"actor_id": "11000000-0000-4000-8000-000000000001", "message_id": "16000000-0000-4000-8000-000000000001", "demo_data": true, "created_manually": true, "ai_classified": false}'::jsonb, now() - interval '7 days'),
  ('18000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'customer.created', 'customer', '13000000-0000-4000-8000-000000000002', 'APP', '{"actor_id": "11000000-0000-4000-8000-000000000002", "display_name": "Julien Caron", "demo_data": true}'::jsonb, now() - interval '10 days'),
  ('18000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'request.created', 'request', '14000000-0000-4000-8000-000000000002', 'APP', '{"actor_id": "11000000-0000-4000-8000-000000000002", "customer_id": "13000000-0000-4000-8000-000000000002", "source": "PHONE", "status": "NEEDS_INFO", "demo_data": true}'::jsonb, now() - interval '9 days'),
  ('18000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'quote.created', 'quote', '15000000-0000-4000-8000-000000000002', 'APP', '{"actor_id": "11000000-0000-4000-8000-000000000002", "customer_id": "13000000-0000-4000-8000-000000000002", "request_id": "14000000-0000-4000-8000-000000000002", "amount": 7650, "currency": "EUR", "status": "DRAFT", "demo_data": true}'::jsonb, now() - interval '5 days'),
  ('18000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'customer.created', 'customer', '13000000-0000-4000-8000-000000000003', 'APP', '{"display_name": "Résidence des Tilleuls", "demo_data": true}'::jsonb, now() - interval '7 days'),
  ('18000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'request.created', 'request', '14000000-0000-4000-8000-000000000003', 'APP', '{"customer_id": "13000000-0000-4000-8000-000000000003", "source": "MANUAL", "status": "NEW", "demo_data": true}'::jsonb, now() - interval '2 days'),
  ('28000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'customer.created', 'customer', '23000000-0000-4000-8000-000000000001', 'APP', '{"actor_id": "22000000-0000-4000-8000-000000000001", "display_name": "Maison Mistral", "demo_data": true}'::jsonb, now() - interval '18 days'),
  ('28000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'request.created', 'request', '24000000-0000-4000-8000-000000000001', 'APP', '{"actor_id": "22000000-0000-4000-8000-000000000001", "customer_id": "23000000-0000-4000-8000-000000000001", "source": "REFERRAL", "status": "QUALIFIED", "demo_data": true}'::jsonb, now() - interval '16 days'),
  ('28000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'quote.created', 'quote', '25000000-0000-4000-8000-000000000001', 'APP', '{"actor_id": "22000000-0000-4000-8000-000000000001", "customer_id": "23000000-0000-4000-8000-000000000001", "request_id": "24000000-0000-4000-8000-000000000001", "amount": 12800, "currency": "EUR", "status": "DRAFT", "demo_data": true}'::jsonb, now() - interval '14 days'),
  ('28000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'quote.sent', 'quote', '25000000-0000-4000-8000-000000000001', 'APP', jsonb_build_object('actor_id', '22000000-0000-4000-8000-000000000001', 'previous_status', 'DRAFT', 'status', 'SENT', 'sent_at', now() - interval '10 days', 'demo_data', true), now() - interval '10 days'),
  ('28000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'message.received', 'quote', '25000000-0000-4000-8000-000000000001', 'APP', '{"actor_id": "22000000-0000-4000-8000-000000000001", "message_id": "26000000-0000-4000-8000-000000000001", "demo_data": true, "created_manually": true, "ai_classified": false}'::jsonb, now() - interval '6 days'),
  ('28000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'customer.created', 'customer', '23000000-0000-4000-8000-000000000002', 'APP', '{"actor_id": "22000000-0000-4000-8000-000000000002", "display_name": "Camille Roy", "demo_data": true}'::jsonb, now() - interval '8 days'),
  ('28000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'request.created', 'request', '24000000-0000-4000-8000-000000000002', 'APP', '{"actor_id": "22000000-0000-4000-8000-000000000002", "customer_id": "23000000-0000-4000-8000-000000000002", "source": "MANUAL", "status": "PROCESSING", "demo_data": true}'::jsonb, now() - interval '7 days'),
  ('28000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000002', 'quote.created', 'quote', '25000000-0000-4000-8000-000000000002', 'APP', '{"actor_id": "22000000-0000-4000-8000-000000000002", "customer_id": "23000000-0000-4000-8000-000000000002", "request_id": "24000000-0000-4000-8000-000000000002", "amount": 5400, "currency": "EUR", "status": "DRAFT", "demo_data": true}'::jsonb, now() - interval '4 days')
on conflict (id) do update set
  organization_id = excluded.organization_id,
  type = excluded.type,
  entity_type = excluded.entity_type,
  entity_id = excluded.entity_id,
  source = excluded.source,
  payload = excluded.payload,
  created_at = excluded.created_at;

commit;
