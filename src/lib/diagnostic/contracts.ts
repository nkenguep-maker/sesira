export const DIAGNOSTIC_SECTORS = [
  "CVC",
  "SOLAR",
  "TECHNICAL_SERVICES",
  "CONSTRUCTION",
] as const;

export type DiagnosticSector = (typeof DIAGNOSTIC_SECTORS)[number];

export type DiagnosticInput = {
  sector: DiagnosticSector;
  employees: number;
  technicians: number;
  monthlyRequests: number;
  monthlyQuotes: number;
  averageQuoteAmount: number;
  approximateMarginPercent: number;
  weeklyAdminHours: number;
};

export type DiagnosticPriority = {
  key: "REQUESTS" | "QUOTES" | "ADMIN" | "FIELD_COORDINATION";
  title: string;
  explanation: string;
  evidence: string;
};

export type DiagnosticScenarioKey = "PRUDENT" | "PROBABLE" | "HIGH_POTENTIAL";

export type DiagnosticScenario = {
  key: DiagnosticScenarioKey;
  label: string;
  recoveredHoursPerMonth: number;
  marginPotentialPerMonth: number;
  timeSharePercent: number;
  marginSharePercent: number;
};

export type DiagnosticResult = {
  calculationVersion: string;
  monthlyAdminHours: number;
  monthlyQuotedValue: number;
  monthlyQuotedMarginPool: number;
  priorities: DiagnosticPriority[];
  scenarios: DiagnosticScenario[];
  assumptions: string[];
};

export type DiagnosticLead = {
  firstName: string;
  lastName: string;
  company: string;
  professionalEmail: string;
  phone?: string;
  employees: number;
  postalCode: string;
};

export type DiagnosticLeadSubmission = {
  lead: DiagnosticLead;
  diagnosticInput: DiagnosticInput;
  calculationVersion: string;
  consentToContact: boolean;
};

export type DiagnosticLeadSubmissionResult =
  | { status: "accepted"; leadId: string }
  | { status: "rejected"; reason: string }
  | { status: "unavailable" };

export interface DiagnosticLeadRepository {
  submit(input: DiagnosticLeadSubmission): Promise<DiagnosticLeadSubmissionResult>;
}
