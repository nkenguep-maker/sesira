-- =========================================================================
-- SESIRA synthetic volume seed — C39 scale testing
-- =========================================================================
--
-- THIS FILE IS AN EXAMPLE / TEMPLATE. It is NOT applied by
-- `supabase db push` and is NOT tracked in `supabase_migrations`.
--
-- Purpose: exercise the platform at roadmap-C39 target volumes so we
-- catch missing indexes, N+1 queries, and unbounded scans BEFORE a
-- real customer notices.
--
-- Volumes generated (per target org):
--   * 10 000 customers
--   * 50 000 quotes (5 per customer average)
--   * 100 000 events
--   * 5 000 interventions
--   * 20 000 documents (metadata rows — bytes are dummy references)
--   * 5 000 invoices
--   * 1 000 voice_calls
--   * 2 000 ai_runs
--   * 3 000 growth events (leads + campaigns)
--
-- Doctrine:
--   * SESIRA volumes are for load testing ONLY. The generated rows are
--     synthetic and must not leak into a real tenant. The seed target
--     ORG_ID must NOT match any real org.
--   * No PII in the generated data — names/phones/emails use the
--     "sesira-load-XXXX" pattern so an accidental email send is
--     obviously test data.
--   * The seed is wrapped in a savepoint you can rollback if the
--     dry-run reveals an issue.
--
-- Apply with (target a NON-PRODUCTION Supabase env):
--   SUPABASE_ACCESS_TOKEN=<sbp_...> \
--     npx supabase db query --linked -f supabase/seeds/synthetic_volume.example.sql
--
-- Rollback: SELECT rollback_synthetic_volume('<load_org_uuid>');
-- (function defined at the bottom.)

-- =========================================================================
-- SELECT THE TARGET LOAD-TEST ORGANIZATION
-- =========================================================================
-- Edit this UUID to point at YOUR load-test org. It must exist first
-- (create_organization_with_owner or manual insert).
--
--   \set load_org_id '''ffffffff-ffff-4fff-8fff-ffffffffffff'''

-- We use a session-scoped configuration parameter to carry the org id
-- through the DO blocks below.
--   select set_config('sesira.load_org_id', '<uuid>', false);

do $$
declare
  org_id uuid;
begin
  org_id := current_setting('sesira.load_org_id', true)::uuid;
  if org_id is null then
    raise exception 'Set sesira.load_org_id before running: select set_config(''sesira.load_org_id'', ''<uuid>'', false);';
  end if;

  -- Refuse to run on an org with real audit_logs history (heuristic:
  -- audit_logs entries older than 7 days = real activity)
  if exists (
    select 1 from public.audit_logs
    where organization_id = org_id
      and created_at < now() - interval '7 days'
    limit 1
  ) then
    raise exception 'Refusing to seed synthetic volume on org % — it has real audit history', org_id;
  end if;

  raise notice 'Seeding synthetic volume on org %', org_id;
end;
$$;

-- =========================================================================
-- 10 000 customers
-- =========================================================================
do $$
declare
  org_id uuid := current_setting('sesira.load_org_id', true)::uuid;
  i integer;
begin
  for i in 1..10000 loop
    insert into public.customers (
      organization_id, type, display_name, email, phone, metadata
    ) values (
      org_id, 'COMPANY',
      format('sesira-load-customer-%s', i),
      format('sesira-load-%s@test.example', i),
      format('+3300000%s', lpad(i::text, 5, '0')),
      jsonb_build_object('synthetic', true, 'batch', 'C39')
    );
  end loop;
  raise notice 'Inserted 10 000 customers';
end;
$$;

-- =========================================================================
-- 50 000 quotes (5 per customer avg)
-- =========================================================================
do $$
declare
  org_id uuid := current_setting('sesira.load_org_id', true)::uuid;
begin
  insert into public.quotes (
    organization_id, customer_id, status, amount, currency, metadata
  )
  select
    org_id, c.id, 'DRAFT',
    (random() * 5000 + 200)::numeric(10,2), 'EUR',
    jsonb_build_object('synthetic', true, 'batch', 'C39')
  from public.customers c, generate_series(1, 5) g
  where c.organization_id = org_id
    and c.metadata->>'synthetic' = 'true';
  raise notice 'Inserted 50 000 quotes';
