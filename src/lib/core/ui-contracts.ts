export type ConnectionState = "not_connected" | "pending" | "connected" | "error";

export type MetricValue = number | string | null;

export interface WorkspaceIdentity {
  id: string;
  name: string;
  slug?: string | null;
}

export interface DashboardMetric {
  id: "activeClients" | "openQuotes" | "followUps" | "connectedMailboxes";
  value: MetricValue;
}

export interface DashboardPriority {
  id: string;
  title: string;
  description?: string | null;
  href?: string | null;
  dueAt?: string | null;
}

export interface DashboardSnapshot {
  workspace: WorkspaceIdentity | null;
  metrics: DashboardMetric[];
  priorities: DashboardPriority[];
  connections: {
    company: ConnectionState;
    team: ConnectionState;
    data: ConnectionState;
    email: ConnectionState;
  };
}

export interface ClientSummary {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  status?: string | null;
  updatedAt?: string | null;
}

export interface QuoteSummary {
  id: string;
  number?: string | null;
  clientName: string;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  updatedAt?: string | null;
}

export interface FollowUpSummary {
  id: string;
  title: string;
  clientName?: string | null;
  ownerName?: string | null;
  dueAt?: string | null;
  status?: string | null;
}

export interface TeamMemberSummary {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  status?: string | null;
}

export interface IntegrationSummary {
  id: string;
  provider: string;
  label: string;
  state: ConnectionState;
  accountLabel?: string | null;
}

export interface OnboardingDraft {
  companyName: string;
  industry: string;
  teamSize: string;
  primaryRole: string;
  primaryTool: string;
  importFormat: string;
  emailProvider: string;
  professionalEmail: string;
  followUpDelay: string;
  defaultOwner: string;
  observationPeriod: string;
  primaryGoal: string;
}

export interface AuthUiPort {
  signIn(input: { email: string; password: string }): Promise<void>;
  requestPasswordReset(input: { email: string; redirectTo: string }): Promise<void>;
  updatePassword(input: { password: string }): Promise<void>;
  signOut(): Promise<void>;
}

export interface SesiraUiCorePort {
  auth: AuthUiPort;
  getDashboard(): Promise<DashboardSnapshot>;
  getClients(): Promise<ClientSummary[]>;
  getQuotes(): Promise<QuoteSummary[]>;
  getFollowUps(): Promise<FollowUpSummary[]>;
  getTeamMembers(): Promise<TeamMemberSummary[]>;
  getIntegrations(): Promise<IntegrationSummary[]>;
  getOnboardingDraft(): Promise<Partial<OnboardingDraft> | null>;
  saveOnboardingDraft(input: OnboardingDraft): Promise<void>;
}

/**
 * UI DTOs only. The core may keep a different database/domain model and map it
 * into these contracts at the route/server-component boundary.
 */
