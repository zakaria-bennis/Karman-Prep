// Calculator v2 shell browser tests (10 R5): layouts L-1, L-2, L-8 and L-14 and the AR-60 worker
// gate on the harness page /v2/calculator.html; later shell tasks add AR-40, TH-17, KB-4 and the
// contributions here.

import { expect, test } from "@playwright/test";
import {
  api,
  box,
  enc,
  expectOrder,
  frames,
  names,
  openShell,
  rows,
  useConsoleGuard,
} from "./shell-helpers";
import { measureL14, popoverCoversRow1 } from "./shell-probes";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const TOOLBAR = [/^add item/i, /^undo/i, /^redo/i, /^edit list/i, /^collapse list/i],
  GRAPH = [/^graph settings$/i, /^zoom in$/i, /^zoom out$/i];
test("L-1 desktop: list on the left at max(260px, 40%); toolbar and graph controls in order; Home only off the default view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openShell(page, "?w=800&h=600");
  const [list, graph] = [await box(page, "kc-list-region"), await box(page, "kc-graph-region")];
  expect(Math.abs(list.width - 320)).toBeLessThanOrEqual(1);
  expect(list.x + list.width).toBeLessThanOrEqual(graph.x + 1);
  expectOrder(await names(page, "kc-list-region"), TOOLBAR);
  expectOrder(await names(page, "kc-graph-region"), GRAPH);
  for (const p of GRAPH) {
    const b = (await page
      .locator("#calc .kc-graph-region")
      .getByRole("button", { name: p })
      .boundingBox())!;
    expect([b.x >= graph.x + graph.width / 2, b.y <= graph.y + graph.height / 2]).toEqual([
      true,
      true,
    ]);
  }
  expect((await names(page, "kc-graph-region")).some((n) => /^home$/i.test(n))).toBe(false); // 08's Home control
  await page.getByRole("img", { name: /^Graph from/ }).press("ArrowRight");
  await expect(page.getByRole("button", { name: /^home$/i })).toBeVisible();
  await page.evaluate(() => globalThis.__shell!.resizeFrame(600, 600));
  await expect.poll(async () => Math.round((await box(page, "kc-list-region")).width)).toBe(260);
});
test("L-2 stacked: graph, toolbar, list, then keypad; the graph keeps 40% of the height with the keypad closed", async ({
  page,
}) => {
  await openShell(page, "?w=400&h=700");
  const host = (await page.locator("#calc").boundingBox())!; // clamped on phones (R5)
  const [graph, list] = [await box(page, "kc-graph-region"), await box(page, "kc-list-region")];
  expect(graph.y + graph.height).toBeLessThanOrEqual(list.y + 1);
  expect(graph.height).toBeGreaterThanOrEqual(0.4 * host.height - 1);
  expectOrder(await names(page, "kc-list-region"), [TOOLBAR[0], /keypad/i, ...TOOLBAR.slice(1)]);
  expectOrder(await names(page, "kc-graph-region"), GRAPH);
  await api(page, "c.updateSettings({ keypad: true })");
  const keypad = (await page.getByRole("region", { name: "Keypad" }).boundingBox())!;
  const listNow = await box(page, "kc-list-region");
  expect(keypad.y).toBeGreaterThanOrEqual(listNow.y + listNow.height - 1);
});
test("L-8 the layout follows the container width, not the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openShell(page, `?w=800&h=600&rows=${enc(["y=x", "1+1"])}`);
  const layout = page.locator("#calc [data-kc-layout]");
  for (const [w, l] of [
    [461, "stacked"],
    [560, "desktop"],
  ] as const) {
    await page.evaluate((x) => globalThis.__shell!.resizeFrame(x, 600), w);
    await expect(layout).toHaveAttribute("data-kc-layout", l);
    const [list, graph] = [await box(page, "kc-list-region"), await box(page, "kc-graph-region")];
    expect(
      l === "stacked" ? graph.y + graph.height <= list.y + 1 : list.x + list.width <= graph.x + 1,
      `${w}`
    ).toBe(true);
  } // stacked: graph above the list; desktop: list left of it
  expect((await rows(page)).map((r) => r.latex)).toEqual(["y=x", "1+1"]);
});
test("AR-60 destroying the quiz handle terminates the calculator's worker", async ({ page }) => {
  await openShell(page);
  const workers = () => page.evaluate(() => globalThis.__karmanCalculatorCounters?.workers ?? 0);
  await expect.poll(workers).toBeGreaterThan(0);
  const before = await workers();
  await api(page, "globalThis.__shell.handle.destroy()");
  await expect.poll(workers).toBe(before - 1);
}); // 07 bumps "workers" down on terminate
test("L-14 no horizontal scroll from 320×568 to 1920×1080; keypad and toolbar never cover the focused row in either order; a popover never does", async ({
  page,
}) => {
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [390, 844],
    [844, 390],
    [768, 1024],
    [1024, 768],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    for (const steps of [
      ['c.updateSettings({ keypad: true }); c.focusExpression("15")'],
      ['c.focusExpression("15")', "c.updateSettings({ keypad: true })"],
    ]) {
      await openShell(page, `?rows=${enc(Array.from({ length: 15 }, (_, i) => `y=${i + 1}x`))}`); // keypad then focus in one tick; focus, then keypad
      for (const script of steps) {
        await api(page, script);
        await frames(page, 3);
      }
      const m = await page.evaluate(measureL14),
        at = `${width}x${height} ${steps.length}`;
      // measureL14 → { pageOverflow: scrollWidth − innerWidth (min 0); wide: shadow elements that scroll sideways or pass the host's right edge;
      //               row: rect of row 15; toolbarBottom: Add item button bottom; keypadTop: Keypad region top }
      expect([m.pageOverflow, m.wide], at).toEqual([0, []]);
      expect([m.row.top >= m.toolbarBottom - 0.5, m.row.bottom <= m.keypadTop + 0.5], at).toEqual([
        true,
        true,
      ]);
    }
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await openShell(page, `?rows=${enc(["y=x", "1"])}`); // stacked: the popover can reach the list
  await page.getByRole("button", { name: "Graph settings" }).click();
  await expect(page.locator(".kc-settings[role=dialog]")).toBeVisible();
  await api(page, 'c.focusExpression("1")');
  await expect.poll(() => page.evaluate(popoverCoversRow1)).toBe(false);
}); // .kc-settings[role=dialog] rect vs row 1
