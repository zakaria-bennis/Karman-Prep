// Points of interest, coordinate labels and trace as a student meets them, matched against the
// reference calculator on 2026-10-20 (REA evidence ev_4dcff19f…, ev_78d6a22b…, ev_0663d848…,
// ev_6a8c7d3f…; POI-LIVE-*): nothing is selected first, the graph is pressed with a mouse or a
// finger, and a table regression's fitted curve, a typed regression and plotted points get the same
// treatment as y=f(x) rows. On the harness page /harness/calculator.html, desktop and touch.

import { expect, test, type Page } from "@playwright/test";
import { at, Finger } from "./graph-touch";
import { enc, openShell, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const state = (page: Page) =>
  page.evaluate(() => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return {
      selected: s.selectedRowId,
      points: (s.poi?.rowId === s.selectedRowId ? (s.poi?.points ?? []) : []).map((p) => [
        Number(p.x.toFixed(3)) + 0, // + 0 turns −0 into 0
        Number(p.y.toFixed(3)) + 0,
      ]),
      left: s.viewport.left,
    };
  });
/** Waits until row `id` has geometry for the current view. */
const plotted = (page: Page, id: string) =>
  page.waitForFunction((id) => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return s.view !== null && s.geometry.get(id) !== undefined;
  }, id);
const labels = (page: Page) =>
  page
    .locator("#calc [data-poi-label]")
    .evaluateAll((els) =>
      els.map((e) => `${e.getAttribute("aria-label")}${e.hasAttribute("data-plotted") ? " *" : ""}`)
    );
/** The (x, y) a label reads, as numbers. */
const onCurve = (label: string | null): [number, number] => {
  const [x, y] = (label ?? "").replace(/[()]/g, "").replace(/−/g, "-").split(", ").map(Number);
  return [x, y];
};
const traceLabel = (page: Page) => page.locator("#calc [data-trace-label]");

