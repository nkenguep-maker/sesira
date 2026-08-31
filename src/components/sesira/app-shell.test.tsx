import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/reports" }));
vi.mock("@/app/app/logout-action", () => ({ logoutAction: vi.fn() }));

import { AppShell } from "@/components/sesira/app-shell";

describe("AppShell", () => {
  it("reflète le mode serveur, la suspension et la route mobile active", () => {
    const html = renderToStaticMarkup(
      <AppShell
        currentMode="SHADOW"
        viewer={{
          userId: "user-1",
          email: "membre@entreprise.fr",
          role: "MEMBER",
          organization: { id: "org-1", name: "Entreprise", sectorKey: "CVC", status: "SUSPENDED" },
        }}
      >
        <p>Contenu</p>
      </AppShell>,
    );

    expect(html).toContain("Il vous montre");
    expect(html).toContain("Organisation suspendue");
    expect(html).toContain('href="/app/reports" aria-current="page"');
  });
});
