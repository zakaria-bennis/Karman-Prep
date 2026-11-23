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
//   npm run test:e2e        (PW_CHANNEL=chrome to use the installed Chrome)
// CI: .github/workflows/e2e.yml, against a fresh local Supabase stack.
// ============================================================

const PORT = Number(process.env.E2E_PORT ?? 3000);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  // `tests/visual/` lives alongside `tests/e2e/`. The visual
  // suite is opt-in via the `visual` project so `npm run test:e2e`
  // stays fast.
  testDir: "./tests",
  globalSetup: "./tests/e2e/global-setup.ts",
  // One worker: every test shares one `next dev` server, which compiles pages one at a time.
  // fullyParallel lets CI's --shard split a file's tests across machines (.github/workflows/e2e.yml);
  // with one worker the tests of each machine still run one after another, in file order.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry: a second try runs on pages that are already compiled. More only multiplied the time a
  // truly broken test burned (three three-minute timeouts each).
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  // Every route compiles on its first visit under `next dev`, and a slow CI runner can spend most
  // of a minute on one portal page, so a test that opens several first-time routes needs room.
  timeout: 180_000,
  // The portals now load the flown landscape and more styles, so a route's first compile under
  // `next dev` in CI can pass five seconds. Give each expectation room for that first compile.
  expect: { timeout: 15_000 },
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
      // PW_CHANNEL=chrome runs the suite in the installed Google Chrome when Playwright's own
      // Chromium is not downloaded (a laptop); CI installs Playwright's Chromium and leaves it unset.
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
      },
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
      testIgnore: /calculator-smoke/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "e2e-webkit",
      testDir: "./tests/e2e",
      testIgnore: /calculator-smoke/,
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
    // CI prints the server's request lines ("GET /admin/crm 200 in 41s (compile: 38s ...)"), so a slow
    // run shows which page was slow and why.
    stdout: process.env.CI ? "pipe" : "ignore",
    // Stopped gently, so Turbopack finishes writing its compile cache (kept between CI runs).
    gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
    env: {
      DEV_IMPERSONATE_CLERK_ID: "dev_seed_admin",
    },
  },
});
