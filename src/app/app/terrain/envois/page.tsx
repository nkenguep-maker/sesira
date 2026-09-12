import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

import { TerrainBottomNav } from "@/components/terrain/terrain-bottom-nav";
import { TerrainSyncCenter } from "@/components/terrain/terrain-sync-center";
import styles from "@/components/terrain/terrain-mobile.module.css";
import { getViewerContext } from "@/lib/auth/viewer";
import { getOrganizationSettings } from "@/lib/data";
import { getTechnicianWorkspace } from "@/lib/data/c40-ui";

import { resolveFieldConflictAction } from "../actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string; date?: string }>;

export default async function TerrainSendsPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  const settings = await getOrganizationSettings(viewer.organization.id);
  const timezone = settings?.timezone ?? "Europe/Paris";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : localIsoDate(timezone);
  const workspace = await getTechnicianWorkspace(viewer.organization.id, viewer.userId, date);

  const missionId = workspace.status === "OK"
    ? workspace.data.interventions.find((row) => !["COMPLETED", "CANCELLED"].includes(row.status))?.interventionId ?? null
    : null;
  const interventionIds = workspace.status === "OK"
    ? new Set(workspace.data.interventions.map((row) => row.interventionId))
    : new Set<string>();
  const conflicts = workspace.status === "OK"
    ? workspace.data.conflicts.filter((item) => interventionIds.has(item.interventionId))
    : [];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <strong>SESIRA Terrain</strong>
            <span>{viewer.organization.name}</span>
          </div>
          <TerrainSyncCenter compact />
        </header>

        <section className={styles.hero}>
          <span className={styles.kicker}>Envois</span>
          <h1>Synchronisation</h1>
          <p>Seulement ce qui reste à envoyer ou demande votre choix.</p>
        </section>

        <ResultNotice result={params.result} />

        <TerrainSyncCenter />

        {workspace.status === "ERROR" ? (
          <section className={styles.empty}>
            <AlertTriangle size={26} />
            <strong>État indisponible</strong>
            <p>SESIRA ne peut pas lire les saisies à vérifier pour le moment.</p>
          </section>
        ) : conflicts.length ? (
          <section className={styles.section} aria-labelledby="conflicts-title">
            <div className={styles.sectionHeading}>
              <div><span>À régler</span><h2 id="conflicts-title">Saisies à vérifier</h2></div>
              <small>{conflicts.length}</small>
            </div>
            <div className={styles.conflicts}>
              {conflicts.map((item) => (
                <article className={styles.conflictCard} key={item.artifactId}>
                  <span className={styles.kicker}>{artifactLabel(item.artifactKind)}</span>
                  <h3>Choisissez la bonne version</h3>
                  <p>{item.conflictReason ?? "Cette saisie a été conservée après un changement de l’intervention."}</p>
                  <div className={styles.conflictMeta}>
                    <span><b>Capturé</b>{formatDateTime(item.capturedAt)}</span>
                    <span><b>Reçu</b>{formatDateTime(item.uploadedAt)}</span>
                  </div>
                  <form action={resolveFieldConflictAction} className={styles.conflictActions}>
                    <input type="hidden" name="artifactId" value={item.artifactId} />
                    <input type="hidden" name="date" value={date} />
                    <button className={styles.secondaryAction} name="resolution" value="IGNORED" type="submit"><RotateCcw size={16} /> Ignorer</button>
                    <button className={styles.primaryAction} name="resolution" value="SYNCED" type="submit"><CheckCircle2 size={16} /> Conserver</button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className={`${styles.notice} ${styles.noticeGood}`}>
            <CheckCircle2 size={18} />
            <span>Aucune saisie ne demande votre intervention.</span>
          </section>
        )}
      </div>

      <TerrainBottomNav date={date} missionId={missionId} />
    </main>
  );
}

function ResultNotice({ result }: { result?: string }) {
  if (!result) return null;
  const good = result === "conflict-resolved";
  const copy: Record<string, string> = {
    "conflict-resolved": "La saisie a été arbitrée.",
    invalid: "L’action demandée est incomplète.",
    "not-applied": "SESIRA n’a pas pu confirmer cette action.",
  };
  return <div className={`${styles.notice} ${good ? styles.noticeGood : ""}`}>{good ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<span>{copy[result] ?? "État inconnu."}</span></div>;
}

function artifactLabel(value: string) {
  return ({ PHOTO: "Photo", PART_USED: "Pièce", MEASUREMENT: "Mesure", ANOMALY: "Anomalie", SIGNATURE: "Émargement", NOTE: "Note" } as Record<string, string>)[value] ?? value;
}

function formatDateTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function localIsoDate(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
