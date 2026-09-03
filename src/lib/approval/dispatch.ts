import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { EmailProvider } from "@/lib/email/provider";
import { sendGuardedEmail } from "@/lib/email/send";
import { releaseQuoteFollowupRun } from "@/lib/followups/worker";
import { outboundMessageIntentKey } from "@/lib/idempotency/keys";
import { proposedQuoteFollowupActionSchema } from "@/lib/shadow/propose";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * C12 — dispatch the send that a human just approved.
 *
 * Called right after `approveAutomationRun` returned `RESOLVED`
 * under the caller's lease (`dispatcherWorker`). Flow:
 *
 *   1. Read the run's output_summary and validate its
 *      `proposed_action` against the shadow schema. A malformed or
 *      missing proposal cancels the run — we cannot invent a payload.
 *   2. Compute the outbound idempotency key
 *      (`outbound:quote_followup:{quote_id}:{n}`) so the
 *      dispatcher can never send twice for the same step, and so a
 *      resumed dispatch after a network blip collapses onto the
 *      already-inserted `outbound_messages` row.
 *   3. Call `sendGuardedEmail`. The guard fails closed unless
 *      `EXTERNAL_ACTIONS_ENABLED=true` AND `VERCEL_ENV=production`,
 *      so an approved run in a preview deploy is safely blocked at
 *      the boundary.
 *   4. Release the automation_run:
 *        SENT     -> SUCCEEDED
 *        REPLAY   -> SUCCEEDED (an earlier attempt already sent)
 *        FAILED   -> FAILED (with the provider error class)
 *      In every case the lease is released and completed_at is set.
 *
 * The caller MUST use the same `dispatcherWorker` string it passed
 * to `approveAutomationRun` (which is the string that took the fresh
 * lease when the approval RPC transitioned the run to RUNNING).
 */

export interface DispatchApprovedFollowupInput {
  runId: string;
  organizationId: string;
  dispatcherWorker: string;
  provider: EmailProvider;
  integrationId: string | null;
  fromEmail: string;
  replyTo?: string;
  /** Escape hatch for tests and orchestrators: inject a preconstructed client. */
  client?: SupabaseClient<Database>;
}

export type DispatchApprovedFollowupResult =
  | {
      status: "SENT";
      runId: string;
      messageId: string;
      providerMessageId: string;
    }
  | {
      status: "REPLAY";
      runId: string;
      messageId: string;
    }
  | {
      status: "FAILED";
      runId: string;
      messageId: string;
      errorClass: "TRANSIENT" | "PERMANENT";
      errorMessage: string;
    }
  | {
      status: "CANCELLED_INVALID_PROPOSAL";
      runId: string;
      reason: string;
    }
  | {
      status: "RUN_NOT_FOUND";
      runId: string;
    }
  | {
      status: "LEASE_LOST";
      runId: string;
    }
  | {
      status: "ERROR";
      reason: string;
    };

interface RunRow {
  id: string;
  organization_id: string;
  status: string;
  output_summary: unknown;
  locked_by: string | null;
}

export async function dispatchApprovedFollowup(
  input: DispatchApprovedFollowupInput,
): Promise<DispatchApprovedFollowupResult> {
  const supabase = input.client ?? (await createClient());

  const runQuery = await supabase
    .from("automation_runs")
    .select("id, organization_id, status, output_summary, locked_by")
    .eq("id", input.runId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (runQuery.error) {
    return { status: "ERROR", reason: `automation_runs lookup: ${runQuery.error.message}` };
  }
  const run = runQuery.data as RunRow | null;
  if (!run) return { status: "RUN_NOT_FOUND", runId: input.runId };
  if (run.status !== "RUNNING") {
    return { status: "LEASE_LOST", runId: input.runId };
  }
  if (run.locked_by !== input.dispatcherWorker) {
    return { status: "LEASE_LOST", runId: input.runId };
  }

  const proposalRaw = extractProposal(run.output_summary);
  const parsed = proposedQuoteFollowupActionSchema.safeParse(proposalRaw);
  if (!parsed.success) {
    await releaseQuoteFollowupRun(
      input.runId, input.organizationId, input.dispatcherWorker, "CANCELLED",
      { errorMessage: `invalid proposal: ${parsed.error.message.slice(0, 400)}`, client: supabase },
    );
    return {
      status: "CANCELLED_INVALID_PROPOSAL",
      runId: input.runId,
      reason: `proposal did not validate: ${parsed.error.message.slice(0, 400)}`,
    };
  }
  const proposal = parsed.data;

  const idempotencyKey = outboundMessageIntentKey(
    "quote_followup",
    proposal.quote_id,
    proposal.step,
  );

  const sendResult = await sendGuardedEmail({
    organizationId: input.organizationId,
    integrationId: input.integrationId,
    provider: input.provider,
    to: proposal.recipient_email,
    from: input.fromEmail,
    replyTo: input.replyTo,
    subject: proposal.subject,
    text: proposal.body,
    idempotencyKey,
    headers: {
      "X-Sesira-Automation-Run-Id": input.runId,
    },
    client: supabase,
  });

  if (sendResult.status === "SENT") {
    await releaseQuoteFollowupRun(
      input.runId, input.organizationId, input.dispatcherWorker, "SUCCEEDED",
      {
        outputSummary: {
          ...proposalObjectFor(run.output_summary),
          sent_message_id: sendResult.messageId,
          provider_message_id: sendResult.providerMessageId,
        },
        client: supabase,
      },
    );
    return {
      status: "SENT",
      runId: input.runId,
      messageId: sendResult.messageId,
      providerMessageId: sendResult.providerMessageId,
    };
  }
  if (sendResult.status === "REPLAY") {
    await releaseQuoteFollowupRun(
      input.runId, input.organizationId, input.dispatcherWorker, "SUCCEEDED",
      {
        outputSummary: {
          ...proposalObjectFor(run.output_summary),
          sent_message_id: sendResult.messageId,
          replay: true,
        },
        client: supabase,
      },
    );
    return { status: "REPLAY", runId: input.runId, messageId: sendResult.messageId };
  }

  await releaseQuoteFollowupRun(
    input.runId, input.organizationId, input.dispatcherWorker, "FAILED",
    {
      errorMessage: `${sendResult.errorClass}: ${sendResult.errorMessage}`,
      outputSummary: {
        ...proposalObjectFor(run.output_summary),
        failed_message_id: sendResult.messageId,
        error_class: sendResult.errorClass,
      },
      client: supabase,
    },
  );
  return {
    status: "FAILED",
    runId: input.runId,
    messageId: sendResult.messageId,
    errorClass: sendResult.errorClass,
    errorMessage: sendResult.errorMessage,
  };
}

function extractProposal(outputSummary: unknown): unknown {
  if (!outputSummary || typeof outputSummary !== "object") return null;
  const record = outputSummary as Record<string, unknown>;
  if (record.proposed_action) return record.proposed_action;
  return null;
}

function proposalObjectFor(outputSummary: unknown): Record<string, unknown> {
  if (!outputSummary || typeof outputSummary !== "object") return {};
  return outputSummary as Record<string, unknown>;
}
