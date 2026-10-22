// The row tools in a real calculator on the harness page: Desmos's add-slider line under a row
// with undefined names (owner, 2026-10-22; pointer, tap, keyboard, sizes, hover, themes), and the
// owner's choices of 2026-10-21: the DEG/RAD badge of trig rows, short error copy in the marker's
// tooltip, and no decimal/fraction toggle on a regression parameter.

import { expect, test, type Page } from "@playwright/test";
import { contrastRatio } from "@/lib/calculator/theme/contrast";
import {
  announced,
  enc,
  frames,
  onBackground,
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

const line = (page: Page, id: string) => row(page, id).getByRole("group", { name: "add slider:" });

test("R-6 y=mx+b shows add slider: m, b, all under the math at Desmos's sizes, all in the accent", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=mx+b", "y=2x"])}&reducedMotion=1`);
  await expect(
    row(page, "1").getByRole("button", { name: "Add sliders", exact: true })
  ).toHaveCount(0);
  const buttons = line(page, "1").getByRole("button");
  await expect(buttons).toHaveText(["m", "b", "all"]);
  const rowBox = (await row(page, "1").boundingBox())!;
  const boxes = await Promise.all(
    [0, 1, 2].map(async (i) => (await buttons.nth(i).boundingBox())!)
  );
  // live Desmos 2026-10-22: 35 by 26 buttons, 3 px apart, the first 64.1 px past the math's edge
  for (const b of boxes) {
    expect(b.width).toBeCloseTo(35, 0);
    expect(b.height).toBeCloseTo(26, 0);
  }
  expect(boxes[1].x - boxes[0].x).toBeCloseTo(38, 0);
  expect(boxes[2].x - boxes[1].x).toBeCloseTo(38, 0);
  expect(boxes[0].x - rowBox.x).toBeCloseTo(117.1, 0);
  expect(boxes[0].y - rowBox.y).toBeGreaterThan(47);
  expect(boxes[0].y - rowBox.y).toBeLessThan(50);
  // the line makes the row 27 px taller than a one-line row, as on Desmos (83.2 against 56.2)
  expect(await height(page, "1")).toBeCloseTo(83.2, 0);
  const label = line(page, "1").getByText("add slider:");
  await expect(label).toHaveCSS("font-size", "12.8px");
  await expect(buttons.nth(0)).toHaveCSS("font-style", "italic");
  await expect(buttons.nth(2)).toHaveCSS("font-style", "normal");
  await expect(buttons.nth(2)).toHaveCSS("background-color", "rgb(47, 114, 220)");
  await expect(buttons.nth(2)).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(buttons.nth(0)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(line(page, "2")).toHaveCount(0);
});

test("R-6 typing a name in shows one accent button and no all; taking it out removes the line", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=2x"])}&reducedMotion=1`);
  await rowField(page, "1").click();
  await page.keyboard.press("End");
  await page.keyboard.type("+k");
  const k = line(page, "1").getByRole("button");
  await expect(k).toHaveText(["k"]);
  await expect(k).toHaveAttribute("data-tone", "accent");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await expect(line(page, "1")).toHaveCount(0);
});

test("R-6 a desktop hover darkens the buttons as Desmos does; a click adds and leaves no focus ring", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "hover is desktop-only");
  await openShell(page, `?w=900&h=600&rows=${enc(["y=mx+b"])}&reducedMotion=1`);
  const m = line(page, "1").getByRole("button", { name: "Add slider for m" });
  const all = line(page, "1").getByRole("button", { name: "Add sliders for all" });
  await m.hover();
  await expect(m).toHaveCSS("background-image", "none");
  await all.hover();
  // Desmos: rgb(42, 103, 198), the accent 10 % toward the ink
  await expect
    .poll(async () => toHex(await all.evaluate((el) => getComputedStyle(el).backgroundColor)).hex)
    .toBe("#2a67c6");
  await m.click();
  expect(await latexes(page)).toEqual(["y=mx+b", "m=1"]);
  const b = line(page, "1").getByRole("button");
  await expect(b).toHaveText(["b"]); // one name left: one accent button
  await expect(b).toHaveAttribute("data-tone", "accent");
  const ring = await b.evaluate((el) => el.matches(":focus-visible"));
  expect(ring).toBe(false);
});

