import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("live database parity gate", () => {
  it("restores the applied C25 and reconstructed C26 migrations to Git history", () => {
    const interventions = source("supabase/migrations/20260916000000_interventions_core.sql");
    const reports = source("supabase/migrations/20260917000000_field_reports.sql");
    expect(interventions).toContain("create table public.interventions");
    expect(interventions).toContain("schedule_intervention");
    expect(reports).toContain("create table public.field_reports");
    expect(reports).toContain("transition_field_report_review");
    expect(reports).toContain("does not itself perform any external send");
  });

  it("reconciles C19 without deleting the historical value policy surface", () => {
    const migration = source("supabase/migrations/20260918000000_reconcile_value_and_commercial_contracts.sql");
    expect(migration).toContain("add column if not exists operational_next_step_at");
    expect(migration).toContain("set_sold_not_scheduled_policy");
    expect(migration).toContain("set_opportunity_operational_next_step");
    expect(migration).not.toContain("drop table public.value_policies");
  });

  it("adds current C20 structured objections while preserving legacy data", () => {
    const migration = source("supabase/migrations/20260918000000_reconcile_value_and_commercial_contracts.sql");
    expect(migration).toContain("create table if not exists public.commercial_objections");
    expect(migration).toContain("to_regclass('public.reply_objections')");
    expect(migration).toContain("on conflict (organization_id, message_id) do nothing");
    expect(migration).toContain("email_open_signal_used");
    expect(migration).not.toContain("drop table public.reply_objections");
  });

  it("keeps historical response metrics separate from current C22 handling semantics", () => {
    const migration = source("supabase/migrations/20260919000000_reconcile_speed_to_lead_and_drafting.sql");
    expect(migration).toContain("add column if not exists first_handled_at");
    expect(migration).toContain("FIRST_INTERNAL_HANDLING");
    expect(migration).toContain("Internal handling only; never a claim that a customer response was sent");
    expect(migration).not.toContain("drop column first_response_at");
    expect(migration).not.toContain("update public.requests set first_handled_at = first_response_at");
  });

  it("installs the strengthened C23 send gate forward-only", () => {
    const migration = source("supabase/migrations/20260919000000_reconcile_speed_to_lead_and_drafting.sql");
    expect(migration).toContain("add column if not exists draft_analysis_at");
    expect(migration).toContain("cannot be sent before draft analysis");
    expect(migration).toContain("cannot be sent with unresolved draft gaps");
    expect(migration).toContain("co.kind = 'COMPLAINT'");
  });

  it("bridges real intervention scheduling to C19 without erasing unrelated next steps", () => {
    const migration = source("supabase/migrations/20260920000000_reconcile_operations_and_grants.sql");
    expect(migration).toContain("sync_intervention_operational_next_step");
    expect(migration).toContain("operational_next_step_source = 'INTERVENTION'");
    expect(migration).toContain("operational_next_step_at is not distinct from new.scheduled_at");
    expect(migration).toContain("A different manual/system next step is never erased");
  });

  it("narrows C25/C26 grants instead of relying on project default privileges", () => {
    const migration = source("supabase/migrations/20260920000000_reconcile_operations_and_grants.sql");
    expect(migration).toContain("revoke all on public.interventions from public, anon, authenticated");
    expect(migration).toContain("grant select, insert, update on public.interventions to authenticated");
    expect(migration).toContain("revoke all on public.field_reports from public, anon, authenticated");
    expect(migration).toContain("grant select, insert, update on public.field_reports to authenticated");
  });
});
