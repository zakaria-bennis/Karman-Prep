// The owner's report of 2026-10-22: on his phone, `[5% of a,b] ~ [b,2c]` above a slider `a = 2`
// showed the warning triangle where live Desmos fits b = 0.1, c = 0.05 with RMSE = 0. Typed here
// on the phone keypad, key by key, on the harness page /harness/calculator.html.

import { expect, test, type Locator, type Page } from "@playwright/test";
import { openShell, rowField, rows, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const keypad = (page: Page) => page.getByRole("region", { name: "Keypad" });
const key = (page: Page, name: string): Locator =>
  keypad(page).getByRole("button", { name, exact: true });

/** Taps each key; "ABC" and "Toggle Numbers" switch the keypad's page on the way. */
async function taps(page: Page, names: string[]): Promise<void> {
  for (const name of names) await key(page, name).tap();
}

// RT-23, RT-30: each parameter and statistic is typeset read-only `name=value` math.
const shown = (page: Page) =>
  page
    .locator("#calc [data-regression] :is(.kc-regression-params, .kc-tr-stat) [data-latex]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-latex")));

test("the owner's [5% of a,b] ~ [b,2c] with a = 2 typed on the phone keypad fits b = 0.1, c = 0.05", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "the phone keypad");
  await openShell(page);
  await rowField(page, "1").tap();
  await taps(page, ["ABC", "[", "Toggle Numbers", "5"]);
  // T-7: the keypad's % (Shift on the letters page) types "% of" as one unit; Shift stays on
  // until tapped again (VIS-KEYPAD-23).
  await taps(page, ["ABC", "Shift", "%", "Shift", "a", "Toggle Numbers", "Comma", "ABC", "b"]);
  await taps(page, ["Toggle Numbers", "Right arrow", "ABC", "~", "[", "b", "Toggle Numbers"]);
  await taps(page, ["Comma", "2", "ABC", "c", "Enter", "a", "Toggle Numbers", "Equals", "2"]);
  await expect
    .poll(async () => (await rows(page)).map((r) => r.latex))
    .toEqual(["\\left[5\\%\\operatorname{of}a,b\\right]\\sim\\left[b,2c\\right]", "a=2"]);
  await expect.poll(() => shown(page)).toEqual(["b=0.1", "c=0.05", "RMSE=0"]);
  await expect(page.locator("#calc [data-row-id='1'] .kc-row-warning")).toHaveCount(0);
});

test("D-27 y_1 ~ a(1+r)^{x_1} offers Log Mode, and it fits as live Desmos does", async ({
  page,
}) => {
  const rowsShown = ["y_{1}\\sim a\\left(1+r\\right)^{x_{1}}"];
  await openShell(page, `?w=1100&h=760&rows=${encodeURIComponent(JSON.stringify(rowsShown))}`);
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "2", "3", "4", "5"] },
        { latex: "y_{1}", values: ["3.1", "5.8", "12.4", "23.5", "48.9"] },
      ],
    })
  );
  await expect.poll(() => shown(page)).toEqual(["a=1.42894", "r=1.0258", "R^{2}=0.9995"]);
  const logMode = page.locator("#calc [data-row-id='1']").getByRole("checkbox", {
    name: "Log Mode",
  });
  await expect(logMode).toBeVisible();
  await logMode.check();
  // live Desmos, 2026-10-22: a = 1.51585, r = 0.996887, R² = 0.9992, r = 0.9996
  await expect
    .poll(() => shown(page))
    .toEqual(["a=1.51585", "r=0.996887", "R^{2}=0.9992", "r=0.9996"]);
});
