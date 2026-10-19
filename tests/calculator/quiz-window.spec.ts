// Calculator window in the quiz hosts.

import { expect, test } from "@playwright/test";
import {
  chromeOnly,
  frame,
  latex,
  openCalculator,
  row,
  side,
  trigger,
  workspace,
} from "./quiz-helpers";

test("L-4 the toolbar and the phone side button open the calculator in Math questions only", async ({
  page,
}) => {
  for (const flow of ["practice", "diagnostic", "catalog", "daily"]) {
    await openCalculator(page, flow);
    await expect(
      page.getByRole("region", { name: "Graphing calculator", exact: true })
    ).toBeVisible();
  }
  await page.goto("/?flow=practice&subject=reading");
  await expect(page.getByText(/^Question 1:/).first()).toBeVisible();
  await expect(trigger(page)).toHaveCount(0);
  await expect(side(page)).toHaveCount(0);
});

test("AR-20, L-4, L-5 toolbar and side button open docked at 1024 px and wider over 500 px tall, full screen otherwise", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  for (const [width, height, mode, phone] of [
    [1023, 768, "fullscreen", false],
    [1024, 768, "docked", false],
    [1280, 800, "docked", false],
    [390, 844, "fullscreen", true],
    [1280, 480, "fullscreen", true],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/?flow=diagnostic");
    await expect(side(page)).toHaveCount(phone ? 1 : 0);
    await (phone ? side(page) : trigger(page)).click();
    await expect(frame(page)).toHaveAttribute("data-mode", mode);
    await expect(side(page)).toHaveCount(0);
  }
});

test("AR-22, L-6 the floating window keeps its default geometry, drags and resizes with clamping, maximizes, minimizes, re-clamps on window and visualViewport resize and stays at z-index 72", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
  const box = async () => (await frame(page).boundingBox())!;
  const z = () => frame(page).evaluate((el) => getComputedStyle(el).zIndex);
  const drag = async (x: number, y: number, dx: number, dy: number) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 4 });
    await page.mouse.up();
  };
  const bar = async () => (await page.locator("[data-calculator-titlebar]").boundingBox())!;
  expect(await box()).toEqual({ x: 16, y: 64, width: 880, height: 600 });
  expect(await z()).toBe("72");
  let b = await bar();
  await drag(b.x + 300, b.y + b.height / 2, 300, 100);
  expect(await box()).toMatchObject({ x: 316, y: 164 });
  const g = (await page.getByRole("button", { name: "Resize calculator" }).boundingBox())!;
  expect([g.width, g.height]).toEqual([24, 24]);
  await drag(g.x + 12, g.y + 12, -2000, -2000);
  expect(await box()).toMatchObject({ width: 360, height: 280 });
  b = await bar();
  await drag(b.x + 100, b.y + b.height / 2, 3000, 3000);
  expect(await box()).toEqual({ x: 920, y: 520, width: 360, height: 280 });
  // MathQuill keeps the row's textarea at 0 x 0, so it is focused rather than clicked.
  await row(page).focus();
  await page.keyboard.type("1+1");
  await page.getByRole("button", { name: "Maximize calculator" }).click();
  expect(await box()).toEqual({ x: 0, y: 0, width: 1280, height: 800 });
  expect(await z()).toBe("72");
  await page.getByRole("button", { name: "Restore calculator size" }).click();
  expect(await box()).toEqual({ x: 920, y: 520, width: 360, height: 280 });
  await page.getByRole("button", { name: "Minimize calculator" }).click();
  await expect(frame(page)).toBeHidden();
  await trigger(page).click();
  expect(await latex(page)).toEqual(["1+1"]);
  await page.setViewportSize({ width: 1100, height: 700 });
  await expect.poll(box).toEqual({ x: 740, y: 420, width: 360, height: 280 });
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(box).toEqual({ x: 920, y: 520, width: 360, height: 280 });
  await page.evaluate(() => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });
    visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect.poll(box).toEqual({ x: 920, y: 320, width: 360, height: 280 });
});

test("KB-10 arrow keys move the focused title-bar handle and resize the focused grip in 16 px steps, clamped", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
  const box = async () => (await frame(page).boundingBox())!;
  await page.getByRole("button", { name: "Karman calculator", exact: true }).focus();
  for (const key of ["ArrowRight", "ArrowRight", "ArrowDown"]) await page.keyboard.press(key);
  expect(await box()).toMatchObject({ x: 48, y: 80 });
  for (let i = 0; i < 30; i++) await page.keyboard.press("ArrowRight");
  expect((await box()).x).toBe(400);
  await page.getByRole("button", { name: "Resize calculator" }).focus();
  await page.keyboard.press("ArrowLeft");
  expect((await box()).width).toBe(864);
  for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowLeft");
  expect((await box()).width).toBe(360);
});

