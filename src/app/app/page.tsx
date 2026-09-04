import Link from "next/link";

import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getSpeedToLeadSummary } from "@/lib/data";
import { getManagerToday, getTechnicianToday, type TodayAction } from "@/lib/data/today-c40";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TECH_ROLES = new Set(["TECH", "TECHNICIAN"]);

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

  if (setupStateIsReliable && (!hasBusinessData || !connectedEmail)) {
    return (
      <FirstRunSetup
        organizationName={viewer.organization.name}
        hasBusinessData={hasBusinessData}
        connectedEmail={connectedEmail}
        policyConfigured={speedToLead?.configured === true}
        automationConfigured={Boolean(automationResult.data?.length)}
      />
    );
  }

  const today = await getManagerToday(organizationId, {
    includePlatform: ["OWNER", "ADMIN"].includes(viewer.role),
  });
  return <TodayInbox organizationName={viewer.organization.name} workspace={today} />;
}

function TodayInbox({
  organizationName,
  workspace,
  technician = false,
}: {
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
        description={technician
          ? `Vos interventions et les données terrain à vérifier aujourd’hui chez ${organizationName}.`
          : `SESIRA rassemble ici ce qui est resté en plan chez ${organizationName}. Aucun élément n’est créé pour remplir l’écran.`}
        actions={technician ? <Link className="button primary small" href="/app/terrain">Ouvrir le terrain</Link> : undefined}
      />

      <section className="workspace-stat-strip" aria-label="Résumé de la journée">
        <div><strong>{workspace.actions.length}</strong><span>À traiter</span></div>
        <div><strong>{urgent}</strong><span>À regarder d’abord</span></div>
        <div><strong>{humanDecisions}</strong><span>Décisions humaines</span></div>
        <div><strong>{categories}</strong><span>Types de sujets</span></div>
      </section>

      {workspace.unavailable.length ? (
        <section className="workspace-boundary-note">
          <StatusPill tone="warning">Lecture partielle</StatusPill>
          <p>{workspace.unavailable.join(" · ")} : ces données ne sont pas lisibles actuellement. Elles ne sont pas remplacées par zéro.</p>
        </section>
      ) : null}

      {workspace.actions.length ? (
        <section className="workspace-list" aria-label="Travail à traiter aujourd’hui">
          {workspace.actions.map((item) => (
            <article className="workspace-row" key={item.id}>
              <div className="workspace-row-main">
                <div className="workspace-row-heading">
                  <div>
                    <span className="eyebrow">{categoryLabel(item.category)}</span>
                    <h2>{item.title}</h2>
                  </div>
                  <StatusPill tone={item.priority === 1 ? "warning" : "neutral"}>
                    {item.priority === 1 ? "À regarder" : "À traiter"}
                  </StatusPill>
                </div>
                <p className="workspace-description">{item.detail}</p>
              </div>
              <div className="workspace-row-actions">
                <Link className={item.priority === 1 ? "button primary small" : "button ghost small"} href={item.href}>
                  {item.action}
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title={technician ? "Rien d’assigné aujourd’hui" : "Rien ne demande d’action actuellement"}
          description={technician
            ? "Aucune intervention ni donnée terrain à vérifier n’est remontée pour cette journée."
            : "SESIRA ne fabrique pas une liste de tâches quand les données ne montrent rien à reprendre."}
        />
      )}

      {!technician ? (
        <section className="workspace-boundary-note">
          <StatusPill tone="neutral">Votre décision reste visible</StatusPill>
          <p>Prix, remises, litiges, financement, validation réglementaire et arrêt d’un service restent des décisions humaines. Aujourd’hui les fait remonter ; il ne les prend pas à votre place.</p>
        </section>
      ) : null}
    </>
  );
}

function FirstRunSetup({
  organizationName,
  hasBusinessData,
  connectedEmail,
  policyConfigured,
  automationConfigured,
}: {
  organizationName: string;
  hasBusinessData: boolean;
  connectedEmail: boolean;
  policyConfigured: boolean;
  automationConfigured: boolean;
}) {
  const requiredComplete = Number(hasBusinessData) + Number(connectedEmail);
  const nextHref = !hasBusinessData ? "/app/imports" : "/app/integrations";
  const nextLabel = !hasBusinessData ? "Ajouter les premières données" : "Connecter la messagerie";

  return (
    <section className="setup-home">
      <header className="setup-home-header">
        <span className="eyebrow">MISE EN ROUTE · {requiredComplete}/2 ESSENTIELS</span>
        <h1>Préparer {organizationName}</h1>
        <p>Pour commencer à faire remonter ce qui reste en plan, SESIRA a besoin de vos données et de votre messagerie professionnelle.</p>
        <Link href={nextHref} className="button primary">{nextLabel}</Link>
      </header>

      <div className="setup-checklist" aria-label="Étapes de mise en route">
        <SetupItem done={hasBusinessData} title="Ajouter vos données" description="Importez vos premiers clients. Les devis apparaissent lorsqu’ils sont créés ou synchronisés." href="/app/imports" action="Ouvrir les imports" required />
        <SetupItem done={connectedEmail} title="Connecter la messagerie" description="Reliez la boîte professionnelle que SESIRA doit observer." href="/app/integrations" action="Gérer les connexions" required />
        <SetupItem done={policyConfigured} title="Définir votre délai de prise en charge" description="Choisissez quand une nouvelle demande doit remonter dans Aujourd’hui." href="/app/parametres/politiques" action="Régler le délai" />
        <SetupItem done={automationConfigured} title="Choisir ce que SESIRA peut faire" description="Commencez en observation et autorisez davantage seulement quand vous le décidez." href="/app/automatisations" action="Voir les automatisations" />
      </div>
    </section>
  );
}

function SetupItem({ done, title, description, href, action, required = false }: {
  done: boolean;
  title: string;
  description: string;
  href: string;
  action: string;
  required?: boolean;
}) {
  return (
    <article className={done ? "setup-item done" : "setup-item"}>
      <div className="setup-item-status" aria-hidden="true">{done ? "✓" : ""}</div>
      <div className="setup-item-copy">
        <div className="setup-item-title-row"><h2>{title}</h2><span>{required ? "Essentiel" : "Ensuite"}</span></div>
        <p>{description}</p>
      </div>
      <Link href={href} className="secondary-action-link">{done ? "Vérifier" : action}</Link>
    </article>
  );
}

function categoryLabel(category: TodayAction["category"]) {
  const labels: Record<TodayAction["category"], string> = {
    COMMERCIAL: "DEVIS & CLIENTS",
    CHANTIER: "CHANTIER",
    RAPPORT: "RAPPORT TERRAIN",
    FACTURE: "FACTURE",
    ENTRETIEN: "ENTRETIEN",
    OBLIGATION: "OBLIGATION CVC",
    TERRAIN: "TERRAIN",
    SESIRA: "ÉTAT SESIRA",
  };
  return labels[category];
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}
