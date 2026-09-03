export type SoldNotScheduledPolicy = {
  configured: boolean;
  enabled: boolean;
  graceHours: number | null;
  highValueAmount: number | null;
  currency: string | null;
  note: string | null;
  humanRequired: true;
  automationEligible: false;
  updatedAt: string | null;
};

const EMPTY_POLICY: SoldNotScheduledPolicy = {
  configured: false,
  enabled: false,
  graceHours: null,
  highValueAmount: null,
  currency: null,
  note: null,
  humanRequired: true,
  automationEligible: false,
  updatedAt: null,
};

export function parseSoldNotScheduledPolicy(config: unknown): SoldNotScheduledPolicy {
  if (!isRecord(config)) return { ...EMPTY_POLICY };
  const valuePolicies = config.value_policies;
  if (!isRecord(valuePolicies)) return { ...EMPTY_POLICY };
  const policy = valuePolicies.sold_not_scheduled;
  if (!isRecord(policy)) return { ...EMPTY_POLICY };

  return {
    configured: policy.configured === true,
    enabled: policy.enabled === true,
    graceHours: finiteNonNegativeNumber(policy.grace_hours),
    highValueAmount: finiteNonNegativeNumber(policy.high_value_amount),
    currency: typeof policy.currency === "string" && policy.currency.length === 3 ? policy.currency : null,
    note: typeof policy.note === "string" && policy.note.length > 0 ? policy.note : null,
    humanRequired: true,
    automationEligible: false,
    updatedAt: typeof policy.updated_at === "string" ? policy.updated_at : null,
  };
}

function finiteNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
