import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Settings,
  UserRound,
  Wrench,
} from "lucide-react";

import { OfflineFieldCapture } from "@/components/terrain/offline-field-capture";
import { TerrainSyncCenter } from "@/components/terrain/terrain-sync-center";
import styles from "@/components/terrain/terrain-mobile.module.css";
import { getViewerContext } from "@/lib/auth/viewer";
import { getOrganizationSettings } from "@/lib/data";
import { getTechnicianWorkspace, type TechnicianInterventionRow } from "@/lib/data/c40-ui";

import { arriveAtInterventionAction, resolveFieldConflictAction, startInterventionAction } from "./actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string; date?: string; focus?: string }>;

export default async function FieldPage({ searchParams }: { searchParams: SearchParams }) {
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
          <header className={styles.topbar}><div className={styles.brand}><strong>SESIRA Terrain</strong><span>{viewer.organization.name}</span></div></header>
          <section className={styles.empty}><AlertTriangle size={26} /><strong>Journée indisponible</strong><p>SESIRA ne peut pas lire vos interventions terrain pour le moment. Aucun état n’est remplacé par une donnée inventée.</p></section>
        </div>
        <BottomNav />
      </main>
    );
  }

  const { interventions } = workspace.data;
  const interventionIds = new Set(interventions.map((row) => row.interventionId));
  const conflicts = workspace.data.conflicts.filter((item) => interventionIds.has(item.interventionId));
  const nextIntervention = interventions.find((row) => !["COMPLETED", "CANCELLED"].includes(row.status));
  const focused = interventions.find((row) => row.interventionId === params.focus) ?? null;
  const completedCount = interventions.filter((row) => row.status === "COMPLETED").length;

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

        <section className={styles.hero} id="aujourdhui">
          <span className={styles.kicker}>Ma journée</span>
          <h1>{friendlyDayTitle(date, timezone)}</h1>
          <p>{interventions.length} intervention{interventions.length === 1 ? "" : "s"} · {completedCount} terminée{completedCount === 1 ? "" : "s"}. Une intervention normale reste silencieuse côté bureau.</p>
        </section>

        <div className={styles.dateStrip}>
          <strong>{formatDisplayDate(date)}</strong>
          <form method="get">
            <label className="sr-only" htmlFor="terrain-date">Choisir une date</label>
            <input id="terrain-date" name="date" type="date" defaultValue={date} />
            <button className={styles.iconButton} type="submit" aria-label="Afficher cette date"><CalendarDays size={17} /></button>
          </form>
        </div>

        <ResultNotice result={params.result} />

        {focused ? (
          <FocusedIntervention row={focused} date={date} />
        ) : nextIntervention ? (
          <section className={styles.section} aria-labelledby="next-title">
            <div className={styles.sectionHeading}><div><span>À suivre</span><h2 id="next-title">Prochaine intervention</h2></div></div>
            <NextInterventionCard row={nextIntervention} date={date} />
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="day-list-title">
          <div className={styles.sectionHeading}>
            <div><span>Planning</span><h2 id="day-list-title">Aujourd’hui</h2></div>
            <small>{completedCount}/{interventions.length} terminées</small>
          </div>

          {interventions.length ? (
            <div className={styles.dayList}>
              {interventions.map((row) => (
                <Link
                  key={row.interventionId}
                  href={`/app/terrain?date=${encodeURIComponent(date)}&focus=${encodeURIComponent(row.interventionId)}#intervention`}
                  className={`${styles.dayCard} ${focused?.interventionId === row.interventionId ? styles.dayCardActive : ""} ${row.status === "COMPLETED" ? styles.dayCardDone : ""}`}
                >
                  <time className={styles.dayTime}>{row.scheduledAt ? formatTime(row.scheduledAt) : "—"}</time>
                  <div className={styles.dayCopy}>
                    <strong>{row.title}</strong>
                    <span>{row.customerName ?? "Client non renseigné"} · {shortAddress(row.address)}</span>
                  </div>
                  {row.status === "COMPLETED" ? <CheckCircle2 size={18} className={styles.chevron} /> : <ChevronRight size={19} className={styles.chevron} />}
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}><CheckCircle2 size={26} /><strong>Aucune intervention aujourd’hui</strong><p>Votre journée est vide pour cette date. Rien n’est ajouté artificiellement.</p></div>
          )}
        </section>

        {conflicts.length ? (
          <section className={styles.section} aria-labelledby="conflicts-title">
            <div className={styles.sectionHeading}><div><span>À vérifier</span><h2 id="conflicts-title">Saisies conservées</h2></div><small>{conflicts.length}</small></div>
            <div className={styles.conflicts}>
              {conflicts.map((item) => (
                <article className={styles.conflictCard} key={item.artifactId}>
                  <span className={styles.kicker}>{artifactLabel(item.artifactKind)}</span>
                  <h3>Une saisie demande votre décision</h3>
                  <p>{item.conflictReason ?? "SESIRA a conservé les deux versions et n’a rien écrasé automatiquement."}</p>
                  <div className={styles.conflictMeta}>
                    <span><b>Capturé</b>{formatDateTime(item.capturedAt)}</span>
                    <span><b>Reçu</b>{formatDateTime(item.uploadedAt)}</span>
                  </div>
                  <form action={resolveFieldConflictAction} className={styles.conflictActions}>
                    <input type="hidden" name="artifactId" value={item.artifactId} />
                    <button className={styles.secondaryAction} name="resolution" value="IGNORED" type="submit"><RotateCcw size={16} /> Ignorer</button>
                    <button className={styles.primaryAction} name="resolution" value="SYNCED" type="submit"><CheckCircle2 size={16} /> Conserver</button>
                  </form>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section}>
          <TerrainSyncCenter />
        </section>

        <aside className={styles.boundary}>
          Les heures de capture et de réception restent distinctes. Une donnée locale reste « en attente » jusqu’à confirmation. Aucun classement, score ou comparaison entre techniciens n’est produit par cette surface.
        </aside>
      </div>

      <BottomNav />
    </main>
  );
}

function NextInterventionCard({ row, date }: { row: TechnicianInterventionRow; date: string }) {
  return (
    <article className={styles.nextCard}>
      <div className={styles.nextTop}>
        <span className={styles.nextTime}>{row.scheduledAt ? formatTime(row.scheduledAt) : "Sans horaire"}</span>
        <span className={styles.statusPill}>{interventionLabel(row.status)}</span>
      </div>
      <h2>{row.title}</h2>
      <p className={styles.nextCustomer}>{row.customerName ?? "Client non renseigné"}</p>
      <div className={styles.nextMeta}>
        <span><MapPin size={16} /> {row.address || "Adresse non renseignée"}</span>
        <span><Clock3 size={16} /> {row.durationMinutes ? `${row.durationMinutes} min prévues` : "Durée non renseignée"}</span>
      </div>
      <Link className={styles.primaryAction} href={`/app/terrain?date=${encodeURIComponent(date)}&focus=${encodeURIComponent(row.interventionId)}#intervention`}>
        Ouvrir la mission <ChevronRight size={17} />
      </Link>
    </article>
  );
}

function FocusedIntervention({ row, date }: { row: TechnicianInterventionRow; date: string }) {
  const terminal = ["COMPLETED", "CANCELLED"].includes(row.status);
  const mapHref = row.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.address)}` : null;

  return (
    <section className={styles.section} id="intervention" aria-labelledby="focus-title">
      <div className={styles.sectionHeading}>
        <div><span>Intervention</span><h2 id="focus-title">Mission ouverte</h2></div>
        <Link href={`/app/terrain?date=${encodeURIComponent(date)}`} className={styles.connectionPill}>Fermer</Link>
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
              <button className={styles.primaryAction} type="submit"><MapPin size={17} /> J’y suis</button>
            </form>
          </div>
        ) : null}

        {row.arrivedAt && !row.startedAt && !terminal ? (
          <div className={styles.focusActions}>
            <div className={styles.infoRow}><span className={styles.infoIcon}><CheckCircle2 size={16} /></span><div><small>Arrivée</small><strong>{formatTime(row.arrivedAt)}</strong></div></div>
            <form action={startInterventionAction}>
              <input type="hidden" name="interventionId" value={row.interventionId} />
              <button className={styles.primaryAction} type="submit"><Wrench size={17} /> Commencer</button>
            </form>
          </div>
        ) : null}
      </article>

      {row.startedAt && !terminal ? <OfflineFieldCapture interventionId={row.interventionId} /> : null}

      {row.startedAt && !terminal ? (
        <section className={styles.capture} aria-labelledby="field-flow-title">
          <div className={styles.captureHeader}>
            <div><span className={styles.kicker}>Déroulé</span><h3 id="field-flow-title">Intervention en cours</h3><p>Le compte rendu se construit avec les observations enregistrées pendant le travail.</p></div>
          </div>
          <div className={styles.dayList}>
            <div className={styles.dayCard}><span className={styles.dayTime}><ClipboardList size={17} /></span><div className={styles.dayCopy}><strong>Observations et mesures</strong><span>Ajoutez uniquement ce qui est réellement constaté.</span></div><CheckCircle2 size={17} className={styles.chevron} /></div>
            <div className={styles.dayCard}><span className={styles.dayTime}><FileText size={17} /></span><div className={styles.dayCopy}><strong>Compte rendu</strong><span>Préparé à partir des saisies terrain, sans inventer de donnée manquante.</span></div><ChevronRight size={18} className={styles.chevron} /></div>
          </div>
        </section>
      ) : null}

      {row.status === "COMPLETED" ? (
        <div className={styles.notice + " " + styles.noticeGood}><CheckCircle2 size={18} /><div><strong>Intervention terminée</strong><div>Le dossier reste consultable. Rien n’est remonté au bureau sauf exception ou décision nécessaire.</div></div></div>
      ) : null}
    </section>
  );
}

function BottomNav() {
  return (
    <nav className={styles.bottomNav} aria-label="Navigation terrain">
      <Link href="/app/terrain#aujourdhui" data-active="true"><CalendarDays size={18} /><span>Aujourd’hui</span></Link>
      <Link href="/app/terrain#intervention"><Wrench size={18} /><span>Intervention</span></Link>
      <Link href="/app/terrain#envois"><FileText size={18} /><span>Envois</span></Link>
      <Link href="/app/parametres"><Settings size={18} /><span>Moi</span></Link>
    </nav>
  );
}

function ResultNotice({ result }: { result?: string }) {
  if (!result) return null;
  const good = ["arrived", "started", "conflict-resolved", "note-saved"].includes(result);
  const copy: Record<string, string> = {
    arrived: "Arrivée enregistrée.",
    started: "Intervention démarrée.",
    "note-saved": "Saisie enregistrée.",
    conflict: "La saisie est conservée et demande une vérification.",
    "conflict-resolved": "La saisie a été arbitrée.",
    invalid: "L’action demandée est incomplète.",
    "not-applied": "SESIRA n’a pas pu confirmer cette action.",
  };
  return <div className={`${styles.notice} ${good ? styles.noticeGood : ""}`}>{good ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<span>{copy[result] ?? "État inconnu."}</span></div>;
}

function interventionLabel(value: string) {
  return ({ PLANNED: "À venir", CONFIRMED: "Confirmée", IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée", NEEDS_ATTENTION: "À reprendre" } as Record<string, string>)[value] ?? value;
}

function artifactLabel(value: string) {
  return ({ PHOTO: "Photo", PART_USED: "Pièce", MEASUREMENT: "Mesure", ANOMALY: "Anomalie", SIGNATURE: "Émargement", NOTE: "Note" } as Record<string, string>)[value] ?? value;
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

function formatDateTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function formatDisplayDate(value: string) {
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

function friendlyDayTitle(value: string, timeZone: string) {
  const today = localIsoDate(timeZone);
  if (value === today) return "Aujourd’hui";
  return formatDisplayDate(value).replace(/^./, (character) => character.toUpperCase());
}

function shortAddress(value: string) {
  if (!value) return "Adresse non renseignée";
  const [first, ...rest] = value.split(" · ");
  return rest.length ? `${first} · ${rest.at(-1)}` : first;
}
