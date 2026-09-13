import { LogOut, ShieldCheck, Smartphone } from "lucide-react";

import { logoutAction } from "@/app/app/logout-action";
import { TerrainBottomNav } from "@/components/terrain/terrain-bottom-nav";
import styles from "@/components/terrain/terrain-mobile.module.css";
import { TerrainPasskeyManager } from "@/components/terrain/terrain-passkey-manager";
import { getViewerContext } from "@/lib/auth/viewer";
import { getOrganizationSettings } from "@/lib/data";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ date?: string }>;

export default async function TerrainMePage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  const settings = await getOrganizationSettings(viewer.organization.id);
  const timezone = settings?.timezone ?? "Europe/Paris";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : localIsoDate(timezone);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <strong>SESIRA Terrain</strong>
            <span>{viewer.organization.name}</span>
          </div>
          <span className={styles.connectionPill}><ShieldCheck size={15} /> Accès sécurisé</span>
        </header>

        <section className={styles.hero}>
          <span className={styles.kicker}>Mon accès</span>
          <h1>Mon appareil.</h1>
          <p>Gérez la manière dont vous vous connectez à SESIRA Terrain sur votre téléphone, tablette ou ordinateur.</p>
        </section>

        <TerrainPasskeyManager />

        <section className={styles.capture} aria-labelledby="device-security-title">
          <div className={styles.captureHeader}>
            <div>
              <span className={styles.kicker}>Confidentialité</span>
              <h3 id="device-security-title">Biométrie privée</h3>
              <p>SESIRA utilise WebAuthn : la reconnaissance biométrique est effectuée par votre appareil, jamais par nos serveurs.</p>
            </div>
            <Smartphone size={22} aria-hidden="true" />
          </div>
          <p className={styles.helper}>Face ID, Touch ID ou l’empreinte Android servent uniquement à déverrouiller la clé d’accès stockée par l’appareil ou votre gestionnaire de mots de passe.</p>
        </section>

        <section className={styles.section}>
          <form action={logoutAction}>
            <button className={styles.dangerAction} type="submit"><LogOut size={18} /> Se déconnecter de cet appareil</button>
          </form>
        </section>
      </div>

      <TerrainBottomNav date={date} missionId={null} />
    </main>
  );
}

function localIsoDate(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
