import { OfflineFieldCapture } from "@/components/terrain/offline-field-capture";
import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getOrganizationSettings } from "@/lib/data";
import { getTechnicianWorkspace } from "@/lib/data/c40-ui";

import { arriveAtInterventionAction, resolveFieldConflictAction, startInterventionAction } from "./actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string; date?: string }>;

export default async function FieldPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;
  const settings = await getOrganizationSettings(viewer.organization.id);
  const timezone = settings?.timezone ?? "Europe/Paris";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : localIsoDate(timezone);
  const workspace = await getTechnicianWorkspace(viewer.organization.id, viewer.userId, date);

  if (workspace.status === "ERROR") {
    return <><PageHeader eyebrow="TERRAIN" title="Ma journée" description="Interventions assignées et saisie terrain." /><section className="app-state-message"><strong>Journée indisponible</strong><p>SESIRA ne peut pas lire vos interventions terrain pour le moment.</p></section></>;
  }
  const { interventions, conflicts } = workspace.data;
  return (
    <>
      <PageHeader eyebrow="TERRAIN" title="Ma journée" description="Vos interventions assignées. Notes, anomalies, mesures et pièces peuvent rester sur cet appareil si la connexion tombe, puis être synchronisées sans doublon." />
      <ResultNotice result={params.result} />
      <section className="workspace-stat-strip"><div><strong>{interventions.length}</strong><span>Interventions</span></div><div><strong>{interventions.filter((row) => row.status === "IN_PROGRESS").length}</strong><span>En cours</span></div><div><strong>{interventions.filter((row) => row.status === "COMPLETED").length}</strong><span>Terminées</span></div><div><strong>{conflicts.length}</strong><span>À vérifier</span></div></section>

      {conflicts.length ? <section id="conflits" className="workspace-section"><div className="workspace-section-heading"><div><span className="eyebrow">À VÉRIFIER</span><h2>Données reçues après un changement du chantier</h2></div><StatusPill tone="warning">{conflicts.length}</StatusPill></div><div className="workspace-list compact-list">{conflicts.map((item) => <article className="workspace-row" key={item.artifactId}><div className="workspace-row-main"><div className="workspace-row-heading"><div><span className="eyebrow">{artifactLabel(item.artifactKind)}</span><h2>Élément terrain à arbitrer</h2></div><StatusPill tone="warning">À vérifier</StatusPill></div><p className="workspace-description">{item.conflictReason ?? "SESIRA a conservé cet élément mais ne l’a pas appliqué automatiquement."}</p><div className="workspace-meta"><span><b>Capturé</b>{formatDateTime(item.capturedAt)}</span><span><b>Reçu</b>{formatDateTime(item.uploadedAt)}</span></div></div><div className="workspace-row-actions"><form action={resolveFieldConflictAction} className="workspace-inline-form compact"><input type="hidden" name="artifactId" value={item.artifactId} /><label><span>Décision</span><select name="resolution" defaultValue="SYNCED"><option value="SYNCED">Conserver cette saisie</option><option value="IGNORED">Ignorer cette saisie</option></select></label><label><span>Note</span><input name="note" maxLength={1000} placeholder="Motif de la décision" /></label><button className="button primary small" type="submit">Enregistrer</button></form></div></article>)}</div></section> : null}

      {interventions.length ? <section className="workspace-list" aria-label="Interventions du jour">{interventions.map((row) => <article className="workspace-row" key={row.interventionId}><div className="workspace-row-main"><div className="workspace-row-heading"><div><span className="eyebrow">{row.scheduledAt ? formatTime(row.scheduledAt) : "Sans horaire"}</span><h2>{row.title}</h2></div><StatusPill tone={row.status === "IN_PROGRESS" ? "warning" : row.status === "COMPLETED" ? "good" : "neutral"}>{interventionLabel(row.status)}</StatusPill></div><div className="workspace-meta"><span><b>Client</b>{row.customerName ?? "Non renseigné"}</span><span><b>Adresse</b>{row.address || "Non renseignée"}</span><span><b>Durée prévue</b>{row.durationMinutes ? `${row.durationMinutes} min` : "Non renseignée"}</span><span><b>Téléphone</b>{row.customerPhone ?? "Non renseigné"}</span></div>{row.arrivedAt ? <p className="workspace-description">Arrivée enregistrée à {formatTime(row.arrivedAt)}{row.startedAt ? ` · travail démarré à ${formatTime(row.startedAt)}` : ""}.</p> : null}</div><div className="workspace-row-actions">{!row.arrivedAt && !["COMPLETED", "CANCELLED"].includes(row.status) ? <form action={arriveAtInterventionAction}><input type="hidden" name="interventionId" value={row.interventionId} /><button className="button primary small" type="submit">Je suis arrivé</button></form> : null}{row.arrivedAt && !row.startedAt && !["COMPLETED", "CANCELLED"].includes(row.status) ? <form action={startInterventionAction}><input type="hidden" name="interventionId" value={row.interventionId} /><button className="button primary small" type="submit">Commencer</button></form> : null}{!["COMPLETED", "CANCELLED"].includes(row.status) ? <OfflineFieldCapture interventionId={row.interventionId} /> : null}</div></article>)}</section> : <EmptyState title="Aucune intervention aujourd’hui" description="Aucune intervention ne vous est assignée pour cette date." />}

      <section className="workspace-boundary-note"><StatusPill tone="neutral">Hors connexion partiel</StatusPill><p>Les saisies texte structurées utilisent la file hors connexion C36. Les photos et signatures ne sont pas annoncées comme disponibles hors connexion tant qu’un stockage binaire local dédié n’est pas installé.</p></section>
    </>
  );
}

function ResultNotice({ result }: { result?: string }) { if (!result) return null; const good = ["arrived", "started", "conflict-resolved"].includes(result); const copy: Record<string, string> = { arrived: "Votre arrivée a été enregistrée.", started: "Le début de l’intervention a été enregistré.", conflict: "La saisie a été conservée mais demande une vérification.", "conflict-resolved": "La donnée a été arbitrée.", invalid: "L’action demandée est incomplète.", "not-applied": "SESIRA n’a pas pu confirmer cette action." }; return <section className="premium-inline-notice"><StatusPill tone={good ? "good" : "warning"}>{good ? "Enregistré" : "À vérifier"}</StatusPill><p>{copy[result] ?? "État inconnu."}</p></section>; }
function interventionLabel(value: string) { return ({ PLANNED: "À venir", CONFIRMED: "Confirmée", IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée", NEEDS_ATTENTION: "À reprendre" } as Record<string, string>)[value] ?? value; }
function artifactLabel(value: string) { return ({ PHOTO: "Photo", PART_USED: "Pièce", MEASUREMENT: "Mesure", ANOMALY: "Anomalie", SIGNATURE: "Signature", NOTE: "Note" } as Record<string, string>)[value] ?? value; }
function localIsoDate(timeZone: string) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const map = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${map.year}-${map.month}-${map.day}`; }
function formatTime(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Heure inconnue" : new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d); }
function formatDateTime(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d); }
