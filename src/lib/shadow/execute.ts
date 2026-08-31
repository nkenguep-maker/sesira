import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createWorkflowAttention } from "@/lib/attention/create";
import type { WorkflowEmittedReason } from "@/lib/attention/reason";
import {
  DEFAULT_QUOTE_FOLLOWUP_OFFSETS_DAYS,
  QUOTE_FOLLOWUP_TEMPLATE_KEY,
  decideQuoteFollowup,
  quoteFollowupConfigSchema,
  type QuoteFollowupStopReason,
} from "@/lib/followups/schedule";
import {
  claimQuoteFollowupRun,
  DEFAULT_FOLLOWUP_LEASE_SECONDS,
} from "@/lib/followups/worker";
import { externalEffectKey } from "@/lib/idempotency/keys";
import { insertEventOnce } from "@/lib/idempotency/store";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import {
  proposeQuoteFollowupAction,
  type ProposedQuoteFollowupAction,
} from "./propose";

/**
 * SESIRA Shadow Mode — evaluate one due follow-up run and persist the
 * proposed action, without ever reaching a provider adapter.
 *
 * INVARIANTS (enforced structurally by this module):
 *
 *   1. This file must not import any module capable of network I/O to a
 *      provider (email, SMS, HTTP webhook). `no-send.test.ts` asserts
 *      this on the import graph.
 *
 *   2. The evaluator refuses to run against a config whose `level` is
 *      not exactly `'SHADOW'`. Even if the scheduler misroutes a run,
 *      an OBSERVATION / APPROVAL / AUTOMATIC config here is a
 *      programmer error and the run is released as CANCELLED with a
 *      diagnostic output_summary.
 *
 *   3. Shadow is unaffected by `EXTERNAL_ACTIONS_ENABLED` — the kill
 *      switch is a *send*-boundary guard, and Shadow has no send. A
 *      permanent no-send mode does not consult that flag; asserting it
 *      here would create the false impression that Shadow *could* send
 *      if the flag were set.
 *
 *   4. Repeated evaluation of the same (organization_id, run_id) is a
 *      no-op past the claim: the automation_run is keyed by
 *      (org, idempotency_key) and its terminal state is idempotent; the
 *      emitted `quote.followup_decided` event is deduped via
 *      `insert_event_once` on a stable key.
 */

export const SHADOW_EVENT_TYPE = "quote.followup_decided" as const;
export const SHADOW_EVENT_KEY_KIND = "quote_followup_decided" as const;

export type QuoteFollowupOutcome = "DUE" | "STOP" | "PROPOSAL_UNAVAILABLE";

export interface ShadowRunProvenance {
  organization_id: string;
  quote_id: string;
  automation_config_id: string;
  automation_run_id: string;
  step: number;
  decided_at_iso: string;
  worker_id: string;
}

export interface ShadowOutputSummary {
  decision: {
    outcome: QuoteFollowupOutcome;
    stop_reason?: QuoteFollowupStopReason;
    proposal_error?: string;
  };
  provenance: ShadowRunProvenance;
  proposed_action?: ProposedQuoteFollowupAction;
  attention?: {
    reason: WorkflowEmittedReason;
    attention_id: string;
    key: string;
  };
}

export interface ShadowAttentionEmission {
  reason: WorkflowEmittedReason;
  attentionId: string;
  attentionCreated: boolean;
  key: string;
}

export interface ShadowExecutionSuccess {
  status: "COMPLETED";
  runId: string;
  outcome: QuoteFollowupOutcome;
  stopReason?: QuoteFollowupStopReason;
  proposedAction?: ProposedQuoteFollowupAction;
  eventId: string;
  eventCreated: boolean;
  attention?: ShadowAttentionEmission;
}

export interface ShadowExecutionCancelled {
  status: "CANCELLED";
  runId: string;
  reason: "CONFIG_LEVEL_NOT_SHADOW" | "RUN_NOT_FOUND" | "QUOTE_NOT_FOUND" | "CONFIG_NOT_FOUND";
  observedLevel?: string;
}

