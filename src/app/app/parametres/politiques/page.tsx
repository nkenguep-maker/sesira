import Link from "next/link";

import { PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getSoldNotScheduledPolicy } from "@/lib/data";

import { saveSoldNotScheduledPolicyAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

export default async function ValuePoliciesPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;
  const policy = await getSoldNotScheduledPolicy(viewer.organization.id);

  return (
    <>
      <PageHeader
        eyebrow="19 · POLITIQUES DE VALEUR"
        title="Politiques de valeur"
        description="Votre organisation définit ce qui mérite une attention renforcée. SESIRA n’applique aucun seuil CVC universel."
        actions={<Link href="/app/parametres" className="button ghost small">Retour aux paramètres</Link>}
      />

      {params.status === "saved" ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>La politique a été confirmée par le Core.</p></section> : null}
      {params.status === "invalid" ? <section className="premium-inline-notice"><StatusPill tone="warning">À corriger</StatusPill><p>Un délai est requis lorsque la politique est active et les valeurs numériques doivent être positives.</p></section> : null}
      {params.status === "error" ? <section className="premium-inline-notice"><StatusPill tone="warning">Non enregistré</StatusPill><p>Le Core n’a pas confirmé la modification. Aucun état de succès n’est affiché.</p></section> : null}

      <section className="panel">
        <div className="panel-head">
          <div><span className="eyebrow">VENDU MAIS NON PLANIFIÉ</span><h2>Une vente gagnée doit avoir un prochain pas.</h2></div>
          <StatusPill tone={policy.enabled ? "good" : policy.configured ? "neutral" : "warning"}>
            {policy.enabled ? "Active" : policy.configured ? "Désactivée" : "À configurer"}
          </StatusPill>
        </div>
        <p className="panel-copy">Quand une opportunité passe à Gagnée sans prochain pas opérationnel, SESIRA crée une Attention datée selon le délai que vous choisissez. Si un prochain pas est ensuite enregistré, cette Attention se ferme automatiquement.</p>

        <form action={saveSoldNotScheduledPolicyAction} className="settings-stack">
          <label className="panel">
            <span className="eyebrow">ACTIVATION</span>
            <span><input type="checkbox" name="enabled" defaultChecked={policy.enabled} /> Activer cette politique</span>
          </label>
          <label className="panel">
            <span className="eyebrow">DÉLAI AVANT ATTENTION</span>
            <input name="graceHours" type="number" min="0" max="8760" step="1" defaultValue={policy.graceHours ?? ""} placeholder="Ex. 24" />
            <span className="premium-muted-copy">Aucune valeur n’est préremplie par SESIRA. Ce délai appartient à votre organisation.</span>
          </label>
          <label className="panel">
            <span className="eyebrow">SEUIL DE PRIORITÉ HAUTE · FACULTATIF</span>
            <input name="highValueAmount" type="number" min="0" step="100" defaultValue={policy.highValueAmount ?? ""} placeholder="Ex. 25000" />
            <span className="premium-muted-copy">Si renseigné, le seuil s’applique dans la devise de votre organisation ({policy.currency ?? "devise non disponible"}). Il change la priorité, pas l’autorité de décision.</span>
          </label>
          <label className="panel">
            <span className="eyebrow">NOTE INTERNE · FACULTATIF</span>
            <textarea name="note" rows={3} maxLength={500} defaultValue={policy.note ?? ""} placeholder="Pourquoi cette règle existe dans votre entreprise" />
          </label>
          <button type="submit" className="button primary">Enregistrer la politique</button>
        </form>
      </section>

      <section className="premium-trust-note">
        <span className="eyebrow">GARDE FOU</span>
        <h2>Valeur élevée ne signifie jamais automatisation sensible.</h2>
        <p>Cette politique ne négocie pas un prix, ne prend pas d’engagement contractuel et ne planifie rien à votre place. Elle fait remonter l’exception et laisse la décision à un humain.</p>
      </section>
    </>
  );
}
