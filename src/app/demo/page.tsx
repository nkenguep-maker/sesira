import Link from "next/link";

import { EmptyState, StatusPill } from "@/components/sesira/ui";
import { getManagerToday, type TodayAction } from "@/lib/data/today-c40";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";
import { getDemoDashboardMetrics } from "@/lib/demo/dashboard";

export const dynamic = "force-dynamic";

export default async function DemoTodayPage() {
  const [today, metrics] = await Promise.all([
    getManagerToday(DEMO_ORGANIZATION_ID, { includePlatform: false }),
    getDemoDashboardMetrics(DEMO_ORGANIZATION_ID),
  ]);

  return (
    <>
      <section style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-end", marginBottom: 24, paddingBottom: 22, borderBottom: "1px solid var(--line)" }}>
        <div>
          <span className="eyebrow">AUJOURD’HUI · THERMOPRO SERVICES</span>
          <h1 style={{ margin: "4px 0 6px", fontSize: "clamp(30px,4vw,48px)", letterSpacing: "-.035em" }}>Bonjour Marc.</h1>
          <p style={{ margin: 0, maxWidth: "65ch", color: "var(--ink-soft)" }}>Voici ce qui mérite votre attention aujourd’hui. Chaque nom, montant et situation de cet espace est fictif.</p>
        </div>
        <StatusPill tone="warning">Lecture seule</StatusPill>
      </section>

      <section className="workspace-stat-strip" aria-label="Résumé de la démonstration">
        <div><strong>{today.actions.length}</strong><span>À traiter aujourd’hui</span></div>
        <div><strong>{value(metrics.activeQuotes)}</strong><span>Devis en cours</span></div>
        <div><strong>{value(metrics.todayInterventions)}</strong><span>Interventions aujourd’hui</span></div>
        <div><strong>{value(metrics.overdueInvoices)}</strong><span>Factures en retard</span></div>
      </section>

      {today.actions.length ? (
        <section className="premium-connection-grid" style={{ marginTop: 24 }}>
          {today.actions.map((item) => (
            <article key={item.id} className="premium-connection-card">
              <header>
                <div><span className="eyebrow">{category(item.category)}</span><h2>{item.title}</h2></div>
                <StatusPill tone={item.priority === 1 ? "warning" : "neutral"}>{item.action}</StatusPill>
              </header>
              <p style={{ color: "var(--ink-soft)", margin: "10px 0 18px" }}>{item.detail}</p>
              <Link className="button secondary small" href={demoHref(item)}>Ouvrir dans la démo</Link>
            </article>
          ))}
        </section>
      ) : <EmptyState title="Rien à traiter" description="Le scénario ne contient actuellement aucune situation ouverte." />}

      <section className="premium-trust-note">
        <span className="eyebrow">DÉMONSTRATION</span>
        <h2>Cette surface est séparée du vrai SESIRA.</h2>
        <p>/demo est en lecture seule. Elle n’envoie aucun message, ne modifie aucune donnée métier et ne bascule jamais vers /app.</p>
      </section>
    </>
  );
}

function value(input: number | null) { return input === null ? "—" : String(input); }
function category(input: TodayAction["category"]) {
  const labels: Record<TodayAction["category"], string> = { COMMERCIAL: "Devis", CHANTIER: "Chantier", RAPPORT: "Rapport terrain", FACTURE: "Facture", ENTRETIEN: "Entretien", OBLIGATION: "Obligation CVC", TERRAIN: "Terrain", SESIRA: "SESIRA" };
  return labels[input];
}
function demoHref(item: TodayAction) {
  if (item.category === "FACTURE") return "/demo/factures";
  if (item.category === "ENTRETIEN") return "/demo/maintenance";
  if (item.category === "OBLIGATION") return "/demo/obligations";
  if (["RAPPORT", "CHANTIER", "TERRAIN"].includes(item.category)) return "/demo/interventions";
  return "/demo/devis";
}
