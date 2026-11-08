import { expect, test, type Page } from "@playwright/test";

const CURRENT = "[data-quiz-frame]:not([data-exiting])";
async function answer(page: Page, letter: number) {
  await page.locator(`${CURRENT} [role=radio]`).nth(letter).click();
  await page.getByRole("button", { name: "Submit" }).click();
}

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the reward bar never covers the question text", async ({ page }) => {
    await page.goto("/?set=instant&length=6");
    await answer(page, 0);
    const bar = (await page.getByRole("status", { name: "Answer result" }).boundingBox())!;
    const pane = (await page.locator(`${CURRENT} [data-quiz-scroll]`).first().boundingBox())!;
    expect(bar.y).toBeGreaterThanOrEqual(pane.y + pane.height - 1);
    await expect(page.getByRole("status", { name: "Answer result" })).toContainText("Correct");
  });

  test("dots fill as the set goes and a wrong answer resets the streak", async ({ page }) => {
    await page.goto("/?set=instant&length=6");
    for (let i = 0; i < 3; i++) {
      await answer(page, 0);
      await page.getByRole("button", { name: "Next" }).click();
    }
    const dots = page.getByTestId("progress-dot");
    await expect(dots.nth(0)).toHaveAttribute("data-state", "correct");
    await expect(dots.nth(2)).toHaveAttribute("data-state", "correct");
    await expect(dots.nth(3)).toHaveAttribute("data-state", "current");
    await answer(page, 1);
    await expect(page.getByRole("status", { name: "Answer result" })).toContainText("Not quite");
    await expect(dots.nth(3)).toHaveAttribute("data-state", "wrong");
  });

  test("a long set shows the counter instead of dots", async ({ page }) => {
    await page.goto("/?set=instant&length=27");
    await expect(page.getByTestId("progress-dot")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Question 1 of 27/ })).toBeVisible();
  });

  test("finishing a set that raised the skill shows the level-up card", async ({ page }) => {
    await page.goto("/?set=instant&length=2&levelup=1");
    await answer(page, 0);
    await page.getByRole("button", { name: "Next" }).click();
    await answer(page, 0);
    await page.getByRole("button", { name: "Finish" }).click();
    const card = page.getByRole("dialog", { name: "Level up" });
    await expect(card).toContainText("Proficient");
    await card.getByRole("button", { name: "Next" }).click();
    await expect(page.locator("[data-fixture-done]")).toBeVisible();
  });
});
