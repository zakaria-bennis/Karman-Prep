// Owner decision, 2026-10-21: the toolbar's Calculator button toggles the window and shows its
// state (aria-pressed); closing and reopening restores the exact place and size, across questions
// and reloads (localStorage), clamped back on-screen when the browser window shrank. Phones keep
// full screen and the side button, and reopening keeps the question's calculator as it was.
// QUIZ_SHOTS=<dir> also saves the review screenshots there.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  frame,
  latex,
  openCalculator,
  phoneSized,
  press,
  row,
  rowItem,
  side,
  trigger,
} from "./quiz-helpers";

const SHOTS = process.env.QUIZ_SHOTS;

async function shot(page: Page, name: string, project: string) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${project}-${name}.png`) });
}

const box = async (page: Page) => (await frame(page).boundingBox())!;

/** Moves the floating window by keyboard (KB-10: 16 px a step) and resizes it from the grip. */
async function moveAndResize(page: Page) {
  await page.getByRole("button", { name: "Karman calculator", exact: true }).focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
  await page.getByRole("button", { name: "Resize calculator" }).focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowLeft");
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowUp");
}

test.describe("wide window", () => {
  test.beforeEach(({ isMobile }) => test.skip(isMobile, "phones open full screen"));

  test("the toolbar button toggles the window with aria-pressed and reopens it in place, by mouse and keyboard, across questions and a reload", async ({
    page,
  }, info) => {
    await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
    await expect(trigger(page)).toHaveAttribute("aria-pressed", "true");
    await moveAndResize(page);
    const placed = { x: 176, y: 144, width: 720, height: 472 };
    expect(await box(page)).toEqual(placed);
    await shot(page, "1-moved-resized", info.project.name);

    await trigger(page).click(); // off
    await expect(frame(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute("aria-pressed", "false");
    await shot(page, "2-closed", info.project.name);
    await trigger(page).click(); // on
    await expect(trigger(page)).toHaveAttribute("aria-pressed", "true");
    await expect(frame(page)).not.toHaveAttribute("data-entering");
    expect(await box(page)).toEqual(placed);
    await shot(page, "3-reopened-in-place", info.project.name);

    // Keyboard: the button is a native button, so Enter toggles it from focus.
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await expect(frame(page)).toBeHidden();
    await trigger(page).focus();
    await page.keyboard.press("Enter");
    await expect(frame(page)).not.toHaveAttribute("data-entering");
    expect(await box(page)).toEqual(placed);

    // A new question: the window stays open and in place, its calculator clean.
    await row(page).focus();
    await page.keyboard.type("y=2x");
    await press(page, "Skip this question");
    await expect(rowItem(page)).toBeVisible();
    expect(await latex(page)).toEqual([""]);
    expect(await box(page)).toEqual(placed);
    await expect(trigger(page)).toHaveAttribute("aria-pressed", "true");
    await shot(page, "4-next-question-clean", info.project.name);

    // A reload: closed again (the page starts closed), and the next open comes back in place.
    await page.reload();
    await expect(trigger(page)).toHaveAttribute("aria-pressed", "false");
    await trigger(page).click();
    await expect(frame(page)).toHaveAttribute("data-mode", "floating");
    await expect(frame(page)).not.toHaveAttribute("data-entering");
    expect(await box(page)).toEqual(placed);
  });

  test("a maximized or docked window reopens maximized or docked at its width", async ({
    page,
  }) => {
    await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
    await page.getByRole("button", { name: "Maximize calculator" }).click();
    // Maximized covers the toolbar, so the window's own Minimize closes it.
    await page.getByRole("button", { name: "Minimize calculator" }).click();
    await expect(trigger(page)).toHaveAttribute("aria-pressed", "false");
    await trigger(page).click();
    await expect(frame(page)).toHaveAttribute("data-mode", "maximized");
    await page.getByRole("button", { name: "Restore calculator size" }).click();
    await expect(frame(page)).toHaveAttribute("data-mode", "floating");
    await page.getByRole("button", { name: "Fixture dock", exact: true }).evaluate((b) => {
      (b as HTMLElement).click();
    });
    const separator = page.getByRole("separator", { name: "Resize calculator dock" });
    await separator.focus();
    await page.keyboard.press("End");
    const width = (await box(page)).width;
    await page.reload();
    await trigger(page).click();
    await expect(frame(page)).toHaveAttribute("data-mode", "docked");
    expect((await box(page)).width).toBe(width);
  });

  test("after the browser window shrinks, the stored place is clamped back on-screen", async ({
    page,
  }, info) => {
    await openCalculator(page, "diagnostic", { width: 1440, height: 900 });
    await page.getByRole("button", { name: "Karman calculator", exact: true }).focus();
    for (let i = 0; i < 30; i++) await page.keyboard.press("ArrowRight");
    for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowDown");
    const wide = await box(page);
    expect(wide).toEqual({ x: 496, y: 224, width: 880, height: 600 });
    await trigger(page).click();
    await page.setViewportSize({ width: 1100, height: 700 });
    await page.reload();
    await trigger(page).click();
    await expect(frame(page)).not.toHaveAttribute("data-entering");
    const clamped = await box(page);
    expect(clamped).toEqual({ x: 220, y: 100, width: 880, height: 600 });
    await shot(page, "5-clamped-after-shrink", info.project.name);
    // Growing back restores the place the student chose.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => box(page)).toEqual(wide);
  });

  test("without storage the window still reopens in place within the page", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
    await moveAndResize(page);
    const placed = await box(page);
    await trigger(page).click();
    await press(page, "Skip this question");
    await trigger(page).click();
    await expect(frame(page)).not.toHaveAttribute("data-entering");
    expect(await box(page)).toEqual(placed);
  });
});

test.describe("phone", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "phone layout"));

  test("the side button reopens full screen with the question's calculator as it was; the next question is clean", async ({
    page,
  }, info) => {
    await openCalculator(page, "diagnostic");
    expect(phoneSized(page)).toBe(true);
    await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen");
    await row(page).focus();
    await page.keyboard.type("y=3x");
    await shot(page, "1-open", info.project.name);
    await page.getByRole("button", { name: "Close calculator", exact: true }).click();
    await expect(frame(page)).toBeHidden();
    await expect(side(page)).toHaveAttribute("aria-expanded", "false");
    await shot(page, "2-closed", info.project.name);
    await side(page).click();
    await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen");
    expect(await latex(page)).toEqual(["y=3x"]);
    await shot(page, "3-reopened", info.project.name);
    await page.getByRole("button", { name: "Close calculator", exact: true }).click();
    await press(page, "Skip this question");
    await side(page).click();
    await expect(rowItem(page)).toBeVisible();
    expect(await latex(page)).toEqual([""]);
    await shot(page, "4-next-question-clean", info.project.name);
  });

  test("the side button works from the keyboard too", async ({ page }) => {
    await openCalculator(page, "diagnostic");
    await page.getByRole("button", { name: "Close calculator", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(frame(page)).toBeHidden();
    await side(page).focus();
    await page.keyboard.press("Enter");
    await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen");
  });
});
