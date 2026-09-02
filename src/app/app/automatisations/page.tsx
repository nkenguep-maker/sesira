import { PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { AUTOMATION_CATALOG, findAutomationDefinition } from "@/lib/automations/catalog";
import type { AutomationRunsByConfig } from "@/lib/automations/contracts";
import { AUTOMATION_LEVEL_LABELS, buildAutomationCards } from "@/lib/automations/view-model";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const organizationId = viewer.organization.id;
  const supabase = await createClient();
  const configsResult = await supabase
    .from("automation_configs")
    .select("id, template_key, enabled, level, updated_at")
    .eq("organization_id", organizationId)
    .eq("enabled", true)
    .order("updated_at", { ascending: false });

  if (configsResult.error) throw new Error("Impossible de charger les automatisations.");

  const configs = (configsResult.data ?? []).filter((config) => Boolean(findAutomationDefinition(config.template_key)));
  const runResults = await Promise.all(configs.map(async (config) => {
    const result = await supabase
      .from("automation_runs")
      .select("id, automation_config_id, status, created_at, completed_at")
      .eq("organization_id", organizationId)
      .eq("automation_config_id", config.id)
      .order("created_at", { ascending: false })
      .limit(6);
    return [config.id, result.error ? null : (result.data ?? [])] as const;
  }));

  const runsByConfig: AutomationRunsByConfig = Object.fromEntries(runResults);
  const cards = buildAutomationCards(configs, runsByConfig);
  const activeKeys = new Set(cards.map((card) => card.key));
  const recentActivity = cards.reduce((total, card) => total + card.recentActivity.length, 0);
  const currentMode = cards[0]?.level ? AUTOMATION_LEVEL_LABELS[cards[0].level] : "Observation";

  return (
    <>
      <PageHeader
        eyebrow="06 · AUTOMATISATIONS"
        title="Automatisations"
        description="SESIRA surveille vos processus selon les règles définies avec votre entreprise. Les décisions sensibles restent humaines."
      />

      <section className="premium-automation-summary">
        <div><strong>{cards.length}</strong><span>Automatisations actives</span></div>
        <div><strong>{currentMode}</strong><span>Mode actuel</span></div>
        <div><strong>{recentActivity}</strong><span>Activités récentes visibles</span></div>
        <div><strong>{cards.filter((card) => card.health.tone === "amber").length}</strong><span>À vérifier</span></div>
      </section>

      {cards.length ? (
        <section className="premium-automation-list">
          {cards.map((card) => (
            <article key={card.id} className="premium-automation-card">
              <header>
                <div>
                  <span className="eyebrow">{card.key}</span>
                  <h2>{card.title}</h2>
                  <p>{card.description}</p>
                </div>
                <div className="premium-automation-badges">
                  <StatusPill tone="good">Actif</StatusPill>
                  <StatusPill tone={card.health.tone === "amber" ? "warning" : card.health.tone === "emerald" ? "good" : "neutral"}>{card.health.label}</StatusPill>
                </div>
              </header>

              <div className="premium-automation-body">
                <div className="premium-data-list">
                  <div><span>Mode</span><strong>{AUTOMATION_LEVEL_LABELS[card.level]}</strong></div>
                  <div><span>Dernier succès</span><strong>{card.lastSuccess ?? "Aucun enregistré"}</strong></div>
                  <div><span>Dernier problème</span><strong>{card.lastProblem ?? "Aucun enregistré"}</strong></div>
                </div>
                <div className="premium-automation-policy">
                  <span className="eyebrow">CE QUE SESIRA PEUT FAIRE</span>
                  <p>{card.allowedAction}</p>
                  <span className="eyebrow">CE QUI RESTE HUMAIN</span>
                  <p>{card.humanJudgment}</p>
                </div>
              </div>

              <div className="premium-activity-strip">
                <span className="eyebrow">ACTIVITÉ RÉCENTE</span>
                {card.activityAvailable ? card.recentActivity.length ? (
                  <div>{card.recentActivity.map((activity) => <p key={activity.id}><span>{activity.label}</span><time>{activity.date}</time></p>)}</div>
                ) : <p className="premium-muted-copy">Aucune activité récente.</p> : <p className="premium-muted-copy">L’activité détaillée n’est pas disponible pour cette automatisation.</p>}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="premium-empty-editorial">
          <span className="eyebrow">OBSERVATION</span>
          <h2>Aucune automatisation active.</h2>
          <p>SESIRA peut commencer par observer le suivi de vos devis sans déclencher d’action externe.</p>
        </section>
      )}

      <section className="premium-catalog-section">
        <div className="premium-section-heading"><div><span className="eyebrow">CATALOGUE</span><h2>Les processus prévus dans SESIRA.</h2></div></div>
        <div className="premium-catalog-grid">
          {AUTOMATION_CATALOG.map((definition) => {
            const active = activeKeys.has(definition.key);
            return (
              <article key={definition.key} className={active ? "active" : ""}>
                <div><span className="eyebrow">{definition.key}</span><h3>{definition.title}</h3><p>{definition.description}</p></div>
                <StatusPill tone={active ? "good" : "neutral"}>{active ? "Actif" : "À configurer"}</StatusPill>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
