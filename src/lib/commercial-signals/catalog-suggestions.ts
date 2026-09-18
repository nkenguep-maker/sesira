import "server-only";

import type { CommercialSignalKind } from "@/lib/commercial-signals/schema";

/**
 * C50 intentionally ships WITHOUT the production catalog contract.
 *
 * The current repository/database only has the legacy
 * `service_catalog_items` shape. The richer catalog fields used by the
 * local C34 experiment (`kind`, `base_amount`, `currency`,
 * `archived_at`) are not part of this branch yet.
 *
 * C51 owns the production-grade catalog model and will replace this
 * fail-closed seam with a typed, tenant-scoped implementation.
 *
 * Important invariant:
 * commercial signals never invent or auto-apply a catalog item.
 */
export type CatalogItemKind = "MAINTENANCE";

const SIGNAL_KIND_TO_CATALOG_KINDS: Record<
  CommercialSignalKind,
  readonly CatalogItemKind[]
> = {
  LEAK_CHECK_DUE: ["MAINTENANCE"],
};

export function catalogKindsForSignalKind(
  signalKind: CommercialSignalKind,
): readonly CatalogItemKind[] {
  return SIGNAL_KIND_TO_CATALOG_KINDS[signalKind] ?? [];
}

export type SuggestCatalogItemResult =
  | { status: "NO_MATCH" }
  | { status: "ERROR"; reason: string };

/**
 * C50 fail-closed implementation.
 *
 * We preserve the public function so UI code can be written against the
 * future seam, but no DB query is executed until C51 publishes the catalog
 * schema and immutable price/version semantics.
 */
export async function suggestCatalogItemForSignalKind(
  organizationId: string,
  signalKind: CommercialSignalKind,
): Promise<SuggestCatalogItemResult> {
  // Keep both arguments part of the stable API without pretending the
  // catalog is ready on this branch.
  void organizationId;
  void signalKind;
  return { status: "NO_MATCH" };
}
