import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { attentionFromSourceKey } from "@/lib/idempotency/keys";
import { insertAttentionOnce, type InsertOnceResult } from "@/lib/idempotency/store";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import {
  ATTENTION_REASON_CATEGORY,
  ATTENTION_REASON_DEFAULT_PRIORITY,
  type WorkflowEmittedReason,
} from "./reason";

/**
 * Workflow-emitted Attention — the typed, deduped entry point for any
 * SESIRA subsystem that needs to escalate an exception to a human.
 *
 * Contract:
 *   * `reason` is picked from the workflow vocabulary (`WORKFLOW_EMITTED_REASONS`).
 *     MANUAL_REVIEW is not accepted here — that's a human-driven form,
 *     not a workflow decision.
 *   * `sourceKind` + `sourceId` compose a stable identity via
 *     `attentionFromSourceKey`. A retry / replay of the same trigger
 *     collapses to the same row (via `insert_attention_once`).
 *   * The caller supplies plain-text `title`, optional `explanation`
 *     and `suggestedAction` — these are mutable business values and
 *     are NEVER part of the identity. A later emission with a better
 *     phrasing does not create a second row.
 *   * `category` and `priority` default to the reason's canonical
 *     values; callers may override for a specific incident.
 *   * `entity` links the item back to the object the human should
 *     look at (usually a quote, sometimes a message or a run).
 *
 * This function is server-only. UI code invokes it via a server
 * action; workflow executors invoke it directly.
 */
export interface CreateWorkflowAttentionInput {
  organizationId: string;
  reason: WorkflowEmittedReason;

  /** Stable identity of the *event* that triggered the Attention. */
  sourceKind: string;
  sourceId: string;

  title: string;
  explanation?: string | null;
  suggestedAction?: string | null;

  entity: {
    type: string;
    id: string;
  };

  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  category?: "SALES" | "OPERATIONS" | "COMPLIANCE";

  /** Optional assignee. Must be an ACTIVE org member — enforced by the DB trigger. */
  assignedUserId?: string | null;
  dueAt?: Date | null;

  /**
   * Free-form structured metadata. `sourceKind`, `sourceId`, `reason`
   * and provenance fields (automation_run_id, quote_id, etc.) are
   * added by this helper — the caller only needs to add domain data.
   */
  metadata?: Record<string, unknown> | null;

  /** Escape hatch for tests: inject a preconstructed client. */
  client?: SupabaseClient<Database>;

  /**
   * Provenance breadcrumbs merged into metadata alongside the source
   * pair. Optional but strongly encouraged for workflow callers so
   * the human can trace back the trigger without re-running a query.
   */
  provenance?: {
    automationRunId?: string;
    automationConfigId?: string;
    triggeringEventId?: string;
  };
}

export async function createWorkflowAttention(
  input: CreateWorkflowAttentionInput,
): Promise<InsertOnceResult & { key: string }> {
  const idempotencyKey = attentionFromSourceKey(input.sourceKind, input.sourceId);
  const category = input.category ?? ATTENTION_REASON_CATEGORY[input.reason];
  const priority = input.priority ?? ATTENTION_REASON_DEFAULT_PRIORITY[input.reason];

  const metadata: Record<string, unknown> = {
    schema_version: 1,
    source_kind: input.sourceKind,
    source_id: input.sourceId,
    reason: input.reason,
    ...(input.provenance?.automationRunId
      ? { automation_run_id: input.provenance.automationRunId }
      : {}),
    ...(input.provenance?.automationConfigId
      ? { automation_config_id: input.provenance.automationConfigId }
      : {}),
    ...(input.provenance?.triggeringEventId
      ? { triggering_event_id: input.provenance.triggeringEventId }
      : {}),
    ...(input.metadata ?? {}),
  };

  const supabase = input.client ?? (await createClient());
  const rpcResult = await supabase.rpc("insert_attention_once", {
    target_organization_id: input.organizationId,
    target_idempotency_key: idempotencyKey,
    target_category: category,
    target_reason: input.reason,
    target_title: input.title,
    target_priority: priority,
    target_entity_type: input.entity.type,
    target_entity_id: input.entity.id,
    target_explanation: input.explanation ?? null,
    target_suggested_action: input.suggestedAction ?? null,
    target_assigned_user_id: input.assignedUserId ?? null,
    target_due_at: input.dueAt?.toISOString() ?? null,
    target_metadata: metadata as never,
  });

  if (rpcResult.error) {
    throw new Error(`createWorkflowAttention: ${rpcResult.error.message}`);
  }
  const row = Array.isArray(rpcResult.data)
    ? rpcResult.data[0]
    : (rpcResult.data as { id: string; created: boolean } | null);
  if (!row || typeof row.id !== "string" || typeof row.created !== "boolean") {
    // When the caller injected a client we still go through insert_attention_once
    // via `.rpc`; if that returns nothing at all, fall back to the shared
    // wrapper so the caller sees the same shape either way.
    const fallback = await insertAttentionOnce({
      organizationId: input.organizationId,
      idempotencyKey,
      category,
      reason: input.reason,
      title: input.title,
      priority,
      entityType: input.entity.type,
      entityId: input.entity.id,
      explanation: input.explanation ?? null,
      suggestedAction: input.suggestedAction ?? null,
      assignedUserId: input.assignedUserId ?? null,
      dueAt: input.dueAt?.toISOString() ?? null,
      metadata,
    });
    return { ...fallback, key: idempotencyKey };
  }
  return { id: row.id, created: row.created, key: idempotencyKey };
}
