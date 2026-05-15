import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Globs to discover. Co-located *.test.ts/tsx files alongside source.
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    // Don't accidentally pick up Playwright tests.
    exclude: ["node_modules/**", "tests/e2e/**", ".next/**", ".open-next/**"],
    // Default env is node (fast). Component tests opt into jsdom
    // with the `// @vitest-environment jsdom` directive at the top
    // of the file — see src/components/admin/ImpersonationBanner.test.tsx.
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
    // Show full diff when assertions fail.
    reporters: ["default"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
