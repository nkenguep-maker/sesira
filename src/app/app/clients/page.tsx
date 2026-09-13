import Link from "next/link";

import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList } from "@/lib/data";
import { getConfirmedDocumentLinkCounts } from "@/lib/data/document-links";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const customers = await getCustomerList(viewer.organization.id);
  const documentCounts = await getConfirmedDocumentLinkCounts(viewer.organization.id, "customer", customers.map((customer) => customer.id));
  const companies = customers.filter((customer) => customer.type === "COMPANY").length;
  const people = customers.length - companies;
  const withEmail = customers.filter((customer) => Boolean(customer.email)).length;

  return (
    <>
      <PageHeader eyebrow="RELATION CLIENT" title="Clients" description="Une vue simple de vos clients, de leurs coordonnées et des pièces que SESIRA leur a rattachées." actions={<Link className="button primary" href="/app/imports">Importer des clients</Link>} />

      {customers.length ? (
        <section className="workspace-stat-strip" aria-label="Résumé des clients">
          <div><strong>{customers.length}</strong><span>Clients</span></div>
          <div><strong>{companies}</strong><span>Entreprises</span></div>
          <div><strong>{people}</strong><span>Particuliers</span></div>
          <div><strong>{withEmail}</strong><span>Avec email</span></div>
        </section>
      ) : null}

      {customers.length ? (
        <section className="workspace-list" aria-label="Clients">
          {customers.map((customer) => {
            const documents = documentCounts.get(customer.id) ?? 0;
            return (
              <article key={customer.id} id={`client-${customer.id}`} className="workspace-row">
                <div className="workspace-row-main">
                  <div className="workspace-row-heading">
                    <div className="sesira-client-heading">
                      <div className="premium-connection-mark">{customer.displayName.slice(0, 1).toUpperCase()}</div>
                      <div><span className="eyebrow">CLIENT</span><h2>{customer.displayName}</h2></div>
                    </div>
                    <StatusPill>{customer.type === "COMPANY" ? "Entreprise" : "Particulier"}</StatusPill>
                  </div>
                  <div className="workspace-meta">
                    <span><b>Société</b>{customer.companyName ?? "—"}</span>
                    <span><b>Email</b>{customer.email ?? "Non renseigné"}</span>
                    <span><b>Téléphone</b>{customer.phone ?? "Non renseigné"}</span>
                    <span><b>Documents</b>{documents ? `${documents} relié${documents > 1 ? "s" : ""}` : "Aucun"}</span>
                  </div>
                </div>
                <div className="workspace-row-actions">
                  <div className="workspace-preview"><span>Données disponibles</span><p>{contactSummary(customer.email, customer.phone)}</p></div>
                  {documents ? <Link className="button ghost small" href={`/app/documents?entity=customer&entityId=${customer.id}`}>Voir les documents</Link> : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : <EmptyState title="Aucun client" description="Importez vos données ou connectez une source pour commencer à travailler dans SESIRA." action={<Link className="button primary" href="/app/imports">Importer des données</Link>} />}
    </>
  );
}

function contactSummary(email: string | null, phone: string | null) { if (email && phone) return "Email et téléphone disponibles."; if (email) return "Email disponible, téléphone manquant."; if (phone) return "Téléphone disponible, email manquant."; return "Aucune coordonnée directe enregistrée."; }
