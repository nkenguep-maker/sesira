import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList } from "@/lib/data";
import { getMaintenanceWorkspace } from "@/lib/data/c32-workspaces";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const [result, customers] = await Promise.all([
    getMaintenanceWorkspace(viewer.organization.id),
    getCustomerList(viewer.organization.id, { limit: 500 }),
  ]);
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.displayName] as const));

  if (result.status === "ERROR") {
    return (
      <>
        <PageHeader eyebrow="OPÉRATIONS" title="Maintenance" description="Contrats, visites prévues et renouvellements." />
        <section className="app-state-message"><strong>Maintenance indisponible</strong><p>SESIRA ne peut pas lire les contrats pour le moment.</p></section>
      </>
    );
  }

  const rows = result.rows;
  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const expiring = rows.filter((row) => row.status === "EXPIRING_SOON").length;
  const expired = rows.filter((row) => row.status === "EXPIRED").length;
  const visitsDue = rows.filter((row) => isDueSoon(row.nextVisitDueAt, 30)).length;

  return (
    <>
      <PageHeader
        eyebrow="OPÉRATIONS"
        title="Maintenance"
        description="Suivez les contrats et les prochaines échéances. Les prix, conditions et résiliations restent décidés par votre équipe."
      />

      <section className="workspace-stat-strip" aria-label="État de la maintenance">
        <div><strong>{active}</strong><span>Actifs</span></div>
        <div><strong>{visitsDue}</strong><span>Visites sous 30 j</span></div>
        <div><strong>{expiring}</strong><span>À renouveler</span></div>
        <div><strong>{expired}</strong><span>Expirés</span></div>
      </section>

      <section className="workspace-boundary-note">
        <StatusPill>Suivi uniquement</StatusPill>
        <p>SESIRA fait remonter les échéances. Il ne renouvelle pas un contrat, ne change pas son prix et ne résilie rien depuis cette vue.</p>
      </section>

      {rows.length ? (
        <section className="workspace-list" aria-label="Contrats de maintenance">
          {rows.map((row) => (
            <article className="workspace-row" key={row.id}>
              <div className="workspace-row-main">
                <div className="workspace-row-heading">
                  <div><span className="eyebrow">{customerNames.get(row.customerId) ?? "Client"}</span><h2>{row.title}</h2></div>
                  <StatusPill tone={maintenanceTone(row.status)}>{maintenanceLabel(row.status)}</StatusPill>
                </div>
                <div className="workspace-meta">
                  <span><b>Prochaine visite</b>{row.nextVisitDueAt ? formatDate(row.nextVisitDueAt) : "Non planifiée"}</span>
                  <span><b>Cadence</b>{row.cadenceDays} jours</span>
                  <span><b>Fin de contrat</b>{row.endDate ? formatDate(row.endDate) : "Non renseignée"}</span>
                  <span><b>Valeur connue</b>{row.amount === null ? "Non renseignée" : formatAmount(row.amount, row.currency)}</span>
                </div>
                {row.renewalNoticeSentAt ? <p className="workspace-description">Avis de renouvellement enregistré le {formatDate(row.renewalNoticeSentAt)}.</p> : null}
                {row.status === "EXPIRING_SOON" || row.status === "EXPIRED" ? (
                  <div className="workspace-gap-box"><strong>À décider</strong><p>Préparer la suite avec le client. SESIRA ne déduit ni nouveau prix ni nouvelles conditions contractuelles.</p></div>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : <EmptyState title="Aucun contrat de maintenance" description="Les contrats actifs et leurs échéances apparaîtront ici lorsqu’ils seront enregistrés ou synchronisés." />}
    </>
  );
}

function isDueSoon(value: string | null, days: number) { if (!value) return false; const time = new Date(value).getTime(); if (Number.isNaN(time)) return false; const delta = time - Date.now(); return delta >= 0 && delta <= days * 86_400_000; }
function maintenanceTone(status: string): "good" | "warning" | "neutral" { if (status === "ACTIVE") return "good"; if (["EXPIRING_SOON", "EXPIRED"].includes(status)) return "warning"; return "neutral"; }
function maintenanceLabel(status: string) { return ({ DRAFT: "Brouillon", ACTIVE: "Actif", EXPIRING_SOON: "À renouveler", EXPIRED: "Expiré", CANCELLED: "Annulé" } as Record<string, string>)[status] ?? status; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date); }
function formatAmount(amount: number, currency: string) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
