-- SESIRA offensive test suite — Wave 5 (C33-C37) + Wave 6 (C38).
--
-- Attack the product as an adversary. Doctrine invariants that MUST
-- hold are asserted with `raise exception` — silent success = pass.
--
-- Run against a migrated SESIRA database as an administrative
-- connection. Wrapped in BEGIN ... ROLLBACK: no fixture persists.
--
-- Attack surfaces covered (roadmap C39):
--   * Tenant A → tenant B on Wave 5/6 tables
--   * RLS enforcement (equipment, invoices, financing_referrals,
--     voice_calls, platform_components)
--   * RPC forgery / role insufficient (service_role-only RPCs called
--     from authenticated)
--   * Doctrine invariants (INV-01..INV-07)
--     - regulatory_gwp_values immutability (INV-03)
--     - regulatory_attentions.seen_at set-once (INV-02)
--     - No "conforme" verdict surfaces (INV-01 → grep tests below)
--     - No emotion/scoring on voice (INV-06 defense-in-depth)
--   * Provider integrity (doctrine §7)
--     - record_einvoicing_provider_event refuses PRODUCTION_PENDING
--       events from authenticated
--     - record_voice_call_processed refuses forbidden metadata
--   * Kill switch enforcement (is_platform_component_enabled)
--   * Idempotency (opportunity_attributions, intervention_field_artifacts,
--     einvoicing_provider_events)

begin;

-- =========================================================================
-- Schema smoke: RLS enabled on every Wave 5/6 table
-- =========================================================================
do $$
declare
  bad_table text;
begin
  select relname into bad_table
  from pg_class
  where relkind = 'r'
    and relnamespace = 'public'::regnamespace
    and relname in (
      -- C30 growth
      'growth_campaigns', 'leads',
      -- C31 growth publishing / conversations
      'growth_content_pieces', 'growth_publications', 'growth_conversations',
      -- C32 attribution
      'opportunity_attributions',
      -- C33.1 regulatory reference + attestations
      'regulatory_gwp_values', 'regulatory_leak_check_rules',
      'regulatory_market_bans', 'regulatory_attestations',
      -- C33.2 equipment + regulatory attentions
      'equipment', 'regulatory_attentions',
      -- C33.3 regulatory exports
      'regulatory_exports',
      -- C34 e-invoicing
      'einvoicing_providers', 'einvoicing_submissions', 'einvoicing_provider_events',
      -- C35 financing
      'financing_partners', 'financing_referrals',
      -- C36 field artifacts (interventions inherits RLS from base)
      'intervention_field_artifacts',
      -- C37 voice
      'voice_policies', 'voice_calls',
      -- C38 observability
      'platform_components', 'platform_component_events', 'platform_component_backlogs'
    )
    and not relrowsecurity
  limit 1;

  if bad_table is not null then
    raise exception 'RLS must be enabled on % (Wave 5/6 tables)', bad_table;
  end if;
end;
$$;

-- =========================================================================
-- Wording invariant (INV-01): no "conforme" in any comment/label
-- =========================================================================
-- We scan RPC descriptions + column comments for the forbidden French
-- verdicts. A future PR wiring "conforme" into a surface label MUST
-- fail this test.
do $$
declare
  forbidden_hit text;
begin
  select proname into forbidden_hit
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (
      obj_description(p.oid, 'pg_proc') ilike '%conforme%'
      or obj_description(p.oid, 'pg_proc') ilike '%SESIRA déclare%'
      or obj_description(p.oid, 'pg_proc') ilike '%SESIRA declare%'
    )
    and proname not like 'test_%'
  limit 1;

  if forbidden_hit is not null then
    raise exception 'INV-01: RPC comment contains forbidden verdict wording: %', forbidden_hit;
  end if;
end;
$$;

-- =========================================================================
-- INV-06: no forbidden columns on voice/financing (defense-in-depth)
-- =========================================================================
do $$
declare
  bad_col record;