test("AN-10 floating and full-screen windows open with opacity 0 to 1 and translateY(6px) to 0 over 200 ms", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  const openAndRead = () =>
    page.evaluate(
      () =>
        new Promise((resolve) => {
          (
            document.querySelector<HTMLElement>('[aria-label="Open Karman calculator"]') ??
            document.querySelector<HTMLElement>('[aria-label="Toggle Karman calculator"]')!
          ).click();
          requestAnimationFrame(() =>
            resolve(
              document
                .querySelector("[data-calculator-window]")!
                .getAnimations()
                .map((a) => {
                  const e = a.effect as KeyframeEffect;
                  return {
                    duration: e.getTiming().duration,
                    frames: e.getKeyframes().map((k) => [k.opacity, k.transform]),
                  };
                })
            )
          );
        })
    );
  // L-4: a wide first open docks, and a docked window never animates; floating reopens do.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?flow=diagnostic");
  expect(await openAndRead()).toEqual([]);
  await page.getByRole("button", { name: "Undock calculator", exact: true }).click();
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  for (const size of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    if (size.width < 1024) await page.goto("/?flow=diagnostic");
    expect(await openAndRead()).toEqual([
      {
        duration: 200,
        frames: [
          ["0", "translateY(6px)"],
          ["1", "translateY(0px)"],
        ],
      },
    ]);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?flow=diagnostic");
  expect(await openAndRead()).toEqual([]);
});

test("AR-28, L-11, KB-12, L-6, AR-22 full screen is modal and fills the viewport at z-index 72: the workspace is inert, hidden and scroll-locked and Tab cycles inside the window", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 390, height: 844 });
  const background = () =>
    workspace(page).evaluate((el) => [
      (el as HTMLElement).inert,
      el.getAttribute("aria-hidden"),
      document.body.style.overflow,
    ]);
  await expect(
    page.getByRole("dialog", { name: "Karman calculator", exact: true })
  ).toHaveAttribute("aria-modal", "true");
  expect(await background()).toEqual([true, "true", "hidden"]);
  expect(await frame(page).boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
  expect(await frame(page).evaluate((el) => getComputedStyle(el).zIndex)).toBe("72");
  const where = () =>
    page.evaluate(() => {
      const a = document.activeElement!;
      return !document.querySelector("[data-calculator-window]")!.contains(a)
        ? "outside"
        : a.hasAttribute("data-calculator-host")
          ? "shadow"
          : (a.getAttribute("aria-label") ?? "light");
    });
  const close = page.getByRole("button", { name: "Close calculator", exact: true });
  await close.focus();
  const seen = new Set<string>();
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press("Tab");
    seen.add(await where());
  }
  expect(seen.has("outside")).toBe(false);
  expect(seen.has("shadow")).toBe(true);
  expect(seen.has("Close calculator")).toBe(true);
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  expect(await where()).toBe("shadow");
  await close.click();
  expect(await background()).toEqual([false, null, ""]);
  await expect(trigger(page)).toBeFocused();
});

test("AR-27, L-10, KB-4 Close and Minimize keep the content and return focus to the opener, or the toolbar button when it is gone; reopening restores the last row", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?flow=diagnostic");
  await trigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(row(page)).toBeFocused();
  await page.keyboard.type("1+1");
  await page.keyboard.press("Enter");
  await expect(row(page, 2)).toBeFocused();
  for (const name of ["Close calculator", "Minimize calculator"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(frame(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
    await trigger(page).click();
    await expect(row(page, 2)).toBeFocused();
    expect(await latex(page)).toEqual(["1+1", ""]);
  }
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 480 });
  await side(page).click();
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await expect(trigger(page)).toBeFocused();
});

test("KB-6, AR-18 calculator keys never reach window or document listeners; Escape closes the window only when no layer handled it", async ({
  page,
}, info) => {
  test.skip(/ios|android/.test(info.project.name), "hardware keyboard projects only");
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
  await page.evaluate(() => {
    const log: string[] = ((globalThis as { quizKeys?: string[] }).quizKeys = []);
    for (const type of ["keydown", "keyup", "keypress"]) {
      window.addEventListener(type, (e) => log.push(`window ${type} ${(e as KeyboardEvent).key}`));
      document.addEventListener(type, (e) =>
        log.push(`document ${type} ${(e as KeyboardEvent).key}`)
      );
    }
  });
  const heard = () =>
    page.evaluate(() => (globalThis as { quizKeys?: string[] }).quizKeys!.splice(0));
  const keypad = page.getByRole("region", { name: "Keypad" });
  await row(page).focus();
  await page.keyboard.type("2+3");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Alt+KeyH");
  await page.getByRole("button", { name: "Karman calculator", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await row(page).focus();
  await page.keyboard.press("Control+KeyK");
  await expect(keypad).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(keypad).toBeHidden();
  await expect(frame(page)).toBeVisible();
  expect(await heard()).toEqual([]);
  await expect(page.getByText(/^Question 1:/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(frame(page)).toBeHidden();
  await page.locator("body").press("x");
  expect(await heard()).toContain("window keydown x");
});
