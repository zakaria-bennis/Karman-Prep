// In a real calculator on the harness page (founder request, 2026-10-26): the inference wizard
// and rows (FN-59), typing d/dx (FN-61) and the clickable DEG/RAD badge, by pointer and keyboard
// only, at desktop and phone widths and in a dark skin.

import { expect, test, type Page } from "@playwright/test";
import { announced, enc, openShell, rowField, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const row = (page: Page, id: string) => page.locator(`#calc [data-row-id="${id}"]`);
const latexes = (page: Page) =>
  page.evaluate(() => globalThis.__calculatorHarness!.engine.getExpressions().map((r) => r.latex));
const wizard = (page: Page) => page.locator("#calc .kc-wiz");

for (const size of [
  { name: "desktop", w: 900, h: 600 },
  { name: "phone", w: 390, h: 760 },
]) {
  test(`FN-59 the wizard by keyboard only (${size.name}): Add item, inference, z-test for proportions, Create`, async ({
    page,
    browserName,
  }) => {
    await openShell(page, `?w=${size.w}&h=${size.h}&rows=${enc([""])}&reducedMotion=1`);
    const add = page.getByRole("button", { name: "Add item" });
    await add.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("End"); // the third item, inference
    await expect(page.getByRole("menuitem", { name: "Add inference object" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Add inference" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Probability Distribution" })).toBeFocused();
    const zprop = page.getByRole("button", { name: "z-test for proportions" });
    // WebKit's Tab skips buttons unless the system says otherwise; elsewhere Tab walks the dialog
    if (browserName === "webkit") await zprop.focus();
    else for (let k = 0; k < 3; k++) await page.keyboard.press("Tab");
    await expect(zprop).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Create Test" })).toBeDisabled();
    await page.waitForTimeout(100);
    await page.keyboard.type("12");
    await page.keyboard.press("Tab");
    await page.keyboard.type("40");
    await page.keyboard.press("Enter"); // Enter in a cell creates once the form is complete
    await expect(wizard(page)).toHaveCount(0);
    expect((await latexes(page))[1]).toBe("\\operatorname{zproptest}\\left(12,40\\right)");
    // the row: sections by keyboard, Desmos's numbers
    const ci = row(page, "2").getByRole("button", { name: "Confidence Interval" });
    await ci.focus();
    await page.keyboard.press("Enter");
    await expect(row(page, "2").getByRole("img", { name: /from 0.158 to 0.442/ })).toBeVisible();
    const ht = row(page, "2").getByRole("button", { name: "Hypothesis Test" });
    await ht.focus();
    await page.keyboard.press("Enter");
    await expect(row(page, "2").getByRole("img", { name: /p-value 0.011/ })).toBeVisible();
    await row(page, "2").getByRole("radio", { name: "Left" }).check();
    await expect(row(page, "2").getByRole("img", { name: /p-value 0.006/ })).toBeVisible();
    const box = await page.locator("#calc .kc-inf-box").first().boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.w); // no overflow at phone width
  });
}

test("FN-59 the close button, Escape and the cover each close the wizard and leave the empty row", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=x"])}&reducedMotion=1`);
  const open = async () => {
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByRole("menuitem", { name: "Add inference object" }).click();
    await expect(wizard(page)).toBeVisible();
  };
  await open();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(wizard(page)).toHaveCount(0);
  await open();
  await page.keyboard.press("Escape");
  await expect(wizard(page)).toHaveCount(0);
  await open();
  await page.locator("#calc .kc-wiz-cover").dispatchEvent("pointerdown");
  await expect(wizard(page)).toHaveCount(0);
  expect(await latexes(page)).toEqual(["y=x", "", "", ""]);
});

test("FN-59 the χ² wizard writes the table's columns; the row exports its p-value as T_1", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc([""])}&reducedMotion=1&skin=charcoal`);
  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByRole("menuitem", { name: "Add inference object" }).click();
  await page.getByRole("button", { name: "χ2 test for independence" }).click();
  const cell = (label: string) => page.getByRole("textbox", { name: label });
  for (const [label, value] of [
    ["Group A, Group 1", "10"],
    ["Group A, Group 2", "20"],
    ["Group B, Group 1", "30"],
    ["Group B, Group 2", "25"],
  ]) {
    await cell(label).focus();
    await page.keyboard.type(value);
  }
  await page.getByRole("button", { name: "Create Test" }).click();
  await row(page, "2").getByRole("button", { name: "Hypothesis Test" }).click();
  await row(page, "2").getByRole("button", { name: "View numerical outputs" }).click();
  await page.getByRole("button", { name: "Export p-value to the expression list" }).click();
  expect(await latexes(page)).toEqual([
    "",
    "T_{1}=\\operatorname{chisqtest}\\left(\\left[10,30\\right],\\left[20,25\\right]\\right)",
    "T_{1}.p",
  ]);
  await expect(row(page, "3").locator(".kc-row-value")).toContainText("0.0611508975761");
});

test("FN-61 typing d/dx then → and f(x) gives \\frac{d}{dx}f(x), which graphs", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["", "f(x)=x^{3}"])}&reducedMotion=1`);
  await rowField(page, "1").click();
  await page.keyboard.type("y=d/dx");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("f(x)");
  await expect.poll(async () => (await latexes(page))[0]).toBe("y=\\frac{d}{dx}f\\left(x\\right)");
  await expect(row(page, "1").getByRole("button", { name: /Hide/ })).toBeVisible(); // it graphs
});

test("FN-61 the keypad's Calculus d/dx writes \\frac{d}{dx} with the caret after it", async ({
  page,
}) => {
  await page.goto(
    `/harness/editor.html?rows=${encodeURIComponent(JSON.stringify([""]))}&keypad=open`
  );
  const field = page.getByRole("textbox", { name: "Expression 1", exact: true });
  await field.focus();
  const keypad = page.getByRole("region", { name: "Keypad" });
  await keypad.getByRole("button", { name: "Functions", exact: true }).click();
  await keypad.getByRole("button", { name: "d by d x" }).click();
  await expect(field).toBeFocused();
  await page.keyboard.type("x^3");
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().rows[0].latex)
    )
    .toBe("\\frac{d}{dx}x^{3}");
});

test("R-11 the DEG/RAD badge switches the angle mode by click and by keyboard, and says so", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["\\sin(30)", "y=\\sin(x)"])}&reducedMotion=1`);
  const badge = row(page, "1").locator(".kc-angle-badge");
  const box = (await badge.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(13);
  await badge.click();
  await expect(badge).toHaveText("DEG");
  await expect(row(page, "1").locator(".kc-row-value")).toContainText("0.5");
  await expect(row(page, "2").locator(".kc-angle-badge")).toHaveText("DEG");
  await expect.poll(() => announced(page)).toContain("Angle set to degrees.");
  await row(page, "2").locator(".kc-angle-badge").focus();
  await page.keyboard.press("Enter");
  await expect(badge).toHaveText("RAD");
  await page.keyboard.press(" ");
  await expect(badge).toHaveText("DEG");
});
