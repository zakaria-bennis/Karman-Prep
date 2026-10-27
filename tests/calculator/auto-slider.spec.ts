// SLIDERS-36: Enter in a row with undefined names adds them as sliders, as live Desmos does.
// Every expected value below is what window.Calc.getState() listed on
// https://www.desmos.com/calculator on 2026-10-22 after the same keys were typed into an empty row
// (black-box observation). Desmos's shipped code (read with REA, never copied) gives the same
// rule: on Enter, an expression with 1 to 4 undefined names gets `name=1` rows right after it in
// order of first appearance, then an empty row that takes focus, as one undo step; a lone name or
// five or more names get only the empty row. Blur, Tab and Down add nothing.

import { expect, test, type Page } from "@playwright/test";
import { enc, focusedRow, openShell, rowField, rows, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

type Step = string | { key: string };

async function run(page: Page, steps: readonly Step[]): Promise<void> {
  for (const step of steps)
    if (typeof step === "string") await page.keyboard.type(step);
    else await page.keyboard.press(step.key);
}

const label = (steps: readonly Step[]) =>
  steps.map((s) => (typeof s === "string" ? s : `[${s.key}]`)).join("");

/** The rows' latex joined by " ⏎ " and the 1-based number of the focused row (0 for none). */
async function state(page: Page): Promise<string> {
  const list = await rows(page);
  const focused = await focusedRow(page);
  const at = list.findIndex((r) => r.id === focused) + 1;
  return `${list.map((r) => r.latex).join(" ⏎ ")} @${at}`;
}

const ENTER = { key: "Enter" };
const RIGHT = { key: "ArrowRight" };

// Keys typed into the one empty row, then Enter; Desmos's rows after it and the focused row.
const LIVE_DESMOS: readonly (readonly [readonly Step[], string])[] = [
  // founder, 2026-10-26: arithmetic stays in the subscript, so these are one name (Desmos leaves it)
  [["x_1+2"], "x_{1+2} ⏎  @2"],
  [["x_1*2"], "x_{1\\cdot2} ⏎  @2"],
  [["y=mx+b"], "y=mx+b ⏎ m=1 ⏎ b=1 ⏎  @4"],
  [["a+2"], "a+2 ⏎ a=1 ⏎  @3"],
  [["a"], "a ⏎  @2"],
  [["x_1"], "x_{1} ⏎  @2"],
  [["t"], "t ⏎  @2"],
  [["a_1", RIGHT, "+b"], "a_{1}+b ⏎ a_{1}=1 ⏎ b=1 ⏎  @4"],
  [["y=a_1", RIGHT, "x"], "y=a_{1}x ⏎ a_{1}=1 ⏎  @3"],
  [["y=ax"], "y=ax ⏎ a=1 ⏎  @3"],
  [["a+b"], "a+b ⏎ a=1 ⏎ b=1 ⏎  @4"],
  [["b+a+b"], "b+a+b ⏎ b=1 ⏎ a=1 ⏎  @4"],
  [["a+b+c+d"], "a+b+c+d ⏎ a=1 ⏎ b=1 ⏎ c=1 ⏎ d=1 ⏎  @6"],
  [["a+b+c+d+f"], "a+b+c+d+f ⏎  @2"],
  [["f(x)=ax"], "f\\left(x\\right)=ax ⏎ a=1 ⏎  @3"],
  [["(a,b)"], "\\left(a,b\\right) ⏎ a=1 ⏎ b=1 ⏎  @4"],
  [["y<ax"], "y<ax ⏎ a=1 ⏎  @3"],
  [["[a,2]"], "\\left[a,2\\right] ⏎ a=1 ⏎  @3"],
  [["sin(ax)"], "\\sin\\left(ax\\right) ⏎ a=1 ⏎  @3"],
  [["x+t"], "x+t ⏎ t=1 ⏎  @3"],
  [["a+"], "a+ ⏎  @2"],
  [["a+2", { key: "Home" }], "a+2 ⏎ a=1 ⏎  @3"],
];

test.describe("Enter adds sliders like live Desmos", () => {
  for (const [steps, desmos] of LIVE_DESMOS)
    test(`${label(steps)} then Enter gives ${desmos}`, async ({ page }) => {
      await openShell(page, `?rows=${enc([""])}`);
      await rowField(page, "1").click();
      await run(page, [...steps, ENTER]);
      await expect.poll(() => state(page)).toBe(desmos);
    });
});

// Ways of leaving the row other than Enter, after typing `a+2`; Desmos adds no slider.
const LEAVE_DESMOS: readonly (readonly [string, string])[] = [
  ["Tab", "a+2"],
  ["ArrowDown", "a+2 ⏎ "],
];

test.describe("leaving the row without Enter adds no slider, as on Desmos", () => {
  for (const [key, desmos] of LEAVE_DESMOS)
    test(`a+2 then ${key} gives ${desmos}`, async ({ page }) => {
      await openShell(page, `?rows=${enc([""])}`);
      await rowField(page, "1").click();
      await run(page, ["a+2", { key }]);
      await expect
        .poll(async () => (await rows(page)).map((r) => r.latex).join(" ⏎ "))
        .toBe(desmos);
    });

  test("a+2 then a click on the graph gives a+2", async ({ page }) => {
    await openShell(page, `?rows=${enc([""])}`);
    await rowField(page, "1").click();
    await page.keyboard.type("a+2");
    await page
      .locator("#calc .kc-graph, #calc canvas")
      .first()
      .click({ position: { x: 300, y: 200 } });
    await expect.poll(() => state(page)).toBe("a+2 @0");
  });
});

test.describe("where the sliders go, as on Desmos", () => {
  test("in the middle of the list: right after the row, then the empty row", async ({ page }) => {
    await openShell(page, `?rows=${enc(["z=9", "", "w=2"])}`);
    await rowField(page, "2").click();
    await run(page, ["y=ax+b", ENTER]);
    await expect.poll(() => state(page)).toBe("z=9 ⏎ y=ax+b ⏎ a=1 ⏎ b=1 ⏎  ⏎ w=2 @5");
  });

  test("a name another row defines gets no slider", async ({ page }) => {
    await openShell(page, `?rows=${enc(["b=2", ""])}`);
    await rowField(page, "2").click();
    await run(page, ["y=ax+b", ENTER]);
    await expect.poll(() => state(page)).toBe("b=2 ⏎ y=ax+b ⏎ a=1 ⏎  @4");
  });

  test("Enter on a row typed earlier adds them too", async ({ page }) => {
    await openShell(page, `?rows=${enc(["a+2"])}`);
    await rowField(page, "1").click();
    await run(page, [{ key: "End" }, ENTER]);
    await expect.poll(() => state(page)).toBe("a+2 ⏎ a=1 ⏎  @3");
  });

  test("one undo removes the sliders and the empty row; redo brings them back", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc([""])}`);
    await rowField(page, "1").click();
    await run(page, ["a+2", ENTER]);
    await expect.poll(() => state(page)).toBe("a+2 ⏎ a=1 ⏎  @3");
    await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(async () => (await rows(page)).map((r) => r.latex)).toEqual(["a+2"]);
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect
      .poll(async () => (await rows(page)).map((r) => r.latex))
      .toEqual(["a+2", "a=1", ""]);
  });
});

test("the phone keypad's Enter key adds them too, as on Desmos", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the phone keypad");
  await openShell(page, `?rows=${enc([""])}`);
  await rowField(page, "1").tap();
  await page.keyboard.type("y=mx+b");
  await page
    .getByRole("region", { name: "Keypad" })
    .getByRole("button", { name: "Enter", exact: true })
    .tap();
  await expect.poll(() => state(page)).toBe("y=mx+b ⏎ m=1 ⏎ b=1 ⏎  @4");
});
