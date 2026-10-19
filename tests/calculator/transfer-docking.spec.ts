// Docking on transfer, focus after a transfer, focus return and announcements (14 tasks 11 and 12).
import { expect, test } from "@playwright/test";
import { BLOCK_SYSTEM } from "./fixture/harness/transfer-questions";
import {
  anchor,
  box,
  chromeOnly,
  clickControl,
  control,
  frame,
  open,
  press,
  row,
  rowItem,
  rows,
  setRows,
  snapshot,
  statusRegion,
  tapItem,
  transferByMouse,
  url,
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

test("TR-66, KB-4 a mouse or keyboard transfer focuses the new row with the caret at the end; a touch transfer activates it in view with focus in the window, no keyboard, and keypad input going to it", async ({
  page,
}, info) => {
  const touch = /ios|android/.test(info.project.name);
  test.skip(
    !touch && info.project.name !== "calculator-chrome",
    "mouse, keyboard and touch projects"
  );
  if (!touch) {
    await open(page);
    await transferByMouse(page, "y>2x+1");
    await expect(row(page, 1)).toBeFocused();
    await page.keyboard.type("5");
    expect(await rows(page)).toEqual(["y>2x+15"]);
    await control(page, "y=2x+3").focus();
    await page.keyboard.press("Enter");
    await expect(row(page, 2)).toBeFocused();
    await page.keyboard.type("1");
    expect(await rows(page)).toEqual(["y>2x+15", "y=2x+31"]);
    expect((await snapshot(page))?.focusedLatex).toBe("y=2x+31");
    return;
  }
  await page.goto(url());
  await press(page, "Open Karman calculator");
  await expect(rowItem(page)).toBeVisible();
  const before = Array.from({ length: 30 }, (_, i) => String(i));
  await setRows(page, before);
  const keypad = (await snapshot(page))?.keypad;
  await page.getByRole("button", { name: "Close calculator", exact: true }).tap();
  await tapItem(page, "y>2x+1");
  await control(page, "y>2x+1").tap();
  await expect.poll(async () => (await rows(page))?.at(-1)).toBe("y>2x+1");
  // L-14: the row is revealed once it has grown in (AN-5), so the check polls
  const state = () =>
    page.evaluate(() => {
      const e = globalThis.__calculatorHarness?.engine.getSnapshot();
      const target = e?.rows.find((r) => r.latex === "y>2x+1");
      const root = document.querySelector("[data-calculator-host]")?.shadowRoot;
      const li = target && root?.querySelector(`[data-row-id="${target.id}"]`);
      if (!e || !target || !root || !li) return null;
      const r = li.getBoundingClientRect();
      const hit = root.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        active: e.activeRowId === target.id,
        focused: e.focusedRowId,
        inView: r.top >= 0 && r.bottom <= innerHeight && hit !== null && li.contains(hit),
        shadowFocus: root.activeElement?.tagName ?? null,
        inWindow: !!document.activeElement?.closest("[data-calculator-window]"),
      };
    });
  await expect.poll(state).toEqual({
    active: true,
    focused: null,
    inView: true,
    shadowFocus: null,
    inWindow: true,
  });
  expect((await snapshot(page))?.keypad).toBe(keypad);
  // KB-4: the active row is the target of keypad input
  if (!(await snapshot(page))?.keypad)
    await page.getByRole("button", { name: "Show keypad", exact: true }).tap();
  await page
    .getByRole("region", { name: "Keypad", exact: true })
    .getByRole("button", { name: "7", exact: true })
    .tap();
  await expect.poll(async () => (await rows(page))?.at(-1)).not.toBe("y>2x+1");
  const after = (await rows(page)) ?? [];
  const last = after.at(-1) ?? "";
  expect([last.includes("7"), last.replace("7", "")]).toEqual([true, "y>2x+1"]);
  expect(after.slice(0, 30)).toEqual(before);
});

