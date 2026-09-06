import Link from "next/link";

import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { AUTOMATION_LEVELS, type AutomationLevel } from "@/lib/automations/contracts";
import { AUTOMATION_LEVEL_LABELS } from "@/lib/automations/view-model";
import {
  getOrganizationMembers,
  getOrganizationSettings,
  getOpportunitiesFeed,
  getQuoteList,
  getSpeedToLeadSummary,
} from "@/lib/data";
import {
  getFieldReportsWorkspace,
  getInterventionsWorkspace,
  getInvoicesWorkspace,
  getMaintenanceWorkspace,
} from "@/lib/data/c32-workspaces";
import { getRegulatoryWorkspace } from "@/lib/data/c40-ui";
import { getFieldConflicts } from "@/lib/data/field-conflicts";
import { getManagerToday, getTechnicianToday, type TodayAction } from "@/lib/data/today-c40";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TECH_ROLES = new Set(["TECH", "TECHNICIAN"]);
const ACTIVE_QUOTE_STATUSES = new Set(["SENT", "FOLLOWING_UP", "REPLIED", "NEEDS_HUMAN"]);
const DAY_MS = 86_400_000;

export default async function DashboardPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const organizationId = viewer.organization.id;
  const isTechnician = TECH_ROLES.has(viewer.role);

  if (isTechnician) {
    const today = await getTechnicianToday(organizationId, viewer.userId, currentDate());
    return <TodayInbox organizationName={viewer.organization.name} workspace={today} technician />;
  }

  const supabase = await createClient();
  const [customersResult, quotesResult, integrationsResult, automationResult, speedToLead] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("integrations").select("id,type,status").eq("organization_id", organizationId),
    supabase.from("automation_configs").select("id").eq("organization_id", organizationId).eq("enabled", true).limit(1),
    getSpeedToLeadSummary(organizationId),
  ]);

  const customerCount = customersResult.error ? null : (customersResult.count ?? 0);
  const quoteCount = quotesResult.error ? null : (quotesResult.count ?? 0);
  const hasBusinessData = (customerCount ?? 0) > 0 || (quoteCount ?? 0) > 0;
  const connectedEmail = (integrationsResult.data ?? []).some((item) => item.type === "EMAIL" && item.status === "CONNECTED");
  const setupStateIsReliable = !customersResult.error && !quotesResult.error && !integrationsResult.error;
  const setupIncomplete = setupStateIsReliable && (!hasBusinessData || !connectedEmail);

  const [
    today,
    quotes,
    opportunities,
    interventions,
    reports,
    invoices,
    maintenance,
    regulatory,
    conflicts,
    members,
    settings,
    automationLevelsResult,
  ] = await Promise.all([
    getManagerToday(organizationId, { includePlatform: ["OWNER", "ADMIN"].includes(viewer.role) }),
    getQuoteList(organizationId, { limit: 500 }),
    getOpportunitiesFeed(organizationId, { limit: 500, includeTerminal: true }),
    getInterventionsWorkspace(organizationId),
    getFieldReportsWorkspace(organizationId),
    getInvoicesWorkspace(organizationId),
    getMaintenanceWorkspace(organizationId),
    getRegulatoryWorkspace(organizationId),
    getFieldConflicts(organizationId),
    getOrganizationMembers(organizationId),
    getOrganizationSettings(organizationId),
    supabase
      .from("automation_configs")
      .select("level,updated_at")
      .eq("organization_id", organizationId)
      .eq("enabled", true)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  const timezone = settings?.timezone ?? "Europe/Paris";
  const automationLevels = automationLevelsResult.error
    ? []
    : (automationLevelsResult.data ?? [])
        .map((row) => row.level)
        .filter((level): level is AutomationLevel => AUTOMATION_LEVELS.includes(level as AutomationLevel));

  const currentMode = automationModeLabel(automationLevels);
  const observation = automationLevels.length === 0 || automationLevels.every((level) => level === "OBSERVATION" || level === "SHADOW");
  const degraded = today.actions.filter((item) => item.category === "SESIRA");
  const decisions = today.actions.filter((item) => item.category !== "SESIRA");
  const visibleDecisions = decisions.slice(0, 7);
  const hiddenDecisionCount = Math.max(0, decisions.length - visibleDecisions.length);

  const commercialQuotes = quotes.filter((quote) => ACTIVE_QUOTE_STATUSES.has(quote.status) && quote.amount !== null);
  const opportunityById = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity] as const));
  const soldNotScheduledValues = today.actions
    .filter((item) => item.category === "CHANTIER")
    .map((item) => opportunityIdFromHref(item.href))
    .filter((id): id is string => Boolean(id))
    .flatMap((id) => {
      const opportunity = opportunityById.get(id);
      return opportunity?.estimatedValue === null || !opportunity ? [] : [{ amount: opportunity.estimatedValue, currency: opportunity.currency }];
    });
  const overdueInvoices = invoices.status === "OK" ? invoices.rows.filter((invoice) => invoice.status === "OVERDUE") : [];
  const nowMs = currentTimestamp();
  const renewalHorizon = nowMs + 60 * DAY_MS;
  const renewals = maintenance.status === "OK"
    ? maintenance.rows.filter((contract) => {
        if (!contract.endDate || contract.amount === null || ["CANCELLED", "EXPIRED"].includes(contract.status)) return false;
        const end = new Date(contract.endDate).getTime();
        return !Number.isNaN(end) && end >= nowMs && end <= renewalHorizon;
      })
    : [];

  const moneyCards: MoneyCard[] = [
    {
      label: "Devis en attente",
      count: commercialQuotes.length,
      totals: sumByCurrency(commercialQuotes.map((quote) => ({ amount: quote.amount ?? 0, currency: quote.currency }))),
      href: "/app/devis",
      note: "Devis envoyés, relancés ou en attente d’une décision.",
    },
    {
      label: "Vendu non planifié",
      count: soldNotScheduledValues.length,
      totals: sumByCurrency(soldNotScheduledValues),
      href: "/app/interventions",
      note: "Affaires gagnées qui remontent faute de prochain pas opérationnel.",
    },
    {
      label: "Factures échues",
      count: overdueInvoices.length,
      totals: sumByCurrency(overdueInvoices.map((invoice) => ({ amount: invoice.amount, currency: invoice.currency }))),
      href: "/app/factures",
      note: "Montants issus des factures actuellement enregistrées en retard.",
      attention: overdueInvoices.length > 0,
    },
    {
      label: "Contrats < 60 jours",
      count: renewals.length,
      totals: sumByCurrency(renewals.flatMap((contract) => contract.amount === null ? [] : [{ amount: contract.amount, currency: contract.currency }])),
      href: "/app/maintenance",
      note: "Contrats dont la date de fin connue tombe dans les 60 prochains jours.",
    },
  ];

  const localToday = localIsoDate(timezone);
  const fieldRows = interventions.status === "OK"
    ? interventions.rows.filter((row) => row.scheduledAt && localIsoDateFromTimestamp(row.scheduledAt, timezone) === localToday).slice(0, 4)
    : [];
  const memberByUser = new Map(members.map((member) => [member.userId, member.fullName ?? member.email ?? "Technicien"] as const));
  const reportsToValidate = reports.status === "OK" ? reports.rows.filter((report) => report.status === "REVIEWED").length : null;
  const conflictCount = conflicts.status === "OK" ? conflicts.data.length : null;

  const reg = regulatory.status === "OK" ? regulatory.data : null;
  const dueLeakChecks = reg
    ? reg.equipment.filter((equipment) => equipment.nextLeakCheck?.status === "DUE").sort((a, b) => dueAt(a) - dueAt(b))
    : [];
  const nextLeakCheck = dueLeakChecks[0] ?? null;
  const activeAttestations = reg?.attestations.filter((attestation) => attestation.status === "ACTIVE") ?? [];
  const nearestAttestation = [...activeAttestations].sort((a, b) => Date.parse(a.validUntil) - Date.parse(b.validUntil))[0] ?? null;
  const regulatoryGaps = reg?.exports.reduce((total, item) => total + item.gapCount, 0) ?? null;

  return (
    <div className="command-dashboard">
      <section className="command-status-bar" aria-label="État du poste de commande">
        <div><span className="command-status-dot" aria-hidden="true" /><span className="command-kicker">Supervision</span><strong>{currentMode}</strong></div>
        <div><span className="command-kicker">Lecture serveur</span><strong>{formatTimeInZone(new Date(), timezone)}</strong></div>
        <div><span className="command-kicker">Décisions</span><strong>{decisions.length}</strong></div>
        {degraded.length ? (
          <Link className="command-service-warning" href="/app/etat-sesira">{degraded.length} service{degraded.length > 1 ? "s" : ""} à vérifier</Link>
        ) : <span className="command-service-quiet">Aucune alerte système remontée</span>}
      </section>

      <header className="command-hero">
        <div>
          <span className="eyebrow">SUPERVISION OPÉRATIONNELLE · {viewer.organization.name}</span>
          <h1>{decisions.length ? `${decisions.length} décision${decisions.length > 1 ? "s" : ""} requièrent votre validation aujourd’hui` : "Aucune décision immédiate ne requiert votre validation"}</h1>
          <p>{observation
            ? "SESIRA observe les données disponibles et prépare les prochains gestes. Aucune action externe n’est déduite d’un simple signal."
            : "SESIRA rassemble ici les décisions commerciales, terrain, financières et réglementaires qui demandent un geste explicite."}</p>
        </div>
        <div className="command-hero-meta">
          <span>{formatLongDate(new Date(), timezone)}</span>
          <Link href="/app/automatisations">Autonomie</Link>
        </div>
      </header>

      {setupIncomplete ? (
        <section className="command-setup-strip" aria-label="Configuration à terminer">
          <div><span className="eyebrow">CONFIGURATION À TERMINER</span><strong>Le poste de commande reste visible pendant la mise en route.</strong></div>
          <div className="command-setup-actions">
            {!hasBusinessData ? <Link href="/app/imports">Ajouter les données</Link> : null}
            {!connectedEmail ? <Link href="/app/integrations">Connecter la messagerie</Link> : null}
            {!speedToLead?.configured ? <Link href="/app/parametres/politiques">Régler la prise en charge</Link> : null}
            {!automationResult.data?.length ? <Link href="/app/automatisations">Choisir l’autonomie</Link> : null}
          </div>
        </section>
      ) : null}

      {today.unavailable.length ? (
        <section className="command-partial-note">
          <StatusPill tone="warning">Lecture partielle</StatusPill>
          <p>{today.unavailable.join(" · ")} : ces sources ne sont pas remplacées par zéro.</p>
        </section>
      ) : null}

      <section className="command-section command-decisions" aria-labelledby="decision-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">BANDEAU 01</span><h2 id="decision-heading">File de Décisions Immédiates</h2></div>
          <span className="command-section-count">{decisions.length} EN ATTENTE · TRI VALEUR × URGENCE</span>
        </div>

        {visibleDecisions.length ? (
          <div className="command-decision-list">
            {visibleDecisions.map((item) => <DecisionRow item={item} key={item.id} timezone={timezone} />)}
          </div>
        ) : (
          <div className="command-clear-state"><span aria-hidden="true">✓</span><div><strong>File de décisions entièrement traitée.</strong><p>Aucune donnée enregistrée ne demande une validation immédiate.</p></div></div>
        )}

        {hiddenDecisionCount ? <Link className="command-more-link" href="/app/suivi">Voir {hiddenDecisionCount} autres sujets</Link> : null}
      </section>

      <section className="command-section" aria-labelledby="money-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">BANDEAU 02</span><h2 id="money-heading">Cockpit Financier & Cash-Flow</h2></div>
          <span className="command-heading-note">Données réelles · devises séparées</span>
        </div>
        <div className="command-money-grid">{moneyCards.map((card) => <MoneyMetric card={card} key={card.label} />)}</div>
      </section>

      <section className="command-section" aria-labelledby="field-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">BANDEAU 03</span><h2 id="field-heading">Aujourd’hui sur le Terrain</h2></div>
          <div className="command-inline-metrics">
            <span>{fieldRows.length} intervention{fieldRows.length > 1 ? "s" : ""}</span>
            <span>{reportsToValidate === null ? "—" : reportsToValidate} rapport{reportsToValidate === 1 ? "" : "s"} à valider</span>
            <span>{conflictCount === null ? "—" : conflictCount} conflit{conflictCount === 1 ? "" : "s"} offline</span>
          </div>
        </div>

        {fieldRows.length ? (
          <div className="command-field-grid">
            {fieldRows.map((row) => (
              <Link className="command-field-card" href="/app/interventions" key={row.id}>
                <div className="command-field-card-top">
                  <span className="command-tech-avatar">{initials(memberByUser.get(row.assignedUserId ?? "") ?? "—")}</span>
                  <div><strong>{memberByUser.get(row.assignedUserId ?? "") ?? "Non assigné"}</strong><span>{row.scheduledAt ? formatTimeInZone(new Date(row.scheduledAt), timezone) : "Sans horaire"}</span></div>
                  <StatusPill tone={row.status === "IN_PROGRESS" ? "warning" : row.status === "COMPLETED" ? "good" : "neutral"}>{interventionLabel(row.status)}</StatusPill>
                </div>
                <h3>{row.title}</h3>
                <p>{[row.addressPostalCode, row.addressCity].filter(Boolean).join(" ") || row.addressLine1 || "Adresse non renseignée"}</p>
                <div className="command-field-card-foot"><span>{row.durationMinutes ? `${row.durationMinutes} min prévues` : "Durée non renseignée"}</span><span>Dossier</span></div>
              </Link>
            ))}
          </div>
        ) : <div className="command-inline-empty">Aucune intervention planifiée aujourd’hui dans les données lisibles.</div>}
      </section>

      <section className="command-section command-regulatory" aria-labelledby="reg-heading">
        <div className="command-section-heading">
          <div><span className="eyebrow">BANDEAU 04</span><h2 id="reg-heading">Registre d’Équipements & Traçabilité CERFA 15497*04</h2></div>
          <Link className="command-text-link" href="/app/obligations/documents">Registre</Link>
        </div>

        {reg ? (
          <div className="command-regulatory-grid">
            <article>
              <span className="eyebrow">CONTRÔLES D’ÉTANCHÉITÉ</span>
              <strong>{dueLeakChecks.length}</strong>
              <p>{nextLeakCheck?.nextLeakCheck?.status === "DUE" ? `Prochaine échéance enregistrée ${relativeDue(nextLeakCheck.nextLeakCheck.nextDueAt)} · ${nextLeakCheck.label}.` : "Aucune prochaine échéance calculable dans le registre."}</p>
              <Link href="/app/obligations/equipements">Équipements</Link>
            </article>
            <article>
              <span className="eyebrow">ATTESTATIONS SUIVIES</span>
              <strong>{activeAttestations.length}</strong>
              <p>{nearestAttestation ? `Échéance enregistrée la plus proche : ${formatDate(nearestAttestation.validUntil)} · ${nearestAttestation.referenceNumber}.` : "Aucune attestation active lisible."}</p>
              <Link href="/app/obligations/documents">Attestations</Link>
            </article>
            <article>
              <span className="eyebrow">DOCUMENTS À COMPLÉTER</span>
              <strong>{regulatoryGaps ?? 0}</strong>
              <p>{regulatoryGaps ? "Informations manquantes détectées dans les exports réglementaires préparés." : "Aucune information manquante enregistrée dans les exports préparés."}</p>
              <Link href="/app/obligations/documents">Préparation documentaire</Link>
            </article>
          </div>
        ) : <div className="command-inline-empty">Le registre réglementaire n’est pas lisible actuellement.</div>}
        <p className="command-regulatory-boundary">SESIRA prépare, calcule et signale. Cette vue ne qualifie pas votre situation réglementaire et n’effectue aucun dépôt à votre place.</p>
      </section>

      {degraded.length ? (
        <section className="command-section command-system-section" aria-labelledby="system-heading">
          <div className="command-section-heading">
            <div><span className="eyebrow">ÉTAT SESIRA</span><h2 id="system-heading">Un composant demande votre regard</h2></div>
            <Link className="command-text-link" href="/app/etat-sesira">Diagnostic</Link>
          </div>
          <div className="command-decision-list">{degraded.slice(0, 3).map((item) => <DecisionRow item={item} key={item.id} timezone={timezone} />)}</div>
        </section>
      ) : null}
    </div>
  );
}

