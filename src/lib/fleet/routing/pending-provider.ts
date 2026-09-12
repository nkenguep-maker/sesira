import "server-only";

import type { Coordinate, RoutingEstimate, RoutingProvider } from "./provider";

/**
 * PendingProductionRoutingProvider — default in production until a real
 * routing provider (Google/HERE/Mapbox/OSRM) is configured. Always
 * returns UNAVAILABLE — never fakes an ETA.
 */
export class PendingProductionRoutingProvider implements RoutingProvider {
  readonly kind = "PENDING_PRODUCTION" as const;

  async estimateRoute(_from: Coordinate, _to: Coordinate): Promise<RoutingEstimate> {
    return {
      status: "UNAVAILABLE",
      reason: "No routing provider configured for this environment",
    };
  }
}
