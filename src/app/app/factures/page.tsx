import Link from "next/link";

import { EInvoicingStatus } from "@/components/sesira/einvoicing-status";
import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList } from "@/lib/data";
import { getInvoiceCollectionWorkspace } from "@/lib/data/invoice-collection";

import { openInvoiceDisputeAction, recordPaymentPromiseAction, resolveInvoiceDisputeAction } from "./actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ result?: string }>;

export default async function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewerContext(), searchParams]);
  if (!viewer) return null;

  const [result, customers] = await Promise.all([
    getInvoiceCollectionWorkspace(viewer.organization.id),
    getCustomerList(viewer.organization.id, { limit: 500 }),
  ]);
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.displayName] as const));

  if (result.status === "ERROR") {
    return <><PageHeader eyebrow="FINANCES" title="Factures" description="Échéances, paiements attendus et dossiers qui demandent une décision." /><section className="app-state-message"><strong>Factures indisponibles</strong><p>La donnée comptable de suivi n’est pas lisible actuellement.</p></section></>;
  }

  const rows = result.rows;
  const overdue = rows.filter((row) => row.status === "OVERDUE");
  const promises = rows.filter((row) => row.collectionState === "PROMISE_TO_PAY" && !["PAID", "CANCELLED"].includes(row.status));
  const disputes = rows.filter((row) => row.collectionState === "DISPUTED" && !["PAID", "CANCELLED"].includes(row.status));
  const paid = rows.filter((row) => row.status === "PAID");
  const overdueValue = formatTotals(overdue);
  const invoiceLabels = Object.fromEntries(rows.map((row) => [row.id, row.externalRef ?? `Facture ${row.id.slice(0, 8)}`] as const));

  return (
    <>
      <PageHeader
        eyebrow="FINANCES"
        title="Factures"
        description="Concentrez-vous sur les échéances et les exceptions. Votre comptabilité reste la référence pour les montants et les paiements."
        actions={<Link className="button ghost" href="/app/integrations">Connexions comptables</Link>}
      />

      <ResultNotice result={params.result} />

      {rows.length ? (
        <section className="workspace-stat-strip" aria-label="Résumé des factures">
          <div><strong>{overdue.length}</strong><span>En retard</span></div>
          <div><strong>{overdueValue}</strong><span>Montant échu connu</span></div>
          <div><strong>{promises.length}</strong><span>Promesses actives</span></div>
          <div><strong>{disputes.length}</strong><span>Litiges ouverts</span></div>
        </section>
      ) : null}

      <section className="premium-inline-notice">
        <StatusPill>Décision financière humaine</StatusPill>
        <p>SESIRA suit les échéances et les états de recouvrement, mais ne change ni le montant, ni la devise, ni le statut comptable de référence. La prochaine décision reste humaine.</p>
      </section>

      <EInvoicingStatus organizationId={viewer.organization.id} invoiceLabels={invoiceLabels} />

      {rows.length ? (
        <section className="workspace-list" aria-label="Factures suivies">
          {rows.map((row) => {
            const editableCollection = ["ISSUED", "OVERDUE"].includes(row.status);
            return (
              <article className="workspace-row" key={row.id}>
                <div className="workspace-row-main">
                  <div className="workspace-row-heading">
                    <div>
                      <span className="eyebrow">{customerNames.get(row.customerId) ?? "Client"}</span>
                      <h2>{row.externalRef ?? `Facture ${row.id.slice(0, 8)}`}</h2>
                    </div>
                    <div className="workspace-status-stack">
                      <StatusPill tone={invoiceTone(row.status)}>{invoiceLabel(row.status)}</StatusPill>
                      {row.collectionState !== "NORMAL" ? <StatusPill tone={row.collectionState === "DISPUTED" ? "warning" : "neutral"}>{collectionLabel(row.collectionState)}</StatusPill> : null}
                    </div>
                  </div>

                  <div className="workspace-meta">
                    <span><b>Montant</b>{formatAmount(row.amount, row.currency)}</span>
                    <span><b>Échéance</b>{row.dueAt ? formatDate(row.dueAt) : "Non renseignée"}</span>
                    <span><b>Retard observé</b>{row.pastDueDays !== null && row.pastDueDays > 0 ? `${row.pastDueDays} j` : "Aucun"}</span>
                    <span><b>Dernière relance</b>{row.reminderLastSentAt ? formatDateTime(row.reminderLastSentAt) : "Aucune"}</span>
                  </div>

                  {row.collectionState === "PROMISE_TO_PAY" ? <div className={row.paymentPromiseLate ? "workspace-gap-box" : "workspace-preview"}><span>Promesse de paiement</span><p>{row.paymentPromiseDueAt ? formatDateTime(row.paymentPromiseDueAt) : "Date non renseignée"}{row.paymentPromiseNote ? ` · ${row.paymentPromiseNote}` : ""}</p>{row.paymentPromiseLate ? <p>La date promise est dépassée. La prochaine décision reste humaine.</p> : null}</div> : null}
                  {row.collectionState === "DISPUTED" ? <div className="workspace-gap-box"><strong>Litige ouvert</strong><p>{row.disputeReason ?? "Motif non disponible"}</p></div> : null}
                </div>

                <div className="workspace-row-actions">
                  <div className="workspace-preview"><span>Recouvrement</span><p>{collectionSummary(row.status, row.collectionState, row.pastDueDays)}</p></div>
                  {editableCollection ? (
                    <details className="sesira-action-drawer">
                      <summary>Enregistrer une décision</summary>
                      <div className="sesira-action-drawer-body">
                        {row.collectionState !== "DISPUTED" ? <form action={recordPaymentPromiseAction} className="workspace-inline-form compact"><input type="hidden" name="invoiceId" value={row.id} /><label><span>{row.collectionState === "PROMISE_TO_PAY" ? "Nouvelle date promise" : "Date promise"}</span><input required name="promisedFor" type="datetime-local" /></label><label><span>Note facultative</span><input name="note" maxLength={2000} placeholder="Contexte donné par le client" /></label><button type="submit" className="button ghost small">{row.collectionState === "PROMISE_TO_PAY" ? "Mettre à jour" : "Enregistrer la promesse"}</button></form> : null}
                        {row.collectionState !== "DISPUTED" ? <form action={openInvoiceDisputeAction} className="workspace-inline-form compact"><input type="hidden" name="invoiceId" value={row.id} /><label><span>Motif du litige</span><input required name="reason" maxLength={2000} placeholder="Montant contesté, prestation…" /></label><button type="submit" className="button ghost small">Ouvrir un litige</button></form> : <form action={resolveInvoiceDisputeAction} className="workspace-inline-form compact"><input type="hidden" name="invoiceId" value={row.id} /><label><span>Note de résolution facultative</span><input name="resolutionNote" maxLength={2000} placeholder="Accord trouvé, correction externe…" /></label><button type="submit" className="button primary small">Clore le litige</button></form>}
                      </div>
                    </details>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : <EmptyState title="Aucune facture suivie" description="Connectez votre système comptable ou importez vos données pour faire apparaître les échéances ici." action={<Link className="button primary" href="/app/integrations">Configurer une connexion</Link>} />}

      {paid.length ? <p className="premium-muted-copy">{paid.length} facture{paid.length === 1 ? "" : "s"} payée{paid.length === 1 ? "" : "s"} restent visibles dans l’historique.</p> : null}
    </>
  );
}

function ResultNotice({ result }: { result?: string }) { if (!result) return null; return result === "saved" ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>La décision humaine a été enregistrée.</p></section> : <section className="premium-inline-notice"><StatusPill tone="warning">Non appliqué</StatusPill><p>La facture n’a pas changé d’état de recouvrement.</p></section>; }
function collectionSummary(status: string, collectionState: string, pastDueDays: number | null) { if (status === "PAID") return "Paiement enregistré dans la source comptable."; if (collectionState === "DISPUTED") return "Un litige est ouvert et demande un suivi humain."; if (collectionState === "PROMISE_TO_PAY") return "Une promesse client est enregistrée. SESIRA surveille l’échéance."; if (status === "OVERDUE") return pastDueDays ? `Échéance dépassée de ${pastDueDays} jours.` : "Facture échue."; return "Aucune exception de recouvrement n’est enregistrée."; }
function formatTotals(rows: Array<{ amount: number; currency: string }>) { const currencies = new Set(rows.map((row) => row.currency)); if (!rows.length) return "—"; if (currencies.size > 1) return `${currencies.size} devises`; const currency = [...currencies][0]; return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(rows.reduce((sum, row) => sum + row.amount, 0)); }
function invoiceTone(status: string): "good" | "warning" | "neutral" { if (status === "PAID") return "good"; if (status === "OVERDUE") return "warning"; return "neutral"; }
function invoiceLabel(status: string) { return ({ DRAFT: "Brouillon", ISSUED: "Émise", OVERDUE: "En retard", PAID: "Payée", CANCELLED: "Annulée" } as Record<string, string>)[status] ?? status; }
function collectionLabel(status: string) { return ({ PROMISE_TO_PAY: "Promesse enregistrée", DISPUTED: "Litige" } as Record<string, string>)[status] ?? status; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date); }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatAmount(amount: number, currency: string) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