type MoneyCard = {
  label: string;
  count: number;
  totals: Array<{ currency: string; amount: number }>;
  href: string;
  note: string;
  attention?: boolean;
};

function DecisionRow({ item, timezone }: { item: TodayAction; timezone: string }) {
  return (
    <article className={`command-decision-row command-kind-${item.category.toLowerCase()}`}>
      <span className="command-decision-marker" aria-label={categoryLabel(item.category)}>{categoryInitial(item.category)}</span>
      <div className="command-decision-copy">
        <div><span className="command-decision-type">{categoryLabel(item.category)}</span><span>{relativeObserved(item.observedAt, timezone)}</span></div>
        <h3>{item.title}</h3>
        <p>{item.detail}</p>
      </div>
      <Link className={item.priority === 1 ? "command-action primary" : "command-action"} href={item.href}>{item.action}</Link>
    </article>
  );
}

function MoneyMetric({ card }: { card: MoneyCard }) {
  return (
    <Link className={card.attention ? "command-money-card attention" : "command-money-card"} href={card.href}>
      <div className="command-money-card-head"><span>{card.label}</span><span>{card.count} dossier{card.count > 1 ? "s" : ""}</span></div>
      <strong>{formatCurrencyTotals(card.totals)}</strong>
      <p>{card.note}</p>
      <span className="command-card-link">Consulter</span>
    </Link>
  );
}

