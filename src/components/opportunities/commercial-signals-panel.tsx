import { StatusPill } from "@/components/sesira/ui";
import { buildCommercialSignalFactors, type OpportunityCommercialSnapshot } from "@/lib/commercial/signals";
import { COMMERCIAL_OBJECTION_KINDS, COMMERCIAL_OBJECTION_LABELS } from "@/lib/commercial/objections";
import { correctCommercialObjectionAction } from "@/app/app/opportunites/actions";

export function CommercialSignalsPanel({ opportunityId, snapshot }: { opportunityId: string; snapshot: OpportunityCommercialSnapshot | null }) {
  if (!snapshot) return <section className="panel"><span className="eyebrow">SIGNAUX COMMERCIAUX</span><h2>Données indisponibles.</h2><p className="panel-copy">SESIRA ne remplace pas un signal manquant par une estimation.</p></section>;
  const factors = buildCommercialSignalFactors(snapshot);
  return (
    <>
      <section className="premium-results-section">
        <div className="premium-section-heading"><div><span className="eyebrow">SIGNAUX OBSERVÉS</span><h2>Les faits avant le score.</h2></div><StatusPill tone="neutral">Aucun score global</StatusPill></div>
        <div className="premium-connection-grid">{factors.map((factor) => <article key={factor.key} className="premium-connection-card"><header><div><span className="eyebrow">{factor.source === "OBSERVED" ? "OBSERVÉ" : "GARDE FOU"}</span><h2>{factor.label}</h2></div></header><strong>{factor.value}</strong>{factor.caution ? <p>{factor.caution}</p> : null}{factor.evidenceAt ? <p className="premium-muted-copy">Source datée : {formatDate(factor.evidenceAt)}</p> : null}</article>)}</div>
      </section>

      <section className="premium-results-section">
        <div className="premium-section-heading"><div><span className="eyebrow">OBJECTIONS</span><h2>Classées, sourcées, corrigibles.</h2></div></div>
        {snapshot.objections.length ? <div className="premium-connection-grid">{snapshot.objections.map((objection) => <article key={objection.id} className="premium-connection-card"><header><div><span className="eyebrow">{objection.source === "HUMAN" ? "CONFIRMÉ PAR UN HUMAIN" : "CLASSIFICATION AI"}</span><h2>{COMMERCIAL_OBJECTION_LABELS[objection.kind]}</h2></div><StatusPill tone={objection.sensitive ? "warning" : objection.confidence < 0.5 ? "warning" : "neutral"}>{objection.sensitive ? "Décision humaine" : `${Math.round(objection.confidence * 100)} %`}</StatusPill></header><p>{objection.summary}</p>{objection.evidence ? <blockquote>{objection.evidence}</blockquote> : null}<form action={correctCommercialObjectionAction} className="settings-stack"><input type="hidden" name="opportunityId" value={opportunityId} /><input type="hidden" name="messageId" value={objection.messageId} /><label><span className="eyebrow">CORRIGER LA CATÉGORIE</span><select name="kind" defaultValue={objection.kind}><option value="NONE">Aucune objection</option>{COMMERCIAL_OBJECTION_KINDS.map((kind) => <option key={kind} value={kind}>{COMMERCIAL_OBJECTION_LABELS[kind]}</option>)}</select></label><label><span className="eyebrow">RÉSUMÉ HUMAIN</span><input name="summary" defaultValue={objection.summary} maxLength={500} /></label><button type="submit" className="button ghost small">Enregistrer la correction</button></form></article>)}</div> : <p className="premium-muted-copy">Aucune objection structurée n’est ouverte sur cette opportunité.</p>}
      </section>
      <section className="premium-trust-note"><span className="eyebrow">INTERPRÉTATION</span><h2>Une ouverture d’email n’est pas de l’intérêt.</h2><p>SESIRA peut conserver des événements techniques de livraison, mais ils ne deviennent jamais à eux seuls un signal commercial. Les facteurs ci-dessus restent séparés et explicables.</p></section>
    </>
  );
}
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
