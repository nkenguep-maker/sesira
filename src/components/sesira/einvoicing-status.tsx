import { StatusPill } from "@/components/sesira/ui";
import { getEInvoicingWorkspace } from "@/lib/data/c40-ui";

export async function EInvoicingStatus({ organizationId, invoiceLabels }: { organizationId: string; invoiceLabels: Record<string, string> }) {
  const workspace = await getEInvoicingWorkspace(organizationId);
  if (workspace.status === "ERROR") {
    return <section className="app-state-message"><strong>Facturation électronique indisponible</strong><p>SESIRA ne peut pas lire l’état de préparation électronique. Aucun état fournisseur n’est déduit.</p></section>;
  }
  const { providers, submissions } = workspace.data;
  const activeProvider = providers.find((provider) => provider.status === "ACTIVE") ?? providers[0] ?? null;
  const realProductionProvider = activeProvider && !["TEST", "PRODUCTION_PROVIDER_INTEGRATION_PENDING"].includes(activeProvider.kind);

  return (
    <section className="workspace-section">
      <div className="workspace-section-heading">
        <div><span className="eyebrow">FACTURATION ÉLECTRONIQUE</span><h2>Préparation et retour du service connecté</h2></div>
        <StatusPill tone={realProductionProvider ? "good" : "warning"}>{providerState(activeProvider?.kind)}</StatusPill>
      </div>
      <p className="premium-muted-copy">L’état comptable reste distinct de l’état de facturation électronique. « Transmis », « Accepté » et « Rejeté » ne sont affichés comme états réels que lorsqu’un service de production les confirme.</p>
      {activeProvider ? <div className="premium-data-list compact"><div><span>Service</span><strong>{activeProvider.label}</strong></div><div><span>Mode</span><strong>{providerMode(activeProvider.kind)}</strong></div><div><span>Formats</span><strong>{activeProvider.formats.length ? activeProvider.formats.join(", ") : "Non renseignés"}</strong></div></div> : <div className="workspace-gap-box"><strong>Aucun service configuré</strong><p>SESIRA peut suivre la préparation, mais aucune transmission de production n’est disponible.</p></div>}
      {submissions.length ? <div className="workspace-list compact-list">{submissions.map((submission) => {
        const providerPending = submission.providerKind === "PRODUCTION_PROVIDER_INTEGRATION_PENDING";
        const postExport = ["SUBMITTED", "ACCEPTED", "REJECTED"].includes(submission.status);
        const label = providerPending && postExport ? "Transmission fournisseur indisponible" : submissionLabel(submission.status, submission.providerKind);
        return <article className="workspace-row" key={submission.id}><div className="workspace-row-main"><div className="workspace-row-heading"><div><span className="eyebrow">{invoiceLabels[submission.invoiceId] ?? `Facture ${submission.invoiceId.slice(0, 8)}`}</span><h2>{submission.format}</h2></div><StatusPill tone={submission.status === "REJECTED" ? "warning" : submission.status === "ACCEPTED" && !providerPending ? "good" : "neutral"}>{label}</StatusPill></div><div className="workspace-meta"><span><b>Informations manquantes</b>{submission.gapCount}</span><span><b>Export préparé</b>{submission.exportedAt ? formatDateTime(submission.exportedAt) : "Non"}</span><span><b>Référence du service</b>{submission.externalRef ?? "Absente"}</span></div>{submission.rejectionReason ? <div className="workspace-gap-box"><strong>Rejet enregistré</strong><p>{submission.rejectionReason}</p></div> : null}</div></article>;
      })}</div> : <p className="workspace-empty-line">Aucune préparation électronique n’est encore enregistrée.</p>}
    </section>
  );
}

function providerState(kind?: string) { if (!kind) return "À configurer"; if (kind === "TEST") return "Test uniquement"; if (kind === "PRODUCTION_PROVIDER_INTEGRATION_PENDING") return "Transmission indisponible"; return "Service production"; }
function providerMode(kind: string) { if (kind === "TEST") return "Simulation technique"; if (kind === "PRODUCTION_PROVIDER_INTEGRATION_PENDING") return "Production à intégrer"; return "Production"; }
function submissionLabel(status: string, providerKind: string) { const base = ({ DRAFT: "À préparer", READY: "Prêt", EXPORTED: "Exporté", SUBMITTED: "Transmis", ACCEPTED: "Accepté", REJECTED: "Rejeté", CANCELLED: "Annulé" } as Record<string, string>)[status] ?? status; return providerKind === "TEST" && ["SUBMITTED", "ACCEPTED", "REJECTED"].includes(status) ? `Test · ${base}` : base; }
function formatDateTime(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d); }
