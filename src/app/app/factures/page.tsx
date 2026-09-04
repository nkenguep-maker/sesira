import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList } from "@/lib/data";
import { getInvoicesWorkspace } from "@/lib/data/c32-workspaces";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const [result, customers] = await Promise.all([
    getInvoicesWorkspace(viewer.organization.id),
    getCustomerList(viewer.organization.id, { limit: 500 }),
  ]);
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.displayName] as const));

  if (result.status === "ERROR") {
    return (
      <>
        <PageHeader eyebrow="OPÉRATIONS" title="Factures" description="Suivi des échéances et des retards, sans remplacer la comptabilité." />
        <section className="app-state-message"><strong>Suivi des factures indisponible</strong><p>La donnée comptable de suivi n’est pas lisible actuellement. Aucun montant de remplacement n’est affiché.</p></section>
      </>
    );
  }

  const rows = result.rows;
  const overdue = rows.filter((row) => row.status === "OVERDUE");
  const issued = rows.filter((row) => row.status === "ISSUED");
  const paid = rows.filter((row) => row.status === "PAID");
  const overdueValue = overdue.reduce((sum, row) => sum + row.amount, 0);
  const overdueCurrencies = [...new Set(overdue.map((row) => row.currency))];

  return (
    <>
      <PageHeader
        eyebrow="OPÉRATIONS"
        title="Factures"
        description="SESIRA surveille les échéances. Le système comptable reste la source autoritaire du montant et du paiement."
      />

      <section className="workspace-stat-strip" aria-label="État des factures">
        <div><strong>{issued.length}</strong><span>Émises</span></div>
        <div><strong>{overdue.length}</strong><span>En retard</span></div>
        <div><strong>{paid.length}</strong><span>Payées</span></div>
        <div><strong>{formatMixedAmount(overdueValue, overdueCurrencies)}</strong><span>Valeur en retard</span></div>
      </section>

      <section className="workspace-boundary-note">
        <StatusPill tone="warning">Décision financière humaine</StatusPill>
        <p>Cette page ne marque pas un paiement, ne modifie pas un montant et ne résout pas un litige. Le Core C28 ne modélise pas encore les promesses de paiement ni les litiges comme états dédiés.</p>
      </section>

      {rows.length ? (
        <section className="workspace-list" aria-label="Factures suivies">
          {rows.map((row) => {
            const pastDueDays = row.dueAt && ["OVERDUE", "ISSUED"].includes(row.status) ? daysPastDue(row.dueAt) : null;
            return (
              <article className="workspace-row" key={row.id}>
                <div className="workspace-row-main">
                  <div className="workspace-row-heading">
                    <div>
                      <span className="eyebrow">{customerNames.get(row.customerId) ?? "Client"}</span>
                      <h2>{row.externalRef ?? `Facture ${row.id.slice(0, 8)}`}</h2>
                    </div>
                    <StatusPill tone={invoiceTone(row.status)}>{invoiceLabel(row.status)}</StatusPill>
                  </div>
                  <div className="workspace-meta">
                    <span><b>Montant</b>{formatAmount(row.amount, row.currency)}</span>
                    <span><b>Échéance</b>{row.dueAt ? formatDate(row.dueAt) : "Non renseignée"}</span>
                    <span><b>Retard observé</b>{pastDueDays !== null && pastDueDays > 0 ? `${pastDueDays} j` : "Aucun"}</span>
                    <span><b>Relances enregistrées</b>{row.reminderStage ? `Niveau ${row.reminderStage}` : "Aucune"}</span>
                  </div>
                  {row.reminderLastSentAt ? <p className="workspace-description">Dernière relance enregistrée : {formatDateTime(row.reminderLastSentAt)}.</p> : null}
                  {row.status === "OVERDUE" && pastDueDays !== null && pastDueDays >= 60 ? (
                    <div className="workspace-gap-box"><strong>Décision requise</strong><p>Le retard dépasse 60 jours. SESIRA fait remonter le dossier mais ne choisit ni procédure juridique, ni remise, ni abandon de créance.</p></div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : <EmptyState title="Aucune facture suivie" description="Les factures synchronisées depuis votre système comptable apparaîtront ici." />}
    </>
  );
}

function invoiceTone(status: string): "good" | "warning" | "neutral" { if (status === "PAID") return "good"; if (status === "OVERDUE") return "warning"; return "neutral"; }
function invoiceLabel(status: string) { return ({ DRAFT: "Brouillon", ISSUED: "Émise", OVERDUE: "En retard", PAID: "Payée", CANCELLED: "Annulée" } as Record<string, string>)[status] ?? status; }
function daysPastDue(value: string) { const due = new Date(value).getTime(); return Number.isNaN(due) ? 0 : Math.max(0, Math.floor((Date.now() - due) / 86_400_000)); }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date); }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatAmount(amount: number, currency: string) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
function formatMixedAmount(value: number, currencies: string[]) { if (!currencies.length) return "0"; return currencies.length === 1 ? formatAmount(value, currencies[0]) : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} · devises mixtes`; }
