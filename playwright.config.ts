import { defineConfig, devices } from "@playwright/test";

// ============================================================
// Playwright e2e config.
//
// Pairs with the dev-only auth bypass (src/lib/auth/dev-auth.ts)
// and the seed fixtures (scripts/seed-dev.mjs). The webServer
// block below boots `next dev` with DEV_IMPERSONATE_CLERK_ID set
// to the seeded admin so tests can immediately drive admin-only
// flows like the impersonation switcher.
//
// Tests assume `npm run seed:dev` has populated the fixtures.
// `tests/e2e/global-setup.ts` runs it once before the suite.
//
// Run locally:
//   npm run test:e2e
// CI is not wired up yet — that needs a Supabase fixture project
// reachable from GitHub Actions; tracked as future work.
// ============================================================

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false, // impersonation tests share the same dev server cookie jar
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // see fullyParallel comment
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Auto-start the dev server with the bypass set to the admin
  // seed persona. Tests that need a different persona impersonate
  // through the UI (mirroring how a real admin would).
  webServer: {
    command: "npm run dev:next",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DEV_IMPERSONATE_CLERK_ID: "dev_seed_admin",
    },
  },
});
