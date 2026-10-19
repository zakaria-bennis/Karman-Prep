// Calculator docking and page-session geometry in the quiz hosts (11 task 10).

import { expect, test } from "@playwright/test";
import {
  chromeOnly,
  dock,
  frame,
  latex,
  openCalculator,
  press,
  row,
  rowItem,
  trigger,
  workspace,
} from "./quiz-helpers";

test("AR-23 the dock is a 12 px left column with a separator between 400 px and min(900px, 100vw - 480px); the workspace shifts by its width plus 24 px", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
  await dock(page);
  expect(await frame(page).boundingBox()).toEqual({ x: 12, y: 12, width: 576, height: 776 });
  const margin = () => workspace(page).evaluate((el) => getComputedStyle(el).marginLeft);
  expect(await margin()).toBe("600px");
  expect(
    await page
      .locator("[data-question-layout]")
      .first()
      .evaluate((el) => getComputedStyle(el).display)
  ).toBe("block");
  const sep = page.getByRole("separator", { name: "Resize calculator dock" });
  expect((await sep.boundingBox())!.width).toBe(24);
  await sep.focus();
  for (const [key, width] of [
    ["ArrowRight", 592],
    ["End", 800],
    ["Home", 400],
  ] as const) {
    await page.keyboard.press(key);
    await expect(sep).toHaveAttribute("aria-valuenow", String(width));
    expect(await margin()).toBe(`${width + 24}px`);
  }
  const s = (await sep.boundingBox())!;
  await page.mouse.move(s.x + 12, s.y + 100);
  await page.mouse.down();
  await page.mouse.move(1250, s.y + 100, { steps: 4 });
  await page.mouse.up();
  await expect(sep).toHaveAttribute("aria-valuenow", "800");
});

test("AR-24 catalog and daily docks start below the learn header; the page content shifts right of the dock by its width plus 24 px, keeps a question column at least 320 px wide and leaves no focusable or content element under the dock", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  for (const flow of ["catalog", "daily"])
    for (const size of [
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await openCalculator(page, flow, size);
      await dock(page);
      const box = (await frame(page).boundingBox())!;
      const header = (await page.locator("header.fixed").boundingBox())!;
      expect(box.y).toBe(72);
      expect(box.y).toBeGreaterThanOrEqual(header.y + header.height);
      const [margin, left] = await page
        .locator("[data-calculator-dock-shift]")
        .or(workspace(page))
        .first()
        .evaluate(
          (el) => [getComputedStyle(el).marginLeft, el.getBoundingClientRect().left] as const
        ); // daily shifts its content column (task 10), which precedes the workspaces inside it
      expect(margin).toBe(`${box.width + 24}px`);
      expect(left).toBeGreaterThanOrEqual(box.x + box.width + 12);
      expect(
        await workspace(page)
          .first()
          .evaluate((el) => el.firstElementChild!.getBoundingClientRect().width)
      ).toBeGreaterThanOrEqual(320);
      const covered = await page.evaluate(
        ({ x, y, width, height }) =>
          [
            ...document.querySelectorAll<HTMLElement>(
              "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1']), article, h1, h2, h3, p"
            ),
          ]
            .filter(
              (el) =>
                !el.closest("[data-calculator-window], [data-fixture-controls]") &&
                el.getClientRects().length > 0 &&
                el.checkVisibility() // closed <details> content keeps client rects
            )
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.left < x + width && r.right > x && r.top < y + height && r.bottom > y;
            })
            .map((el) => el.outerHTML.slice(0, 80)),
        box
      );
      expect(covered).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
    }
});

test("AR-25, AR-27, L-4 the open window keeps its mode and place across Next and Previous with fresh content and without taking focus; Undock returns to the last floating place; a toolbar open restores the last mode; a reload forgets", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
  await page.getByRole("button", { name: "Karman calculator", exact: true }).focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
  await row(page).focus(); // MathQuill keeps the row's textarea at 0 x 0, so it cannot be clicked
  await page.keyboard.type("a=5");
  await press(page, "Skip this question");
  await expect(rowItem(page)).toBeVisible();
  expect(await frame(page).boundingBox()).toMatchObject({ x: 208, y: 160 });
  expect(await latex(page)).toEqual([""]);
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("[data-calculator-window]"))
  ).toBe(false); // task 6: no focusOnOpen for a carried window
  await dock(page);
  const width = (await frame(page).boundingBox())!.width;
  await press(page, "Previous");
  await expect(rowItem(page)).toBeVisible();
  await expect(frame(page)).toHaveAttribute("data-mode", "docked");
  expect((await frame(page).boundingBox())!.width).toBe(width);
  await page.getByRole("button", { name: "Undock calculator" }).click();
  await expect(frame(page)).toHaveAttribute("data-mode", "floating");
  expect(await frame(page).boundingBox()).toMatchObject({ x: 208, y: 160 });
  await dock(page);
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await press(page, "Skip this question");
  await trigger(page).click();
  await expect(frame(page)).toHaveAttribute("data-mode", "docked"); // L-4: the mode last chosen
  await page.getByRole("button", { name: "Undock calculator" }).click();
  await expect(frame(page)).not.toHaveAttribute("data-entering"); // AN-10 translateY has ended
  expect(await frame(page).boundingBox()).toMatchObject({ x: 208, y: 160 });
  await page.reload();
  await trigger(page).click();
  await expect(frame(page)).toHaveAttribute("data-mode", "docked"); // L-4: a new page session docks
  await page.getByRole("button", { name: "Undock calculator" }).click();
  await expect(frame(page)).not.toHaveAttribute("data-entering"); // AN-10 translateY has ended
  expect(await frame(page).boundingBox()).toMatchObject({ x: 16, y: 64 });
});

