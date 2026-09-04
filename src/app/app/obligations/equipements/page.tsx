import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList } from "@/lib/data";
import { getRegulatoryWorkspace } from "@/lib/data/c40-ui";

export const dynamic = "force-dynamic";

export default async function EquipmentObligationsPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;
  const [workspace, customers] = await Promise.all([
    getRegulatoryWorkspace(viewer.organization.id),
    getCustomerList(viewer.organization.id, { limit: 500 }),
  ]);
  if (workspace.status === "ERROR") {
    return <><PageHeader eyebrow="OBLIGATIONS CVC" title="Équipements & fluides" description="Échéances et données réglementaires suivies par équipement." /><Unavailable /></>;
  }
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.displayName] as const));
  const rows = workspace.data.equipment;
  const withDue = rows.filter((row) => row.nextLeakCheck?.status === "DUE").length;
  const unknown = rows.filter((row) => row.nextLeakCheck?.status === "UNAVAILABLE").length;

  return (
    <>
      <PageHeader eyebrow="OBLIGATIONS CVC" title="Équipements & fluides" description="SESIRA affiche les données connues, la règle utilisée et la prochaine échéance calculée. Il ne rend aucun verdict de conformité." />
      <section className="workspace-stat-strip" aria-label="État des équipements">
        <div><strong>{rows.length}</strong><span>Équipements</span></div>
        <div><strong>{withDue}</strong><span>Échéances calculées</span></div>
        <div><strong>{workspace.data.attentions.length}</strong><span>Points à regarder</span></div>
        <div><strong>{unknown}</strong><span>Calculs indisponibles</span></div>
      </section>
      <section className="workspace-boundary-note"><StatusPill>Pas de verdict</StatusPill><p>Une échéance calculée dépend des données enregistrées et de la règle de référence conservée par SESIRA. Une donnée manquante reste visible comme manquante.</p></section>
      {rows.length ? (
        <section className="workspace-list" aria-label="Équipements suivis">
          {rows.map((row) => (
            <article className="workspace-row" key={row.id}>
              <div className="workspace-row-main">
                <div className="workspace-row-heading">
                  <div><span className="eyebrow">{customerNames.get(row.customerId) ?? "Client"}</span><h2>{row.label}</h2></div>
                  <StatusPill tone={row.nextLeakCheck?.status === "UNAVAILABLE" ? "warning" : "neutral"}>{equipmentStatus(row.status)}</StatusPill>
                </div>
                <div className="workspace-meta">
                  <span><b>Fluide</b>{row.fluidCode ?? "Non renseigné"}</span>
                  <span><b>Charge</b>{row.chargeKg === null ? "Non renseignée" : `${row.chargeKg} kg`}</span>
                  <span><b>Dernier contrôle</b>{row.lastLeakCheckAt ? formatDate(row.lastLeakCheckAt) : "Non renseigné"}</span>
                  <span><b>Installation</b>{row.installationAddress ?? "Non renseignée"}</span>
                </div>
                {row.nextLeakCheck?.status === "DUE" ? (
                  <div className="workspace-preview">
                    <span>Prochaine vérification calculée</span>
                    <p>{formatDate(row.nextLeakCheck.nextDueAt)} · cadence {row.nextLeakCheck.cadenceDays} j · {formatNumber(row.nextLeakCheck.tco2eq)} tCO₂e</p>
                    <small>Référence enregistrée : {row.nextLeakCheck.sourceRef}{row.nextLeakCheck.detectorDoubled ? " · intervalle doublé par détection enregistrée" : ""}</small>
                  </div>
                ) : row.nextLeakCheck?.status === "OUT_OF_SCOPE" ? (
                  <p className="workspace-action-note">Aucune échéance n’est produite par la règle applicable aux données enregistrées à cette date.</p>
                ) : (
                  <div className="workspace-gap-box"><strong>Calcul indisponible</strong><p>SESIRA ne remplace pas ce calcul par une valeur supposée.</p></div>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : <EmptyState title="Aucun équipement suivi" description="Les équipements apparaîtront ici lorsqu’ils seront enregistrés dans votre espace." />}
    </>
  );
}

function Unavailable() { return <section className="app-state-message"><strong>Données indisponibles</strong><p>SESIRA ne peut pas lire ce suivi de manière fiable pour le moment.</p></section>; }
function equipmentStatus(status: string) { return ({ ACTIVE: "Actif", INACTIVE: "Inactif", DECOMMISSIONED: "Retiré" } as Record<string, string>)[status] ?? status; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date); }
function formatNumber(value: number) { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value); }
