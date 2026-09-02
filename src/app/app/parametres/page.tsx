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
      <PageHeader eyebrow="07 · SYSTÈME" title="Paramètres" description="L’identité réelle de votre espace et les règles de fonctionnement confirmées par le Core." />
      <section className="settings-stack">
        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">ESPACE</span><h2>Organisation</h2></div><StatusPill tone={settings?.status === "ACTIVE" ? "good" : "neutral"}>{settings?.status ?? "Indisponible"}</StatusPill></div>
          {settings ? <dl className="definition-list"><div><dt>Nom</dt><dd>{settings.name}</dd></div><div><dt>Secteur</dt><dd>{settings.sectorKey}</dd></div><div><dt>Fuseau horaire</dt><dd>{settings.timezone}</dd></div><div><dt>Langue</dt><dd>{settings.language.toUpperCase()}</dd></div><div><dt>Devise</dt><dd>{settings.currency}</dd></div></dl> : <p className="panel-copy">Les paramètres de l’organisation sont temporairement indisponibles.</p>}
        </article>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">POLITIQUES DE VALEUR</span><h2>Ce qui mérite une attention renforcée</h2></div><StatusPill tone={valuePolicy.enabled ? "good" : valuePolicy.configured ? "neutral" : "warning"}>{valuePolicy.enabled ? "Active" : valuePolicy.configured ? "Désactivée" : "À configurer"}</StatusPill></div>
          <p className="panel-copy">Aucun montant ni délai n’est considéré comme une vérité CVC. Votre organisation définit ses propres règles.</p>
          <Link href="/app/parametres/politiques" className="button ghost small">Configurer les politiques</Link>
        </article>

        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">COMPORTEMENT</span><h2>Automatisations</h2></div><StatusPill tone={automation.actionableCount > 0 ? "good" : automation.observationOnlyCount > 0 ? "warning" : "neutral"}>{automation.actionableCount > 0 ? "Actionnable" : automation.observationOnlyCount > 0 ? "Observation" : "Non configuré"}</StatusPill></div>
          <div className="premium-data-list"><div><span>Configurations</span><strong>{automation.configuredCount}</strong></div><div><span>Actionnables</span><strong>{automation.actionableCount}</strong></div><div><span>Observation uniquement</span><strong>{automation.observationOnlyCount}</strong></div><div><span>Désactivées</span><strong>{automation.disabledCount}</strong></div></div>
          <p className="panel-copy">Une connexion ou une configuration visible ici ne contourne jamais le garde fou des actions externes.</p>
        </article>
      </section>
    </>
  );
}
