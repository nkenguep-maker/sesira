import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Default lease duration for a claimed follow-up run. 5 minutes is
 * enough to compose an outbound message and persist a decision even
 * on a cold Vercel invocation, and short enough that a crashed
 * worker is recovered within one cron tick (10 minutes).
 */
export const DEFAULT_FOLLOWUP_LEASE_SECONDS = 300;

/**
 * Postgrest defensively caps `list_due_quote_followup_runs` at 200.
 * Mirroring the cap here keeps the TS caller honest about page size.
 */
export const MAX_FOLLOWUP_DUE_LIMIT = 200;

export interface DueRunRow {
  id: string;
  organization_id: string;
  automation_config_id: string | null;
  automation_config_level: string;
  automation_config_config: unknown;
  idempotency_key: string;
  scheduled_for: string | null;
  next_attempt_at: string | null;
  input_summary: unknown;
  attempt_count: number;
  quote_id: string;
  step: number;
}

/**
 * Returns PENDING follow-up runs whose scheduled_for / next_attempt_at
 * has arrived AND whose owning quote is still eligible. The database
 * function joins to `quotes` and `automation_configs` so stop guards
 * (paused, opted-out, terminal, replied, disabled config) are enforced
 * in a single query — the worker can trust the result without a
 * second per-row eligibility check.
 */
export async function listDueQuoteFollowupRuns(
  organizationId: string,
  now: Date,
  limit: number,
): Promise<DueRunRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_due_quote_followup_runs", {
    target_organization_id: organizationId,
    target_now: now.toISOString(),
    target_limit: Math.min(Math.max(limit, 0), MAX_FOLLOWUP_DUE_LIMIT),
  });

  if (error) {
    throw new Error(`listDueQuoteFollowupRuns: ${error.message}`);
  }

  return (data ?? []) as DueRunRow[];
}

/**
 * Atomic compare-and-set claim. Returns TRUE iff this call now holds
 * the lease. Two concurrent callers observe at most one TRUE for the
 * same run. Reclaims RUNNING runs whose lease has expired.
 */
export async function claimQuoteFollowupRun(
  runId: string,
  organizationId: string,
  workerId: string,
  leaseSeconds: number = DEFAULT_FOLLOWUP_LEASE_SECONDS,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_automation_run", {
    target_run_id: runId,
    target_organization_id: organizationId,
    target_worker_id: workerId,
    lease_seconds: leaseSeconds,
  });

  if (error) {
    throw new Error(`claimQuoteFollowupRun: ${error.message}`);
  }
  return data === true;
}

/**
 * Terminate a claimed run. `terminalStatus`:
 *   SUCCEEDED / FAILED / CANCELLED — write completed_at.
 *   PENDING — release the lease and set next_attempt_at for a retry.
 *
 * Returns FALSE when the caller no longer holds a valid lease (the
 * run was reclaimed by another worker after the lease expired). This
 * lets the caller drop its in-flight work instead of overwriting a
 * fresh attempt.
 */
export async function releaseQuoteFollowupRun(
  runId: string,
  organizationId: string,
  workerId: string,
  terminalStatus: "SUCCEEDED" | "FAILED" | "CANCELLED" | "PENDING",
  options: {
    errorMessage?: string | null;
    nextAttemptAt?: Date | null;
    outputSummary?: Record<string, unknown> | null;
  } = {},
): Promise<boolean> {
  if (terminalStatus === "PENDING" && !options.nextAttemptAt) {
    throw new RangeError(
      "releaseQuoteFollowupRun: nextAttemptAt is required when terminal_status is PENDING",
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("release_automation_run", {
    target_run_id: runId,
    target_organization_id: organizationId,
    target_worker_id: workerId,
    terminal_status: terminalStatus,
    error_message: options.errorMessage ?? null,
    next_attempt_at: options.nextAttemptAt?.toISOString() ?? null,
    target_output_summary: (options.outputSummary ?? null) as never,
  });

  if (error) {
    throw new Error(`releaseQuoteFollowupRun: ${error.message}`);
  }
  return data === true;
}
