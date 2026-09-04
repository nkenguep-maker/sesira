import "server-only";

import { getPendingApprovals, getAttentionInbox } from "@/lib/data";
import { getFieldReportsWorkspace, getMaintenanceWorkspace } from "@/lib/data/c32-workspaces";
import { getInvoiceCollectionWorkspace } from "@/lib/data/invoice-collection";
import {
  getEInvoicingWorkspace,
  getPlatformWorkspace,
  getRegulatoryWorkspace,
  getTechnicianWorkspace,
} from "@/lib/data/c40-ui";

export type TodayAction = {
  id: string;
  category: "COMMERCIAL" | "CHANTIER" | "RAPPORT" | "FACTURE" | "ENTRETIEN" | "OBLIGATION" | "TERRAIN" | "SESIRA";
  title: string;
  detail: string;
  action: string;
  href: string;
  priority: 1 | 2 | 3;
  observedAt?: string | null;
};

export type TodayWorkspace = {
  actions: TodayAction[];
  unavailable: string[];
};

export async function getTechnicianToday(
  organizationId: string,
  userId: string,
  date: string,
): Promise<TodayWorkspace> {
  const result = await getTechnicianWorkspace(organizationId, userId, date);
  if (result.status === "ERROR") return { actions: [], unavailable: ["Journée terrain"] };

  const actions: TodayAction[] = [];
  for (const conflict of result.data.conflicts) {
    actions.push({
      id: `field-conflict:${conflict.artifactId}`,
      category: "TERRAIN",
      title: "Une donnée terrain demande votre vérification",
      detail: conflict.conflictReason ?? "Cette donnée a été reçue après un changement d’état de l’intervention.",
      action: "Vérifier",
      href: "/app/terrain#conflits",
      priority: 1,
      observedAt: conflict.uploadedAt,
    });
  }

  for (const intervention of result.data.interventions) {
    const started = intervention.status === "IN_PROGRESS" || Boolean(intervention.startedAt);
    actions.push({
      id: `intervention:${intervention.interventionId}`,
      category: "CHANTIER",
      title: intervention.title,
      detail: [
        intervention.scheduledAt ? formatMoment(intervention.scheduledAt) : "Horaire non renseigné",
        intervention.customerName,
        intervention.address || null,
      ].filter(Boolean).join(" · "),
      action: started ? "Continuer" : intervention.arrivedAt ? "Commencer" : "Ouvrir",
      href: "/app/terrain",
      priority: started ? 1 : 2,
      observedAt: intervention.scheduledAt,
    });
  }

  return { actions: sortActions(actions), unavailable: [] };
}

