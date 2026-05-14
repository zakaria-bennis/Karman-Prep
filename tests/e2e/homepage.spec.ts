// ============================================================
// Sample e2e test — verifies the public landing page renders
// without crashing.
//
// Reference pattern. Add new e2e tests under tests/e2e/ as you
// add user-facing flows worth protecting.
//
// To run: `npm run dev` in one terminal, `npm run test:e2e`
// in another. Doesn't run in CI (yet) — see playwright.config.ts.
// ============================================================

import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");

  // Whatever the page says, it should at least have a body
  // with non-trivial content. Adjust the copy assertion below
  // when the homepage gets a stable hero headline.
  await expect(page.locator("body")).toBeVisible();
  expect(await page.title()).not.toBe("");
});
