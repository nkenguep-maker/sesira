import { PageHeader, StatusPill } from "@/components/sesira/ui";

const integrations = [
  ["E-mail", "Conversations et contexte client"],
  ["Données commerciales", "Clients, opportunités et devis"],
  ["Calendrier", "Rendez-vous et échéances"],
  ["Documents", "Pièces et informations de travail"],
] as const;

export default function IntegrationsPage() {
  return <><PageHeader eyebrow="06 · CONNEXIONS" title="Intégrations" description="Connectez uniquement les sources dont SESIRA a besoin." /><section className="integration-grid">{integrations.map(([name, description]) => <article className="integration-card" key={name}><div className="integration-icon">{name.slice(0,1)}</div><div><h2>{name}</h2><p>{description}</p></div><StatusPill>Non connecté</StatusPill><button className="button ghost small">Configurer</button></article>)}</section></>;
}