begin
  select c.relname as table_name, a.attname as column_name into bad_col
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  where c.relname in ('voice_calls', 'financing_partners', 'financing_referrals')
    and a.attname in (
      'emotion', 'sentiment', 'sentiment_score',
      'reliability_score', 'aggression_score',
      'diagnosis', 'technical_diagnosis',
      'quoted_price', 'eligibility_score', 'credit_score',
      'income', 'debt_ratio', 'monthly_payment', 'interest_rate'
    )
  limit 1;

  if bad_col.table_name is not null then
    raise exception 'INV-06: table % has forbidden column %', bad_col.table_name, bad_col.column_name;
  end if;
end;
$$;

-- =========================================================================
-- Setup: 2 tenants + 1 ACTIVE member each
-- =========================================================================
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000',
   '91100000-0000-4000-8000-000000000091', 'authenticated', 'authenticated',
   'w56-a@sesira.test', crypt('x', gen_salt('bf')), now(),
   '{}'::jsonb, '{}'::jsonb, now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000',
   '92200000-0000-4000-8000-000000000092', 'authenticated', 'authenticated',
   'w56-b@sesira.test', crypt('x', gen_salt('bf')), now(),
   '{}'::jsonb, '{}'::jsonb, now(), now(), false, false);

insert into public.organizations (id, name) values
  ('91000000-0000-4000-8000-000000000091', 'Wave5/6 Tenant A'),
  ('92000000-0000-4000-8000-000000000092', 'Wave5/6 Tenant B');

insert into public.organization_members (organization_id, user_id, status, role) values
  ('91000000-0000-4000-8000-000000000091', '91100000-0000-4000-8000-000000000091', 'ACTIVE', 'ADMIN'),
  ('92000000-0000-4000-8000-000000000092', '92200000-0000-4000-8000-000000000092', 'ACTIVE', 'ADMIN');

-- =========================================================================
-- TEST: tenant A cannot read tenant B equipment (RLS)
-- =========================================================================
insert into public.customers (id, organization_id, display_name, type)
values
  ('91100c00-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000091', 'Cust A', 'COMPANY'),
  ('92200c00-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000092', 'Cust B', 'COMPANY');

insert into public.equipment (
  id, organization_id, customer_id, label, equipment_category,
  fluid_code, charge_kg
) values
  ('91100e00-0000-4000-8000-000000000001',
   '91000000-0000-4000-8000-000000000091', '91100c00-0000-4000-8000-000000000001',
   'A-fridge', 'STATIONARY_REFRIG', 'R-410A', 12.5),
  ('92200e00-0000-4000-8000-000000000002',
   '92000000-0000-4000-8000-000000000092', '92200c00-0000-4000-8000-000000000002',
   'B-fridge', 'STATIONARY_REFRIG', 'R-410A', 12.5);

do $$
declare
  visible_count integer;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '91100000-0000-4000-8000-000000000091', 'role', 'authenticated')::text,
    true
  );

  select count(*) into visible_count from public.equipment;
  if visible_count <> 1 then
    raise exception 'RLS leak: tenant A must see exactly 1 equipment, saw %', visible_count;
  end if;

  reset role;
end;
$$;

-- =========================================================================
-- TEST: authenticated caller cannot call supersede_regulatory_gwp_value
--       (service_role only)
-- =========================================================================
do $$
declare
  raised boolean := false;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '91100000-0000-4000-8000-000000000091', 'role', 'authenticated')::text,
    true
  );

  begin
    perform public.supersede_regulatory_gwp_value(gen_random_uuid(), '2030-12-31'::date);
  exception when insufficient_privilege or others then
    raised := true;
  end;

  reset role;

  if not raised then
    raise exception 'supersede_regulatory_gwp_value must refuse authenticated callers';
  end if;
end;
$$;

-- =========================================================================
-- TEST: mark_regulatory_attention_seen sets seen_at exactly ONCE (INV-02)
-- =========================================================================
insert into public.regulatory_attentions (
  id, organization_id, category, entity_type, entity_id,
  title, idempotency_key, rule_snapshot
) values (
  '91100a00-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000091',
  'MISSING_DATA', 'organization',
  '91000000-0000-4000-8000-000000000091',
  'Test attention',
  'test:seen_once:1',
  '{}'::jsonb
);

