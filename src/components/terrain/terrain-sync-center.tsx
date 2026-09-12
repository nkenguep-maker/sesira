"use client";

import { useEffect, useMemo, useState } from "react";
import { Cloud, CloudOff, RotateCw } from "lucide-react";

import styles from "./terrain-mobile.module.css";

type PendingItem = {
  interventionId: string;
  artifactKind: string;
  capturedAt: string;
};

export function TerrainSyncCenter({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState<PendingItem[]>([]);

  useEffect(() => {
    const read = () => {
      setOnline(navigator.onLine);
      setPending(readPending());
    };
    read();
    const timer = window.setInterval(read, 1500);
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    window.addEventListener("storage", read);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const copy = useMemo(() => {
    if (!pending.length) return online ? "Tout ce qui est confirmé par SESIRA est synchronisé" : "Aucune saisie locale en attente";
    return `${pending.length} saisie${pending.length > 1 ? "s" : ""} reste${pending.length > 1 ? "nt" : ""} sur cet appareil`;
  }, [online, pending.length]);

  if (compact) {
    return (
      <span className={styles.connectionPill} aria-live="polite">
        {online ? <Cloud size={14} /> : <CloudOff size={14} />}
        {pending.length ? `${pending.length} en attente` : online ? "Synchronisé" : "Hors connexion"}
      </span>
    );
  }

  return (
    <section className={styles.syncCard} id="envois" aria-labelledby="terrain-sync-title">
      <div className={styles.syncTop}>
        <div>
          <strong id="terrain-sync-title">Envois</strong>
          <div className={styles.syncMeta}>{online ? "Connexion disponible" : "Hors connexion"}</div>
        </div>
        {online ? <Cloud size={19} /> : <CloudOff size={19} />}
      </div>
      <span>{copy}</span>
      {pending.length ? (
        <button className={styles.syncButton} type="button" onClick={() => window.location.reload()}>
          <RotateCw size={15} /> Réessayer maintenant
        </button>
      ) : null}
      <p className={styles.helper}>
        SESIRA n’affiche jamais « envoyé » tant qu’un serveur ou un fournisseur n’a pas confirmé l’état correspondant.
      </p>
    </section>
  );
}

function readPending(): PendingItem[] {
  const rows: PendingItem[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith("sesira-field-queue:")) continue;
      const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        if (typeof row.interventionId !== "string" || typeof row.artifactKind !== "string" || typeof row.capturedAt !== "string") continue;
        rows.push({ interventionId: row.interventionId, artifactKind: row.artifactKind, capturedAt: row.capturedAt });
      }
    }
  } catch {
    return [];
  }
  return rows.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}
