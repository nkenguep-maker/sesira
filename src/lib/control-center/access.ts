export type ControlAccess =
  | {
      status: "AUTHORIZED";
      operatorId: string;
    }
  | {
      status: "UNAVAILABLE";
      reason: "CORE_ACCESS_NOT_CONFIGURED";
    };

/**
 * Control Center access must be granted by a future, server-verified Core
 * operator identity. Tenant membership and organization roles are not valid
 * authority for cross-organization access.
 */
export const getControlAccess = cache(async (): Promise<ControlAccess> => {
  return {
    status: "UNAVAILABLE",
    reason: "CORE_ACCESS_NOT_CONFIGURED",
  };
});

export function isControlAccessGranted(
  access: ControlAccess,
): access is Extract<ControlAccess, { status: "AUTHORIZED" }> {
  return access.status === "AUTHORIZED";
}
import { cache } from "react";
