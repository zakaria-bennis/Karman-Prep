// Node-side helpers for the calculator quiz seam specs: quiz-window,
// quiz-reset, quiz-loading, quiz-dock and quiz-chrome-theme. They drive the quiz fixture
// (tests/calculator/fixture/main.tsx) and read the engine through
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

/** The quiz shell's dock-shift host: everything under the top bar moves right of a docked
 * calculator (shared quiz shell, 2026-10-27). */
export const shiftHost = (page: Page) => page.locator("[data-calculator-dock-shift]").first();

/** Where the docked calculator starts: a card 12 px under the top of the screen, beside the
 * card that holds the bars and the question (founder, 2026-11-17, fifth round). */
export const dockTopOf = async (_page: Page) => 12;

/** The docked card's width in the quiz: half the screen, less the 12 px gaps on each side. */
export const quizDockWidth = (viewportWidth: number) => Math.round(viewportWidth / 2) - 24;

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

/** Lazy calculator modules (AR-1): the eager quiz seam files beside them never match. */
const LAZY_REQUEST =
  /\/src\/lib\/calculator\/|\/src\/components\/calculator\/(?:KarmanCalculator|host|icons|math-field|styles|transfer|ui)[/.]|\/vendor\/mathquill\//;

export function calculatorRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (r) => {
    if (LAZY_REQUEST.test(r.url())) urls.push(r.url());
  });
  return urls;
}

/** The quiz offers no Undock button (founder, 2026-11-17: no title bar when docked or full
 * screen), but a window left floating keeps its bar; the specs set floating through the store. */
export const undock = (page: Page) =>
  page.evaluate(() =>
    globalThis.__calculatorWindowStore!.set({ mode: "floating", restoreMode: "floating" })
  );

/**
 * Opens the calculator from the quiz's top-bar Calculator button (phones too: the quiz has no
 * side tab). L-4 docks the first open of a page session on wide viewports; most window tests
 * start from the floating window, so the helper makes it float unless `docked` is asked for.
 */
export async function openCalculator(
  page: Page,
  flow = "diagnostic",
  size?: { width: number; height: number },
  options: { docked?: boolean } = {}
) {
  if (size) await page.setViewportSize(size);
  await page.goto(`/?flow=${flow}`);
  await trigger(page).click();
  await expect(rowItem(page)).toBeVisible();
  if (!options.docked && (await frame(page).getAttribute("data-mode")) === "docked") {
    await undock(page);
    await expect(frame(page)).toHaveAttribute("data-mode", "floating");
  }
  // AN-10: geometry is read once the 200 ms entry animation has ended.
  await expect(frame(page)).not.toHaveAttribute("data-entering");
}