test.describe("POI-LIVE", () => {
  let finger: Finger;
  test.beforeEach(({ page, isMobile, browserName }) => {
    finger = new Finger(page, isMobile, browserName);
  });

  test("POI-LIVE-7 pressing y=x^2-4 on the graph selects it, shows its grey dots, and traces with a live label", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc(["y=x^{2}-4"])}`);
    await plotted(page, "1");
    expect(await state(page)).toMatchObject({ selected: null, points: [] }); // nothing selected
    const before = (await state(page)).left;
    await finger.down(await at(page, 3, 5));
    await expect(traceLabel(page)).toHaveAttribute("aria-label", "(3, 5)");
    await expect
      .poll(async () => (await state(page)).points)
      .toEqual([
        [-2, 0],
        [0, -4],
        [2, 0],
      ]);
    // Dragging along the curve: the label follows; off the curve, only x follows the finger.
    for (const x of [2.5, 2, 1.5, 1]) await finger.move(await at(page, x, x * x - 4));
    await expect(traceLabel(page)).toHaveAttribute("aria-label", "(1, −3)");
    const [, offY] = await at(page, 0, 3);
    await finger.move([(await at(page, 0.5, 0))[0], offY]);
    // The dot stays on the curve: its label reads (x, x²−4).
    const [lx, ly] = (await traceLabel(page).getAttribute("aria-label"))!
      .replace(/[()]/g, "")
      .replace(/−/g, "-")
      .split(", ")
      .map(Number);
    expect(ly).toBeCloseTo(lx * lx - 4, 3);
    await finger.up();
    await expect(traceLabel(page)).toHaveCount(0);
    expect(await labels(page)).toEqual([]); // release opens nothing
    expect((await state(page)).left).toBe(before); // the trace never panned
    expect((await state(page)).selected).toBe("1"); // the dots stay
  });

  test("POI-LIVE-8 pressing a grey dot opens its coordinates; several open; again closes; blank paper closes all", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc(["y=x^{2}-4", "y=2x+1"])}`);
    await plotted(page, "1");
    await finger.tap(await at(page, 3, 5)); // select by pressing the curve
    // Zeros, vertex and the intersections in view (a phone's shorter view drops (3.449, 7.899)).
    await expect.poll(async () => (await state(page)).points).toContainEqual([-1.449, -1.899]);
    await finger.tap(await at(page, 2, 0));
    await expect.poll(() => labels(page)).toEqual(["(2, 0)"]);
    await finger.tap(await at(page, -1.449, -1.899)); // the intersection with y=2x+1
    await expect.poll(() => labels(page)).toEqual(["(2, 0)", "(−1.44949, −1.89898)"]);
    await finger.tap(await at(page, 2, 0));
    await expect.poll(() => labels(page)).toEqual(["(−1.44949, −1.89898)"]);
    await finger.tap(await at(page, -7, -6));
    await expect.poll(() => labels(page)).toEqual([]);
    expect((await state(page)).selected).toBeNull();
  });

  test("POI-LIVE-6 a table regression's fitted curve gets its dots and traces", async ({
    page,
  }) => {
    await openShell(page);
    await page.evaluate(() =>
      globalThis.__calculatorHarness!.engine.setExpression({
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: ["1", "2", "3", "4"] },
          { latex: "y_{1}", values: ["2", "3", "5", "4"] },
        ],
      })
    );
    await page.locator("#calc").getByRole("button", { name: "Add Regression" }).click();
    // y = 0.8x + 1.5: its zero and y-intercept, as the reference marks them.
    await expect
      .poll(async () => (await state(page)).points)
      .toEqual([
        [-1.875, 0],
        [0, 1.5],
      ]);
    await finger.tap(await at(page, -7, -6)); // deselect
    await expect.poll(async () => (await state(page)).selected).toBeNull();
    await finger.down(await at(page, -5, -2.5));
    await expect(traceLabel(page)).toHaveAttribute("aria-label", "(−5, −2.5)");
    await expect.poll(async () => (await state(page)).selected).toBe("t");
    await finger.move(await at(page, -1, 0.7));
    await expect(traceLabel(page)).toHaveAttribute("aria-label", "(−1, 0.7)");
    await finger.up();
    await expect(traceLabel(page)).toHaveCount(0);
    await finger.tap(await at(page, 0, 1.5));
    await expect.poll(() => labels(page)).toEqual(["(0, 1.5)"]);
  });

  test("POI-LIVE-1 pressing a table's point opens its coordinates without selecting the table", async ({
    page,
  }) => {
    await openShell(page);
    await page.evaluate(() =>
      globalThis.__calculatorHarness!.engine.setExpression({
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: ["1", "2", "3"] },
          { latex: "y_{1}", values: ["2", "3", "5"] },
        ],
      })
    );
    await page.waitForFunction(
      () => globalThis.__calculatorHarness!.engine.getSnapshot().geometry.get("t") !== undefined
    );
    await finger.tap(await at(page, 3, 5));
    await expect.poll(() => labels(page)).toEqual(["(3, 5) *"]);
    await finger.tap(await at(page, 1, 2));
    await expect.poll(() => labels(page)).toEqual(["(3, 5) *", "(1, 2) *"]);
    expect((await state(page)).selected).toBeNull();
    await expect(page.locator("#calc .kc-poi-export")).toHaveCount(0);
    await finger.tap(await at(page, 3, 5));
    await expect.poll(() => labels(page)).toEqual(["(1, 2) *"]);
  });

  test("POI-LIVE-9 a typed regression y_1~mx_1+b on lists gets its y-intercept dot", async ({
    page,
  }) => {
    await openShell(
      page,
      `?rows=${enc(["x_{1}=[12,25,325]", "y_{1}=[3,5,10]", "y_{1}\\sim mx_{1}+b"])}`
    );
    await plotted(page, "3");
    await page.evaluate(() => globalThis.__calculatorHarness!.engine.setSelectedRow("3"));
    await expect.poll(async () => (await state(page)).points).toEqual([[0, 3.616]]);
    await finger.tap(await at(page, 0, 3.61602));
    await expect.poll(() => labels(page)).toEqual(["(0, 3.61602)"]);
  });

  test("POI-LIVE-5 a second finger while one traces neither pinches nor ends the trace", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "two fingers need touch");
    await openShell(page, `?rows=${enc(["y=x^{2}-4"])}`);
    await plotted(page, "1");
    const before = (await state(page)).left;
    await finger.down(await at(page, 3, 5));
    await expect(traceLabel(page)).toHaveAttribute("aria-label", "(3, 5)");
    // A second finger lands and spreads; the first keeps tracing.
    const second = await at(page, -4, -6);
    await page.evaluate(([x, y]) => {
      const panel = document
        .querySelector("#calc")!
        .shadowRoot!.querySelector<HTMLElement>("[data-graph-panel]")!;
      for (const [kind, dx] of [
        ["pointerdown", 0],
        ["pointermove", -60],
      ] as const)
        panel.dispatchEvent(
          new PointerEvent(kind, {
            pointerId: 99,
            pointerType: "touch",
            button: 0,
            buttons: 1,
            clientX: x + dx,
            clientY: y,
            bubbles: true,
            composed: true,
          })
        );
    }, second);
    await finger.move(await at(page, 1, -3));
    await expect(traceLabel(page)).toHaveAttribute("aria-label", "(1, −3)");
    expect((await state(page)).left).toBe(before);
    await finger.up();
  });

  test("POI-LIVE-10 dragged off a straight line, the trace goes to the line's nearest point", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc(["y=2x+1"])}`);
    await plotted(page, "1");
    await finger.down(await at(page, -2, -3));
    await expect(traceLabel(page)).toHaveAttribute("aria-label", "(−2, −3)");
    await finger.move(await at(page, 1.5, -6));
    // The foot of the perpendicular from (1.5, −6) in screen px (the axes' scales may differ).
    const foot = await page.evaluate(() => {
      const s = globalThis.__calculatorHarness!.engine.getSnapshot();
      const { left, right, bottom, top } = s.viewport;
      const kx = s.view!.size.width / (right - left),
        ky = s.view!.size.height / (top - bottom);
      return (kx * kx * 1.5 - 2 * ky * ky * 7) / (kx * kx + 4 * ky * ky);
    });
    await expect
      .poll(async () => {
        const [x, y] = onCurve(await traceLabel(page).getAttribute("aria-label"));
        return Math.abs(x - foot) < 0.05 && Math.abs(y - (2 * x + 1)) < 1e-9;
      })
      .toBe(true);
    await finger.up();
  });

  test("POI-LIVE-9 past a restricted curve's end the trace shows nothing until the pointer comes back", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc(["y=x^{2}\\left\\{-1<x<2\\right\\}"])}`);
    await plotted(page, "1");
    await finger.down(await at(page, 0.5, 0.25));
    await expect(traceLabel(page)).toHaveAttribute("aria-label", "(0.5, 0.25)");
    await finger.move(await at(page, 2.6, 6));
    await expect(traceLabel(page)).toHaveCount(0);
    await finger.move(await at(page, 1, 1));
    await expect(traceLabel(page)).toHaveAttribute("aria-label", "(1, 1)");
    await finger.up();
  });

  test("POI-LIVE-12 the wheel zooms under a held trace and the trace follows the new view", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "a wheel needs a mouse");
    await openShell(page, `?rows=${enc(["y=x^{2}-4"])}`);
    await plotted(page, "1");
    const before = (await state(page)).left;
    await finger.down(await at(page, 3, 5));
    await expect(traceLabel(page)).toHaveAttribute("aria-label", "(3, 5)");
    for (let k = 0; k < 6; k++) await page.mouse.wheel(0, -60);
    await expect.poll(async () => (await state(page)).left).toBeGreaterThan(before);
    const [x, y] = onCurve(await traceLabel(page).getAttribute("aria-label"));
    expect(y).toBeCloseTo(x * x - 4, 6);
    await finger.up();
  });
});
