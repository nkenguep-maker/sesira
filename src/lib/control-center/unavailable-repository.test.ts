import { describe, expect, it } from "vitest";

import { controlCenterRepository } from "@/lib/control-center/unavailable-repository";

describe("unavailable Control Center repository", () => {
  it("keeps every cross-organization read explicitly unavailable", async () => {
    const results = await Promise.all([
      controlCenterRepository.getOverview(),
      controlCenterRepository.listOrganizations(),
      controlCenterRepository.listRuns(),
      controlCenterRepository.listAiRuns(),
      controlCenterRepository.listIncidents(),
      controlCenterRepository.listIntegrations(),
    ]);

    for (const result of results) {
      expect(result).toEqual({
        status: "unavailable",
        reason: "CORE_DATA_NOT_CONFIGURED",
      });
    }
  });
});
