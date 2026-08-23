import type { Json } from "@/types/database";

import { formatQuoteAmount, quoteStatusLabel } from "@/lib/quotes/format";
import { requestSourceLabel, requestStatusLabel } from "@/lib/requests/format";

export type BusinessEvent = {
  id: string;
  organization_id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  source: string;
  payload: Json;
  created_at: string;
};

export type BusinessTimelineScope = {
  entityType: string;
  entityIds: string[];
};

export type BusinessTimelineEntity = {
  id: string;
  type: string;
  label: string;
  href?: string;
};

export type BusinessTimelineItem = {
  id: string;
  title: string;
  date: string;
  sortDate: string;
  actor?: string;
  source?: string;
  entity?: { label: string; href?: string };
  metadata: string[];
  tone: "violet" | "cyan" | "emerald" | "amber" | "slate";
};

type BuildBusinessTimelineOptions = {
  organizationId: string;
  scopes: BusinessTimelineScope[];
  entities?: BusinessTimelineEntity[];
  actorNames?: Record<string, string>;
  viewerUserId?: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function buildBusinessTimeline(
  events: BusinessEvent[],
  options: BuildBusinessTimelineOptions,
): BusinessTimelineItem[] {
  const entityMap = new Map(
    (options.entities ?? []).map((entity) => [entityKey(entity.type, entity.id), entity]),
  );

  return events
    .filter((event) => event.organization_id === options.organizationId && eventMatchesScopes(event, options.scopes))
    .map((event) => {
      const payload = readPayload(event.payload);
      const actorId = readString(payload.actor_id);
      const entity = event.entity_type && event.entity_id
        ? entityMap.get(entityKey(event.entity_type, event.entity_id))
        : undefined;

      return {
        id: event.id,
        title: eventTitle(event.type, payload),
        date: formatBusinessDateTime(event.created_at),
        sortDate: event.created_at,
        actor: actorId
          ? actorId === options.viewerUserId
            ? "Vous"
            : options.actorNames?.[actorId]
          : undefined,
        source: sourceLabel(event.source),
        entity: entity
          ? { label: entity.label, href: entity.href }
          : fallbackEntity(event.entity_type),
        metadata: eventMetadata(event.type, payload),
        tone: eventTone(event.type),
      };
    })
    .sort((left, right) => Date.parse(right.sortDate) - Date.parse(left.sortDate));
}

export function eventMatchesScopes(event: BusinessEvent, scopes: BusinessTimelineScope[]): boolean {
  if (!event.entity_type || !event.entity_id) {
    return false;
  }

  return scopes.some(
    (scope) => scope.entityType === event.entity_type && scope.entityIds.includes(event.entity_id as string),
  );
}

function eventTitle(type: string, payload: Record<string, Json | undefined>): string {
  if (type === "customer.created") return "Client créé";
  if (type === "customer.updated") return "Client mis à jour";
  if (type === "request.created" || type === "request.received") return "Nouvelle demande reçue";
  if (type === "request.status_changed") return "Demande mise à jour";
  if (type === "request.processed") return "Demande préparée";
  if (type === "request.qualified") return "Demande qualifiée";
  if (type === "request.needs_info") return "Informations demandées";
  if (type === "request.ready") return "Demande prête pour votre équipe";
  if (type === "quote.created") {
    const amount = readAmount(payload.amount);
    const currency = readString(payload.currency) ?? "EUR";
    return amount === null ? "Devis créé" : `Devis créé — ${safeQuoteAmount(amount, currency)}`;
  }
  if (type === "quote.sent") return "Devis envoyé";
  if (type === "quote.replied") return "Réponse reçue";
  if (type === "quote.won") return "Devis gagné";
  if (type === "quote.lost") return "Devis perdu";
  if (type === "quote.status_changed") return "Devis mis à jour";
  if (type === "message.received") return "Message reçu";
  if (type === "message.sent") return "Message envoyé";

  return "Activité enregistrée";
}

function eventMetadata(type: string, payload: Record<string, Json | undefined>): string[] {
  const metadata: string[] = [];
  const status = readString(payload.status);
  const previousStatus = readString(payload.previous_status);

  if (type.startsWith("request.")) {
    const requestSource = readString(payload.source);
    if (requestSource) metadata.push(`Origine : ${requestSourceLabel(requestSource)}`);
    if (previousStatus && status) {
      metadata.push(`${requestStatusLabel(previousStatus)} → ${requestStatusLabel(status)}`);
    } else if (status && type !== "request.created") {
      metadata.push(`État : ${requestStatusLabel(status)}`);
    }
  }

  if (type.startsWith("quote.")) {
    if (previousStatus && status) {
      metadata.push(`${quoteStatusLabel(previousStatus)} → ${quoteStatusLabel(status)}`);
    }
    const sentAt = readString(payload.sent_at);
    if (type === "quote.sent" && sentAt) metadata.push(`Envoyé le ${formatBusinessDateTime(sentAt)}`);
  }

  return metadata;
}

function eventTone(type: string): BusinessTimelineItem["tone"] {
  if (type === "quote.won") return "emerald";
  if (type === "quote.sent" || type === "message.sent") return "cyan";
  if (type === "quote.lost") return "slate";
  if (type === "quote.replied" || type === "message.received" || type === "request.needs_info") return "amber";
  return "violet";
}

function sourceLabel(source: string): string | undefined {
  const labels: Record<string, string> = {
    APP: "Sesira",
    SYSTEM: "Sesira",
    AUTOMATION: "Sesira",
    INTEGRATION: "Source connectée",
    IMPORT: "Import",
  };

  return labels[source] ?? (source ? "Source externe" : undefined);
}

function fallbackEntity(entityType: string | null): { label: string } | undefined {
  if (entityType === "customer") return { label: "Client" };
  if (entityType === "request") return { label: "Demande" };
  if (entityType === "quote") return { label: "Devis" };
  return undefined;
}

function entityKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function readPayload(payload: Json): Record<string, Json | undefined> {
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
}

function readString(value: Json | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readAmount(value: Json | undefined): number | string | null {
  return typeof value === "number" || typeof value === "string" ? value : null;
}

function safeQuoteAmount(amount: number | string, currency: string): string {
  try {
    return formatQuoteAmount(amount, currency);
  } catch {
    return formatQuoteAmount(amount, "EUR");
  }
}

function formatBusinessDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : dateTimeFormatter.format(date);
}
