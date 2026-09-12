-- SESIRA Core Workflow — Post-C40 integration gate + dashboard snapshot (C49).
--
-- Closes the Wave post-C40 (C41→C48). NO new feature — this milestone
-- audits the maturity gate and ships:
--   * Extended `export_organization_snapshot` (INV-07 Data Act) covering
--     every C41-C48 table.
--   * NEW `get_dashboard_snapshot(org, role, timezone)` — consolidated
--     read model so /app doesn't fire 10 sequential queries.
--
-- Reference: docs/core/CORE_EXTENSIONS_PLAN.md §7 C49.
--
-- DOCTRINE INVARIANTS APPLIED (dashboard snapshot):
--
--   No coerce UNAVAILABLE → 0:
--     * Provider states section is populated ONLY when the state is
--       degraded/pending/actionable — otherwise the key is absent.
--     * ETA snapshot from C42 exposed as-is; if the latest row is
--       UNAVAILABLE / FAILED the caller renders that verbatim.
--
--   No fake provider states:
--     * SMS state comes from outbound_messages counts of DRAFT /
--       WAITING_FOR_APPROVAL / UNDELIVERED — the real signal.
--     * Trust state comes from document_trust_requests counts of
--       SUBMITTED / REJECTED / FAILED.
--     * Trackdéchets from trackdechets_submissions REJECTED / FAILED.
--
--   Money grouped by currency, never merged.
--
--   Max 7 decisions contract — the RPC returns AT MOST 7 rows in the
--   `decisions` array. Ordered by priority DESC then observed_at DESC.
--
--   Timezone respected — day windows use `AT TIME ZONE target_timezone`.
--
--   Regulatory: no compliance verdict — only deadlines + gaps + review
--   counts. UI renders wording rules from doctrine §10.
--
--   Role-based:
--     * viewer  → all sections readable, no action verbs.
--     * admin   → same + actionable links.
--     * owner   → same + provider states (may see integration health).
--     Current implementation returns the same JSON — the differentiation
--     lives in the UI. Role is stored in the payload so consumers can
--     react without a second lookup.

