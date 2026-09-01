import type { RequestSource, RequestStatus } from "@/lib/requests/schema";

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

export const requestStatusLabels: Record<RequestStatus, string> = {
  NEW: "Nouvelle demande",
  PROCESSING: "À qualifier",
  NEEDS_INFO: "Informations manquantes",
  QUALIFIED: "Qualifiée",
  READY: "Prête pour votre équipe",
  ASSIGNED: "Transmise",
  CLOSED: "Fermée",
  SPAM: "Indésirable",
  LOST: "Non retenue",
};

export const requestSourceLabels: Record<RequestSource, string> = {
  MANUAL: "Saisie manuelle",
  WEBSITE: "Site internet",
  EMAIL: "Email",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  CRM: "CRM",
  GROWTH: "Campagne",
};

export function formatRequestDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatRequestDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function requestStatusLabel(status: string): string {
  return status in requestStatusLabels
    ? requestStatusLabels[status as RequestStatus]
    : status;
}

export function requestSourceLabel(source: string): string {
  return source in requestSourceLabels
    ? requestSourceLabels[source as RequestSource]
    : source;
}

export function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    "request.created": "Demande créée",
    "request.status_changed": "Statut mis à jour",
    "request.received": "Demande reçue",
    "request.processed": "Demande préparée",
    "request.qualified": "Demande qualifiée",
    "request.needs_info": "Informations demandées",
    "request.ready": "Demande prête",
  };

  return labels[type] ?? "Activité enregistrée";
}
