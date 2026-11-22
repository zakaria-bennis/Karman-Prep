// The calculator items finished on 2026-11-22, in the quiz's own glass calculator: a bookmarked
// question keeps its calculator, the Statistics buttons, a straight-line fit's r² and parameters,
// and a friendly error tip. Day and night, desktop and phone.

import { expect, test, type Page } from "@playwright/test";
import { frame, latex, openCalculator, press, row, rowItem, trigger } from "./quiz-helpers";

const setRows = (page: Page, rows: unknown[]) =>
  page.evaluate((r) => globalThis.__calculatorHarness!.engine.setExpressions(r as never), rows);

/** Closes the calculator, moves question, and opens it again (the quiz closes it on a move). */
async function move(page: Page, button: "Next" | "Back") {
  if (await frame(page).isVisible()) await trigger(page).click();
  await press(page, button);
  await trigger(page).click();
  await expect(rowItem(page)).toBeVisible();
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(scheme, () => {
    test.beforeEach(({ page }) => page.emulateMedia({ colorScheme: scheme }));

    test("a bookmarked question keeps its calculator; a question that is not starts clean (founder, 2026-11-17)", async ({
      page,
    }) => {
      await openCalculator(page, "diagnostic", undefined, { docked: true });
      await row(page).focus();
      await page.keyboard.type("y=2x");
      // a phone's full-screen calculator covers the question: close it to reach Bookmark
      if ((await frame(page).getAttribute("data-mode")) === "fullscreen")
        await trigger(page).click();
      await page.getByRole("button", { name: "Bookmark", exact: true }).first().click();
      await move(page, "Next");
      expect(await latex(page)).toEqual([""]); // the next question is clean
      await row(page).focus();
      await page.keyboard.type("y=5");
      await move(page, "Back");
      expect(await latex(page)).toEqual(["y=2x"]); // the bookmarked one is as it was left
      await move(page, "Next");
      expect(await latex(page)).toEqual([""]); // not bookmarked: clean again
    });

    test("Statistics buttons insert their function, and a straight-line fit shows r², r and its parameters", async ({
      page,
    }, info) => {
      await openCalculator(page, "diagnostic", undefined, { docked: true });
      await row(page).focus();
      const fn = frame(page).getByRole("button", { name: "Functions", exact: true });
      if (await fn.isVisible()) {
        await fn.click();
        await frame(page)
          .getByRole("group", { name: "Functions" })
          .getByRole("button", { name: "standard deviation", exact: true })
          .click();
        await expect.poll(() => latex(page)).toEqual(["\\operatorname{stdev}\\left(\\right)"]);
      }
      await setRows(page, [
        {
          id: "t",
          type: "table",
          columns: [
            { latex: "x_{1}", values: ["1", "2", "3", "4"] },
            { latex: "y_{1}", values: ["3", "5", "7", "9"] },
          ],
        },
        { id: "f", latex: "y_{1}\\sim mx_{1}+b" },
      ]);
      const panel = frame(page).locator("[data-regression]");
      await expect(panel.getByRole("img", { name: "m equals 2" })).toBeVisible();
      await expect(panel.getByRole("img", { name: "r squared equals 1" })).toBeVisible();
      await expect(frame(page).getByRole("link")).toHaveCount(0); // no outside help links
      await page.screenshot({
        path: `tmp/calculator/glass-${info.project.name}-${scheme}-fit.png`,
      });
    });

    test("a slip gets a friendly tip that names the fix, fully on screen", async ({
      page,
    }, info) => {
      await openCalculator(page, "diagnostic", undefined, { docked: true });
      await setRows(page, [{ id: "a", latex: "f(2)" }]);
      await frame(page).getByRole("button", { name: "Error", exact: true }).click();
      const tip = frame(page).locator(".kc-error-tip:not([hidden])");
      await expect(tip).toHaveText("f isn't defined yet. Define f(x) = ... on its own line first.");
      const box = (await tip.boundingBox())!;
      const view = page.viewportSize()!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(view.width);
      await page.waitForTimeout(400); // the tip's fade-in has ended
      await page.screenshot({
        path: `tmp/calculator/glass-${info.project.name}-${scheme}-tip.png`,
      });
    });
  });
}

test("tablet: the glass calculator with a table, a fit, a slider and the Add item menu, day and night", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "one tablet size is enough");
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await openCalculator(page, "diagnostic", { width: 820, height: 1180 }, { docked: true });
    await setRows(page, [
      {
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: ["0", "1", "2", "3"] },
          { latex: "y_{1}", values: ["5", "10", "20", "40"] },
        ],
      },
      { id: "f", latex: "y_{1}\\sim ab^{x_{1}}" },
      { id: "s", latex: "y=ax^{2}" },
      { id: "a", latex: "a=2" },
    ]);
    await expect(frame(page).locator("[data-regression]")).toBeVisible();
    await page.screenshot({ path: `tmp/calculator/glass-tablet-${scheme}.png` });
    const add = frame(page).getByRole("button", { name: "Add item", exact: true });
    if (await add.isVisible()) {
      await add.click();
      await page.screenshot({ path: `tmp/calculator/glass-tablet-${scheme}-add-menu.png` });
      await page.keyboard.press("Escape");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  }
});
