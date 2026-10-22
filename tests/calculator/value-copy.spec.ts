// Owner round of 2026-10-22 in a real calculator on the harness page: a row's value copies on a
// click, a tap, Enter or Space and shows a small "Copied" beside it (R-5), and % types Desmos's
// "% of" from the hardware keyboard and the keypad (T-7).

import { expect, test, type Page } from "@playwright/test";
import { contrastRatio } from "@/lib/calculator/theme/contrast";
import {
  announced,
  enc,
  onBackground,
  openShell,
  rowField,
  toHex,
  useConsoleGuard,
} from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const row = (page: Page, id: string) => page.locator(`#calc [data-row-id="${id}"]`);
const copyButton = (page: Page, id: string) =>
  row(page, id).getByRole("button", { name: "Copy value" });
const note = (page: Page, id: string) => row(page, id).locator(".kc-row-copied");
const latexes = (page: Page) =>
  page.evaluate(() => globalThis.__calculatorHarness!.engine.getExpressions().map((r) => r.latex));

/** Records every clipboard write; `fail` makes each one reject. */
async function recordClipboard(page: Page, fail = false): Promise<void> {
  await page.addInitScript((fail) => {
    const writes: string[] = [];
    (globalThis as unknown as { __writes: string[] }).__writes = writes;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) => {
          writes.push(text);
          return fail ? Promise.reject(new Error("denied")) : Promise.resolve();
        },
      },
    });
    if (fail) Object.defineProperty(document, "execCommand", { value: () => false });
  }, fail);
}
const writes = (page: Page) =>
  page.evaluate(() => (globalThis as unknown as { __writes: string[] }).__writes);

test("R-5 a click or tap on the value copies it and shows Copied just right of the number", async ({
  page,
  isMobile,
}) => {
  await recordClipboard(page);
  await openShell(page, `?w=900&h=600&rows=${enc(["12340+5", "y=x"])}`);
  const button = copyButton(page, "1");
  await (isMobile ? button.tap() : button.click());
  await expect.poll(() => writes(page)).toEqual(["12345"]);
  await expect(note(page, "1")).toHaveText("Copied");
  await expect(note(page, "1").locator("svg")).toHaveCount(1);
  await expect.poll(() => announced(page)).toContain("Copied");
  const value = (await row(page, "1").locator(".kc-row-value-box").boundingBox())!;
  const shown = (await note(page, "1").boundingBox())!;
  expect(shown.x).toBeGreaterThanOrEqual(value.x + value.width);
  expect(shown.x - (value.x + value.width)).toBeLessThan(10);
  expect(Math.abs(shown.y + shown.height / 2 - (value.y + value.height / 2))).toBeLessThan(3);
  const panel = (await page.locator("#calc .kc-list").boundingBox())!;
  expect(shown.x + shown.width).toBeLessThanOrEqual(panel.x + panel.width);
  // a pointer press does not focus the row or draw a ring
  await expect(rowField(page, "1").locator("textarea")).not.toBeFocused();
  expect(await button.evaluate((el) => el.matches(":focus-visible"))).toBe(false);
  // it fades after about 1.2 s and then goes
  await expect(note(page, "1")).toHaveAttribute("data-phase", "leaving", { timeout: 2000 });
  await expect(note(page, "1")).toHaveCount(0);
});

test("R-5 Enter and Space on the focused value copy it, with the keyboard ring", async ({
  page,
}) => {
  await recordClipboard(page);
  await openShell(page, `?w=900&h=600&rows=${enc(["5\\%\\operatorname{of}40"])}&reducedMotion=1`);
  const button = copyButton(page, "1");
  await rowField(page, "1").click();
  await page.keyboard.press("Shift");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => writes(page)).toEqual(["2"]);
  await page.keyboard.press("Space");
  await expect.poll(() => writes(page)).toEqual(["2", "2"]);
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS("outline-style", "solid");
  await expect(note(page, "1")).toBeVisible();
});

test("R-5 the fraction toggle never copies; a row shown as a fraction copies n/d", async ({
  page,
  isMobile,
}) => {
  await recordClipboard(page);
  await openShell(page, `?w=900&h=600&rows=${enc(["\\frac{7}{12}"])}&reducedMotion=1`);
  const toggle = row(page, "1").locator(".kc-row-fraction");
  const press = (l: typeof toggle) => (isMobile ? l.tap() : l.click());
  await press(toggle);
  await expect(row(page, "1").locator(".kc-row-value-fraction")).toBeVisible();
  expect(await writes(page)).toEqual([]);
  await expect(note(page, "1")).toHaveCount(0);
  await press(copyButton(page, "1"));
  await expect.poll(() => writes(page)).toEqual(["7/12"]);
});

