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
        eyebrow="PARAMÈTRES"
        title="Règles de suivi"
        description="Définissez les délais et seuils qui correspondent à votre manière de travailler."
        actions={<Link href="/app/parametres" className="button ghost small">Retour</Link>}
      />

      {params.status === "saved" ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>La règle « vendu mais non planifié » a été enregistrée.</p></section> : null}
      {params.status === "invalid" ? <section className="premium-inline-notice"><StatusPill tone="warning">À corriger</StatusPill><p>Un délai est requis lorsque la règle est active et les valeurs numériques doivent être positives.</p></section> : null}
      {params.status === "error" ? <section className="premium-inline-notice"><StatusPill tone="warning">Non enregistré</StatusPill><p>La modification n’a pas pu être confirmée. Aucun état de succès n’est affiché.</p></section> : null}
      {params.speed === "saved" ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>Le délai de prise en charge a été enregistré.</p></section> : null}
      {params.speed === "invalid" ? <section className="premium-inline-notice"><StatusPill tone="warning">À corriger</StatusPill><p>Choisissez un délai entier entre 1 minute et 7 jours lorsque la règle est active.</p></section> : null}
      {params.speed === "error" ? <section className="premium-inline-notice"><StatusPill tone="warning">Non enregistré</StatusPill><p>Le délai de prise en charge n’a pas pu être enregistré.</p></section> : null}

      <section className="panel">
        <div className="panel-head">
          <div><span className="eyebrow">NOUVELLES DEMANDES</span><h2>Délai de première prise en charge</h2></div>
          <StatusPill tone={speedPolicy.enabled ? "good" : speedPolicy.configured ? "neutral" : "warning"}>
            {speedPolicy.enabled ? "Active" : speedPolicy.configured ? "Désactivée" : "À configurer"}
          </StatusPill>
        </div>
        <p className="panel-copy">SESIRA mesure le temps entre la création d’une demande et sa première prise en charge interne. Cette mesure ne signifie pas qu’une réponse a été envoyée au client.</p>

        <form action={saveSpeedToLeadPolicyAction} className="settings-stack">
          <label className="panel">
            <span className="eyebrow">ACTIVATION</span>
            <span><input type="checkbox" name="enabled" defaultChecked={speedPolicy.enabled} /> Faire remonter les nouvelles demandes qui attendent trop longtemps</span>
          </label>
          <label className="panel">
            <span className="eyebrow">DÉLAI CIBLE EN MINUTES</span>
            <input name="targetMinutes" type="number" min="1" max="10080" step="1" defaultValue={speedPolicy.targetMinutes ?? ""} placeholder="Ex. 60" />
            <span className="premium-muted-copy">Aucune valeur n’est préremplie. Ce délai appartient à votre organisation.</span>
          </label>
          <label className="panel">
            <span className="eyebrow">NOTE INTERNE · FACULTATIF</span>
            <textarea name="note" rows={3} maxLength={500} defaultValue={speedPolicy.note ?? ""} placeholder="Pourquoi ce délai est important pour votre équipe" />
          </label>
          <button type="submit" className="button primary">Enregistrer le délai</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div><span className="eyebrow">VENDU MAIS NON PLANIFIÉ</span><h2>Une vente gagnée doit avoir une suite</h2></div>
          <StatusPill tone={policy.enabled ? "good" : policy.configured ? "neutral" : "warning"}>
            {policy.enabled ? "Active" : policy.configured ? "Désactivée" : "À configurer"}
          </StatusPill>
        </div>
        <p className="panel-copy">Quand une opportunité est gagnée sans prochain pas opérationnel, SESIRA la fait remonter après le délai que vous choisissez. Dès qu’un prochain pas est enregistré, elle quitte cette file.</p>

        <form action={saveSoldNotScheduledPolicyAction} className="settings-stack">
          <label className="panel">
            <span className="eyebrow">ACTIVATION</span>
            <span><input type="checkbox" name="enabled" defaultChecked={policy.enabled} /> Activer cette règle</span>
          </label>
          <label className="panel">
            <span className="eyebrow">DÉLAI AVANT REMONTÉE</span>
            <input name="graceHours" type="number" min="0" max="8760" step="1" defaultValue={policy.graceHours ?? ""} placeholder="Ex. 24" />
            <span className="premium-muted-copy">Aucune valeur n’est préremplie. Ce délai appartient à votre organisation.</span>
          </label>
          <label className="panel">
            <span className="eyebrow">SEUIL DE PRIORITÉ HAUTE · FACULTATIF</span>
            <input name="highValueAmount" type="number" min="0" step="100" defaultValue={policy.highValueAmount ?? ""} placeholder="Ex. 25000" />
            <span className="premium-muted-copy">Si renseigné, ce montant s’applique dans la devise de votre organisation ({policy.currency ?? "devise non disponible"}). Il change la priorité d’affichage, pas la personne qui décide.</span>
          </label>
          <label className="panel">
            <span className="eyebrow">NOTE INTERNE · FACULTATIF</span>
            <textarea name="note" rows={3} maxLength={500} defaultValue={policy.note ?? ""} placeholder="Pourquoi cette règle existe dans votre entreprise" />
          </label>
          <button type="submit" className="button primary">Enregistrer la règle</button>
        </form>
      </section>

      <section className="premium-trust-note">
        <span className="eyebrow">LIMITE</span>
        <h2>Surveiller un délai ne veut pas dire répondre automatiquement</h2>
        <p>SESIRA fait remonter un retard de prise en charge. Il ne contacte pas le client, ne qualifie pas une demande à la place de l’équipe et ne transforme pas ce délai en autorisation d’envoi.</p>
      </section>
    </>
  );
}
