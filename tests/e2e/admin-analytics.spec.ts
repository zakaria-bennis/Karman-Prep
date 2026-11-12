// ============================================================
// E2E — /admin/analytics (first-party usage analytics, 2026-11-12).
//
// Runs as dev_seed_admin (playwright.config.ts). On a fresh database there are no events yet,
// so the page must still draw every section, with each chart's numbers available as a table.
// The sample-data view must say plainly that its numbers are made up.
// ============================================================

import { expect, test } from "@playwright/test";

test.describe("admin analytics", () => {
  test("shows the funnel, daily active and engagement sections with table alternatives", async ({
    page,
  }) => {
    await page.goto("/admin/analytics");
    await expect(
      page.getByRole("heading", { name: "Analytics", exact: true }).first()
    ).toBeVisible();
    for (const name of [
      "Sign-up funnel",
      "Daily active",
      "Time spent by feature",
      "Where visits end",
      "Top pages",
      "Students: engagement",
    ]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }

    // The funnel's numbers, as a table, behind "Show the numbers".
    const funnel = page.getByRole("region", { name: "Sign-up funnel" });
    await funnel.getByText("Show the numbers").click();
    const table = funnel.getByRole("table", { name: "Sign-up funnel, step by step" });
    await expect(table).toBeVisible();
    await expect(table.getByRole("row", { name: /Visited the site/ })).toBeVisible();
    await expect(table.getByRole("row", { name: /Paid/ })).toBeVisible();

    const daily = page.getByRole("region", { name: "Daily active" });
    await daily.getByText("Show the numbers").click();
    await expect(
      daily.getByRole("table", { name: "Daily active students and site visitors" })
    ).toBeVisible();
  });

  test("labels sample data as made up", async ({ page }) => {
    await page.goto("/admin/analytics?sample=1");
    await expect(page.getByRole("note").filter({ hasText: "Sample data." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to real data" })).toBeVisible();
    await expect(page.getByText("Sample Student A").first()).toBeVisible();
  });
});
