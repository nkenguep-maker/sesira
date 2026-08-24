export type ControlData<T> =
  | {
      status: "available";
      data: T;
      generatedAt: string;
    }
  | {
      status: "unavailable";
      reason: "CORE_DATA_NOT_CONFIGURED";
    };

export type ControlHealth = "HEALTHY" | "DEGRADED" | "CRITICAL" | "UNKNOWN";
export type ControlRunStatus = "SUCCEEDED" | "RUNNING" | "FAILED" | "CANCELLED" | "UNKNOWN";
export type ControlIncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "UNKNOWN";
export type ControlIncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";

export type ControlOverview = {
  organizationCount: number;
  automationHealth: ControlHealth;
  automationSuccessRate: number | null;
  openIncidentCount: number;
  aiCost: { amount: number; currency: string } | null;
  infrastructureCost: { amount: number; currency: string } | null;
  periodLabel: string;
};

export type ControlOrganization = {
  id: string;
  name: string;
  sector: string;
  modules: string[];
  health: ControlHealth;
  integrationSummary: string;
  openIncidentCount: number;
};

export type ControlRun = {
  id: string;
  organizationName: string;
  automationName: string;
  status: ControlRunStatus;
  startedAt: string;
  durationMs: number | null;
};

export type ControlAiRun = {
  id: string;
  organizationName: string;
  feature: string;
  model: string;
  confidence: number | null;
  latencyMs: number | null;
  cost: { amount: number; currency: string } | null;
  status: ControlRunStatus;
  createdAt: string;
};

export type ControlIncident = {
  id: string;
  organizationName: string;
  severity: ControlIncidentSeverity;
  category: string;
  status: ControlIncidentStatus;
  title: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type ControlIntegration = {
  id: string;
  organizationName: string;
  provider: string;
  health: ControlHealth;
  lastSyncAt: string | null;
  expiresAt: string | null;
  clientSafeProblem: string | null;
};

export type ControlCenterRepository = {
  getOverview(): Promise<ControlData<ControlOverview>>;
  listOrganizations(): Promise<ControlData<ControlOrganization[]>>;
  listRuns(): Promise<ControlData<ControlRun[]>>;
  listAiRuns(): Promise<ControlData<ControlAiRun[]>>;
  listIncidents(): Promise<ControlData<ControlIncident[]>>;
  listIntegrations(): Promise<ControlData<ControlIntegration[]>>;
};
