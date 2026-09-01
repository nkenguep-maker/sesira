import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { releaseQuoteFollowupRun } from "@/lib/followups/worker";
import type { Database } from "@/types/database";

import {
  classifyFailure,
  extractErrorClass,
  extractErrorMessage,
} from "./classify";
import {
  incidentFingerprint,
  recordIncidentOnce,
  type IncidentSeverity,
} from "./incident";
import {
  canAttemptAgain,
  computeNextAttemptAt,
  DEFAULT_RETRY_POLICY,
  type RetryPolicy,
} from "./policy";

/**
 * SESIRA retry runner — wraps a claimed-run work function with:
 *
 *   * failure classification (TRANSIENT vs PERMANENT);
 *   * bounded retries with exponential backoff (never retries a
 *     PERMANENT failure);
 *   * one deduped incident on retry exhaustion or permanent failure;
 *   * the correct release call (SUCCEEDED / PENDING / FAILED).
 *
 * The caller has already claimed the run (via
 * `claimQuoteFollowupRun`); the runner only wraps the work + release
 * step. On any exit path the lease is released so a crashed worker
 * cannot permanently lock the run.
 *
 * `work` is a business function that returns `{ outputSummary }` on
 * success. It MAY throw:
 *   * `PermanentError` — classified PERMANENT, no retry.
 *   * `TransientError` — classified TRANSIENT, retry allowed.
 *   * anything else — classified by heuristics in `classifyFailure()`,
 *     defaulting to TRANSIENT (safer: bounded retry rather than
 *     permanent failure).
 */

export interface RunnerContext {
  runId: string;
  organizationId: string;
  workerId: string;
  /** attempts already completed BEFORE this invocation; the current invocation is attempt (attemptCount + 1). */
  attemptCount: number;
  /** entity linking the incident back to the operator's world (usually a quote / message). */
  entity: { type: string; id: string };
  /** stable name of the caller — used in the incident fingerprint. */
  sourceKind: string;
  /** category text on the incident row. */
  incidentCategory: string;
  /** severity to apply when an incident IS created. */
  incidentSeverity: IncidentSeverity;
  /** human-readable title for a fresh incident (mutable value — never part of the fingerprint). */
  incidentTitleTemplate: (errorClass: string) => string;
  now: Date;
  policy?: RetryPolicy;
  client?: SupabaseClient<Database>;
}

export interface WorkResult {
  /** Persisted atomically alongside the SUCCEEDED release. */
  outputSummary?: Record<string, unknown> | null;
}

export type RunnerOutcome =
  | { status: "SUCCESS" }
  | { status: "RETRY_SCHEDULED"; nextAttemptAt: Date; errorClass: string; errorMessage: string }
  | {
      status: "RETRY_EXHAUSTED";
      incidentId: string;
      incidentCreated: boolean;
      recurrenceCount: number;
      errorClass: string;
      errorMessage: string;
    }
  | {
      status: "PERMANENT_FAILED";
      incidentId: string;
      incidentCreated: boolean;
      recurrenceCount: number;
      errorClass: string;
      errorMessage: string;
    };

/**
 * Run the work function, catch, classify, and release the run
 * appropriately. Returns the runner outcome so the caller can log /
 * telemetry / return to a UI.
 */
export async function runWithRetry(
  work: () => Promise<WorkResult>,
  ctx: RunnerContext,
): Promise<RunnerOutcome> {
  const policy = ctx.policy ?? DEFAULT_RETRY_POLICY;

  let workResult: WorkResult;
  try {
    workResult = await work();
  } catch (error) {
    const errorClass = extractErrorClass(error);
    const errorMessage = extractErrorMessage(error);
    const category = classifyFailure(error);
    const fingerprint = incidentFingerprint(
      ctx.sourceKind,
      ctx.entity.type,
      ctx.entity.id,
      errorClass,
    );
    const attemptedCount = ctx.attemptCount + 1;
    const commonIncidentInput = {
      organizationId: ctx.organizationId,
      fingerprint,
      severity: ctx.incidentSeverity,
      category: ctx.incidentCategory,
      title: ctx.incidentTitleTemplate(errorClass),
      description: errorMessage,
      entity: ctx.entity,
      metadata: {
        source_kind: ctx.sourceKind,
        error_class: errorClass,
        error_message: errorMessage,
        failure_category: category,
        attempt_count: attemptedCount,
        automation_run_id: ctx.runId,
        worker_id: ctx.workerId,
      },
      client: ctx.client,
    };

    if (category === "TRANSIENT" && canAttemptAgain(attemptedCount, policy)) {
      const nextAttemptAt = computeNextAttemptAt(ctx.now, attemptedCount, policy);
      // Release as PENDING — DB bumps attempt_count in the atomic UPDATE.
      const released = await releaseQuoteFollowupRun(
        ctx.runId,
        ctx.organizationId,
        ctx.workerId,
        "PENDING",
        {
          errorMessage,
          nextAttemptAt,
          outputSummary: {
            retry: {
              attempt_count: attemptedCount,
              next_attempt_at: nextAttemptAt.toISOString(),
              failure_category: category,
              error_class: errorClass,
              error_message: errorMessage,
            },
          },
          client: ctx.client,
        },
      );
      if (!released) {
        // Lease was lost — surface as retry_scheduled anyway; the
        // reclaiming worker will treat the run as PENDING and pick it
        // up when next_attempt_at arrives.
      }
      return { status: "RETRY_SCHEDULED", nextAttemptAt, errorClass, errorMessage };
    }

    // TRANSIENT exhausted OR PERMANENT: release FAILED + open incident.
    const incident = await recordIncidentOnce(commonIncidentInput);
    await releaseQuoteFollowupRun(
      ctx.runId,
      ctx.organizationId,
      ctx.workerId,
      "FAILED",
      {
        errorMessage,
        outputSummary: {
          incident: {
            id: incident.id,
            fingerprint,
            recurrence_count: incident.recurrenceCount,
          },
          failure_category: category,
          error_class: errorClass,
          error_message: errorMessage,
          attempt_count: attemptedCount,
        },
        client: ctx.client,
      },
    );
    if (category === "PERMANENT") {
      return {
        status: "PERMANENT_FAILED",
        incidentId: incident.id,
        incidentCreated: incident.created,
        recurrenceCount: incident.recurrenceCount,
        errorClass,
        errorMessage,
      };
    }
    return {
      status: "RETRY_EXHAUSTED",
      incidentId: incident.id,
      incidentCreated: incident.created,
      recurrenceCount: incident.recurrenceCount,
      errorClass,
      errorMessage,
    };
  }

  // Happy path
  await releaseQuoteFollowupRun(
    ctx.runId,
    ctx.organizationId,
    ctx.workerId,
    "SUCCEEDED",
    {
      outputSummary: (workResult.outputSummary ?? undefined) as Record<string, unknown> | undefined,
      client: ctx.client,
    },
  );
  return { status: "SUCCESS" };
}
