import "server-only";

/**
 * C42 — RoutingProvider seam.
 *
 * Adapters compute distance + duration between two coordinates. When no
 * provider is configured (default), the seam MUST NOT invent numbers —
 * it returns `{ status: "UNAVAILABLE" }` so the caller records that fact
 * honestly via `record_fleet_route_estimate(..., 'UNAVAILABLE', ...)`.
 *
 * Provider adapters:
 *   * TestRoutingProvider — deterministic haversine + fake average speed,
 *     used ONLY in tests. Never wired up in production.
 *   * PendingProductionRoutingProvider — always returns UNAVAILABLE.
 *     Wired by default so an un-configured prod org sees "indisponible"
 *     instead of a fabricated ETA.
 *
 * Wording rule: SUCCESS is not implicit. The DB status column carries
 * the truth (READY / UNAVAILABLE / FAILED); the read model exposes it
 * verbatim. UI must render "indisponible" for UNAVAILABLE and MUST NOT
 * substitute a placeholder duration.
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type RoutingProviderKind =
  | "TEST"
  | "PENDING_PRODUCTION"
  | "GOOGLE"
  | "HERE"
  | "MAPBOX"
  | "OSRM"
  | "OTHER";

export type RoutingEstimate =
  | {
      status: "READY";
      distanceMeters: number;
      durationSeconds: number;
      providerRef?: string | null;
    }
  | { status: "UNAVAILABLE"; reason?: string }
  | { status: "FAILED"; reason: string };

export interface RoutingProvider {
  readonly kind: RoutingProviderKind;
  estimateRoute(from: Coordinate, to: Coordinate): Promise<RoutingEstimate>;
}
