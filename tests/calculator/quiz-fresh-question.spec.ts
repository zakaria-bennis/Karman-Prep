// Owner decision, 2026-10-21: each new question gets a clean calculator (no rows, sliders or
// tables, the default view, closed labels, an empty undo history, the keypad on its main page),
// while the student's settings, the window's place and size and the open state carry over; the
// settings that describe a question's graph view (locked viewport, axis labels and steps) reset.
// Going back to a question also starts clean. Runs on desktop and phone projects.

import { expect, test, type Page } from "@playwright/test";
import { frame, openCalculator, phoneSized, press, row, rowItem, side } from "./quiz-helpers";

const host = (page: Page) => page.locator("[data-calculator-host]");
const keypad = (page: Page) => host(page).getByRole("region", { name: "Keypad" });
const labels = (page: Page) => host(page).locator("[data-poi-label]");

const snapshot = (page: Page) =>
  page.evaluate(() => {
    const e = globalThis.__calculatorHarness!.engine;
    const s = e.getState();
    return {
      rows: s.expressions.map((r) => ({ type: r.type ?? "expression", latex: r.latex ?? "" })),
      canUndo: e.canUndo(),
      canRedo: e.canRedo(),
      viewport: [s.viewport.left, s.viewport.right],
      angleMode: s.settings.angleMode,
      keypad: s.settings.keypad,
      showGrid: s.settings.showGrid,
      arrows: s.settings.arrows,
      lockViewport: s.settings.lockViewport,
      axes: [s.settings.xAxis, s.settings.yAxis],
    };
  });

/** Page coordinates of the world point (x, y) on the quiz calculator's graph. */
async function at(page: Page, x: number, y: number): Promise<[number, number]> {
  const box = (await host(page).locator("[data-graph-layers]").boundingBox())!;
  const view = await page.evaluate(
    () => globalThis.__calculatorHarness!.engine.getSnapshot().view!
  );
  const { left, right, bottom, top } = view.viewport;
  return [
    Math.round(box.x + ((x - left) / (right - left)) * view.size.width),
    Math.round(box.y + ((top - y) / (top - bottom)) * view.size.height),
  ];
}

/** Fills the calculator with everything a question can leave behind. */
async function dirty(page: Page, isMobile: boolean) {
  await row(page).focus(); // MathQuill keeps the row's textarea at 0 x 0, so it cannot be clicked
  await page.keyboard.type("y=x^2");
  await page.keyboard.press("ArrowRight"); // arithmetic stays in an exponent (founder, 2026-10-26)
  await page.keyboard.type("-2");
  await expect.poll(async () => (await snapshot(page)).canUndo).toBe(true);
  await page.evaluate(() => {
    const e = globalThis.__calculatorHarness!.engine;
    e.setExpression({ id: "s", latex: "a=5" });
    e.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "2"] },
        { latex: "y_{1}", values: ["3", "4"] },
      ],
    });
    e.updateSettings({ angleMode: "degrees", keypad: false }); // the keypad would cover the dot
  });
  await expect(host(page).getByRole("slider")).toHaveCount(1);
  // A coordinate label: select y=x^2-2 and press its vertex (0, -2).
  await page.evaluate(() => {
    const e = globalThis.__calculatorHarness!.engine;
    e.setMathBounds({ left: -5, right: 5, bottom: -5, top: 5 });
    e.setSelectedRow(e.getExpressions()[0].id);
  });
  await page.waitForFunction(
    () => (globalThis.__calculatorHarness!.engine.getSnapshot().poi?.points.length ?? 0) > 0
  );
  // A press toggles the label against the engine revision, so it is retried until one shows.
  await expect(async () => {
    const [px, py] = await at(page, 0, -2);
    if (isMobile) await page.touchscreen.tap(px, py);
    else await page.mouse.click(px, py);
    await page.waitForTimeout(300);
    await expect(labels(page)).toHaveCount(1, { timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  // The keypad's letters page.
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.updateSettings({ keypad: true })
  );
  await keypad(page).getByRole("button", { name: "ABC", exact: true }).click();
  await expect(keypad(page).getByRole("button", { name: "Toggle Numbers" })).toBeVisible();
  // Graph settings: two toggles that carry and the view settings that do not.
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.updateSettings({
      showGrid: false,
      arrows: true,
      lockViewport: true,
      xAxis: { show: false, label: "time", step: 2 },
      yAxis: { show: true, label: "h", step: 0.5 },
    })
  );
}

/**
 * Moves to another question. A wide window stays open across the move (the open state carries);
 * full screen on a phone is modal, so the student closes it, moves and opens it again there.
 */
async function move(page: Page, button: "Skip this question" | "Previous") {
  if (!phoneSized(page)) return press(page, button);
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await press(page, button);
  await side(page).click();
}

async function expectClean(page: Page) {
  await expect(rowItem(page)).toBeVisible();
  await expect
    .poll(() => snapshot(page))
    .toEqual({
      rows: [{ type: "expression", latex: "" }],
      canUndo: false,
      canRedo: false,
      viewport: [-10, 10],
      angleMode: "degrees", // a setting: kept
      keypad: true, // a setting: kept, and back on its main page
      showGrid: false, // kept
      arrows: true, // kept
      lockViewport: false, // the view's: reset
      axes: [
        { show: false, label: "", step: null }, // shown or hidden kept; label and step reset
        { show: true, label: "", step: null },
      ],
    });
  await expect(host(page).getByRole("slider")).toHaveCount(0);
  await expect(labels(page)).toHaveCount(0);
  const abc = keypad(page).getByRole("button", { name: "ABC", exact: true });
  await expect(abc).toBeVisible();
  await expect(abc).toHaveAttribute("aria-pressed", "false");
}

test("Next gives a clean calculator with the settings kept; Previous back to a used question is clean too", async ({
  page,
  isMobile,
}) => {
  await openCalculator(page, "diagnostic");
  const mode = await frame(page).getAttribute("data-mode");
  await dirty(page, isMobile);
  await move(page, "Skip this question");
  await expectClean(page);
  await expect(frame(page)).toHaveAttribute("data-mode", mode!); // the window stays where it was
  await expect(frame(page)).toBeVisible(); // and open

  await dirty(page, isMobile);
  await move(page, "Previous");
  await expectClean(page); // no per-question memory
});

test("a calculator closed on one question opens clean on the next, by keyboard", async ({
  page,
}) => {
  await openCalculator(page, "diagnostic");
  await row(page).focus();
  await page.keyboard.type("y=3x");
  await page.getByRole("button", { name: "Close calculator", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(frame(page)).toBeHidden();
  await press(page, "Skip this question");
  if (phoneSized(page)) {
    await page.getByRole("button", { name: "Open Karman calculator", exact: true }).focus();
  } else {
    await page.getByRole("button", { name: "Toggle Karman calculator", exact: true }).focus();
  }
  await page.keyboard.press("Enter");
  await expect(rowItem(page)).toBeVisible();
  await expect
    .poll(async () => {
      const s = await snapshot(page);
      return [s.rows.map((r) => r.latex), s.canUndo];
    })
    .toEqual([[""], false]);
});
