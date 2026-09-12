import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  UserRound,
  Wrench,
} from "lucide-react";

import { OfflineFieldCapture } from "@/components/terrain/offline-field-capture";
import { TerrainBottomNav } from "@/components/terrain/terrain-bottom-nav";
import { TerrainProcedurePanel } from "@/components/terrain/terrain-procedure-panel";
import { TerrainSyncCenter } from "@/components/terrain/terrain-sync-center";
import styles from "@/components/terrain/terrain-mobile.module.css";
import { getViewerContext } from "@/lib/auth/viewer";
import { getOrganizationSettings } from "@/lib/data";
import { getTechnicianWorkspace, type TechnicianInterventionRow } from "@/lib/data/c40-ui";
import { getTerrainProcedureUi } from "@/lib/data/terrain-procedure-ui";

import { arriveAtInterventionAction, startInterventionAction } from "../actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string; date?: string; id?: string }>;
type ProcedureUiResult = Awaited<ReturnType<typeof getTerrainProcedureUi>>;

export default async function TerrainMissionPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  const settings = await getOrganizationSettings(viewer.organization.id);
  const timezone = settings?.timezone ?? "Europe/Paris";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : localIsoDate(timezone);
  const workspace = await getTechnicianWorkspace(viewer.organization.id, viewer.userId, date);

  if (workspace.status === "ERROR") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <TerrainHeader organizationName={viewer.organization.name} />
          <section className={styles.empty}>
            <AlertTriangle size={26} />
            <strong>Mission indisponible</strong>
            <p>Impossible de charger votre mission pour le moment.</p>
          </section>
        </div>
        <TerrainBottomNav date={date} missionId={params.id ?? null} />
      </main>
    );
  }

  const interventions = workspace.data.interventions;
  const requested = params.id ? interventions.find((row) => row.interventionId === params.id) : null;
  const mission = requested
    ?? interventions.find((row) => !["COMPLETED", "CANCELLED"].includes(row.status))
    ?? interventions[0]
    ?? null;

  if (!mission) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <TerrainHeader organizationName={viewer.organization.name} />
          <section className={styles.hero}>
            <span className={styles.kicker}>Mission</span>
            <h1>Rien à faire maintenant</h1>
            <p>Aucune intervention ne vous est assignée pour cette date.</p>
          </section>
          <Link className={styles.primaryAction} href={`/app/terrain?date=${encodeURIComponent(date)}`}>Voir ma journée</Link>
        </div>
        <TerrainBottomNav date={date} missionId={null} />
      </main>
    );
  }

  const procedureUi = await getTerrainProcedureUi(viewer.organization.id, mission.interventionId);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <TerrainHeader organizationName={viewer.organization.name} />

        <section className={styles.hero}>
          <span className={styles.kicker}>Mission</span>
          <h1>Intervention</h1>
          <p>Les informations utiles pour réaliser cette mission, rien de plus.</p>
        </section>

        <ResultNotice result={params.result} />
        <MissionContent row={mission} date={date} procedureUi={procedureUi} />
      </div>

      <TerrainBottomNav date={date} missionId={mission.interventionId} />
    </main>
  );
}

function TerrainHeader({ organizationName }: { organizationName: string }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <strong>SESIRA Terrain</strong>
        <span>{organizationName}</span>
      </div>
      <TerrainSyncCenter compact />
    </header>
  );
}

