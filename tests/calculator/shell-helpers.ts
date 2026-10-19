// Node-side helpers for the calculator shell specs (10 R5): shell.spec.ts,
// shell-keyboard.spec.ts, shell-motion-theme.spec.ts and shell-settings.spec.ts. They drive the
// harness page /harness/calculator.html (tests/calculator/fixture/harness/calculator.tsx) through
// globalThis.__shell and read the engine through globalThis.__calculatorHarness. Functions that run
// inside the page live in shell-probes.ts.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { compositeOver } from "@/lib/calculator/theme/contrast";
import {
  countLeavingFrames,
  readMotion,
  readRing,
  readStrokes,
  readTextPairs,
  type Motion,
  type Ring,
  type TextPair,
} from "./shell-probes";

/** Fails the test on any console error or page error (each shell spec file calls it once). */
export function useConsoleGuard(): void {
  const errors = new WeakMap<Page, string[]>();
  test.beforeEach(({ page }) => {
    const list: string[] = [];
    errors.set(page, list);
    page.on("console", (message) => {
      if (message.type() === "error") list.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => list.push(`pageerror: ${error.message}`));
  });
  test.afterEach(({ page }) => {
    expect(errors.get(page) ?? []).toEqual([]);
  });
}

/** Opens the harness with `query` and waits for the shell and its layout. */
export async function openShell(page: Page, query = ""): Promise<void> {
  await page.goto(`/harness/calculator.html${query}`);
  await page.waitForFunction(() => globalThis.__shell !== undefined);
  await page.locator("#calc [data-kc-layout]").waitFor({ state: "attached" });
}

export function enc(rows: string[]): string {
  return encodeURIComponent(JSON.stringify(rows));
}

export function rowField(page: Page, id: string): Locator {
  return page.locator(`#calc [data-row-id="${id}"] .mq-editable-field`);
}

export function rows(
  page: Page
): Promise<{ id: string; latex: string; valueText: string | null }[]> {
  return page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.getSnapshot().rows.map((r) => ({
      id: r.id,
      latex: r.latex,
      valueText: r.valueText,
    }))
  );
}

export function keypadOpen(page: Page): Promise<boolean> {
  return page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().settings.keypad);
}

/** The id of the row holding the shadow root's active element, or null. */
export function focusedRow(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const active = document.querySelector("#calc")?.shadowRoot?.activeElement ?? null;
    return active?.closest("[data-row-id]")?.getAttribute("data-row-id") ?? null;
  });
}

/** Taps `locator` on touch projects and clicks it otherwise. */
export async function tap(isMobile: boolean, locator: Locator): Promise<void> {
  if (isMobile) await locator.tap();
  else await locator.click();
}

/** K-2: the inputmode attribute of the shadow root's active element, or null. */
export function inputMode(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      document.querySelector("#calc")?.shadowRoot?.activeElement?.getAttribute("inputmode") ?? null
  );
}

export async function box(
  page: Page,
  cls: string
): Promise<{ x: number; y: number; width: number; height: number }> {
  const rect = await page.locator(`#calc .${cls}`).first().boundingBox();
  if (rect === null) throw new Error(`#calc .${cls} has no bounding box`);
  return rect;
}

/** The visible buttons of `#calc .<cls>`, named by aria-label or text, in DOM order. */
export function names(page: Page, cls: string): Promise<string[]> {
  return page
    .locator(`#calc .${cls}`)
    .first()
    .evaluate((region) =>
      [...region.querySelectorAll("button")]
        .filter((b) => {
          const rect = b.getBoundingClientRect();
          const style = getComputedStyle(b);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
        })
        .map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "")
    );
}

/** Every pattern matches a name, at increasing indices. */
export function expectOrder(list: string[], patterns: RegExp[]): void {
  let last = -1;
  for (const pattern of patterns) {
    const index = list.findIndex((name, i) => i > last && pattern.test(name));
    expect(index, `${pattern} after index ${last} in ${JSON.stringify(list)}`).toBeGreaterThan(
      last
    );
    last = index;
  }
}

/** Waits `n` animation frames in the page. */
export async function frames(page: Page, n = 2): Promise<void> {
  await page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) await new Promise((r) => requestAnimationFrame(r));
  }, n);
}

/** Runs `script` in the page with `c` bound to the mounted KarmanCalculator. */
export async function api(page: Page, script: string): Promise<void> {
  await page.evaluate((source) => {
    const c = globalThis.__shell!.handle.calculator;
    new Function("c", source)(c);
  }, script);
}

