import { fileURLToPath } from "node:url";

import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    setupFiles: ["./src/test/setup-env.ts"],
    exclude: [
      ...configDefaults.exclude,
      ".codex-recovery/**",
      ".quarantine-icloud-dupes/**",
    ],
    pool: "threads",
  },
});
