import type { Database } from "@/types/database";

export const AUTOMATION_LEVELS = ["OBSERVATION", "SHADOW", "APPROVAL", "AUTOMATIC"] as const;

export type AutomationLevel = (typeof AUTOMATION_LEVELS)[number];

export type AutomationModuleKey =
  | "QUOTE_FOLLOW_UP"
  | "REQUEST_INTAKE"
  | "EMAIL_TRIAGE"
  | "REPORT_CREATION"
  | "INVOICE_FOLLOW_UP";

export type AutomationHealth = {
  label: string;
  tone: "emerald" | "amber" | "cyan" | "slate";
};

export type AutomationActivity = {
  id: string;
  label: string;
  date: string;
  tone: "emerald" | "amber" | "cyan" | "slate";
};

export type AutomationCard = {
  id: string;
  key: AutomationModuleKey;
  title: string;
  description: string;
  status: "ACTIVE";
  level: AutomationLevel;
  health: AutomationHealth;
  recentActivity: AutomationActivity[];
  activityAvailable: boolean;
  lastSuccess: string | null;
  lastProblem: string | null;
  allowedAction: string;
  humanJudgment: string;
};

export type AutomationConfigRow = Pick<
  Database["public"]["Tables"]["automation_configs"]["Row"],
  "id" | "template_key" | "enabled" | "level" | "updated_at"
>;

export type AutomationRunRow = Pick<
  Database["public"]["Tables"]["automation_runs"]["Row"],
  "id" | "automation_config_id" | "status" | "created_at" | "completed_at"
>;

export type AutomationRunsByConfig = Record<string, AutomationRunRow[] | null>;
