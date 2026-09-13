import Link from "next/link";

import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList } from "@/lib/data";
import { getMaintenanceWorkspace } from "@/lib/data/c32-workspaces";
import { getConfirmedDocumentLinkCounts } from "@/lib/data/document-links";

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
    return <><PageHeader eyebrow="CONTRATS" title="Maintenance" description="Contrats, visites et renouvellements à surveiller." /><section className="app-state-message"><strong>Maintenance indisponible</strong><p>SESIRA ne peut pas lire les contrats pour le moment.</p></section></>;
  }

  const rows = result.rows;
  const documentCounts = await getConfirmedDocumentLinkCounts(viewer.organization.id, "maintenance_contract", rows.map((row) => row.id));
  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const expiring = rows.filter((row) => row.status === "EXPIRING_SOON").length;
  const expired = rows.filter((row) => row.status === "EXPIRED").length;
  const visitsDue = rows.filter((row) => isDueSoon(row.nextVisitDueAt, 30)).length;

  return (
    <>
      <PageHeader
        eyebrow="CONTRATS"
        title="Maintenance"
        description="Voyez les prochaines visites, les renouvellements et les contrats que SESIRA a reconnus dans vos documents."
        actions={<Link className="button ghost" href="/app/interventions">Voir le planning</Link>}
      />

      {rows.length ? (
        <section className="workspace-stat-strip" aria-label="État de la maintenance">
          <div><strong>{active}</strong><span>Contrats actifs</span></div>
          <div><strong>{visitsDue}</strong><span>Visites sous 30 j</span></div>
          <div><strong>{expiring}</strong><span>À préparer</span></div>
          <div><strong>{expired}</strong><span>Expirés</span></div>
        </section>
      ) : null}

      {rows.length ? (
        <section className="workspace-list" aria-label="Contrats de maintenance">
          {rows.map((row) => {
            const documents = documentCounts.get(row.id) ?? 0;
            return (
              <article className="workspace-row" id={`maintenance-${row.id}`} key={row.id}>
                <div className="workspace-row-main">
                  <div className="workspace-row-heading">
                    <div><span className="eyebrow">{customerNames.get(row.customerId) ?? "Client"}</span><h2>{row.title}</h2></div>
                    <StatusPill tone={maintenanceTone(row.status)}>{maintenanceLabel(row.status)}</StatusPill>
                  </div>
                  <div className="workspace-meta">
                    <span><b>Prochaine visite</b>{row.nextVisitDueAt ? formatDate(row.nextVisitDueAt) : "Non planifiée"}</span>
                    <span><b>Cadence</b>{row.cadenceDays} jours</span>
                    <span><b>Fin de contrat</b>{row.endDate ? formatDate(row.endDate) : "Non renseignée"}</span>
                    <span><b>Documents</b>{documents ? `${documents} relié${documents > 1 ? "s" : ""}` : "Aucun"}</span>
                  </div>
                  {row.renewalNoticeSentAt ? <p className="workspace-description">Avis de renouvellement enregistré le {formatDate(row.renewalNoticeSentAt)}.</p> : null}
                </div>
                <div className="workspace-row-actions">
                  <div className={row.status === "EXPIRING_SOON" || row.status === "EXPIRED" ? "workspace-gap-box" : "workspace-preview"}>
                    <span>Prochaine étape</span>
                    <p>{maintenanceNextStep(row.status, row.nextVisitDueAt)}</p>
                  </div>
                  {documents ? <Link className="button ghost small" href={`/app/documents?entity=maintenance_contract&entityId=${row.id}`}>Voir les documents</Link> : null}
                  {row.nextVisitDueAt ? <Link className="button ghost small" href="/app/interventions">Ouvrir le planning</Link> : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : <EmptyState title="Aucun contrat de maintenance" description="Les contrats apparaîtront ici lorsqu’ils seront enregistrés ou synchronisés." action={<Link className="button primary" href="/app/imports">Importer des données</Link>} />}

      <section className="premium-trust-note"><span className="eyebrow">DÉCISION HUMAINE</span><h2>SESIRA prépare l’échéance, pas la décision contractuelle.</h2><p>SESIRA peut reconnaître et rattacher le contrat d’origine, mais ne le renouvelle pas et ne change pas son prix. Le renouvellement, les nouvelles conditions et une éventuelle résiliation restent décidés par votre entreprise.</p></section>
    </>
  );
}

function maintenanceNextStep(status: string, nextVisitDueAt: string | null) { if (status === "EXPIRING_SOON") return "Préparez la discussion de renouvellement avec le client."; if (status === "EXPIRED") return "Le contrat est expiré. Vérifiez la relation client avant toute suite."; if (nextVisitDueAt && isDueSoon(nextVisitDueAt, 30)) return "Une visite approche. Vérifiez qu’elle est bien planifiée."; return "Aucune action immédiate n’est signalée."; }
function isDueSoon(value: string | null, days: number) { if (!value) return false; const time = new Date(value).getTime(); if (Number.isNaN(time)) return false; const delta = time - Date.now(); return delta >= 0 && delta <= days * 86_400_000; }
function maintenanceTone(status: string): "good" | "warning" | "neutral" { if (status === "ACTIVE") return "good"; if (["EXPIRING_SOON", "EXPIRED"].includes(status)) return "warning"; return "neutral"; }
function maintenanceLabel(status: string) { return ({ DRAFT: "Brouillon", ACTIVE: "Actif", EXPIRING_SOON: "À préparer", EXPIRED: "Expiré", CANCELLED: "Annulé" } as Record<string, string>)[status] ?? status; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date); }
