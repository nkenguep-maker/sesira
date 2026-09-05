import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";
import { getDemoTeamMembers } from "@/lib/demo/team";

export const dynamic = "force-dynamic";

export default async function DemoTeamPage() {
  const members = await getDemoTeamMembers(DEMO_ORGANIZATION_ID);
  return (
    <>
      <PageHeader eyebrow="DÉMO · ORGANISATION" title="Équipe" description="Équipe entièrement fictive. Aucun compte réel du présentateur n’est affiché." />
      <section className="premium-connection-summary"><div><strong>{members.length}</strong><span>Membres</span></div><div><strong>{members.filter((m)=>m.status === "ACTIVE").length}</strong><span>Actifs</span></div><div><strong>{members.filter((m)=>["OWNER","ADMIN","MANAGER"].includes(m.role)).length}</strong><span>Responsables</span></div></section>
      {members.length ? <section className="premium-connection-grid">{members.map((member)=>(<article key={member.id} className="premium-connection-card"><header><div className="premium-connection-mark">{(member.fullName ?? "M").slice(0,1).toUpperCase()}</div><div><span className="eyebrow">MEMBRE FICTIF</span><h2>{member.fullName ?? "Membre"}</h2></div><StatusPill tone="good">Actif</StatusPill></header><div className="premium-data-list compact"><div><span>Email</span><strong>{member.email ?? "—"}</strong></div><div><span>Rôle</span><strong>{role(member.role)}</strong></div></div></article>))}</section> : <EmptyState title="Aucun membre" description="Le roster fictif n’est pas disponible." />}
    </>
  );
}
function role(v:string){return ({OWNER:"Propriétaire",ADMIN:"Administrateur",MANAGER:"Responsable",MEMBER:"Membre",TECH:"Technicien",TECHNICIAN:"Technicien"} as Record<string,string>)[v]??v;}
