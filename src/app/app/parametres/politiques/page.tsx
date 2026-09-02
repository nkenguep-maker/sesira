import Link from "next/link";

import { PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getSoldNotScheduledPolicy, getSpeedToLeadPolicy } from "@/lib/data";

import { saveSoldNotScheduledPolicyAction, saveSpeedToLeadPolicyAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; speed?: string }>;

export default async function ValuePoliciesPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;
  const [policy, speedPolicy] = await Promise.all([
    getSoldNotScheduledPolicy(viewer.organization.id),
    getSpeedToLeadPolicy(viewer.organization.id),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="POLITIQUES DE VALEUR"
        title="Politiques de valeur"
        description="Votre organisation définit ce qui mérite une attention renforcée. SESIRA ne transforme pas un benchmark externe en règle universelle."
        actions={<Link href="/app/parametres" className="button ghost small">Retour aux paramètres</Link>}
      />

      {params.status === "saved" ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>La politique vendu mais non planifié a été confirmée par le Core.</p></section> : null}
      {params.status === "invalid" ? <section className="premium-inline-notice"><StatusPill tone="warning">À corriger</StatusPill><p>Un délai est requis lorsque la politique est active et les valeurs numériques doivent être positives.</p></section> : null}
      {params.status === "error" ? <section className="premium-inline-notice"><StatusPill tone="warning">Non enregistré</StatusPill><p>Le Core n’a pas confirmé la modification. Aucun état de succès n’est affiché.</p></section> : null}
      {params.speed === "saved" ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>Le délai de prise en charge a été confirmé par le Core.</p></section> : null}
      {params.speed === "invalid" ? <section className="premium-inline-notice"><StatusPill tone="warning">À corriger</StatusPill><p>Choisissez un délai entier entre 1 minute et 7 jours lorsque la politique est active.</p></section> : null}
      {params.speed === "error" ? <section className="premium-inline-notice"><StatusPill tone="warning">Non enregistré</StatusPill><p>Le Core n’a pas confirmé la politique de prise en charge.</p></section> : null}

      <section className="panel">
        <div className="panel-head">
          <div><span className="eyebrow">PRISE EN CHARGE DES NOUVELLES DEMANDES</span><h2>Combien de temps une nouvelle demande peut elle attendre ?</h2></div>
          <StatusPill tone={speedPolicy.enabled ? "good" : speedPolicy.configured ? "neutral" : "warning"}>
            {speedPolicy.enabled ? "Active" : speedPolicy.configured ? "Désactivée" : "À configurer"}
          </StatusPill>
        </div>
        <p className="panel-copy">SESIRA mesure le temps entre la création d’une demande et sa première transition réelle hors de Nouvelle. Il s’agit d’une prise en charge interne. Ce chiffre ne prétend jamais qu’une réponse a été envoyée au client.</p>

        <form action={saveSpeedToLeadPolicyAction} className="settings-stack">
          <label className="panel">
            <span className="eyebrow">ACTIVATION</span>
            <span><input type="checkbox" name="enabled" defaultChecked={speedPolicy.enabled} /> Surveiller les nouvelles demandes qui attendent trop longtemps</span>
          </label>
          <label className="panel">
            <span className="eyebrow">DÉLAI CIBLE EN MINUTES</span>
            <input name="targetMinutes" type="number" min="1" max="10080" step="1" defaultValue={speedPolicy.targetMinutes ?? ""} placeholder="Ex. 60" />
            <span className="premium-muted-copy">Aucune valeur n’est préremplie par SESIRA. Le délai appartient à votre organisation.</span>
          </label>
          <label className="panel">
            <span className="eyebrow">NOTE INTERNE · FACULTATIF</span>
            <textarea name="note" rows={3} maxLength={500} defaultValue={speedPolicy.note ?? ""} placeholder="Pourquoi ce délai est important pour votre équipe" />
          </label>
          <button type="submit" className="button primary">Enregistrer le délai de prise en charge</button>
        </form>
      </section>

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
        <h2>Mesurer vite ne veut pas dire répondre automatiquement.</h2>
        <p>Speed to Lead détecte un retard de prise en charge et le fait remonter. Il ne contacte pas le client, ne qualifie pas une demande à la place de l’équipe et ne transforme pas un délai interne en autorisation d’envoi.</p>
      </section>
    </>
  );
}
