import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
} from "lucide-react";

import { TerrainBottomNav } from "@/components/terrain/terrain-bottom-nav";
import { TerrainSyncCenter } from "@/components/terrain/terrain-sync-center";
import styles from "@/components/terrain/terrain-mobile.module.css";
import { getViewerContext } from "@/lib/auth/viewer";
import { getOrganizationSettings } from "@/lib/data";
import { getTechnicianWorkspace, type TechnicianInterventionRow } from "@/lib/data/c40-ui";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string; date?: string; focus?: string }>;

export default async function FieldTodayPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  // Backwards compatibility for old links and server-action redirects from the
  // former single-page terrain UI. The visible navigation now uses real routes.
  if (params.focus) {
    const next = new URLSearchParams();
    if (params.date) next.set("date", params.date);
    next.set("id", params.focus);
    if (params.result) next.set("result", params.result);
    redirect(`/app/terrain/mission?${next.toString()}`);
  }
  if (params.result && ["conflict-resolved", "invalid", "not-applied"].includes(params.result)) {
    const next = new URLSearchParams({ result: params.result });
    if (params.date) next.set("date", params.date);
    redirect(`/app/terrain/envois?${next.toString()}`);
  }

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
            <strong>Journée indisponible</strong>
            <p>Impossible de charger vos interventions pour le moment.</p>
          </section>
        </div>
        <TerrainBottomNav date={date} missionId={null} />
      </main>
    );
  }

  const { interventions } = workspace.data;
  const nextIntervention = interventions.find((row) => !["COMPLETED", "CANCELLED"].includes(row.status)) ?? null;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <TerrainHeader organizationName={viewer.organization.name} />

        <section className={styles.hero}>
          <span className={styles.kicker}>Ma journée</span>
          <h1>{friendlyDayTitle(date, timezone)}</h1>
          <p>{interventions.length ? `${interventions.length} intervention${interventions.length === 1 ? "" : "s"} prévue${interventions.length === 1 ? "" : "s"}` : "Aucune intervention prévue"}</p>
        </section>

        <div className={styles.dateStrip}>
          <strong>{formatDisplayDate(date)}</strong>
          <form method="get">
            <label className="sr-only" htmlFor="terrain-date">Choisir une date</label>
            <input id="terrain-date" name="date" type="date" defaultValue={date} />
            <button className={styles.iconButton} type="submit" aria-label="Afficher cette date"><CalendarDays size={17} /></button>
          </form>
        </div>

        {nextIntervention ? (
          <section className={styles.section} aria-labelledby="next-title">
            <div className={styles.sectionHeading}>
              <div><span>À suivre</span><h2 id="next-title">Prochaine intervention</h2></div>
            </div>
            <NextInterventionCard row={nextIntervention} date={date} />
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="day-list-title">
          <div className={styles.sectionHeading}>
            <div><span>Planning</span><h2 id="day-list-title">Mes interventions</h2></div>
          </div>

          {interventions.length ? (
            <div className={styles.dayList}>
              {interventions.map((row) => (
                <Link
                  key={row.interventionId}
                  href={`/app/terrain/mission?date=${encodeURIComponent(date)}&id=${encodeURIComponent(row.interventionId)}`}
                  className={`${styles.dayCard} ${row.status === "COMPLETED" ? styles.dayCardDone : ""}`}
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
            <div className={styles.empty}>
              <CheckCircle2 size={26} />
              <strong>Journée libre</strong>
              <p>Aucune intervention ne vous est assignée pour cette date.</p>
            </div>
          )}
        </section>
      </div>

      <TerrainBottomNav date={date} missionId={nextIntervention?.interventionId ?? null} />
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
      <Link className={styles.primaryAction} href={`/app/terrain/mission?date=${encodeURIComponent(date)}&id=${encodeURIComponent(row.interventionId)}`}>
        Ouvrir la mission <ChevronRight size={17} />
      </Link>
    </article>
  );
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
