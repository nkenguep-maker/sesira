import { PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { buildSettingsConnections } from "@/lib/settings/view-model";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const supabase = await createClient();
  const result = await supabase
    .from("integrations")
    .select("id, provider, type, status, connected_at, last_sync_at")
    .eq("organization_id", viewer.organization.id)
    .order("updated_at", { ascending: false });

  if (result.error) throw new Error("Impossible de charger les connexions.");

  const connections = buildSettingsConnections(result.data ?? []);
  const connected = connections.filter((connection) => connection.status === "Connecté").length;

  return (
    <>
      <PageHeader
        eyebrow="09 · CONNEXIONS"
        title="Connexions"
        description="Les outils que SESIRA utilise pour suivre vos dossiers. Une connexion active ne signifie jamais qu’une action externe est autorisée."
      />

      <section className="premium-connection-summary">
        <div><strong>{connected}</strong><span>Connexions actives</span></div>
        <div><strong>{connections.length - connected}</strong><span>À configurer ou vérifier</span></div>
        <div><strong>{viewer.organization.name}</strong><span>Espace concerné</span></div>
      </section>

      <section className="premium-connection-grid">
        {connections.map((connection) => (
          <article key={connection.key} className="premium-connection-card">
            <header>
              <div className="premium-connection-mark">{connection.title.slice(0, 1)}</div>
              <div><span className="eyebrow">{connection.key.toUpperCase()}</span><h2>{connection.title}</h2></div>
              <StatusPill tone={connection.tone === "emerald" ? "good" : connection.tone === "amber" ? "warning" : "neutral"}>{connection.status}</StatusPill>
            </header>
            <p>{connection.description}</p>
            <div className="premium-data-list compact">
              <div><span>État</span><strong>{connection.status}</strong></div>
              <div><span>Dernière synchronisation</span><strong>{connection.lastSync ? formatDate(connection.lastSync) : "Aucune"}</strong></div>
              <div><span>Enregistrement</span><strong>{connection.hasRecord ? "Présent" : "Absent"}</strong></div>
            </div>
            <button className="button ghost small full" type="button" disabled>
              {connection.hasRecord ? "Gestion de connexion bientôt disponible" : "Connexion bientôt disponible"}
            </button>
          </article>
        ))}
      </section>

      <section className="premium-trust-note">
        <span className="eyebrow">GARDE FOU</span>
        <h2>Connecté ne veut pas dire autorisé à envoyer.</h2>
        <p>La connexion donne à SESIRA le contexte nécessaire pour observer. Les actions externes restent gouvernées séparément par le mode d’automatisation et les règles de votre entreprise.</p>
      </section>
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
