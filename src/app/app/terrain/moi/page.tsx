import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  FileText,
  LocateFixed,
  MapPin,
  ShieldCheck,
  Smartphone,
  Wrench,
  X,
} from "lucide-react";

import styles from "@/components/terrain/terrain-mobile.module.css";
import privacyStyles from "@/components/terrain/terrain-privacy.module.css";
import { getViewerContext } from "@/lib/auth/viewer";
import { getOrganizationSettings } from "@/lib/data";
import { getTerrainPrivacyUi } from "@/lib/data/terrain-privacy-ui";

export const dynamic = "force-dynamic";

export default async function TerrainMePage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const [privacy, settings] = await Promise.all([
    getTerrainPrivacyUi(viewer.organization.id, viewer.userId),
    getOrganizationSettings(viewer.organization.id),
  ]);
  const timezone = settings?.timezone ?? "Europe/Paris";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}><strong>SESIRA Terrain</strong><span>{viewer.organization.name}</span></div>
          <Link href="/app/terrain" className={styles.connectionPill}><ChevronLeft size={14} /> Ma journée</Link>
        </header>

        <section className={styles.hero}>
          <span className={styles.kicker}>Moi</span>
          <h1>Vos données terrain</h1>
          <p>Ce que l’application peut enregistrer, pourquoi, et ce qu’elle n’utilise jamais pour juger votre travail.</p>
        </section>

        {!privacy.available ? (
          <section className={privacyStyles.card}>
            <div className={privacyStyles.icon}><ShieldCheck size={20} /></div>
            <h2>Suivi de position non disponible</h2>
            <p>SESIRA ne dispose pas actuellement d’une politique de télémétrie lisible pour cette organisation. Aucune couverture de position n’est supposée.</p>
          </section>
        ) : privacy.policy ? (
          <>
            <section className={privacyStyles.policyHero}>
              <div className={privacyStyles.policyTop}>
                <span className={privacyStyles.icon}><LocateFixed size={20} /></span>
                <span className={`${privacyStyles.state} ${privacy.policy.enabled ? privacyStyles.stateOn : privacyStyles.stateOff}`}>
                  {privacy.policy.enabled ? "Autorisée par la politique" : "Désactivée"}
                </span>
              </div>
              <span className={styles.kicker}>Localisation de tournée</span>
              <h2>{privacy.policy.enabled ? "Utilisée pour la logistique" : "Aucun ping accepté par SESIRA"}</h2>
              <p>{privacy.policy.purpose}</p>
            </section>

            <section className={privacyStyles.twoColumns}>
              <article className={privacyStyles.card}>
                <div className={privacyStyles.icon}><Check size={20} /></div>
                <h2>Utilisée pour</h2>
                <div className={privacyStyles.ruleList}>
                  <span><Check size={15} /> position de tournée autorisée</span>
                  <span><Check size={15} /> estimation d’arrivée quand un fournisseur la calcule</span>
                  <span><Check size={15} /> contexte logistique de l’intervention</span>
                </div>
              </article>
              <article className={privacyStyles.card}>
                <div className={privacyStyles.icon}><X size={20} /></div>
                <h2>Jamais utilisée pour</h2>
                <div className={privacyStyles.ruleList}>
                  <span><X size={15} /> classer les techniciens</span>
                  <span><X size={15} /> noter la conduite ou la vitesse de travail</span>
                  <span><X size={15} /> produire un score de personne</span>
                </div>
              </article>
            </section>

            <section className={privacyStyles.card}>
              <span className={styles.kicker}>Politique de l’entreprise</span>
              <div className={privacyStyles.factRows}>
                <div><span><Clock3 size={16} /> Conservation</span><strong>{privacy.policy.retentionDays} jours</strong></div>
                <div><span><Smartphone size={16} /> Mode</span><strong>{privacy.policy.sessionBased ? "Pendant les tournées actives" : "Selon les horaires autorisés"}</strong></div>
                <div><span><LocateFixed size={16} /> Fraîcheur attendue</span><strong>{privacy.policy.freshnessSeconds} s</strong></div>
                <div><span><CalendarDays size={16} /> Horaires</span><strong>{formatAllowedHours(privacy.policy.allowedHours)}</strong></div>
              </div>
              <p className={privacyStyles.note}>Sur ce téléphone, l’autorisation système de localisation reste sous votre contrôle. SESIRA ne transforme jamais l’absence de position en une position supposée.</p>
            </section>

            <section className={privacyStyles.card}>
              <span className={styles.kicker}>Dernière donnée reçue</span>
              {privacy.lastPosition ? (
                <div className={privacyStyles.lastPing}>
                  <span className={privacyStyles.icon}><MapPin size={20} /></span>
                  <div>
                    <strong>Capturée {formatDateTime(privacy.lastPosition.capturedAt, timezone)}</strong>
                    <p>Reçue par le serveur {formatDateTime(privacy.lastPosition.receivedAt, timezone)} · source {sourceLabel(privacy.lastPosition.source)}{privacy.lastPosition.accuracyM !== null ? ` · précision annoncée ${Math.round(privacy.lastPosition.accuracyM)} m` : ""}</p>
                  </div>
                </div>
              ) : <p className={privacyStyles.note}>Aucune position n’est connue pour votre compte. SESIRA n’affiche pas de faux dernier point.</p>}
            </section>
          </>
        ) : (
          <section className={privacyStyles.card}>
            <div className={privacyStyles.icon}><ShieldCheck size={20} /></div>
            <h2>Aucune politique configurée</h2>
            <p>La localisation n’est pas considérée comme active tant qu’une politique explicite n’existe pas.</p>
          </section>
        )}

        <aside className={styles.boundary}>La position sert à la logistique, jamais à une comparaison de performance. Un point ancien reste ancien ; une ETA reste une estimation.</aside>
      </div>

      <nav className={styles.bottomNav} aria-label="Navigation terrain">
        <Link href="/app/terrain"><CalendarDays size={18} /><span>Aujourd’hui</span></Link>
        <Link href="/app/terrain#intervention"><Wrench size={18} /><span>Intervention</span></Link>
        <Link href="/app/terrain#envois"><FileText size={18} /><span>Envois</span></Link>
        <Link href="/app/terrain/moi" data-active="true"><ShieldCheck size={18} /><span>Moi</span></Link>
      </nav>
    </main>
  );
}

function formatAllowedHours(value: Record<string, unknown> | null) {
  if (!value) return "Non précisées";
  const hours = Array.isArray(value.hours) ? value.hours : null;
  if (hours && hours.length >= 2 && typeof hours[0] === "number" && typeof hours[1] === "number") return `${hours[0]} h – ${hours[1]} h`;
  return "Définies par l’entreprise";
}

function formatDateTime(value: string, timeZone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "à une heure inconnue";
  return new Intl.DateTimeFormat("fr-FR", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(date);
}

function sourceLabel(value: string) {
  return ({ MOBILE_APP: "application mobile", HARDWARE_TRACKER: "boîtier véhicule", PROVIDER_WEBHOOK: "fournisseur", MANUAL_IMPORT: "import" } as Record<string, string>)[value] ?? value.toLowerCase();
}
