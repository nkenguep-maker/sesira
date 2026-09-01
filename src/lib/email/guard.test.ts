import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  GuardedEmailDisabledError,
  assertGuardedEmailAllowed,
  isGuardedEmailAllowed,
  readGuardedEmailPolicy,
} from "./guard";

const ORIGINAL_EXTERNAL = process.env.EXTERNAL_ACTIONS_ENABLED;
const ORIGINAL_VERCEL_ENV = process.env.VERCEL_ENV;

describe("assertGuardedEmailAllowed / isGuardedEmailAllowed", () => {
  beforeEach(() => {
    delete process.env.EXTERNAL_ACTIONS_ENABLED;
    delete process.env.VERCEL_ENV;
  });
  afterEach(() => {
    if (ORIGINAL_EXTERNAL === undefined) delete process.env.EXTERNAL_ACTIONS_ENABLED;
    else process.env.EXTERNAL_ACTIONS_ENABLED = ORIGINAL_EXTERNAL;
    if (ORIGINAL_VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = ORIGINAL_VERCEL_ENV;
  });

  it("throws GuardedEmailDisabledError when flag is unset", () => {
    expect(() => assertGuardedEmailAllowed({ configuredValue: "false", deploymentEnvironment: "production" }))
      .toThrow(GuardedEmailDisabledError);
  });

  it("throws when flag is true but deployment is not production (preview)", () => {
    expect(() => assertGuardedEmailAllowed({ configuredValue: "true", deploymentEnvironment: "preview" }))
      .toThrow(GuardedEmailDisabledError);
  });

  it("throws when flag is true but deployment is development", () => {
    expect(() => assertGuardedEmailAllowed({ configuredValue: "true", deploymentEnvironment: "development" }))
      .toThrow(GuardedEmailDisabledError);
  });

  it("throws when flag is true but deployment is undefined", () => {
    expect(() => assertGuardedEmailAllowed({ configuredValue: "true", deploymentEnvironment: undefined }))
      .toThrow(GuardedEmailDisabledError);
  });

  it("throws when deployment is production but flag is false", () => {
    expect(() => assertGuardedEmailAllowed({ configuredValue: "false", deploymentEnvironment: "production" }))
      .toThrow(GuardedEmailDisabledError);
  });

  it("does not throw when both flag=true and env=production", () => {
    expect(() => assertGuardedEmailAllowed({ configuredValue: "true", deploymentEnvironment: "production" }))
      .not.toThrow();
  });

  it("isGuardedEmailAllowed mirrors the assert semantics", () => {
    expect(isGuardedEmailAllowed({ configuredValue: "true", deploymentEnvironment: "production" })).toBe(true);
    expect(isGuardedEmailAllowed({ configuredValue: "true", deploymentEnvironment: "preview" })).toBe(false);
    expect(isGuardedEmailAllowed({ configuredValue: "false", deploymentEnvironment: "production" })).toBe(false);
  });

  it("error message never leaks the token value, only the resolved flag + env", () => {
    try {
      assertGuardedEmailAllowed({ configuredValue: "false", deploymentEnvironment: "preview" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(GuardedEmailDisabledError);
      const message = (err as Error).message;
      expect(message).toContain("EXTERNAL_ACTIONS_ENABLED=false");
      expect(message).toContain("VERCEL_ENV=preview");
      expect(message).not.toContain("sbp_");
      expect(message).not.toContain("sb_secret_");
    }
  });

  it("readGuardedEmailPolicy reflects VERCEL_ENV at read time", () => {
    process.env.VERCEL_ENV = "preview";
    const policy = readGuardedEmailPolicy();
    expect(policy.deploymentEnvironment).toBe("preview");
  });
});
