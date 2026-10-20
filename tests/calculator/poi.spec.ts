// Points of interest, coordinate labels and tracing in a real calculator, as Desmos does them
// (POI-TRACE-*), on the harness page /harness/calculator.html.

import { expect, test, type Page } from "@playwright/test";
import { enc, openShell, rowField, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const ROWS = enc(["y=x^{2}-2", "y=3"]);

/** Page coordinates of the world point (x, y) on the graph. */
async function at(page: Page, x: number, y: number): Promise<[number, number]> {
  const box = (await page.locator("#calc [data-graph-layers]").boundingBox())!;
  const view = await page.evaluate(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().view!
  );
  const { left, right, bottom, top } = view.viewport;
  // Whole pixels: WebKit truncates a fractional pointer position (180.99999 becomes 180).
  return [
    Math.round(box.x + ((x - left) / (right - left)) * view.size.width),
    Math.round(box.y + ((top - y) / (top - bottom)) * view.size.height),
  ];
}

const snapshot = (page: Page) =>
  page.evaluate(() => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return { selected: s.selectedRowId, points: s.poi?.points.length ?? 0, left: s.viewport.left };
  });
const labels = (page: Page) => page.locator("#calc [data-poi-label]");
const labelTexts = (page: Page) =>
  labels(page).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));

async function selectRow1(page: Page): Promise<void> {
  await openShell(page, `?w=900&h=600&rows=${ROWS}`);
  await rowField(page, "1").click();
  await page.waitForFunction(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().poi?.points.length === 5
  );
}

async function clickAt(page: Page, isMobile: boolean, x: number, y: number): Promise<void> {
  const [px, py] = await at(page, x, y);
  if (isMobile) await page.touchscreen.tap(px, py);
  else await page.mouse.click(px, py);
}

test("POI-TRACE-1 focusing y=x^2-2 shows its grey dots and none for other rows", async ({
  page,
}) => {
  await selectRow1(page);
  expect(await snapshot(page)).toMatchObject({ selected: "1", points: 5 }); // two zeros, the vertex and two intersections;
  await rowField(page, "2").click();
  await page.waitForFunction(() => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return s.selectedRowId === "2" && s.poi?.rowId === "2";
  });
  // y=3 has its y-intercept and its two intersections with the parabola.
  await expect.poll(async () => (await snapshot(page)).points).toBe(3);
});

test("POI-TRACE-13 pressing a dot opens (1.41421, 0) and empty paper closes it", async ({
  page,
  isMobile,
}) => {
  await selectRow1(page);
  await clickAt(page, isMobile, Math.SQRT2, 0);
  await expect.poll(() => labelTexts(page)).toEqual(["(1.41421, 0)"]);
  await clickAt(page, isMobile, 0, -2);
  await expect.poll(() => labelTexts(page)).toEqual(["(1.41421, 0)", "(0, −2)"]);
  await clickAt(page, isMobile, -6, -5);
  await expect(labels(page)).toHaveCount(0);
  expect((await snapshot(page)).selected).toBeNull();
});

test("POI-TRACE-21 pressing on y=x^2-2 traces at once without snapping; release removes it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the press-and-drag trace is driven with a mouse here");
  await selectRow1(page);
  const before = (await snapshot(page)).left;
  await page.mouse.move(...(await at(page, -2.5, 4.25)));
  await page.mouse.down();
  const trace = page.locator("#calc [data-trace-label]");
  await expect(trace).toHaveAttribute("aria-label", "(−2.5, 4.25)");
  await page.mouse.move(...(await at(page, 0, 6)), { steps: 4 });
  await expect(trace).toHaveAttribute("aria-label", "(0, −2)"); // only x follows the pointer
  await page.mouse.up();
  await expect(trace).toHaveCount(0);
  await expect(labels(page)).toHaveCount(0);
  expect((await snapshot(page)).left).toBe(before);
});

test("POI-TRACE-12 hovering a dot shows its label; leaving hides it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "hover needs a mouse");
  await selectRow1(page);
  const [x, y] = await at(page, 0, -2);
  await page.mouse.move(x, y + 12);
  await expect.poll(() => labelTexts(page)).toEqual(["(0, −2)"]);
  await page.mouse.move(x, y + 40);
  await expect(labels(page)).toHaveCount(0);
});

test("POI-TRACE-18 the export button appends the point as a new row", async ({
  page,
  isMobile,
}) => {
  await selectRow1(page);
  await clickAt(page, isMobile, Math.SQRT2, 0);
  const button = page.locator("#calc").getByRole("button", {
    name: "Export point to expression list",
  });
  await button.click();
  await expect(labels(page)).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().rows.at(-1)?.latex)
    )
    .toBe("\\left(1.41421,\\ 0\\right)");
});

test("POI-TRACE-14 a press in the expression list closes open labels", async ({
  page,
  isMobile,
}) => {
  await selectRow1(page);
  await clickAt(page, isMobile, Math.SQRT2, 0);
  await expect(labels(page)).toHaveCount(1);
  await rowField(page, "2").click();
  await expect(labels(page)).toHaveCount(0);
});

test("POI-TRACE-27 pressing a curve selects its row", async ({ page, isMobile }) => {
  await selectRow1(page);
  await clickAt(page, isMobile, -6, 3);
  await expect.poll(async () => (await snapshot(page)).selected).toBe("2");
});

test("POI-TRACE-15 zooming keeps the selection, closes labels and recomputes dots", async ({
  page,
  isMobile,
}) => {
  await selectRow1(page);
  await clickAt(page, isMobile, Math.SQRT2, 0);
  await expect(labels(page)).toHaveCount(1);
  if (isMobile) {
    // RS: a phone-sized touch calculator has no zoom buttons, so zoom in by the same factor
    await page.evaluate(() => {
      const e = globalThis.__calculatorHarness!.engine;
      const v = e.getSnapshot().viewport;
      const [cx, cy] = [(v.left + v.right) / 2, (v.bottom + v.top) / 2];
      const [hw, hh] = [(v.right - v.left) / 4, (v.top - v.bottom) / 4];
      e.setMathBounds({ left: cx - hw, right: cx + hw, bottom: cy - hh, top: cy + hh });
    });
  } else await page.locator("#calc").getByRole("button", { name: "Zoom in" }).click();
  await expect(labels(page)).toHaveCount(0);
  await page.waitForFunction(() => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return s.viewport.left === -5 && s.poi?.points.length === 5;
  });
  expect((await snapshot(page)).selected).toBe("1");
});
