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
//   3. /dashboard/student should render the target's own
//      student portal.
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
    await expect(page.getByRole("heading", { name: "People" }).first()).toBeVisible();

    // The mid student should be in the list. Find their row by
    // email (stable across reseed runs).
    const midRow = page.locator("tr", { hasText: "dev-seed-mid@karman.local" });
    await expect(midRow).toBeVisible();

    // ── 2. Click Impersonate ───────────────────────────────
    await midRow.getByRole("button", { name: /Impersonate/i }).click();

    // ── 3. Banner appears with target's name ───────────────
    // Other parts of the app also use role="status", so match the
    // banner by its text.
    const banner = page.getByRole("status").filter({ hasText: "Admin viewing as" });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Mid Student");
    await expect(banner).toContainText(/student/i);

    // We should have been redirected to /dashboard/student and
    // the page should render the target's seeded data.
    await expect(page).toHaveURL(/\/dashboard\/student/);
    // The student portal renders for the target, its menu first (Library is on every plan).
    await expect(page).toHaveTitle(/Your portal/);
    await expect(page.getByRole("button", { name: "Library" }).first()).toBeVisible();

    // ── 4. Navigate to /learn while still impersonated ─────
    // The banner is site-wide so it should follow us.
    await page.goto("/learn");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Mid Student");

    // ── 5. Click the banner × to exit impersonation ────────
    await banner.getByRole("button", { name: /Exit impersonation/i }).click();

    // Lands on /admin/users with no banner.
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(banner).toHaveCount(0);
  });

  test("stuck student shows the placement-failure banner when impersonated", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/admin/users");
    const stuckRow = page.locator("tr", { hasText: "dev-seed-stuck@karman.local" });
    await stuckRow.getByRole("button", { name: /Impersonate/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/student/);
    // The stuck student bought the cohort but has no cohort or tutor yet (scripts/seed-dev.mjs), so
    // their portal opens on Homework, which says so (src/app/dashboard/student/_portal/Homework.tsx,
    // data.placementPending). Audit issue #10.
    await expect(page.getByText("Matching you with a tutor").first()).toBeVisible();
  });
});