test("R-6, SLIDERS-8 Tab goes math, delete, m, b, all; Enter on all adds both and returns to the math", async ({
  page,
}, info) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=mx+b"])}&reducedMotion=1`);
  const all = line(page, "1").getByRole("button", { name: "Add sliders for all" });
  if (info.project.name === "calculator-chrome") {
    await rowField(page, "1").click();
    const names: string[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      names.push(
        await page.evaluate(
          () =>
            document.querySelector("#calc")!.shadowRoot!.activeElement!.getAttribute("aria-label")!
        )
      );
    }
    expect(names).toEqual([
      "Delete expression 1",
      "Add slider for m",
      "Add slider for b",
      "Add sliders for all",
    ]);
    await expect(all).toHaveCSS("outline-style", "solid");
    await expect(all).toHaveCSS("outline-width", "2px");
  } else await all.focus();
  await page.keyboard.press("Enter");
  expect(await latexes(page)).toEqual(["y=mx+b", "m=1", "b=1"]);
  await expect(rowField(page, "1").locator("textarea")).toBeFocused();
  await expect(line(page, "1")).toHaveCount(0);
});

test("R-6 on a phone a tap on a name adds its slider", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch runs on the phone projects");
  await openShell(page, `?w=390&h=844&rows=${enc(["y=mx+b"])}&reducedMotion=1`);
  const buttons = line(page, "1").getByRole("button");
  await expect(buttons).toHaveText(["m", "b", "all"]);
  expect((await buttons.nth(0).boundingBox())!.width).toBeCloseTo(35, 0);
  await line(page, "1").getByRole("button", { name: "Add slider for b" }).tap();
  expect(await latexes(page)).toEqual(["y=mx+b", "b=1"]);
  await line(page, "1").getByRole("button", { name: "Add slider for m" }).tap();
  expect(await latexes(page)).toEqual(["y=mx+b", "m=1", "b=1"]);
  await expect(line(page, "1")).toHaveCount(0);
});

for (const skin of ["classic", "charcoal"]) {
  test(`R-6 the add-slider line reads at 4.5:1 or more in ${skin}`, async ({ page }, info) => {
    test.skip(info.project.name !== "calculator-chrome", "computed colours are engine-independent");
    await openShell(page, `?skin=${skin}&w=900&h=600&rows=${enc(["y=mx+b"])}&reducedMotion=1`);
    const paper = await row(page, "1").evaluate((el) => getComputedStyle(el).backgroundColor);
    const label = await line(page, "1")
      .getByText("add slider:")
      .evaluate((el) => getComputedStyle(el).color);
    const shown = onBackground(label, toHex(label).alpha, paper);
    expect(contrastRatio(shown, toHex(paper).hex)).toBeGreaterThanOrEqual(4.5);
    for (const name of ["Add slider for m", "Add sliders for all"]) {
      const [ink, fill] = await line(page, "1")
        .getByRole("button", { name })
        .evaluate((el) => {
          const s = getComputedStyle(el);
          const solid = s.backgroundColor !== "rgba(0, 0, 0, 0)";
          return [
            s.color,
            solid ? s.backgroundColor : getComputedStyle(el.closest(".kc-row")!).backgroundColor,
          ];
        });
      expect(contrastRatio(toHex(ink).hex, toHex(fill).hex)).toBeGreaterThanOrEqual(4.5);
    }
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

test("R-5 a click or tap on the fraction toggle draws no focus ring; the keyboard does", async ({
  page,
  isMobile,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["\\frac{1}{2}"])}&reducedMotion=1`);
  const toggle = row(page, "1").locator(".kc-row-fraction");
  const ring = (el: typeof toggle) =>
    el.evaluate((e) => ({
      style: getComputedStyle(e).outlineStyle,
      visible: e.matches(":focus-visible"),
    }));
  await (isMobile ? toggle.tap() : toggle.click());
  expect(await ring(toggle)).toEqual({ style: "none", visible: false });
  if (isMobile) return;
  // a keyboard user arriving on the toggle (WebKit does not Tab to buttons by default)
  await rowField(page, "1").click();
  await page.keyboard.press("Shift");
  await toggle.focus();
  await expect(toggle).toBeFocused();
  expect(await ring(toggle)).toEqual({ style: "solid", visible: true });
});
