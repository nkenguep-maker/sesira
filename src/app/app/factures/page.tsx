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
    return (
      <>
        <PageHeader eyebrow="OPÉRATIONS" title="Factures" description="Suivi des échéances, promesses de paiement et litiges, sans remplacer la comptabilité." />
        <section className="app-state-message"><strong>Suivi des factures indisponible</strong><p>La donnée comptable de suivi n’est pas lisible actuellement. Aucun montant ni état de remplacement n’est affiché.</p></section>
      </>
    );
  }

  const rows = result.rows;
  const overdue = rows.filter((row) => row.status === "OVERDUE");
  const promises = rows.filter((row) => row.collectionState === "PROMISE_TO_PAY" && !["PAID", "CANCELLED"].includes(row.status));
  const disputes = rows.filter((row) => row.collectionState === "DISPUTED" && !["PAID", "CANCELLED"].includes(row.status));
  const paid = rows.filter((row) => row.status === "PAID");
  const invoiceLabels = Object.fromEntries(rows.map((row) => [row.id, row.externalRef ?? `Facture ${row.id.slice(0, 8)}`] as const));

  return (
    <>
      <PageHeader
        eyebrow="OPÉRATIONS"
        title="Factures"
        description="SESIRA surveille les échéances et conserve les exceptions de recouvrement. Le système comptable reste la source autoritaire du montant et du paiement."
      />

      <ResultNotice result={params.result} />

      <section className="workspace-stat-strip" aria-label="État des factures">
        <div><strong>{overdue.length}</strong><span>En retard</span></div>
        <div><strong>{promises.length}</strong><span>Promesses</span></div>
        <div><strong>{disputes.length}</strong><span>Litiges ouverts</span></div>
        <div><strong>{paid.length}</strong><span>Payées</span></div>
      </section>

      <section className="workspace-boundary-note">
        <StatusPill tone="warning">Décision financière humaine</StatusPill>
        <p>Enregistrer une promesse ou un litige ne change ni le montant, ni le statut comptable, ni la décision de recouvrement. SESIRA ne choisit jamais une remise, une procédure juridique ou un abandon de créance.</p>
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
                    <span><b>Relances enregistrées</b>{row.reminderStage ? `Niveau ${row.reminderStage}` : "Aucune"}</span>
                  </div>

                  {row.collectionState === "PROMISE_TO_PAY" ? (
                    <div className={row.paymentPromiseLate ? "workspace-gap-box" : "workspace-preview"}>
                      <span>Promesse de paiement</span>
                      <p>Échéance promise : {row.paymentPromiseDueAt ? formatDateTime(row.paymentPromiseDueAt) : "Non renseignée"}{row.paymentPromiseNote ? ` · ${row.paymentPromiseNote}` : ""}</p>
                      {row.paymentPromiseLate ? <p>La date promise est dépassée. SESIRA fait remonter le fait, sans choisir la suite.</p> : null}
                    </div>
                  ) : null}

                  {row.collectionState === "DISPUTED" ? (
                    <div className="workspace-gap-box">
                      <strong>Litige ouvert</strong>
                      <p>{row.disputeReason ?? "Motif non disponible"}{row.disputeOpenedAt ? ` · ouvert le ${formatDate(row.disputeOpenedAt)}` : ""}</p>
                    </div>
                  ) : null}

                  {row.reminderLastSentAt ? <p className="workspace-description">Dernière relance enregistrée : {formatDateTime(row.reminderLastSentAt)}.</p> : null}
                  {row.reminderStage === 3 && row.status === "OVERDUE" && row.collectionState === "NORMAL" ? <p className="workspace-action-note">Le dernier niveau de relance enregistré a été atteint. La prochaine décision reste humaine.</p> : null}
                </div>

                {editableCollection ? (
                  <div className="workspace-row-actions two-actions">
                    {row.collectionState !== "DISPUTED" ? (
                      <form action={recordPaymentPromiseAction} className="workspace-inline-form compact">
                        <input type="hidden" name="invoiceId" value={row.id} />
                        <label><span>{row.collectionState === "PROMISE_TO_PAY" ? "Nouvelle date promise" : "Date promise"}</span><input required name="promisedFor" type="datetime-local" /></label>
                        <label><span>Note facultative</span><input name="note" maxLength={2000} placeholder="Contexte donné par le client" /></label>
                        <button type="submit" className="button ghost small">{row.collectionState === "PROMISE_TO_PAY" ? "Mettre à jour" : "Enregistrer la promesse"}</button>
                      </form>
                    ) : null}

                    {row.collectionState !== "DISPUTED" ? (
                      <form action={openInvoiceDisputeAction} className="workspace-inline-form compact">
                        <input type="hidden" name="invoiceId" value={row.id} />
                        <label><span>Motif du litige</span><input required name="reason" maxLength={2000} placeholder="Montant contesté, prestation…" /></label>
                        <button type="submit" className="button ghost small">Ouvrir un litige</button>
                      </form>
                    ) : (
                      <form action={resolveInvoiceDisputeAction} className="workspace-inline-form compact">
                        <input type="hidden" name="invoiceId" value={row.id} />
                        <label><span>Note de résolution facultative</span><input name="resolutionNote" maxLength={2000} placeholder="Accord trouvé, correction externe…" /></label>
                        <button type="submit" className="button primary small">Clore le litige</button>
                      </form>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : <EmptyState title="Aucune facture suivie" description="Les factures synchronisées depuis votre système comptable apparaîtront ici." />}
    </>
  );
}

function ResultNotice({ result }: { result?: string }) {
  if (!result) return null;
  return result === "saved"
    ? <section className="premium-inline-notice"><StatusPill tone="good">Enregistré</StatusPill><p>La décision humaine a été enregistrée.</p></section>
    : <section className="premium-inline-notice"><StatusPill tone="warning">Non appliqué</StatusPill><p>La facture n’a pas changé d’état de recouvrement.</p></section>;
}

function invoiceTone(status: string): "good" | "warning" | "neutral" { if (status === "PAID") return "good"; if (status === "OVERDUE") return "warning"; return "neutral"; }
function invoiceLabel(status: string) { return ({ DRAFT: "Brouillon", ISSUED: "Émise", OVERDUE: "En retard", PAID: "Payée", CANCELLED: "Annulée" } as Record<string, string>)[status] ?? status; }
function collectionLabel(status: string) { return ({ PROMISE_TO_PAY: "Promesse enregistrée", DISPUTED: "Litige" } as Record<string, string>)[status] ?? status; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date); }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatAmount(amount: number, currency: string) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
