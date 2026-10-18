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

test("direct synthetic student completes a 35-question diagnostic", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/diagnostic");
  await expect(page).toHaveURL(/\/diagnostic/);
  const replayConsent = page.getByRole("dialog", { name: /Help us debug/i });
  if (await replayConsent.isVisible()) {
    await replayConsent.getByRole("button", { name: "Decline" }).click();
  }
  for (let i = 0; i < 35; i++) {
    await page.locator("div.space-y-3 > div.group.relative > button").first().click();
    await page.getByRole("button", { name: i === 34 ? /See My Results/ : /Next Question/ }).click();
  }
  await expect(page.getByText("Your Diagnostic Results")).toBeVisible();
  await expect(page.getByText("Predicted SAT Score Range")).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard\/student\/progress/);
});
