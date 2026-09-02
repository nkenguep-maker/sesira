import type { CommercialObjectionKind } from "./objections";

export type CommercialObjectionSignal = {
  id: string;
  messageId: string;
  kind: CommercialObjectionKind;
  summary: string;
  evidence: string | null;
  confidence: number;
  source: "AI" | "HUMAN";
  sensitive: boolean;
  updatedAt: string;
};

export type OpportunityCommercialSnapshot = {
  opportunity: {
    id: string;
    openedAt: string;
    updatedAt: string;
    commercialState: string;
    estimatedValue: number | null;
    currency: string;
  };
  latestQuote: null | {
    id: string;
    status: string;
    sentAt: string | null;
    updatedAt: string;
    nextActionAt: string | null;
    automationPausedAt: string | null;
    automationPauseReason: string | null;
    optedOutAt: string | null;
  };
  lastInbound: null | {
    messageId: string;
    receivedAt: string | null;
    intent: string | null;
    confidence: number | null;
  };
  objections: CommercialObjectionSignal[];
  emailOpenSignalUsed: false;
};

export type CommercialSignalFactor = {
  key: "OPPORTUNITY_AGE" | "LATEST_QUOTE" | "LAST_REPLY" | "NEXT_ACTION" | "FOLLOWUP_SAFETY" | "OBJECTIONS" | "EMAIL_OPENS";
  label: string;
  value: string;
  evidenceAt: string | null;
  source: "OBSERVED" | "SAFETY_CONTRACT";
  caution: string | null;
};

export function buildCommercialSignalFactors(snapshot: OpportunityCommercialSnapshot, now = new Date()): CommercialSignalFactor[] {
  const factors: CommercialSignalFactor[] = [];
  factors.push({
    key: "OPPORTUNITY_AGE",
    label: "Ancienneté du dossier",
    value: durationLabel(snapshot.opportunity.openedAt, now),
    evidenceAt: snapshot.opportunity.openedAt,
    source: "OBSERVED",
    caution: "Ancienneté observée, pas probabilité de signature.",
  });

  if (snapshot.latestQuote) {
    factors.push({
      key: "LATEST_QUOTE",
      label: "Dernier devis courant",
      value: snapshot.latestQuote.sentAt ? `Envoyé ${durationLabel(snapshot.latestQuote.sentAt, now)}` : `État ${snapshot.latestQuote.status}`,
      evidenceAt: snapshot.latestQuote.sentAt ?? snapshot.latestQuote.updatedAt,
      source: "OBSERVED",
      caution: null,
    });
    factors.push({
      key: "NEXT_ACTION",
      label: "Prochaine action enregistrée",
      value: snapshot.latestQuote.nextActionAt ? formatDate(snapshot.latestQuote.nextActionAt) : "Aucune date enregistrée",
      evidenceAt: snapshot.latestQuote.nextActionAt,
      source: "OBSERVED",
      caution: "Absence de date ne signifie pas absence d'activité hors SESIRA.",
    });
    factors.push({
      key: "FOLLOWUP_SAFETY",
      label: "Sécurité du suivi",
      value: snapshot.latestQuote.optedOutAt ? "Opt out enregistré" : snapshot.latestQuote.automationPausedAt ? `En pause${snapshot.latestQuote.automationPauseReason ? ` · ${snapshot.latestQuote.automationPauseReason}` : ""}` : "Aucune pause enregistrée",
      evidenceAt: snapshot.latestQuote.optedOutAt ?? snapshot.latestQuote.automationPausedAt,
      source: "OBSERVED",
      caution: null,
    });
  }

  factors.push({
    key: "LAST_REPLY",
    label: "Dernière réponse client",
    value: snapshot.lastInbound ? `${snapshot.lastInbound.intent ?? "Intention non confirmée"}${snapshot.lastInbound.confidence === null ? "" : ` · confiance ${Math.round(snapshot.lastInbound.confidence * 100)} %`}` : "Aucune réponse entrante enregistrée",
    evidenceAt: snapshot.lastInbound?.receivedAt ?? null,
    source: "OBSERVED",
    caution: snapshot.lastInbound?.confidence !== null && snapshot.lastInbound?.confidence !== undefined ? "La confiance AI est un signal, jamais une autorisation." : null,
  });

  const sensitive = snapshot.objections.filter((item) => item.sensitive).length;
  factors.push({
    key: "OBJECTIONS",
    label: "Objections ouvertes",
    value: snapshot.objections.length ? `${snapshot.objections.length} ouverte${snapshot.objections.length > 1 ? "s" : ""}${sensitive ? ` · ${sensitive} sensible${sensitive > 1 ? "s" : ""}` : ""}` : "Aucune objection structurée",
    evidenceAt: snapshot.objections[0]?.updatedAt ?? null,
    source: "OBSERVED",
    caution: null,
  });

  factors.push({
    key: "EMAIL_OPENS",
    label: "Ouvertures d'email",
    value: "Non utilisées comme signal d'intérêt",
    evidenceAt: null,
    source: "SAFETY_CONTRACT",
    caution: "Une ouverture technique ne prouve pas l'intérêt d'achat.",
  });
  return factors;
}

function durationLabel(value: string, now: Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  const days = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "il y a 1 jour";
  return `il y a ${days} jours`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}