function MissionContent({ row, date, procedureUi }: { row: TechnicianInterventionRow; date: string; procedureUi: ProcedureUiResult }) {
  const terminal = ["COMPLETED", "CANCELLED"].includes(row.status);
  const mapHref = row.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.address)}` : null;

  return (
    <section className={styles.section} aria-labelledby="mission-title">
      <div className={styles.sectionHeading}>
        <div><span>À faire</span><h2 id="mission-title">{row.title}</h2></div>
        <Link href={`/app/terrain?date=${encodeURIComponent(date)}`} className={styles.connectionPill}>Ma journée</Link>
      </div>

      <article className={styles.focusCard}>
        <header className={styles.focusHeader}>
          <div className={styles.focusHeaderTop}>
            <span className={styles.nextTime}>{row.scheduledAt ? formatTime(row.scheduledAt) : "Sans horaire"}</span>
            <span className={styles.statusPill}>{interventionLabel(row.status)}</span>
          </div>
          <h2>{row.title}</h2>
          <p>{row.customerName ?? "Client non renseigné"}</p>
        </header>

        <div className={styles.focusInfo}>
          <div className={styles.infoRow}><span className={styles.infoIcon}><MapPin size={16} /></span><div><small>Adresse</small><strong>{row.address || "Non renseignée"}</strong></div></div>
          <div className={styles.infoRow}><span className={styles.infoIcon}><Clock3 size={16} /></span><div><small>Durée prévue</small><strong>{row.durationMinutes ? `${row.durationMinutes} minutes` : "Non renseignée"}</strong></div></div>
          <div className={styles.infoRow}><span className={styles.infoIcon}><UserRound size={16} /></span><div><small>Contact</small><strong>{row.customerPhone ?? "Téléphone non renseigné"}</strong></div></div>
        </div>

        <div className={styles.focusActions}>
          {mapHref ? <a className={styles.secondaryAction} href={mapHref} target="_blank" rel="noreferrer"><Navigation size={16} /> Itinéraire</a> : null}
          {row.customerPhone ? <a className={styles.secondaryAction} href={`tel:${row.customerPhone}`}><Phone size={16} /> Appeler</a> : null}
        </div>

        {!row.arrivedAt && !terminal ? (
          <div className={styles.focusActions}>
            <form action={arriveAtInterventionAction}>
              <input type="hidden" name="interventionId" value={row.interventionId} />
              <input type="hidden" name="focus" value={row.interventionId} />
              <input type="hidden" name="date" value={date} />
              <button className={styles.primaryAction} type="submit"><MapPin size={17} /> J’y suis</button>
            </form>
          </div>
        ) : null}

        {row.arrivedAt && !row.startedAt && !terminal ? (
          <div className={styles.focusActions}>
            <div className={styles.infoRow}><span className={styles.infoIcon}><CheckCircle2 size={16} /></span><div><small>Arrivée</small><strong>{formatTime(row.arrivedAt)}</strong></div></div>
            <form action={startInterventionAction}>
              <input type="hidden" name="interventionId" value={row.interventionId} />
              <input type="hidden" name="focus" value={row.interventionId} />
              <input type="hidden" name="date" value={date} />
              <button className={styles.primaryAction} type="submit"><Wrench size={17} /> Commencer</button>
            </form>
          </div>
        ) : null}
      </article>

      {row.startedAt && !terminal && procedureUi.status === "OK" ? (
        <TerrainProcedurePanel
          date={date}
          interventionId={row.interventionId}
          templates={procedureUi.data.templates}
          run={procedureUi.data.run}
          equipment={procedureUi.data.equipment}
          regulatoryExport={procedureUi.data.regulatoryExport}
          binaries={procedureUi.data.binaries}
        />
      ) : null}

      {row.startedAt && !terminal ? <OfflineFieldCapture interventionId={row.interventionId} /> : null}

      {row.status === "COMPLETED" ? (
        <div className={`${styles.notice} ${styles.noticeGood}`}>
          <CheckCircle2 size={18} />
          <div><strong>Intervention terminée</strong><div>Le dossier est enregistré.</div></div>
        </div>
      ) : null}
    </section>
  );
}

function ResultNotice({ result }: { result?: string }) {
  if (!result) return null;
  const good = [
    "arrived",
    "started",
    "note-saved",
    "procedure-started",
    "step-saved",
    "photo-saved",
    "signature-saved",
    "procedure-ready",
    "procedure-completed",
  ].includes(result);
  const copy: Record<string, string> = {
    arrived: "Arrivée enregistrée.",
    started: "Intervention démarrée.",
    "note-saved": "Saisie enregistrée.",
    "procedure-started": "Procédure démarrée.",
    "step-saved": "Étape enregistrée.",
    "photo-saved": "Photo enregistrée.",
    "signature-saved": "Émargement enregistré.",
    "procedure-ready": "Prêt pour la relecture.",
    "procedure-completed": "Procédure terminée.",
    "procedure-conflict": "Une saisie demande une vérification.",
    "binary-conflict": "Le fichier n’a pas pu être confirmé.",
    "file-too-large": "Le fichier est trop volumineux.",
    invalid: "L’action demandée est incomplète.",
    "not-applied": "SESIRA n’a pas pu confirmer cette action.",
  };
  return <div className={`${styles.notice} ${good ? styles.noticeGood : ""}`}>{good ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<span>{copy[result] ?? "État inconnu."}</span></div>;
}

function interventionLabel(value: string) {
  return ({ PLANNED: "À venir", CONFIRMED: "Confirmée", IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée", NEEDS_ATTENTION: "À reprendre" } as Record<string, string>)[value] ?? value;
}

function localIsoDate(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}
