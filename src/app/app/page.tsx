import Link from "next/link";
import { MetricCard, PageHeader, StatusPill } from "@/components/sesira/ui";

export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="AUJOURD'HUI" title="Vue d'ensemble" description="Une lecture simple de ce qui mérite votre attention." actions={<Link href="/app/onboarding" className="button primary small">Configurer SESIRA</Link>} />
      <section className="metrics-grid">
        <MetricCard label="Clients actifs" note="Source à connecter" />
        <MetricCard label="Devis ouverts" note="Source à connecter" />
        <MetricCard label="À relancer" note="Suivi à configurer" />
        <MetricCard label="E-mails reliés" note="Messagerie à connecter" />
      </section>
      <section className="dashboard-grid">
        <article className="panel panel-large">
          <div className="panel-head"><div><span className="eyebrow">PRIORITÉS</span><h2>Rien à arbitrer pour le moment.</h2></div><StatusPill>Non connecté</StatusPill></div>
          <div className="priority-empty"><div className="priority-line" /><p>Connectez vos premières données pour que SESIRA puisse construire cette vue.</p></div>
        </article>
        <article className="panel">
          <div className="panel-head"><div><span className="eyebrow">SYSTÈME</span><h2>État des connexions</h2></div></div>
          <div className="connection-list">
            <div><span>Entreprise</span><StatusPill tone="warning">À compléter</StatusPill></div>
            <div><span>Équipe</span><StatusPill>Non connecté</StatusPill></div>
            <div><span>Données</span><StatusPill>Non connecté</StatusPill></div>
            <div><span>E-mail</span><StatusPill>Non connecté</StatusPill></div>
          </div>
        </article>
      </section>
    </>
  );
}
