import Link from "next/link";

import { EmptyState, StatusPill } from "@/components/sesira/ui";
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
    return <TechnicianToday organizationName={viewer.organization.name} workspace={today} />;
  }

  const supabase = await createClient();
  const [customersResult, quotesCountResult, integrationsResult, automationResult, speedToLead] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("integrations").select("id,type,status").eq("organization_id", organizationId),
    supabase.from("automation_configs").select("id").eq("organization_id", organizationId).eq("enabled", true).limit(1),
    getSpeedToLeadSummary(organizationId),
  ]);

  const customerCount = customersResult.error ? null : (customersResult.count ?? 0);
  const quoteCount = quotesCountResult.error ? null : (quotesCountResult.count ?? 0);
  const hasBusinessData = (customerCount ?? 0) > 0 || (quoteCount ?? 0) > 0;
  const connectedEmail = (integrationsResult.data ?? []).some((item) => item.type === "EMAIL" && item.status === "CONNECTED");
  const setupStateIsReliable = !customersResult.error && !quotesCountResult.error && !integrationsResult.error;
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
  const now = new Date();
  const nowMs = now.getTime();
  const automationLevels = automationLevelsResult.error
    ? []
    : (automationLevelsResult.data ?? [])
        .map((row) => row.level)
        .filter((level): level is AutomationLevel => AUTOMATION_LEVELS.includes(level as AutomationLevel));
  const currentMode = automationModeLabel(automationLevels);

  const degraded = today.actions.filter((item) => item.category === "SESIRA");
  const decisions = today.actions.filter((item) => item.category !== "SESIRA");
  const visibleDecisions = decisions.slice(0, 5);

  const commercialQuotes = quotes.filter((quote) => ACTIVE_QUOTE_STATUSES.has(quote.status) && quote.amount !== null);
  const quoteTotals = sumByCurrency(commercialQuotes.map((quote) => ({ amount: quote.amount ?? 0, currency: quote.currency })));

  const opportunityById = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity] as const));
  const soldNotScheduledValues = today.actions
    .filter((item) => item.category === "CHANTIER")
    .map((item) => opportunityIdFromHref(item.href))
    .filter((id): id is string => Boolean(id))
    .flatMap((id) => {
      const opportunity = opportunityById.get(id);
      return opportunity?.estimatedValue === null || !opportunity
        ? []
        : [{ amount: opportunity.estimatedValue, currency: opportunity.currency }];
    });
  const soldNotScheduledTotals = sumByCurrency(soldNotScheduledValues);

  const overdueInvoices = invoices.status === "OK" ? invoices.rows.filter((invoice) => invoice.status === "OVERDUE") : [];
  const overdueTotals = sumByCurrency(overdueInvoices.map((invoice) => ({ amount: invoice.amount, currency: invoice.currency })));

  const renewalHorizon = nowMs + 60 * DAY_MS;
  const renewals = maintenance.status === "OK"
    ? maintenance.rows.filter((contract) => {
        if (!contract.endDate || contract.amount === null || ["CANCELLED", "EXPIRED"].includes(contract.status)) return false;
        const end = new Date(contract.endDate).getTime();
        return !Number.isNaN(end) && end >= nowMs && end <= renewalHorizon;
      })
    : [];
  const renewalTotals = sumByCurrency(renewals.flatMap((contract) => contract.amount === null ? [] : [{ amount: contract.amount, currency: contract.currency }]));

  const localToday = localIsoDate(now, timezone);
  const fieldRows = interventions.status === "OK"
    ? interventions.rows
        .filter((row) => row.scheduledAt && localIsoDateFromTimestamp(row.scheduledAt, timezone) === localToday)
        .slice(0, 5)
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
    <div className="sesira-home">
      <header className="sesira-home-header">
        <div>
          <div className="sesira-home-kicker">Aujourd’hui · {formatLongDate(now, timezone)}</div>
          <h1>Voici ce qui compte.</h1>
          <p>{viewer.organization.name} · {currentMode}</p>
        </div>
        <div className="sesira-home-actions">
          <Link className="sesira-btn secondary" href="/app/suivi">Voir tout</Link>
          <Link className="sesira-btn primary" href="/app/interventions">Planning du jour</Link>
        </div>
      </header>

      {setupIncomplete ? (
        <section className="sesira-setup-banner" aria-label="Configuration à terminer">
          <div>
            <strong>Terminer la configuration de {viewer.organization.name}</strong>
            <span>Quelques réglages suffisent pour que SESIRA devienne pleinement utile.</span>
          </div>
          <div className="sesira-setup-links">
            {!hasBusinessData ? <Link href="/app/imports">Ajouter vos données</Link> : null}
            {!connectedEmail ? <Link href="/app/integrations">Connecter la messagerie</Link> : null}
            {speedToLead?.configured !== true ? <Link href="/app/parametres/politiques">Régler le délai</Link> : null}
            {!automationResult.data?.length ? <Link href="/app/automatisations">Choisir l’autonomie</Link> : null}
          </div>
        </section>
      ) : null}

      {today.unavailable.length ? (
        <section className="sesira-read-warning">
          <StatusPill tone="warning">Lecture partielle</StatusPill>
          <span>{today.unavailable.join(" · ")}. Ces données ne sont pas remplacées par zéro.</span>
        </section>
      ) : null}

      <section className="sesira-metric-grid" aria-label="Résumé du jour">
        <MetricCard
          label="À décider"
          value={String(decisions.length)}
          meta={decisions.length ? "sujet(s) attendent un geste" : "rien d’urgent"}
          href="/app/suivi"
          tone="violet"
          icon="!"
        />
        <MetricCard
          label="Devis en attente"
          value={formatCurrencyTotals(quoteTotals)}
          meta={`${commercialQuotes.length} dossier${commercialQuotes.length === 1 ? "" : "s"}`}
          href="/app/devis"
          tone="blue"
          icon="D"
        />
        <MetricCard
          label="Factures échues"
          value={formatCurrencyTotals(overdueTotals)}
          meta={`${overdueInvoices.length} créance${overdueInvoices.length === 1 ? "" : "s"}`}
          href="/app/factures"
          tone={overdueInvoices.length ? "rose" : "green"}
          icon="€"
        />
        <MetricCard
          label="Terrain aujourd’hui"
          value={String(fieldRows.length)}
          meta={`${reportsToValidate ?? "—"} rapport${reportsToValidate === 1 ? "" : "s"} à valider`}
          href="/app/interventions"
          tone="green"
          icon="T"
        />
      </section>

      <div className="sesira-home-primary-grid">
        <section className="sesira-panel sesira-priority-panel" aria-labelledby="priorities-title">
          <div className="sesira-panel-heading">
            <div>
              <span className="sesira-panel-kicker">Priorités</span>
              <h2 id="priorities-title">À faire maintenant</h2>
            </div>
            {decisions.length > 5 ? <Link href="/app/suivi">Voir les {decisions.length}</Link> : null}
          </div>

          {visibleDecisions.length ? (
            <div className="sesira-priority-list">
              {visibleDecisions.map((item) => (
                <article className="sesira-priority-row" key={item.id}>
                  <span className={`sesira-priority-icon tone-${decisionTone(item.category)}`}>{categoryInitial(item.category)}</span>
                  <div className="sesira-priority-copy">
                    <div className="sesira-priority-meta">
                      <span>{categoryLabel(item.category)}</span>
                      <time>{relativeObserved(item.observedAt, timezone, nowMs)}</time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <Link className={item.priority === 1 ? "sesira-row-action primary" : "sesira-row-action"} href={item.href}>{item.action}</Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="sesira-positive-empty">
              <span>✓</span>
              <div><strong>Tout est traité.</strong><p>Aucune décision immédiate ne demande votre attention.</p></div>
            </div>
          )}
        </section>

        <section className="sesira-panel sesira-field-panel" aria-labelledby="field-title">
          <div className="sesira-panel-heading">
            <div>
              <span className="sesira-panel-kicker">Terrain</span>
              <h2 id="field-title">Aujourd’hui</h2>
            </div>
            <Link href="/app/interventions">Planning</Link>
          </div>

          <div className="sesira-field-summary">
            <span><strong>{fieldRows.length}</strong> intervention{fieldRows.length === 1 ? "" : "s"}</span>
            <span><strong>{reportsToValidate ?? "—"}</strong> rapport{reportsToValidate === 1 ? "" : "s"}</span>
            <span className={conflictCount ? "attention" : ""}><strong>{conflictCount ?? "—"}</strong> conflit{conflictCount === 1 ? "" : "s"}</span>
          </div>

          {fieldRows.length ? (
            <div className="sesira-field-list">
              {fieldRows.map((row) => {
                const person = memberByUser.get(row.assignedUserId ?? "") ?? "Non assigné";
                const location = [row.addressPostalCode, row.addressCity].filter(Boolean).join(" ") || row.addressLine1 || "Adresse non renseignée";
                return (
                  <Link className="sesira-field-row" href="/app/interventions" key={row.id}>
                    <time>{row.scheduledAt ? formatTimeInZone(new Date(row.scheduledAt), timezone) : "—"}</time>
                    <div>
                      <strong>{row.title}</strong>
                      <span>{person} · {location}</span>
                    </div>
                    <span className={`sesira-status tone-${fieldStatusTone(row.status)}`}>{interventionLabel(row.status)}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="sesira-compact-empty">Aucune intervention planifiée aujourd’hui.</div>
          )}
        </section>
      </div>

      <div className="sesira-home-secondary-grid">
        <section className="sesira-panel" aria-labelledby="money-watch-title">
          <div className="sesira-panel-heading">
            <div>
              <span className="sesira-panel-kicker">Argent</span>
              <h2 id="money-watch-title">À surveiller</h2>
            </div>
            <Link href="/app/factures">Finances</Link>
          </div>
          <div className="sesira-watch-list">
            <WatchRow label="Vendu non planifié" value={formatCurrencyTotals(soldNotScheduledTotals)} meta={`${soldNotScheduledValues.length} affaire${soldNotScheduledValues.length === 1 ? "" : "s"}`} href="/app/interventions" />
            <WatchRow label="Contrats à renouveler < 60 j" value={formatCurrencyTotals(renewalTotals)} meta={`${renewals.length} contrat${renewals.length === 1 ? "" : "s"}`} href="/app/maintenance" />
            <WatchRow label="Devis en attente" value={formatCurrencyTotals(quoteTotals)} meta={`${commercialQuotes.length} dossier${commercialQuotes.length === 1 ? "" : "s"}`} href="/app/devis" />
          </div>
        </section>

        <section className="sesira-panel" aria-labelledby="reg-watch-title">
          <div className="sesira-panel-heading">
            <div>
              <span className="sesira-panel-kicker">Obligations</span>
              <h2 id="reg-watch-title">À préparer</h2>
            </div>
            <Link href="/app/obligations/documents">Registre</Link>
          </div>
          {reg ? (
            <div className="sesira-watch-list">
              <WatchRow
                label="Contrôles d’étanchéité"
                value={String(dueLeakChecks.length)}
                meta={nextLeakCheck?.nextLeakCheck?.status === "DUE" ? `${relativeDue(nextLeakCheck.nextLeakCheck.nextDueAt, nowMs)} · ${nextLeakCheck.label}` : "Aucune échéance calculable"}
                href="/app/obligations/equipements"
              />
              <WatchRow
                label="Documents à compléter"
                value={String(regulatoryGaps ?? 0)}
                meta={regulatoryGaps ? "informations manquantes" : "rien à reprendre"}
                href="/app/obligations/documents"
              />
              <WatchRow
                label="Attestations suivies"
                value={String(activeAttestations.length)}
                meta={nearestAttestation ? `prochaine échéance ${formatDate(nearestAttestation.validUntil)}` : "aucune échéance active lisible"}
                href="/app/obligations/documents"
              />
            </div>
          ) : <div className="sesira-compact-empty">Le registre n’est pas lisible actuellement.</div>}
          <p className="sesira-reg-boundary">SESIRA prépare et signale les éléments connus. Aucun verdict réglementaire n’est émis ici.</p>
        </section>
      </div>

      {degraded.length ? (
        <section className="sesira-system-alert">
          <div>
            <strong>SESIRA demande votre attention.</strong>
            <span>{degraded[0].title}</span>
          </div>
          <Link href="/app/etat-sesira">Voir le diagnostic</Link>
        </section>
      ) : null}
    </div>
  );
}

type MetricTone = "violet" | "blue" | "green" | "rose";

function MetricCard({ label, value, meta, href, tone, icon }: { label: string; value: string; meta: string; href: string; tone: MetricTone; icon: string }) {
  return (
    <Link className={`sesira-metric-card tone-${tone}`} href={href}>
      <div className="sesira-metric-top"><span className="sesira-metric-icon">{icon}</span><span>{label}</span></div>
      <strong>{value}</strong>
      <p>{meta}</p>
    </Link>
  );
}

function WatchRow({ label, value, meta, href }: { label: string; value: string; meta: string; href: string }) {
  return (
    <Link className="sesira-watch-row" href={href}>
      <div><strong>{label}</strong><span>{meta}</span></div>
      <b>{value}</b>
    </Link>
  );
}

function TechnicianToday({ organizationName, workspace }: {
  organizationName: string;
  workspace: { actions: TodayAction[]; unavailable: string[] };
}) {
  const urgent = workspace.actions.filter((item) => item.priority === 1).length;
  return (
    <div className="sesira-home technician-home">
      <header className="sesira-home-header">
        <div><div className="sesira-home-kicker">Ma journée</div><h1>{organizationName}</h1><p>{workspace.actions.length} sujet{workspace.actions.length === 1 ? "" : "s"} · {urgent} prioritaire{urgent === 1 ? "" : "s"}</p></div>
        <div className="sesira-home-actions"><Link className="sesira-btn primary" href="/app/terrain">Ouvrir le terrain</Link></div>
      </header>
      {workspace.unavailable.length ? <section className="sesira-read-warning"><StatusPill tone="warning">Lecture partielle</StatusPill><span>{workspace.unavailable.join(" · ")}</span></section> : null}
      {workspace.actions.length ? (
        <section className="sesira-panel sesira-priority-panel">
          <div className="sesira-panel-heading"><div><span className="sesira-panel-kicker">Aujourd’hui</span><h2>À traiter</h2></div></div>
          <div className="sesira-priority-list">{workspace.actions.map((item) => <article className="sesira-priority-row" key={item.id}><span className={`sesira-priority-icon tone-${decisionTone(item.category)}`}>{categoryInitial(item.category)}</span><div className="sesira-priority-copy"><div className="sesira-priority-meta"><span>{categoryLabel(item.category)}</span></div><h3>{item.title}</h3><p>{item.detail}</p></div><Link className={item.priority === 1 ? "sesira-row-action primary" : "sesira-row-action"} href={item.href}>{item.action}</Link></article>)}</div>
        </section>
      ) : <EmptyState title="Rien d’assigné aujourd’hui" description="Aucune intervention ni donnée terrain à vérifier n’est remontée pour cette journée." />}
    </div>
  );
}

function categoryLabel(category: TodayAction["category"]) {
  const labels: Record<TodayAction["category"], string> = {
    COMMERCIAL: "Devis & clients",
    CHANTIER: "Chantier",
    RAPPORT: "Rapport terrain",
    FACTURE: "Facture",
    ENTRETIEN: "Entretien",
    OBLIGATION: "Obligation CVC",
    TERRAIN: "Terrain",
    SESIRA: "SESIRA",
  };
  return labels[category];
}

function categoryInitial(category: TodayAction["category"]) {
  return ({ COMMERCIAL: "D", CHANTIER: "C", RAPPORT: "R", FACTURE: "F", ENTRETIEN: "M", OBLIGATION: "O", TERRAIN: "T", SESIRA: "S" } as const)[category];
}

function decisionTone(category: TodayAction["category"]) {
  return ({ COMMERCIAL: "blue", CHANTIER: "violet", RAPPORT: "green", FACTURE: "rose", ENTRETIEN: "violet", OBLIGATION: "amber", TERRAIN: "green", SESIRA: "rose" } as const)[category];
}

function fieldStatusTone(status: string) {
  if (status === "IN_PROGRESS") return "green";
  if (status === "CONFIRMED") return "blue";
  if (status === "NEEDS_ATTENTION") return "rose";
  return "neutral";
}

function interventionLabel(status: string) {
  return ({ PLANNED: "À venir", CONFIRMED: "Confirmée", IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée", NEEDS_ATTENTION: "À reprendre" } as Record<string, string>)[status] ?? status;
}

function automationModeLabel(levels: AutomationLevel[]) {
  const unique = [...new Set(levels)];
  if (!unique.length) return "Observation";
  if (unique.length === 1) return AUTOMATION_LEVEL_LABELS[unique[0]];
  return "Modes mixtes";
}

function opportunityIdFromHref(href: string) {
  const match = href.match(/^\/app\/opportunites\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function sumByCurrency(items: Array<{ amount: number; currency: string }>) {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount);
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => a.currency.localeCompare(b.currency));
}

function formatCurrencyTotals(totals: Array<{ currency: string; amount: number }>) {
  if (!totals.length) return "—";
  return totals.map(({ currency, amount }) => new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)).join(" · ");
}

function localIsoDate(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function localIsoDateFromTimestamp(value: string, timeZone: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : localIsoDate(date, timeZone);
}

function formatTimeInZone(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(value);
}

function formatLongDate(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(value);
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function relativeObserved(value: string | null, timeZone: string, nowMs: number) {
  if (!value) return "Heure inconnue";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Heure inconnue";
  const diff = Math.max(0, nowMs - parsed);
  if (diff < 60 * 60 * 1000) return `Il y a ${Math.max(1, Math.round(diff / 60_000))} min`;
  if (diff < DAY_MS) return `Il y a ${Math.round(diff / 3_600_000)} h`;
  return new Intl.DateTimeFormat("fr-FR", { timeZone, day: "2-digit", month: "short" }).format(new Date(parsed));
}

function relativeDue(value: string | null, nowMs: number) {
  if (!value) return "Échéance inconnue";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Échéance inconnue";
  const days = Math.ceil((parsed - nowMs) / DAY_MS);
  if (days < 0) return `Échéance dépassée de ${Math.abs(days)} j`;
  if (days === 0) return "Échéance aujourd’hui";
  return `Échéance dans ${days} j`;
}

function dueAt(equipment: { nextLeakCheck: { nextDueAt: string | null } | null }) {
  const value = equipment.nextLeakCheck?.nextDueAt;
  const parsed = value ? Date.parse(value) : Number.POSITIVE_INFINITY;
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}
