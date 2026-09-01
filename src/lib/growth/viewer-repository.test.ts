import { beforeEach, describe, expect, it, vi } from "vitest";

const { getViewerContext } = vi.hoisted(() => ({ getViewerContext: vi.fn() }));

vi.mock("@/lib/auth/viewer", () => ({ getViewerContext }));

import { getGrowthRepositoryForViewer } from "@/lib/growth/viewer-repository";

describe("viewer Growth repository", () => {
  beforeEach(() => getViewerContext.mockReset());

  it("returns no repository without an authenticated organization", async () => {
    getViewerContext.mockResolvedValue(null);
    await expect(getGrowthRepositoryForViewer()).resolves.toBeNull();
  });

  it("uses only the server viewer organization to label demo knowledge", async () => {
    getViewerContext.mockResolvedValue({
      userId: "user-1",
      email: "owner@example.test",
      role: "OWNER",
      organization: { id: "org-1", name: "Clima Rhône", sectorKey: "CVC", status: "ACTIVE" },
    });

    const repository = await getGrowthRepositoryForViewer();
    expect(repository).not.toBeNull();
    await expect(repository?.getOrganizationKnowledge()).resolves.toMatchObject({
      source: "DEMO",
      data: { organizationName: "Clima Rhône" },
    });
  });
});
