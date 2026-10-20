// The owner's three calculator reports of 2026-10-20, checked against live Desmos the same day:
// the points glyph in a table column's colour icon (four dots, placed as the reference places
// them), typing a y value before any x in a new table, and error triangles whose message opens on
// hover, focus and click with the reference's wording (table regressions, cells, headers, rows).

import { expect, test, type Page } from "@playwright/test";
import { enc, openShell, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const cell = (page: Page, name: string) => page.getByRole("textbox", { name, exact: true });
/** The visible MathQuill field of a cell; its textarea is visually hidden. */
const cellField = (page: Page, name: string) =>
  page
    .locator("#calc .kc-table-cell")
    .filter({ has: cell(page, name) })
    .locator(".mq-editable-field");

const columns = (page: Page) =>
  page.evaluate(() =>
    globalThis
      .__calculatorHarness!.engine.getSnapshot()
      .rows.find((r) => r.type === "table")!
      .columns!.map((c) => [...c.values])
  );

/** The visible error tooltips' texts and whether each is pinned. */
const openTips = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelector("#calc")!.shadowRoot!.querySelectorAll<HTMLElement>(".kc-error-tip")]
      .filter((t) => !t.hidden)
      .map((t) => ({ text: t.textContent, pinned: t.dataset.pinned === "true" }))
  );

/** Waits until `locator` stops moving (rows leave and settle after a state change). */
async function settled(locator: ReturnType<Page["locator"]>): Promise<void> {
  let last = "";
  await expect
    .poll(async () => {
      const box = JSON.stringify(await locator.boundingBox());
      const still = box === last;
      last = box;
      return still;
    })
    .toBe(true);
}

const setExpressions = (page: Page, expressions: object[]) =>
  page.evaluate((list) => {
    const calculator = globalThis.__shell!.handle.calculator;
    const state = calculator.getState();
    calculator.setState({ ...state, expressions: list as typeof state.expressions });
  }, expressions);

test("RT-8 a table column's colour icon draws the reference's four points; a list of points row shows them too", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["[(1,2),(3,4)]", "(1,2)"])}`);
  await setExpressions(page, [
    { id: "p", latex: "[(1,2),(3,4)]" },
    { id: "q", latex: "(1,2)" },
    {
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: [""] },
        { latex: "y_{1}", values: [""] },
      ],
    },
  ]);
  const dots = (locator: ReturnType<Page["locator"]>) =>
    locator
      .locator("circle")
      .evaluateAll((cs) =>
        cs.map((c) => [c.getAttribute("cx"), c.getAttribute("cy"), c.getAttribute("r")].map(Number))
      );
  const icon = page.locator("#calc .kc-column-icon");
  await expect(icon).toHaveCount(1);
  expect(await dots(icon)).toEqual([
    [10.03, 11.03, 2.45],
    [20.95, 7.87, 2.45],
    [17.15, 17.29, 2.45],
    [8.11, 21.3, 2.45],
  ]);
  const rowIcon = (id: string) => page.locator(`#calc [data-row-id="${id}"] .kc-row-tab`).first();
  await expect(rowIcon("p")).toHaveAttribute("data-kind", "points");
  expect(await dots(rowIcon("p"))).toHaveLength(4);
  await expect(rowIcon("q")).toHaveAttribute("data-kind", "point");
});

test("D-19 a new table shows two rows; y can be typed first in either, rows are added as needed, and the keys move as on the reference", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByRole("menuitem", { name: "Add table" }).click();
  await expect(cell(page, "x₁, row 1, blank")).toBeFocused();
  await expect(cell(page, "y₁, row 2, blank")).toBeAttached();
  // y in the second row while the first is empty
  await cellField(page, "y₁, row 2, blank").click();
  await page.keyboard.type("5");
  expect(await columns(page)).toEqual([
    ["", ""],
    ["", "5"],
  ]);
  await expect(cell(page, "y₁, row 3, blank")).toBeAttached();
  // y in the first row, then Enter moves down the column and typing fills it
  await cellField(page, "y₁, row 1, blank").click();
  await page.keyboard.type("7");
  await page.keyboard.press("Enter");
  await expect(cell(page, "y₁, row 2")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(cell(page, "y₁, row 3, blank")).toBeFocused();
  await page.keyboard.type("9");
  expect((await columns(page))[1]).toEqual(["7", "5", "9"]);
  await page.keyboard.press("ArrowLeft"); // the caret moves before the 9, then out of the cell
  await page.keyboard.press("ArrowLeft");
  await expect(cell(page, "x₁, row 3, blank")).toBeFocused();
  // the empty x cells stay blank: no warning, and nothing is plotted for them
  await expect(page.locator("#calc .kc-cell-warning")).toHaveCount(0);
});

