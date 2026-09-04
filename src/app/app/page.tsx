import Link from "next/link";

import { MetricCard, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { AUTOMATION_LEVEL_LABELS } from "@/lib/automations/view-model";
import { getSpeedToLeadSummary } from "@/lib/data";
import { buildResultsPeriod } from "@/lib/results/period";
import { createSupabaseResultsRepository } from "@/lib/results/supabase-results-repository";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const supabase = await createClient();
  const organizationId = viewer.organization.id;
  const [customersResult, quotesResult, integrationsResult, automationResult, speedToLead] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("integrations").select("id, type, status", { count: "exact" }).eq("organization_id", organizationId),
    supabase.from("automation_configs").select("id, level, enabled").eq("organization_id", organizationId).eq("enabled", true).order("updated_at", { ascending: false }).limit(1),
    getSpeedToLeadSummary(organizationId),
  ]);

  let attentionOpen: number | null = null;
  try {
    const repository = createSupabaseResultsRepository(supabase);
    const summary = await repository.getSummary({ organizationId, period: buildResultsPeriod("30d") });
    attentionOpen = summary.observed.find((metric) => metric.key === "attention_open")?.value ?? null;
  } catch {
    attentionOpen = null;
  }

  const customerCount = customersResult.error ? null : (customersResult.count ?? 0);
  const quoteCount = quotesResult.error ? null : (quotesResult.count ?? 0);
  const connectedEmail = (integrationsResult.data ?? []).some((item) => item.type === "EMAIL" && item.status === "CONNECTED");
  const currentAutomation = automationResult.data?.[0];
  const automationLevel = currentAutomation?.level && currentAutomation.level in AUTOMATION_LEVEL_LABELS
    ? AUTOMATION_LEVEL_LABELS[currentAutomation.level as keyof typeof AUTOMATION_LEVEL_LABELS]
    : "Non configuré";
  const hasBusinessData = (customerCount ?? 0) > 0 || (quoteCount ?? 0) > 0;
  const setupStateIsReliable = !customersResult.error && !quotesResult.error && !integrationsResult.error;
  const setupRequired = setupStateIsReliable && (!hasBusinessData || !connectedEmail);

  if (setupRequired) {
    return (
      <FirstRunSetup
        organizationName={viewer.organization.name}
        hasBusinessData={hasBusinessData}
        connectedEmail={connectedEmail}
        policyConfigured={speedToLead?.configured === true}
        automationConfigured={Boolean(currentAutomation)}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="AUJOURD’HUI"
        title="Vue d’ensemble"
        description={`Ce qui mérite une action dans ${viewer.organization.name}.`}
      />

      <section className="metrics-grid app-metrics-strip" aria-label="Indicateurs principaux">
        <MetricCard label="Clients" value={formatCount(customerCount)} />
        <MetricCard label="Devis" value={formatCount(quoteCount)} />
        <MetricCard label="À traiter" value={formatCount(attentionOpen)} />
        <MetricCard label="Messagerie" value={integrationsResult.error ? "—" : connectedEmail ? "Connectée" : "À relier"} />
      </section>

      <section className="app-primary-block">
        <div className="app-section-heading">
          <div>
            <span className="eyebrow">PRISE EN CHARGE</span>
            <h2>Nouvelles demandes en attente</h2>
            <p>Repérez rapidement ce qui n’a pas encore reçu de première prise en charge interne.</p>
          </div>
          {speedToLead?.enabled ? (
            <StatusPill tone={speedToLead.overdueCount > 0 ? "warning" : "good"}>Cible {formatDuration(speedToLead.targetMinutes)}</StatusPill>
          ) : (
            <Link href="/app/parametres/politiques" className="policy-action-chip">
              Activer la politique
            </Link>
          )}
        </div>

        {!speedToLead ? (
          <div className="app-state-message">
            <strong>Mesure indisponible</strong>
            <p>SESIRA ne peut pas lire cette mesure pour le moment. Aucune valeur de remplacement n’est affichée.</p>
          </div>
        ) : (
          <>
            <div className="app-operational-stats">
              <div><strong>{formatCount(speedToLead.pendingCount)}</strong><span>En attente</span></div>
              <div><strong>{speedToLead.enabled ? formatCount(speedToLead.overdueCount) : "—"}</strong><span>Hors délai</span></div>
              <div><strong>{speedToLead.averageHandlingMinutes === null ? "—" : formatDuration(speedToLead.averageHandlingMinutes)}</strong><span>Moyenne observée · 30 j</span></div>
            </div>

            <div className="app-primary-actions">
              <Link href="/app/suivi" className="button primary small">Voir le suivi</Link>
              <Link href="/app/parametres/politiques" className="secondary-action-link">Régler le délai</Link>
            </div>

            <p className="app-method-note">Mesure basée sur la première transition interne hors de « Nouvelle ». Échantillon observé sur 30 jours : {speedToLead.handledSampleCount}. Ce n’est pas présenté comme un temps de réponse envoyé au client.</p>
          </>
        )}
      </section>

      <section className="app-dashboard-grid">
        <article className="app-work-card">
          <div className="app-card-heading">
            <div><span className="eyebrow">ATTENTION</span><h2>Décisions à reprendre</h2></div>
            <StatusPill tone={attentionOpen && attentionOpen > 0 ? "warning" : "neutral"}>
              {attentionOpen === null ? "Indisponible" : attentionOpen > 0 ? `${attentionOpen} ouvertes` : "À jour"}
            </StatusPill>
          </div>
          <p>{attentionOpen === null
            ? "La lecture des éléments à traiter est indisponible. SESIRA ne remplace pas cette donnée par zéro."
            : attentionOpen > 0
              ? "Ouvrez le suivi pour retrouver les dossiers concernés, leur contexte et la décision attendue."
              : "Aucun arbitrage ouvert n’est visible actuellement."}</p>
          <Link href="/app/suivi" className="secondary-action-link">Ouvrir le suivi</Link>
        </article>

        <article className="app-work-card compact-system-card">
          <div className="app-card-heading"><div><span className="eyebrow">ESPACE</span><h2>État du système</h2></div></div>
          <dl className="app-definition-list">
            <div><dt>Organisation</dt><dd>{organizationStatusLabel(viewer.organization.status)}</dd></div>
            <div><dt>Mode SESIRA</dt><dd>{automationLevel}</dd></div>
            <div><dt>Messagerie</dt><dd>{integrationsResult.error ? "Indisponible" : connectedEmail ? "Connectée" : "À relier"}</dd></div>
            <div><dt>Connexions</dt><dd>{integrationsResult.error ? "Indisponible" : String(integrationsResult.data?.length ?? 0)}</dd></div>
          </dl>
          <Link href="/app/integrations" className="secondary-action-link">Gérer les connexions</Link>
        </article>
      </section>
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
        <p>Avant d’afficher un tableau de bord vide, SESIRA vous guide vers les deux éléments nécessaires pour commencer à travailler : vos données et votre messagerie.</p>
        <Link href={nextHref} className="button primary">{nextLabel}</Link>
      </header>

      <div className="setup-checklist" aria-label="Étapes de mise en route">
        <SetupItem
          done={hasBusinessData}
          title="Ajouter vos données"
          description="Importez ou créez vos premiers clients et devis."
          href="/app/imports"
          action="Ouvrir les imports"
          required
        />
        <SetupItem
          done={connectedEmail}
          title="Connecter la messagerie"
          description="Reliez la boîte professionnelle que SESIRA doit observer."
          href="/app/integrations"
          action="Gérer les connexions"
          required
        />
        <SetupItem
          done={policyConfigured}
          title="Définir votre délai de prise en charge"
          description="Choisissez quand une nouvelle demande doit remonter dans le suivi."
          href="/app/parametres/politiques"
          action="Régler la politique"
        />
        <SetupItem
          done={automationConfigured}
          title="Choisir le niveau d’automatisation"
          description="Commencez en observation et augmentez le niveau de confiance lorsque vous le décidez."
          href="/app/automatisations"
          action="Voir les automatisations"
        />
      </div>

      <p className="setup-home-note">Les deux premières étapes conditionnent l’affichage du tableau de bord. Les réglages suivants peuvent être complétés progressivement.</p>
    </section>
  );
}

function SetupItem({
  done,
  title,
  description,
  href,
  action,
  required = false,
}: {
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
        <div className="setup-item-title-row">
          <h2>{title}</h2>
          {required ? <span>Essentiel</span> : <span>Ensuite</span>}
        </div>
        <p>{description}</p>
      </div>
      <Link href={href} className="secondary-action-link">{done ? "Vérifier" : action}</Link>
    </article>
  );
}

function formatCount(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : new Intl.NumberFormat("fr-FR").format(value);
}

function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return hours < 24 ? `${Math.round(hours * 10) / 10} h` : `${Math.round((hours / 24) * 10) / 10} j`;
}

function organizationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    SUSPENDED: "Suspendue",
  };
  return labels[status] ?? "État non renseigné";
}
