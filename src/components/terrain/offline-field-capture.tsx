"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Gauge, Package, Save, StickyNote } from "lucide-react";

import {
  syncOfflineFieldArtifactAction,
  type OfflineFieldArtifactInput,
} from "@/app/app/terrain/actions";

import styles from "./terrain-mobile.module.css";

type ArtifactKind = OfflineFieldArtifactInput["artifactKind"];
type QueueItem = OfflineFieldArtifactInput;

const CHOICES: Array<{ kind: ArtifactKind; label: string; icon: typeof StickyNote }> = [
  { kind: "NOTE", label: "Note", icon: StickyNote },
  { kind: "MEASUREMENT", label: "Mesure", icon: Gauge },
  { kind: "PART_USED", label: "Pièce", icon: Package },
  { kind: "ANOMALY", label: "Anomalie", icon: AlertTriangle },
];

export function OfflineFieldCapture({ interventionId }: { interventionId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<ArtifactKind>("NOTE");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const storageKey = `sesira-field-queue:${interventionId}`;

  const persist = useCallback((items: QueueItem[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // The capture remains in React state for this session. No success is claimed.
    }
    setQueue(items);
  }, [storageKey]);

  const flush = useCallback(async (items: QueueItem[]) => {
    if (!items.length || typeof navigator === "undefined" || !navigator.onLine) return;
    setBusy(true);
    const remaining: QueueItem[] = [];
    let synced = 0;
    let conflicts = 0;

    for (const item of items) {
      try {
        const result = await syncOfflineFieldArtifactAction(item);
        if (result.status === "SYNCED") synced += 1;
        else if (result.status === "CONFLICT") conflicts += 1;
        else remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }

    persist(remaining);
    setBusy(false);
    if (conflicts > 0) setNotice(`${conflicts} saisie${conflicts > 1 ? "s" : ""} reçue${conflicts > 1 ? "s" : ""}, avec vérification nécessaire.`);
    else if (synced > 0) setNotice(`${synced} saisie${synced > 1 ? "s" : ""} synchronisée${synced > 1 ? "s" : ""}.`);
    if (synced > 0 || conflicts > 0) router.refresh();
  }, [persist, router]);

  useEffect(() => {
    const read = () => {
      setOnline(navigator.onLine);
      const saved = readQueue(storageKey);
      setQueue(saved);
      if (navigator.onLine && saved.length) void flush(saved);
    };
    const timer = window.setTimeout(read, 0);
    const onOnline = () => {
      setOnline(true);
      void flush(readQueue(storageKey));
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [flush, storageKey]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = buildPayload(kind, data);
    if (!payload) {
      setNotice("Complétez seulement les informations demandées.");
      return;
    }

    const item: QueueItem = {
      interventionId,
      artifactKind: kind,
      payload,
      capturedAt: new Date().toISOString(),
      offlineClientId: `field:${interventionId}:${newClientId()}`.slice(0, 100),
    };

    if (navigator.onLine) {
      setBusy(true);
      try {
        const result = await syncOfflineFieldArtifactAction(item);
        setBusy(false);
        if (result.status === "SYNCED") {
          setNotice("Saisie synchronisée.");
          form.reset();
          router.refresh();
          return;
        }
        if (result.status === "CONFLICT") {
          setNotice("Saisie reçue par SESIRA. Une vérification sera nécessaire, sans écraser la donnée d’origine.");
          form.reset();
          router.refresh();
          return;
        }
      } catch {
        setBusy(false);
      }
    }

    const next = [...readQueue(storageKey), item];
    persist(next);
    setNotice("La saisie reste sur cet appareil et sera renvoyée quand la connexion revient.");
    form.reset();
  }

  return (
    <section className={styles.capture} aria-labelledby={`capture-${interventionId}`}>
      <div className={styles.captureHeader}>
        <div>
          <span className={styles.kicker}>Saisie terrain</span>
          <h3 id={`capture-${interventionId}`}>Ajouter ce que vous observez</h3>
          <p>Une observation à la fois. SESIRA conserve l’heure de capture.</p>
        </div>
        <span className={styles.syncPill}>{online ? "En ligne" : "Hors connexion"}</span>
      </div>

      <div className={styles.quickGrid} role="group" aria-label="Type de saisie">
        {CHOICES.map((choice) => {
          const Icon = choice.icon;
          const active = kind === choice.kind;
          return (
            <button
              key={choice.kind}
              type="button"
              className={`${styles.quickChoice} ${active ? styles.quickChoiceActive : ""}`}
              aria-pressed={active}
              onClick={() => setKind(choice.kind)}
            >
              <Icon size={19} strokeWidth={1.9} />
              {choice.label}
            </button>
          );
        })}
      </div>

      <form className={styles.captureForm} onSubmit={onSubmit}>
        {kind === "NOTE" ? (
          <label>
            <span>Observation factuelle</span>
            <textarea name="text" required maxLength={4000} placeholder="Ex. filtre remplacé, bruit observé, accès dégagé…" />
          </label>
        ) : null}

        {kind === "ANOMALY" ? (
          <>
            <label>
              <span>Importance</span>
              <select name="severity" defaultValue="NORMAL">
                <option value="LOW">Faible</option>
                <option value="NORMAL">À signaler</option>
                <option value="HIGH">Importante</option>
                <option value="URGENT">Bloquante</option>
              </select>
            </label>
            <label>
              <span>Ce que vous avez constaté</span>
              <textarea name="summary" required maxLength={2000} placeholder="Décrivez le fait observé, sans diagnostic inventé." />
            </label>
          </>
        ) : null}

        {kind === "MEASUREMENT" ? (
          <>
            <label>
              <span>Type de mesure</span>
              <select name="measurementKind" defaultValue="TEMPERATURE">
                <option value="PRESSURE">Pression</option>
                <option value="TEMPERATURE">Température</option>
                <option value="CURRENT">Intensité</option>
                <option value="VOLTAGE">Tension</option>
                <option value="LEAK_RATE">Taux de fuite</option>
                <option value="VOLUME_ADDED_KG">Fluide ajouté</option>
                <option value="VOLUME_RECOVERED_KG">Fluide récupéré</option>
                <option value="OTHER">Autre</option>
              </select>
            </label>
            <div className={styles.formGrid}>
              <label><span>Valeur</span><input name="value" type="number" inputMode="decimal" step="any" required /></label>
              <label><span>Unité</span><input name="unit" required maxLength={30} placeholder="°C, bar, A, kg…" /></label>
            </div>
          </>
        ) : null}

        {kind === "PART_USED" ? (
          <>
            <label><span>Référence pièce</span><input name="partCode" required maxLength={100} autoCapitalize="characters" /></label>
            <label><span>Désignation</span><input name="partLabel" required maxLength={200} /></label>
            <label><span>Quantité</span><input name="quantity" type="number" inputMode="decimal" min="0.001" step="any" required /></label>
          </>
        ) : null}

        <button className={styles.primaryAction} type="submit" disabled={busy}>
          <Save size={17} /> {busy ? "Synchronisation…" : online ? "Enregistrer" : "Garder sur cet appareil"}
        </button>
      </form>

      <div className={styles.syncCard} aria-live="polite">
        <div className={styles.syncTop}>
          <strong>{queue.length ? `${queue.length} en attente` : "Aucune saisie locale en attente"}</strong>
          <span>{online ? "Connexion disponible" : "Hors connexion"}</span>
        </div>
        {queue.length ? (
          <button type="button" className={styles.syncButton} disabled={busy || !online} onClick={() => void flush(readQueue(storageKey))}>
            {online ? "Synchroniser maintenant" : "Synchronisation au retour du réseau"}
          </button>
        ) : null}
      </div>

      {notice ? <p className={styles.helper}>{notice}</p> : null}
      <p className={styles.helper}>Notes, anomalies, mesures et pièces utilisent la file hors connexion existante. Aucun succès serveur n’est affiché avant confirmation.</p>
    </section>
  );
}

function readQueue(key: string): QueueItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueueItem);
  } catch {
    return [];
  }
}

function isQueueItem(value: unknown): value is QueueItem {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.interventionId === "string"
    && ["NOTE", "ANOMALY", "MEASUREMENT", "PART_USED"].includes(String(row.artifactKind))
    && typeof row.payload === "object"
    && typeof row.capturedAt === "string"
    && typeof row.offlineClientId === "string";
}

function buildPayload(kind: ArtifactKind, data: FormData): Record<string, unknown> | null {
  if (kind === "NOTE") {
    const text = String(data.get("text") ?? "").trim();
    return text ? { text, ai_structured: false } : null;
  }
  if (kind === "ANOMALY") {
    const summary = String(data.get("summary") ?? "").trim();
    const severity = String(data.get("severity") ?? "NORMAL");
    return summary ? { severity, summary } : null;
  }
  if (kind === "MEASUREMENT") {
    const measurementKind = String(data.get("measurementKind") ?? "");
    const rawValue = String(data.get("value") ?? "");
    const value = Number(rawValue);
    const unit = String(data.get("unit") ?? "").trim();
    return measurementKind && rawValue && Number.isFinite(value) && unit ? { measurement_kind: measurementKind, value, unit } : null;
  }
  const partCode = String(data.get("partCode") ?? "").trim();
  const partLabel = String(data.get("partLabel") ?? "").trim();
  const rawQuantity = String(data.get("quantity") ?? "");
  const quantity = Number(rawQuantity);
  return partCode && partLabel && rawQuantity && Number.isFinite(quantity) && quantity > 0
    ? { part_code: partCode, part_label: partLabel, quantity }
    : null;
}

function newClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
