import { CheckCircle2, Users } from "lucide-react";
import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/sesira/empty-state";
import { FilterBar, SearchField } from "@/components/sesira/filter-bar";
import { LoadingHeader, LoadingPage, LoadingSkeleton } from "@/components/sesira/loading-skeleton";
import { MetricCard } from "@/components/sesira/metric-card";
import { PageHeader } from "@/components/sesira/page-header";
import { StatusBadge } from "@/components/sesira/status-badge";

describe("Sesira v6 design system", () => {
  it("renders a responsive page header with an optional action", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        eyebrow="Relation client"
        title="Clients"
        description="Une vue fiable."
        actions={<Link href="/app/customers/new">Nouveau client</Link>}
      />,
    );

    expect(html).toContain("Relation client");
    expect(html).toContain("Nouveau client");
    expect(html).toContain("lg:flex-row");
    expect(html).toContain("text-[1.375rem]");
    expect(html).toContain("border-[var(--line)]");
  });

  it("keeps metric and status tones inside the shared vocabulary", () => {
    const html = renderToStaticMarkup(
      <>
        <MetricCard icon={Users} label="Clients" value={42} tone="cyan" />
        <MetricCard label="Valeur" value="18 450 €" tone="violet" layout="stacked" />
        <StatusBadge tone="emerald">Actif</StatusBadge>
      </>,
    );

    expect(html).toContain("Clients");
    expect(html).toContain("18 450 €");
    expect(html).toContain("bg-[var(--surface)]");
    expect(html).toContain("bg-[var(--blue-soft)]");
    expect(html).not.toContain("rounded-");
  });

  it("shares empty, filter and loading states without hiding their labels", () => {
    const html = [
      renderToStaticMarkup(
        <EmptyState
          icon={CheckCircle2}
          tone="emerald"
          title="Aucun élément"
          description="Les prochains éléments apparaîtront ici."
        />,
      ),
      renderToStaticMarkup(
        <FilterBar action="/app/customers">
          <SearchField label="Rechercher un client" placeholder="Rechercher…" />
          <button>Filtrer</button>
        </FilterBar>,
      ),
      renderToStaticMarkup(
        <LoadingPage label="Chargement des clients">
          <LoadingHeader />
          <LoadingSkeleton className="h-20" />
        </LoadingPage>,
      ),
    ].join("\n");

    expect(html).toContain("Aucun élément");
    expect(html).toContain("Rechercher un client");
    expect(html).toContain("Chargement des clients");
    expect(html).toContain("bg-[var(--paper)]");
    expect(html).not.toContain("animate-pulse");
  });
});
