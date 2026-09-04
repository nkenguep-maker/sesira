import { EmptyState, PageHeader, StatusPill } from "@/components/sesira/ui";
import { getViewerContext } from "@/lib/auth/viewer";
import { getAttributionWorkspace } from "@/lib/data/c32-workspaces";

export const dynamic = "force-dynamic";

export default async function AttributionPage() {
  const viewer = await getViewerContext();
  if (!viewer) return null;

  const until = new Date();
  const since = new Date(until.getTime() - 90 * 86_400_000);
  const result = await getAttributionWorkspace(viewer.organization.id, since, until);

  if (result.status === "ERROR") {
    return (
      <>
        <PageHeader eyebrow="CROISSANCE" title="Attribution" description="Origine observée, estimée ou inconnue des opportunités." />
        <section className="app-state-message"><strong>Attribution indisponible</strong><p>SESIRA ne peut pas construire le rapport actuellement. Aucun revenu n’est attribué par défaut.</p></section>
      </>
    );
  }

  const rows = result.rows;
  const observed = rows.filter((row) => row.confidence === "OBSERVED");
  const estimated = rows.filter((row) => row.confidence === "ESTIMATED");
  const unknown = rows.filter((row) => row.confidence === "UNKNOWN");

  return (
    <>
      <PageHeader
        eyebrow="CROISSANCE"
        title="Attribution"
        description="Rapport sur 90 jours. Les preuves observées, les estimations et l’inconnu restent séparés."
      />

      <section className="workspace-boundary-note">
        <StatusPill>Pas de causalité inventée</StatusPill>
        <p>Une association n’est pas une preuve que la campagne a causé le revenu. SESIRA ne fusionne jamais OBSERVÉ, ESTIMÉ et INCONNU dans un total « attribué ».</p>
      </section>

      {rows.length ? (
        <div className="attribution-zones">
          <AttributionZone
            label="OBSERVÉ"
            title="Origine appuyée par un signal technique ou une attestation humaine"
            rows={observed}
            tone="good"
          />
          <AttributionZone
            label="ESTIMÉ"
            title="Association plausible, mais non prouvée"
            rows={estimated}
            tone="warning"
          />
          <AttributionZone
            label="INCONNU"
            title="Origine non établie"
            rows={unknown}
            tone="neutral"
          />
        </div>
      ) : <EmptyState title="Aucune attribution enregistrée" description="SESIRA laissera l’origine inconnue tant qu’aucune preuve ou estimation explicitement documentée n’existe." />}
    </>
  );
}

function AttributionZone({
  label,
  title,
  rows,
  tone,
}: {
  label: string;
  title: string;
  rows: Awaited<ReturnType<typeof getAttributionWorkspace>> extends { status: "OK"; rows: infer T } ? T : never;
  tone: "good" | "warning" | "neutral";
}) {
  return (
    <section className="attribution-zone">
      <div className="workspace-section-heading">
        <div><span className="eyebrow">{label}</span><h2>{title}</h2></div>
        <StatusPill tone={tone}>{rows.length} sources</StatusPill>
      </div>
      {rows.length ? (
        <div className="workspace-list compact-list">
          {rows.map((row, index) => (
            <article className="workspace-row" key={`${row.sourceType}:${row.sourceId ?? "none"}:${index}`}>
              <div className="workspace-row-main">
                <div className="workspace-row-heading">
                  <div><span className="eyebrow">{sourceLabel(row.sourceType)}</span><h2>{row.sourceId ? shortId(row.sourceId) : "Source sans identifiant"}</h2></div>
                  <StatusPill tone={tone}>{confidenceLabel(row.confidence)}</StatusPill>
                </div>
                <div className="workspace-meta">
                  <span><b>Opportunités distinctes</b>{row.distinctOpportunities}</span>
                  <span><b>Enregistrements</b>{row.opportunityCount}</span>
                  <span><b>Valeur estimée associée</b>{formatValue(row.totalEstimatedValue, row.currencyMix)}</span>
                  <span><b>Devises</b>{row.currencyMix.length ? row.currencyMix.join(", ") : "Inconnues"}</span>
                </div>
                {row.currencyMix.length > 1 ? <p className="workspace-action-note">Plusieurs devises sont présentes. La valeur n’est pas convertie ni additionnée comme un montant financier homogène.</p> : null}
              </div>
            </article>
          ))}
        </div>
      ) : <p className="workspace-empty-line">Aucun élément dans cette catégorie sur la période.</p>}
    </section>
  );
}

function sourceLabel(source: string) { return ({ CAMPAIGN: "Campagne", LEAD: "Lead", CONVERSATION: "Conversation", PUBLICATION: "Publication", MANUAL: "Saisie humaine", UNKNOWN: "Inconnue" } as Record<string, string>)[source] ?? source; }
function confidenceLabel(value: string) { return ({ OBSERVED: "Observé", ESTIMATED: "Estimé", UNKNOWN: "Inconnu" } as Record<string, string>)[value] ?? "Inconnu"; }
function shortId(value: string) { return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value; }
function formatValue(value: number, currencies: string[]) { if (!currencies.length) return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value); if (currencies.length > 1) return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} · non converti`; return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currencies[0], maximumFractionDigits: 0 }).format(value); }
