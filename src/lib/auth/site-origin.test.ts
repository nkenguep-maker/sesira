import { afterEach, describe, expect, it } from "vitest";

import { getSiteOrigin } from "./site-origin";

const originalConfiguredUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalConfiguredUrl;
  process.env.VERCEL_PROJECT_PRODUCTION_URL = originalProductionUrl;
});

describe("getSiteOrigin", () => {
  it("uses the explicit site URL first", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://sesira.example/path";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "ignored.vercel.app";

    expect(getSiteOrigin()).toBe("https://sesira.example");
  });

  it("uses the canonical Vercel production hostname", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "sesira-os.vercel.app";

    expect(getSiteOrigin()).toBe("https://sesira-os.vercel.app");
  });

  it("falls back to local development", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;

    expect(getSiteOrigin()).toBe("http://localhost:3000");
  });
});