test("AR-26 crossing 1024 px wide or 500 px tall switches between docked or floating and full screen, keeping rows, history, the focused row and the dock width", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
  await dock(page);
  await row(page).focus(); // MathQuill keeps the row's textarea at 0 x 0, so it cannot be clicked
  await page.keyboard.type("y=x");
  await page.keyboard.press("Enter");
  await page.keyboard.type("y=2x");
  const snap = () =>
    page.evaluate(() => {
      const s = globalThis.__calculatorHarness!.engine.getSnapshot();
      return { rows: s.rows.map((r) => r.latex), canUndo: s.canUndo, focused: s.focusedRowId };
    });
  const before = await snap();
  expect(before).toEqual({ rows: ["y=x", "y=2x"], canUndo: true, focused: "2" });
  for (const [size, mode] of [
    [{ width: 1000, height: 800 }, "fullscreen"],
    [{ width: 1280, height: 800 }, "docked"],
    [{ width: 1280, height: 480 }, "fullscreen"],
    [{ width: 1280, height: 800 }, "docked"],
  ] as const) {
    await page.setViewportSize(size);
    await expect(frame(page)).toHaveAttribute("data-mode", mode);
    expect(await snap()).toEqual(before);
    await expect(row(page, 2)).toBeFocused();
    if (mode === "docked") expect((await frame(page).boundingBox())!.width).toBe(576);
  }
  await page.getByRole("button", { name: "Undock calculator" }).click();
  const rect = await frame(page).boundingBox();
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen");
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(frame(page)).toHaveAttribute("data-mode", "floating");
  expect(await frame(page).boundingBox()).toEqual(rect);
});

test("AN-10, L-10, L-6 docking, undocking, restoring and closing change the workspace width within one frame, without transitions or a replayed entry animation, at z-index 72", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
  await expect.poll(() => frame(page).evaluate((el) => el.getAnimations().length)).toBe(0);
  const after = (label: string) =>
    page.evaluate(
      (label) =>
        new Promise<string[]>((resolve) => {
          document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!.click();
          requestAnimationFrame(() => {
            const w = document.querySelector("[data-calculator-window]")!;
            const s = getComputedStyle(document.querySelector("[data-calculator-workspace]")!);
            resolve([
              s.marginLeft,
              s.transitionDuration,
              String(w.getAnimations().length),
              getComputedStyle(w).zIndex,
            ]);
          });
        }),
      label
    );
  expect(await after("Fixture dock")).toEqual(["600px", "0s", "0", "72"]);
  expect(await after("Undock calculator")).toEqual(["0px", "0s", "0", "72"]);
  expect(await after("Maximize calculator")).toEqual(["0px", "0s", "0", "72"]);
  expect(await after("Restore calculator size")).toEqual(["0px", "0s", "0", "72"]);
  await dock(page);
  expect(await after("Close calculator")).toEqual(["0px", "0s", "0", "72"]);
  await expect(trigger(page)).toBeFocused();
});

test("A11Y-6 floating and maximized are non-modal dialogs, full screen is modal, docked is complementary, all named Karman calculator around a Graphing calculator region", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 });
  const dialog = page.getByRole("dialog", { name: "Karman calculator", exact: true });
  const region = page.getByRole("region", { name: "Graphing calculator", exact: true });
  await expect(dialog).not.toHaveAttribute("aria-modal", "true");
  await expect(region).toBeVisible();
  await page.getByRole("button", { name: "Maximize calculator" }).click();
  await expect(dialog).not.toHaveAttribute("aria-modal", "true");
  await page.getByRole("button", { name: "Restore calculator size" }).click();
  await dock(page);
  await expect(
    page.getByRole("complementary", { name: "Karman calculator", exact: true })
  ).toBeVisible();
  await expect(region).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(region).toBeVisible();
});

test("L-4 at 1280 by 800 the toolbar button docks the calculator on the left of the question", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 }, { docked: true });
  await expect(frame(page)).toHaveAttribute("data-mode", "docked");
  await expect(page.getByRole("complementary", { name: "Karman calculator" })).toBeVisible();
  const dockBox = (await frame(page).boundingBox())!;
  const question = (await workspace(page).boundingBox())!;
  expect(dockBox.x).toBe(12);
  expect(question.x).toBeGreaterThanOrEqual(dockBox.x + dockBox.width);
});

test("L-4 after Undock, closing and reopening keeps the floating window", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await openCalculator(page, "diagnostic", { width: 1280, height: 800 }); // undocks
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await trigger(page).click();
  await expect(frame(page)).toHaveAttribute("data-mode", "floating");
});