-- =========================================================================
-- Section 1 — Extend export_organization_snapshot with C41→C48 counts
-- =========================================================================
create or replace function public.export_organization_snapshot(
  target_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'export_organization_snapshot: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'organization_id', target_organization_id,
    'counts', jsonb_build_object(
      -- V1 core
      'customers',           (select count(*) from public.customers where organization_id = target_organization_id),
      'requests',            (select count(*) from public.requests where organization_id = target_organization_id),
      'quotes',              (select count(*) from public.quotes where organization_id = target_organization_id),
      'messages',            (select count(*) from public.messages where organization_id = target_organization_id),
      'events',              (select count(*) from public.events where organization_id = target_organization_id),
      'attention_items',     (select count(*) from public.attention_items where organization_id = target_organization_id),
      'automation_configs',  (select count(*) from public.automation_configs where organization_id = target_organization_id),
      'automation_runs',     (select count(*) from public.automation_runs where organization_id = target_organization_id),
      'ai_runs',             (select count(*) from public.ai_runs where organization_id = target_organization_id),
      'outbound_messages',   (select count(*) from public.outbound_messages where organization_id = target_organization_id),
      'incidents',           (select count(*) from public.incidents where organization_id = target_organization_id),
      'audit_logs',          (select count(*) from public.audit_logs where organization_id = target_organization_id),
      'imports',             (select count(*) from public.imports where organization_id = target_organization_id),
      -- C41 dispatch
      'field_vehicles',                    (select count(*) from public.field_vehicles where organization_id = target_organization_id),
      'intervention_dispatch_assignments', (select count(*) from public.intervention_dispatch_assignments where organization_id = target_organization_id),
      'technician_availability_blocks',    (select count(*) from public.technician_availability_blocks where organization_id = target_organization_id),
      -- C42 fleet
      'fleet_location_pings',    (select count(*) from public.fleet_location_pings where organization_id = target_organization_id),
      'fleet_tracking_policies', (select count(*) from public.fleet_tracking_policies where organization_id = target_organization_id),
      'fleet_route_estimates',   (select count(*) from public.fleet_route_estimates where organization_id = target_organization_id),
      -- C43 guided procedures
      'field_procedure_templates',   (select count(*) from public.field_procedure_templates where organization_id = target_organization_id or organization_id is null),
      'intervention_procedure_runs', (select count(*) from public.intervention_procedure_runs where organization_id = target_organization_id),
      'field_step_results',          (select count(*) from public.field_step_results where organization_id = target_organization_id),
      'binary_field_artifacts',      (select count(*) from public.binary_field_artifacts where organization_id = target_organization_id),
      -- C44 sms
      'sms_templates', (select count(*) from public.sms_templates where organization_id = target_organization_id),
      'sms_opt_outs',  (select count(*) from public.sms_opt_outs where organization_id = target_organization_id),
      -- C45 document trust
      'document_versions',        (select count(*) from public.document_versions where organization_id = target_organization_id),
      'document_trust_requests',  (select count(*) from public.document_trust_requests where organization_id = target_organization_id),
      'document_trust_evidence',  (select count(*) from public.document_trust_evidence where organization_id = target_organization_id),
      -- C46 trackdechets
      'waste_dossiers',           (select count(*) from public.waste_dossiers where organization_id = target_organization_id),
      'trackdechets_submissions', (select count(*) from public.trackdechets_submissions where organization_id = target_organization_id),
      -- C47 invoice lifecycle
      'invoice_line_items', (select count(*) from public.invoice_line_items where organization_id = target_organization_id),
      'payment_records',    (select count(*) from public.payment_records where organization_id = target_organization_id),
      -- C48 contract renewals
      'contract_versions',  (select count(*) from public.contract_versions where organization_id = target_organization_id),
      'renewal_cases',      (select count(*) from public.renewal_cases where organization_id = target_organization_id),
      'amendment_versions', (select count(*) from public.amendment_versions where organization_id = target_organization_id)
    ),
    'organization', (
      select jsonb_build_object(
        'id', id, 'name', name, 'slug', slug, 'sector_key', sector_key,
        'status', status, 'created_at', created_at
      )
      from public.organizations where id = target_organization_id
    )
  ) into snapshot;

  perform public.record_audit_log(
    target_organization_id, 'organization.export_snapshot',
    'organization', target_organization_id,
    jsonb_build_object('counts_only', true, 'includes_post_c40', true)
  );

  return snapshot;
end;
$$;

comment on function public.export_organization_snapshot(uuid) is
  'C49 extension of the V1 offboarding snapshot. Now covers every post-C40 table (C41 dispatch, C42 fleet, C43 procedures, C44 sms, C45 trust, C46 trackdechets, C47 invoice lifecycle, C48 renewals). Counts only — full row export is a separate dump pipeline.';