test("R-5 a failed copy shows and announces nothing", async ({ page }) => {
  await recordClipboard(page, true);
  await openShell(page, `?w=900&h=600&rows=${enc(["1+1"])}&reducedMotion=1`);
  await copyButton(page, "1").click();
  await expect.poll(() => writes(page)).toEqual(["2"]);
  await page.waitForTimeout(100);
  await expect(note(page, "1")).toHaveCount(0);
  expect(await announced(page)).not.toContain("Copied");
});

test("R-5 the real clipboard gets the value as shown", async ({ page, context }, info) => {
  test.skip(info.project.name !== "calculator-chrome", "clipboard permissions are Chromium's");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openShell(page, `?w=900&h=600&rows=${enc(["-\\frac{1}{8}"])}&reducedMotion=1`);
  await copyButton(page, "1").click();
  await expect(note(page, "1")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("-0.125");
});

test("R-5 reduced motion shows and hides Copied with no fade", async ({ page }) => {
  await recordClipboard(page);
  await openShell(page, `?w=900&h=600&rows=${enc(["1+1"])}&reducedMotion=1`);
  await copyButton(page, "1").click();
  await expect(note(page, "1")).toHaveCSS("transition-duration", "0s");
  await expect(note(page, "1")).toHaveCSS("animation-duration", "0s");
});

for (const skin of ["classic", "charcoal"]) {
  test(`R-5 Copied reads at 4.5:1 or more in ${skin}`, async ({ page }, info) => {
    test.skip(info.project.name !== "calculator-chrome", "computed colours are engine-independent");
    await recordClipboard(page);
    await openShell(page, `?skin=${skin}&w=900&h=600&rows=${enc(["1+1"])}&reducedMotion=1`);
    await copyButton(page, "1").click();
    const [ink, paper] = await note(page, "1").evaluate((el) => [
      getComputedStyle(el).color,
      getComputedStyle(el.closest(".kc-row")!).backgroundColor,
    ]);
    const shown = onBackground(ink, toHex(ink).alpha, paper);
    expect(contrastRatio(shown, toHex(paper).hex)).toBeGreaterThanOrEqual(4.5);
  });
}

test("T-7 typing % writes % of with the caret after it; 5% of 40 shows 2", async ({ page }) => {
  await openShell(page, `?w=900&h=600&rows=${enc([""])}&reducedMotion=1`);
  await rowField(page, "1").click();
  await page.keyboard.type("5%40");
  expect(await latexes(page)).toEqual(["5\\%\\operatorname{of}40"]);
  await expect(rowField(page, "1")).toContainText("% of");
  await expect(row(page, "1").locator(".kc-row-value-box")).toHaveText("2");
  // Backspace takes the 4, the 0, then % of as one unit
  for (let i = 0; i < 3; i++) await page.keyboard.press("Backspace");
  expect(await latexes(page)).toEqual(["5"]);
  // after something that is not a number it still writes % of, as Desmos does
  await page.keyboard.type("+a%");
  expect(await latexes(page)).toEqual(["5+a\\%\\operatorname{of}"]);
});

test("T-7 [5% of a,b] parses and offers sliders for a and b", async ({ page }) => {
  await openShell(page, `?w=900&h=600&rows=${enc([""])}&reducedMotion=1`);
  await rowField(page, "1").click();
  await page.keyboard.type("[5%a,b");
  expect(await latexes(page)).toEqual(["\\left[5\\%\\operatorname{of}a,b\\right]"]);
  await expect(
    row(page, "1").getByRole("group", { name: "add slider:" }).getByRole("button")
  ).toHaveText(["a", "b", "all"]);
});

test("T-7 the keypad's % key (Shift on the letters page) types % of too", async ({ page }) => {
  await page.goto(`/harness/editor.html?rows=${enc(["5"])}&keypad=open`);
  const field = page.getByRole("textbox", { name: "Expression 1", exact: true });
  await field.focus();
  await page.keyboard.press("End");
  const keypad = page.getByRole("region", { name: "Keypad" });
  for (const name of ["ABC", "Shift", "%", "Toggle Numbers", "4"])
    await keypad.getByRole("button", { name, exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().rows[0].latex)
    )
    .toBe("5\\%\\operatorname{of}4");
});
