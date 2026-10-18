import { defineConfig, devices } from "@playwright/test";

// AR-66 on `npm run cf:preview` (01-interfaces-integration.md section 16).
// Run after `npm run cf:build`; scripts/calculator-v2/release.sh runs it before cf:deploy.
export default defineConfig({
  testDir: "./tests/cf-preview",
  projects: [{ name: "cf-preview", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:8787" },
  webServer: {
    command: "npm run cf:preview",
    // Readiness probes a public static file, which the assets binding serves before the Worker:
    // without server secrets (Clerk) the local preview answers 500 on `/`, which Playwright never
    // treats as ready. The spec still opens `/` for its origin.
    url: "http://localhost:8787/calculator-notices.txt",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
