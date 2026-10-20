// Points of interest checked side by side against live Desmos (POI-TRACE-*, GP-37, GP-38): each
// expectation below is what Desmos showed for the same rows, view and pointer.

import { expect, test, type Page } from "@playwright/test";
import { enc, openShell, rowField, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

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

const points = (page: Page) =>
  page.evaluate(() => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return (s.poi?.points ?? []).map((p) => [Math.round(p.x * 1e5) / 1e5, p.kinds.join("+")]);
  });
const labels = (page: Page) => page.locator("#calc [data-poi-label]");

// The live comparison's layout: a 1440×900 window whose calculator is 1440×854 (graph 992×854).
test.use({ viewport: { width: 1440, height: 900 } });
const FRAME = "?w=1440&h=854";

async function select(page: Page, rows: string[], query = FRAME): Promise<void> {
  await openShell(page, `${query}&rows=${enc(rows)}`);
  await rowField(page, "1").click();
  await page.waitForFunction(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().poi?.rowId === "1"
  );
}

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "pointer positions and hover are checked with a mouse");
});

test("POI-TRACE-6 floor's steps break the curve: zeros at (0, 0) and (1, 0), no extrema", async ({
  page,
}) => {
  await select(page, ["y=\\operatorname{floor}(x)"]);
  await expect
    .poll(() => points(page))
    .toEqual([
      [0, "zero+intercept"],
      [1, "zero"],
    ]);
});

test("GP-37, GP-38 the √2 label sits above right of its dot, 42.27 px tall; the vertex's below right", async ({
  page,
}) => {
  await select(page, ["y=x^{2}-2"]);
  const [x, y] = await at(page, Math.SQRT2, 0);
  await page.mouse.click(x, y);
  const label = labels(page).first();
  await expect(label).toHaveAttribute("data-orientation", "tr");
  const box = (await label.boundingBox())!;
  expect(box.x - x).toBeCloseTo(5, 0);
  expect(y - (box.y + box.height)).toBeCloseTo(5, 0);
  expect(box.height).toBeCloseTo(42.27, 1);
  // As on Desmos, opened in this order: (−√2, 0) above left, (0, −2) below right.
  await page.mouse.click(...(await at(page, -Math.SQRT2, 0)));
  await page.mouse.click(...(await at(page, 0, -2)));
  const orientation = (name: string) =>
    page.locator(`#calc [data-poi-label][aria-label="${name}"]`).getAttribute("data-orientation");
  await expect.poll(() => orientation("(−1.41421, 0)")).toBe("tl");
  await expect.poll(() => orientation("(0, −2)")).toBe("br");
  // The first label keeps its spot when another opens.
  await expect(label).toHaveAttribute("data-orientation", "tr");
});

test("POI-TRACE-12 a dot's label shows 12 px away even with float32 pointer coordinates", async ({
  page,
}) => {
  await select(page, ["y=x^{2}-2"]);
  const [x, y] = await at(page, 0, -2);
  await page.mouse.move(x, y + 12);
  await expect(labels(page)).toHaveCount(1);
  await page.mouse.move(x, y + 13);
  await expect(labels(page)).toHaveCount(0);
});

test("POI-TRACE-21 a press 10 px below the vertex traces; 11 px pans", async ({ page }) => {
  await select(page, ["y=x^{2}-2"]);
  await page.mouse.click(...(await at(page, -6, -5))); // deselect
  const [x, y] = await at(page, 0, -2);
  await page.mouse.move(x, y + 10);
  await page.mouse.down();
  await expect(page.locator("#calc [data-trace-label]")).toHaveAttribute("aria-label", "(0, −2)");
  await page.mouse.up();
  await page.mouse.move(x, y + 11);
  await page.mouse.down();
  await expect(page.locator("#calc [data-trace-label]")).toHaveCount(0);
  await page.mouse.up();
});

test("POI-TRACE-19 at a 2×10⁻⁵ wide view the zero of x²−2 reads its rounding noise", async ({
  page,
}) => {
  await openShell(page, `${FRAME}&rows=${enc(["y=x^{2}-2"])}`);
  await page.evaluate(() => {
    const r = Math.SQRT2;
    globalThis.__calculatorHarness!.engine.setMathBounds({
      left: r - 1e-5,
      right: r + 1e-5,
      bottom: -9e-6,
      top: 9e-6,
    });
  });
  await rowField(page, "1").click();
  await page.waitForFunction(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().poi?.points.length === 1
  );
  await page.mouse.click(...(await at(page, Math.SQRT2, 0)));
  await expect(labels(page)).toHaveAttribute("aria-label", "(1.414214, −4.44089×10^−16)");
});

test("POI-TRACE-2 pointsOfInterest off hides dots but traces; trace off selects only", async ({
  page,
}) => {
  await select(page, ["y=x^{2}-2"]);
  const off = (s: Record<string, boolean>) =>
    page.evaluate((s) => globalThis.__calculatorHarness!.engine.updateSettings(s), s);
  await off({ pointsOfInterest: false });
  const [x, y] = await at(page, -2.5, 4.25);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(page.locator("#calc [data-trace-label]")).toHaveAttribute(
    "aria-label",
    "(−2.5, 4.25)"
  );
  await page.mouse.up();
  await page.mouse.click(...(await at(page, Math.SQRT2, 0)));
  await expect(labels(page)).toHaveCount(0);
  await off({ pointsOfInterest: true, trace: false });
  await page.mouse.click(...(await at(page, -6, -5))); // deselect
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(page.locator("#calc [data-trace-label]")).toHaveCount(0);
  await page.mouse.up();
  expect(
    await page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().selectedRowId)
  ).toBe("1");
});
