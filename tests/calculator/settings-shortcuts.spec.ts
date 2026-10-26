// Graph settings additions and the Keyboard Shortcuts dialog in the browser (SETTINGS-11, -12,
// -20, -32, -33), on the harness page /harness/calculator.html.

import { expect, test, type Page } from "@playwright/test";
import {
  announced,
  enc,
  openSettings,
  openShell,
  rowField,
  useConsoleGuard,
} from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const viewport = (page: Page) =>
  page.evaluate(() => globalThis.__shell!.handle.calculator.getState().viewport);

test("SETTINGS-33 Mod+/ opens the Keyboard Shortcuts dialog over the calculator; Escape closes it and focus returns", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  await rowField(page, "1").click();
  await page.keyboard.press("ControlOrMeta+Slash");
  const dialog = page.getByRole("dialog", { name: "Keyboard Shortcuts" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Common Actions" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(rowField(page, "1")).toHaveClass(/mq-focused/);
  // The calculator is still open: that Escape closed only the dialog.
  await expect(page.locator("#calc [data-kc-layout]")).toBeAttached();
});

test("SETTINGS-32 Mod+Alt+G opens Graph settings on the Text Size slider and closes it again", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  await rowField(page, "1").click();
  const isMac = await page.evaluate(() => /^Mac/.test(navigator.platform));
  const combo = isMac ? "Control+Meta+KeyG" : "Control+Alt+KeyG";
  await page.keyboard.press(combo);
  await expect(page.getByRole("slider", { name: "Text Size" })).toBeFocused();
  await page.keyboard.press(combo);
  await expect(page.getByRole("region", { name: "Graph Settings" })).toHaveCount(0);
  // Closing puts focus on the Settings button, as Escape does.
  await expect(page.getByRole("button", { name: "Graph settings" })).toBeFocused();
});

test("SETTINGS-32 the single-modifier =, - and 0 zoom in, zoom out and restore the default view, announced", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  await rowField(page, "1").click();
  const isMac = await page.evaluate(() => /^Mac/.test(navigator.platform));
  const mod = isMac ? "Control" : "Alt";
  const right = async () => (await viewport(page)).right;
  await page.keyboard.press(`${mod}+Equal`);
  await expect.poll(right).toBe(5);
  await page.keyboard.press(`${mod}+Minus`);
  await page.keyboard.press(`${mod}+Minus`);
  await expect.poll(right).toBe(20);
  await page.keyboard.press(`${mod}+Digit0`);
  await expect.poll(right).toBe(10);
  expect(await announced(page)).toEqual(
    expect.arrayContaining(["Graph zoom in", "Graph zoom out", "Graph viewport default"])
  );
  // The row was not typed into.
  expect(
    await page.evaluate(() => globalThis.__shell!.handle.calculator.getExpressions()[0].latex)
  ).toBe("y=x");
});

test("SETTINGS-24 a bound applies as it is typed; an out-of-order bound marks the pair and keeps the last valid view", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  await openSettings(page);
  const max = page.getByRole("textbox", { name: /^X Axis Maximum:/ });
  await max.focus();
  await page.keyboard.press("ControlOrMeta+KeyA");
  await page.keyboard.type("-2");
  await expect.poll(async () => (await viewport(page)).right).toBe(-2);
  await page.keyboard.type("0");
  const min = page.getByRole("textbox", { name: /^X Axis Minimum:/ });
  await expect(min).toHaveAttribute("aria-invalid", "true");
  await expect(min).toHaveAccessibleName(/expression has error$/);
  expect((await viewport(page)).right).toBe(-2);
  // Closing drops the invalid text; reopened, the fields show the view.
  await page.keyboard.press("Escape");
  await openSettings(page);
  await expect(page.getByRole("textbox", { name: "X Axis Maximum: negative 2" })).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: /^X Axis Minimum:/ })).not.toHaveAttribute(
    "aria-invalid"
  );
});

test("SETTINGS-11 the Text Size slider has seven notches, starts on the marked default and sets the list math at each", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  // WebKit reports 16.190001px for 16.19px, so sizes are compared to the hundredth.
  const size = () =>
    rowField(page, "1").evaluate(
      (el) => `${Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100}px`
    );
  expect(await size()).toBe("20.24px");
  await openSettings(page);
  const slider = page.getByRole("slider", { name: "Text Size" });
  await expect(slider).toBeFocused(); // SETTINGS-32: opening focuses the first control
  await expect(slider).toHaveAttribute("aria-valuetext", "Size 3 of 7, default");
  const notches = page.locator("#calc .kc-size-notch");
  await expect(notches).toHaveCount(7);
  await expect(notches.nth(2)).toHaveAttribute("data-default", "true");
  await expect(page.locator("#calc .kc-size-notch[data-default]")).toHaveCount(1);
  await page.keyboard.press("Home");
  await expect.poll(size).toBe("16.19px");
  const seen = [await size()];
  for (let n = 2; n <= 7; n++) {
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveValue(String(n));
    seen.push(await size());
  }
  expect(seen).toEqual([
    "16.19px",
    "18.22px",
    "20.24px",
    "23.28px",
    "26.4px",
    "29.35px",
    "32.38px",
  ]);
  await page.keyboard.press("ArrowRight"); // the last notch is the end
  await expect(slider).toHaveValue("7");
  await expect(slider).toHaveAttribute("aria-valuetext", "Size 7 of 7");
});

test("SETTINGS-20 Lock Viewport stops dragging and the wheel and removes the zoom buttons", async ({
  page,
  browserName,
  isMobile,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  await openSettings(page);
  await page.getByRole("button", { name: "More Options" }).click();
  await page.getByRole("checkbox", { name: "Lock Viewport" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#calc [aria-label='Zoom']")).toHaveCount(0);
  const before = await viewport(page);
  const graph = await page.locator("#calc .kc-graph-surface").boundingBox();
  const x = graph!.x + graph!.width / 2,
    y = graph!.y + graph!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y + 60, { steps: 6 });
  await page.mouse.up();
  if (browserName === "webkit" && isMobile) {
    // Playwright's mobile WebKit has no mouse wheel: the same wheel event, sent where it points.
    await page.evaluate(
      ([cx, cy]) => {
        const root = document.querySelector("#calc")!.shadowRoot!;
        const target = root.elementFromPoint(cx, cy)!;
        const init = { deltaY: -200, clientX: cx, clientY: cy, bubbles: true, composed: true };
        target.dispatchEvent(new WheelEvent("wheel", { ...init, cancelable: true }));
      },
      [x, y]
    );
  } else {
    await page.mouse.wheel(0, -200);
  }
  await page.waitForTimeout(200);
  expect(await viewport(page)).toEqual(before);
});

test("STYLES-20, -25 a long-press on the row icon opens the style options; a colour tile recolours the row and Escape returns to the icon", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  const icon = page.getByRole("button", { name: "Hide: Expression 1" });
  const box = await icon.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  const menu = page.getByRole("region", { name: "Options Menu" });
  await expect(menu).toBeVisible();
  await menu.getByRole("option", { name: "orange" }).click();
  const color = await page.evaluate(
    () => globalThis.__shell!.handle.calculator.getExpressions()[0].color
  );
  expect(color).toBe("c5");
  await expect(menu.getByRole("option", { name: "orange" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hide: Expression 1" })).toBeFocused();
  // The long-press did not hide the row.
  expect(
    await page.evaluate(() => globalThis.__shell!.handle.calculator.getExpressions()[0].hidden)
  ).toBe(false);
});
