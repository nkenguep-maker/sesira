export type DeploymentEnvironment = "development" | "preview" | "production" | undefined;

type ExternalActionPolicy = {
  configuredValue: string | undefined;
  deploymentEnvironment: DeploymentEnvironment;
};

/**
 * External side effects fail closed. Enabling the flag is insufficient unless
 * the code is also running in the production Vercel environment.
 */
export function areExternalActionsEnabled({
  configuredValue,
  deploymentEnvironment,
}: ExternalActionPolicy): boolean {
  return configuredValue === "true" && deploymentEnvironment === "production";
}

export function assertExternalActionsEnabled(policy: ExternalActionPolicy): void {
  if (!areExternalActionsEnabled(policy)) {
    throw new Error("External actions are disabled for this environment.");
  }
}
