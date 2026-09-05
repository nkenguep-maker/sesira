import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getCustomerList } from "@/lib/data";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";

export const dynamic = "force-dynamic";

export default async function DemoClientsPage() {
  const customers = await getCustomerList(DEMO_ORGANIZATION_ID);
  const companies = customers.filter((item) => item.type === "COMPANY").length;
  return (
    <>
      <PageHeader eyebrow="DÉMO · RELATIONS" title="Clients" description="Portefeuille fictif de THERMOPRO SERVICES." />
      <section className="premium-connection-summary"><div><strong>{customers.length}</strong><span>Total</span></div><div><strong>{companies}</strong><span>Entreprises</span></div><div><strong>{customers.length - companies}</strong><span>Particuliers</span></div></section>
      {customers.length ? <section className="premium-connection-grid">{customers.map((customer) => (
        <article key={customer.id} className="premium-connection-card"><header><div className="premium-connection-mark">{customer.displayName.slice(0,1).toUpperCase()}</div><div><span className="eyebrow">CLIENT FICTIF</span><h2>{customer.displayName}</h2></div><StatusPill>{customer.type === "COMPANY" ? "Entreprise" : "Particulier"}</StatusPill></header><div className="premium-data-list compact"><div><span>Société</span><strong>{customer.companyName ?? "—"}</strong></div><div><span>Email</span><strong>{customer.email ?? "Non renseigné"}</strong></div><div><span>Téléphone</span><strong>{customer.phone ?? "Non renseigné"}</strong></div></div></article>
      ))}</section> : <EmptyState title="Aucun client" description="Le tenant de démonstration est vide." />}
    </>
  );
}
