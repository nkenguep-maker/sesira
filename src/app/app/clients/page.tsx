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

  return (
    <>
      <PageHeader
        eyebrow="RELATIONS"
        title="Clients"
        description="Vos clients et leurs coordonnées disponibles dans SESIRA."
      />

      <section className="premium-connection-summary">
        <div><strong>{customers.length}</strong><span>Total</span></div>
        <div><strong>{companies}</strong><span>Entreprises</span></div>
        <div><strong>{people}</strong><span>Particuliers</span></div>
      </section>

      {customers.length ? (
        <section className="premium-connection-grid">
          {customers.map((customer) => (
            <article key={customer.id} className="premium-connection-card">
              <header>
                <div className="premium-connection-mark">{customer.displayName.slice(0, 1).toUpperCase()}</div>
                <div>
                  <span className="eyebrow">CLIENT</span>
                  <h2>{customer.displayName}</h2>
                </div>
                <StatusPill>{customer.type === "COMPANY" ? "Entreprise" : "Particulier"}</StatusPill>
              </header>
              <div className="premium-data-list compact">
                <div><span>Société</span><strong>{customer.companyName ?? "—"}</strong></div>
                <div><span>Email</span><strong>{customer.email ?? "Non renseigné"}</strong></div>
                <div><span>Téléphone</span><strong>{customer.phone ?? "Non renseigné"}</strong></div>
                <div><span>Mis à jour</span><strong>{formatDate(customer.updatedAt)}</strong></div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Aucun client"
          description="Importez vos données ou connectez une source pour faire apparaître ici vos vrais clients."
        />
      )}
    </>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date inconnue"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}
