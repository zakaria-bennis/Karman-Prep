// Owner decisions of 2026-10-21 on the graph, in the browser: the phone keypad keeps the graph in
// view (a graph touch shrinks it to a bar and the touch goes on to pan, trace or open a label; a
// keypad over the graph keeps the view centred above it), Zoom to fit under Home (mouse, touch,
// keyboard and theme), Desmos's wheel (deltaX, origin snap; measured live 2026-10-21) and the
// one-time curve hint. On the harness page /harness/calculator.html.

import { expect, test, type Page } from "@playwright/test";
import { at, Finger } from "./graph-touch";
import { enc, keypadOpen, openShell, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const viewport = (page: Page) =>
  page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().viewport);
const plotted = (page: Page, id: string) =>
  page.waitForFunction((id) => {
    const s = globalThis.__calculatorHarness!.engine.getSnapshot();
    return s.view !== null && s.geometry.get(id) !== undefined;
  }, id);
const keypad = (page: Page) => page.locator("#calc .kc-keypad");
const fitButton = (page: Page) =>
  page.locator("#calc").getByRole("button", { name: "Zoom to fit" });
const homeButton = (page: Page) => page.locator("#calc").getByRole("button", { name: "Home" });
const hint = (page: Page) => page.locator("#calc [data-curve-hint]");

/** Opens the keypad the way a phone does: a tap on row `id`. */
async function tapRow(page: Page, id: string): Promise<void> {
  await page.locator(`#calc [data-row-id="${id}"] .mq-editable-field`).tap();
  await expect.poll(() => keypadOpen(page)).toBe(true);
  await expect(keypad(page)).toHaveAttribute("data-open", "true");
}

test.describe("phone keypad and the graph", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "a phone needs touch"));

  test("a graph touch shrinks the open keypad to a Show keypad bar and pans; the bar brings the keys back", async ({
    page,
    browserName,
  }) => {
    await openShell(page, `?rows=${enc(["y=x^2-4"])}`);
    await plotted(page, "1");
    await tapRow(page, "1");
    const finger = new Finger(page, true, browserName);
    const before = await viewport(page);
    const start = await at(page, -7, 6);
    await finger.down(start);
    for (let i = 1; i <= 6; i++) await finger.move([start[0] + 10 * i, start[1]]);
    await finger.up();
    await expect(keypad(page)).toHaveAttribute("data-minimized", "true");
    expect(await keypadOpen(page)).toBe(true);
    await expect.poll(async () => (await viewport(page)).left).toBeLessThan(before.left - 1);
    const bar = keypad(page).getByRole("button", { name: "Show keypad" });
    await expect(bar).toBeVisible();
    expect((await bar.boundingBox())!.height).toBeLessThan(40);
    await expect(keypad(page).locator('[data-key="squared"]')).toBeHidden();
    await bar.tap();
    await expect(keypad(page)).not.toHaveAttribute("data-minimized", "true");
    await expect(keypad(page).locator('[data-key="squared"]')).toBeVisible();
  });

  test("with the keypad open a touch near the curve traces it and a touch near a point of interest opens its label", async ({
    page,
    browserName,
  }) => {
    await openShell(page, `?rows=${enc(["y=x^2-4"])}`);
    await plotted(page, "1");
    await tapRow(page, "1");
    const finger = new Finger(page, true, browserName);
    const [x, y] = await at(page, 2.5, 2.25);
    await finger.down([x + 12, y]); // within the 20 px touch reach of the curve
    await expect(page.locator("#calc [data-trace-label]")).toBeVisible();
    await finger.move([x + 22, y - 30]);
    await finger.up();
    await expect(keypad(page)).toHaveAttribute("data-minimized", "true");
    // The traced row is selected, so its points of interest show; the vertex is (0, −4).
    await expect
      .poll(() =>
        page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().poi?.points.length)
      )
      .toBeGreaterThan(0);
    const vertex = await at(page, 0, -4);
    await finger.tap([vertex[0] + 8, vertex[1] + 8]);
    await expect(page.locator("#calc [data-poi-label]")).toHaveCount(1);
  });

  test("a keypad lying over the graph (a phone on its side) centres the view above it; closing restores it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await openShell(page, `?rows=${enc(["y=x"])}`);
    await plotted(page, "1");
    const home = await viewport(page);
    await tapRow(page, "1");
    const covered = await page.evaluate(() => {
      const root = document.querySelector("#calc")!.shadowRoot!;
      const g = root.querySelector(".kc-graph-region")!.getBoundingClientRect();
      const k = root.querySelector(".kc-keypad-region")!.getBoundingClientRect();
      return Math.round(g.bottom - k.top);
    });
    expect(covered).toBeGreaterThan(100);
    // The world point at the old centre now sits mid-way in the visible part above the keypad
    // (to a px: the cover is measured in whole px).
    const height = await page.evaluate(
      () => globalThis.__calculatorHarness!.engine.getSnapshot().view!.size.height
    );
    await expect
      .poll(async () => {
        const v = await viewport(page);
        const centre = (home.top + home.bottom) / 2;
        const py = ((v.top - centre) / (v.top - v.bottom)) * height;
        return Math.abs(py - (height - covered) / 2) <= 1;
      })
      .toBe(true);
    await expect(homeButton(page)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect.poll(() => keypadOpen(page)).toBe(false);
    await expect.poll(async () => (await viewport(page)).top).toBeCloseTo(home.top, 6);
    expect((await viewport(page)).bottom).toBeCloseTo(home.bottom, 6);
  });
});

