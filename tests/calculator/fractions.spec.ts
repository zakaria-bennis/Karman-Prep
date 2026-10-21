// R-5 and NM-7: the decimal/fraction toggle, as live Desmos has it (captured 2026-10-21). A row
// whose value has a fraction form shows the toggle in its gutter; a click, tap, Enter or Space
// switches the value box to the stacked fraction and back, one undo step each, and Alt+Shift+A
// (Cmd+Shift+A on a Mac) does the same for the focused row. Runs on desktop and phone projects.

import { expect, test, type Page } from "@playwright/test";
import {
  announced,
  enc,
  frames,
  openShell,
  rowField,
  shortcutKeys,
  tap,
  useConsoleGuard,
} from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const DECIMAL = "Displaying as decimal. Press Enter to display as Fraction";
const FRACTION = "Displaying as fraction. Press Enter to display as Decimal";
const toggle = (page: Page, id: string) =>
  page.locator(`#calc [data-row-id="${id}"] .kc-row-fraction`);
const valueLine = (page: Page, id: string) =>
  page.locator(`#calc [data-row-id="${id}"] .kc-row-value-line`);

/** The value box's stacked fraction as "sign num/den", or null when it shows a decimal. */
const shownFraction = (page: Page, id: string) =>
  page.evaluate((rowId) => {
    const row = document
      .querySelector("#calc")!
      .shadowRoot!.querySelector(`[data-row-id="${rowId}"]`);
    const box = row?.querySelector(".kc-row-value-fraction");
    const frac = box?.querySelector(".mq-fraction");
    if (!box || !frac) return null;
    const num = frac.querySelector(".mq-numerator")!.textContent;
    const den = frac.querySelector(".mq-denominator")!.textContent;
    const sign = /^[-−]/.test(box.querySelector(".mq-root-block")!.textContent!.trim()) ? "-" : "";
    return `${sign}${num}/${den}`;
  }, id);

const flag = (page: Page, id: string) =>
  page.evaluate(
    (rowId) =>
      globalThis.__shell!.handle.calculator.getState().expressions.find((e) => e.id === rowId)
        ?.displayEvaluationAsFraction ?? false,
    id
  );

const ROWS = ["\\frac{7}{12}", "\\frac{-1}{8}", "0.75", "2+3", "\\pi", "y=0.5", "[0.5,0.25]+0"];