/** S-6, NM-29: opens the settings popover with the Graph settings button. */
export async function openSettings(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Graph settings" }).click();
  await page.getByRole("dialog", { name: "Graph settings" }).waitFor();
}

export function announced(page: Page): Promise<string[]> {
  return page.evaluate(() => globalThis.__shell!.log.announcements.map((a) => a.text));
}

/** TH-17: [fontFamily, fontSize] of the first shadow match of `selector` (whose trimmed text is `text`). */
export function cs(page: Page, selector: string, text?: string): Promise<[string, string]> {
  return page.evaluate(
    ([sel, wanted]) => {
      const root = document.querySelector("#calc")!.shadowRoot!;
      const el = [...root.querySelectorAll(sel)].find(
        (e) => wanted === null || e.textContent?.trim() === wanted
      );
      if (!el) throw new Error(`no shadow match for ${sel} ${wanted ?? ""}`);
      const style = getComputedStyle(el);
      return [style.fontFamily, style.fontSize] as [string, string];
    },
    [selector, text ?? null] as const
  );
}

/** AR-40 (Chromium): the platform font family names CDP reports for the first shadow `selector`. */
export async function platformFonts(page: Page, selector: string): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
    const { result } = await cdp.send("Runtime.evaluate", {
      expression: `document.querySelector("#calc").shadowRoot.querySelector(${JSON.stringify(selector)})`,
    });
    if (!result.objectId) return [];
    const { nodeId } = await cdp.send("DOM.requestNode", { objectId: result.objectId });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    return fonts.map((f) => f.familyName);
  } finally {
    await cdp.detach();
  }
}

/** AN-14: a computed CSS time in seconds ("0.2s", "200ms"); NaN for anything else. */
export function seconds(d: string): number {
  const match = /^(-?[\d.]+(?:e[+-]?\d+)?)(ms|s)$/i.exec(d.trim());
  if (match === null) return Number.NaN;
  return match[2].toLowerCase() === "ms" ? Number(match[1]) / 1000 : Number(match[1]);
}

/** A computed custom property of #calc, trimmed. */
export function hostVar(page: Page, name: string): Promise<string> {
  return page.evaluate(
    (prop) => getComputedStyle(document.querySelector("#calc")!).getPropertyValue(prop).trim(),
    name
  );
}

/** The computed { durations, easing } of every shadow element. */
export function motionNow(page: Page): Promise<Motion[]> {
  return page.evaluate(readMotion);
}

/**
 * motionNow after focusing row 1, opening the keypad, the Functions panel and the Graph settings
 * popover. Escape then closes the popover and the panel; the keypad stays open and focus is on the
 * Graph settings button, where 09's popover returns it.
 */
export async function motionAcrossLayers(page: Page): Promise<Motion[]> {
  const all: Motion[] = [];
  await rowField(page, "1").click();
  all.push(...(await motionNow(page)));
  await api(page, "c.updateSettings({ keypad: true })");
  all.push(...(await motionNow(page)));
  const keypad = page.getByRole("region", { name: "Keypad" });
  await keypad.getByRole("button", { name: "Functions", exact: true }).click();
  all.push(...(await motionNow(page)));
  const settings = page.getByRole("button", { name: "Graph settings" });
  await settings.click();
  all.push(...(await motionNow(page)));
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Graph settings" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(keypad.getByRole("button", { name: "Functions", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false"
  );
  await expect(settings).toBeFocused();
  return all;
}

/** Every duration is 0. */
export function allZero(list: Motion[]): boolean {
  return list.every((m) => m.durations.every((d) => seconds(d) === 0));
}

/** A linear() easing, or a cubic-bezier whose y values leave [0, 1]. */
export function overshoots(easing: string): boolean {
  if (/^linear\(/.test(easing)) return true;
  const bezier = /^cubic-bezier\(([^)]*)\)$/.exec(easing);
  if (bezier === null) return false;
  const [, y1, , y2] = bezier[1].split(",").map(Number);
  return [y1, y2].some((y) => y < 0 || y > 1);
}

export interface InstantMotion {
  homeGone: boolean; // AN-8: no Home control a frame after Home
  leavingFrames: number; // AN-8: frames in which Home was fading out
  rowSettled: boolean; // AN-5: a frame after Add item, the new row has its final height
  graphMoved: boolean; // AN-3: a frame after Collapse list, the graph has widened
  graphSettled: boolean; // AN-3: and keeps that width
}

