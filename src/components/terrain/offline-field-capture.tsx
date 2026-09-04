"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  syncOfflineFieldArtifactAction,
  type OfflineFieldArtifactInput,
} from "@/app/app/terrain/actions";

type ArtifactKind = OfflineFieldArtifactInput["artifactKind"];
type QueueItem = OfflineFieldArtifactInput;

export function OfflineFieldCapture({ interventionId }: { interventionId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<ArtifactKind>("NOTE");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
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
    if (conflicts > 0) setNotice(`${conflicts} saisie${conflicts > 1 ? "s" : ""} envoyée${conflicts > 1 ? "s" : ""}, à vérifier dans les conflits.`);
    else if (synced > 0) setNotice(`${synced} saisie${synced > 1 ? "s" : ""} synchronisée${synced > 1 ? "s" : ""}.`);
    if (synced > 0 || conflicts > 0) router.refresh();
  }, [persist, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readQueue(storageKey);
      setQueue(saved);
      if (navigator.onLine && saved.length) void flush(saved);
    }, 0);
    const onOnline = () => void flush(readQueue(storageKey));
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [flush, storageKey]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = buildPayload(kind, data);
    if (!payload) {
      setNotice("Complétez les champs demandés avant d’enregistrer.");
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
          setKind("NOTE");
          router.refresh();
          return;
        }
        if (result.status === "CONFLICT") {
          setNotice("Saisie reçue par SESIRA, mais elle demande une vérification.");
          form.reset();
          setKind("NOTE");
          router.refresh();
          return;
        }
      } catch {
        setBusy(false);
      }
    }

    const next = [...readQueue(storageKey), item];
    persist(next);
    setNotice("Connexion indisponible : la saisie reste sur cet appareil et sera renvoyée automatiquement.");
    form.reset();
    setKind("NOTE");
  }

  return (
    <details className="workspace-details field-capture-card">
      <summary>Ajouter une information terrain</summary>
      <form className="workspace-inline-form" onSubmit={onSubmit}>
        <label>
          <span>Type</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as ArtifactKind)}>
            <option value="NOTE">Note</option>
            <option value="ANOMALY">Anomalie</option>
            <option value="MEASUREMENT">Mesure</option>
            <option value="PART_USED">Pièce utilisée</option>
          </select>
        </label>

        {kind === "NOTE" ? <label><span>Note factuelle</span><textarea name="text" required maxLength={4000} placeholder="Ce que vous avez observé" /></label> : null}

        {kind === "ANOMALY" ? (
          <>
            <label><span>Niveau</span><select name="severity" defaultValue="NORMAL"><option value="LOW">Faible</option><option value="NORMAL">Normal</option><option value="HIGH">Important</option><option value="URGENT">Urgent</option></select></label>
            <label><span>Anomalie observée</span><textarea name="summary" required maxLength={2000} /></label>
          </>
        ) : null}

        {kind === "MEASUREMENT" ? (
          <>
            <label><span>Mesure</span><select name="measurementKind" defaultValue="TEMPERATURE"><option value="PRESSURE">Pression</option><option value="TEMPERATURE">Température</option><option value="CURRENT">Intensité</option><option value="VOLTAGE">Tension</option><option value="LEAK_RATE">Taux de fuite</option><option value="VOLUME_ADDED_KG">Fluide ajouté</option><option value="VOLUME_RECOVERED_KG">Fluide récupéré</option><option value="OTHER">Autre</option></select></label>
            <label><span>Valeur</span><input name="value" type="number" step="any" required /></label>
            <label><span>Unité</span><input name="unit" required maxLength={30} placeholder="°C, bar, A, kg…" /></label>
          </>
        ) : null}

        {kind === "PART_USED" ? (
          <>
            <label><span>Référence pièce</span><input name="partCode" required maxLength={100} /></label>
            <label><span>Désignation</span><input name="partLabel" required maxLength={200} /></label>
            <label><span>Quantité</span><input name="quantity" type="number" min="0.001" step="any" required /></label>
          </>
        ) : null}

        <button className="button ghost small" type="submit" disabled={busy}>{busy ? "Synchronisation…" : "Enregistrer"}</button>
      </form>

      <div className="field-sync-state" aria-live="polite">
        <span>{typeof navigator !== "undefined" && navigator.onLine ? "En ligne" : "Hors connexion"}</span>
        <strong>{queue.length ? `${queue.length} en attente sur cet appareil` : "Aucune saisie en attente"}</strong>
        {queue.length ? <button type="button" className="button ghost small" disabled={busy} onClick={() => void flush(readQueue(storageKey))}>Synchroniser</button> : null}
      </div>
      {notice ? <p className="workspace-action-note">{notice}</p> : null}
      <p className="premium-muted-copy">Les notes, anomalies, mesures et pièces peuvent attendre hors connexion. Les photos et signatures nécessitent une file binaire dédiée et ne sont pas annoncées comme disponibles hors connexion ici.</p>
    </details>
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
