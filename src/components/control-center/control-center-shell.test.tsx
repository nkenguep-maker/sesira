import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ControlCenterShell } from "@/components/control-center/control-center-shell";

describe("ControlCenterShell", () => {
  it("links every internal read-only route and exposes no unsafe action", () => {
    const html = renderToStaticMarkup(<ControlCenterShell><p>Contenu</p></ControlCenterShell>);

    for (const route of [
      "/control",
      "/control/organizations",
      "/control/runs",
      "/control/ai-runs",
      "/control/incidents",
      "/control/integrations",
    ]) {
      expect(html).toContain(`href="${route}"`);
    }

    expect(html).toContain("LECTURE SEULE");
    expect(html).not.toContain("Usurper");
    expect(html).not.toContain("Voir le secret");
    expect(html).not.toContain("Forcer en production");
  });
});
