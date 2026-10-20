// Graph settings additions and the Keyboard Shortcuts dialog in the browser (SETTINGS-11, -12,
// -20, -32, -33), on the harness page /harness/calculator.html.

import { expect, test, type Page } from "@playwright/test";
import { enc, openSettings, openShell, rowField, useConsoleGuard } from "./shell-helpers";

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

test("SETTINGS-32 Mod+Alt+G opens Graph settings on Display size and closes it again", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  await rowField(page, "1").click();
  const isMac = await page.evaluate(() => /^Mac/.test(navigator.platform));
  const combo = isMac ? "Control+Meta+KeyG" : "Control+Alt+KeyG";
  await page.keyboard.press(combo);
  await expect(page.getByRole("radio", { name: "Display size: default" })).toBeFocused();
  await page.keyboard.press(combo);
  await expect(page.getByRole("dialog", { name: "Graph settings" })).toHaveCount(0);
});

test("SETTINGS-11, -12 Large display enlarges the list math and Reverse contrast inverts the calculator", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  const size = () => rowField(page, "1").evaluate((el) => getComputedStyle(el).fontSize);
  expect(await size()).toBe("20.24px");
  await openSettings(page);
  await page.getByRole("radio", { name: "Display size: large" }).click();
  await expect.poll(size).toBe("26.4px");
  await page.getByRole("checkbox", { name: "Reverse contrast" }).click();
  const filter = await page.locator("#calc .kc-app").evaluate((el) => getComputedStyle(el).filter);
  expect(filter).toBe("invert(1)");
});

test("SETTINGS-20 Lock Viewport stops dragging and the wheel and removes the zoom buttons", async ({
  page,
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
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(200);
  expect(await viewport(page)).toEqual(before);
});

test("STYLES-20, -25 a long-press on the row icon opens the style options; a colour tile recolours the row and Escape returns to the icon", async ({
  page,
}) => {
  await openShell(page, `?w=1200&h=800&rows=${enc(["y=x"])}`);
  const icon = page.getByRole("button", { name: "Hide expression 1" });
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
  await expect(page.getByRole("button", { name: "Hide expression 1" })).toBeFocused();
  // The long-press did not hide the row.
  expect(
    await page.evaluate(() => globalThis.__shell!.handle.calculator.getExpressions()[0].hidden)
  ).toBe(false);
});
