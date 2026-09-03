import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getOrganizationMembers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const members = await getOrganizationMembers(viewer.organization.id);
  const active = members.filter((member) => member.status === "ACTIVE").length;
  const managers = members.filter((member) => member.role === "OWNER" || member.role === "ADMIN" || member.role === "MANAGER").length;

  return (
    <>
      <PageHeader
        eyebrow="05 · ORGANISATION"
        title="Équipe"
        description="Les membres réellement rattachés à votre organisation et le rôle que SESIRA connaît pour chacun."
      />

      <section className="premium-connection-summary">
        <div><strong>{members.length}</strong><span>Membres connus</span></div>
        <div><strong>{active}</strong><span>Actifs</span></div>
        <div><strong>{managers}</strong><span>Responsables</span></div>
      </section>

      {members.length ? (
        <section className="premium-connection-grid">
          {members.map((member) => (
            <article key={member.id} className="premium-connection-card">
              <header>
                <div className="premium-connection-mark">{(member.fullName ?? "M").slice(0, 1).toUpperCase()}</div>
                <div>
                  <span className="eyebrow">{roleLabel(member.role)}</span>
                  <h2>{member.fullName ?? "Membre sans nom renseigné"}</h2>
                </div>
                <StatusPill tone={member.status === "ACTIVE" ? "good" : "neutral"}>{statusLabel(member.status)}</StatusPill>
              </header>
              <div className="premium-data-list compact">
                <div><span>Rôle</span><strong>{roleLabel(member.role)}</strong></div>
                <div><span>Identifiant</span><strong>{shortId(member.userId)}</strong></div>
                <div><span>Ajouté</span><strong>{formatDate(member.createdAt)}</strong></div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Aucun membre disponible"
          description="SESIRA n’affiche que les membres réellement présents dans l’organisation."
        />
      )}
    </>
  );
}

function roleLabel(role: string) {
  const labels: Record<string, string> = { OWNER: "Propriétaire", ADMIN: "Administrateur", MANAGER: "Manager", MEMBER: "Membre" };
  return labels[role] ?? role;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { ACTIVE: "Actif", INVITED: "Invité", SUSPENDED: "Suspendu" };
  return labels[status] ?? status;
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}
