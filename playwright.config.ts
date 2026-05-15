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
  // `tests/visual/` lives alongside `tests/e2e/`. The visual
  // suite is opt-in via the `visual` project so `npm run test:e2e`
  // stays fast.
  testDir: "./tests",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false, // impersonation tests share the same dev server cookie jar
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // see fullyParallel comment
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    // ── Default projects (fast, run on `npm run test:e2e` /
    //    `npm run test:visual`). Chromium only — daily dev cadence.
    {
      name: "e2e",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "visual",
      testDir: "./tests/visual",
      use: { ...devices["Desktop Chrome"] },
    },

    // ── Cross-browser coverage (opt-in via --project=<name> or
    //    `npm run test:e2e:all` / `test:visual:all`). Firefox and
    //    WebKit catch CSS-engine + Web-API differences Chromium
    //    hides. WebKit ≈ Safari's engine but not 100% — real
    //    iOS Safari behavior still needs a real device.
    {
      name: "e2e-firefox",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "e2e-webkit",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "visual-firefox",
      testDir: "./tests/visual",
      // Visual specs that pull a single static persona at desktop
      // don't need re-running per engine — keep it scoped to the
      // page-level snapshot file. States/tokens/timing specs lean
      // on Chromium-only computed styles.
      testMatch: /snapshots\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "visual-webkit",
      testDir: "./tests/visual",
      testMatch: /snapshots\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },

    // ── Mobile emulation. Playwright's device profiles set touch,
    //    DPR, and viewport correctly — enough for layout / touch-
    //    event bugs. Doesn't replicate real iOS Safari quirks
    //    (scroll bounce, momentum) or real touch latency.
    {
      name: "mobile-chrome",
      testDir: "./tests/visual",
      testMatch: /snapshots\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "mobile-safari",
      testDir: "./tests/visual",
      testMatch: /snapshots\.spec\.ts/,
      use: { ...devices["iPhone 14"] },
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
