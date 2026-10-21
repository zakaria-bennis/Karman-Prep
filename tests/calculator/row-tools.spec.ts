// The row tools the owner chose on 2026-10-21, in a real calculator on the harness page: the
// add-sliders icon under a row's warning marker and its menu (pointer, tap, keyboard, Escape,
// tooltip, row height, themes), the DEG/RAD badge of trig rows, short error copy in the marker's
// tooltip, and no decimal/fraction toggle on a regression parameter.

import { expect, test, type Page } from "@playwright/test";
import { contrastRatio } from "@/lib/calculator/theme/contrast";
import {
  announced,
  enc,
  frames,
  openShell,
  rowField,
  shortcutKeys,
  toHex,
  useConsoleGuard,
} from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const row = (page: Page, id: string) => page.locator(`#calc [data-row-id="${id}"]`);
const latexes = (page: Page) =>
  page.evaluate(() => globalThis.__calculatorHarness!.engine.getExpressions().map((r) => r.latex));
const height = (page: Page, id: string) =>
  row(page, id).evaluate((el) => el.getBoundingClientRect().height);

test("R-6 the add-sliders icon sits under the warning marker, has no words, and keeps the row's height", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=mx+b", "y=2x"])}&reducedMotion=1`);
  const icon = row(page, "1").getByRole("button", { name: "Add sliders" });
  await expect(icon).toBeVisible();
  await expect(icon).toHaveText("");
  await expect(icon).toHaveAttribute("aria-haspopup", "menu");
  const marker = (await row(page, "1").getByRole("button", { name: "Error" }).boundingBox())!;
  const box = (await icon.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(marker.y + marker.height - 1);
  expect(Math.abs(box.x + box.width / 2 - (marker.x + marker.width / 2))).toBeLessThan(3);
  const gutter = (await row(page, "1").locator(".kc-row-gutter").boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(gutter.y + gutter.height);
  expect(await height(page, "1")).toBeCloseTo(await height(page, "2"), 1);
  await expect(row(page, "1").getByText("add slider")).toHaveCount(0);
  await expect(row(page, "2").getByRole("button", { name: "Add sliders" })).toHaveCount(0);
});

test("R-6 typing a name in and out never changes the row's height", async ({ page }) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=2x"])}&reducedMotion=1`);
  const before = await height(page, "1");
  await rowField(page, "1").click();
  await page.keyboard.press("End");
  await page.keyboard.type("+k");
  await expect(row(page, "1").getByRole("button", { name: "Add sliders" })).toBeVisible();
  expect(await height(page, "1")).toBeCloseTo(before, 1);
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await expect(row(page, "1").getByRole("button", { name: "Add sliders" })).toHaveCount(0);
  expect(await height(page, "1")).toBeCloseTo(before, 1);
});

test("R-6 a desktop hover shows the Add sliders tooltip; a click opens the menu, Escape closes it", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "hover tooltips are desktop-only");
  await openShell(page, `?w=900&h=600&rows=${enc(["y=mx+b"])}&reducedMotion=1`);
  const icon = row(page, "1").getByRole("button", { name: "Add sliders" });
  await icon.hover();
  await expect(page.locator("#calc .kc-row-tip")).toHaveText("Add sliders");
  await icon.click();
  await expect(page.locator("#calc .kc-row-tip")).toHaveCount(0);
  const menu = page.getByRole("menu", { name: "Add sliders" });
  await expect(menu.getByRole("menuitem")).toHaveText(["all", "m", "b"]);
  await expect(icon).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(icon).toHaveAttribute("aria-expanded", "false");
});

test("R-6 the keyboard reaches the icon, opens the menu, moves with arrows and picks with Enter", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=mx+b"])}&reducedMotion=1`);
  const icon = row(page, "1").getByRole("button", { name: "Add sliders" });
  await icon.focus();
  await page.keyboard.press("Enter");
  const all = page.getByRole("menuitem", { name: "Add sliders for all" });
  await expect(all).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(icon).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(all).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitem", { name: "Add slider for b" })).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await latexes(page)).toEqual(["y=mx+b", "b=1"]);
});

