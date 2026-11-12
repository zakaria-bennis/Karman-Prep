// ============================================================
// E2E: the student Rewards page renders the token balance.
//
// CI boots the dev server as dev_seed_admin (playwright.config.ts) against a fresh Supabase
// seeded by scripts/seed-dev.mjs. The test impersonates the mid student from /admin/users
// (as tests/e2e/impersonation.spec.ts does), opens /dashboard/student/rewards and checks the
// balance, the box and the companions. A preview can look but not spend, so Open a box stays off.
// ============================================================

import { expect, test } from "@playwright/test";

// Each route compiles on first visit under `next dev`, which can take most of a minute in CI.
test.describe.configure({ timeout: 180_000 });

test.describe("student rewards", () => {
  test("the Rewards page shows the student's token balance", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/admin/users");
    const midRow = page.locator("tr", { hasText: "dev-seed-mid@karman.local" });
    await expect(midRow).toBeVisible();
    await midRow.getByRole("button", { name: /Impersonate/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/student/);

    await page.goto("/dashboard/student/rewards");
    await expect(page.getByRole("heading", { name: "Your tokens" })).toBeVisible();
    // The balance pill reads "Tokens: <n>" to screen readers.
    await expect(page.getByRole("status", { name: /^Tokens: \d+$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mystery box" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Companions" })).toBeVisible();
    // Everyone starts with the fox.
    await expect(page.getByRole("button", { name: /Fox/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open a box/ })).toBeDisabled();
  });
});