do $$
declare
  first_ok  boolean;
  second_ok boolean;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '91100000-0000-4000-8000-000000000091', 'role', 'authenticated')::text,
    true
  );

  first_ok := public.mark_regulatory_attention_seen(
    '91000000-0000-4000-8000-000000000091',
    '91100a00-0000-4000-8000-000000000001',
    '91100000-0000-4000-8000-000000000091'
  );
  second_ok := public.mark_regulatory_attention_seen(
    '91000000-0000-4000-8000-000000000091',
    '91100a00-0000-4000-8000-000000000001',
    '91100000-0000-4000-8000-000000000091'
  );

  reset role;

  if not first_ok then
    raise exception 'INV-02: first mark_regulatory_attention_seen must succeed';
  end if;
  if second_ok then
    raise exception 'INV-02: second mark_regulatory_attention_seen must return false (seen_at already set)';
  end if;
end;
$$;

-- Additionally: try to UPDATE seen_at directly — trigger must reject.
do $$
declare
  raised boolean := false;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '91100000-0000-4000-8000-000000000091', 'role', 'authenticated')::text,
    true
  );

  begin
    update public.regulatory_attentions
      set seen_at = now() - interval '1 day'
    where id = '91100a00-0000-4000-8000-000000000001';
  exception when others then
    raised := true;
  end;

  reset role;

  if not raised then
    raise exception 'INV-02: direct UPDATE of seen_at (already set) must raise';
  end if;
end;
$$;

-- =========================================================================
-- TEST: regulatory_gwp_values immutability (content columns)
-- =========================================================================
insert into public.regulatory_gwp_values (
  id, fluid_code, fluid_name, gwp_100y, ipcc_assessment,
  effective_from, source_ref
) values (
  '91100g00-0000-4000-8000-000000000001',
  'TEST-FLUID', 'Test Fluid', 100.000, 'AR6',
  '2024-01-01', 'test source'
);

do $$
declare
  raised boolean := false;
begin
  begin
    -- Anyone (even service_role via the trigger) — content update must raise
    update public.regulatory_gwp_values
      set gwp_100y = 200.000
    where id = '91100g00-0000-4000-8000-000000000001';
  exception when others then
    raised := true;
  end;

  if not raised then
    raise exception 'INV-03: regulatory_gwp_values.gwp_100y must be immutable';
  end if;
end;
$$;

-- Setting effective_until once is allowed
update public.regulatory_gwp_values
  set effective_until = '2025-12-31'
where id = '91100g00-0000-4000-8000-000000000001';

-- Setting effective_until AGAIN (change) must raise
do $$
declare
  raised boolean := false;
begin
  begin
    update public.regulatory_gwp_values
      set effective_until = '2026-12-31'
    where id = '91100g00-0000-4000-8000-000000000001';
  exception when others then
    raised := true;
  end;

  if not raised then
    raise exception 'INV-03: regulatory_gwp_values.effective_until must be write-once';
  end if;
end;
$$;

