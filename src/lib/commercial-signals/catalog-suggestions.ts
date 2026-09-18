import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogItemKind } from "@/lib/catalog/schema";
import type { CommercialSignalKind } from "@/lib/commercial-signals/schema";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Deterministic mapping of signal-kind → matching catalog item kinds.
 *
 * A signal SUGGESTS a catalog item ONLY when a deterministic
 * correspondence exists. This is intentionally narrow — the goal is not
 * to auto-price nor to auto-send a quote. The signal-flow is:
 *
 *     detected → reviewed → planned → (human explicitly picks a catalog
 *     item at conversion) → quote DRAFT.
 *
 * Never populate `applied_catalog_item_id` from a scanner. Never surface
 * a monetary amount UNLESS the operator explicitly attached a catalog
 * item ("Montant catalogue indicatif : X €" — never "revenu potentiel").
 */
const SIGNAL_KIND_TO_CATALOG_KINDS: Record<CommercialSignalKind, readonly CatalogItemKind[]> = {
  LEAK_CHECK_DUE: ["MAINTENANCE"],
};

export function catalogKindsForSignalKind(
  signalKind: CommercialSignalKind,
): readonly CatalogItemKind[] {
  return SIGNAL_KIND_TO_CATALOG_KINDS[signalKind] ?? [];
}

interface Deps {
  client?: SupabaseClient<Database>;
}

export interface SuggestedCatalogItem {
  catalogItemId: string;
  name: string;
  kind: CatalogItemKind;
  code: string | null;
  baseAmount: number | null;
  currency: string;
}

export type SuggestCatalogItemResult =
  | { status: "OK"; item: SuggestedCatalogItem }
  | { status: "NO_MATCH" }
  | { status: "ERROR"; reason: string };

/**
 * Best-effort match: return the first active, non-archived catalog item
 * whose kind matches the signal-kind mapping. Never returns more than
 * one. Returns NO_MATCH when the org has no matching item — the UI must
 * render this as "aucune prestation catalogue proposée" (never invent).
 */
export async function suggestCatalogItemForSignalKind(
  organizationId: string,
  signalKind: CommercialSignalKind,
  deps: Deps = {},
): Promise<SuggestCatalogItemResult> {
  const kinds = catalogKindsForSignalKind(signalKind);
  if (kinds.length === 0) return { status: "NO_MATCH" };

  const supabase = deps.client ?? (await createClient());
  const { data, error } = await supabase
    .from("service_catalog_items")
    .select("id, name, kind, code, base_amount, currency, active, archived_at")
    .eq("organization_id", organizationId)
    .in("kind", kinds as unknown as string[])
    .eq("active", true)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(1);

  if (error) {
    return { status: "ERROR", reason: `service_catalog_items: ${error.message}` };
  }
  const row = data?.[0];
  if (!row) return { status: "NO_MATCH" };

  const raw = row as unknown as {
    id: string;
    name: string;
    kind: string;
    code: string | null;
    base_amount: number | string | null;
    currency: string;
  };
  const baseAmount =
    raw.base_amount === null || raw.base_amount === undefined
      ? null
      : typeof raw.base_amount === "number"
        ? raw.base_amount
        : Number(raw.base_amount);

  return {
    status: "OK",
    item: {
      catalogItemId: raw.id,
      name: raw.name,
      kind: raw.kind as CatalogItemKind,
      code: raw.code,
      baseAmount: Number.isFinite(baseAmount as number) ? (baseAmount as number) : null,
      currency: raw.currency,
    },
  };
}