export interface ShadowExecutionSkipped {
  status: "SKIPPED";
  runId: string;
  reason: "CLAIM_LOST";
}

export type ShadowExecutionResult =
  | ShadowExecutionSuccess
  | ShadowExecutionCancelled
  | ShadowExecutionSkipped;

export interface ExecuteShadowRunParams {
  runId: string;
  organizationId: string;
  workerId: string;
  now: Date;
  leaseSeconds?: number;
  /** Escape hatch for tests: inject a preconstructed client. */
  client?: SupabaseClient<Database>;
}

type SupabaseServerClient = SupabaseClient<Database>;

interface RunRow {
  id: string;
  organization_id: string;
  automation_config_id: string | null;
  input_summary: unknown;
  status: string;
}

interface ConfigRow {
  id: string;
  level: string;
  enabled: boolean;
  template_key: string;
  config: unknown;
}

interface QuoteRow {
  id: string;
  organization_id: string;
  status:
    | "DRAFT"
    | "SENT"
    | "FOLLOWING_UP"
    | "REPLIED"
    | "NEEDS_HUMAN"
    | "WON"
    | "LOST"
    | "EXPIRED";
  sent_at: string | null;
  automation_paused_at: string | null;
  automation_pause_reason: string | null;
  opted_out_at: string | null;
  reference: string | null;
  title: string;
  amount: number | null;
  currency: string;
  customer_id: string | null;
}

interface CustomerRow {
  id: string;
  display_name: string;
  email: string | null;
}

