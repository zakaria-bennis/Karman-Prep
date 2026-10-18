// Node-side helpers for the calculator v2 quiz seam specs (11 tasks 7 to 13): quiz-window,
// quiz-reset, quiz-loading, quiz-dock and quiz-chrome-theme. They drive the quiz fixture
// (tests/calculator/fixture/main.tsx) with `calc=v2` and read the engine through
// globalThis.__calculatorHarness, which the quiz host sets in development.

import { expect, test, type Page } from "@playwright/test";

export const trigger = (page: Page) =>
  page.getByRole("button", { name: "Toggle Karman calculator", exact: true });

export const side = (page: Page) =>
  page.getByRole("button", { name: "Open Karman calculator", exact: true });

export const row = (page: Page, n = 1) =>
  page.getByRole("textbox", { name: `Expression ${n}`, exact: true });

/**
 * The list item that shows row `n`. MathQuill keeps the row's textarea at 0 x 0 (its vendor CSS
 * scales it to nothing), so visibility is asserted on the item that holds it, never on `row`.
 */
export const rowItem = (page: Page, n = 1) =>
  page.getByRole("listitem").filter({ has: row(page, n) });

export const frame = (page: Page) => page.locator("[data-calculator-window]");

export const workspace = (page: Page) => page.locator("[data-calculator-workspace]");

export const phoneSized = (page: Page) => {
  const { width, height } = page.viewportSize()!;
  return width <= 767 || height <= 500;
};

export const latex = (page: Page) =>
  page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.getExpressions().map((e) => e.latex ?? "")
  );

/** DOM click: the window may cover the button. */
export const press = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).evaluate((el: HTMLElement) => el.click());

export const dock = (page: Page) => press(page, "Fixture dock");

export const chromeOnly = (name: string) =>
  test.skip(name !== "calculator-chrome", "fixed viewport sizes and pointer geometry");

/** The 2,000-node Phase 1 runaway row (AR-56, AR-61). */
export const RUNAWAY = `-${Array(499).fill("xy").join("+")}=2x`;

export function v2Requests(page: Page) {
  const urls: string[] = [];
  page.on("request", (r) => {
    if (/\/calculator-v2\/|\/vendor\/mathquill\//.test(r.url())) urls.push(r.url());
  });
  return urls;
}

/**
 * Opens the v2 calculator from the toolbar (the side button on phones). L-4 docks the first open
 * of a page session on wide viewports; most window tests start from the floating window, so the
 * helper undocks unless `docked` is asked for.
 */
export async function openV2(
  page: Page,
  flow = "diagnostic",
  size?: { width: number; height: number },
  options: { docked?: boolean } = {}
) {
  if (size) await page.setViewportSize(size);
  await page.goto(`/?flow=${flow}&calc=v2`);
  await (phoneSized(page) ? side(page) : trigger(page)).click();
  await expect(rowItem(page)).toBeVisible();
  if (!options.docked && (await frame(page).getAttribute("data-mode")) === "docked") {
    await page.getByRole("button", { name: "Undock calculator", exact: true }).click();
    await expect(frame(page)).toHaveAttribute("data-mode", "floating");
  }
  // AN-10: geometry is read once the 200 ms entry animation has ended.
  await expect(frame(page)).not.toHaveAttribute("data-entering");
}
