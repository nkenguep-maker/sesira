import { describe, expect, it } from "vitest";

import { getControlAccess, isControlAccessGranted } from "@/lib/control-center/access";
import { getAuthorizedControlCenterRepository } from "@/lib/control-center/authorized-repository";

describe("Control Center access", () => {
  it("is unavailable until Core provides a server-verified operator identity", async () => {
    const access = await getControlAccess();

    expect(access).toEqual({
      status: "UNAVAILABLE",
      reason: "CORE_ACCESS_NOT_CONFIGURED",
    });
    expect(isControlAccessGranted(access)).toBe(false);
  });

  it("recognizes only the explicit authorized contract", () => {
    expect(isControlAccessGranted({ status: "AUTHORIZED", operatorId: "operator-1" })).toBe(true);
  });

  it("does not expose a repository before operator authorization", async () => {
    await expect(getAuthorizedControlCenterRepository()).resolves.toBeNull();
  });
});
