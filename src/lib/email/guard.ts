import "server-only";

import {
  areExternalActionsEnabled,
  type DeploymentEnvironment,
} from "@/lib/automation/external-actions";
import { serverEnv } from "@/lib/env";

/**
 * Guard state for the outbound email boundary. Emitted by the tests
 * and by the send orchestrator so a caller can distinguish "kill
 * switch off in config" from "wrong deployment environment".
 */
export type GuardedEmailPolicy = {
  configuredValue: string;
  deploymentEnvironment: DeploymentEnvironment;
};

export function readGuardedEmailPolicy(): GuardedEmailPolicy {
  return {
    configuredValue: serverEnv.EXTERNAL_ACTIONS_ENABLED,
    deploymentEnvironment: process.env.VERCEL_ENV as DeploymentEnvironment,
  };
}

export function isGuardedEmailAllowed(policy?: GuardedEmailPolicy): boolean {
  const resolved = policy ?? readGuardedEmailPolicy();
  return areExternalActionsEnabled({
    configuredValue: resolved.configuredValue,
    deploymentEnvironment: resolved.deploymentEnvironment,
  });
}

/**
 * Fail-closed guard. Throws before any provider is touched unless BOTH
 *   * `EXTERNAL_ACTIONS_ENABLED=true`, AND
 *   * `VERCEL_ENV=production`
 * hold. Every other code path (Shadow, preview, local dev, missing
 * env) surfaces the guard's rejection so nothing leaks to a real
 * mailbox.
 *
 * The message intentionally does NOT include the token value — callers
 * inspecting the error see only "disabled" plus the env that caused it,
 * which is safe to log.
 */
export function assertGuardedEmailAllowed(policy?: GuardedEmailPolicy): void {
  const resolved = policy ?? readGuardedEmailPolicy();
  if (isGuardedEmailAllowed(resolved)) return;
  const flag = resolved.configuredValue === "true" ? "true" : "false";
  const env = resolved.deploymentEnvironment ?? "unset";
  throw new GuardedEmailDisabledError(
    `Guarded email disabled (EXTERNAL_ACTIONS_ENABLED=${flag}, VERCEL_ENV=${env}).`,
  );
}

export class GuardedEmailDisabledError extends Error {
  readonly name = "GuardedEmailDisabledError";
}
