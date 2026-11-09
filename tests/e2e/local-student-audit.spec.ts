import { expect, test } from "@playwright/test";

// Run only with an existing dev server launched as dev_seed_student_fresh
// and E2E_BASE_URL pointed at that server; do not run against production.
test.skip(process.env.E2E_DIRECT_STUDENT !== "1", "requires the direct synthetic student server");
test("direct synthetic student cannot enter admin or tutor pages", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/dashboard\/student/);
  await page.goto("/tutor");
  await expect(page).toHaveURL(/\/dashboard\/student/);
});

test("the old diagnostic address opens the bank-fed diagnostic", async ({ page }) => {
  await page.goto("/diagnostic");
  await expect(page).toHaveURL(/\/learn\/diagnostic/);
  await expect(page.getByRole("button", { name: "Start the diagnostic" })).toBeVisible();
});
