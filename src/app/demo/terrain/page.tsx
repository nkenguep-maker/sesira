"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Gauge,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  Signal,
  SignalZero,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

import styles from "./terrain-demo.module.css";

type DemoScreen = "today" | "mission" | "sync" | "profile";
type CaptureKind = "photo" | "measurement" | "part" | "anomaly" | null;

type Intervention = {
  id: string;
  time: string;
  title: string;
  customer: string;
  address: string;
  duration: string;
  state: "done" | "current" | "next";
};

const interventions: Intervention[] = [
  {
    id: "i-1",
    time: "08:15",
    title: "Entretien CTA toiture",
    customer: "Résidence Voltaire",
    address: "18 rue Voltaire · Suresnes",
    duration: "1 h 30",
    state: "done",
  },
  {
    id: "i-2",
    time: "10:30",
    title: "Maintenance climatisation",
    customer: "Clinique des Cèdres",
    address: "6 avenue des Cèdres · Boulogne",
    duration: "2 h",
    state: "current",
  },
  {
    id: "i-3",
    time: "14:15",
    title: "Contrôle pompe à chaleur",
    customer: "Cabinet Rivoli",
    address: "41 rue de Rivoli · Paris 4e",
    duration: "1 h 15",
    state: "next",
  },
];

const procedureSteps = [
  { title: "Sécuriser la zone", detail: "Consignation confirmée", state: "done" },
  { title: "Contrôle visuel", detail: "Aucune dégradation extérieure", state: "done" },
  { title: "Relever les pressions", detail: "HP / BP + température", state: "current" },
  { title: "Photo après intervention", detail: "Vue générale de l’unité", state: "next" },
  { title: "Émargement client", detail: "Signature du responsable de site", state: "next" },
] as const;