async function loadRun(
  supabase: SupabaseServerClient,
  runId: string,
  organizationId: string,
): Promise<RunRow | null> {
  const { data, error } = await supabase
    .from("automation_runs")
    .select("id, organization_id, automation_config_id, input_summary, status")
    .eq("id", runId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(`executeShadow: loadRun: ${error.message}`);
  return data as RunRow | null;
}

async function loadConfig(
  supabase: SupabaseServerClient,
  configId: string,
  organizationId: string,
): Promise<ConfigRow | null> {
  const { data, error } = await supabase
    .from("automation_configs")
    .select("id, level, enabled, template_key, config")
    .eq("id", configId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(`executeShadow: loadConfig: ${error.message}`);
  return data as ConfigRow | null;
}

async function loadQuote(
  supabase: SupabaseServerClient,
  quoteId: string,
  organizationId: string,
): Promise<QuoteRow | null> {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, organization_id, status, sent_at, automation_paused_at, automation_pause_reason, opted_out_at, reference, title, amount, currency, customer_id",
    )
    .eq("id", quoteId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(`executeShadow: loadQuote: ${error.message}`);
  return data as QuoteRow | null;
}

async function loadCustomer(
  supabase: SupabaseServerClient,
  customerId: string,
  organizationId: string,
): Promise<CustomerRow | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, display_name, email")
    .eq("id", customerId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(`executeShadow: loadCustomer: ${error.message}`);
  return data as CustomerRow | null;
}

async function loadAlreadyFiredSteps(
  supabase: SupabaseServerClient,
  organizationId: string,
  quoteId: string,
): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("automation_runs")
    .select("input_summary, status")
    .eq("organization_id", organizationId)
    .in("status", ["SUCCEEDED", "FAILED", "CANCELLED"]);
  if (error) throw new Error(`executeShadow: loadAlreadyFiredSteps: ${error.message}`);
  const fired = new Set<number>();
  for (const row of data ?? []) {
    const summary = row.input_summary as { quote_id?: string; step?: number } | null;
    if (!summary) continue;
    if (summary.quote_id !== quoteId) continue;
    if (typeof summary.step !== "number") continue;
    fired.add(summary.step);
  }
  return fired;
}

/**
 * Emit a workflow Attention when a Shadow outcome represents a real
 * exception a human must resolve. Called from both the STOP branch
 * (complaint hold) and the DUE branch (proposal_unavailable due to
 * missing customer data). Returns `undefined` when the outcome is
 * "surface nothing" — the doctrine forbids noise on routine STOPs.
 */
async function emitAttentionIfNeeded(
  supabase: SupabaseServerClient,
  args: {
    organizationId: string;
    quote: QuoteRow;
    stopReason: QuoteFollowupStopReason | null;
    proposalError: string | null;
    provenance: ShadowRunProvenance;
  },
): Promise<ShadowAttentionEmission | undefined> {
  let reason: WorkflowEmittedReason | null = null;
  let sourceKind = "";
  let title = "";
  let explanation: string | null = null;
  let suggestedAction: string | null = null;

  if (
    args.stopReason === "AUTOMATION_PAUSED"
    && args.quote.automation_pause_reason === "COMPLAINT"
  ) {
    reason = "COMPLAINT_HOLD";
    sourceKind = "shadow_complaint_hold";
    title = `Réclamation en attente — ${args.quote.reference ?? args.quote.title}`;
    explanation =
      "Ce devis est en pause automatique parce qu'une réclamation a été enregistrée. Aucun envoi ne reprendra tant que la réclamation n'a pas été traitée.";
    suggestedAction = "Contacter le client, décider de reprendre ou de clore le devis.";
  } else if (args.proposalError === "customer_not_found" || args.proposalError === "customer has no email — cannot compose an email proposal") {
    reason = "INTEGRATION_ISSUE";
    sourceKind = "shadow_integration_issue";
    title = `Coordonnées client manquantes — ${args.quote.reference ?? args.quote.title}`;
    explanation =
      "Le devis est éligible à une relance mais nous n'avons pas d'email valide pour le client. Aucune proposition n'a été formulée.";
    suggestedAction = "Compléter la fiche client (email vérifié) puis rejouer la relance.";
  }

  if (!reason) return undefined;

  const emission = await createWorkflowAttention({
    organizationId: args.organizationId,
    reason,
    sourceKind,
    sourceId: args.quote.id,
    title,
    explanation,
    suggestedAction,
    entity: { type: "quote", id: args.quote.id },
    metadata: {
      shadow_stop_reason: args.stopReason,
      shadow_proposal_error: args.proposalError,
      quote_status: args.quote.status,
      quote_reference: args.quote.reference,
    },
    provenance: {
      automationRunId: args.provenance.automation_run_id,
      automationConfigId: args.provenance.automation_config_id,
    },
    client: supabase,
  });

  return {
    reason,
    attentionId: emission.id,
    attentionCreated: emission.created,
    key: emission.key,
  };
}

async function releaseRunWithOutput(
  supabase: SupabaseServerClient,
  runId: string,
  organizationId: string,
  workerId: string,
  terminalStatus: "SUCCEEDED" | "CANCELLED",
  output: ShadowOutputSummary,
  errorMessage: string | null,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("release_automation_run", {
    target_run_id: runId,
    target_organization_id: organizationId,
    target_worker_id: workerId,
    terminal_status: terminalStatus,
    error_message: errorMessage,
    next_attempt_at: null,
    target_output_summary: output as never,
  });
  if (error) throw new Error(`executeShadow: release: ${error.message}`);
  return data === true;
}

function parseRunInput(
  runInput: unknown,
): { quoteId: string; step: number } | null {
  if (!runInput || typeof runInput !== "object") return null;
  const summary = runInput as { quote_id?: unknown; step?: unknown };
  if (typeof summary.quote_id !== "string") return null;
  if (typeof summary.step !== "number" || !Number.isInteger(summary.step) || summary.step < 1) {
    return null;
  }
  return { quoteId: summary.quote_id, step: summary.step };
}

/**
 * Evaluate one Shadow-mode follow-up run end-to-end.
 *
 * Contract:
 *   - Idempotent: repeated calls with the same runId observe the same
 *     outcome (via automation_runs.status + event replay dedup).
 *   - Never sends: this function performs zero external I/O beyond the
 *     Supabase reads and the two RPCs (`claim_automation_run`,
 *     `release_automation_run`) and the `insert_event_once` write.
 *   - Never emits `message.sent` — only `quote.followup_decided`.
 *
 * Preconditions:
 *   - Run is PENDING for organizationId (or reclaimable after crash).
 *   - Config `level` = 'SHADOW'; any other level is a routing bug and
 *     cancels the run.
 */
export async function executeShadowQuoteFollowupRun(
  params: ExecuteShadowRunParams,
): Promise<ShadowExecutionResult> {
  const { runId, organizationId, workerId, now } = params;
  const leaseSeconds = params.leaseSeconds ?? DEFAULT_FOLLOWUP_LEASE_SECONDS;
  const supabase = params.client ?? (await createClient());

  const claimed = await claimQuoteFollowupRun(runId, organizationId, workerId, leaseSeconds);
  if (!claimed) {
    return { status: "SKIPPED", runId, reason: "CLAIM_LOST" };
  }

  const run = await loadRun(supabase, runId, organizationId);
  if (!run) {
    return { status: "CANCELLED", runId, reason: "RUN_NOT_FOUND" };
  }

  const parsed = parseRunInput(run.input_summary);
  if (!parsed) {
    const output: ShadowOutputSummary = {
      decision: { outcome: "STOP", proposal_error: "malformed_input_summary" },
      provenance: {
        organization_id: organizationId,
        quote_id: "",
        automation_config_id: run.automation_config_id ?? "",
        automation_run_id: runId,
        step: 0,
        decided_at_iso: now.toISOString(),
        worker_id: workerId,
      },
    };
    await releaseRunWithOutput(
      supabase,
      runId,
      organizationId,
      workerId,
      "CANCELLED",
      output,
      "malformed input_summary",
    );
    return { status: "CANCELLED", runId, reason: "RUN_NOT_FOUND" };
  }

  const { quoteId, step } = parsed;

  if (!run.automation_config_id) {
    return { status: "CANCELLED", runId, reason: "CONFIG_NOT_FOUND" };
  }
  const config = await loadConfig(supabase, run.automation_config_id, organizationId);
  if (!config) {
    return { status: "CANCELLED", runId, reason: "CONFIG_NOT_FOUND" };
  }

  const baseProvenance: ShadowRunProvenance = {
    organization_id: organizationId,
    quote_id: quoteId,
    automation_config_id: config.id,
    automation_run_id: runId,
    step,
    decided_at_iso: now.toISOString(),
    worker_id: workerId,
  };

  if (config.level !== "SHADOW") {
    const output: ShadowOutputSummary = {
      decision: { outcome: "STOP", proposal_error: `config_level_${config.level}` },
      provenance: baseProvenance,
    };
    await releaseRunWithOutput(
      supabase,
      runId,
      organizationId,
      workerId,
      "CANCELLED",
      output,
      `Shadow executor invoked on non-SHADOW config (level=${config.level})`,
    );
    return {
      status: "CANCELLED",
      runId,
      reason: "CONFIG_LEVEL_NOT_SHADOW",
      observedLevel: config.level,
    };
  }

  const quote = await loadQuote(supabase, quoteId, organizationId);
  if (!quote) {
    return { status: "CANCELLED", runId, reason: "QUOTE_NOT_FOUND" };
  }

  const offsetsParsed = quoteFollowupConfigSchema.safeParse(config.config);
  const offsetsDays = offsetsParsed.success
    ? offsetsParsed.data.offsets_days
    : DEFAULT_QUOTE_FOLLOWUP_OFFSETS_DAYS;

  const alreadyFired = await loadAlreadyFiredSteps(supabase, organizationId, quoteId);
  const decision = decideQuoteFollowup(now, {
    sentAt: quote.sent_at ? new Date(quote.sent_at) : null,
    status: quote.status,
    automationPausedAt: quote.automation_paused_at
      ? new Date(quote.automation_paused_at)
      : null,
    optedOutAt: quote.opted_out_at ? new Date(quote.opted_out_at) : null,
    automationEnabled: config.enabled,
    offsetsDays,
    alreadyFiredSteps: alreadyFired,
  });

  const eventKey = externalEffectKey(SHADOW_EVENT_KEY_KIND, quoteId, step);

  if (decision.kind === "STOP") {
    const output: ShadowOutputSummary = {
      decision: { outcome: "STOP", stop_reason: decision.reason },
      provenance: baseProvenance,
    };
    const eventResult = await insertEventOnce({
      organizationId,
      idempotencyKey: eventKey,
      type: SHADOW_EVENT_TYPE,
      source: "CORE_WORKER",
      entityType: "quote",
      entityId: quoteId,
      payload: {
        outcome: "STOP",
        stop_reason: decision.reason,
        step,
        automation_config_id: config.id,
        automation_run_id: runId,
        decided_at: now.toISOString(),
      },
    });
    const attentionEmission = await emitAttentionIfNeeded(supabase, {
      organizationId,
      quote,
      stopReason: decision.reason,
      proposalError: null,
      provenance: baseProvenance,
    });

    await releaseRunWithOutput(
      supabase,
      runId,
      organizationId,
      workerId,
      "SUCCEEDED",
      {
        ...output,
        ...(attentionEmission
          ? {
              attention: {
                reason: attentionEmission.reason,
                attention_id: attentionEmission.attentionId,
                key: attentionEmission.key,
              },
            }
          : {}),
      } as ShadowOutputSummary,
      null,
    );
    return {
      status: "COMPLETED",
      runId,
      outcome: "STOP",
      stopReason: decision.reason,
      eventId: eventResult.id,
      eventCreated: eventResult.created,
      ...(attentionEmission ? { attention: attentionEmission } : {}),
    };
  }

  const customer = quote.customer_id
    ? await loadCustomer(supabase, quote.customer_id, organizationId)
    : null;

  let proposedAction: ProposedQuoteFollowupAction | undefined;
  let proposalError: string | undefined;
  try {
    if (!customer) {
      throw new Error("customer_not_found");
    }
    proposedAction = proposeQuoteFollowupAction({
      quoteId: quote.id,
      quoteReference: quote.reference,
      quoteTitle: quote.title,
      quoteAmount: quote.amount,
      quoteCurrency: quote.currency,
      customerDisplayName: customer.display_name,
      customerEmail: customer.email,
      step: decision.step,
      templateKey: QUOTE_FOLLOWUP_TEMPLATE_KEY,
    });
  } catch (error) {
    proposalError = error instanceof Error ? error.message : "proposal_failed";
  }

  const outcome: QuoteFollowupOutcome = proposedAction ? "DUE" : "PROPOSAL_UNAVAILABLE";
  const output: ShadowOutputSummary = {
    decision: {
      outcome,
      ...(proposalError ? { proposal_error: proposalError } : {}),
    },
    provenance: baseProvenance,
    ...(proposedAction ? { proposed_action: proposedAction } : {}),
  };

  const eventResult = await insertEventOnce({
    organizationId,
    idempotencyKey: eventKey,
    type: SHADOW_EVENT_TYPE,
    source: "CORE_WORKER",
    entityType: "quote",
    entityId: quoteId,
    payload: {
      outcome,
      step,
      automation_config_id: config.id,
      automation_run_id: runId,
      decided_at: now.toISOString(),
      ...(proposedAction
        ? { proposed_action: proposedAction }
        : { proposal_error: proposalError }),
    },
  });

  const attentionEmission = await emitAttentionIfNeeded(supabase, {
    organizationId,
    quote,
    stopReason: null,
    proposalError: proposalError ?? null,
    provenance: baseProvenance,
  });

  await releaseRunWithOutput(
    supabase,
    runId,
    organizationId,
    workerId,
    "SUCCEEDED",
    {
      ...output,
      ...(attentionEmission
        ? {
            attention: {
              reason: attentionEmission.reason,
              attention_id: attentionEmission.attentionId,
              key: attentionEmission.key,
            },
          }
        : {}),
    } as ShadowOutputSummary,
    proposalError ?? null,
  );

  return {
    status: "COMPLETED",
    runId,
    outcome,
    proposedAction,
    eventId: eventResult.id,
    eventCreated: eventResult.created,
    ...(attentionEmission ? { attention: attentionEmission } : {}),
  };
}
