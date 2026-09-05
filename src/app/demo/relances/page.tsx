import Link from "next/link";

import { PageHeader, StatusPill } from "@/components/sesira/ui";
import { getDemoCommunications } from "@/lib/demo/communications";

export const dynamic = "force-dynamic";

export default async function DemoFollowupsPage() {
  const communications = await getDemoCommunications();
  return (
    <>
      <PageHeader eyebrow="DÉMO · RELANCES" title="Les messages que SESIRA prépare — et ceux qui l’arrêtent" description="Chaque exemple est rattaché à un dossier fictif précis. Les brouillons ne sont jamais envoyés depuis /demo." />

      <section className="demo-followup-layout">
        <div className="demo-followup-list">
          {communications.map((message) => (
            <details className="demo-thread" key={message.id} open={message.threadKey.includes("lefevre")}>
              <summary>
                <div>
                  <span className="eyebrow">{message.direction === "INBOUND" ? "RÉPONSE CLIENT" : "BROUILLON SESIRA"}</span>
                  <strong>{message.customerName}</strong>
                  <span>{message.subject}</span>
                </div>
                <StatusPill tone={message.direction === "INBOUND" ? "warning" : "neutral"}>{message.direction === "INBOUND" ? "À décider" : "À valider"}</StatusPill>
              </summary>
              <div className="demo-thread-body">
                <div className="demo-email-sheet large">
                  <div><span>Client</span><strong>{message.customerName}</strong></div>
                  <div><span>Objet</span><strong>{message.subject}</strong></div>
                  <p>{message.body}</p>
                </div>
                <div className="demo-thread-why">
                  <strong>{whyTitle(message.threadKey)}</strong>
                  <p>{why(message.threadKey)}</p>
                  <div className="demo-cross-links">
                    {crossLinks(message.threadKey).map(([href, label]) => <Link href={href} key={href}>{label} →</Link>)}
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>

        <aside className="demo-rule-aside">
          <span className="eyebrow">RÈGLE DE LA DÉMO</span>
          <h2>Un message n’apparaît pas tout seul.</h2>
          <p>Chaque brouillon est la conséquence d’un fait observé ailleurs : devis sans réponse, promesse dépassée, rapport relu ou contrat proche de l’échéance.</p>
          <Link className="button secondary small" href="/demo/automatisations">Voir les déclencheurs</Link>
        </aside>
      </section>
    </>
  );
}

function whyTitle(thread: string) {
  if (thread.includes("valmy")) return "Pourquoi SESIRA s’arrête ici";
  return "Pourquoi ce message existe";
}
function why(thread: string) {
  if (thread.includes("lefevre")) return "Le devis DV-2026-0421 est sans réponse depuis 7 jours. SESIRA prépare la relance, Marc décide de l’envoi.";
  if (thread.includes("garage")) return "La promesse de règlement du 3 septembre est dépassée. SESIRA reprend ce fait sans inventer de menace ni de pénalité.";
  if (thread.includes("rivet")) return "Le rapport terrain #1842 est relu. SESIRA prépare le message client à partir du compte rendu validable.";
  if (thread.includes("martin")) return "Le contrat CE-2026-0019 approche de son échéance. Le montant reste celui du contrat actuel.";
  return "Le client demande de revoir le délai d’installation. SESIRA classe la réponse et arrête l’automatisation : la négociation revient à Marc.";
}
function crossLinks(thread: string): Array<[string, string]> {
  if (thread.includes("garage")) return [["/demo/factures", "Voir la facture"], ["/demo/automatisations", "Voir la règle"]];
  if (thread.includes("rivet")) return [["/demo/interventions", "Voir l’intervention"], ["/demo/documents", "Voir les documents"]];
  if (thread.includes("martin")) return [["/demo/maintenance", "Voir le contrat"], ["/demo/automatisations", "Voir la règle"]];
  return [["/demo/devis", "Voir le devis"], ["/demo/automatisations", "Voir la règle"]];
}
