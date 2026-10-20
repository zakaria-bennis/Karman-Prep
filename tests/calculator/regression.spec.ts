// Regressions in a real calculator: D-2 and the desktop part of
// D-40 on the harness page /harness/calculator.html, typed with real MathQuill, and the table's
// one-tap Add Regression (RT-28).

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

// RT-23, RT-30: each parameter and statistic is typeset read-only `name=value` math.
const values = (page: Page) =>
  page
    .locator(
      "#calc [data-regression] :is(.kc-regression-params, .kc-tr-stat) .kc-static-math [data-latex]"
    )
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-latex")));

const EXPECTED = ["m=600", "b=-1164000", "R^{2}=1", "r=1"];

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
  await expect(page.getByRole("img", { name: "b equals negative 1164000" })).toBeVisible();
});

test("D-40, RT-28 the table's Add Regression fits in one tap and Zoom to fit shows all four points", async ({
  page,
}) => {
  await withTable(page);
  await page.getByRole("button", { name: "Add Regression" }).click();
  await expect
    .poll(() =>
      page
        .locator("#calc [data-table-regression] .kc-tr-equation [data-latex]")
        .getAttribute("data-latex")
    )
    .toBe("y=600x-1164000");
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
  // The regression curve is drawn with the table, over the view.
  const curve = await page.evaluate(() => {
    const g = globalThis.__calculatorHarness!.engine.getSnapshot().geometry.get("t");
    return g?.kind === "table" ? (g.regression?.polylines.length ?? 0) : 0;
  });
  expect(curve).toBeGreaterThan(4);
});