test("RT-30 an empty table regression's triangle opens 'Cannot regress an empty list against an empty list.' on hover, focus and click", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}&reducedMotion=1`);
  await setExpressions(page, [
    {
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: [] },
        { latex: "y_{1}", values: [] },
      ],
      regression: { type: "linear", columns: { x: 0, y: 1 } },
    },
  ]);
  const marker = page.locator("#calc .kc-tr-warning");
  await expect(marker).toBeVisible();
  await settled(marker);
  const text = "Cannot regress an empty list against an empty list.";
  await marker.hover();
  await expect.poll(() => openTips(page)).toEqual([{ text, pinned: false }]);
  await page.mouse.move(900, 700);
  await expect.poll(() => openTips(page)).toEqual([]);
  await marker.click();
  await page.mouse.move(900, 700);
  await expect.poll(() => openTips(page)).toEqual([{ text, pinned: true }]);
  await page.keyboard.press("Escape");
  await expect.poll(() => openTips(page)).toEqual([]);
  // a keyboard focus (after focus was elsewhere) opens it at once
  await page.getByRole("button", { name: "Add item" }).focus();
  await marker.focus();
  await expect.poll(() => openTips(page)).toEqual([{ text, pinned: false }]);
  await expect(marker).toHaveAccessibleDescription(text);
});

const CASES: { name: string; expressions: object[]; marker: string; text: string }[] = [
  {
    name: "a regression with a y column only",
    expressions: [
      {
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: [] },
          { latex: "y_{1}", values: ["2", "4", "7"] },
        ],
        regression: { type: "linear", columns: { x: 0, y: 1 } },
      },
    ],
    marker: ".kc-tr-warning",
    text: "Cannot regress a list of numbers against an empty list.",
  },
  {
    name: "a regression over an undefined value",
    expressions: [
      {
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: ["1", "2", "3"] },
          { latex: "y_{1}", values: ["2", "\\frac{1}{0}", "7"] },
        ],
        regression: { type: "linear", columns: { x: 0, y: 1 } },
      },
    ],
    marker: ".kc-tr-warning",
    text: "We couldn't find any region where this model is defined.",
  },
  {
    name: "a cell that cannot be read",
    expressions: [
      {
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: ["1", "2+"] },
          { latex: "y_{1}", values: ["3", "4"] },
        ],
      },
    ],
    marker: ".kc-cell-warning:not(.kc-header-warning)",
    text: "Table entries must be simple expressions. This type of expression is not allowed.",
  },
  {
    name: "a point header",
    expressions: [
      {
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: ["1", "2"] },
          { latex: "(1,2)", values: ["", ""] },
        ],
      },
    ],
    marker: ".kc-header-warning",
    text: "Table header cannot be a point.",
  },
  {
    name: "a typed regression of a point",
    expressions: [{ id: "r", latex: "(1,2)\\sim m" }],
    marker: ".kc-row-warning",
    text: "Cannot regress a point against a number.",
  },
  {
    name: "a slider whose limits cross",
    expressions: [{ id: "a", latex: "a=1", sliderBounds: { min: "5", max: "1", step: "" } }],
    marker: ".kc-row-warning",
    text: "Invalid slider limits. Min should be less than max.",
  },
];

for (const c of CASES) {
  test(`R-2 the triangle of ${c.name} opens its message on hover and pins it on click`, async ({
    page,
  }) => {
    await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}&reducedMotion=1`);
    await setExpressions(page, c.expressions);
    const marker = page.locator(`#calc ${c.marker}`).first();
    await expect(marker).toBeVisible();
    await settled(marker);
    await marker.hover();
    await expect.poll(() => openTips(page)).toEqual([{ text: c.text, pinned: false }]);
    await marker.click();
    await page.mouse.move(1100, 750);
    await expect.poll(() => openTips(page)).toEqual([{ text: c.text, pinned: true }]);
    await marker.click(); // a second click unpins and closes once the pointer leaves
    await page.mouse.move(1100, 750);
    await expect.poll(() => openTips(page)).toEqual([]);
  });
}
