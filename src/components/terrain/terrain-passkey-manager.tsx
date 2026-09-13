"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import styles from "./terrain-mobile.module.css";

export function TerrainPasskeyManager() {
  const [passkeyCount, setPasskeyCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "good" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPasskeys() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.passkey.list();
        if (!active) return;
        setPasskeyCount(error ? null : Array.isArray(data) ? data.length : 0);
      } catch {
        if (active) setPasskeyCount(null);
      }
    }

    void loadPasskeys();
    return () => {
      active = false;
    };
  }, []);

  async function registerPasskey() {
    setMessage(null);

    if (typeof window === "undefined" || !("PublicKeyCredential" in window)) {
      setMessage({ tone: "error", text: "Cet appareil ou ce navigateur ne prend pas en charge les clés d’accès." });
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.registerPasskey();

      if (error) {
        setMessage({
          tone: "error",
          text: error.code === "passkey_disabled"
            ? "Les clés d’accès doivent encore être activées dans la configuration Auth SESIRA."
            : "Impossible d’enregistrer cette clé d’accès. Réessayez depuis cet appareil.",
        });
        return;
      }

      setPasskeyCount((current) => (current ?? 0) + 1);
      setMessage({ tone: "good", text: "Clé d’accès enregistrée. Vous pourrez désormais vous connecter avec la biométrie ou le code de cet appareil." });
    } catch {
      setMessage({ tone: "error", text: "Enregistrement annulé ou indisponible sur cet appareil." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.capture} aria-labelledby="passkey-title">
      <div className={styles.captureHeader}>
        <div>
          <span className={styles.kicker}>Sécurité</span>
          <h3 id="passkey-title">Clé d’accès</h3>
          <p>Connexion rapide avec Face ID, Touch ID, biométrie Android, Windows Hello ou une clé de sécurité.</p>
        </div>
        <KeyRound size={22} aria-hidden="true" />
      </div>

      {passkeyCount !== null ? (
        <div className={`${styles.notice} ${styles.noticeGood}`}>
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{passkeyCount === 0 ? "Aucune clé d’accès enregistrée." : `${passkeyCount} clé${passkeyCount === 1 ? "" : "s"} d’accès enregistrée${passkeyCount === 1 ? "" : "s"}.`}</span>
        </div>
      ) : null}

      {message ? (
        <div className={`${styles.notice} ${message.tone === "good" ? styles.noticeGood : ""}`} role="status">
          <span>{message.text}</span>
        </div>
      ) : null}

      <button className={styles.primaryAction} type="button" onClick={registerPasskey} disabled={pending}>
        {pending ? "Configuration…" : "Configurer une clé d’accès"}
      </button>
      <p className={styles.helper}>Votre empreinte ou votre visage n’est jamais transmis à SESIRA. L’appareil confirme localement votre identité et utilise une clé cryptographique pour la connexion.</p>
    </section>
  );
}
