import { PageHeader } from "@/components/sesira/ui";
import { DEMO_ORGANIZATION_ID } from "@/lib/demo/context";
import { getDemoResults } from "@/lib/demo/results";

export const dynamic = "force-dynamic";

export default async function DemoResultsPage() {
  const results = await getDemoResults(DEMO_ORGANIZATION_ID);
  return (
    <>
      <PageHeader eyebrow="DÉMO · RÉSULTATS" title="Activité observée" description="Ces chiffres décrivent uniquement le scénario fictif THERMOPRO. Ils ne prouvent aucun ROI réel de SESIRA." />
      <section className="premium-connection-summary"><div><strong>{value(results.customers)}</strong><span>Clients</span></div><div><strong>{value(results.requests)}</strong><span>Demandes</span></div><div><strong>{value(results.quotes)}</strong><span>Devis</span></div><div><strong>{value(results.quoteSentEvents)}</strong><span>Envois de devis enregistrés</span></div></section>
      <section className="premium-trust-note"><span className="eyebrow">LECTURE HONNÊTE</span><h2>Scénario fictif, mesures réelles dans ce tenant.</h2><p>Les compteurs viennent des tables Supabase de la démo. Ils servent à montrer le produit, pas à annoncer une performance commerciale ou un gain de temps validé sur le terrain.</p><p><strong>{value(results.resolvedAttentions)}</strong> éléments historiques sont marqués résolus dans le scénario.</p></section>
    </>
  );
}
function value(v:number|null){return v === null ? "—" : String(v);}
