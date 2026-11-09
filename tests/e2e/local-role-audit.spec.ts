import { expect, test } from "@playwright/test";

const persona = process.env.E2E_ROLE_PERSONA;
test.skip(persona !== "parent" && persona !== "tutor", "requires a direct synthetic role server");

test("direct parent or tutor sees own scope but cannot enter admin", async ({ page }) => {
  await page.goto(persona === "parent" ? "/dashboard/parent" : "/tutor");

  if (persona === "parent") {
    // One linked student: the parent portal opens that student's week.
    await expect(page).toHaveURL(/\/dashboard\/parent\/[0-9a-f-]{36}$/);
    await expect(page.locator("body")).toContainText("Next sessions");
    const unlinkedId = process.env.E2E_UNLINKED_STUDENT_ID;
    if (unlinkedId) {
      const response = await page.goto(`/dashboard/parent/${unlinkedId}`);
      expect(response?.status()).toBe(404);
    }
  } else {
    await expect(page.locator("body")).toContainText("Tutor Portal");
    await expect(page.locator("body")).toContainText("Mid Student");
  }

  await page.goto("/admin/users");
  await expect(page.getByText("Admin Console")).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/admin\/users/);
});
