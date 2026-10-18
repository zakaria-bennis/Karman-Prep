// Node-side helpers for the calculator v2 shell specs (10 R5): shell.spec.ts,
// shell-keyboard.spec.ts, shell-motion-theme.spec.ts and shell-settings.spec.ts. They drive the
// harness page /v2/calculator.html (tests/calculator/fixture/v2/calculator.tsx) through
// globalThis.__shell and read the engine through globalThis.__calculatorHarness. Functions that run
// inside the page live in shell-probes.ts.

import { expect, test, type Locator, type Page } from "@playwright/test";

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
  await page.goto(`/v2/calculator.html${query}`);
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

export function announced(page: Page): Promise<string[]> {
  return page.evaluate(() => globalThis.__shell!.log.announcements.map((a) => a.text));
}