function TodayInbox({ organizationName, workspace, technician = false }: {
  organizationName: string;
  workspace: { actions: TodayAction[]; unavailable: string[] };
  technician?: boolean;
}) {
  const urgent = workspace.actions.filter((item) => item.priority === 1).length;
  const humanDecisions = workspace.actions.filter((item) => ["Valider", "Décider", "Arbitrer"].includes(item.action)).length;
  const categories = new Set(workspace.actions.map((item) => item.category)).size;

  return (
    <>
      <PageHeader
        eyebrow="AUJOURD’HUI"
        title={technician ? "Ma journée" : "Ce qui attend quelqu’un"}
        description={technician ? `Vos interventions et les données terrain à vérifier aujourd’hui chez ${organizationName}.` : `SESIRA rassemble ici ce qui est resté en plan chez ${organizationName}.`}
        actions={technician ? <Link className="button primary small" href="/app/terrain">Ouvrir le terrain</Link> : undefined}
      />
      <section className="workspace-stat-strip" aria-label="Résumé de la journée">
        <div><strong>{workspace.actions.length}</strong><span>À traiter</span></div>
        <div><strong>{urgent}</strong><span>À regarder d’abord</span></div>
        <div><strong>{humanDecisions}</strong><span>Décisions humaines</span></div>
        <div><strong>{categories}</strong><span>Types de sujets</span></div>
      </section>
      {workspace.unavailable.length ? <section className="workspace-boundary-note"><StatusPill tone="warning">Lecture partielle</StatusPill><p>{workspace.unavailable.join(" · ")} : ces données ne sont pas lisibles actuellement.</p></section> : null}
      {workspace.actions.length ? <section className="workspace-list" aria-label="Travail à traiter aujourd’hui">{workspace.actions.map((item) => <article className="workspace-row" key={item.id}><div className="workspace-row-main"><div className="workspace-row-heading"><div><span className="eyebrow">{categoryLabel(item.category)}</span><h2>{item.title}</h2></div><StatusPill tone={item.priority === 1 ? "warning" : "neutral"}>{item.priority === 1 ? "À regarder" : "À traiter"}</StatusPill></div><p className="workspace-description">{item.detail}</p></div><div className="workspace-row-actions"><Link className={item.priority === 1 ? "button primary small" : "button ghost small"} href={item.href}>{item.action}</Link></div></article>)}</section> : <EmptyState title="Rien d’assigné aujourd’hui" description="Aucune intervention ni donnée terrain à vérifier n’est remontée pour cette journée." />}
    </>
  );
}

