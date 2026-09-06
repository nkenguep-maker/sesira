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
  const now = new Date();
  const nowMs = now.getTime();
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
      footLabel: "Dossiers suivis",
    },
    {
      label: "Vendu non planifié",
      count: soldNotScheduledValues.length,
      totals: sumByCurrency(soldNotScheduledValues),
      href: "/app/interventions",
      note: "Affaires gagnées qui remontent faute de prochain pas opérationnel.",
      footLabel: "À planifier",
    },
    {
      label: "Factures échues",
      count: overdueInvoices.length,
      totals: sumByCurrency(overdueInvoices.map((invoice) => ({ amount: invoice.amount, currency: invoice.currency }))),
      href: "/app/factures",
      note: "Montants issus des factures actuellement enregistrées en retard.",
      footLabel: "Créances ouvertes",
      attention: overdueInvoices.length > 0,
    },
    {
      label: "Contrats < 60 jours",
      count: renewals.length,
      totals: sumByCurrency(renewals.flatMap((contract) => contract.amount === null ? [] : [{ amount: contract.amount, currency: contract.currency }])),
      href: "/app/maintenance",
      note: "Contrats dont la date de fin connue tombe dans les 60 prochains jours.",
      footLabel: "Renouvellements",
    },
  ];

  const localToday = localIsoDate(now, timezone);
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
    <div className="command-dashboard stitch-faithful-dashboard">
      <header className="stitch-hero-card">
        <div className="stitch-hero-copy">
          <div className="stitch-hero-kickers">
            <span className="stitch-live-chip"><span />{currentMode}</span>
            <span>POSTE DE COMMANDE CVC · {viewer.organization.name}</span>
          </div>
          <h1>
            {decisions.length ? <>{decisions.length} décision{decisions.length > 1 ? "s" : ""} requièrent votre validation aujourd’hui</> : <>Aucune décision immédiate ne requiert votre validation</>}
          </h1>
          <p>{observation
            ? "SESIRA observe les données disponibles et prépare les prochains gestes. Aucun envoi n’est déduit d’un simple signal."
            : "SESIRA rassemble ici les décisions commerciales, terrain, financières et réglementaires qui demandent un geste explicite."}</p>
        </div>
        <div className="stitch-hero-actions">
          <div className="stitch-mode-switch" aria-label="État du poste de commande">
            <span className="active">{currentMode}</span>
            <span>{formatLongDate(now, timezone)}</span>
          </div>
          <div className="stitch-hero-action-row">
            <Link href="/app/automatisations">Autonomie</Link>
            <Link href="/app/parametres/export">Export</Link>
          </div>
        </div>
      </header>

      {setupIncomplete ? (
        <FirstRunSetup
          organizationName={viewer.organization.name}
          hasBusinessData={hasBusinessData}
          connectedEmail={connectedEmail}
          policyConfigured={speedToLead?.configured === true}
          automationConfigured={Boolean(automationResult.data?.length)}
        />
      ) : null}

      {today.unavailable.length ? (
        <section className="command-partial-note">
          <StatusPill tone="warning">Lecture partielle</StatusPill>
          <p>{today.unavailable.join(" · ")}. Elles ne sont pas remplacées par zéro.</p>
        </section>
      ) : null}

      <section className="stitch-section stitch-decisions-section" aria-labelledby="decision-heading">
        <div className="stitch-section-title-row">
          <div className="stitch-title-with-badge">
            <h2 id="decision-heading">File de Décisions Immédiates</h2>
            {decisions.length ? <span className="stitch-waiting-badge">{decisions.length} en attente</span> : null}
          </div>
          <span className="stitch-sort-label">Triée par valeur × urgence</span>
        </div>

        {visibleDecisions.length ? (
          <div className="stitch-decision-stack">
            {visibleDecisions.map((item) => <DecisionRow item={item} key={item.id} timezone={timezone} nowMs={nowMs} />)}
          </div>
        ) : (
          <div className="command-clear-state"><span aria-hidden="true">✓</span><div><strong>File de décisions entièrement traitée.</strong><p>Aucune donnée enregistrée ne demande une validation immédiate.</p></div></div>
        )}

        {hiddenDecisionCount ? <Link className="command-more-link" href="/app/suivi">Voir {hiddenDecisionCount} autres sujets</Link> : null}
      </section>

      <section className="stitch-section" aria-labelledby="money-heading">
        <div className="stitch-section-title-row stitch-title-with-subtitle">
          <div>
            <h2 id="money-heading">Cockpit Financier & Cash-Flow</h2>
            <p>Montants opérationnels issus des devis, chantiers vendus, factures et contrats suivis.</p>
          </div>
          <span className="stitch-data-source">Données réelles · devises séparées</span>
        </div>
        <div className="stitch-money-grid">{moneyCards.map((card) => <MoneyMetric card={card} key={card.label} />)}</div>
      </section>

      <section className="stitch-section" aria-labelledby="field-heading">
        <div className="stitch-section-title-row stitch-title-with-subtitle">
          <div>
            <h2 id="field-heading">Aujourd’hui sur le Terrain</h2>
            <p>Interventions planifiées aujourd’hui et remontées qui demandent encore une reprise.</p>
          </div>
          <span className="stitch-connection-pill"><span />{fieldRows.length} intervention{fieldRows.length > 1 ? "s" : ""} · {reportsToValidate === null ? "—" : reportsToValidate} rapport{reportsToValidate === 1 ? "" : "s"} à valider · {conflictCount === null ? "—" : conflictCount} conflit{conflictCount === 1 ? "" : "s"} offline</span>
        </div>

        {fieldRows.length ? (
          <div className="stitch-field-grid">
            {fieldRows.map((row) => {
              const person = memberByUser.get(row.assignedUserId ?? "") ?? "Non assigné";
              const location = [row.addressPostalCode, row.addressCity].filter(Boolean).join(" ") || row.addressLine1 || "Adresse non renseignée";
              return (
                <Link className="stitch-field-card" href="/app/interventions" key={row.id}>
                  <div className="stitch-field-person">
                    <span className="stitch-field-avatar">{initials(person)}</span>
                    <div><strong>{person}</strong><span>{row.scheduledAt ? formatTimeInZone(new Date(row.scheduledAt), timezone) : "Sans horaire"} · {location}</span></div>
                    <span className={`stitch-field-status ${fieldStatusTone(row.status)}`}>{interventionLabel(row.status)}</span>
                  </div>
                  <div className="stitch-field-job">
                    <strong>{row.title}</strong>
                    <span>{location}</span>
                    <b>{row.durationMinutes ? `${row.durationMinutes} min prévues` : "Durée non renseignée"}</b>
                  </div>
                  <div className="stitch-field-foot">Dossier intervention · données enregistrées</div>
                </Link>
              );
            })}
          </div>
        ) : <div className="command-inline-empty">Aucune intervention planifiée aujourd’hui dans les données lisibles.</div>}
      </section>

      <section className="stitch-regulatory-panel" aria-labelledby="reg-heading">
        <div className="stitch-reg-header">
          <div>
            <h2 id="reg-heading">Suivi F-Gas & Traçabilité CERFA 15497*04</h2>
            <p>Échéances et éléments documentaires issus du registre SESIRA.</p>
          </div>
          <Link className="stitch-reg-capacity" href="/app/obligations/documents">Ouvrir le registre</Link>
        </div>

        {reg ? (
          <div className="stitch-reg-grid">
            <article>
              <small>Contrôles d’étanchéité à préparer</small>
              <strong>{dueLeakChecks.length}</strong>
              <p>{nextLeakCheck?.nextLeakCheck?.status === "DUE" ? `Prochaine échéance ${relativeDue(nextLeakCheck.nextLeakCheck.nextDueAt, nowMs)} · ${nextLeakCheck.label}.` : "Aucune prochaine échéance calculable dans le registre."}</p>
              <div><span>Équipements</span><b>{dueLeakChecks.length ? "À préparer" : "Aucune échéance"}</b></div>
            </article>
            <article className={regulatoryGaps ? "attention" : ""}>
              <small>Documents à compléter</small>
              <strong>{regulatoryGaps ?? 0}</strong>
              <p>{regulatoryGaps ? "Informations manquantes détectées dans les exports réglementaires préparés." : "Aucune information manquante enregistrée dans les exports préparés."}</p>
              <div><span>Préparation documentaire</span><b>{regulatoryGaps ? `${regulatoryGaps} à reprendre` : "Rien à reprendre"}</b></div>
            </article>
            <article>
              <small>Attestations suivies</small>
              <strong>{activeAttestations.length}</strong>
              <p>{nearestAttestation ? `Échéance enregistrée la plus proche : ${formatDate(nearestAttestation.validUntil)} · ${nearestAttestation.referenceNumber}.` : "Aucune attestation active lisible."}</p>
              <div><span>Échéance connue</span><b>{nearestAttestation ? formatDate(nearestAttestation.validUntil) : "—"}</b></div>
            </article>
          </div>
        ) : <div className="command-inline-empty">Le registre réglementaire n’est pas lisible actuellement.</div>}
        <p className="command-regulatory-boundary">SESIRA prépare, calcule et signale. Cette vue ne qualifie pas votre situation réglementaire et n’effectue aucun dépôt à votre place.</p>
      </section>

      {degraded.length ? (
        <section className="command-system-section stitch-section" aria-labelledby="system-heading">
          <div className="stitch-section-title-row">
            <div><h2 id="system-heading">État SESIRA · un composant demande votre regard</h2></div>
            <Link className="command-text-link" href="/app/etat-sesira">Diagnostic</Link>
          </div>
          <div className="stitch-decision-stack">{degraded.slice(0, 3).map((item) => <DecisionRow item={item} key={item.id} timezone={timezone} nowMs={nowMs} />)}</div>
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
  footLabel: string;
  attention?: boolean;
};

function DecisionRow({ item, timezone, nowMs }: { item: TodayAction; timezone: string; nowMs: number }) {
  return (
    <article className={`stitch-decision-row stitch-kind-${decisionKind(item.category)}`}>
      <span className="stitch-decision-code" aria-label={categoryLabel(item.category)}>{categoryInitial(item.category)}</span>
      <div className="stitch-decision-body">
        <div className="stitch-decision-titleline">
          <h3>{item.title}</h3>
          <span className="stitch-inline-tag">{categoryLabel(item.category)}</span>
          <span className={item.category === "FACTURE" ? "stitch-age critical" : "stitch-age"}>{relativeObserved(item.observedAt, timezone, nowMs)}</span>
        </div>
        <p><strong>Statut :</strong> {item.detail}</p>
      </div>
      <div className="stitch-decision-actions">
        <Link className={item.priority === 1 ? "primary" : ""} href={item.href}>{item.action}</Link>
        <Link href={item.href}>Dossier</Link>
      </div>
    </article>
  );
}

function MoneyMetric({ card }: { card: MoneyCard }) {
  return (
    <Link className={card.attention ? "stitch-money-card attention" : "stitch-money-card"} href={card.href}>
      <div className="stitch-money-head"><span>{card.label}</span><span>{card.count} dossier{card.count > 1 ? "s" : ""}</span></div>
      <strong>{formatCurrencyTotals(card.totals)}</strong>
      <p>{card.note}</p>
      <div className="stitch-money-foot"><span>{card.footLabel}</span><strong>{card.count}</strong></div>
    </Link>
  );
}

function FirstRunSetup({ organizationName, hasBusinessData, connectedEmail, policyConfigured, automationConfigured }: {
  organizationName: string;
  hasBusinessData: boolean;
  connectedEmail: boolean;
  policyConfigured: boolean;
  automationConfigured: boolean;
}) {
  return (
    <section className="command-setup-strip" aria-label="Configuration à terminer">
      <div>
        <span className="eyebrow">CONFIGURATION À TERMINER</span>
        <strong>Préparer {organizationName}</strong>
      </div>
      <div className="command-setup-actions">
        <SetupItem done={hasBusinessData} title="Ajouter vos données" description="Importez vos premiers clients et dossiers." href="/app/imports" action="Ajouter vos données" />
        <SetupItem done={connectedEmail} title="Connecter la messagerie" description="Reliez la boîte professionnelle observée par SESIRA." href="/app/integrations" action="Connecter la messagerie" />
        <SetupItem done={policyConfigured} title="Définir votre délai de prise en charge" description="Choisissez quand une nouvelle demande doit remonter dans Aujourd’hui." href="/app/parametres/politiques" action="Régler le délai" />
        <SetupItem done={automationConfigured} title="Choisir l’autonomie" description="Définissez ce que SESIRA peut préparer ou exécuter." href="/app/automatisations" action="Choisir l’autonomie" />
      </div>
    </section>
  );
}

function SetupItem({ done, title, description, href, action }: { done: boolean; title: string; description: string; href: string; action: string }) {
  return (
    <Link href={href} className="secondary-action-link" title={`${title} — ${description}`}>
      {done ? "Vérifier" : action}
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
function decisionKind(category: TodayAction["category"]) { return ({ COMMERCIAL: "commercial", CHANTIER: "commercial", RAPPORT: "terrain", FACTURE: "facture", ENTRETIEN: "commercial", OBLIGATION: "obligation", TERRAIN: "terrain", SESIRA: "sesira" } as const)[category]; }
function fieldStatusTone(status: string) { if (status === "IN_PROGRESS") return "good"; if (status === "CONFIRMED") return "cyan"; return "neutral"; }
function interventionLabel(status: string) { return ({ PLANNED: "À venir", CONFIRMED: "Confirmée", IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée", NEEDS_ATTENTION: "À reprendre" } as Record<string, string>)[status] ?? status; }
function automationModeLabel(levels: AutomationLevel[]) { const unique = [...new Set(levels)]; if (!unique.length) return "Observation"; if (unique.length === 1) return AUTOMATION_LEVEL_LABELS[unique[0]]; return "Modes mixtes"; }
function opportunityIdFromHref(href: string) { const match = href.match(/^\/app\/opportunites\/([^/?#]+)/); return match?.[1] ?? null; }
function sumByCurrency(items: Array<{ amount: number; currency: string }>) { const totals = new Map<string, number>(); for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount); return [...totals.entries()].map(([currency, amount]) => ({ currency, amount })).sort((a, b) => a.currency.localeCompare(b.currency)); }
function formatCurrencyTotals(totals: Array<{ currency: string; amount: number }>) { if (!totals.length) return "—"; return totals.map(({ currency, amount }) => new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)).join(" · "); }
function localIsoDate(value: Date, timeZone: string) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value); const map = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${map.year}-${map.month}-${map.day}`; }
function localIsoDateFromTimestamp(value: string, timeZone: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const map = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${map.year}-${map.month}-${map.day}`; }
function formatTimeInZone(value: Date, timeZone: string) { return new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(value); }
function formatLongDate(value: Date, timeZone: string) { return new Intl.DateTimeFormat("fr-FR", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(value); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date); }
function relativeObserved(value: string | null | undefined, timeZone: string, nowMs: number) { if (!value) return "heure non renseignée"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "heure non renseignée"; const delta = nowMs - date.getTime(); if (delta >= 0 && delta < 60 * 60_000) return `il y a ${Math.max(1, Math.round(delta / 60_000))} min`; if (delta >= 0 && delta < DAY_MS) return `il y a ${Math.round(delta / 3_600_000)} h`; if (delta >= 0) return `il y a ${Math.round(delta / DAY_MS)} j`; return new Intl.DateTimeFormat("fr-FR", { timeZone, dateStyle: "medium" }).format(date); }
function relativeDue(value: string, nowMs: number) { const time = new Date(value).getTime(); if (Number.isNaN(time)) return "à une date inconnue"; const days = Math.ceil((time - nowMs) / DAY_MS); if (days < 0) return `dépassée de ${Math.abs(days)} j`; if (days === 0) return "aujourd’hui"; return `dans ${days} j`; }
function dueAt(row: { nextLeakCheck: { status: "DUE"; nextDueAt: string } | { status: "OUT_OF_SCOPE" } | { status: "UNAVAILABLE" } | null }) { return row.nextLeakCheck?.status === "DUE" ? Date.parse(row.nextLeakCheck.nextDueAt) : Number.POSITIVE_INFINITY; }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "—"; }
function currentDate() { return new Date().toISOString().slice(0, 10); }
