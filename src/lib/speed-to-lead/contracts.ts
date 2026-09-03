export type SpeedToLeadPolicy = {
  configured: boolean;
  enabled: boolean;
  targetMinutes: number | null;
  note: string | null;
  measurement: "FIRST_INTERNAL_HANDLING";
  humanRequired: true;
  automationEligible: false;
  updatedAt: string | null;
};

export type SpeedToLeadSummary = {
  configured: boolean;
  enabled: boolean;
  targetMinutes: number | null;
  pendingCount: number;
  overdueCount: number;
  oldestPendingMinutes: number | null;
  handledSampleCount: number;
  averageHandlingMinutes: number | null;
  measurement: "FIRST_INTERNAL_HANDLING";
  windowDays: number;
};

export type SpeedToLeadRequestSnapshot = {
  status: string;
  createdAt: string;
  firstHandledAt: string | null;
};

export type SpeedToLeadMeasurement = {
  state: "DISABLED" | "PENDING" | "OVERDUE" | "HANDLED" | "UNMEASURABLE";
  elapsedMinutes: number | null;
  handlingMinutes: number | null;
  dueAt: string | null;
};

const EMPTY_POLICY: SpeedToLeadPolicy = {
  configured: false,
  enabled: false,
  targetMinutes: null,
  note: null,
  measurement: "FIRST_INTERNAL_HANDLING",
  humanRequired: true,
  automationEligible: false,
  updatedAt: null,
};

export function parseSpeedToLeadPolicy(config: unknown): SpeedToLeadPolicy {
  if (!isRecord(config)) return { ...EMPTY_POLICY };
  const valuePolicies = config.value_policies;
  if (!isRecord(valuePolicies)) return { ...EMPTY_POLICY };
  const policy = valuePolicies.speed_to_lead;
  if (!isRecord(policy)) return { ...EMPTY_POLICY };

  return {
    configured: policy.configured === true,
    enabled: policy.enabled === true,
    targetMinutes: positiveInteger(policy.target_minutes),
    note: typeof policy.note === "string" && policy.note.trim() ? policy.note.trim() : null,
    measurement: "FIRST_INTERNAL_HANDLING",
    humanRequired: true,
    automationEligible: false,
    updatedAt: typeof policy.updated_at === "string" ? policy.updated_at : null,
  };
}

export function parseSpeedToLeadSummary(value: unknown): SpeedToLeadSummary | null {
  if (!isRecord(value)) return null;
  if (value.measurement !== "FIRST_INTERNAL_HANDLING") return null;
  const pendingCount = nonNegativeInteger(value.pending_count);
  const overdueCount = nonNegativeInteger(value.overdue_count);
  const handledSampleCount = nonNegativeInteger(value.handled_sample_count);
  const windowDays = positiveInteger(value.window_days);
  if (pendingCount === null || overdueCount === null || handledSampleCount === null || windowDays === null) return null;

  return {
    configured: value.configured === true,
    enabled: value.enabled === true,
    targetMinutes: positiveInteger(value.target_minutes),
    pendingCount,
    overdueCount,
    oldestPendingMinutes: finiteNonNegativeNumber(value.oldest_pending_minutes),
    handledSampleCount,
    averageHandlingMinutes: finiteNonNegativeNumber(value.average_handling_minutes),
    measurement: "FIRST_INTERNAL_HANDLING",
    windowDays,
  };
}

export function measureSpeedToLead(
  snapshot: SpeedToLeadRequestSnapshot,
  policy: Pick<SpeedToLeadPolicy, "enabled" | "targetMinutes">,
  now: Date,
): SpeedToLeadMeasurement {
  const createdAt = parseDate(snapshot.createdAt);
  if (!createdAt) return { state: "UNMEASURABLE", elapsedMinutes: null, handlingMinutes: null, dueAt: null };

  const handledAt = snapshot.firstHandledAt ? parseDate(snapshot.firstHandledAt) : null;
  if (snapshot.firstHandledAt && !handledAt) {
    return { state: "UNMEASURABLE", elapsedMinutes: null, handlingMinutes: null, dueAt: null };
  }

  if (handledAt) {
    return {
      state: "HANDLED",
      elapsedMinutes: Math.max(0, minutesBetween(createdAt, now)),
      handlingMinutes: Math.max(0, minutesBetween(createdAt, handledAt)),
      dueAt: policy.enabled && policy.targetMinutes ? new Date(createdAt.getTime() + policy.targetMinutes * 60_000).toISOString() : null,
    };
  }

  if (snapshot.status !== "NEW") {
    return { state: "UNMEASURABLE", elapsedMinutes: Math.max(0, minutesBetween(createdAt, now)), handlingMinutes: null, dueAt: null };
  }

  const elapsedMinutes = Math.max(0, minutesBetween(createdAt, now));
  if (!policy.enabled || !policy.targetMinutes) {
    return { state: "DISABLED", elapsedMinutes, handlingMinutes: null, dueAt: null };
  }

  const dueAt = new Date(createdAt.getTime() + policy.targetMinutes * 60_000);
  return {
    state: now.getTime() >= dueAt.getTime() ? "OVERDUE" : "PENDING",
    elapsedMinutes,
    handlingMinutes: null,
    dueAt: dueAt.toISOString(),
  };
}

function minutesBetween(from: Date, to: Date): number {
  return Math.round(((to.getTime() - from.getTime()) / 60_000) * 10) / 10;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function positiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return null;
  return value;
}

function nonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value;
}

function finiteNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