function categoryLabel(category: TodayAction["category"]) {
  const labels: Record<TodayAction["category"], string> = { COMMERCIAL: "DEVIS & CLIENTS", CHANTIER: "CHANTIER", RAPPORT: "RAPPORT TERRAIN", FACTURE: "FACTURE", ENTRETIEN: "ENTRETIEN", OBLIGATION: "OBLIGATION CVC", TERRAIN: "TERRAIN", SESIRA: "ÉTAT SESIRA" };
  return labels[category];
}
function categoryInitial(category: TodayAction["category"]) { return ({ COMMERCIAL: "D", CHANTIER: "C", RAPPORT: "R", FACTURE: "F", ENTRETIEN: "M", OBLIGATION: "O", TERRAIN: "T", SESIRA: "S" } as const)[category]; }
function interventionLabel(status: string) { return ({ PLANNED: "À venir", CONFIRMED: "Confirmée", IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée", NEEDS_ATTENTION: "À reprendre" } as Record<string, string>)[status] ?? status; }
function automationModeLabel(levels: AutomationLevel[]) { const unique = [...new Set(levels)]; if (!unique.length) return "Observation"; if (unique.length === 1) return AUTOMATION_LEVEL_LABELS[unique[0]]; return "Modes mixtes"; }
function opportunityIdFromHref(href: string) { const match = href.match(/^\/app\/opportunites\/([^/?#]+)/); return match?.[1] ?? null; }
function sumByCurrency(items: Array<{ amount: number; currency: string }>) { const totals = new Map<string, number>(); for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount); return [...totals.entries()].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => a.currency.localeCompare(b.currency)); }
function formatCurrencyTotals(totals: Array<{ currency: string; amount: number }>) { if (!totals.length) return "—"; return totals.map(({ currency, amount }) => new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)).join(" · "); }
function localIsoDate(timeZone: string) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const map = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${map.year}-${map.month}-${map.day}`; }
function localIsoDateFromTimestamp(value: string, timeZone: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const map = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${map.year}-${map.month}-${map.day}`; }
function formatTimeInZone(value: Date, timeZone: string) { return new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(value); }
function formatLongDate(value: Date, timeZone: string) { return new Intl.DateTimeFormat("fr-FR", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(value); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date); }
function relativeObserved(value: string | null | undefined, timeZone: string) { if (!value) return "heure non renseignée"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "heure non renseignée"; const delta = currentTimestamp() - date.getTime(); if (delta >= 0 && delta < 60 * 60_000) return `il y a ${Math.max(1, Math.round(delta / 60_000))} min`; if (delta >= 0 && delta < DAY_MS) return `il y a ${Math.round(delta / 3_600_000)} h`; if (delta >= 0) return `il y a ${Math.round(delta / DAY_MS)} j`; return new Intl.DateTimeFormat("fr-FR", { timeZone, dateStyle: "medium" }).format(date); }
function relativeDue(value: string) { const time = new Date(value).getTime(); if (Number.isNaN(time)) return "à une date inconnue"; const days = Math.ceil((time - currentTimestamp()) / DAY_MS); if (days < 0) return `dépassée de ${Math.abs(days)} j`; if (days === 0) return "aujourd’hui"; return `dans ${days} j`; }
function dueAt(row: { nextLeakCheck: { status: "DUE"; nextDueAt: string } | { status: "OUT_OF_SCOPE" } | { status: "UNAVAILABLE" } | null }) { return row.nextLeakCheck?.status === "DUE" ? Date.parse(row.nextLeakCheck.nextDueAt) : Number.POSITIVE_INFINITY; }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "—"; }
function currentTimestamp() { return Date.now(); }
function currentDate() { return new Date().toISOString().slice(0, 10); }
