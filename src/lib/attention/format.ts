import type { AttentionPriority, AttentionStatus } from "@/lib/attention/schema";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const attentionPriorityLabels: Record<AttentionPriority, string> = {
  LOW: "Faible",
  NORMAL: "Normale",
  HIGH: "Haute",
  URGENT: "Urgente",
};

export const attentionStatusLabels: Record<AttentionStatus, string> = {
  OPEN: "À traiter",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  DISMISSED: "Ignoré",
};

const categoryLabels: Record<string, string> = {
  URGENT: "Urgent",
  SALES: "Commercial",
  CUSTOMER: "Client",
  FINANCE: "Finance",
  DOCUMENT: "Document",
  AUTOMATION: "Suivi",
  INTEGRATION: "Connexion",
  INCIDENT: "Incident",
};

const reasonExplanations: Record<string, string> = {
  PRICE_OBJECTION: "Le client souhaite revoir le prix proposé.",
  INTERESTED_CUSTOMER: "Le client a manifesté un intérêt qui mérite une réponse humaine.",
  COMPLAINT: "Le message exprime une insatisfaction qui demande votre jugement.",
  URGENT_REQUEST: "Cette demande comporte une échéance proche ou un besoin urgent.",
  UNUSUAL_REQUEST: "Cette demande sort du traitement habituel et doit être vérifiée.",
  LOW_CONFIDENCE: "Les informations disponibles ne permettent pas de décider avec certitude.",
  MISSING_INFORMATION: "Des informations sont nécessaires avant de poursuivre.",
  INVOICE_DISPUTE: "Un désaccord sur une facture demande une décision humaine.",
  EXPIRED_INTEGRATION: "Une connexion utilisée par Sesira n’est plus active.",
  AUTOMATION_FAILURE: "Une étape de suivi n’a pas pu être menée à son terme.",
};

export function attentionCategoryLabel(category: string): string {
  return categoryLabels[normalizeCode(category)] ?? "Autre";
}

export function attentionReasonExplanation(reason: string): string {
  return reasonExplanations[normalizeCode(reason)] ?? "Cette situation demande votre vérification avant de poursuivre.";
}

export function formatAttentionDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatAttentionDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function isAttentionOverdue(dueAt: string | null, status: string, now = new Date()): boolean {
  return Boolean(dueAt && (status === "OPEN" || status === "IN_PROGRESS") && new Date(dueAt) < now);
}

function normalizeCode(value: string): string {
  return value.trim().replace(/[.\s-]+/g, "_").toUpperCase();
}
