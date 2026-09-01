import type { QuoteStatus } from "@/lib/quotes/schema";

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

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  FOLLOWING_UP: "À suivre",
  REPLIED: "Réponse reçue",
  NEEDS_HUMAN: "À voir",
  WON: "Gagné",
  LOST: "Perdu",
  EXPIRED: "Expiré",
};

export function formatQuoteAmount(amount: number | string | null, currency = "EUR"): string {
  if (amount === null) {
    return "Montant à préciser";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatQuoteDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "À préciser";
}

export function formatQuoteDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function quoteStatusLabel(status: string): string {
  return status in quoteStatusLabels ? quoteStatusLabels[status as QuoteStatus] : status;
}

export function quoteEventLabel(type: string): string {
  const labels: Record<string, string> = {
    "quote.created": "Devis créé",
    "quote.sent": "Devis envoyé",
    "quote.status_changed": "Statut mis à jour",
    "quote.replied": "Réponse reçue",
    "quote.won": "Devis gagné",
    "quote.lost": "Devis perdu",
  };

  return labels[type] ?? "Activité enregistrée";
}
