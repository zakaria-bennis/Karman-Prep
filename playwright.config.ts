import { defineConfig, devices } from "@playwright/test";

// ============================================================
// Playwright e2e config.
//
// Run locally:
//   npm run dev          # in one terminal
//   npm run test:e2e     # in another
//
// Add real e2e tests as the team grows. CI does NOT run these
// yet — wiring up a Next.js dev server in CI with the right
// Clerk/Supabase test fixtures is a real project. The framework
// is set up so the team can write tests when ready.
// ============================================================

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
