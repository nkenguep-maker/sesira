import Link from "next/link";

import { PageHeader, StatusPill } from "@/components/sesira/ui";
import { DEMO_STORIES } from "@/lib/demo/stories";

export default function DemoAutomationsPage() {
  return (
    <>
      <PageHeader eyebrow="DÉMO · AUTOMATISATIONS" title="Ce qui déclenche SESIRA, ce qu’il prépare, et quand il s’arrête" description="Les règles ci-dessous expliquent les six scénarios de démonstration. Elles montrent la circulation de l’information, pas une promesse d’action autonome illimitée." />

      <section className="demo-automation-grid">
        {DEMO_STORIES.map((story, index) => (
          <article className="demo-automation-card" key={story.id}>
            <header>
              <div><span className="eyebrow">RÈGLE DÉMO {String(index + 1).padStart(2, "0")}</span><h2>{automationName(story.id)}</h2></div>
              <StatusPill tone={story.id === "valmy" ? "warning" : "good"}>{story.id === "valmy" ? "Arrêt humain" : "Préparation"}</StatusPill>
            </header>
            <div className="demo-automation-rule">
              <div><span>Quand</span><strong>{story.trigger}</strong></div>
              <div><span>SESIRA fait</span><strong>{story.prepared}</strong></div>
              <div className="stop"><span>SESIRA s’arrête</span><strong>{story.boundary}</strong></div>
            </div>
            <div className="demo-mini-flow">
              {story.steps.map((step, stepIndex) => (
                <span key={`${story.id}-${stepIndex}`}><Link href={step.href}>{step.tool}</Link>{stepIndex < story.steps.length - 1 ? <i>→</i> : null}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="demo-trust-panel">
        <div><span className="eyebrow">IMPORTANT</span><h2>Dans cette démo, « automatiser » veut surtout dire ne plus oublier.</h2></div>
        <p>SESIRA surveille les états déterministes, prépare les prochaines actions et remonte les exceptions. Prix, négociation, litiges, engagement client et décisions sensibles restent humains.</p>
        <Link className="button primary small" href="/demo">Rejouer les scénarios</Link>
      </section>
    </>
  );
}

function automationName(id: string) {
  const labels: Record<string, string> = {
    lefevre: "Devis sans réponse → relance préparée",
    valmy: "Réponse sensible → arrêt et décision humaine",
    dupont: "Devis gagné sans chantier → sujet planning",
    garage: "Promesse de paiement dépassée → relance préparée",
    rivet: "Rapport terrain relu → compte rendu client préparé",
    martin: "Contrat proche de l’échéance → renouvellement préparé",
  };
  return labels[id] ?? id;
}
