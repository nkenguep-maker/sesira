import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/marketing" }));

import { AppNavigation } from "@/components/sesira/app-navigation";

describe("AppNavigation", () => {
  it("exposes Growth from the main product navigation", () => {
    const html = renderToStaticMarkup(<AppNavigation />);

    expect(html).toContain('href="/app/marketing"');
    expect(html).toContain("Marketing");
    expect(html).toContain('aria-current="page"');
  });
});
