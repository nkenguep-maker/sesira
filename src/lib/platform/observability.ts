import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

/**
 * C38 — Control Center / observability / costs.
 *
 * Backend contract for the operator dashboard. Doctrine: « Pas de
 * métrique inventée » — every dashboard number traces back to a
 * real row in platform_component_events, platform_component_backlogs,
 * or ai_runs. This module never synthesizes a "health score" out of
 * nothing; the UI is free to derive one from the raw aggregates.
 *
 * Kill switch: `isPlatformComponentEnabled` is the single seam
 * workers consult before making external calls. Human toggles via
 * engageKillSwitch / releaseKillSwitch (ACTIVE org member).
 */

interface Deps { client?: SupabaseClient<Database>; }

export type PlatformComponentKind =
  | "EMAIL" | "AI_MISTRAL" | "DOCUMENTS" | "VOICE" | "EINVOICING"
  | "GROWTH" | "AUTOMATIONS" | "WEBHOOKS" | "QUEUES" | "DATABASE"
  | "STORAGE" | "REGULATORY" | "OTHER";

export type PlatformComponentStatus =
  | "ENABLED" | "DEGRADED" | "DISABLED_MANUAL" | "DISABLED_INCIDENT";

export type PlatformEventKind =
  | "HEARTBEAT" | "SUCCESS" | "ERROR" | "RETRY" | "TIMEOUT"
  | "FALLBACK" | "RATE_LIMIT" | "CONFIG_CHANGE" | "KILL_SWITCH_TOGGLE";

export type PlatformEventSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type PlatformActionResult =
  | { status: "APPLIED" } | { status: "NOT_ELIGIBLE" } | { status: "ERROR"; reason: string };

export type PlatformResourceResult =
  | { status: "APPLIED"; id: string }
  | { status: "ERROR"; reason: string };

// -------- Configuration & kill switch --------

export interface ConfigurePlatformComponentInput {
  organizationId: string;
  actorUserId: string;
  componentKind: PlatformComponentKind;
  displayLabel: string;
  providerKind?: string | null;
  region?: string | null;
  config?: Record<string, unknown> | null;
}

export async function configurePlatformComponent(
  input: ConfigurePlatformComponentInput,
  deps: Deps = {},
): Promise<PlatformResourceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("configure_platform_component", {
    target_organization_id: input.organizationId,
    target_actor_user_id: input.actorUserId,
    target_component_kind: input.componentKind,
    target_display_label: input.displayLabel,
    target_provider_kind: input.providerKind ?? null,
    target_region: input.region ?? null,
    target_config: (input.config ?? {}) as unknown as Json,
  });
  if (error) return { status: "ERROR", reason: `configure_platform_component: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export interface KillSwitchInput {
  organizationId: string;
  componentKind: PlatformComponentKind;
  actorUserId: string;
  reason: string;
}

export async function engageKillSwitch(
  input: KillSwitchInput,
  deps: Deps = {},
): Promise<PlatformActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("engage_kill_switch", {
    target_organization_id: input.organizationId,
    target_component_kind: input.componentKind,
    target_actor_user_id: input.actorUserId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `engage_kill_switch: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export async function releaseKillSwitch(
  input: KillSwitchInput,
  deps: Deps = {},
): Promise<PlatformActionResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("release_kill_switch", {
    target_organization_id: input.organizationId,
    target_component_kind: input.componentKind,
    target_actor_user_id: input.actorUserId,
    target_reason: input.reason,
  });
  if (error) return { status: "ERROR", reason: `release_kill_switch: ${error.message}` };
  return data === true ? { status: "APPLIED" } : { status: "NOT_ELIGIBLE" };
}

export type EnabledCheckResult =
  | { status: "APPLIED"; enabled: boolean }
  | { status: "ERROR"; reason: string };

export async function isPlatformComponentEnabled(
  organizationId: string,
  componentKind: PlatformComponentKind,
  deps: Deps = {},
): Promise<EnabledCheckResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("is_platform_component_enabled", {
    target_organization_id: organizationId,
    target_component_kind: componentKind,
  });
  if (error) return { status: "ERROR", reason: `is_platform_component_enabled: ${error.message}` };
  return { status: "APPLIED", enabled: data as boolean };
}

