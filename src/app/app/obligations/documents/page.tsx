import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList } from "@/lib/data";
import { getRegulatoryWorkspace } from "@/lib/data/c40-ui";
import { getPendingCerfaInterventions } from "@/lib/data/regulatory-extra";

import { markRegulatoryAttentionSeenAction, prepareAnnualBilanAction, prepareCerfaAction, resolveRegulatoryAttentionAction } from "../actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string }>;

export default async function RegulatoryDocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;
  const [workspace, pendingCerfa, customers] = await Promise.all([
    getRegulatoryWorkspace(viewer.organization.id),
    getPendingCerfaInterventions(viewer.organization.id),
    getCustomerList(viewer.organization.id, { limit: 500 }),
  ]);
  if (workspace.status === "ERROR") {
    return <><PageHeader eyebrow="OBLIGATIONS CVC" title="Documents à préparer" description="CERFA, bilan annuel, attestations et points à traiter." /><section className="app-state-message"><strong>Données indisponibles</strong><p>SESIRA ne peut pas lire ce registre de manière fiable.</p></section></>;
  }
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.displayName] as const));
  const { attentions, attestations, exports } = workspace.data;

  return (
    <>
      <PageHeader eyebrow="OBLIGATIONS CVC" title="Documents à préparer" description="SESIRA prépare et trace les éléments nécessaires. Le dépôt auprès de l’organisme compétent reste sous votre responsabilité." />
      <ResultNotice result={params.result} />
      <section className="workspace-stat-strip">
        <div><strong>{attentions.length}</strong><span>Points ouverts</span></div>
        <div><strong>{pendingCerfa.status === "OK" ? pendingCerfa.rows.length : "—"}</strong><span>CERFA à préparer</span></div>
        <div><strong>{exports.filter((row) => row.status === "READY").length}</strong><span>Exports prêts</span></div>
        <div><strong>{attestations.length}</strong><span>Attestations suivies</span></div>
      </section>
      <section className="workspace-boundary-note"><StatusPill tone="warning">Validation humaine</StatusPill><p>Préparer un document dans SESIRA n’effectue aucun dépôt externe et ne constitue pas un verdict réglementaire.</p></section>

      <section className="workspace-section">
        <div className="workspace-section-heading"><div><span className="eyebrow">À TRAITER</span><h2>Points réglementaires ouverts</h2></div><span>{attentions.length}</span></div>
        {attentions.length ? <div className="workspace-list">{attentions.map((item) => (
          <article className="workspace-row" key={item.id}>
            <div className="workspace-row-main">
              <div className="workspace-row-heading"><div><span className="eyebrow">{attentionCategory(item.category)}</span><h2>{item.title}</h2></div><StatusPill tone={item.priority === "URGENT" || item.priority === "HIGH" ? "warning" : "neutral"}>{priorityLabel(item.priority)}</StatusPill></div>
              <p className="workspace-description">{item.explanation ?? "Ce point demande une vérification."}</p>
              <div className="workspace-meta"><span><b>Créé</b>{formatDateTime(item.createdAt)}</span><span><b>Vu</b>{item.seenAt ? formatDateTime(item.seenAt) : "Pas encore"}</span><span><b>Suite suggérée</b>{item.suggestedAction ?? "À décider"}</span></div>
            </div>
            <div className="workspace-row-actions">
              {!item.seenAt ? <form action={markRegulatoryAttentionSeenAction}><input type="hidden" name="attentionId" value={item.id} /><button className="button ghost small" type="submit">Marquer comme vu</button></form> : null}
              <form action={resolveRegulatoryAttentionAction} className="workspace-inline-form compact"><input type="hidden" name="attentionId" value={item.id} /><label><span>Note de résolution</span><input name="note" maxLength={2000} placeholder="Vérification effectuée, document obtenu…" /></label><button className="button primary small" type="submit">Clore ce point</button></form>
            </div>
          </article>
        ))}</div> : <EmptyState title="Aucun point ouvert" description="Aucune attention réglementaire non résolue n’est enregistrée." />}
      </section>

      <section className="workspace-section">
        <div className="workspace-section-heading"><div><span className="eyebrow">CERFA</span><h2>Interventions terminées à préparer</h2></div></div>
        {pendingCerfa.status === "ERROR" ? <p className="workspace-empty-line">Cette liste est momentanément indisponible.</p> : pendingCerfa.rows.length ? <div className="workspace-list compact-list">{pendingCerfa.rows.map((row) => (
          <article className="workspace-row" key={row.interventionId}><div className="workspace-row-main"><div className="workspace-row-heading"><div><span className="eyebrow">{customerNames.get(row.customerId) ?? "Client"}</span><h2>{row.title}</h2></div><StatusPill tone="warning">À préparer</StatusPill></div><p className="workspace-description">Intervention terminée{row.completedAt ? ` le ${formatDate(row.completedAt)}` : ""}. Aucun dépôt externe ne sera effectué.</p></div><div className="workspace-row-actions"><form action={prepareCerfaAction}><input type="hidden" name="interventionId" value={row.interventionId} /><button className="button primary small" type="submit">Préparer le CERFA</button></form></div></article>
        ))}</div> : <p className="workspace-empty-line">Aucune intervention n’attend actuellement cette préparation.</p>}
      </section>

      <section className="workspace-section">
        <div className="workspace-section-heading"><div><span className="eyebrow">BILAN ANNUEL</span><h2>Préparer un bilan annuel</h2></div></div>
        <form action={prepareAnnualBilanAction} className="workspace-inline-form"><label><span>Année de référence</span><input type="number" name="year" min="2024" max="2100" required defaultValue={new Date().getFullYear() - 1} /></label><button className="button primary small" type="submit">Préparer le bilan</button></form>
        <p className="premium-muted-copy">SESIRA produit un export de travail. Votre entreprise reste responsable de sa vérification et de son dépôt auprès de l’organisme concerné.</p>
      </section>

      <section className="workspace-section">
        <div className="workspace-section-heading"><div><span className="eyebrow">ATTESTATIONS</span><h2>Validité enregistrée</h2></div></div>
        {attestations.length ? <div className="workspace-list compact-list">{attestations.map((row) => <article className="workspace-row" key={row.id}><div className="workspace-row-main"><div className="workspace-row-heading"><div><span className="eyebrow">{attestationKind(row.kind)}</span><h2>{row.referenceNumber}</h2></div><StatusPill tone={row.status === "ACTIVE" ? "good" : "warning"}>{attestationStatus(row.status)}</StatusPill></div><div className="workspace-meta"><span><b>Organisme</b>{row.issuedBy}</span><span><b>Valable du</b>{formatDate(row.validFrom)}</span><span><b>Jusqu’au</b>{formatDate(row.validUntil)}</span><span><b>Document lié</b>{row.documentId ? "Oui" : "Non"}</span></div></div></article>)}</div> : <EmptyState title="Aucune attestation enregistrée" description="Les attestations apparaîtront ici lorsqu’elles seront enregistrées." />}
      </section>

      <section className="workspace-section">
        <div className="workspace-section-heading"><div><span className="eyebrow">EXPORTS</span><h2>Documents préparés</h2></div><span>{exports.length}</span></div>
        {exports.length ? <div className="workspace-list compact-list">{exports.map((row) => <article className="workspace-row" key={row.id}><div className="workspace-row-main"><div className="workspace-row-heading"><div><span className="eyebrow">{exportKind(row.kind)}</span><h2>{row.referenceYear ? `Année ${row.referenceYear}` : row.interventionId ? "Intervention liée" : "Dossier"}</h2></div><StatusPill tone={row.status === "READY" || row.status === "EXPORTED" ? "good" : row.gapCount ? "warning" : "neutral"}>{exportStatus(row.status)}</StatusPill></div><div className="workspace-meta"><span><b>Préparé</b>{formatDateTime(row.generatedAt)}</span><span><b>Informations manquantes</b>{row.gapCount}</span><span><b>Export externe</b>{row.exportedAt ? `${formatDateTime(row.exportedAt)} · ${row.exportFormat ?? "format non indiqué"}` : "Non enregistré"}</span></div></div></article>)}</div> : <EmptyState title="Aucun document préparé" description="Les CERFA et bilans préparés apparaîtront ici." />}
      </section>
    </>
  );
}

