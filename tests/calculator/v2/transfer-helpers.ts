// Shared helpers for the v2 transfer specs (14). No tests: Playwright's default testMatch skips it.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { SKIN_COLORS } from "../../../src/lib/calculator-v2/theme/skin-colors.generated";
import type { SkinId } from "../../../src/lib/calculator-v2/theme/skins";

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
export const row = (page: Page, n = 1) =>
  page.getByRole("textbox", { name: `Expression ${n}`, exact: true });
/** The list item that shows row `n` (MathQuill keeps the row's textarea at 0 x 0). */
export const rowItem = (page: Page, n = 1) =>
  page.getByRole("listitem").filter({ has: row(page, n) });
/** Hovers the centre of the item's last line box (a wrapped inline item's bounding-box centre can
 * lie between its lines, and Locator.hover() misses inline KaTeX) and clicks its control. */
export async function transferByMouse(page: Page, latex: string, n = 0) {
  const target = item(page, latex, n);
  await target.scrollIntoViewIfNeeded();
  await settled(page); // a new question's card moves while it enters
  const [x, y] = await target.evaluate((el) => {
    const rects = el.getClientRects();
    const r = rects[rects.length - 1] ?? el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  await page.mouse.move(x, y);
  await control(page, latex, n).click();
}
/** A click with no pointerdown that no window can cover. */
export const clickControl = (page: Page, latex: string, n = 0) =>
  control(page, latex, n).evaluate((el: HTMLElement) => el.click());
/** The page-session window store the fixture exposes (null before it is set). */
export const windowStore = (page: Page) =>
  page.evaluate(() => globalThis.__calculatorWindowStore?.get() ?? null);
export const statusRegion = (page: Page) => page.locator("[data-transfer-status]");
/** The engine's focus, keypad, display settings and shaded-region count (null before the host). */
export const snapshot = (page: Page) =>
  page.evaluate(() => {
    const engine = globalThis.__calculatorHarness?.engine;
    if (engine === undefined) return null;
    const s = engine.getSnapshot();
    return {
      activeRowId: s.activeRowId,
      focusedLatex: s.rows.find((r) => r.id === s.focusedRowId)?.latex ?? null,
      keypad: s.settings.keypad,
      displaySize: s.settings.displaySize,
      reverseContrast: s.settings.reverseContrast,
      regions: [...s.geometry.values()].filter((g) => g.kind === "region").length,
    };
  });
/** Replaces the calculator's rows through the harness engine (no typing, so no row announcements). */
export const setRows = (page: Page, latex: string[]) =>
  page.evaluate(
    (list) =>
      globalThis.__calculatorHarness?.engine.setExpressions(
        list.map((l, i) => ({ id: String(i + 1), latex: l }))
      ),
    latex
  );
/** The quiz host module request (the calculator's lazy import in the Vite fixture). */
export const HOST = /\/calculator-v2\/host\/quiz-host\.ts/;
/** An init script: the first shadow root attached to the calculator host throws (a mount failure). */
export const failMountOnce = () => {
  let failed = false;
  const attach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    if (!failed && this.hasAttribute("data-calculator-host")) {
      failed = true;
      throw new Error("fixture mount failure");
    }
    return attach.call(this, init);
  };
};
/** Switches the site skin as applyTheme does: data-theme plus the dark class for dark skins. */
export const applySkin = (page: Page, skin: SkinId) =>
  page.evaluate(
    ([s, dark]) => {
      const r = document.documentElement;
      r.classList.toggle("dark", dark);
      r.dataset.theme = s;
    },
    [skin, SKIN_COLORS[skin].normal.dark] as const
  );
/** A computed rgb()/rgba() colour as #rrggbb (alpha dropped). */
export const hex = (css: string) =>
  `#${(css.match(/[\d.]+/g) ?? [])
    .slice(0, 3)
    .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
    .join("")}`;
/** The control's colours and the colours actually painted beside the button and the item. */
export const paint = (a: Locator) =>
  a.evaluate((el: HTMLElement) => {
    const rgba = (v: string) => {
      const n = (v.match(/[\d.]+/g) ?? []).map(Number);
      return n.length < 3 ? [0, 0, 0, 0] : [n[0], n[1], n[2], n.length > 3 ? n[3] : 1];
    };
    // the colour actually under (x, y): the anchor's own subtree skipped, translucent layers
    // composited over the first opaque one
    const under = (x: number, y: number) => {
      const layers = document
        .elementsFromPoint(x, y)
        .filter((e) => !el.contains(e))
        .map((e) => rgba(getComputedStyle(e).backgroundColor))
        .filter((c) => c[3] > 0);
      const base = layers.findIndex((c) => c[3] === 1);
      let rgb = base < 0 ? [255, 255, 255] : layers[base].slice(0, 3);
      for (const c of layers.slice(0, base < 0 ? layers.length : base).reverse())
        rgb = rgb.map((v, i) => c[3] * c[i] + (1 - c[3]) * v);
      return `rgb(${rgb.map(Math.round).join(", ")})`;
    };
    const around = (r: DOMRect, d: number) => [
      under(r.left + r.width / 2, r.top - d),
      under(r.left + r.width / 2, r.bottom + d),
      under(r.left - d, r.top + r.height / 2),
      under(r.right + d, r.top + r.height / 2),
    ];
    const b = el.querySelector("button");
    const tip = el.querySelector("[data-transfer-tooltip]");
    const glyph = b?.querySelector("svg");
    if (!b || !tip || !glyph) throw new Error("missing control parts");
    const s = getComputedStyle(b);
    const t = getComputedStyle(tip);
    const r = b.getBoundingClientRect();
    const item = el.dataset.placement === "cluster" ? null : el.previousElementSibling;
    const ir = item?.getBoundingClientRect(); // the selected outline: 2 px outside the item, 2 px wide
    return {
      glyph: getComputedStyle(glyph).color,
      button: s.backgroundColor,
      border: s.borderTopColor,
      ring: s.outlineColor,
      ringStyle: [s.outlineStyle, s.outlineWidth, s.outlineOffset],
      outline: item ? getComputedStyle(item).outlineColor : s.outlineColor,
      tipText: t.color,
      tipBg: t.backgroundColor,
      pages: around(r, 2), // beside the button: what its border and focus ring sit on
      // beside the item's outline: its 2 px offset gap and just outside the line
      outlinePages: ir ? [...around(ir, 1), ...around(ir, 5)] : around(r, 2),
    };
  });
/** An init script: records the strokeStyle of every canvas stroke() call. */
export const recordStrokes = () => {
  const w = window as unknown as { __transferStrokes: string[] };
  w.__transferStrokes = [];
  const stroke = CanvasRenderingContext2D.prototype.stroke;
  CanvasRenderingContext2D.prototype.stroke = function (
    this: CanvasRenderingContext2D,
    ...args: unknown[]
  ) {
    w.__transferStrokes.push(String(this.strokeStyle));
    return (stroke as (...a: unknown[]) => void).apply(this, args);
  };
};
export const strokes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __transferStrokes: string[] }).__transferStrokes);
export const nextFrame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));
/** Marks the calculator's layout element, so a remount (a new element) is detectable. */
export const markLayout = () => {
  const layout = document
    .querySelector("[data-calculator-host]")
    ?.shadowRoot?.querySelector("[data-kc-layout]") as unknown as { kcMark?: number } | null;
  if (layout) layout.kcMark = 1;
};
export const layoutMarked = () =>
  (
    document
      .querySelector("[data-calculator-host]")
      ?.shadowRoot?.querySelector("[data-kc-layout]") as unknown as { kcMark?: number } | null
  )?.kcMark === 1;
export const kcPaper = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("[data-calculator-host]");
    return host ? getComputedStyle(host).getPropertyValue("--kc-paper").trim().toLowerCase() : "";
  });
/** 08's graph-pixels.ts layerColors(page, "shading"), read in the calculator host's shadow root. */
export const shadingLayer = (page: Page) =>
  page.evaluate(() => {
    const c = document
      .querySelector("[data-calculator-host]")
      ?.shadowRoot?.querySelector<HTMLCanvasElement>('canvas[data-layer="shading"]');
    const d = c?.getContext("2d")?.getImageData(0, 0, c.width, c.height).data;
    const opaque = new Set<string>();
    let partial = 0;
    if (!d) return { opaque: [], partial: -1 };
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 255)
        opaque.add(
          `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`
        );
      else if (d[i + 3] > 0) partial++;
    }
    return { opaque: [...opaque], partial };
  });
