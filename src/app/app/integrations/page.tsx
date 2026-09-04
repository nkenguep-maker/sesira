import { PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ConnectionRow = {
  id: string;
  provider: string;
  type: string;
  status: string;
  connected_at: string | null;
  last_sync_at: string | null;
  expires_at: string | null;
  error: string | null;
};

const STATUS_LABELS: Record<string, { label: string; tone: "good" | "warning" | "neutral" }> = {
  CONNECTED: { label: "Connecté", tone: "good" },
  CONNECTING: { label: "Connexion en cours", tone: "warning" },
  DEGRADED: { label: "À vérifier", tone: "warning" },
  EXPIRED: { label: "À reconnecter", tone: "warning" },
  FAILED: { label: "Connexion en échec", tone: "warning" },
  PAUSED: { label: "En pause", tone: "warning" },
  DISCONNECTED: { label: "Non connecté", tone: "neutral" },
};

export default async function IntegrationsPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const supabase = await createClient();
  const result = await supabase
    .from("integrations")
    .select("id, provider, type, status, connected_at, last_sync_at, expires_at, error")
    .eq("organization_id", viewer.organization.id)
    .order("updated_at", { ascending: false });

  if (result.error) throw new Error("Impossible de charger les connexions.");

  const connections = (result.data ?? []) as ConnectionRow[];
  const connected = connections.filter((connection) => connection.status === "CONNECTED").length;
  const needsAttention = connections.filter((connection) => !["CONNECTED", "DISCONNECTED"].includes(connection.status)).length;

  return (
    <>
      <PageHeader
        eyebrow="09 · CONNEXIONS"
        title="Connexions"
        description="Ici, SESIRA affiche uniquement les services réellement enregistrés pour votre entreprise. Une connexion active n’autorise jamais à elle seule un envoi ou une action externe."
      />

      <section className="premium-connection-summary">
        <div><strong>{connected}</strong><span>Connexions actives</span></div>
        <div><strong>{needsAttention}</strong><span>À vérifier</span></div>
        <div><strong>{connections.length}</strong><span>Services enregistrés</span></div>
      </section>

      {connections.length ? (
        <section className="premium-connection-grid">
          {connections.map((connection) => {
            const presentation = STATUS_LABELS[connection.status] ?? { label: "État à vérifier", tone: "warning" as const };
            const title = displayServiceName(connection.provider, connection.type);
            return (
              <article key={connection.id} className="premium-connection-card">
                <header>
                  <div className="premium-connection-mark">{title.slice(0, 1).toUpperCase()}</div>
                  <div><span className="eyebrow">{displayConnectionType(connection.type)}</span><h2>{title}</h2></div>
                  <StatusPill tone={presentation.tone}>{presentation.label}</StatusPill>
                </header>
                <p>{describeConnection(connection.type)}</p>
                <div className="premium-data-list compact">
                  <div><span>État</span><strong>{presentation.label}</strong></div>
                  <div><span>Connecté depuis</span><strong>{connection.connected_at ? formatDate(connection.connected_at) : "Non confirmé"}</strong></div>
                  <div><span>Dernière synchronisation</span><strong>{connection.last_sync_at ? formatDate(connection.last_sync_at) : "Aucune"}</strong></div>
                  {connection.expires_at ? <div><span>À renouveler avant</span><strong>{formatDate(connection.expires_at)}</strong></div> : null}
                </div>
                {connection.error ? <p className="panel-copy">Dernier problème signalé : {connection.error}</p> : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state panel">
          <span className="eyebrow">AUCUN SERVICE ENREGISTRÉ</span>
          <h2>SESIRA n’affiche aucune connexion pour le moment.</h2>
          <p>Cette page restera vide tant qu’un service n’aura pas été réellement enregistré pour votre entreprise. Aucun état “connecté” n’est simulé.</p>
        </section>
      )}

      <section className="premium-trust-note">
        <span className="eyebrow">GARDE FOU</span>
        <h2>Connecté ne veut pas dire autorisé à envoyer.</h2>
        <p>Une connexion apporte du contexte à SESIRA. Les actions externes restent gouvernées séparément par vos règles et par le niveau d’automatisation choisi.</p>
      </section>
    </>
  );
}

function displayServiceName(provider: string, type: string) {
  const value = provider.trim();
  if (!value) return displayConnectionType(type);
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayConnectionType(type: string) {
  const labels: Record<string, string> = {
    EMAIL: "Messagerie",
    CRM: "Clients et ventes",
    CALENDAR: "Calendrier",
    ACCOUNTING: "Comptabilité",
    STORAGE: "Documents",
  };
  return labels[type.toUpperCase()] ?? "Service connecté";
}

function describeConnection(type: string) {
  const descriptions: Record<string, string> = {
    EMAIL: "Messagerie utilisée pour retrouver les échanges liés à vos dossiers.",
    CRM: "Données clients et commerciales enregistrées par votre outil de vente.",
    CALENDAR: "Rendez-vous et disponibilités liés à votre activité.",
    ACCOUNTING: "Éléments de facturation ou de comptabilité partagés avec SESIRA.",
    STORAGE: "Documents accessibles depuis votre espace de travail.",
  };
  return descriptions[type.toUpperCase()] ?? "Service enregistré pour votre entreprise.";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
