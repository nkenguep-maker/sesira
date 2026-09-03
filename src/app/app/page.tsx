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

  const connectedEmail = (integrationsResult.data ?? []).some((item) => item.type === "EMAIL" && item.status === "CONNECTED");
  const currentAutomation = automationResult.data?.[0];
  const automationLevel = currentAutomation?.level && currentAutomation.level in AUTOMATION_LEVEL_LABELS
    ? AUTOMATION_LEVEL_LABELS[currentAutomation.level as keyof typeof AUTOMATION_LEVEL_LABELS]
    : "Non configuré";

  return (
    <>
      <PageHeader
        eyebrow="AUJOURD'HUI"
        title="Vue d'ensemble"
        description={`Une lecture simple de ${viewer.organization.name} et de ce qui mérite votre attention.`}
        actions={<Link href="/app/onboarding" className="button primary small">Configurer SESIRA</Link>}
      />

      <section className="metrics-grid premium-metrics">
        <MetricCard label="Clients" value={formatCount(customersResult.error ? null : customersResult.count)} note="Dossiers enregistrés" />
        <MetricCard label="Devis" value={formatCount(quotesResult.error ? null : quotesResult.count)} note="Dossiers enregistrés" />
        <MetricCard label="À traiter" value={formatCount(attentionOpen)} note="Éléments ouverts" />
        <MetricCard label="Email" value={connectedEmail ? "Connecté" : "—"} note={connectedEmail ? "Messagerie reliée" : "Connexion à configurer"} />
      </section>

      <section className="premium-results-section">
        <div className="premium-section-heading">
          <div><span className="eyebrow">PRISE EN CHARGE DES NOUVELLES DEMANDES</span><h2>Ce qui attend encore une première action.</h2></div>
          <StatusPill tone={!speedToLead ? "neutral" : speedToLead.overdueCount > 0 ? "warning" : speedToLead.enabled ? "good" : "neutral"}>
            {!speedToLead ? "Donnée indisponible" : speedToLead.enabled ? `Cible ${formatDuration(speedToLead.targetMinutes)}` : "Politique inactive"}
          </StatusPill>
        </div>
        {!speedToLead ? (
          <p className="premium-muted-copy">SESIRA ne peut pas lire cette mesure pour le moment. Aucune valeur de remplacement n’est affichée.</p>
        ) : (
          <>
            <div className="premium-connection-summary">
              <div><strong>{formatCount(speedToLead.pendingCount)}</strong><span>Nouvelles demandes en attente</span></div>
              <div><strong>{speedToLead.enabled ? formatCount(speedToLead.overdueCount) : "—"}</strong><span>Au delà du délai choisi</span></div>
              <div><strong>{speedToLead.averageHandlingMinutes === null ? "—" : formatDuration(speedToLead.averageHandlingMinutes)}</strong><span>Prise en charge moyenne observée · 30 jours</span></div>
            </div>
            <div className="premium-focus-actions">
              <Link href="/app/suivi" className="text-link">Voir ce qui est à traiter <span>↘</span></Link>
              <Link href="/app/parametres/politiques" className="text-link">Régler le délai <span>↘</span></Link>
            </div>
            <p className="premium-muted-copy">Mesure : première transition interne hors de Nouvelle. Échantillon observé sur 30 jours : {speedToLead.handledSampleCount}. SESIRA ne présente pas cette mesure comme un temps de réponse envoyé au client.</p>
          </>
        )}
      </section>

      <section className="premium-dashboard-grid">
        <article className="premium-focus-card">
          <div className="premium-card-topline">
            <span className="eyebrow">PRIORITÉ OPÉRATIONNELLE</span>
            <StatusPill tone={attentionOpen && attentionOpen > 0 ? "warning" : "neutral"}>
              {attentionOpen === null ? "Donnée indisponible" : attentionOpen > 0 ? `${attentionOpen} à traiter` : "Rien d'ouvert"}
            </StatusPill>
          </div>
          <div className="premium-focus-copy">
            <strong>{attentionOpen === null ? "SESIRA attend une lecture exploitable." : attentionOpen > 0 ? "Des éléments demandent votre attention." : "Aucun arbitrage urgent n'est visible."}</strong>
            <p>{attentionOpen === null ? "Une donnée indisponible reste indisponible. Elle n'est jamais remplacée par zéro." : attentionOpen > 0 ? "Ouvrez le suivi pour voir les dossiers concernés et leur contexte avant d'agir." : "SESIRA continuera à observer les dossiers et fera remonter ce qui nécessite réellement une action."}</p>
          </div>
          <div className="premium-focus-actions">
            <Link href="/app/suivi" className="text-link">Voir le suivi <span>↘</span></Link>
            <Link href="/app/resultats" className="text-link">Voir les résultats <span>↘</span></Link>
          </div>
        </article>

        <article className="premium-system-card">
          <span className="eyebrow">SYSTÈME</span>
          <h2>État de votre espace</h2>
          <div className="premium-data-list">
            <div><span>Organisation</span><strong>{viewer.organization.status}</strong></div>
            <div><span>Mode SESIRA</span><strong>{automationLevel}</strong></div>
            <div><span>Email</span><strong>{connectedEmail ? "Connecté" : "À configurer"}</strong></div>
            <div><span>Connexions connues</span><strong>{integrationsResult.error ? "Indisponible" : String(integrationsResult.data?.length ?? 0)}</strong></div>
          </div>
          <Link href="/app/integrations" className="button ghost small full">Gérer les connexions</Link>
        </article>
      </section>
    </>
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
