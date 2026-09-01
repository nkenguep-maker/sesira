import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";

export default function SuiviPage() {
  return <><PageHeader eyebrow="04 · EXÉCUTION" title="Suivi" description="Les prochaines actions, relances et signaux importants au même endroit." /><section className="panel"><div className="panel-head"><div><span className="eyebrow">RÈGLE ACTIVE</span><h2>Suivi automatique</h2></div><StatusPill>Non configuré</StatusPill></div><p className="panel-copy">Aucune règle d’automatisation n’est active dans cette version UI.</p></section><EmptyState title="Aucune action à afficher" description="Quand le suivi sera relié au core, les actions réellement dues seront listées ici." /></>;
}