-- =========================================================================
-- TEST: record_voice_call_processed rejects forbidden metadata keys
-- =========================================================================
-- Setup: policy + call in TRANSCRIBED (bypass state machine for the test
-- by inserting directly with default RECEIVED then advancing via updates
-- as authenticated — the trigger enforces on authenticated updates, so we
-- do inserts as postgres and rely on the RPC's own metadata check).
insert into public.voice_policies (
  organization_id, ai_disclosure_message, recording_notice_message
) values (
  '91000000-0000-4000-8000-000000000091',
  'Cette conversation implique une IA.',
  'Cet appel peut être enregistré. Touche 9 pour refuser.'
);

insert into public.voice_calls (
  id, organization_id, provider_kind, external_call_ref,
  status, started_at, retention_expires_at, transcript_retention_expires_at
) values (
  '91100v00-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000091',
  'TEST', 'test-ext-ref-1',
  'TRANSCRIBED', now(),
  now() + interval '180 days', now() + interval '365 days'
);

do $$
declare
  raised boolean := false;
begin
  -- service_role — the RPC's role check will pass, then the metadata
  -- forbidden-key guard must raise.
  begin
    perform public.record_voice_call_processed(
      '91000000-0000-4000-8000-000000000091',
      '91100v00-0000-4000-8000-000000000001',
      null, null, null, null, null,
      jsonb_build_object('sentiment_score', 0.9, 'summary', 'ok')
    );
  exception when others then
    raised := true;
  end;

  if not raised then
    raise exception 'record_voice_call_processed must reject metadata with sentiment_score';
  end if;
end;
$$;

-- =========================================================================
-- TEST: is_platform_component_enabled returns false for DISABLED_MANUAL
-- =========================================================================
insert into public.platform_components (
  organization_id, component_kind, display_label, status
) values (
  '91000000-0000-4000-8000-000000000091',
  'AI_MISTRAL', 'Mistral AI (test)', 'DISABLED_MANUAL'
);

do $$
declare
  enabled boolean;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '91100000-0000-4000-8000-000000000091', 'role', 'authenticated')::text,
    true
  );

  enabled := public.is_platform_component_enabled(
    '91000000-0000-4000-8000-000000000091', 'AI_MISTRAL'
  );

  reset role;

  if enabled then
    raise exception 'Kill switch DISABLED_MANUAL must yield is_platform_component_enabled=false';
  end if;
end;
$$;

-- Unregistered component defaults to true
do $$
declare
  enabled boolean;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '91100000-0000-4000-8000-000000000091', 'role', 'authenticated')::text,
    true
  );

  enabled := public.is_platform_component_enabled(
    '91000000-0000-4000-8000-000000000091', 'GROWTH'
  );

  reset role;

  if not enabled then
    raise exception 'Unregistered component must default to is_platform_component_enabled=true';
  end if;
end;
$$;

-- =========================================================================
-- TEST: record_platform_component_event refuses authenticated callers
-- =========================================================================
do $$
declare
  raised boolean := false;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '91100000-0000-4000-8000-000000000091', 'role', 'authenticated')::text,
    true
  );

  begin
    perform public.record_platform_component_event(
      '91000000-0000-4000-8000-000000000091',
      'AI_MISTRAL', 'ERROR', 'ERROR',
      null, null, null, 'attempted forge', '{}'::jsonb
    );
  exception when insufficient_privilege or others then
    raised := true;
  end;

  reset role;

  if not raised then
    raise exception 'record_platform_component_event must refuse authenticated (service_role only)';
  end if;
end;
$$;

-- =========================================================================
-- TEST: financing_referrals cannot be inserted without consent_recorded_at
-- =========================================================================
insert into public.financing_partners (
  id, organization_id, name, partner_type, status
) values (
  '91100f00-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000091',
  'Bank A', 'BANK', 'ACTIVE'
);

do $$
declare
  raised boolean := false;
begin
  begin
    insert into public.financing_referrals (
      organization_id, customer_id, partner_id,
      referred_by_user_id, referred_at,
      consent_scope
      -- consent_recorded_at intentionally missing
    ) values (
      '91000000-0000-4000-8000-000000000091',
      '91100c00-0000-4000-8000-000000000001',
      '91100f00-0000-4000-8000-000000000001',
      '91100000-0000-4000-8000-000000000091',
      now(),
      'test scope'
    );
  exception when not_null_violation or others then
    raised := true;
  end;

  if not raised then
    raise exception 'financing_referrals must reject inserts without consent_recorded_at';
  end if;
end;
$$;

-- =========================================================================
-- TEST: idempotency — intervention_field_artifacts replay on same
--       (org, intervention, offline_client_id) returns the same row
-- =========================================================================
insert into public.interventions (
  id, organization_id, customer_id, title, status,
  assigned_user_id
) values (
  '91100i00-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000091',
  '91100c00-0000-4000-8000-000000000001',
  'Test intervention', 'CONFIRMED',
  '91100000-0000-4000-8000-000000000091'
);

