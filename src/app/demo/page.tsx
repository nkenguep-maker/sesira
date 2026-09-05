import Link from "next/link";

import { DemoCommandCenter } from "@/components/sesira/demo-command-center";
import { StatusPill } from "@/components/sesira/ui";
import { getManagerToday } from "@/lib/data/today-c40";
import { getDemoCommunications } from "@/lib/demo/communications";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";
import { getDemoDashboardMetrics } from "@/lib/demo/dashboard";

export const dynamic = "force-dynamic";

export default async function DemoTodayPage() {
  const [today, metrics, communications] = await Promise.all([
    getManagerToday(DEMO_ORGANIZATION_ID, { includePlatform: false }),
    getDemoDashboardMetrics(DEMO_ORGANIZATION_ID),
    getDemoCommunications(),
  ]);

  return (
    <>
      <section className="demo-hero">
        <div>
          <span className="eyebrow">AUJOURD’HUI · THERMOPRO SERVICES</span>
          <h1>Bonjour Marc.</h1>
          <p>Pas un tableau de bord générique : choisissez un dossier et regardez comment SESIRA fait circuler l’information entre devis, relances, terrain, factures et maintenance.</p>
        </div>
        <div className="demo-hero-side">
          <StatusPill tone="warning">Lecture seule</StatusPill>
          <span>Toutes les personnes, sociétés et situations sont fictives.</span>
        </div>
      </section>

      <section className="workspace-stat-strip" aria-label="Résumé de la démonstration">
        <div><strong>{today.actions.length}</strong><span>Situations à traiter</span></div>
        <div><strong>{value(metrics.activeQuotes)}</strong><span>Devis en cours</span></div>
        <div><strong>{value(metrics.todayInterventions)}</strong><span>Interventions aujourd’hui</span></div>
        <div><strong>{value(metrics.overdueInvoices)}</strong><span>Facture en retard</span></div>
      </section>

      <DemoCommandCenter communications={communications} />

      <section className="demo-real-queue">
        <div className="demo-section-heading">
          <div><span className="eyebrow">FILE DU TENANT FICTIF</span><h2>Ce que SESIRA a réellement détecté dans les données de la démo</h2></div>
          <Link href="/demo/automatisations" className="demo-text-link">Comprendre les règles →</Link>
        </div>
        <div className="demo-queue-list">
          {today.actions.slice(0, 7).map((item) => (
            <div className="demo-queue-row" key={item.id}>
              <span className={`demo-priority p${item.priority}`} aria-hidden="true" />
              <div><strong>{item.title}</strong><span>{item.detail}</span></div>
              <StatusPill tone={item.priority === 1 ? "warning" : "neutral"}>{item.action}</StatusPill>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function value(input: number | null) { return input === null ? "—" : String(input); }