function ResultNotice({ result }: { result?: string }) { if (!result) return null; const good = ["seen", "resolved", "prepared", "cerfa-prepared"].includes(result); const copy: Record<string, string> = { seen: "Le premier affichage a été enregistré.", resolved: "Le point a été clôturé avec une décision humaine tracée.", prepared: "Le bilan a été préparé dans SESIRA. Aucun dépôt externe n’a été effectué.", "cerfa-prepared": "Le CERFA a été préparé dans SESIRA. Aucun dépôt externe n’a été effectué.", "invalid-year": "L’année de référence n’est pas valide.", invalid: "L’élément demandé n’est pas identifiable.", "not-applied": "SESIRA n’a pas pu confirmer cette action." }; return <section className="premium-inline-notice"><StatusPill tone={good ? "good" : "warning"}>{good ? "Enregistré" : "Non appliqué"}</StatusPill><p>{copy[result] ?? "État inconnu."}</p></section>; }
function attentionCategory(value: string) { return ({ LEAK_CHECK_DUE: "Contrôle de fuite", ATTESTATION_EXPIRING: "Attestation", MISSING_REGULATORY_DATA: "Donnée manquante" } as Record<string, string>)[value] ?? "Obligation CVC"; }
function priorityLabel(value: string) { return ({ URGENT: "Urgent", HIGH: "Haute", NORMAL: "Normale", LOW: "Basse" } as Record<string, string>)[value] ?? value; }
function attestationKind(value: string) { return value === "COMPANY_CAPACITY" ? "Capacité entreprise" : value === "TECHNICIAN_APTITUDE" ? "Aptitude technicien" : "Attestation"; }
function attestationStatus(value: string) { return ({ ACTIVE: "Active", REVOKED: "Révoquée", EXPIRED: "Expirée" } as Record<string, string>)[value] ?? value; }
function exportKind(value: string) { return value === "CERFA_15497_04" ? "CERFA 15497*04" : value === "ANNUAL_BILAN" ? "Bilan annuel" : "Export réglementaire"; }
function exportStatus(value: string) { return ({ DRAFT: "À compléter", READY: "Prêt", EXPORTED: "Exporté", SUPERSEDED: "Remplacé" } as Record<string, string>)[value] ?? value; }
function formatDate(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d); }
function formatDateTime(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d); }
