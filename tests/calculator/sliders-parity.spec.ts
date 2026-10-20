// Slider rows against the live reference, checked side by side on 2026-10-19: the tab order
// through a slider row (SLIDERS-25), typing a value past a hard limit (SLIDERS-22), the snapped
// value an API write shows (SLIDERS-22), the controls' spoken names and Escape from the options
// popover (SLIDERS-29, SLIDERS-34).

import { expect, test, type Page } from "@playwright/test";
import { enc, openShell, rowField, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const row = (page: Page, id: string) => page.locator(`#calc [data-row-id="${id}"]`);
const expressionOf = (page: Page, id: string) =>
  page.evaluate(
    (id) => globalThis.__calculatorHarness!.engine.getExpressions().find((r) => r.id === id),
    id
  );
/** The accessible name of the focused element and its row id. */
const focused = (page: Page) =>
  page.evaluate(() => {
    const a = document.querySelector("#calc")?.shadowRoot?.activeElement ?? null;
    const id = a?.closest("[data-row-id]")?.getAttribute("data-row-id") ?? "-";
    return `${id}:${a?.getAttribute("aria-label") ?? a?.tagName ?? "none"}`;
  });

test("SLIDERS-25 Tab walks math, delete, limits, thumb, Play, then the next row's math", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=x", "a=1", "b=2"])}`);
  await rowField(page, "2").click();
  const walk: string[] = [];
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Tab");
    walk.push(await focused(page));
  }
  expect(walk).toEqual([
    "2:Delete expression 2",
    "2:Slider Minimum:",
    "2:Slider Maximum:",
    "2:Slider Step Size:",
    '2:"a"',
    "2:Play a Animation",
    "3:Expression 3",
  ]);
  await row(page, "2").getByRole("slider").focus();
  const back: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Shift+Tab");
    back.push(await focused(page));
  }
  expect(back).toEqual([
    "2:Slider Step Size:",
    "2:Slider Maximum:",
    "2:Slider Minimum:",
    "2:Delete expression 2",
    "2:Expression 2",
  ]);
});

test("SLIDERS-22 an API value past the max shows snapped; a typed one loosens the limit", async ({
  page,
}) => {
  await openShell(page, "?w=900&h=600");
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpressions([
      { id: "1", latex: "a=15", sliderBounds: { min: "0", max: "10", step: "" } },
      { id: "2", latex: "y=a" },
    ])
  );
  const thumb = row(page, "1").getByRole("slider");
  await expect(thumb).toHaveAttribute("aria-valuenow", "10");
  await expect(row(page, "1").locator(".kc-row-field .mq-root-block").first()).toHaveText(/a=10/);
  expect(await expressionOf(page, "1")).toMatchObject({ latex: "a=15" });

  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpression({
      id: "1",
      latex: "a=1",
      sliderBounds: { min: "0", max: "10", step: "" },
    })
  );
  await rowField(page, "1").click();
  await page.keyboard.press("End");
  await page.keyboard.type("5");
  await expect
    .poll(async () => (await expressionOf(page, "1"))?.slider)
    .toEqual({
      hardMin: true,
      min: "0",
    });
  await page.keyboard.press("Escape");
  await expect(thumb).toHaveAttribute("aria-valuenow", "15");
  await expect(thumb).toHaveAttribute("aria-valuemax", "15");
  await expect(row(page, "1").getByRole("button", { name: "Slider Maximum: 15" })).toBeVisible();
});

test("SLIDERS-29, SLIDERS-34 spoken names; Escape from the popover returns to Play", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["\\alpha=1"])}`);
  await expect(row(page, "1").getByRole("slider", { name: '"alpha"', exact: true })).toBeVisible();
  await row(page, "1").getByRole("button", { name: "Loop forwards and backwards" }).click();
  await expect(page.getByRole("dialog", { name: "Animation options for alpha" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row(page, "1").getByRole("button", { name: "Play alpha Animation" })).toBeFocused();
});