export default function TerrainDemoPage() {
  const [screen, setScreen] = useState<DemoScreen>("today");
  const [online, setOnline] = useState(true);
  const [capture, setCapture] = useState<CaptureKind>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [queued, setQueued] = useState(2);
  const [missionCompleted, setMissionCompleted] = useState(false);
  const current = interventions[1];

  const syncLabel = useMemo(() => {
    if (!online) return `${queued} en attente`;
    if (queued > 0) return `${queued} à envoyer`;
    return "Synchronisé";
  }, [online, queued]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function saveCapture(kind: Exclude<CaptureKind, null>) {
    setQueued((value) => value + 1);
    setCapture(null);
    flash(online ? "Saisie enregistrée et envoyée." : "Saisie gardée sur le téléphone.");
  }

  function syncNow() {
    if (!online) {
      flash("Pas de réseau. Les données restent sur le téléphone.");
      return;
    }
    setQueued(0);
    flash("Tout est synchronisé.");
  }

  return (
    <main className={styles.demoPage}>
      <div className={styles.showcaseCopy}>
        <div className={styles.eyebrow}>SESIRA · Démo terrain</div>
        <h1>Le technicien voit sa journée. Pas votre ERP.</h1>
        <p>
          Démonstration avec données fictives : prochaine intervention, procédure, saisies terrain,
          fonctionnement hors ligne et remontée d’exception.
        </p>
        <div className={styles.showcasePoints}>
          <span><CheckCircle2 size={18} /> 3 gestes principaux maximum par écran</span>
          <span><CheckCircle2 size={18} /> Les cas normaux restent silencieux côté patron</span>
          <span><CheckCircle2 size={18} /> Une anomalie devient une demande de décision</span>
        </div>
        <Link className={styles.realAppLink} href="/app/terrain">
          Ouvrir l’app réelle <ArrowRight size={16} />
        </Link>
      </div>

      <section className={styles.phoneStage} aria-label="Démo de l’application technicien">
        <div className={styles.demoBadge}>Données fictives</div>
        <div className={styles.phone}>
          <div className={styles.statusBar}>
            <span>09:46</span>
            <div><Signal size={14} /><span>82%</span></div>
          </div>

          <div className={styles.app}>
            <AppHeader
              screen={screen}
              online={online}
              syncLabel={syncLabel}
              onToggleOnline={() => setOnline((value) => !value)}
              onProfile={() => setScreen("profile")}
            />

            <div className={styles.viewport}>
              {screen === "today" ? (
                <TodayScreen current={current} onOpenMission={() => setScreen("mission")} />
              ) : null}
              {screen === "mission" ? (
                <MissionScreen
                  current={current}
                  completed={missionCompleted}
                  onCapture={setCapture}
                  onComplete={() => {
                    setMissionCompleted(true);
                    flash("Intervention terminée. Dossier prêt à être envoyé.");
                  }}
                  onException={() => {
                    setQueued((value) => value + 1);
                    flash("Exception remontée au bureau pour décision.");
                  }}
                />
              ) : null}
              {screen === "sync" ? (
                <SyncScreen online={online} queued={queued} onSync={syncNow} />
              ) : null}
              {screen === "profile" ? <ProfileScreen onBack={() => setScreen("today")} /> : null}
            </div>

            {screen !== "profile" ? (
              <BottomNav active={screen} onChange={setScreen} />
            ) : null}

            {capture ? (
              <CaptureSheet
                kind={capture}
                online={online}
                onClose={() => setCapture(null)}
                onSave={() => saveCapture(capture)}
              />
            ) : null}

            {toast ? <div className={styles.toast}><CheckCircle2 size={17} /> {toast}</div> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function AppHeader({
  screen,
  online,
  syncLabel,
  onToggleOnline,
  onProfile,
}: {
  screen: DemoScreen;
  online: boolean;
  syncLabel: string;
  onToggleOnline: () => void;
  onProfile: () => void;
}) {
  return (
    <header className={styles.appHeader}>
      <div>
        <strong>SESIRA Terrain</strong>
        <span>ClimaPro Services</span>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.syncState} onClick={onToggleOnline} type="button" aria-label="Basculer le réseau de la démo">
          {online ? <Signal size={14} /> : <SignalZero size={14} />}
          <span>{syncLabel}</span>
        </button>
        <button className={`${styles.avatarButton} ${screen === "profile" ? styles.avatarActive : ""}`} onClick={onProfile} type="button" aria-label="Voir mon profil">
          <UserRound size={16} />
        </button>
      </div>
    </header>
  );
}

function TodayScreen({ current, onOpenMission }: { current: Intervention; onOpenMission: () => void }) {
  return (
    <div className={styles.screen}>
      <section className={styles.todayHero}>
        <span className={styles.kicker}>Ma journée</span>
        <h2>Bonjour Malik.</h2>
        <p>Samedi 12 septembre · 3 interventions</p>
        <div className={styles.dayProgress}>
          <div><strong>1 / 3</strong><span>terminée</span></div>
          <div><strong>4 h 45</strong><span>planifiées</span></div>
          <div><strong>16:00</strong><span>fin estimée</span></div>
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.blockHeading}><span>Maintenant</span><strong>Prochaine intervention</strong></div>
        <article className={styles.nextMissionCard}>
          <div className={styles.cardTopline}><span>10:30</span><b>EN COURS</b></div>
          <h3>{current.title}</h3>
          <p>{current.customer}</p>
          <div className={styles.missionMeta}>
            <span><MapPin size={15} /> {current.address}</span>
            <span><Clock3 size={15} /> {current.duration} prévues</span>
          </div>
          <button className={styles.lightPrimary} type="button" onClick={onOpenMission}>
            Ouvrir la mission <ChevronRight size={17} />
          </button>
        </article>
      </section>

      <section className={styles.block}>
        <div className={styles.blockHeading}><span>Planning</span><strong>Mes interventions</strong></div>
        <div className={styles.timeline}>
          {interventions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.timelineRow} ${item.state === "current" ? styles.timelineCurrent : ""}`}
              onClick={item.state === "current" ? onOpenMission : undefined}
            >
              <div className={styles.timeCol}>{item.time}</div>
              <div className={styles.timelineCopy}>
                <strong>{item.title}</strong>
                <span>{item.customer} · {item.address.split(" · ")[1]}</span>
              </div>
              {item.state === "done" ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function MissionScreen({
  current,
  completed,
  onCapture,
  onComplete,
  onException,
}: {
  current: Intervention;
  completed: boolean;
  onCapture: (kind: CaptureKind) => void;
  onComplete: () => void;
  onException: () => void;
}) {
  return (
    <div className={styles.screen}>
      <section className={styles.missionHero}>
        <div className={styles.cardTopline}><span>10:30</span><b>{completed ? "TERMINÉE" : "EN COURS"}</b></div>
        <h2>{current.title}</h2>
        <p>{current.customer}</p>
      </section>

      <div className={styles.quickActions}>
        <button type="button"><Navigation size={17} /><span>Itinéraire</span></button>
        <button type="button"><Phone size={17} /><span>Appeler</span></button>
      </div>

      <section className={styles.infoCard}>
        <InfoRow icon={<MapPin size={16} />} label="Adresse" value="6 avenue des Cèdres, Boulogne-Billancourt" />
        <InfoRow icon={<Clock3 size={16} />} label="Durée prévue" value="2 heures" />
        <InfoRow icon={<Wrench size={16} />} label="Équipement" value="Daikin VRV IV · Toiture B" />
      </section>

      <section className={styles.block}>
        <div className={styles.blockHeading}><span>Procédure</span><strong>3 étapes sur 5</strong></div>
        <div className={styles.procedureCard}>
          {procedureSteps.map((step, index) => (
            <div className={styles.procedureRow} key={step.title}>
              <div className={`${styles.stepMarker} ${step.state === "done" ? styles.stepDone : step.state === "current" ? styles.stepCurrent : ""}`}>
                {step.state === "done" ? <Check size={14} /> : index + 1}
              </div>
              <div><strong>{step.title}</strong><span>{step.detail}</span></div>
              {step.state === "current" ? <span className={styles.currentBadge}>À faire</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.blockHeading}><span>Saisie terrain</span><strong>Ajouter une preuve</strong></div>
        <div className={styles.captureGrid}>
          <button type="button" onClick={() => onCapture("photo")}><Camera size={21} /><strong>Photo</strong><span>Avant / après</span></button>
          <button type="button" onClick={() => onCapture("measurement")}><Gauge size={21} /><strong>Mesure</strong><span>Pression, °C…</span></button>
          <button type="button" onClick={() => onCapture("part")}><Package size={21} /><strong>Pièce</strong><span>Référence utilisée</span></button>
          <button className={styles.alertCapture} type="button" onClick={() => onCapture("anomaly")}><AlertTriangle size={21} /><strong>Anomalie</strong><span>Faire remonter</span></button>
        </div>
      </section>

      {!completed ? (
        <section className={styles.exceptionCard}>
          <div className={styles.exceptionIcon}><AlertTriangle size={19} /></div>
          <div><strong>Besoin d’une décision ?</strong><p>Le patron n’est sollicité que lorsqu’une exception bloque la mission.</p></div>
          <button type="button" onClick={onException}>Demander une décision</button>
        </section>
      ) : null}

      <button className={styles.completeButton} type="button" onClick={onComplete} disabled={completed}>
        {completed ? <><CheckCircle2 size={18} /> Intervention terminée</> : <>Terminer l’intervention <ArrowRight size={17} /></>}
      </button>
    </div>
  );
}

function SyncScreen({ online, queued, onSync }: { online: boolean; queued: number; onSync: () => void }) {
  return (
    <div className={styles.screen}>
      <section className={styles.simpleHero}>
        <span className={styles.kicker}>Envois</span>
        <h2>{queued ? `${queued} élément${queued > 1 ? "s" : ""} à transmettre` : "Tout est envoyé"}</h2>
        <p>SESIRA garde automatiquement les saisies sur ce téléphone quand le réseau n’est pas disponible.</p>
      </section>

      <section className={`${styles.networkCard} ${!online ? styles.networkOffline : ""}`}>
        <div>{online ? <Signal size={19} /> : <SignalZero size={19} />}<strong>{online ? "Réseau disponible" : "Mode hors connexion"}</strong></div>
        <span>{online ? "Les envois peuvent reprendre." : "Aucune donnée n’est perdue."}</span>
      </section>

      <div className={styles.syncList}>
        <SyncRow icon={<Camera size={17} />} title="Photo après intervention" meta="Clinique des Cèdres · 09:42" status={queued > 0 ? "En attente" : "Envoyé"} />
        <SyncRow icon={<Gauge size={17} />} title="Pression circuit BP" meta="4,8 bar · 09:39" status={queued > 1 ? "En attente" : "Envoyé"} />
        <SyncRow icon={<FileText size={17} />} title="Compte rendu" meta="Résidence Voltaire · 08:57" status="Envoyé" />
      </div>

      <button className={styles.syncButton} type="button" onClick={onSync} disabled={!queued}>
        <RefreshCw size={17} /> {queued ? "Envoyer maintenant" : "Synchronisé"}
      </button>
      <p className={styles.syncFootnote}>Les conflits ne sont jamais écrasés automatiquement : ils restent visibles comme exception à vérifier.</p>
    </div>
  );
}

function ProfileScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className={styles.screen}>
      <button className={styles.backButton} type="button" onClick={onBack}><X size={17} /> Fermer</button>
      <section className={styles.profileHero}>
        <div className={styles.profileAvatar}><UserRound size={28} /></div>
        <span>Compte technicien</span>
        <h2>Malik Benali</h2>
        <p>ClimaPro Services · Technicien CVC</p>
      </section>
      <section className={styles.privacyCard}>
        <ShieldCheck size={22} />
        <div><strong>Transparence localisation</strong><p>SESIRA affiche ici ce qui peut être enregistré pendant une intervention et pourquoi.</p></div>
      </section>
      <div className={styles.profileList}>
        <div><span>Localisation</span><strong>Uniquement pendant les actions terrain</strong></div>
        <div><span>Historique personnel</span><strong>Pas de notation de performance</strong></div>
        <div><span>Téléphone</span><strong>iPhone terrain · appareil actuel</strong></div>
      </div>
    </div>
  );
}

function BottomNav({ active, onChange }: { active: DemoScreen; onChange: (screen: DemoScreen) => void }) {
  return (
    <nav className={styles.bottomNav} aria-label="Navigation de la démo terrain">
      <button data-active={active === "today"} type="button" onClick={() => onChange("today")}><CalendarDays size={18} /><span>Aujourd’hui</span></button>
      <button data-active={active === "mission"} type="button" onClick={() => onChange("mission")}><Wrench size={18} /><span>Mission</span></button>
      <button data-active={active === "sync"} type="button" onClick={() => onChange("sync")}><FileText size={18} /><span>Envois</span></button>
    </nav>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className={styles.infoRow}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function SyncRow({ icon, title, meta, status }: { icon: React.ReactNode; title: string; meta: string; status: string }) {
  return (
    <div className={styles.syncRow}>
      <span className={styles.syncIcon}>{icon}</span>
      <div><strong>{title}</strong><span>{meta}</span></div>
      <b data-status={status === "Envoyé" ? "sent" : "waiting"}>{status}</b>
    </div>
  );
}

function CaptureSheet({ kind, online, onClose, onSave }: { kind: Exclude<CaptureKind, null>; online: boolean; onClose: () => void; onSave: () => void }) {
  const config = {
    photo: { icon: <Camera size={21} />, title: "Ajouter une photo", label: "Photo de l’équipement", placeholder: "Photo prête à être capturée" },
    measurement: { icon: <Gauge size={21} />, title: "Ajouter une mesure", label: "Pression BP", placeholder: "4,8 bar" },
    part: { icon: <Package size={21} />, title: "Ajouter une pièce", label: "Référence", placeholder: "Filtre F7 · 592 × 592" },
    anomaly: { icon: <AlertTriangle size={21} />, title: "Signaler une anomalie", label: "Observation", placeholder: "Fuite légère détectée sur raccord" },
  }[kind];

  return (
    <div className={styles.sheetBackdrop} role="presentation" onClick={onClose}>
      <section className={styles.captureSheet} role="dialog" aria-modal="true" aria-label={config.title} onClick={(event) => event.stopPropagation()}>
        <div className={styles.sheetHandle} />
        <header><span>{config.icon}</span><div><strong>{config.title}</strong><p>{online ? "Connexion disponible" : "Sera conservé hors ligne"}</p></div><button type="button" onClick={onClose}><X size={18} /></button></header>
        <label>{config.label}<input defaultValue={config.placeholder} /></label>
        <label>Note facultative<textarea placeholder="Ajouter un détail utile…" /></label>
        <button className={kind === "anomaly" ? styles.warningSave : styles.sheetSave} type="button" onClick={onSave}>{kind === "anomaly" ? "Enregistrer l’anomalie" : "Enregistrer"}</button>
      </section>
    </div>
  );
}