test("R-5 only a value with a fraction form shows the toggle, outlined at 0.5 in the colour icon's place", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=900&reducedMotion=1&rows=${enc(ROWS)}`);
  await expect(toggle(page, "1")).toHaveAttribute("aria-label", DECIMAL);
  for (const id of ["1", "2", "3"]) await expect(toggle(page, id)).toHaveCount(1);
  for (const id of ["4", "5", "6", "7"]) await expect(toggle(page, id)).toHaveCount(0);
  const box = (await toggle(page, "1").boundingBox())!;
  const row = (await page.locator('#calc [data-row-id="1"]').boundingBox())!;
  expect(box.width).toBeCloseTo(29, 0);
  expect(box.height).toBeCloseTo(29, 0);
  expect(box.x - row.x).toBeCloseTo(4, 0);
  const style = await toggle(page, "1").evaluate((el) => {
    const cs = getComputedStyle(el);
    return [cs.opacity, cs.borderTopWidth, cs.borderRadius, cs.backgroundColor];
  });
  expect(style).toEqual(["0.5", "2px", "50%", "rgba(0, 0, 0, 0)"]);
  await expect(toggle(page, "1")).not.toHaveAttribute("title");
});

test("R-5 a click or tap switches the value to the stacked fraction and back, one undo step each", async ({
  page,
  isMobile,
}) => {
  await openShell(page, `?w=1200&h=900&reducedMotion=1&rows=${enc(ROWS)}`);
  await expect(valueLine(page, "1")).toContainText("0.583333333333");
  await tap(isMobile, toggle(page, "1"));
  await expect(toggle(page, "1")).toHaveAttribute("aria-label", FRACTION);
  await expect.poll(() => shownFraction(page, "1")).toBe("7/12");
  expect(await flag(page, "1")).toBe(true);
  await expect(
    page.locator('#calc [data-row-id="1"] .kc-row-value .kc-visually-hidden')
  ).toHaveText(/^equals /);
  // the on state fills the circle with the ink
  const filled = await toggle(page, "1").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(filled).not.toBe("rgba(0, 0, 0, 0)");

  // the box measures as the reference's 7/12 box: 42 by 45.6
  const box = (await page.locator('#calc [data-row-id="1"] .kc-row-value-fraction').boundingBox())!;
  expect(Math.abs(box.width - 42)).toBeLessThan(4);
  expect(Math.abs(box.height - 45.6)).toBeLessThan(3);

  await tap(isMobile, toggle(page, "2"));
  await expect.poll(() => shownFraction(page, "2")).toBe("-1/8");

  // a literal shows its value line once toggled
  await expect(valueLine(page, "3")).toHaveCount(0);
  await tap(isMobile, toggle(page, "3"));
  await expect.poll(() => shownFraction(page, "3")).toBe("3/4");

  await tap(isMobile, toggle(page, "1"));
  await expect(toggle(page, "1")).toHaveAttribute("aria-label", DECIMAL);
  await expect(valueLine(page, "1")).toContainText("0.583333333333");
  await page.evaluate(() => globalThis.__shell!.handle.calculator.undo());
  await expect.poll(() => shownFraction(page, "1")).toBe("7/12");
});

test("R-5 the choice stays with the row through an edit and a whole-number value", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=900&reducedMotion=1&rows=${enc(["\\frac{1}{3}"])}`);
  await toggle(page, "1").click();
  await expect.poll(() => shownFraction(page, "1")).toBe("1/3");
  await page.evaluate(() =>
    globalThis.__shell!.handle.calculator.setExpression({ id: "1", latex: "1+2" })
  );
  await expect(toggle(page, "1")).toHaveCount(0);
  await expect(valueLine(page, "1")).toContainText("3");
  await page.evaluate(() =>
    globalThis.__shell!.handle.calculator.setExpression({ id: "1", latex: "0.1+0.2" })
  );
  await expect.poll(() => shownFraction(page, "1")).toBe("3/10");
  await expect(toggle(page, "1")).toHaveAttribute("aria-label", FRACTION);
});

test("R-5 keyboard: Enter and Space on the toggle switch it; Alt+Shift+A (Cmd+Shift+A) switches the focused row and announces it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "hardware keyboard");
  await openShell(page, `?w=1200&h=900&reducedMotion=1&rows=${enc(["\\frac{5}{8}", "1+2"])}`);
  await toggle(page, "1").focus();
  await page.keyboard.press("Enter");
  await expect(toggle(page, "1")).toHaveAttribute("aria-label", FRACTION);
  await expect(toggle(page, "1")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(toggle(page, "1")).toHaveAttribute("aria-label", DECIMAL);

  const { mac } = await shortcutKeys(page);
  const chord = mac ? "Meta+Shift+KeyA" : "Alt+Shift+KeyA";
  await rowField(page, "1").click();
  await page.keyboard.press(chord);
  await expect.poll(() => shownFraction(page, "1")).toBe("5/8");
  await expect.poll(() => announced(page)).toContain("Show as Fraction");
  // the focused row's toggle turns white on the blue tab
  const selected = await toggle(page, "1").evaluate((el) => getComputedStyle(el).opacity);
  expect(selected).toBe("0.9");
  await page.keyboard.press(chord);
  await expect.poll(() => shownFraction(page, "1")).toBeNull();
  await expect.poll(() => announced(page)).toContain("Show as Decimal");
  // the math field kept the keys: no stray A typed
  await frames(page);
  expect(
    await page.evaluate(() => globalThis.__shell!.handle.calculator.getState().expressions[0].latex)
  ).toBe("\\frac{5}{8}");
});

test("R-5 hover and press raise the toggle's opacity to 0.7 and 0.9", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "no hover on touch");
  await openShell(page, `?w=1200&h=900&reducedMotion=1&rows=${enc(["0.25"])}`);
  const opacity = () => toggle(page, "1").evaluate((el) => getComputedStyle(el).opacity);
  await toggle(page, "1").hover();
  await expect.poll(opacity).toBe("0.7");
  await page.mouse.down();
  await expect.poll(opacity).toBe("0.9");
  await page.mouse.up();
  await expect.poll(() => shownFraction(page, "1")).toBe("1/4");
});
