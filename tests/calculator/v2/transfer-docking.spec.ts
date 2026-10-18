// Docking on transfer, focus after a transfer, focus return and announcements (14 tasks 11 and 12).
import { expect, test } from "@playwright/test";
import {
  box,
  chromeOnly,
  clickControl,
  frame,
  open,
  press,
  row,
  rowItem,
  rows,
  transferByMouse,
  windowStore,
} from "./transfer-helpers";

test("AR-21, TR-64, L-7 a transfer docks at 1024 px and wider over 500 px tall as a left column of clamp(400px, 45vw, 720px) resizable by 16 px arrow steps, Home, End and pointer drag between 400 px and min(900px, 100vw - 480px) with a single-column question, and opens full screen otherwise", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  for (const [width, height, mode] of [
    [1023, 800, "fullscreen"],
    [1024, 800, "docked"],
    [1280, 800, "docked"],
    [1440, 900, "docked"],
    [390, 844, "fullscreen"],
    [1280, 480, "fullscreen"],
    [1024, 500, "fullscreen"],
    [1024, 501, "docked"],
  ] as const) {
    await open(page, { width, height });
    await transferByMouse(page, "y>2x+1");
    await expect(frame(page), `${width}x${height}`).toHaveAttribute("data-mode", mode);
    await expect(row(page, 1)).toBeFocused();
    expect(await rows(page)).toEqual(["y>2x+1"]);
    if (mode !== "docked") continue;
    const dock = Math.round(Math.min(720, Math.max(400, 0.45 * width)));
    expect(await box(frame(page))).toEqual({ x: 12, y: 12, width: dock, height: height - 24 });
    const max = Math.max(400, Math.min(900, width - 480));
    const sep = page.getByRole("separator", { name: "Resize calculator dock" });
    await expect(sep).toHaveAttribute("aria-valuemin", "400");
    await expect(sep).toHaveAttribute("aria-valuemax", String(max));
    expect(
      await page
        .locator("[data-question-layout]")
        .first()
        .evaluate((el) => getComputedStyle(el).display)
    ).toBe("block");
    expect(
      await page
        .locator("[data-calculator-workspace]")
        .evaluate((el) => getComputedStyle(el).marginLeft)
    ).toBe(`${dock + 24}px`);
    if (width !== 1280) continue;
    const w = async () => (await box(frame(page))).width;
    await sep.focus();
    await page.keyboard.press("ArrowRight");
    expect(await w()).toBe(dock + 16);
    await page.keyboard.press("ArrowLeft");
    expect(await w()).toBe(dock);
    await page.keyboard.press("Home");
    expect(await w()).toBe(400);
    await page.keyboard.press("End");
    expect(await w()).toBe(max);
    // drags past each bound land exactly on it
    for (const [toX, expected] of [
      [20, 400],
      [width - 20, max],
    ] as const) {
      const s = await box(sep);
      await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
      await page.mouse.down();
      await page.mouse.move(toX, s.y + s.height / 2, { steps: 4 });
      await page.mouse.up();
      expect(await w(), `drag to ${toX}`).toBe(expected);
      await expect(sep).toHaveAttribute("aria-valuenow", String(expected));
    }
  }
});

test("TR-65, L-9 an open floating or maximized window docks on transfer and keeps its rows, the dock persists across Next and Previous with fresh content, and a docked calculator stays docked", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await open(page);
  await page.getByRole("button", { name: "Toggle Karman calculator", exact: true }).click();
  await expect(frame(page)).toHaveAttribute("data-mode", "docked"); // L-4: the first open docks
  await page.getByRole("button", { name: "Undock calculator", exact: true }).click();
  await expect(frame(page)).toHaveAttribute("data-mode", "floating");
  await rowItem(page).click();
  await page.keyboard.type("1+1");
  await clickControl(page, "y>2x+1");
  await expect(frame(page)).toHaveAttribute("data-mode", "docked");
  expect(await rows(page)).toEqual(["1+1", "y>2x+1"]);
  await transferByMouse(page, "y=2x+3");
  await expect(frame(page)).toHaveAttribute("data-mode", "docked");
  expect(await rows(page)).toEqual(["1+1", "y>2x+1", "y=2x+3"]);
  await press(page, "Skip this question");
  await expect(rowItem(page)).toBeVisible();
  await expect(frame(page)).toHaveAttribute("data-mode", "docked");
  expect(await rows(page)).toEqual([""]);
  await press(page, "Previous");
  await expect(rowItem(page)).toBeVisible();
  await expect(frame(page)).toHaveAttribute("data-mode", "docked");
  expect(await rows(page)).toEqual([""]);
  await page.getByRole("button", { name: "Maximize calculator" }).click();
  await expect(frame(page)).toHaveAttribute("data-mode", "maximized");
  await clickControl(page, "y>2x+1");
  await expect(frame(page)).toHaveAttribute("data-mode", "docked");
  expect(await rows(page)).toEqual(["y>2x+1"]);
});

test("TR-65 an open full-screen calculator at 390×844 stays full screen on transfer, keeps its rows and leaves the stored mode alone", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await open(page, { width: 390, height: 844 });
  await press(page, "Open Karman calculator");
  await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen");
  await rowItem(page).click();
  await page.keyboard.type("1+1");
  const stored = (await windowStore(page))?.mode;
  await clickControl(page, "y>2x+1");
  await expect.poll(() => rows(page)).toEqual(["1+1", "y>2x+1"]);
  await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen");
  expect((await windowStore(page))?.mode).toBe(stored);
});
