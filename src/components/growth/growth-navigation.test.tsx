import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/marketing/content" }));

import { GrowthNavigation } from "@/components/growth/growth-navigation";

describe("GrowthNavigation", () => {
  it("links the four Growth routes and marks the current page", () => {
    const html = renderToStaticMarkup(<GrowthNavigation />);

    for (const href of [
      "/app/marketing",
      "/app/marketing/ideas",
      "/app/marketing/content",
      "/app/marketing/publications",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain("aria-current=\"page\"");
    expect(html).toContain("Navigation Marketing");
  });
});
