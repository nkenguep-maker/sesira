import Link from "next/link";

import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getCustomerList } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const customers = await getCustomerList(viewer.organization.id);
  const companies = customers.filter((customer) => customer.type === "COMPANY").length;
  const people = customers.length - companies;
  const withEmail = customers.filter((customer) => Boolean(customer.email)).length;

  return (
    <>
      <PageHeader
        eyebrow="RELATION CLIENT"
        title="Clients"
        description="Une vue simple de vos clients et des coordonnées réellement disponibles dans SESIRA."
        actions={<Link className="button primary" href="/app/imports">Importer des clients</Link>}
      />

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
          {customers.map((customer) => (
            <article key={customer.id} className="workspace-row">
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
                  <span><b>Mis à jour</b>{formatDate(customer.updatedAt)}</span>
                </div>
              </div>
              <div className="workspace-row-actions">
                <div className="workspace-preview"><span>Données disponibles</span><p>{contactSummary(customer.email, customer.phone)}</p></div>
                <Link className="button ghost small" href="/app/devis">Voir les devis</Link>
              </div>
            </article>
          ))}
        </section>
      ) : <EmptyState title="Aucun client" description="Importez vos données ou connectez une source pour commencer à travailler dans SESIRA." action={<Link className="button primary" href="/app/imports">Importer des données</Link>} />}
    </>
  );
}

function contactSummary(email: string | null, phone: string | null) { if (email && phone) return "Email et téléphone disponibles."; if (email) return "Email disponible, téléphone manquant."; if (phone) return "Téléphone disponible, email manquant."; return "Aucune coordonnée directe enregistrée."; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date inconnue" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date); }