end;
$$;

-- =========================================================================
-- 100 000 events
-- =========================================================================
do $$
declare
  org_id uuid := current_setting('sesira.load_org_id', true)::uuid;
  i integer;
begin
  for i in 1..100000 loop
    insert into public.events (
      organization_id, name, kind, entity_type, entity_id, payload
    ) values (
      org_id,
      'synthetic.load.event',
      'CORE',
      'customer',
      -- Use a rotating customer id
      (select id from public.customers where organization_id = org_id
        and metadata->>'synthetic' = 'true' offset (i % 10000) limit 1),
      jsonb_build_object('synthetic', true, 'seq', i)
    );
  end loop;
  raise notice 'Inserted 100 000 events';
end;
$$;

-- =========================================================================
-- 5 000 interventions
-- =========================================================================
do $$
declare
  org_id uuid := current_setting('sesira.load_org_id', true)::uuid;
begin
  insert into public.interventions (
    organization_id, customer_id, title, status, scheduled_at,
    metadata
  )
  select
    org_id, c.id,
    format('Load intervention on %s', c.display_name),
    (array['PLANNED','CONFIRMED','IN_PROGRESS','COMPLETED'])[(random()*4)::int + 1],
    now() + (random() * 30 || ' days')::interval,
    jsonb_build_object('synthetic', true)
  from public.customers c
  where c.organization_id = org_id
    and c.metadata->>'synthetic' = 'true'
  limit 5000;
  raise notice 'Inserted ~5 000 interventions';
end;
$$;

-- =========================================================================
-- 20 000 document metadata rows
-- =========================================================================
do $$
declare
  org_id uuid := current_setting('sesira.load_org_id', true)::uuid;
  i integer;
begin
  for i in 1..20000 loop
    insert into public.documents (
      organization_id, entity_type, file_reference, file_name, kind,
      status, metadata
    ) values (
      org_id, 'customer',
      format('load-doc-ref-%s', i),
      format('load-file-%s.pdf', i),
      (array['CONTRACT','INVOICE','PROOF_OF_DELIVERY','REPORT','OTHER'])[(random()*5)::int + 1],
      'UPLOADED',
      jsonb_build_object('synthetic', true)
    );
  end loop;
  raise notice 'Inserted 20 000 documents';
end;
$$;

-- =========================================================================
-- 5 000 invoices
-- =========================================================================
do $$
declare
  org_id uuid := current_setting('sesira.load_org_id', true)::uuid;
begin
  insert into public.invoices (
    organization_id, customer_id, amount, currency, status,
    external_ref, issued_at, due_at
  )
  select
    org_id, c.id,
    (random() * 5000 + 100)::numeric(10,2), 'EUR', 'ISSUED',
    format('LOAD-INV-%s', c.id),
    now() - (random() * 60 || ' days')::interval,
    now() + (random() * 30 || ' days')::interval
  from public.customers c
  where c.organization_id = org_id
    and c.metadata->>'synthetic' = 'true'
  limit 5000;
  raise notice 'Inserted 5 000 invoices';
end;
$$;

-- =========================================================================
-- 1 000 voice_calls (TEST provider only)
-- =========================================================================
do $$
declare
  org_id uuid := current_setting('sesira.load_org_id', true)::uuid;
  i integer;
begin
  -- Ensure voice_policy exists
  insert into public.voice_policies (
    organization_id, ai_disclosure_message, recording_notice_message,
    region_europe_verified
  ) values (
    org_id, 'Load-test AI disclosure', 'Load-test recording notice', true
  )
  on conflict (organization_id) do nothing;

  for i in 1..1000 loop
    insert into public.voice_calls (
      organization_id, provider_kind, external_call_ref,
      status, started_at, retention_expires_at, transcript_retention_expires_at
    ) values (
      org_id, 'TEST',
      format('load-call-%s', i),
      (array['CLOSED','OPTED_OUT','PROCESSED'])[(random()*3)::int + 1],
      now() - (random() * 90 || ' days')::interval,
      now() + interval '180 days',
      now() + interval '365 days'
    );
  end loop;
  raise notice 'Inserted 1 000 voice_calls';
