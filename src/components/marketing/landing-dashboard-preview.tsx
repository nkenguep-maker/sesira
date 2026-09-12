"use client";

import { useEffect, useState } from "react";

const PRIORITIES = [
  {
    tone: "quote",
    code: "D",
    kind: "DEVIS",
    title: "Sophie Lefèvre · DV-2026-0421",
    detail: "18 450 € · aucune réponse enregistrée depuis 7 jours",
    action: "Voir le devis",
  },
  {
    tone: "invoice",
    code: "F",
    kind: "FACTURE",
    title: "Garage Montreuil · F-2026-0418",
    detail: "21 800 € · promesse de règlement dépassée",
    action: "Décider du suivi",
  },
  {
    tone: "field",
    code: "C",
    kind: "CHANTIER",
    title: "Dupont SARL · DV-2026-0412",
    detail: "Devis signé · aucune date au planning",
    action: "Planifier",
  },
  {
    tone: "report",
    code: "R",
    kind: "RAPPORT",
    title: "Intervention #1842 · Boulangerie Rivet",
    detail: "Technicien terminé · rapport à valider",
    action: "Valider",
  },
  {
    tone: "maintenance",
    code: "M",
    kind: "ENTRETIEN",
    title: "Martin & Fils · contrat annuel",
    detail: "Renouvellement dans 26 jours",
    action: "Préparer",
  },
] as const;

const FIELD = [
  { time: "08:00", title: "Remplacement pressostat", meta: "Karim D. · Grenoble", status: "Terminée", tone: "done" },
  { time: "10:15", title: "Préparation groupe froid", meta: "Marc D. · Grenoble", status: "En cours", tone: "active" },
  { time: "11:30", title: "Contrôle groupe froid 02", meta: "Sophie M. · Meylan", status: "Sur place", tone: "neutral" },
] as const;

const NAV = ["Tableau de bord", "File de décisions", "Clients", "Devis", "Interventions", "Factures", "Obligations"] as const;

export function LandingDashboardPreview() {
  const [todayLabel, setTodayLabel] = useState("Aujourd’hui");

  useEffect(() => {
    const formatted = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
    setTodayLabel(`Aujourd’hui · ${formatted}`);
  }, []);

  return (
    <div className="landing-product-preview" aria-label="Aperçu simplifié du tableau de bord SESIRA avec cinq actions prioritaires">
      <aside className="landing-product-sidebar" aria-hidden="true">
        <div className="landing-product-brand">
          <span className="landing-product-mark">S</span>
          <div><strong>SESIRA</strong><small>THERMOPRO · DÉMO</small></div>
        </div>
        <span className="landing-product-nav-label">Navigation</span>
        <nav>
          {NAV.map((item, index) => (
            <span key={item} className={index === 0 ? "active" : undefined}>
              <i>{index === 0 ? "▦" : index === 1 ? "✓" : index === 2 ? "◎" : index === 3 ? "D" : index === 4 ? "□" : index === 5 ? "€" : "◇"}</i>
              {item}
            </span>
          ))}
        </nav>
        <div className="landing-product-sidebar-bottom">
          <span>Automatisations</span>
          <span>Résultats</span>
        </div>
      </aside>

      <section className="landing-product-canvas">
        <header className="landing-product-topbar">
          <div><strong>Tableau de bord</strong><span>THERMOPRO SERVICES</span></div>
          <div className="landing-product-topbar-actions">
            <span className="landing-product-autonomy"><i /> Autonomie</span>
            <span className="landing-product-search">⌕ Rechercher un client</span>
            <b>T</b>
          </div>
        </header>

        <div className="landing-product-content">
          <div className="landing-product-heading">
            <div>
              <span>{todayLabel}</span>
              <h3>5 choses à faire.</h3>
              <p>Voici ce qui mérite votre attention maintenant.</p>
            </div>
            <span className="landing-product-demo-badge">Données fictives</span>
          </div>

          <div className="landing-product-kpis" aria-hidden="true">
            <article><span className="violet">!</span><div><small>À décider</small><strong>5</strong></div></article>
            <article><span className="blue">D</span><div><small>Devis en attente</small><strong>64 450 €</strong></div></article>
            <article><span className="rose">€</span><div><small>Factures échues</small><strong>21 800 €</strong></div></article>
            <article><span className="green">T</span><div><small>Terrain aujourd’hui</small><strong>5</strong></div></article>
          </div>

          <div className="landing-product-workspace">
            <section className="landing-product-priorities">
              <header><div><span>Priorités</span><h4>À faire maintenant</h4></div><b>5 sujets</b></header>
              <div className="landing-priority-list">
                {PRIORITIES.map((item) => (
                  <article key={item.title}>
                    <span className={`landing-priority-icon ${item.tone}`}>{item.code}</span>
                    <div className="landing-priority-copy">
                      <span>{item.kind}</span>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </div>
                    <span className="landing-priority-action">{item.action}</span>
                  </article>
                ))}
              </div>
            </section>

            <aside className="landing-product-field" aria-hidden="true">
              <header><div><span>Terrain</span><h4>Aujourd’hui</h4></div><b>Planning</b></header>
              <div className="landing-field-summary"><strong>5<small>interventions</small></strong><strong>1<small>rapport</small></strong><strong>0<small>conflit</small></strong></div>
              <div className="landing-field-list">
                {FIELD.map((item) => (
                  <article key={`${item.time}-${item.title}`}>
                    <b>{item.time}</b>
                    <div><strong>{item.title}</strong><small>{item.meta}</small></div>
                    <span className={item.tone}>{item.status}</span>
                  </article>
                ))}
              </div>
              <div className="landing-field-footer"><span>Prochaine</span><strong>14:00 · Maintenance CTA</strong></div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
