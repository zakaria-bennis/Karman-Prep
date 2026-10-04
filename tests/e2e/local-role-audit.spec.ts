import { expect, test } from "@playwright/test";

const persona = process.env.E2E_ROLE_PERSONA;
test.skip(persona !== "parent" && persona !== "tutor", "requires a direct synthetic role server");

test("direct parent or tutor sees own scope but cannot enter admin", async ({ page }) => {
  await page.goto(persona === "parent" ? "/dashboard/parent" : "/tutor");
  await expect(page.locator("body")).toContainText(
    persona === "parent" ? "Your students" : "Tutor Portal"
  );
  await expect(page.locator("body")).toContainText("Mid Student");

  if (persona === "parent") {
    const linked = page.getByRole("link", { name: /Mid Student/i }).first();
    await linked.click();
    await expect(page.locator("body")).toContainText("Mid Student");
    const unlinkedId = process.env.E2E_UNLINKED_STUDENT_ID;
    if (unlinkedId) {
      const response = await page.goto(`/dashboard/parent/${unlinkedId}`);
      expect(response?.status()).toBe(404);
    }
  }

  await page.goto("/admin/users");
  await expect(page.getByText("Admin Console")).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/admin\/users/);
});