test.describe("Zoom to fit", () => {
  test("sits under Home with its own name and tooltip, fits every curve's key points, and works from the keyboard", async ({
    page,
    isMobile,
  }) => {
    await openShell(page, `?rows=${enc(["y=x^2-4", "x^2+y^2=9", "(5,1)"])}`);
    await plotted(page, "1");
    await plotted(page, "2");
    await plotted(page, "3");
    const fit = fitButton(page);
    await expect(fit).toBeVisible();
    expect(await fit.getAttribute("title")).toBe("Zoom to fit");
    if (isMobile) await fit.tap();
    else await fit.click();
    // Key points: zeros ±2, the vertex (0, −4), the circle's extent ±3, the meetings and (5, 1).
    await expect
      .poll(async () => {
        const v = await viewport(page);
        return [v.left < -3, v.right > 5, v.bottom < -4, v.top > 3, v.right - v.left < 20];
      })
      .toEqual([true, true, true, true, true]);
    const v = await viewport(page);
    const size = await page.evaluate(
      () => globalThis.__calculatorHarness!.engine.getSnapshot().view!.size
    );
    // Units per px stay equal on both axes, so the circle stays round.
    expect((v.top - v.bottom) / size.height).toBeCloseTo((v.right - v.left) / size.width, 9);
    await expect(homeButton(page)).toBeVisible();
    const controls = page.locator("#calc .kc-graph-controls > button");
    await expect(controls.last()).toHaveAttribute("data-graph-fit", "");
    await expect(controls.nth((await controls.count()) - 2)).toHaveAttribute("data-graph-home", "");
    const homeBox = (await homeButton(page).boundingBox())!;
    const fitBox = (await fit.boundingBox())!;
    expect(fitBox.y).toBeGreaterThan(homeBox.y + homeBox.height);
    expect(Math.round(fitBox.width)).toBe(Math.round(homeBox.width));
    // Keyboard: Home, then Tab to Zoom to fit and Enter.
    await homeButton(page).click();
    await expect(homeButton(page)).toHaveCount(0);
    await fit.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => (await viewport(page)).right - (await viewport(page)).left)
      .toBeLessThan(20);
  });

  test("is absent with nothing graphed, and takes the pill colours of every theme", async ({
    page,
  }) => {
    await openShell(page);
    await page.waitForLoadState("networkidle");
    await expect(fitButton(page)).toHaveCount(0);
    for (const skin of ["classic", "observatory"]) {
      await openShell(page, `?skin=${skin}&rows=${enc(["y=x"])}`);
      await plotted(page, "1");
      await page.waitForLoadState("networkidle");
      const colours = await page.evaluate(() => {
        const root = document.querySelector("#calc")!.shadowRoot!;
        const read = (sel: string) => {
          const s = getComputedStyle(root.querySelector(sel)!);
          return [s.backgroundColor, s.color, s.borderTopColor];
        };
        return { fit: read("[data-graph-fit]"), settings: read(".kc-graph-controls > button") };
      });
      expect(colours.fit).toEqual(colours.settings);
    }
  });
});

test.describe("graph gestures as Desmos (measured live 2026-10-21)", () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, "a wheel needs a mouse"));

  test("a sideways wheel zooms by 17/16 a step, and zooming in near the origin anchors on it", async ({
    page,
  }) => {
    await openShell(page, `?w=800&h=600&rows=${enc(["y=x"])}`);
    await plotted(page, "1");
    const v0 = await viewport(page);
    const [px, py] = await at(page, 5, 5);
    await page.mouse.move(px, py);
    await page.mouse.wheel(100, 0);
    await expect
      .poll(
        async () =>
          ((await viewport(page)).right - (await viewport(page)).left) / (v0.right - v0.left)
      )
      .toBeCloseTo(17 / 16, 6);
    await homeButton(page).click();
    await expect(homeButton(page)).toHaveCount(0);
    const [ox, oy] = await at(page, 0, 0);
    await page.mouse.move(ox + 30, oy - 20);
    await page.mouse.wheel(0, -100);
    await expect.poll(async () => (await viewport(page)).left).toBeCloseTo(v0.left * (16 / 17), 6);
    const v = await viewport(page);
    expect(v.right).toBeCloseTo(v0.right * (16 / 17), 6);
  });
});

test.describe("curve hint", () => {
  test("shows once, the first time a student graphs a curve, and goes on the next press", async ({
    page,
    isMobile,
  }) => {
    await openShell(page);
    const field = page.locator('#calc [data-row-id="1"] .mq-editable-field');
    if (isMobile) await field.tap();
    else await field.click();
    await page.keyboard.type("y=x");
    await plotted(page, "1");
    await expect(hint(page)).toHaveText(
      isMobile ? "Tap a curve to see key points" : "Click a curve to see key points"
    );
    expect(
      await page.evaluate(() => localStorage.getItem("karman-calculator:curve-hint-seen"))
    ).toBe("1");
    // A press on the graph puts it away; it never takes a press itself.
    await expect(hint(page)).toHaveCSS("pointer-events", "none");
    const [x, y] = await at(page, -7, 5);
    if (isMobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await expect(hint(page)).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    // Never again, even after a reload.
    await openShell(page);
    if (isMobile) await field.tap();
    else await field.click();
    await page.keyboard.type("y=2x");
    await plotted(page, "1");
    await page.waitForTimeout(300);
    await expect(hint(page)).toHaveCount(0);
  });

  test("a preset graph never shows it", async ({ page }) => {
    await openShell(page, `?rows=${enc(["y=x^2"])}`);
    await plotted(page, "1");
    await page.waitForTimeout(300);
    await expect(hint(page)).toHaveCount(0);
  });
});