export const INSTANT: InstantMotion = {
  homeGone: true,
  leavingFrames: 0,
  rowSettled: true,
  graphMoved: true,
  graphSettled: true,
};

/** AN-13: the motions that exist only while they run (AN-8 Home fade, AN-5 row insert, AN-3 collapse). */
export async function instantMotion(page: Page): Promise<InstantMotion> {
  const graph = page.getByRole("img", { name: /^Graph from/ });
  await graph.press("ArrowRight");
  await page.getByRole("button", { name: /^home$/i }).waitFor();
  const leaving = page.evaluate(countLeavingFrames);
  await graph.press("Home");
  await frames(page, 1);
  const homeGone = (await page.locator("#calc [data-graph-home]").count()) === 0;
  const leavingFrames = await leaving;

  const before = new Set((await rows(page)).map((r) => r.id));
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByRole("menuitem", { name: "Add expression" }).click(); // S-2's menu
  await frames(page, 1);
  const added = (await rows(page)).find((r) => !before.has(r.id))!;
  const row = page.locator(`#calc [data-row-id="${added.id}"]`);
  const height = (await row.boundingBox())!.height;
  await page.waitForTimeout(300);
  const rowSettled = Math.abs((await row.boundingBox())!.height - height) <= 0.5;

  const width = async () => (await box(page, "kc-graph-region")).width;
  const start = await width();
  await page.getByRole("button", { name: "Collapse list" }).click();
  await frames(page, 1);
  const moved = await width();
  await page.waitForTimeout(300);
  const graphMoved = Math.abs(moved - start) > 1;
  const graphSettled = Math.abs((await width()) - moved) <= 0.5;
  await page.getByRole("button", { name: "Expand list" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => globalThis.__calculatorHarness!.engine.getSnapshot().settings.expressionsCollapsed
      )
    )
    .toBe(false);
  return { homeGone, leavingFrames, rowSettled, graphMoved, graphSettled };
}

/** TH-1, TH-14, TH-15: the projects that measure computed colours, which do not depend on the engine. */
export const PROJECTS = ["calculator-chrome", "calculator-android"];

/** A computed CSS colour ("rgb(…)", "rgba(…)", "color(srgb …)" or "#rrggbb[aa]") as lowercase hex and alpha. */
export function toHex(css: string): { hex: string; alpha: number } {
  const c = css.trim().toLowerCase();
  const byte = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, "0");
  const hexMatch = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(c);
  if (hexMatch) {
    return {
      hex: `#${hexMatch[1]}`,
      alpha: hexMatch[2] ? parseInt(hexMatch[2], 16) / 255 : 1,
    };
  }
  const rgb = /^rgba?\(([^)]*)\)$/.exec(c);
  const srgb = /^color\(srgb ([^)]*)\)$/.exec(c);
  const body = rgb?.[1] ?? srgb?.[1];
  if (body === undefined) throw new Error(`unparsed colour ${css}`);
  const parts = body
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  const scale = srgb ? 255 : 1;
  return {
    hex: `#${parts
      .slice(0, 3)
      .map((v) => byte(v * scale))
      .join("")}`,
    alpha: parts.length > 3 ? parts[3] : 1,
  };
}

/** The hex of `fg` at `alpha` over the opaque `bg`. */
export function onBackground(fg: string, alpha: number, bg: string): string {
  return compositeOver(toHex(fg).hex, alpha, toHex(bg).hex);
}

/** TH-14: the focused shadow element's outline and the background behind it, or null. */
export function ringOf(page: Page): Promise<Ring | null> {
  return page.evaluate(readRing);
}

/** TH-14: Tabs from #outside until focus returns there and returns every non-null ringOf. */
export async function tabRings(page: Page): Promise<Ring[]> {
  await page.locator("#outside").focus();
  const rings: Ring[] = [];
  for (let i = 0; i < 150; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.id === "outside")) return rings;
    const ring = await ringOf(page);
    if (ring !== null) rings.push(ring);
  }
  throw new Error(`focus never returned to #outside: ${JSON.stringify(rings.map((r) => r.name))}`);
}

/** TH-1: the rendered text and field-boundary colour pairs of the shadow root. */
export function textPairs(page: Page): Promise<TextPair[]> {
  return page.evaluate(readTextPairs);
}

/** TH-15: the canvas strokeStyles recorded by the recordStrokes init script. */
export function strokes(page: Page): Promise<string[]> {
  return page.evaluate(readStrokes);
}