// -------- Event ingestion (service_role only from callers) --------

export interface RecordEventInput {
  organizationId: string;
  componentKind: PlatformComponentKind;
  eventKind: PlatformEventKind;
  severity: PlatformEventSeverity;
  latencyMs?: number | null;
  externalRef?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordPlatformComponentEvent(
  input: RecordEventInput,
  deps: Deps = {},
): Promise<PlatformResourceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_platform_component_event", {
    target_organization_id: input.organizationId,
    target_component_kind: input.componentKind,
    target_event_kind: input.eventKind,
    target_severity: input.severity,
    target_latency_ms: input.latencyMs ?? null,
    target_external_ref: input.externalRef ?? null,
    target_error_code: input.errorCode ?? null,
    target_error_message: input.errorMessage ?? null,
    target_metadata: (input.metadata ?? {}) as unknown as Json,
  });
  if (error) return { status: "ERROR", reason: `record_platform_component_event: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

export interface RecordBacklogInput {
  organizationId: string;
  componentKind: PlatformComponentKind;
  backlogSize: number;
  oldestItemAgeSeconds?: number | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordPlatformComponentBacklog(
  input: RecordBacklogInput,
  deps: Deps = {},
): Promise<PlatformResourceResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("record_platform_component_backlog", {
    target_organization_id: input.organizationId,
    target_component_kind: input.componentKind,
    target_backlog_size: input.backlogSize,
    target_oldest_item_age_seconds: input.oldestItemAgeSeconds ?? null,
    target_metadata: (input.metadata ?? {}) as unknown as Json,
  });
  if (error) return { status: "ERROR", reason: `record_platform_component_backlog: ${error.message}` };
  return { status: "APPLIED", id: data as string };
}

// -------- Dashboard read helpers --------

export interface PlatformComponentDashboardRow {
  componentId: string;
  componentKind: PlatformComponentKind;
  displayLabel: string;
  providerKind: string | null;
  region: string | null;
  status: PlatformComponentStatus;
  statusReason: string | null;
  statusChangedAt: string | null;
  config: Json;
  lastHeartbeatAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  successCountLastHour: number;
  errorCountLastHour: number;
  retryCountLastHour: number;
  fallbackCountLastHour: number;
  avgLatencyMsLastHour: number | null;
  latestBacklogSize: number | null;
  latestBacklogMeasuredAt: string | null;
  latestBacklogOldestAgeSeconds: number | null;
}

export type PlatformDashboardResult =
  | { status: "APPLIED"; rows: PlatformComponentDashboardRow[] }
  | { status: "ERROR"; reason: string };

export async function platformComponentDashboard(
  organizationId: string,
  deps: Deps = {},
): Promise<PlatformDashboardResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("platform_component_dashboard", {
    target_organization_id: organizationId,
  });
  if (error) return { status: "ERROR", reason: `platform_component_dashboard: ${error.message}` };
  const rows = (data ?? []) as Array<{
    component_id: string; component_kind: string; display_label: string;
    provider_kind: string | null; region: string | null;
    status: string; status_reason: string | null; status_changed_at: string | null;
    config: Json;
    last_heartbeat_at: string | null; last_success_at: string | null;
    last_error_at: string | null; last_error_message: string | null;
    success_count_last_hour: number; error_count_last_hour: number;
    retry_count_last_hour: number; fallback_count_last_hour: number;
    avg_latency_ms_last_hour: number | null;
    latest_backlog_size: number | null; latest_backlog_measured_at: string | null;
    latest_backlog_oldest_age_seconds: number | null;
  }>;
  return {
    status: "APPLIED",
    rows: rows.map((r) => ({
      componentId: r.component_id,
      componentKind: r.component_kind as PlatformComponentKind,
      displayLabel: r.display_label,
      providerKind: r.provider_kind,
      region: r.region,
      status: r.status as PlatformComponentStatus,
      statusReason: r.status_reason,
      statusChangedAt: r.status_changed_at,
      config: r.config,
      lastHeartbeatAt: r.last_heartbeat_at,
      lastSuccessAt: r.last_success_at,
      lastErrorAt: r.last_error_at,
      lastErrorMessage: r.last_error_message,
      successCountLastHour: Number(r.success_count_last_hour),
      errorCountLastHour: Number(r.error_count_last_hour),
      retryCountLastHour: Number(r.retry_count_last_hour),
      fallbackCountLastHour: Number(r.fallback_count_last_hour),
      avgLatencyMsLastHour: r.avg_latency_ms_last_hour === null ? null : Number(r.avg_latency_ms_last_hour),
      latestBacklogSize: r.latest_backlog_size,
      latestBacklogMeasuredAt: r.latest_backlog_measured_at,
      latestBacklogOldestAgeSeconds: r.latest_backlog_oldest_age_seconds,
    })),
  };
}

export interface EventTrailInput {
  organizationId: string;
  componentKind: PlatformComponentKind;
  since?: Date | null;
  severityFilter?: PlatformEventSeverity | null;
}

export interface PlatformEventRow {
  eventId: string;
  eventKind: PlatformEventKind;
  severity: PlatformEventSeverity;
  latencyMs: number | null;
  externalRef: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Json;
  recordedAt: string;
}

export type EventTrailResult =
  | { status: "APPLIED"; events: PlatformEventRow[] }
  | { status: "ERROR"; reason: string };

export async function platformComponentEventsFor(
  input: EventTrailInput,
  deps: Deps = {},
): Promise<EventTrailResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("platform_component_events_for", {
    target_organization_id: input.organizationId,
    target_component_kind: input.componentKind,
    target_since: input.since ? input.since.toISOString() : null,
    target_severity_filter: input.severityFilter ?? null,
  });
  if (error) return { status: "ERROR", reason: `platform_component_events_for: ${error.message}` };
  const rows = (data ?? []) as Array<{
    event_id: string; event_kind: string; severity: string;
    latency_ms: number | null; external_ref: string | null;
    error_code: string | null; error_message: string | null;
    metadata: Json; recorded_at: string;
  }>;
  return {
    status: "APPLIED",
    events: rows.map((r) => ({
      eventId: r.event_id,
      eventKind: r.event_kind as PlatformEventKind,
      severity: r.severity as PlatformEventSeverity,
      latencyMs: r.latency_ms,
      externalRef: r.external_ref,
      errorCode: r.error_code,
      errorMessage: r.error_message,
      metadata: r.metadata,
      recordedAt: r.recorded_at,
    })),
  };
}

export interface AiProviderStatsInput {
  organizationId: string;
  since: Date;
  until: Date;
}

export interface AiProviderStatsRow {
  model: string;
  provider: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  tokensInput: number;
  tokensOutput: number;
  totalEstimatedCost: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
}

export type AiProviderStatsResult =
  | { status: "APPLIED"; rows: AiProviderStatsRow[] }
  | { status: "ERROR"; reason: string };

export async function aiProviderStats(
  input: AiProviderStatsInput,
  deps: Deps = {},
): Promise<AiProviderStatsResult> {
  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase.rpc("ai_provider_stats", {
    target_organization_id: input.organizationId,
    target_since: input.since.toISOString(),
    target_until: input.until.toISOString(),
  });
  if (error) return { status: "ERROR", reason: `ai_provider_stats: ${error.message}` };
  const rows = (data ?? []) as Array<{
    model: string; provider: string; call_count: number;
    success_count: number; error_count: number;
    tokens_input: number; tokens_output: number;
    total_estimated_cost: number;
    avg_latency_ms: number | null; p95_latency_ms: number | null;
  }>;
  return {
    status: "APPLIED",
    rows: rows.map((r) => ({
      model: r.model,
      provider: r.provider,
      callCount: Number(r.call_count),
      successCount: Number(r.success_count),
      errorCount: Number(r.error_count),
      tokensInput: Number(r.tokens_input),
      tokensOutput: Number(r.tokens_output),
      totalEstimatedCost: Number(r.total_estimated_cost),
      avgLatencyMs: r.avg_latency_ms === null ? null : Number(r.avg_latency_ms),
      p95LatencyMs: r.p95_latency_ms === null ? null : Number(r.p95_latency_ms),
    })),
  };
}
