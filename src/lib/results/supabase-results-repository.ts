import type { PostgrestError } from "@supabase/supabase-js";

import type {
  ObservedMetric,
  ObservedMetricKey,
  ResultsRepository,
} from "@/lib/results/contracts";
import { RESULTS_HYPOTHESES, buildEstimatedMetrics, deriveResultsState } from "@/lib/results/summary";
import { createClient } from "@/lib/supabase/server";

type CountResult = {
  count: number | null;
  error: PostgrestError | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const METRIC_DEFINITIONS: Record<ObservedMetricKey, Pick<ObservedMetric, "label" | "context">> = {
  new_requests: {
    label: "Nouvelles demandes",
    context: "Créées pendant la période",
  },
  quotes_created: {
    label: "Devis créés",
    context: "Créés pendant la période",
  },
  quotes_sent: {
    label: "Devis envoyés",
    context: "Envois réellement enregistrés pendant la période",
  },
  attention_open: {
    label: "Éléments à traiter",
    context: "Ouverts à ce jour",
  },
  attention_resolved: {
    label: "Éléments résolus",
    context: "Résolus pendant la période",
  },
};

export function createSupabaseResultsRepository(
  supabase: SupabaseServerClient,
): ResultsRepository {
  return {
    async getSummary({ organizationId, period }) {
      const [requests, quotesCreated, quotesSent, attentionOpen, attentionResolved] = await Promise.all([
        supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .gte("created_at", period.startAt)
          .lte("created_at", period.endAt),
        supabase
          .from("quotes")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .gte("created_at", period.startAt)
          .lte("created_at", period.endAt),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("type", "quote.sent")
          .gte("created_at", period.startAt)
          .lte("created_at", period.endAt),
        supabase
          .from("attention_items")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .in("status", ["OPEN", "IN_PROGRESS"]),
        supabase
          .from("attention_items")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "RESOLVED")
          .gte("resolved_at", period.startAt)
          .lte("resolved_at", period.endAt),
      ]);

      const results: Array<[ObservedMetricKey, CountResult]> = [
        ["new_requests", requests],
        ["quotes_created", quotesCreated],
        ["quotes_sent", quotesSent],
        ["attention_open", attentionOpen],
        ["attention_resolved", attentionResolved],
      ];

      if (results.every(([, result]) => result.error)) {
        throw new Error("Impossible de charger les résultats.");
      }

      const observed = results.map(([key, result]): ObservedMetric => ({
        key,
        ...METRIC_DEFINITIONS[key],
        value: result.error ? null : (result.count ?? 0),
        availability: result.error ? "UNAVAILABLE" : "AVAILABLE",
      }));
      const estimated = buildEstimatedMetrics(observed);

      return {
        period,
        observed,
        estimated,
        hypotheses: [...RESULTS_HYPOTHESES],
        state: deriveResultsState(observed, estimated),
      };
    },
  };
}
