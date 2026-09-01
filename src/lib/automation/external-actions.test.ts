import { describe, expect, it } from "vitest";

import { areExternalActionsEnabled, assertExternalActionsEnabled } from "./external-actions";

describe("external action policy", () => {
  it.each([
    { configuredValue: undefined, deploymentEnvironment: undefined },
    { configuredValue: "false", deploymentEnvironment: "production" as const },
    { configuredValue: "true", deploymentEnvironment: "development" as const },
    { configuredValue: "true", deploymentEnvironment: "preview" as const },
  ])("fails closed for %#", (policy) => {
    expect(areExternalActionsEnabled(policy)).toBe(false);
    expect(() => assertExternalActionsEnabled(policy)).toThrow("External actions are disabled");
  });

  it("permits an action only when production and the explicit flag agree", () => {
    const policy = {
      configuredValue: "true",
      deploymentEnvironment: "production" as const,
    };

    expect(areExternalActionsEnabled(policy)).toBe(true);
    expect(() => assertExternalActionsEnabled(policy)).not.toThrow();
  });
});
