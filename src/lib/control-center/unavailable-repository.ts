import type { ControlCenterRepository, ControlData } from "@/lib/control-center/contracts";

const unavailable = <T>(): ControlData<T> => ({
  status: "unavailable",
  reason: "CORE_DATA_NOT_CONFIGURED",
});

/**
 * Product-side adapter used until Core exposes a redacted, audited,
 * operator-authorized read API. It intentionally performs no database query.
 */
export const controlCenterRepository: ControlCenterRepository = {
  async getOverview() {
    return unavailable();
  },
  async listOrganizations() {
    return unavailable();
  },
  async listRuns() {
    return unavailable();
  },
  async listAiRuns() {
    return unavailable();
  },
  async listIncidents() {
    return unavailable();
  },
  async listIntegrations() {
    return unavailable();
  },
};
