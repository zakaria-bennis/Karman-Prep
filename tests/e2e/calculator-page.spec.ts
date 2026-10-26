import { expect, test, type Page } from "@playwright/test";

// The public /calculator page: it opens signed out with no prompts, graphs y=x^2, keeps the page
// itself from scrolling, and its logo returns home. Desktop and a 390 x 844 phone.

const row = (page: Page) => page.getByRole("textbox", { name: "Expression 1", exact: true });
const rowItem = (page: Page) => page.getByRole("listitem").filter({ has: row(page) });

// The session-recording consent banner is site-wide; a stored choice keeps it out of the way.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "karman_replay_consent", value: "no", url: baseURL! }]);
});

async function openCalculator(page: Page) {
  await page.goto("/calculator");
  await expect(page).toHaveTitle("Free Graphing Calculator | Karman Prep");
  await expect(rowItem(page)).toBeVisible();
}

async function expectGraphed(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => globalThis.__calculatorHarness?.engine.getSnapshot().geometry.get("1")?.kind
      )
    )
    .toBe("curve");
  expect(
    await page.evaluate(() => globalThis.__calculatorHarness!.engine.getExpressions()[0].latex)
  ).toBe("y=x^{2}");
}

async function expectNoPageScroll(page: Page) {
  const size = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  expect(size.scrollWidth).toBeLessThanOrEqual(size.width);
  expect(size.scrollHeight).toBeLessThanOrEqual(size.height);
}

function watchPage(page: Page) {
  const errors: string[] = [];
  const foreign: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    // Clerk's own script is site-wide; the page adds nothing else from another origin.
    if (!["localhost", "127.0.0.1"].includes(url.hostname) && !/clerk/.test(url.hostname)) {
      if (url.protocol.startsWith("http")) foreign.push(request.url());
    }
  });
  return { errors, foreign };
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("opens with no sign-in, graphs y=x^2, never says Desmos, and the logo goes home", async ({
    page,
  }) => {
    const seen = watchPage(page);
    await openCalculator(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Graphing calculator");
    await expect(page.getByRole("link", { name: /sign in|create account/i })).toHaveCount(0);
    await expect(page.locator("[data-calculator-host]")).toHaveAttribute(
      "data-karman-calculator",
      "karman-calculator:lazy-chunk"
    );
    // Row 1 has focus on load, so typing starts at once.
    await page.keyboard.type("y=x^2");
    await expectGraphed(page);
    await expectNoPageScroll(page);
    const text = await page.evaluate(
      () =>
        document.body.innerText +
        (document.querySelector("[data-calculator-host]")?.shadowRoot?.textContent ?? "")
    );
    expect(text).not.toMatch(/desmos/i);
    expect(seen.foreign).toEqual([]);

    await page.getByRole("link", { name: "Karman Prep home" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(seen.errors).toEqual([]);
  });

  test("starts blank on every visit", async ({ page }) => {
    await openCalculator(page);
    await row(page).focus();
    await page.keyboard.type("y=2x");
    await page.reload();
    await expect(rowItem(page)).toBeVisible();
    expect(
      await page.evaluate(() =>
        globalThis.__calculatorHarness!.engine.getExpressions().map((e) => e.latex)
      )
    ).toEqual([""]);
  });

  test("the SAT practice link and the footer Calculator link both work", async ({ page }) => {
    await openCalculator(page);
    // the old /questions page was replaced by the free practice test (site rebuild, 2026-10-26)
    await page.getByRole("link", { name: "SAT practice" }).click();
    await expect(page).toHaveURL(/\/free-practice-test$/);
    await page
      .getByRole("navigation", { name: "Footer" })
      .getByRole("link", { name: "Calculator" })
      .click();
    await expect(page).toHaveURL(/\/calculator$/);
    await expect(rowItem(page)).toBeVisible();
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("fills the screen with no page scroll, opens the keypad on a tap and graphs y=x^2", async ({
    page,
  }) => {
    const seen = watchPage(page);
    await openCalculator(page);
    await expectNoPageScroll(page);
    await rowItem(page).tap();
    const keypad = page.getByRole("button", { name: "7", exact: true });
    await expect(keypad).toBeVisible();
    await row(page).focus();
    await page.keyboard.type("y=x^2");
    await expectGraphed(page);
    await expectNoPageScroll(page);
    await page.getByRole("link", { name: "Karman Prep home" }).tap();
    await expect(page).toHaveURL(/\/$/);
    expect(seen.errors).toEqual([]);
  });
});
