import "server-only";

import type { Coordinate, RoutingEstimate, RoutingProvider } from "./provider";

/**
 * TestRoutingProvider — deterministic haversine + a fake average speed.
 * Used ONLY in tests / dev to exercise the READY path without a real
 * provider. Wired via env `NEXT_PUBLIC_FLEET_ROUTING_KIND=TEST` (never
 * in production).
 */
export class TestRoutingProvider implements RoutingProvider {
  readonly kind = "TEST" as const;
  private readonly averageSpeedKmh: number;

  constructor(averageSpeedKmh = 40) {
    this.averageSpeedKmh = averageSpeedKmh;
  }

  async estimateRoute(from: Coordinate, to: Coordinate): Promise<RoutingEstimate> {
    const distanceMeters = haversineMeters(from, to);
    const durationSeconds = Math.round((distanceMeters / 1000 / this.averageSpeedKmh) * 3600);
    return {
      status: "READY",
      distanceMeters: Math.round(distanceMeters * 100) / 100,
      durationSeconds,
      providerRef: null,
    };
  }
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_METERS * c;
}
