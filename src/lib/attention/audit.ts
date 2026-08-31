import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * SESIRA audit — thin, typed wrapper around `public.record_audit_log`.
 *
 * The audit log is intentionally append-only and NOT deduped: every
 * call creates a row. Retries are the caller's concern (usually the
 * server action already commits or aborts atomically). Repeating the
 * same audit line on purpose is legitimate (two operators independently
 * assigning the same item to different assignees, for example).
 *
 * Actor identity is pinned server-side by the RPC — the caller does
 * not (and cannot) forge `actor_id`. A tenant call always records
 * `actor_type='user', actor_id=auth.uid()`; a service_role call records
 * `actor_type='system', actor_id=null`.
 */

/**
 * Canonical action vocabulary. `action` is a text column in the DB so
 * the RPC accepts any string ≤200 chars — this list is the source of
 * truth for **what SESIRA writes**, not a hard constraint. External
 * integrations (e.g., data export) rely on this vocabulary staying
 * stable, so extensions belong in a dedicated commit.
 */
export const AUDIT_ACTIONS = [
  "attention.created",
  "attention.assigned",
  "attention.unassigned",
  "attention.resolved",
  "attention.dismissed",
  "attention.reopened",
  "automation.paused",
  "automation.resumed",
  "workflow.resumed",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

export interface RecordAuditInput {
  organizationId: string;
  action: AuditAction | string;
  entity?: { type: string; id: string } | null;
  metadata?: Record<string, unknown> | null;
  /** Escape hatch for tests: inject a preconstructed client. */
  client?: SupabaseClient<Database>;
}

export async function recordAudit(input: RecordAuditInput): Promise<{ id: string }> {
  const supabase = input.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_audit_log", {
    target_organization_id: input.organizationId,
    target_action: input.action,
    target_entity_type: input.entity?.type ?? null,
    target_entity_id: input.entity?.id ?? null,
    target_metadata: (input.metadata ?? {}) as never,
  });
  if (error) throw new Error(`recordAudit: ${error.message}`);
  if (typeof data !== "string") {
    throw new Error("recordAudit: RPC returned no id");
  }
  return { id: data };
}