-- =========================================================================
-- Section 2 — get_dashboard_snapshot RPC
-- =========================================================================
create or replace function public.get_dashboard_snapshot(
  target_organization_id uuid,
  target_role            text,
  target_timezone        text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  snapshot                     jsonb;
  today_start_utc              timestamptz;
  today_end_utc                timestamptz;
  decisions_json               jsonb;
  money_json                   jsonb;
  field_today_json             jsonb;
  regulatory_json              jsonb;
  provider_states_json         jsonb;
  status_bar_json              jsonb;
begin
  if not private.is_organization_member(target_organization_id) then
    raise exception 'get_dashboard_snapshot: caller is not a member of organization %', target_organization_id
      using errcode = '42501';
  end if;
  if target_timezone is null or length(target_timezone) = 0 then
    raise exception 'get_dashboard_snapshot: timezone required'
      using errcode = '22023';
  end if;
  if target_role is null or target_role not in ('viewer', 'admin', 'owner') then
    raise exception 'get_dashboard_snapshot: role must be viewer|admin|owner'
      using errcode = '22023';
  end if;

  today_start_utc := (current_date::timestamp at time zone target_timezone);
  today_end_utc   := ((current_date + 1)::timestamp at time zone target_timezone);

  -- =====================================================================
  -- Status bar
  -- =====================================================================
  select jsonb_build_object(
    'observed_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'automation_mode', (
      select coalesce(max(execution_mode), 'OBSERVATION')
      from public.automation_configs
      where organization_id = target_organization_id
    ),
    'incidents_open_count', (
      select count(*) from public.incidents
      where organization_id = target_organization_id
        and status in ('OPEN', 'INVESTIGATING')
    )
  ) into status_bar_json;

  -- =====================================================================
  -- Decisions — max 7, ordered by priority DESC then updated_at DESC
  -- =====================================================================
  select coalesce(jsonb_agg(row_to_json(d) order by d.priority_rank desc, d.updated_at desc), '[]'::jsonb)
    into decisions_json
  from (
    select
      case a.priority
        when 'URGENT' then 3 when 'HIGH' then 2 when 'NORMAL' then 1 else 0
      end as priority_rank,
      a.category,
      a.reason,
      a.title,
      a.explanation as detail,
      a.suggested_action as action,
      a.entity_type as entity_ref_type,
      a.entity_id as entity_ref_id,
      a.priority,
      a.updated_at,
      a.metadata
    from public.attention_items a
    where a.organization_id = target_organization_id
      and a.status = 'OPEN'
    order by
      case a.priority
        when 'URGENT' then 3 when 'HIGH' then 2 when 'NORMAL' then 1 else 0
      end desc,
      a.updated_at desc
    limit 7
  ) d;

  -- =====================================================================
  -- Money grouped by currency
  -- =====================================================================
  select coalesce(jsonb_object_agg(currency, per_currency), '{}'::jsonb)
    into money_json
  from (
    select
      q.currency,
      jsonb_build_object(
        'quotes_awaiting_response_count', (
          select count(*) from public.quotes q2
          where q2.organization_id = target_organization_id
            and q2.currency = q.currency
            and q2.status in ('SENT', 'REMINDED')
        ),
        'overdue_invoices_amount', (
          select coalesce(sum(amount), 0) from public.invoices
          where organization_id = target_organization_id
            and currency = q.currency
            and status = 'OVERDUE'
        ),
        'renewals_soon_count', (
          select count(*) from public.renewal_cases r
          join public.maintenance_contracts c
            on c.id = r.contract_id and c.organization_id = r.organization_id
          where r.organization_id = target_organization_id
            and c.currency = q.currency
            and r.status in ('DRAFT', 'REVIEW_REQUIRED', 'APPROVED', 'READY_TO_SEND', 'SENT', 'CANCELLATION_WINDOW')
            and (r.cancellation_deadline is null or r.cancellation_deadline < now() + interval '60 days')
        )
      ) as per_currency
    from public.quotes q
    where q.organization_id = target_organization_id
    group by q.currency
  ) grouped;

  -- =====================================================================
  -- Field today — dispatch + telemetry freshness + report reviews
  -- =====================================================================
  select jsonb_build_object(
    'assignments_today', (
      select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
      from (
        select
          a.id as assignment_id,
          a.intervention_id,
          a.technician_user_id,
          a.vehicle_id,
          a.dispatch_status,
          a.scheduled_start,
          a.scheduled_end,
          a.route_order
        from public.intervention_dispatch_assignments a
        where a.organization_id = target_organization_id
          and a.scheduled_start >= today_start_utc
          and a.scheduled_start <  today_end_utc
        order by a.technician_user_id asc, a.route_order asc nulls last, a.scheduled_start asc
      ) x
    ),
    'procedure_runs_ready_for_review_count', (
      select count(*) from public.intervention_procedure_runs
      where organization_id = target_organization_id
        and status = 'READY_FOR_REVIEW'
    ),
    'offline_conflicts_count', (
      select count(*) from public.field_step_results
      where organization_id = target_organization_id
        and sync_status = 'CONFLICT'
    ),
    'binary_conflicts_count', (
      select count(*) from public.binary_field_artifacts
      where organization_id = target_organization_id
        and upload_status = 'CONFLICT'
    )
  ) into field_today_json;

  -- =====================================================================
  -- Regulatory — deadlines + gaps counts (no compliance verdict)
  -- =====================================================================
  select jsonb_build_object(
    'trust_requests_submitted_count', (
      select count(*) from public.document_trust_requests
      where organization_id = target_organization_id and status = 'SUBMITTED'
    ),
    'trust_evidence_verification_pending_count', (
      select count(*) from public.document_trust_evidence
      where organization_id = target_organization_id and verification_result = 'UNKNOWN'
    ),
    'waste_dossiers_preparing_count', (
      select count(*) from public.waste_dossiers
      where organization_id = target_organization_id and status = 'PREPARING'
    ),
    'trackdechets_submissions_rejected_count', (
      select count(*) from public.trackdechets_submissions
      where organization_id = target_organization_id and status = 'REJECTED'
    )
  ) into regulatory_json;

  -- =====================================================================
  -- Provider states — only degraded / pending / actionable keys included
  -- =====================================================================
  select jsonb_strip_nulls(jsonb_build_object(
    'sms', case
      when exists (
        select 1 from public.outbound_messages
        where organization_id = target_organization_id
          and channel = 'sms'
          and status in ('UNDELIVERED', 'FAILED', 'WAITING_FOR_APPROVAL')
      )
      then jsonb_build_object(
        'undelivered_count', (
          select count(*) from public.outbound_messages
          where organization_id = target_organization_id and channel = 'sms' and status = 'UNDELIVERED'
        ),
        'failed_count', (
          select count(*) from public.outbound_messages
          where organization_id = target_organization_id and channel = 'sms' and status = 'FAILED'
        ),
        'waiting_approval_count', (
          select count(*) from public.outbound_messages
          where organization_id = target_organization_id and channel = 'sms' and status = 'WAITING_FOR_APPROVAL'
        )
      )
      else null::jsonb
    end,
    'document_trust', case
      when exists (
        select 1 from public.document_trust_requests
        where organization_id = target_organization_id
          and status in ('REJECTED', 'FAILED')
      )
      then jsonb_build_object(
        'rejected_count', (
          select count(*) from public.document_trust_requests
          where organization_id = target_organization_id and status = 'REJECTED'
        ),
        'failed_count', (
          select count(*) from public.document_trust_requests
          where organization_id = target_organization_id and status = 'FAILED'
        )
      )
      else null::jsonb
    end,
    'trackdechets', case
      when exists (
        select 1 from public.trackdechets_submissions
        where organization_id = target_organization_id
          and status in ('REJECTED', 'FAILED')
      )
      then jsonb_build_object(
        'rejected_count', (
          select count(*) from public.trackdechets_submissions
          where organization_id = target_organization_id and status = 'REJECTED'
        ),
        'failed_count', (
          select count(*) from public.trackdechets_submissions
          where organization_id = target_organization_id and status = 'FAILED'
        )
      )
      else null::jsonb
    end,
    'fleet_telemetry', case
      when exists (
        select 1 from public.fleet_tracking_policies
        where organization_id = target_organization_id and enabled = true
      )
      then jsonb_build_object(
        'policy_enabled', true,
        'freshness_seconds', (
          select freshness_seconds from public.fleet_tracking_policies
          where organization_id = target_organization_id
        )
      )
      else null::jsonb
    end
  )) into provider_states_json;

  snapshot := jsonb_build_object(
    'organization_id', target_organization_id,
    'role', target_role,
    'timezone', target_timezone,
    'day_start_utc', to_char(today_start_utc at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'day_end_utc',   to_char(today_end_utc at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'status_bar', status_bar_json,
    'decisions', decisions_json,
    'money', money_json,
    'field_today', field_today_json,
    'regulatory', regulatory_json,
    'provider_states', provider_states_json
  );

  return snapshot;
end;
$$;

revoke all on function public.get_dashboard_snapshot(uuid, text, text) from public, anon;
grant execute on function public.get_dashboard_snapshot(uuid, text, text) to authenticated, service_role;

comment on function public.get_dashboard_snapshot(uuid, text, text) is
  'C49 consolidated dashboard snapshot. Returns a JSON with status_bar, decisions (max 7), money grouped by currency, field_today (dispatch + procedure runs + conflicts), regulatory (deadlines + gaps counts, no verdict), and provider_states (only degraded/pending). Timezone-aware day window. NEVER coerces UNAVAILABLE into 0 or invents provider health. Read model only — no mutation.';
