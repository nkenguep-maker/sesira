import { z } from "zod";

/**
 * Default quote follow-up schedule: J+3, J+7, J+14 days after the quote
 * was sent. Values are day offsets applied to `quotes.sent_at` in UTC.
 * All timestamps in this module are absolute UTC instants — timezone
 * localisation is a presentation concern handled by the UI layer.
 */
export const DEFAULT_QUOTE_FOLLOWUP_OFFSETS_DAYS = [3, 7, 14] as const;

/**
 * `automation_configs.template_key` for a per-organisation follow-up
 * schedule override. When present and enabled, its `config.offsets_days`
 * replaces the default.
 */
export const QUOTE_FOLLOWUP_TEMPLATE_KEY = "quote_followup_schedule";

export const MILLIS_PER_DAY = 86_400_000;

export const quoteFollowupConfigSchema = z.object({
  offsets_days: z
    .array(z.number().int().min(0).max(365))
    .min(1)
    .max(10),
});

export type QuoteFollowupConfig = z.infer<typeof quoteFollowupConfigSchema>;

export interface QuoteFollowupStep {
  /** 1-indexed step number in the schedule. */
  step: number;
  /** Absolute UTC instant when this follow-up is due. */
  scheduledFor: Date;
}

/**
 * Deterministic UTC schedule for a quote's follow-ups. Pure function.
 * `sentAt` is the moment the quote transitioned to SENT. Same inputs
 * always produce the same outputs — this is the core invariant that
 * lets a worker compute an idempotency key without touching the DB.
 */
export function computeQuoteFollowupSchedule(
  sentAt: Date,
  offsetsDays: readonly number[] = DEFAULT_QUOTE_FOLLOWUP_OFFSETS_DAYS,
): QuoteFollowupStep[] {
  const baseMs = sentAt.getTime();
  return offsetsDays.map((days, index) => ({
    step: index + 1,
    scheduledFor: new Date(baseMs + days * MILLIS_PER_DAY),
  }));
}

/**
 * Returns the next unfired follow-up step, past-due or future.
 * Returns `null` when the schedule is exhausted. `alreadyFiredSteps`
 * is the set of step numbers whose automation_runs row exists in a
 * terminal state (SUCCEEDED, FAILED, CANCELLED). The caller must
 * compare the returned step's `scheduledFor` against `now` to decide
 * DUE vs NOT_YET_DUE.
 */
export function nextQuoteFollowupStep(
  sentAt: Date,
  offsetsDays: readonly number[] = DEFAULT_QUOTE_FOLLOWUP_OFFSETS_DAYS,
  alreadyFiredSteps: ReadonlySet<number> = new Set(),
): QuoteFollowupStep | null {
  const schedule = computeQuoteFollowupSchedule(sentAt, offsetsDays);
  for (const candidate of schedule) {
    if (alreadyFiredSteps.has(candidate.step)) continue;
    return candidate;
  }
  return null;
}

/**
 * Idempotency key for a single quote follow-up decision. Format:
 *   quote_followup:{quote_id}:step:{n}
 * The version is not embedded so a template_version bump on the
 * automation_config does NOT change the key — the same step for the
 * same quote resolves to the same run row across versions, and any
 * schedule change is a business decision that must go through an
 * explicit "recompute" migration if it needs to affect already-fired
 * runs.
 */
export function quoteFollowupIdempotencyKey(quoteId: string, step: number): string {
  if (!Number.isInteger(step) || step < 1) {
    throw new RangeError(`quoteFollowupIdempotencyKey: step must be a positive integer (got ${step})`);
  }
  return `quote_followup:${quoteId}:step:${step}`;
}

/**
 * Reasons a quote is NOT eligible for a follow-up, mirroring the
 * database's "no follow-up due" invariants. Ordered so the highest-
 * intent guard wins when several apply (e.g., opted_out overrides
 * "replied").
 */
export const QUOTE_FOLLOWUP_STOP_REASONS = [
  "OPTED_OUT",
  "AUTOMATION_PAUSED",
  "AUTOMATION_DISABLED",
  "QUOTE_TERMINAL",
  "QUOTE_REPLIED",
  "SCHEDULE_EXHAUSTED",
  "NOT_YET_DUE",
] as const;

export type QuoteFollowupStopReason = (typeof QUOTE_FOLLOWUP_STOP_REASONS)[number];

export interface QuoteFollowupInputs {
  sentAt: Date | null;
  status: "DRAFT" | "SENT" | "FOLLOWING_UP" | "REPLIED" | "NEEDS_HUMAN" | "WON" | "LOST" | "EXPIRED";
  automationPausedAt: Date | null;
  optedOutAt: Date | null;
  automationEnabled: boolean;
  offsetsDays?: readonly number[];
  alreadyFiredSteps?: ReadonlySet<number>;
}

export type QuoteFollowupDecision =
  | { kind: "STOP"; reason: QuoteFollowupStopReason }
  | { kind: "DUE"; step: QuoteFollowupStep };

/**
 * Pure decision function: given the quote state, config and clock,
 * either returns the next step that should fire or a stop reason.
 * This is the single source of truth that the DB `due` query, the
 * worker, and the UI badges all agree with.
 */
export function decideQuoteFollowup(
  now: Date,
  inputs: QuoteFollowupInputs,
): QuoteFollowupDecision {
  if (inputs.optedOutAt !== null) return { kind: "STOP", reason: "OPTED_OUT" };
  if (inputs.automationPausedAt !== null) return { kind: "STOP", reason: "AUTOMATION_PAUSED" };
  if (!inputs.automationEnabled) return { kind: "STOP", reason: "AUTOMATION_DISABLED" };

  switch (inputs.status) {
    case "WON":
    case "LOST":
    case "EXPIRED":
      return { kind: "STOP", reason: "QUOTE_TERMINAL" };
    case "REPLIED":
      return { kind: "STOP", reason: "QUOTE_REPLIED" };
    case "DRAFT":
      return { kind: "STOP", reason: "NOT_YET_DUE" };
    default:
      break;
  }

  if (inputs.sentAt === null) return { kind: "STOP", reason: "NOT_YET_DUE" };

  const step = nextQuoteFollowupStep(
    inputs.sentAt,
    inputs.offsetsDays ?? DEFAULT_QUOTE_FOLLOWUP_OFFSETS_DAYS,
    inputs.alreadyFiredSteps,
  );
  if (step === null) return { kind: "STOP", reason: "SCHEDULE_EXHAUSTED" };
  if (step.scheduledFor > now) return { kind: "STOP", reason: "NOT_YET_DUE" };
  return { kind: "DUE", step };
}
