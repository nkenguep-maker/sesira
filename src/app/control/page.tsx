import Link from "next/link";

import { SesiraLogo } from "@/components/sesira/logo";
import { getControlAccess, isControlAccessGranted } from "@/lib/control-center/access";
import { getAuthorizedControlCenterRepository } from "@/lib/control-center/authorized-repository";

export const dynamic = "force-dynamic";

const HEALTH_LABELS = {
  HEALTHY: "En bon état",
  DEGRADED: "Dégradé",
  CRITICAL: "Action requise",
  UNKNOWN: "État inconnu",
} as const;

export default async function ControlPage() {
  const access = await getControlAccess();

  if (!isControlAccessGranted(access)) {
    return (
      <main className="control-premium-shell">
        <ControlHeader />
        <section className="control-access-state">
          <span className="control-internal-badge">INTERNE</span>
          <h1>Control Center</h1>
          <h2>L’accès opérateur n’est pas encore configuré.</h2>
          <p>L’autorisation doit venir d’une identité interne vérifiée par le serveur. Un rôle dans une PME cliente ne donne jamais accès aux données des autres organisations.</p>
          <div className="control-safe-box">
            <strong>Aucune donnée d’organisation n’est chargée.</strong>
            <p>La page reste visible comme surface interne, mais les lectures du Control Center restent fermées tant que le core n’expose pas une autorité opérateur dédiée.</p>
          </div>
          <Link href="/app" className="button ghost">Retour à SESIRA</Link>
        </section>
      </main>
    );
  }

  const repository = await getAuthorizedControlCenterRepository();
  if (!repository) return null;
  const result = await repository.getOverview();

  return (
    <main className="control-premium-shell">
      <ControlHeader />
      <section className="control-premium-content">
        <div className="control-premium-heading">
          <span className="eyebrow">CENTRE DE CONTRÔLE</span>
          <h1>Control Center</h1>
          <p>Vue opérationnelle interne de SESIRA. Qu’est ce qui nécessite notre attention aujourd’hui ?</p>
        </div>

        {result.status === "unavailable" ? (
          <section className="control-safe-box large">
            <strong>Données internes indisponibles.</strong>
            <p>Le repository sécurisé n’expose pas encore les indicateurs globaux. Aucune donnée n’est inventée pour remplir cette vue.</p>
          </section>
        ) : (
          <>
            <section className="control-premium-metrics">
              <ControlMetric label="Organisations" value={String(result.data.organizationCount)} />
              <ControlMetric label="Santé des automatisations" value={HEALTH_LABELS[result.data.automationHealth]} />
              <ControlMetric label="Incidents ouverts" value={String(result.data.openIncidentCount)} />
              <ControlMetric label="Coût traitements SESIRA" value={formatMoney(result.data.aiCost)} />
              <ControlMetric label="Coût infrastructure" value={formatMoney(result.data.infrastructureCost)} />
            </section>
            <section className="control-premium-environment">
              <span className="eyebrow">ACTIONS EXTERNES · ENVIRONNEMENT</span>
              <strong>Lecture seule</strong>
              <p>Taux de réussite observé : {result.data.automationSuccessRate === null ? "Non disponible" : `${Math.round(result.data.automationSuccessRate * 1000) / 10} %`}. Aucune action opérateur n’est exposée depuis cet écran.</p>
              <small>{result.data.periodLabel} · Généré le {formatDate(result.generatedAt)}</small>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function ControlHeader() {
  return <header className="control-premium-header"><SesiraLogo /><span className="control-internal-badge">INTERNE</span></header>;
}

function ControlMetric({ label, value }: { label: string; value: string }) {
  return <article><strong>{value}</strong><span>{label}</span></article>;
}

function formatMoney(value: { amount: number; currency: string } | null) {
  if (!value) return "Non disponible";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: value.currency, maximumFractionDigits: 2 }).format(value.amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
