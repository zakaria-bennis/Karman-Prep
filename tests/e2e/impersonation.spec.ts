// ============================================================
// E2E — admin impersonation flow (audit issue #17, PR #51).
//
// The dev server boots with DEV_IMPERSONATE_CLERK_ID=dev_seed_admin
// (see playwright.config.ts) so we land as admin without going
// through Clerk. The test then exercises the user-impersonation
// path that PR #51 added:
//
//   1. Visit /admin/users and click Impersonate on the mid
//      student's row.
//   2. The site-wide banner should appear with the target's
//      name + role pill.
//   3. /dashboard/student should render the target's actual
//      data (goal score, tier, etc.).
//   4. Click the banner × — cookies clear, admin lands back
//      on /admin/users with no banner.
//
// This is the test that would have caught a granular-impersonate
// regression that the unit/CI gates can't see.
// ============================================================

import { expect, test } from "@playwright/test";

test.describe("admin impersonation", () => {
  test("admin can impersonate a student, see their data, and exit back to admin", async ({
    page,
  }) => {
    // Browser dialogs (the confirm() before impersonation kicks in)
    // must be auto-accepted in the headless run.
    page.on("dialog", (dialog) => dialog.accept());

    // ── 1. Land on the admin users table ───────────────────
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    // The mid student should be in the list. Find their row by
    // email (stable across reseed runs).
    const midRow = page.locator("tr", { hasText: "dev-seed-mid@karman.local" });
    await expect(midRow).toBeVisible();

    // ── 2. Click Impersonate ───────────────────────────────
    await midRow.getByRole("button", { name: /Impersonate/i }).click();

    // ── 3. Banner appears with target's name ───────────────
    const banner = page.getByRole("status");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Mid Student");
    await expect(banner).toContainText(/student/i);

    // We should have been redirected to /dashboard/student and
    // the page should render the target's seeded data.
    await expect(page).toHaveURL(/\/dashboard\/student/);
    // Latest seeded diagnostic puts the student in the 1200-1300
    // predicted-SAT band — visible on the home dashboard's
    // "predicted SAT" tile.
    await expect(page.locator("body")).toContainText(/1200.+1300/);

    // ── 4. Navigate to /learn while still impersonated ─────
    // The banner is site-wide so it should follow us.
    await page.goto("/learn");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Mid Student");

    // ── 5. Click the banner × to exit impersonation ────────
    await banner.getByRole("button", { name: /Exit impersonation/i }).click();

    // Lands on /admin/users with no banner.
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("stuck student shows the placement-failure banner when impersonated", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/admin/users");
    const stuckRow = page.locator("tr", { hasText: "dev-seed-stuck@karman.local" });
    await stuckRow.getByRole("button", { name: /Impersonate/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/student/);
    // Copy from src/app/dashboard/student/page.tsx's placement
    // banner. Audit issue #10. Adjust if the wording shifts.
    await expect(page.locator("body")).toContainText(/matching you with a tutor/i);
  });
});
