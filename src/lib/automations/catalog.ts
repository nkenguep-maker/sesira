import type { AutomationModuleKey } from "@/lib/automations/contracts";

export type AutomationDefinition = {
  key: AutomationModuleKey;
  templateKeys: string[];
  title: string;
  description: string;
  allowedAction: string;
  humanJudgment: string;
};

export const AUTOMATION_CATALOG: AutomationDefinition[] = [
  {
    key: "QUOTE_FOLLOW_UP",
    templateKeys: ["quote_follow_up", "quotes_follow_up", "quote_followup"],
    title: "Relancer les devis",
    description: "Suivre les devis qui attendent une réponse.",
    allowedAction: "Repérer les devis à suivre et préparer une relance standard.",
    humanJudgment: "Les réponses clients, baisses de prix demandées et décisions commerciales.",
  },
  {
    key: "REQUEST_INTAKE",
    templateKeys: ["request_intake", "new_request_processing", "process_new_requests"],
    title: "Traiter les nouvelles demandes",
    description: "Préparer les demandes entrantes pour votre équipe.",
    allowedAction: "Repérer une nouvelle demande et structurer les informations disponibles.",
    humanJudgment: "Les priorités, informations manquantes, cas à part et décisions commerciales.",
  },
  {
    key: "EMAIL_TRIAGE",
    templateKeys: ["email_triage", "email_sorting", "sort_emails"],
    title: "Trier les emails",
    description: "Organiser les messages qui méritent votre attention.",
    allowedAction: "Préparer une catégorie et mettre en évidence les messages importants.",
    humanJudgment: "Les réponses, plaintes, urgences et messages sensibles.",
  },
  {
    key: "REPORT_CREATION",
    templateKeys: ["report_creation", "create_reports", "reports"],
    title: "Créer les rapports",
    description: "Préparer une vue claire de l’activité disponible.",
    allowedAction: "Rassembler les indicateurs enregistrés et préparer une synthèse.",
    humanJudgment: "L’interprétation, les décisions et la diffusion du rapport.",
  },
  {
    key: "INVOICE_FOLLOW_UP",
    templateKeys: ["invoice_follow_up", "invoices_follow_up", "invoice_reminders"],
    title: "Relancer les factures",
    description: "Suivre les échéances qui nécessitent une action.",
    allowedAction: "Repérer une échéance et préparer un rappel standard.",
    humanJudgment: "Les clients mécontents, promesses de paiement et modifications financières.",
  },
];

export function findAutomationDefinition(templateKey: string): AutomationDefinition | undefined {
  const normalized = templateKey.trim().toLowerCase().replace(/[.\-\s]+/g, "_");
  return AUTOMATION_CATALOG.find((definition) => definition.templateKeys.includes(normalized));
}
