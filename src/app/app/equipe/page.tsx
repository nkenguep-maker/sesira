import { CopyTechnicalId } from "@/components/sesira/copy-technical-id";
import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getOrganizationMembers } from "@/lib/data";
import { getDemoTeamMembers } from "@/lib/demo/team";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const members = viewer.organization.demoMode
    ? await getDemoTeamMembers(viewer.organization.id)
    : await getOrganizationMembers(viewer.organization.id);
  const active = members.filter((member) => member.status === "ACTIVE").length;
  const managers = members.filter((member) => ["OWNER", "ADMIN", "MANAGER"].includes(member.role)).length;
  const summaryValues = [members.length, active, managers];
  const showTiles = members.length > 1 && new Set(summaryValues).size > 1;
  const canInvite = ["OWNER", "ADMIN"].includes(viewer.role);

  return (
    <>
      <PageHeader
        eyebrow="ORGANISATION"
        title="Équipe"
        description="Qui a accès à SESIRA, et avec quel rôle."
        actions={canInvite ? (
          <div style={{ display: "grid", justifyItems: "end", gap: 7 }}>
            <button className="button primary small" type="button" disabled>Inviter un collaborateur</button>
            <span style={{ color: "var(--ink-soft)", fontSize: 11 }}>L’invitation de collaborateurs arrive prochainement.</span>
          </div>
        ) : undefined}
      />

      {members.length ? (
        showTiles ? (
          <section className="premium-connection-summary">
            <div><strong>{members.length}</strong><span>{pluralLabel(members.length, "Membre", "Membres")}</span></div>
            <div><strong>{active}</strong><span>{pluralLabel(active, "Actif", "Actifs")}</span></div>
            <div><strong>{managers}</strong><span>{pluralLabel(managers, "Responsable", "Responsables")}</span></div>
          </section>
        ) : (
          <p style={{ margin: "0 0 28px", color: "var(--ink-soft)", fontSize: 14 }}>
            <strong style={{ color: "var(--ink)" }}>{compactSummary(members.length, active, managers, members[0]?.userId === viewer.userId)}</strong>
          </p>
        )
      ) : null}

      {members.length ? (
        <section className="premium-connection-grid">
          {members.map((member) => (
            <article key={member.id} className="premium-connection-card">
              <header>
                <div className="premium-connection-mark">{memberInitial(member.fullName, member.email)}</div>
                <div>
                  <h2>{member.fullName ?? member.email ?? "Membre"}</h2>
                </div>
                <StatusPill tone={member.status === "ACTIVE" ? "good" : "neutral"}>{statusLabel(member.status)}</StatusPill>
              </header>
              <div className="premium-data-list compact">
                <div><span>Adresse e-mail</span><strong>{member.email ?? "E-mail indisponible"}</strong></div>
                <div><span>Rôle</span><strong>{roleLabel(member.role)}</strong></div>
                <div><span>Ajouté</span><strong>{formatDate(member.createdAt)}</strong></div>
              </div>
              <div style={{ marginTop: 14 }}>
                <CopyTechnicalId value={member.userId} />
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Aucun membre disponible"
          description="Aucun accès d’équipe n’est enregistré pour cette organisation."
        />
      )}
    </>
  );
}

function compactSummary(members: number, active: number, managers: number, viewerIsOnlyMember: boolean) {
  if (members === 1 && viewerIsOnlyMember) return "1 membre · vous.";
  return `${members} ${pluralLabel(members, "membre", "membres")} · ${active} ${pluralLabel(active, "actif", "actifs")} · ${managers} ${pluralLabel(managers, "responsable", "responsables")}.`;
}

function pluralLabel(value: number, singular: string, plural: string) {
  return value === 1 ? singular : plural;
}

function memberInitial(fullName: string | null, email: string | null) {
  return (fullName ?? email ?? "M").trim().slice(0, 1).toUpperCase() || "M";
}

function roleLabel(role: string) {
  const labels: Record<string, string> = { OWNER: "Propriétaire", ADMIN: "Administrateur", MANAGER: "Responsable", MEMBER: "Membre", VIEWER: "Lecture seule", TECH: "Technicien", TECHNICIAN: "Technicien" };
  return labels[role] ?? role;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { ACTIVE: "Actif", INVITED: "Invité", SUSPENDED: "Suspendu" };
  return labels[status] ?? status;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}
