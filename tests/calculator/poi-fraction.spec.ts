// The decimal/fraction toggle on coordinate labels (owner decision, 2026-10-21): a grey point of
// interest's label or a plotted point's label gets the rows' toggle when a coordinate is a clean
// rational (q ≤ 100, within 1e-9·max(1, |x|)) and not whole. On, those coordinates show as
// improper fractions and the export button exports them so. Mouse, finger, keyboard and a dark
// skin, on the harness page /harness/calculator.html.

import { expect, test, type Page } from "@playwright/test";
import { enc, openShell, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const DECIMAL = "Displaying as decimal. Press Enter to display as Fraction";
const FRACTION = "Displaying as fraction. Press Enter to display as Decimal";

/** Page coordinates of the world point (x, y) on the graph. */
async function at(page: Page, x: number, y: number): Promise<[number, number]> {
  const box = (await page.locator("#calc [data-graph-layers]").boundingBox())!;
  const view = await page.evaluate(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().view!
  );
  const { left, right, bottom, top } = view.viewport;
  return [
    Math.round(box.x + ((x - left) / (right - left)) * view.size.width),
    Math.round(box.y + ((top - y) / (top - bottom)) * view.size.height),
  ];
}

/** A press and release on the graph: the mouse, or touch pointer events on a phone. */
async function tap(page: Page, isMobile: boolean, [x, y]: [number, number]): Promise<void> {
  if (!isMobile) {
    await page.mouse.click(x, y);
    return;
  }
  await page.evaluate(
    ([x, y]) => {
      const root = document.querySelector("#calc")!.shadowRoot!;
      const panel = root.querySelector<HTMLElement>("[data-graph-panel]")!;
      const target = root.elementFromPoint(x, y) ?? panel;
      for (const [kind, el, buttons] of [
        ["pointerdown", target, 1],
        ["pointerup", panel, 0],
      ] as const) {
        el.dispatchEvent(
          new PointerEvent(kind, {
            pointerId: 1,
            pointerType: "touch",
            isPrimary: true,
            button: 0,
            buttons,
            clientX: x,
            clientY: y,
            bubbles: true,
            composed: true,
          })
        );
      }
    },
    [x, y] as const
  );
}

const labels = (page: Page) =>
  page.locator("#calc [data-poi-label]").evaluateAll((els) => els.map((e) => e.ariaLabel));
const toggle = (page: Page) => page.locator("#calc .kc-poi-fraction");
const rowLatex = (page: Page) =>
  page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.getSnapshot().rows.map((r) => r.latex)
  );
const plotted = (page: Page, id: string) =>
  page.waitForFunction((id) => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return s.view !== null && s.geometry.get(id) !== undefined;
  }, id);
const pointsOfInterest = (page: Page) =>
  page.evaluate(() => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return s.poi?.rowId === s.selectedRowId ? (s.poi?.points.length ?? 0) : 0;
  });

/** y=3x−1 selected, its zero (1/3, 0) labelled. */
async function openThird(page: Page, isMobile: boolean): Promise<void> {
  await openShell(page, `?rows=${enc(["y=3x-1"])}`);
  await plotted(page, "1");
  await tap(page, isMobile, await at(page, 2, 5)); // the curve: selects it
  await expect.poll(() => pointsOfInterest(page)).toBeGreaterThan(0);
  await tap(page, isMobile, await at(page, 1 / 3, 0));
  await expect.poll(() => labels(page)).toEqual(["(0.33333, 0)"]);
}

