import Link from "next/link";

import { PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getAutomationReadiness, getOrganizationSettings, getSoldNotScheduledPolicy } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const [settings, automation, valuePolicy] = await Promise.all([
    getOrganizationSettings(viewer.organization.id),
    getAutomationReadiness(viewer.organization.id),
    getSoldNotScheduledPolicy(viewer.organization.id),
  ]);

  return (
    <>
      <PageHeader eyebrow="SYSTÈME" title="Paramètres" description="Votre espace de travail, vos règles et la récupération de vos données." />
      <section className="settings-stack">
        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">ESPACE</span><h2>Organisation</h2></div><StatusPill tone={settings?.status === "ACTIVE" ? "good" : "neutral"}>{settings?.status === "ACTIVE" ? "Active" : settings?.status ?? "Indisponible"}</StatusPill></div>
          {settings ? <dl className="definition-list"><div><dt>Nom</dt><dd>{settings.name}</dd></div><div><dt>Secteur</dt><dd>{settings.sectorKey}</dd></div><div><dt>Fuseau horaire</dt><dd>{settings.timezone}</dd></div><div><dt>Langue</dt><dd>{settings.language.toUpperCase()}</dd></div><div><dt>Devise</dt><dd>{settings.currency}</dd></div></dl> : <p className="panel-copy">Les paramètres de l’organisation sont temporairement indisponibles.</p>}
        </article>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">RÈGLES DE VALEUR</span><h2>Ce qui mérite une attention renforcée</h2></div><StatusPill tone={valuePolicy.enabled ? "good" : valuePolicy.configured ? "neutral" : "warning"}>{valuePolicy.enabled ? "Active" : valuePolicy.configured ? "Désactivée" : "À configurer"}</StatusPill></div>
          <p className="panel-copy">Aucun montant ni délai n’est considéré comme une vérité CVC. Votre entreprise définit ses propres règles.</p>
          <Link href="/app/parametres/politiques" className="button ghost small">Configurer les règles</Link>
        </article>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">AUTOMATISATIONS</span><h2>Ce que SESIRA peut faire</h2></div><StatusPill tone={automation.actionableCount > 0 ? "good" : automation.observationOnlyCount > 0 ? "warning" : "neutral"}>{automation.actionableCount > 0 ? "Prêtes à agir" : automation.observationOnlyCount > 0 ? "Observation" : "Non configuré"}</StatusPill></div>
          <div className="premium-data-list"><div><span>Configurées</span><strong>{automation.configuredCount}</strong></div><div><span>Autorisées à agir</span><strong>{automation.actionableCount}</strong></div><div><span>Observation uniquement</span><strong>{automation.observationOnlyCount}</strong></div><div><span>Désactivées</span><strong>{automation.disabledCount}</strong></div></div>
          <p className="panel-copy">Une connexion ou une règle visible ici ne contourne jamais l’autorisation des actions externes.</p>
          <Link href="/app/automatisations" className="button ghost small">Voir les automatisations</Link>
        </article>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">VOS DONNÉES</span><h2>Récupérer les données de l’entreprise</h2></div><StatusPill tone="good">JSON + CSV</StatusPill></div>
          <p className="panel-copy">L’export contient les données stockées par SESIRA et rattachées à votre organisation, y compris les domaines C40. Les secrets techniques et jetons d’accès sont retirés. L’export ne dépend pas de votre abonnement.</p>
          <div className="premium-focus-actions">
            <a className="button primary small" href="/app/parametres/export/json">Télécharger en JSON</a>
            <a className="button ghost small" href="/app/parametres/export/csv">Télécharger en CSV</a>
          </div>
          <p className="premium-muted-copy">Le CSV est un format long : jeu de données, numéro de ligne, champ, valeur. Il reste lisible dans un tableur et ne perd pas les champs imbriqués.</p>
        </article>
      </section>
    </>
  );
}
