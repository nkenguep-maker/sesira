import { StandaloneHeader } from "@/components/sesira/standalone-header";
import type { AutomationCard, AutomationLevel } from "@/lib/automations/contracts";

/* eslint-disable react/no-unescaped-entities */

const modeNames: Record<AutomationLevel, string> = {
  OBSERVATION: "Observation",
  SHADOW: "Il vous montre",
  APPROVAL: "Validation",
  AUTOMATIC: "Automatisation contrôlée",
};

const otherProcesses = [
  ["Nouvelles demandes", "À configurer", "normal"],
  ["Rapports", "À configurer", "normal"],
  ["Documents", "Aperçu", "muted"],
  ["Factures", "En développement", "future"],
] as const;

export function AutomationsScreen({ cards }: { cards: AutomationCard[] }) {
  const current = cards[0]?.level ?? "OBSERVATION";

  return (
    <div className="standalone-page automation-ref">
      <StandaloneHeader label="Automatisations" />
      <main>
        <h1>Automatisations</h1>
        <p className="automation-ref-lede">Sesira surveille vos processus selon les règles définies avec votre entreprise.</p>
        {cards.length ? <AutomationOverview cards={cards} current={current} /> : <EmptyAutomation />}
      </main>
    </div>
  );
}

function AutomationOverview({ cards, current }: { cards: AutomationCard[]; current: AutomationLevel }) {
  const first = cards[0];
  const activity = first?.activityAvailable ? first.recentActivity.length : null;
  const health = first?.health.label === "Stable" ? "En bon état" : first?.health.label ?? "non exposée";

  return (
    <>
      <section className="automation-ref-summary" aria-label="Résumé">
        <Summary value={String(cards.length)} label="Automatisations actives" blue />
        <Summary value={modeNames[current]} label="Mode" />
        <Summary value="non exposé" label="Dossiers surveillés" blue />
        <Summary value="non exposé" label="À valider" />
      </section>
      <article className="automation-ref-card">
        <header><h2>Relance des devis</h2><span>{first?.status === "ACTIVE" ? "Actif" : "Inactif"}</span></header>
        <div>
          <Fact label="Mode"><b>{modeNames[current]}</b></Fact>
          <Fact label="Dossiers surveillés"><b>non exposé</b></Fact>
          <Fact label="Aujourd'hui"><span>{activity === null ? "activité non exposée" : `${activity} activité${activity > 1 ? "s" : ""}`}</span></Fact>
          <Fact label="Santé"><b className={first?.health.tone === "emerald" ? "blue" : "copper"}>{health}</b></Fact>
        </div>
      </article>
      <p className="automation-ref-label">Autres processus</p>
      <section className="automation-ref-other">
        {otherProcesses.map(([name, status, tone]) => <div className={tone} key={name}><span>{name}</span><small>{status}</small></div>)}
      </section>
      <p className="automation-ref-note">Aucun de ces processus n'est actif. Ils apparaissent ici avec leur état réel.</p>
    </>
  );
}

function Summary({ value, label, blue = false }: { value: string; label: string; blue?: boolean }) {
  return <div><strong className={blue ? "blue" : ""}>{value}</strong><span>{label}</span></div>;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><span>{label}</span>{children}</div>;
}

function EmptyAutomation() {
  return <section className="automation-ref-empty"><h2>Aucune automatisation active.</h2><p>Sesira peut commencer par observer le suivi de vos devis.</p><span>Configuration en cours.</span></section>;
}