export async function getManagerToday(
  organizationId: string,
  options: { includePlatform?: boolean } = {},
): Promise<TodayWorkspace> {
  const [approvals, attention, reports, invoices, maintenance, regulatory, einvoicing, technician, platform] = await Promise.all([
    getPendingApprovals(organizationId, { limit: 50 }),
    getAttentionInbox(organizationId, { limit: 100 }),
    getFieldReportsWorkspace(organizationId),
    getInvoiceCollectionWorkspace(organizationId),
    getMaintenanceWorkspace(organizationId),
    getRegulatoryWorkspace(organizationId),
    getEInvoicingWorkspace(organizationId),
    getTechnicianWorkspace(organizationId, "00000000-0000-0000-0000-000000000000", todayIsoDate()).catch(() => ({ status: "ERROR" as const, reason: "not_applicable" })),
    options.includePlatform ? getPlatformWorkspace(organizationId) : Promise.resolve({ status: "OK" as const, data: [] }),
  ]);

  const actions: TodayAction[] = [];
  const unavailable: string[] = [];

  for (const approval of approvals) {
    actions.push({
      id: `approval:${approval.runId}`,
      category: "COMMERCIAL",
      title: approval.subject,
      detail: `Relance préparée pour ${approval.recipientEmail}. Rien ne part sans votre décision.`,
      action: "Valider",
      href: "/app/suivi",
      priority: 1,
      observedAt: approval.scheduledFor ?? approval.createdAt,
    });
  }

  for (const item of attention) {
    actions.push({
      id: `attention:${item.id}`,
      category: item.reason === "SOLD_NOT_SCHEDULED" ? "CHANTIER" : "COMMERCIAL",
      title: item.title,
      detail: item.explanation ?? item.suggestedAction ?? "Cette situation demande votre regard.",
      action: item.entityType === "opportunity" ? "Ouvrir" : "Voir",
      href: item.entityType === "opportunity" && item.entityId ? `/app/opportunites/${item.entityId}` : "/app/suivi",
      priority: item.priority === "URGENT" || item.priority === "HIGH" ? 1 : 2,
      observedAt: item.createdAt,
    });
  }

  if (reports.status === "ERROR") unavailable.push("Rapports terrain");
  else {
    for (const report of reports.rows) {
      if (report.status === "REVIEWED") {
        actions.push({
          id: `report:${report.id}:approve`,
          category: "RAPPORT",
          title: "Un rapport terrain attend votre validation",
          detail: report.summary ?? "Le technicien a terminé son compte rendu.",
          action: "Valider",
          href: "/app/rapports",
          priority: 1,
          observedAt: report.updatedAt,
        });
      } else if (report.status === "DRAFT" && report.reportGaps.length > 0) {
        actions.push({
          id: `report:${report.id}:gaps`,
          category: "RAPPORT",
          title: "Un rapport terrain est incomplet",
          detail: `${report.reportGaps.length} information${report.reportGaps.length > 1 ? "s" : ""} à compléter avant validation.`,
          action: "Compléter",
          href: "/app/rapports",
          priority: 2,
          observedAt: report.updatedAt,
        });
      }
    }
  }

  if (invoices.status === "ERROR") unavailable.push("Factures");
  else {
    for (const invoice of invoices.rows) {
      if (invoice.collectionState === "DISPUTED") {
        actions.push({
          id: `invoice:${invoice.id}:dispute`,
          category: "FACTURE",
          title: `${invoice.externalRef ?? "Une facture"} est en litige`,
          detail: invoice.disputeReason ?? "Le litige est ouvert et la suite reste une décision humaine.",
          action: "Décider",
          href: "/app/factures",
          priority: 1,
          observedAt: invoice.disputeOpenedAt,
        });
      } else if (invoice.paymentPromiseLate) {
        actions.push({
          id: `invoice:${invoice.id}:promise`,
          category: "FACTURE",
          title: `${invoice.externalRef ?? "Une facture"} n’a pas été réglée à la date annoncée`,
          detail: `${formatMoney(invoice.amount, invoice.currency)} · promesse dépassée${invoice.paymentPromiseDueAt ? ` depuis le ${formatDate(invoice.paymentPromiseDueAt)}` : ""}.`,
          action: "Réclamer",
          href: "/app/factures",
          priority: 1,
          observedAt: invoice.paymentPromiseDueAt,
        });
      } else if (invoice.status === "OVERDUE" && (invoice.pastDueDays ?? 0) > 0) {
        actions.push({
          id: `invoice:${invoice.id}:overdue`,
          category: "FACTURE",
          title: `${invoice.externalRef ?? "Une facture"} est échue`,
          detail: `${formatMoney(invoice.amount, invoice.currency)} · ${(invoice.pastDueDays ?? 0)} jour${(invoice.pastDueDays ?? 0) > 1 ? "s" : ""} de retard observé.`,
          action: "Voir",
          href: "/app/factures",
          priority: 2,
          observedAt: invoice.dueAt,
        });
      }
    }
  }

  if (maintenance.status === "ERROR") unavailable.push("Entretien");
  else {
    const now = Date.now();
    const horizon = now + 30 * 86_400_000;
    for (const contract of maintenance.rows) {
      const next = firstValidTime(contract.nextVisitDueAt, contract.endDate);
      if (contract.status === "ACTIVE" && next !== null && next <= horizon) {
        actions.push({
          id: `maintenance:${contract.id}`,
          category: "ENTRETIEN",
          title: contract.title,
          detail: `${contract.nextVisitDueAt ? "Prochaine visite" : "Échéance du contrat"} : ${formatDate(contract.nextVisitDueAt ?? contract.endDate!)}. Vue de travail : 30 prochains jours.`,
          action: contract.endDate && new Date(contract.endDate).getTime() <= horizon ? "Préparer" : "Planifier",
          href: "/app/maintenance",
          priority: next < now ? 1 : 2,
          observedAt: contract.nextVisitDueAt ?? contract.endDate,
        });
      }
    }
  }

  if (regulatory.status === "ERROR") unavailable.push("Obligations CVC");
  else {
    for (const item of regulatory.data.attentions.filter((row) => !row.resolvedAt)) {
      actions.push({
        id: `regulatory:${item.id}`,
        category: "OBLIGATION",
        title: item.title,
        detail: item.explanation ?? item.suggestedAction ?? "Une information ou une échéance demande votre vérification.",
        action: "Vérifier",
        href: item.entityType === "equipment" ? "/app/obligations/equipements" : "/app/obligations/documents",
        priority: item.priority === "URGENT" || item.priority === "HIGH" ? 1 : 2,
        observedAt: item.createdAt,
      });
    }
  }

  if (einvoicing.status === "ERROR") unavailable.push("Facturation électronique");
  else {
    for (const submission of einvoicing.data.submissions) {
      if (submission.status === "REJECTED") {
        actions.push({
          id: `einvoice:${submission.id}:rejected`,
          category: "FACTURE",
          title: "Une facture électronique a été rejetée",
          detail: submission.rejectionReason ?? "Le service connecté a retourné un rejet. La cause doit être vérifiée.",
          action: "Vérifier",
          href: "/app/factures",
          priority: 1,
          observedAt: submission.rejectedAt,
        });
      } else if (submission.gapCount > 0) {
        actions.push({
          id: `einvoice:${submission.id}:gaps`,
          category: "FACTURE",
          title: "Une facture électronique n’est pas prête",
          detail: `${submission.gapCount} information${submission.gapCount > 1 ? "s" : ""} manque${submission.gapCount > 1 ? "nt" : ""} avant export.`,
          action: "Compléter",
          href: "/app/factures",
          priority: 2,
        });
      }
    }
  }

  // pending_field_artifact_conflicts is organization-wide; a deliberately invalid
  // user id lets the read-model still return the conflict inbox if the RPC allows it.
  if (technician.status === "OK") {
    for (const conflict of technician.data.conflicts) {
      actions.push({
        id: `field-conflict:${conflict.artifactId}`,
        category: "TERRAIN",
        title: "Une donnée terrain demande un arbitrage",
        detail: conflict.conflictReason ?? "La donnée a été conservée mais son rattachement doit être vérifié.",
        action: "Arbitrer",
        href: "/app/terrain#conflits",
        priority: 1,
        observedAt: conflict.uploadedAt,
      });
    }
  }

  if (platform.status === "ERROR") unavailable.push("État SESIRA");
  else {
    for (const component of platform.data) {
      if (!["DEGRADED", "DISABLED"].includes(component.status)) continue;
      actions.push({
        id: `platform:${component.id}`,
        category: "SESIRA",
        title: `${component.label} : ${component.status === "DISABLED" ? "désactivé" : "à vérifier"}`,
        detail: component.statusReason ?? component.lastErrorMessage ?? "Le service n’est pas dans son état habituel.",
        action: "Voir l’état",
        href: "/app/etat-sesira",
        priority: component.status === "DISABLED" ? 1 : 2,
        observedAt: component.lastErrorAt ?? component.lastSuccessAt,
      });
    }
  }

  return { actions: sortActions(dedupe(actions)).slice(0, 40), unavailable };
}

function dedupe(items: TodayAction[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.category}:${item.title}:${item.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortActions(items: TodayAction[]) {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aTime = a.observedAt ? new Date(a.observedAt).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.observedAt ? new Date(b.observedAt).getTime() : Number.POSITIVE_INFINITY;
    return (Number.isNaN(aTime) ? Number.POSITIVE_INFINITY : aTime) - (Number.isNaN(bTime) ? Number.POSITIVE_INFINITY : bTime);
  });
}

function firstValidTime(...values: Array<string | null>) {
  const times = values.map((value) => value ? new Date(value).getTime() : Number.NaN).filter((value) => !Number.isNaN(value));
  return times.length ? Math.min(...times) : null;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}
function formatMoment(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Horaire inconnu" : new Intl.DateTimeFormat("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
