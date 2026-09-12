import { describe, expect, it } from "vitest";

import { PendingProductionRoutingProvider } from "./pending-provider";
import { TestRoutingProvider } from "./test-provider";

describe("PendingProductionRoutingProvider", () => {
  it("always returns UNAVAILABLE with a reason", async () => {
    const p = new PendingProductionRoutingProvider();
    const res = await p.estimateRoute(
      { latitude: 48.858, longitude: 2.294 },
      { latitude: 43.6, longitude: 1.44 },
    );
    expect(res.status).toBe("UNAVAILABLE");
    if (res.status === "UNAVAILABLE") {
      expect(res.reason).toBeTruthy();
    }
  });
});

describe("TestRoutingProvider", () => {
  it("returns READY with plausible haversine distance for Paris → Toulouse", async () => {
    const p = new TestRoutingProvider(40);
    const res = await p.estimateRoute(
      { latitude: 48.858, longitude: 2.294 },
      { latitude: 43.6, longitude: 1.44 },
    );
    expect(res.status).toBe("READY");
    if (res.status === "READY") {
      // Paris → Toulouse ~ 590 km great-circle. Allow ±5% margin.
      expect(res.distanceMeters).toBeGreaterThan(560_000);
      expect(res.distanceMeters).toBeLessThan(620_000);
      // At 40 km/h avg → ~14.75 h = ~53100 s. Allow margin.
      expect(res.durationSeconds).toBeGreaterThan(50_000);
      expect(res.durationSeconds).toBeLessThan(56_000);
    }
  });

  it("returns 0 distance and 0 duration for identical points", async () => {
    const p = new TestRoutingProvider();
    const res = await p.estimateRoute(
      { latitude: 48.858, longitude: 2.294 },
      { latitude: 48.858, longitude: 2.294 },
    );
    expect(res.status).toBe("READY");
    if (res.status === "READY") {
      expect(res.distanceMeters).toBe(0);
      expect(res.durationSeconds).toBe(0);
    }
  });
});