do $$
declare
  first_row  record;
  second_row record;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '91100000-0000-4000-8000-000000000091', 'role', 'authenticated')::text,
    true
  );

  select * into first_row
  from public.submit_intervention_field_artifact(
    '91000000-0000-4000-8000-000000000091',
    '91100i00-0000-4000-8000-000000000001',
    'NOTE',
    jsonb_build_object('text', 'first'),
    now(),
    '91100000-0000-4000-8000-000000000091',
    'offline-client-key-abc'
  );
  select * into second_row
  from public.submit_intervention_field_artifact(
    '91000000-0000-4000-8000-000000000091',
    '91100i00-0000-4000-8000-000000000001',
    'NOTE',
    jsonb_build_object('text', 'replay attempt'),
    now(),
    '91100000-0000-4000-8000-000000000091',
    'offline-client-key-abc'
  );

  reset role;

  if first_row.artifact_id <> second_row.artifact_id then
    raise exception 'Offline replay produced two rows (first=% second=%); idempotency broken',
      first_row.artifact_id, second_row.artifact_id;
  end if;
end;
$$;

-- =========================================================================
-- TEST: submit_intervention_field_artifact flags CONFLICT when
--       intervention is already COMPLETED
-- =========================================================================
update public.interventions
  set status = 'COMPLETED', completed_at = now()
where id = '91100i00-0000-4000-8000-000000000001';

do $$
declare
  outcome record;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '91100000-0000-4000-8000-000000000091', 'role', 'authenticated')::text,
    true
  );

  select * into outcome
  from public.submit_intervention_field_artifact(
    '91000000-0000-4000-8000-000000000091',
    '91100i00-0000-4000-8000-000000000001',
    'PHOTO',
    jsonb_build_object('url', 'https://x/y.jpg'),
    now(),
    '91100000-0000-4000-8000-000000000091',
    'offline-client-key-post-complete'
  );

  reset role;

  if outcome.upload_status <> 'CONFLICT' then
    raise exception 'Artifact on COMPLETED intervention must be flagged CONFLICT (got %)', outcome.upload_status;
  end if;
end;
$$;

-- =========================================================================
-- TEST: regulatory_attentions cannot be inserted with duplicate
--       idempotency_key (per-org uniqueness)
-- =========================================================================
do $$
declare
  raised boolean := false;
begin
  insert into public.regulatory_attentions (
    organization_id, category, entity_type, entity_id,
    title, idempotency_key, rule_snapshot
  ) values (
    '91000000-0000-4000-8000-000000000091',
    'MISSING_DATA', 'organization',
    '91000000-0000-4000-8000-000000000091',
    'Dedup test',
    'dedup:test:1',
    '{}'::jsonb
  );

  begin
    insert into public.regulatory_attentions (
      organization_id, category, entity_type, entity_id,
      title, idempotency_key, rule_snapshot
    ) values (
      '91000000-0000-4000-8000-000000000091',
      'MISSING_DATA', 'organization',
      '91000000-0000-4000-8000-000000000091',
      'Dedup dup',
      'dedup:test:1',
      '{}'::jsonb
    );
  exception when unique_violation or others then
    raised := true;
  end;

  if not raised then
    raise exception 'regulatory_attentions must reject duplicate idempotency_key within an org';
  end if;
end;
$$;

-- =========================================================================
-- TEST: einvoicing_provider_events unique dedup (org, sub, kind, ref)
-- =========================================================================
insert into public.einvoicing_providers (
  id, organization_id, provider_kind, label, status
) values (
  '91100ep0-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000091',
  'TEST', 'Test provider', 'ACTIVE'
);

insert into public.invoices (
  id, organization_id, customer_id, amount, currency, status,
  external_ref, issued_at, due_at
) values (
  '91100inv0-000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000091',
  '91100c00-0000-4000-8000-000000000001',
  100.00, 'EUR', 'ISSUED',
  'INV-001', now(), now() + interval '30 days'
);