test("R-6 on a phone a tap opens the menu and a tap on a name adds its slider", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "touch runs on the phone projects");
  await openShell(page, `?w=390&h=844&rows=${enc(["y=kx"])}&reducedMotion=1`);
  await row(page, "1").getByRole("button", { name: "Add sliders" }).tap();
  const k = page.getByRole("menuitem", { name: "Add slider for k" });
  await expect(page.getByRole("menuitem")).toHaveCount(1);
  await expect(page.locator("#calc .kc-row-tip")).toHaveCount(0);
  await k.tap();
  expect(await latexes(page)).toEqual(["y=kx", "k=1"]);
  await expect(row(page, "1").getByRole("button", { name: "Add sliders" })).toHaveCount(0);
});

for (const skin of ["classic", "charcoal"]) {
  test(`R-6 the menu reads at 4.5:1 or more and the icon at 3:1 or more in ${skin}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "calculator-chrome", "computed colours are engine-independent");
    await openShell(page, `?skin=${skin}&w=900&h=600&rows=${enc(["y=mx+b"])}&reducedMotion=1`);
    const icon = row(page, "1").getByRole("button", { name: "Add sliders" });
    const [ink, opacity, tab] = await icon.evaluate((el) => {
      const gutter = el.closest(".kc-row-gutter")!;
      return [
        getComputedStyle(el).color,
        Number(getComputedStyle(el).opacity),
        getComputedStyle(gutter).backgroundColor,
      ];
    });
    const blended = (await page.evaluate(
      ([c, a, b]) => {
        const canvas = new OffscreenCanvas(1, 1).getContext("2d")!;
        canvas.fillStyle = b as string;
        canvas.fillRect(0, 0, 1, 1);
        canvas.globalAlpha = a as number;
        canvas.fillStyle = c as string;
        canvas.fillRect(0, 0, 1, 1);
        const [r, g, bl] = canvas.getImageData(0, 0, 1, 1).data;
        return `rgb(${r}, ${g}, ${bl})`;
      },
      [ink, opacity, tab]
    )) as string;
    expect(contrastRatio(toHex(blended).hex, toHex(tab).hex)).toBeGreaterThanOrEqual(3);
    await icon.click();
    const item = page.getByRole("menuitem", { name: "Add sliders for all" });
    const [text, paper] = await item.evaluate((el) => [
      getComputedStyle(el).color,
      getComputedStyle(el.closest(".kc-add-sliders-menu")!).backgroundColor,
    ]);
    expect(contrastRatio(toHex(text).hex, toHex(paper).hex)).toBeGreaterThanOrEqual(4.5);
  });
}

test("R-11 a trig row shows DEG or RAD after its value or at its end, following the setting; other rows show none", async ({
  page,
  isMobile,
}) => {
  await openShell(
    page,
    `?w=900&h=600&rows=${enc(["\\sin(2)", "y=\\arctan(x)", "y=x^2", "\\sinh(1)", "\\cos^{-1}(0.5)"])}&reducedMotion=1`
  );
  const badge = (id: string) => row(page, id).locator(".kc-angle-badge");
  await expect(badge("1")).toHaveText("RAD");
  await expect(badge("1")).toHaveAttribute("data-placement", "value");
  await expect(badge("2")).toHaveText("RAD");
  await expect(badge("2")).toHaveAttribute("data-placement", "row");
  await expect(badge("3")).toHaveCount(0);
  await expect(badge("4")).toHaveCount(0);
  await expect(badge("5")).toHaveText("RAD");
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.updateSettings({ angleMode: "degrees" })
  );
  await expect(badge("1")).toHaveText("DEG");
  await expect(badge("2")).toHaveText("DEG");
  await expect(badge("1")).not.toHaveAttribute("tabindex");
  if (!isMobile) {
    await badge("2").hover();
    await expect(page.locator("#calc .kc-row-tip")).toHaveText(
      "Angle mode. Change it in Settings."
    );
  }
});

test("R-2 errors read in short plain English in the marker's tooltip", async ({ page }) => {
  await openShell(
    page,
    `?w=900&h=600&rows=${enc(["\\operatorname{nCr}(5)", "1+", "y=kx"])}&reducedMotion=1`
  );
  const tip = (id: string) =>
    row(page, id)
      .getByRole("button", { name: "Error" })
      .evaluate(
        (el) =>
          (el.getRootNode() as ShadowRoot).getElementById(el.getAttribute("aria-describedby")!)!
            .textContent
      );
  expect(await tip("1")).toBe("nCr needs 2 inputs, like nCr(1, 2).");
  expect(await tip("2")).toBe("'+' needs something on both sides.");
  expect(await tip("3")).toBe("k is not defined.");
});

test("R-5 a regression parameter row shows its value with no decimal/fraction toggle", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=x"])}&reducedMotion=1`);
  await page.evaluate(() => {
    const c = globalThis.__shell!.handle.calculator;
    c.setState({
      ...c.getState(),
      expressions: [
        {
          id: "t",
          type: "table",
          columns: [
            { latex: "x_{1}", values: ["1", "2", "3"] },
            { latex: "y_{1}", values: ["2", "4", "6.5"] },
          ],
        },
        { id: "r", latex: "y_{1}\\sim mx_{1}+b" },
        { id: "m", latex: "m" },
        { id: "h", latex: "\\frac{1}{2}" },
      ] as ReturnType<typeof c.getState>["expressions"],
    });
  });
  await expect(row(page, "m").locator(".kc-row-value")).toHaveText(/2\.25/);
  await expect(row(page, "m").locator(".kc-row-fraction")).toHaveCount(0);
  await expect(row(page, "h").locator(".kc-row-fraction")).toHaveCount(1);
});

