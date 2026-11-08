import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("letters pick answers and arrows move between questions", async ({ page }) => {
  await page.goto("/?set=end&q=math");
  await expect(page.getByRole("radiogroup")).toBeVisible();
  const radios = page.getByRole("radio");
  await page.keyboard.press("c");
  await expect(radios.nth(2)).toHaveAttribute("aria-checked", "true");
  await expect(radios.nth(2)).toHaveAccessibleName(/^C/);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: /Question 2 of/ })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("button", { name: /Question 1 of/ })).toBeVisible();
});

test("M marks for review and S bookmarks", async ({ page }) => {
  await page.goto("/?set=end&q=math");
  await expect(page.getByRole("radiogroup")).toBeVisible();
  await page.keyboard.press("m");
  await expect(page.getByRole("button", { name: "Mark for review" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.keyboard.press("s");
  await expect(page.getByRole("button", { name: "Bookmark" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("no shortcut fires while typing an answer", async ({ page }) => {
  await page.goto("/?set=instant&q=numeric");
  const input = page.getByLabel("Your answer");
  await input.fill("");
  await input.pressSequentially("12");
  await page.keyboard.press("ArrowLeft");
  await expect(input).toHaveValue("12");
  await expect(page.getByRole("button", { name: /Question 1 of/ })).toBeVisible();
});

test("a crossed-out choice has the crossed-out name in a real browser", async ({ page }) => {
  await page.goto("/?set=instant&q=math");
  await page.getByRole("button", { name: "Answer eliminator" }).click();
  await page.getByRole("button", { name: "Cross out choice A" }).click();
  await expect(page.getByRole("radio").first()).toHaveAccessibleName(/crossed out$/);
});