test("TR-68 closing returns focus to the Transfer control that opened the calculator, and a later transfer into the open calculator does not change that target", async ({
  page,
}, info) => {
  test.skip(
    !["calculator-chrome", "calculator-safari"].includes(info.project.name),
    "desktop engines"
  );
  await open(page);
  await control(page, "y>2x+1").focus();
  await page.keyboard.press("Enter");
  await expect(row(page, 1)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(frame(page)).toBeHidden();
  await expect(control(page, "y>2x+1")).toBeFocused();
  await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "true");
  await transferByMouse(page, "y=2x+3");
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await expect(control(page, "y=2x+3")).toBeFocused();
  const trigger = page.getByRole("button", { name: "Toggle Karman calculator", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(frame(page)).toBeVisible();
  await clickControl(page, "y>2x+1");
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await expect(trigger).toBeFocused();
});

type Said = { said: string[]; watch(el: Element, tag: string): void };

test("TR-67, A11Y-11 the quiz-side status region announces each transfer result once while the calculator's live region stays silent, including inequalities, systems and a renamed definition", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await open(page);
  await page.evaluate(() => {
    const w = window as unknown as Said;
    w.said = [];
    w.watch = (el, tag) =>
      new MutationObserver(() => {
        const t = el.textContent?.trim();
        if (t) w.said.push(`${tag}:${t}`);
      }).observe(el, { childList: true, characterData: true, subtree: true });
    const region = document.querySelector("[data-transfer-status]");
    if (region) w.watch(region, "quiz");
  });
  const said = () => page.evaluate(() => (window as unknown as Said).said);
  const calcRegion = () => page.locator("[data-calculator-host]").getByRole("status");
  const watchCalc = (tag: string) =>
    calcRegion().evaluate((el, t) => (window as unknown as Said).watch(el, t), tag);
  await transferByMouse(page, "y>2x+1");
  await expect(row(page, 1)).toBeFocused();
  await expect(calcRegion()).toHaveText("");
  await watchCalc("calc");
  await transferByMouse(page, "y=2x+3");
  await transferByMouse(page, "y=2x+3", 1);
  await transferByMouse(page, BLOCK_SYSTEM);
  await page.waitForTimeout(1200);
  expect(await said()).toEqual([
    expect.stringMatching(/^quiz:Added to calculator: .+\.$/),
    expect.stringMatching(/^quiz:Added to calculator: .+\.$/),
    "quiz:Already in the calculator, row 2.",
    "quiz:Added to calculator: system of 2 inequalities.",
  ]);
  await expect.poll(async () => (await snapshot(page))?.regions).toBe(3);
  // the new question's calculator, region and harness engine
  await press(page, "Skip this question");
  await expect.poll(() => rows(page)).toEqual([""]);
  await setRows(page, ["f(x)=5x"]); // defined without typing, so no row-error announcements
  await watchCalc("next");
  await transferByMouse(page, "f(x)=x^{2}-3");
  await expect(statusRegion(page)).toHaveText(/^Added as .+ because f is already defined\.$/);
  await page.waitForTimeout(1000);
  // A11Y-2's reset message is the only allowed one
  expect(
    (await said()).filter(
      (s) =>
        s.startsWith("calc:") ||
        (s.startsWith("next:") && s !== "next:Calculator cleared for this question.")
    )
  ).toEqual([]);
});

test("NM-42 an over-limit transfer inserts nothing and is reported only through the TR-67 region", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await open(page);
  await transferByMouse(page, "y>2x+1");
  await expect(row(page, 1)).toBeFocused();
  // 100 rows, the NM-42 limit
  await setRows(
    page,
    Array.from({ length: 100 }, (_, i) => String(i))
  );
  await expect.poll(async () => (await rows(page))?.length).toBe(100);
  // Replacing the focused row 1 makes the calculator read its new value ("Expression 1 equals 0");
  // that is the calculator's own row announcement, so the check starts once it has been made.
  const calcRegion = page.locator("[data-calculator-host]").getByRole("status");
  await page.waitForTimeout(1000);
  const before = await calcRegion.textContent();
  await calcRegion.evaluate((el) => {
    const w = window as unknown as { calcSaid: string[] };
    w.calcSaid = [];
    new MutationObserver(() => w.calcSaid.push(el.textContent ?? "")).observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
  await transferByMouse(page, "y=2x+3");
  await expect(statusRegion(page)).toHaveText("This can't be added to the calculator.");
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as unknown as { calcSaid: string[] }).calcSaid)).toEqual(
    []
  );
  await expect(calcRegion).toHaveText(before ?? "");
  expect((await rows(page))?.length).toBe(100);
});