test("R-5 Alt+Shift+A (Cmd+Shift+A) on a regression parameter row does nothing and announces nothing", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "hardware keyboard");
  await openShell(page, `?w=900&h=600&rows=${enc(["y=x"])}&reducedMotion=1`);
  await page.evaluate(() => {
    const c = globalThis.__shell!.handle.calculator;
    c.setState({
      ...c.getState(),
      expressions: [
        {
          id: "t",
          type: "table",
          columns: [
            { latex: "x_{1}", values: ["1", "2", "3"] },
            { latex: "y_{1}", values: ["2", "4", "6.5"] },
          ],
        },
        { id: "r", latex: "y_{1}\\sim mx_{1}+b" },
        { id: "m", latex: "m" },
      ] as ReturnType<typeof c.getState>["expressions"],
    });
  });
  await expect(row(page, "m").locator(".kc-row-value")).toHaveText(/2\.25/);
  const { mac } = await shortcutKeys(page);
  await rowField(page, "m").click();
  const before = await announced(page);
  await page.keyboard.press(mac ? "Meta+Shift+KeyA" : "Alt+Shift+KeyA");
  await frames(page);
  await expect(row(page, "m").locator(".kc-row-value")).toHaveText(/2\.25/);
  await expect(row(page, "m").locator(".kc-row-value-fraction")).toHaveCount(0);
  expect(await announced(page)).toEqual(before);
  const m = await page.evaluate(() =>
    globalThis.__shell!.handle.calculator.getState().expressions.find((e) => e.id === "m")
  );
  expect(m).toMatchObject({ latex: "m" });
  expect(m).not.toHaveProperty("displayEvaluationAsFraction");
});

test("R-6, R-5 a click or tap on the slider icon or the fraction toggle draws no focus ring; the keyboard does", async ({
  page,
  isMobile,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=mx+b", "\\frac{1}{2}"])}&reducedMotion=1`);
  const icon = row(page, "1").getByRole("button", { name: "Add sliders" });
  const toggle = row(page, "2").locator(".kc-row-fraction");
  const ring = (el: typeof icon) =>
    el.evaluate((e) => ({
      style: getComputedStyle(e).outlineStyle,
      visible: e.matches(":focus-visible"),
    }));
  const press = (el: typeof icon) => (isMobile ? el.tap() : el.click());
  await press(toggle);
  expect(await ring(toggle)).toEqual({ style: "none", visible: false });
  await press(icon);
  await expect(page.getByRole("menu")).toBeVisible();
  expect(await ring(icon)).toEqual({ style: "none", visible: false });
  await press(icon);
  await expect(page.getByRole("menu")).toHaveCount(0);
  expect(await ring(icon)).toEqual({ style: "none", visible: false });
  if (isMobile) return;
  // a keyboard user arriving on the toggle (WebKit does not Tab to buttons by default)
  await rowField(page, "2").click();
  await page.keyboard.press("Shift");
  await toggle.focus();
  await expect(toggle).toBeFocused();
  expect(await ring(toggle)).toEqual({ style: "solid", visible: true });
});
