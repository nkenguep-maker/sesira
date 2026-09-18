import type { CommercialSignalSeverity } from "@/lib/commercial-signals/schema";

/**
 * Pure, deterministic severity from due-date proximity.
 *
 * MIRROR of `private.commercial_signal_severity_from_due` in the DB.
 * Both sides must move together: if you change one, change the other and
 * update the shared test.
 *
 *   URGENT  → overdue OR due within 7 days
 *   HIGH    → due within 30 days
 *   NORMAL  → due within 90 days
 *   LOW     → due later OR no due date at all
 */
export function commercialSignalSeverityFromDue(
  dueAt: Date | string | null,
  now: Date = new Date(),
): CommercialSignalSeverity {
  if (dueAt === null) return "LOW";
  const due = dueAt instanceof Date ? dueAt : new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "LOW";

  const diffMs = due.getTime() - now.getTime();
  if (diffMs <= 0) return "URGENT";

  const day = 24 * 60 * 60 * 1000;
  if (diffMs <= 7 * day) return "URGENT";
  if (diffMs <= 30 * day) return "HIGH";
  if (diffMs <= 90 * day) return "NORMAL";
  return "LOW";
}
