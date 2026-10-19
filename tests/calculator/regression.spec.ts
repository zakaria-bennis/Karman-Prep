// Regressions in a real calculator (04 Task 8 of the parity plan): D-2 and the desktop part of
// D-40 on the harness page /harness/calculator.html, typed with real MathQuill and added by the table's
// one-tap button.

import { expect, test, type Page } from "@playwright/test";
import { enc, openShell, rowField, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const YEARS = ["1990", "2000", "2010", "2020"];
const SALARIES = ["30000", "36000", "42000", "48000"];

async function withTable(page: Page, rows: string[] = []): Promise<void> {
  await openShell(page, `?w=900&h=600&rows=${enc(rows)}`);
  await page.evaluate(
    ([x, y]) =>
      globalThis.__calculatorHarness!.engine.setExpression({
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: x },
          { latex: "y_{1}", values: y },
        ],
      }),
    [YEARS, SALARIES]
  );
}

const values = (page: Page) =>
  page
    .locator("#calc [data-regression] .kc-regression-value")
    .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));

const EXPECTED = ["m = 600", "b = -1164000", "R² = 1", "r = 1"];

test("D-2, D-40 typing y_1~mx_1+b fits m = 600, b = −1164000, R² = 1 and r = 1", async ({
  page,
}) => {
  await withTable(page, [""]);
  await rowField(page, "1").click();
  await page.keyboard.type("y_1");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("~mx_1");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("+b");
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().rows[0].latex)
    )
    .toBe("y_{1}\\sim mx_{1}+b");
  await expect.poll(() => values(page)).toEqual(EXPECTED);
  await expect(page.getByRole("textbox", { name: "b equals negative 1164000" })).toBeVisible();
});

test("D-2, D-40 the table's Add regression button fits in one tap and Zoom to fit shows all four points", async ({
  page,
}) => {
  await withTable(page);
  await page.getByRole("button", { name: "Add regression for table 2" }).click();
  await expect.poll(() => values(page)).toEqual(EXPECTED);
  await page.getByRole("button", { name: "Zoom to fit table 2" }).click();
  const inView = await page.evaluate(
    ([x, y]) => {
      const { left, right, bottom, top } =
        globalThis.__calculatorHarness!.engine.getSnapshot().viewport;
      return x.every((xi, i) => {
        const yi = Number(y[i]);
        return Number(xi) > left && Number(xi) < right && yi > bottom && yi < top;
      });
    },
    [YEARS, SALARIES]
  );
  expect(inView).toBe(true);
  // The regression curve is drawn over the view.
  const curve = await page.evaluate(() => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    const id = s.rows.find((r) => r.kind === "regression")!.id;
    const g = s.geometry.get(id);
    return g?.kind === "curve" ? g.polylines.length : 0;
  });
  expect(curve).toBeGreaterThan(4);
});