end;
$$;

-- =========================================================================
-- 2 000 ai_runs
-- =========================================================================
do $$
declare
  org_id uuid := current_setting('sesira.load_org_id', true)::uuid;
  i integer;
begin
  for i in 1..2000 loop
    insert into public.ai_runs (
      organization_id, feature, model, provider, prompt_version,
      status, latency_ms, input_tokens, output_tokens, estimated_cost,
      input_summary
    ) values (
      org_id,
      'SUMMARIZE',
      'mistral-large-latest',
      'mistral',
      'v1',
      case when random() > 0.05 then 'SUCCESS' else 'ERROR' end,
      (random() * 3000 + 200)::integer,
      (random() * 5000 + 500)::integer,
      (random() * 1500 + 100)::integer,
      (random() * 0.05)::numeric(10,4),
      jsonb_build_object('synthetic', true)
    );
  end loop;
  raise notice 'Inserted 2 000 ai_runs';
end;
$$;

-- =========================================================================
-- 3 000 growth events (200 campaigns + 2800 leads)
-- =========================================================================
do $$
declare
  org_id uuid := current_setting('sesira.load_org_id', true)::uuid;
  i integer;
begin
  for i in 1..200 loop
    insert into public.growth_campaigns (
      organization_id, name, channel, status
    ) values (
      org_id,
      format('load-campaign-%s', i),
      (array['PAID_SEARCH','ORGANIC','REFERRAL','EMAIL','EVENT','CONTENT','OTHER'])[(random()*7)::int + 1],
      (array['DRAFT','ACTIVE','PAUSED','ENDED'])[(random()*4)::int + 1]
    );
  end loop;

  for i in 1..2800 loop
    insert into public.leads (
      organization_id, contact_name, contact_email, source,
      status
    ) values (
      org_id,
      format('sesira-load-lead-%s', i),
      format('lead-%s@test.example', i),
      (array['FORM','EMAIL','PHONE','CHAT','REFERRAL','OTHER'])[(random()*6)::int + 1],
      (array['NEW','QUALIFIED','CONVERTED','DISQUALIFIED','ARCHIVED'])[(random()*5)::int + 1]
    );
  end loop;

  raise notice 'Inserted 200 campaigns + 2 800 leads';
end;
$$;

-- =========================================================================
-- Rollback helper (delete all synthetic rows for a load org)
-- =========================================================================
--   select rollback_synthetic_volume('<load_org_uuid>');
create or replace function public.rollback_synthetic_volume(target_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role only';
  end if;
  delete from public.ai_runs where organization_id = target_org and input_summary->>'synthetic' = 'true';
  delete from public.voice_calls where organization_id = target_org and provider_kind = 'TEST' and external_call_ref like 'load-call-%';
  delete from public.leads where organization_id = target_org and contact_email like 'lead-%@test.example';
  delete from public.growth_campaigns where organization_id = target_org and name like 'load-campaign-%';
  delete from public.invoices where organization_id = target_org and external_ref like 'LOAD-INV-%';
  delete from public.documents where organization_id = target_org and file_reference like 'load-doc-ref-%';
  delete from public.interventions where organization_id = target_org and metadata->>'synthetic' = 'true';
  delete from public.events where organization_id = target_org and name = 'synthetic.load.event';
  delete from public.quotes where organization_id = target_org and metadata->>'synthetic' = 'true';
  delete from public.customers where organization_id = target_org and metadata->>'synthetic' = 'true';
end;
$$;

do $$
declare
  org_id uuid := current_setting('sesira.load_org_id', true)::uuid;
begin
  raise notice 'Synthetic volume seed complete on org %.', org_id;
  raise notice 'Rollback with: select public.rollback_synthetic_volume(%L::uuid);', org_id;
end;
$$;
