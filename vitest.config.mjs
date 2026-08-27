import { fileURLToPath } from "node:url";

import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      ".codex-recovery/**",
      ".quarantine-icloud-dupes/**",
    ],
    pool: "threads",
  },
});