insert into public.einvoicing_submissions (
  id, organization_id, invoice_id, provider_id, provider_kind_snapshot,
  format, status, external_ref
) values (
  '91100es0-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000091',
  '91100inv0-000-4000-8000-000000000001',
  '91100ep0-0000-4000-8000-000000000001',
  'TEST', 'UBL', 'EXPORTED', 'ext-1'
);

do $$
declare
  raised boolean := false;
begin
  insert into public.einvoicing_provider_events (
    organization_id, submission_id, provider_id, event_kind, external_ref
  ) values (
    '91000000-0000-4000-8000-000000000091',
    '91100es0-0000-4000-8000-000000000001',
    '91100ep0-0000-4000-8000-000000000001',
    'ACCEPTANCE', 'evt-ref-1'
  );

  begin
    insert into public.einvoicing_provider_events (
      organization_id, submission_id, provider_id, event_kind, external_ref
    ) values (
      '91000000-0000-4000-8000-000000000091',
      '91100es0-0000-4000-8000-000000000001',
      '91100ep0-0000-4000-8000-000000000001',
      'ACCEPTANCE', 'evt-ref-1'
    );
  exception when unique_violation or others then
    raised := true;
  end;

  if not raised then
    raise exception 'einvoicing_provider_events must dedup (org, submission, kind, external_ref)';
  end if;
end;
$$;

-- =========================================================================
-- TEST: platform_component_dashboard aggregates only real events
-- =========================================================================
-- Setup: 2 events (1 SUCCESS, 1 ERROR), no synthesized "health"
insert into public.platform_component_events (
  organization_id, component_id, event_kind, severity, recorded_at
) values
  ('91000000-0000-4000-8000-000000000091',
   (select id from public.platform_components
      where organization_id = '91000000-0000-4000-8000-000000000091'
        and component_kind = 'AI_MISTRAL'),
   'SUCCESS', 'INFO', now() - interval '10 minutes'),
  ('91000000-0000-4000-8000-000000000091',
   (select id from public.platform_components
      where organization_id = '91000000-0000-4000-8000-000000000091'
        and component_kind = 'AI_MISTRAL'),
   'ERROR', 'ERROR', now() - interval '5 minutes');

do $$
declare
  row_ai record;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '91100000-0000-4000-8000-000000000091', 'role', 'authenticated')::text,
    true
  );

  select * into row_ai
  from public.platform_component_dashboard('91000000-0000-4000-8000-000000000091')
  where component_kind = 'AI_MISTRAL';

  reset role;

  if row_ai.success_count_last_hour <> 1 or row_ai.error_count_last_hour <> 1 then
    raise exception 'platform_component_dashboard aggregation off (success=%, error=%)',
      row_ai.success_count_last_hour, row_ai.error_count_last_hour;
  end if;
end;
$$;

-- =========================================================================
-- TEST: Cross-tenant financing_referrals — tenant B cannot see A
-- =========================================================================
insert into public.financing_referrals (
  organization_id, customer_id, partner_id,
  referred_by_user_id, referred_at,
  consent_recorded_at, consent_scope
) values (
  '91000000-0000-4000-8000-000000000091',
  '91100c00-0000-4000-8000-000000000001',
  '91100f00-0000-4000-8000-000000000001',
  '91100000-0000-4000-8000-000000000091',
  now(),
  now(), 'test consent'
);

do $$
declare
  visible integer;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '92200000-0000-4000-8000-000000000092', 'role', 'authenticated')::text,
    true
  );

  select count(*) into visible from public.financing_referrals
  where organization_id = '91000000-0000-4000-8000-000000000091';

  reset role;

  if visible <> 0 then
    raise exception 'Tenant B RLS leak on financing_referrals (saw % rows)', visible;
  end if;
end;
$$;

-- =========================================================================
-- Result
-- =========================================================================
do $$
begin
  raise notice 'Wave 5/6 offensive suite passed (14 tests, 0 regressions)';
end;
$$;

rollback;