test("a root at 1/3 gets the toggle; on, it reads 1/3 and exports \\frac{1}{3}", async ({
  page,
  isMobile,
}) => {
  await openThird(page, isMobile);
  await expect(toggle(page)).toHaveAttribute("aria-label", DECIMAL);
  const label = page.locator("#calc [data-poi-label]");
  const before = (await label.boundingBox())!;
  if (isMobile) await toggle(page).tap();
  else await toggle(page).click();
  await expect.poll(() => labels(page)).toEqual(["(1/3, 0)"]);
  await expect(toggle(page)).toHaveAttribute("aria-label", FRACTION);
  await expect(toggle(page)).toHaveAttribute("data-on", "true");
  // The fraction is stacked, so the box grows taller and stays inside the graph.
  const after = (await label.boundingBox())!;
  expect(after.height).toBeGreaterThan(before.height + 10);
  const graph = (await page.locator("#calc [data-graph-layers]").boundingBox())!;
  expect(after.x).toBeGreaterThanOrEqual(graph.x);
  expect(after.x + after.width).toBeLessThanOrEqual(graph.x + graph.width + 0.5);
  // The phone's target is at least 44 px tall.
  if (isMobile) {
    const hit = await toggle(page).evaluate((b) => {
      const r = b.getBoundingClientRect();
      const s = getComputedStyle(b, "::before");
      return r.height - 2 * parseFloat(s.top);
    });
    expect(hit).toBeGreaterThanOrEqual(44);
  }
  const exportButton = page.locator("#calc .kc-poi-export");
  if (isMobile) await exportButton.tap();
  else await exportButton.click();
  await expect.poll(() => rowLatex(page)).toEqual(["y=3x-1", "\\left(\\frac{1}{3},\\ 0\\right)"]);
});

test("integers only and irrational points get no toggle", async ({ page, isMobile }) => {
  await openShell(page, `?rows=${enc(["y=x^{2}-2", "(2,-4)"])}`);
  await plotted(page, "1");
  await tap(page, isMobile, await at(page, 2, -4)); // a plotted point with whole coordinates
  await expect.poll(() => labels(page)).toEqual(["(2, −4)"]);
  await tap(page, isMobile, await at(page, 2, 2)); // the parabola: selects it
  await expect.poll(() => pointsOfInterest(page)).toBeGreaterThan(0);
  await tap(page, isMobile, await at(page, Math.SQRT2, 0));
  await tap(page, isMobile, await at(page, 0, -2));
  // The plotted point's label stays open: pressing a curve keeps labels (POI-LIVE-3).
  await expect.poll(() => labels(page)).toEqual(["(2, −4)", "(1.41421, 0)", "(0, −2)"]);
  await expect(toggle(page)).toHaveCount(0);
});

test("a plotted point's label converts its rational coordinate and keeps the other decimal", async ({
  page,
  isMobile,
}) => {
  await openShell(page, `?rows=${enc(["(2.5,\\sqrt{2})"])}`);
  await plotted(page, "1");
  await tap(page, isMobile, await at(page, 2.5, Math.SQRT2));
  await expect.poll(() => labels(page)).toEqual(["(2.5, 1.41421)"]);
  await expect(page.locator("#calc .kc-poi-export")).toHaveCount(0);
  if (isMobile) await toggle(page).tap();
  else await toggle(page).click();
  await expect.poll(() => labels(page)).toEqual(["(5/2, 1.41421)"]);
});

test("keyboard: Tab reaches the toggle, Enter and Space switch it, focus stays", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "keyboard on desktop");
  await openThird(page, false);
  await toggle(page).focus();
  await expect(toggle(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => labels(page)).toEqual(["(1/3, 0)"]);
  await expect(toggle(page)).toBeFocused();
  await expect(toggle(page)).toHaveAttribute("aria-label", FRACTION);
  await page.keyboard.press("Space");
  await expect.poll(() => labels(page)).toEqual(["(0.33333, 0)"]);
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(toggle(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#calc .kc-poi-export")).toBeFocused();
});

test("a dark skin: the toggle draws in the skin's ink, filled when on", async ({
  page,
  isMobile,
}) => {
  await openThird(page, isMobile);
  await page.evaluate(() => (document.documentElement.dataset.theme = "observatory"));
  const look = () =>
    toggle(page).evaluate((b) => {
      const s = getComputedStyle(b);
      const paper = getComputedStyle(b.closest(".kc-poi-label")!).backgroundColor;
      return { border: s.borderTopColor, bg: s.backgroundColor, glyph: s.color, paper };
    });
  await expect.poll(async () => (await look()).paper).not.toBe("rgb(255, 255, 255)");
  const off = await look();
  expect(off.bg).toBe("rgba(0, 0, 0, 0)");
  expect(off.border).toBe(off.glyph);
  if (isMobile) await toggle(page).tap();
  else await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("data-on", "true");
  const on = await look();
  expect(on.bg).toBe(off.border); // filled with the ink
  expect(on.glyph).toBe(on.paper); // the glyph takes the paper
});
