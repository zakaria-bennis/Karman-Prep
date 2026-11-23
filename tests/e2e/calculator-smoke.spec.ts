import { expect, test, type Page } from "@playwright/test";

// Turbopack smoke (AR-65, API-15, AR-31) against `next dev`, as the seeded Pro student
// dev_seed_student_mid. Runs under `npm run test:e2e` (Chromium only).

const trigger = (page: Page) =>
  page.getByRole("button", { name: "Toggle Karman calculator", exact: true });
const row = (page: Page) => page.getByRole("textbox", { name: "Expression 1", exact: true });
// MathQuill keeps the row's textarea at 0 x 0, so it is focused rather than clicked and
// visibility is asserted on the list item that holds it (as tests/calculator/quiz-helpers.ts does).
const rowItem = (page: Page) => page.getByRole("listitem").filter({ has: row(page) });

async function openPractice(page: Page) {
  // A Math Endless run in the student portal, where students meet the calculator (the old node map
  // that this test used to open was deleted). Signed in as the seeded Pro student (scripts/seed-dev.mjs,
  // the only accounts a CI database has) by the development header, sent to this server only.
  await page.route(/^http:\/\/(localhost|127\.0\.0\.1)[:/]/, (route) =>
    route.continue({
      headers: { ...route.request().headers(), "x-dev-as": "dev_seed_student_mid" },
    })
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/student?page=library");
  const consent = page.getByRole("dialog", { name: /Help us debug/i });
  if (await consent.isVisible()) await consent.getByRole("button", { name: "Decline" }).click();
  await page.getByRole("button", { name: /^Math/ }).first().click();
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page
    .getByRole("button", { name: /^Endless/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: /^Start endless/ })
    .first()
    .click();
  await expect(trigger(page)).toBeVisible({ timeout: 60_000 });
}

const failOneMount = () => {
  let failed = false;
  const attach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    if (!failed && this.hasAttribute("data-calculator-host")) {
      failed = true;
      throw new Error("smoke mount failure");
    }
    return attach.call(this, init);
  };
};

test("AR-65 practice opens the calculator under Turbopack, types and graphs y=x^2 with the worker loaded from /_next/ and the row in the --kc-font-math stack", async ({
  page,
}) => {
  const errors: string[] = [];
  const failedFonts: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => {
    if (/\.woff2/.test(r.url())) failedFonts.push(r.url());
  });
  await openPractice(page);
  const worker = page.waitForEvent("worker");
  await trigger(page).click();
  await row(page).focus();
  await page.keyboard.type("y=x^2");
  expect(new URL((await worker).url()).pathname.startsWith("/_next/")).toBe(true);
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
  expect(
    await page.evaluate(() => {
      const root = document.querySelector("[data-calculator-host]")?.shadowRoot;
      const math = root?.querySelector(".mq-root-block");
      return math ? getComputedStyle(math).fontFamily : null;
    })
  ).toBe('"Times New Roman", Tinos, "Liberation Serif", serif');
  expect(failedFonts).toEqual([]);
  expect(errors).toEqual([]);
});

test("API-15 next dev exposes no calculator globals", async ({ page }) => {
  await openPractice(page);
  await trigger(page).click();
  await expect(rowItem(page)).toBeVisible();
  expect(
    await page.evaluate(() =>
      ["KarmanCalculator", "karmanCalculator", "MathQuill"].filter((k) => k in window)
    )
  ).toEqual([]);
});

test("AR-31 under next dev a blocked chunk shows the reload panel and a mount failure recovers with Retry (OI-28)", async ({
  page,
  context,
}) => {
  await openPractice(page);
  await page.route("**/_next/static/chunks/**", (route) => route.abort());
  await trigger(page).click();
  await expect(
    page.getByText("The calculator could not load. Reload the page to try again.")
  ).toBeVisible();
  const second = await context.newPage();
  await second.addInitScript(failOneMount);
  await openPractice(second);
  await trigger(second).click();
  await expect(second.getByText("The calculator could not load.", { exact: true })).toBeVisible();
  await second.getByRole("button", { name: "Retry" }).click();
  await expect(rowItem(second)).toBeVisible();
});
