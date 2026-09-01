import { describe, expect, it } from "vitest";

import {
  buildSettingsConnections,
  canManageOrganization,
  formatMemberRole,
} from "./view-model";

describe("settings view model", () => {
  it("limits organization changes to existing administrative roles", () => {
    expect(canManageOrganization("OWNER")).toBe(true);
    expect(canManageOrganization("ADMIN")).toBe(true);
    expect(canManageOrganization("MANAGER")).toBe(false);
    expect(canManageOrganization("MEMBER")).toBe(false);
  });

  it("never presents an absent integration as connected", () => {
    const connections = buildSettingsConnections([]);

    expect(connections).toHaveLength(4);
    expect(connections.every((item) => item.status === "Non connecté")).toBe(true);
    expect(connections.every((item) => item.hasRecord === false)).toBe(true);
  });

  it("shows only real stored connection state", () => {
    const [microsoft] = buildSettingsConnections([
      {
        id: "integration-1",
        provider: "microsoft_graph",
        type: "EMAIL",
        status: "CONNECTED",
        connected_at: "2026-08-24T08:00:00.000Z",
        last_sync_at: "2026-08-24T09:00:00.000Z",
      },
    ]);

    expect(microsoft.status).toBe("Connecté");
    expect(microsoft.hasRecord).toBe(true);
    expect(microsoft.lastSync).toBe("2026-08-24T09:00:00.000Z");
  });

  it("keeps unknown roles client-safe", () => {
    expect(formatMemberRole("FUTURE_ROLE")).toBe("Membre");
  });
});
