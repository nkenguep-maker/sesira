import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/results" }));

import { AppNavigation } from "@/components/sesira/app-navigation";

describe("AppNavigation", () => {
  it("expose les routes V1 réelles et distingue les aperçus", () => {
    const html = renderToStaticMarkup(<AppNavigation />);

    expect(html).toContain('href="/app/marketing"');
    expect(html).toContain('href="/app/results"');
    expect(html).toContain('href="/app/reports"');
    expect(html).toContain('href="/app/automations"');
    expect(html).toContain("Résultats");
    expect(html).toContain("Rapports");
    expect(html).toContain("APERÇU");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("hidden");
    expect(html).toContain("lg:grid-cols-1");
  });
});
