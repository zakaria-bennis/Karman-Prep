import { expect, test } from "@playwright/test";

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("end mode: the last Next opens the check page, then Submit section", async ({ page }) => {
    await page.goto("/?set=end&length=3");
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Check your work" })).toBeVisible();
    await page.getByRole("button", { name: "Question 2, unanswered" }).click();
    await expect(page.getByRole("button", { name: /Question 2 of 3/ })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await page.getByRole("button", { name: "Submit section" }).click();
    await expect(page.locator("[data-fixture-done]")).toBeVisible();
  });

  test("the navigator jumps between questions", async ({ page }) => {
    await page.goto("/?set=end&length=6");
    await page.getByRole("button", { name: /Question 1 of 6/ }).click();
    const dialog = page.getByRole("dialog", { name: "Math" });
    await dialog.getByRole("button", { name: /^Question 5,/ }).click();
    await expect(page.getByRole("button", { name: /Question 5 of 6/ })).toBeVisible();
  });

  test("exit asks first in a timed section", async ({ page }) => {
    await page.goto("/?set=end&length=3");
    await page.getByRole("button", { name: "Exit" }).click();
    await expect(page.getByRole("dialog", { name: "Leave this section?" })).toBeVisible();
    await page.getByRole("button", { name: "Stay" }).click();
    await expect(page.locator("[data-fixture-done]")).toHaveCount(0);
  });

  test("exit in practice leaves straight away", async ({ page }) => {
    await page.goto("/?set=instant&q=math");
    await page.getByRole("button", { name: "Exit" }).click();
    await expect(page.locator("[data-fixture-done]")).toBeVisible();
  });

  test("the reference opens as a panel", async ({ page }) => {
    await page.goto("/?set=instant&q=math");
    await page.getByRole("button", { name: "Reference" }).click();
    const sheet = page.getByRole("dialog", { name: "Reference" });
    await expect(sheet.getByRole("img", { name: "Cylinder" })).toBeVisible();
    const box = (await sheet.boundingBox())!;
    expect(box.width).toBeLessThan(600);
  });

  test("text at 200% reflows with no sideways scrolling", async ({ page }) => {
    await page.goto("/?set=instant&q=rw");
    await page.getByRole("button", { name: "More" }).click();
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Larger text" }).click();
    await expect(page.locator("output", { hasText: "200%" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    const pane = page.locator("[data-quiz-frame]:not([data-exiting]) [data-quiz-pane='question']");
    expect(await pane.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  });

  test("the calculator docks and the question moves right", async ({ page }) => {
    await page.goto("/?set=instant&q=math&calc=1");
    const column = page.locator("[data-quiz-frame]:not([data-exiting]) [data-quiz-column]");
    const before = (await column.boundingBox())!;
    await page.getByRole("button", { name: "Toggle Karman calculator" }).click();
    await expect(page.locator("[data-calculator-root]")).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(
        async () =>
          await page
            .locator("[data-calculator-dock-shift]")
            .last()
            .evaluate((el) => getComputedStyle(el).marginLeft)
      )
      .not.toBe("0px");
    const after = (await column.boundingBox())!;
    expect(after.x).toBeGreaterThan(before.x);
  });

  test("a countdown that runs out submits the section", async ({ page }) => {
    await page.goto(`/?set=end&length=2&started=${Date.now() - 1_919_000}`);
    await expect(page.locator("[data-fixture-done]")).toBeVisible({ timeout: 5000 });
    expect(await page.evaluate(() => (globalThis as { __finish?: string }).__finish)).toBe("time");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the reference opens as a sheet", async ({ page }) => {
    await page.goto("/?set=instant&q=math");
    await page.getByRole("button", { name: "Reference" }).click();
    const box = (await page.getByRole("dialog", { name: "Reference" }).boundingBox())!;
    expect(box.width).toBeGreaterThan(380);
    expect(box.y + box.height).toBeGreaterThan(830);
  });
});

test.describe("instant grading", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test("a wrong answer shakes, then Next really moves to the next question", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?set=instant&length=3");
    await page.getByRole("radio").nth(1).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("button", { name: /Question 2 of 3/ })).toBeVisible();
    await expect(
      page.locator("[data-quiz-frame]:not([data-exiting]) [data-ink-block='stem']")
    ).toContainText("What is");
    await expect(page.locator("[data-quiz-frame]")).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});

test("flagging for a tutor waves the flag without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?set=instant&q=math&tutor=1");
  await page.getByRole("button", { name: "Flag for my tutor" }).click();
  await page.getByLabel("Note for your tutor (optional)").fill("I keep missing these");
  await page.getByRole("button", { name: "Send to tutor" }).click();
  await expect(page.getByRole("button", { name: "Flag for my tutor" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.waitForTimeout(600);
  expect(errors).toEqual([]);
});
