// Shared helpers for the v2 transfer specs (14). No tests: Playwright's default testMatch skips it.
import { expect, test, type Locator, type Page } from "@playwright/test";

export const url = (flow = "diagnostic", extra = "") =>
  `/?flow=${flow}&calc=v2&questions=transfer${extra}`;
export const xq = (s: string) => `"${s}"`;
// KaTeX's <annotation> is a MathML element, which an XPath name test in an HTML document never
// matches (the name test matches HTML-namespace elements only), so the paths use local-name().
const ANNOTATION = `*[local-name()="annotation"]`;
/** KaTeX annotations whose source is the given latex. */
export const annotations = (page: Page, latex: string) =>
  page.locator(`xpath=//${ANNOTATION}[normalize-space()=${xq(latex)}]`);
/** The controls whose item (the anchor's previous sibling) renders the given latex. */
export const anchors = (page: Page, latex: string) =>
  page.locator(
    `xpath=//*[@data-transfer-control][preceding-sibling::*[1][.//${ANNOTATION}[normalize-space()=${xq(latex)}]]]`
  );
export const anchor = (page: Page, latex: string, n = 0) => anchors(page, latex).nth(n);
export const choiceControl = (page: Page, letter: string) =>
  page.getByRole("button", { name: `Transfer to Calculator: choice ${letter}`, exact: true });
export const allControls = (page: Page) =>
  page.getByRole("button", { name: /^Transfer to Calculator: / });
/** A DOM click: a calculator window may cover the button. */
export const press = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).evaluate((el: HTMLElement) => el.click());

export const DESKTOP = { width: 1280, height: 800 };
export function must<T>(value: T | null | undefined, what = "value"): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}
/** The item a stem control belongs to: its anchor's previous sibling. */
export const item = (page: Page, latex: string, n = 0) =>
  anchor(page, latex, n).locator("xpath=preceding-sibling::*[1]");
export const control = (page: Page, latex: string, n = 0) =>
  anchor(page, latex, n).locator("button");
export const tooltip = (page: Page, latex: string, n = 0) =>
  anchor(page, latex, n).locator("[data-transfer-tooltip]");
export const choiceAnchor = (page: Page, letter: string) =>
  choiceControl(page, letter).locator("xpath=..");
/** The choice container: the parent of the choice's [data-calculator="v2"] cluster. */
export const choiceContainer = (page: Page, letter: string) =>
  choiceControl(page, letter).locator("xpath=ancestor::*[@data-calculator='v2']/..");
export const box = async (l: Locator) => must(await l.boundingBox(), "bounding box");
export const opacity = (l: Locator) => l.evaluate((el) => getComputedStyle(el).opacity);
export const outline = (l: Locator) =>
  l.evaluate((el) => {
    const s = getComputedStyle(el);
    return [s.outlineStyle, s.outlineWidth, s.outlineOffset];
  });
export const blurActive = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
export const chromeOnly = (name: string) =>
  test.skip(name !== "calculator-chrome", "mouse hover and fixed viewport sizes");
export async function open(page: Page, size = DESKTOP, flow = "diagnostic", extra = "") {
  await page.setViewportSize(size);
  await page.goto(url(flow, extra));
  await expect(page.getByText(/Lines|Which line|Question 1:/).first()).toBeVisible();
  await settled(page);
}
/** Waits for the page's finite animations (the question card's entrance) to finish, so layout
 * and pixel measurements start from the resting page. */
export const settled = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
        .map((a) => a.finished.catch(() => undefined))
    ).then(() => true)
  );
/** Taps the item near its start: a coarse control covers the item's end (TR-55), and Chromium's
 * touch adjustment moves a tap a few px from the button onto it. */
export async function tapItem(page: Page, latex: string, n = 0) {
  await item(page, latex, n).scrollIntoViewIfNeeded();
  const b = await box(item(page, latex, n));
  await page.touchscreen.tap(b.x + Math.min(b.width / 2, 6), b.y + b.height / 2);
}
/** Moves the mouse to a point of the element's bounding box (default its centre). Locator.hover()
 * aims at the centre of an inline item's first content quad, which for a KaTeX span starting at
 * a line end lies outside the math, so the h2 would receive the hover. */
export async function hoverAt(l: Locator, fx = 0.5, fy = 0.5) {
  await l.scrollIntoViewIfNeeded();
  const b = await box(l);
  await l.page().mouse.move(b.x + b.width * fx, b.y + b.height * fy);
}
/** The calculator's row latex, or null before the quiz host has set the harness. */
export const rows = (page: Page) =>
  page.evaluate(
    () => globalThis.__calculatorHarness?.engine.getExpressions().map((e) => e.latex ?? "") ?? null
  );
/** What a transfer must never change: the answer, cross-outs, submit readiness and skip. */
export const answerState = (page: Page) =>
  page.evaluate(() => ({
    checked: [...document.querySelectorAll<HTMLInputElement>("input[type=radio]")].filter(
      (r) => r.checked
    ).length,
    crossed: document.querySelectorAll('[aria-label^="Restore choice"]').length,
    ready: [...document.querySelectorAll<HTMLButtonElement>("button")].filter(
      (b) =>
        /^(Submit Answer|Check answer|Next Question)/.test(b.textContent?.trim() ?? "") &&
        !b.disabled
    ).length,
    skip: [...document.querySelectorAll("button")].some((b) =>
      b.textContent?.includes("Skip this question")
    ),
  }));
export const touchOnly = (name: string) =>
  test.skip(!/ios|android/.test(name), "touch projects only");
export const frame = (page: Page) => page.locator("[data-calculator-window]");
export const selected = (page: Page) => page.locator('[data-transfer-selected="true"]');
/** A synthetic touch contact on the target's centre: optional hold, move by dx, and return. */
export async function touchGesture(
  page: Page,
  target: Locator,
  o: { holdMs?: number; dx?: number; back?: boolean }
) {
  const b = await box(target);
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  const init = { pointerType: "touch", isPrimary: true, clientY: y, bubbles: true };
  await target.dispatchEvent("pointerdown", { ...init, clientX: x });
  if (o.dx) await target.dispatchEvent("pointermove", { ...init, clientX: x + o.dx });
  if (o.holdMs) await page.waitForTimeout(o.holdMs);
  await target.dispatchEvent("pointerup", { ...init, clientX: o.back ? x : x + (o.dx ?? 0) });
}
