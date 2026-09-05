"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { DemoCommunication } from "@/lib/demo/communications";
import { DEMO_STORIES } from "@/lib/demo/stories";

export function DemoCommandCenter({ communications }: { communications: DemoCommunication[] }) {
  const [activeId, setActiveId] = useState(DEMO_STORIES[0].id);
  const [simulation, setSimulation] = useState<string | null>(null);
  const story = DEMO_STORIES.find((item) => item.id === activeId) ?? DEMO_STORIES[0];
  const communication = useMemo(
    () => story.threadKey ? communications.find((item) => item.threadKey === story.threadKey) ?? null : null,
    [communications, story.threadKey],
  );

  function choose(id: string) {
    setActiveId(id);
    setSimulation(null);
  }

  return (
    <section className="demo-command-center" aria-label="Démonstration guidée SESIRA">
      <div className="demo-command-head">
        <div>
          <span className="eyebrow">DÉMONSTRATION GUIDÉE</span>
          <h2>Suivez un dossier à travers SESIRA</h2>
          <p>Choisissez une situation. La démo montre le déclencheur, les outils qui se parlent et l’endroit précis où l’humain reprend la main.</p>
        </div>
        <span className="demo-live-chip">6 scénarios métier</span>
      </div>

      <div className="demo-story-picker" role="tablist" aria-label="Scénarios">
        {DEMO_STORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === story.id}
            className={item.id === story.id ? "active" : ""}
            onClick={() => choose(item.id)}
          >
            <strong>{item.customer}</strong>
            <span>{item.title}</span>
          </button>
        ))}
      </div>

      <div className="demo-story-workspace">
        <article className="demo-case-card">
          <span className="eyebrow">LE DOSSIER</span>
          <div className="demo-case-title">
            <div><h3>{story.customer}</h3><p>{story.title}</p></div>
            {story.amount ? <strong>{story.amount}</strong> : null}
          </div>
          <dl className="demo-case-facts">
            <div><dt>Ce qui se passe</dt><dd>{story.problem}</dd></div>
            <div><dt>Déclencheur</dt><dd>{story.trigger}</dd></div>
            <div><dt>Ce que SESIRA prépare</dt><dd>{story.prepared}</dd></div>
            <div className="human"><dt>Limite</dt><dd>{story.boundary}</dd></div>
          </dl>
        </article>

        <article className="demo-flow-card">
          <span className="eyebrow">COMMENT LES OUTILS SE PARLENT</span>
          <div className="demo-flow-steps">
            {story.steps.map((step, index) => (
              <div className="demo-flow-step" key={`${story.id}-${step.tool}-${index}`}>
                <div className="demo-flow-index">{index + 1}</div>
                <div>
                  <Link href={step.href}>{step.tool}</Link>
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="demo-message-card">
          <div className="demo-message-head">
            <div>
              <span className="eyebrow">{communication?.direction === "INBOUND" ? "E-MAIL REÇU" : communication ? "E-MAIL PRÉPARÉ" : "DÉCISION PRÉPARÉE"}</span>
              <h3>{communication?.subject ?? story.title}</h3>
            </div>
            <span className={communication?.direction === "INBOUND" ? "demo-status received" : "demo-status draft"}>
              {communication?.direction === "INBOUND" ? "Reçu" : communication ? "Brouillon" : "À décider"}
            </span>
          </div>

          {communication ? (
            <div className="demo-email-sheet">
              <div><span>Client</span><strong>{communication.customerName}</strong></div>
              <div><span>Objet</span><strong>{communication.subject}</strong></div>
              <p>{communication.body}</p>
            </div>
          ) : (
            <div className="demo-email-sheet decision-only">
              <p>{story.prepared}</p>
              <p><strong>{story.boundary}</strong></p>
            </div>
          )}

          {simulation ? (
            <div className="demo-simulation-result" role="status">
              <strong>{simulation}</strong>
              <span>La démonstration reste en lecture seule : aucune donnée n’a été modifiée et aucun message n’est parti.</span>
            </div>
          ) : null}

          <div className="demo-message-actions">
            <button type="button" className="button primary small" onClick={() => setSimulation(simulationCopy(story.id))}>{story.decisionLabel}</button>
            {communication ? <Link className="button secondary small" href="/demo/relances">Ouvrir toutes les communications</Link> : null}
            <Link className="demo-text-link" href="/demo/automatisations">Voir la règle qui a déclenché ce dossier →</Link>
          </div>
        </article>
      </div>
    </section>
  );
}

function simulationCopy(id: string) {
  if (id === "valmy") return "Automatisation arrêtée. Marc reprend la main pour décider du délai à proposer.";
  if (id === "dupont") return "Créneau choisi dans la démo. Le dossier passerait ensuite dans Interventions.";
  if (id === "rivet") return "Rapport validé dans la démo. Le compte rendu client serait maintenant prêt à être envoyé.";
  return "Validation simulée. Dans une vraie organisation, l’étape suivante serait autorisée selon les règles du dossier.";
}
