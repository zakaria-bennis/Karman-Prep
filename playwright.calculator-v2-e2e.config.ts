import { defineConfig, devices } from "@playwright/test";

// ============================================================
// Calculator v2 Turbopack checks on `next dev` (AR-65).
//
// Boots `npm run dev:next` on port 3100 as the seeded admin with
// CALCULATOR_V2_ROLLOUT=admins, so v2 opens from the real quiz
// hosts. `.env.local` must not define CALCULATOR_V2_ROLLOUT
// (OI-30). `npm run test:e2e` ignores these specs and stays on v1.
//
// Run: npx playwright test --config=playwright.calculator-v2-e2e.config.ts
// ============================================================

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /calculator-v2(-smoke)?\.spec\.ts$/,
  globalSetup: "./tests/e2e/global-setup.ts",
  workers: 1,
  reporter: "list",
  // Playwright derives baseURL only from webServer.port; this config sets webServer.url.
  use: { baseURL: "http://localhost:3100" },
  projects: [{ name: "calculator-v2-e2e", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev:next -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DEV_IMPERSONATE_CLERK_ID: "dev_seed_admin",
      CALCULATOR_V2_ROLLOUT: "admins",
    },
  },
});
