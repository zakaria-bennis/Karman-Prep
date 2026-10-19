// Points of interest, coordinate labels and tracing in a real calculator (02 Task 9 of the parity
// plan): POI-1, POI-9, POI-13, POI-14 and POI-17 on the harness page /v2/calculator.html.

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
  return [
    box.x + ((x - left) / (right - left)) * view.size.width,
    box.y + ((top - y) / (top - bottom)) * view.size.height,
  ];
}

const snapshot = (page: Page) =>
  page.evaluate(() => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return { selected: s.selectedRowId, points: s.poi?.points.length ?? 0, left: s.viewport.left };
  });
const labels = (page: Page) => page.locator("#calc [data-poi-label]");

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

test("POI-1 focusing y=x^2-2 shows its grey dots and none for other rows", async ({ page }) => {
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

test("POI-13 clicking a dot opens (1.41421, 0) and empty paper closes it", async ({
  page,
  isMobile,
}) => {
  await selectRow1(page);
  await clickAt(page, isMobile, Math.SQRT2, 0);
  await expect(labels(page)).toHaveText(["(1.41421, 0)"]);
  await clickAt(page, isMobile, 0, -2);
  await expect(labels(page)).toHaveText(["(1.41421, 0)", "(0, −2)"]);
  await clickAt(page, isMobile, -6, -5);
  await expect(labels(page)).toHaveCount(0);
  expect((await snapshot(page)).selected).toBeNull();
});

test("POI-14 dragging along y=x^2 shows a live label and releasing removes it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "the press-and-drag trace is driven with a mouse here");
  await selectRow1(page);
  const before = (await snapshot(page)).left;
  await page.mouse.move(...(await at(page, 2, 2)));
  await page.mouse.down();
  await page.mouse.move(...(await at(page, 2.25, 3)), { steps: 4 });
  await page.mouse.move(...(await at(page, 2.5, 4)), { steps: 4 });
  const trace = page.locator("#calc [data-trace-label]");
  await expect(trace).toHaveText("(2.5, 4.25)");
  await page.mouse.up();
  await expect(trace).toHaveCount(0);
  await expect(labels(page)).toHaveCount(0);
  expect((await snapshot(page)).left).toBe(before);
});

test("POI-17 clicking a curve selects its row", async ({ page, isMobile }) => {
  await selectRow1(page);
  await clickAt(page, isMobile, -6, 3);
  await expect.poll(async () => (await snapshot(page)).selected).toBe("2");
});

test("POI-9 zooming keeps the selection, closes labels and recomputes dots", async ({
  page,
  isMobile,
}) => {
  await selectRow1(page);
  await clickAt(page, isMobile, Math.SQRT2, 0);
  await expect(labels(page)).toHaveCount(1);
  await page.locator("#calc").getByRole("button", { name: "Zoom in" }).click();
  await expect(labels(page)).toHaveCount(0);
  await page.waitForFunction(() => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return s.viewport.left === -5 && s.poi?.points.length === 5;
  });
  expect((await snapshot(page)).selected).toBe("1");
});
