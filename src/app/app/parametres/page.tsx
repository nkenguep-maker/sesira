import { PageHeader } from "@/components/sesira/ui";

export default function SettingsPage() {
  return <><PageHeader eyebrow="07 · SYSTÈME" title="Paramètres" description="Identité de l'espace, préférences et règles de fonctionnement." /><section className="settings-stack"><article className="panel"><div className="panel-head"><div><span className="eyebrow">ESPACE</span><h2>Organisation</h2></div><button className="button ghost small">Modifier</button></div><dl className="definition-list"><div><dt>Nom</dt><dd>À renseigner</dd></div><div><dt>Secteur</dt><dd>À renseigner</dd></div><div><dt>Fuseau horaire</dt><dd>Europe/Berlin</dd></div></dl></article><article className="panel"><div className="panel-head"><div><span className="eyebrow">COMPORTEMENT</span><h2>Automatisations</h2></div></div><p className="panel-copy">Les automatisations restent désactivées tant que le core ne confirme pas leur disponibilité.</p></article></section></>;
}
