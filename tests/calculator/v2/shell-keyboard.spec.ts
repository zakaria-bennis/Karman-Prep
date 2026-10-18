// Calculator v2 shell keyboard browser tests (10 Task 9): Escape layers by rank (KB-3), shortcuts
// on event.code (KB-7) and the tab order of the assembled calculator (KB-13), on the harness page
// /v2/calculator.html.

import { expect, test, type Page } from "@playwright/test";
import {
  api,
  enc,
  expectOrder,
  frames,
  keypadOpen,
  openShell,
  rowField,
  rows,
  useConsoleGuard,
} from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

interface Layers {
  settings: boolean;
  functions: boolean;
  abc: boolean;
  keypad: boolean;
  closed: boolean;
}

/** The open Escape layers: a control that is not rendered reads false (KB-3, 09 consumer note 6). */
function layers(page: Page): Promise<Layers> {
  return page.evaluate(() => {
    const root = document.querySelector("#calc")!.shadowRoot!;
    const button = (name: string) =>
      [...root.querySelectorAll("button")].find(
        (b) => (b.getAttribute("aria-label") ?? b.textContent?.trim()) === name
      );
    const flag = (name: string, attribute: string) =>
      button(name)?.getAttribute(attribute) === "true";
    return {
      settings: flag("Graph settings", "aria-expanded"),
      functions: flag("Functions", "aria-expanded"),
      abc: flag("ABC", "aria-pressed"),
      keypad: globalThis.__calculatorHarness!.engine.getSnapshot().settings.keypad,
      closed: document.querySelector("#frame")!.hasAttribute("data-closed"),
    };
  });
}

/** Presses Escape once per step; after each press the layers equal the previous ones plus the step. */
async function escapeOneLayerAtATime(page: Page, steps: Partial<Layers>[]): Promise<void> {
  for (const step of steps) {
    const before = await layers(page);
    await page.keyboard.press("Escape");
    await expect.poll(() => layers(page)).toEqual({ ...before, ...step });
  }
}

/** Each Escape the harness frame saw: whether a calculator layer took it. */
function prevented(page: Page): Promise<boolean[]> {
  return page.evaluate(() => globalThis.__shell!.log.escapes.map((e) => e.defaultPrevented));
}

type KeyInit = Pick<
  KeyboardEventInit,
  "code" | "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "isComposing"
>;

/** Dispatches a composed, cancelable keydown on the shadow root's active element. */
async function send(page: Page, init: KeyInit): Promise<void> {
  await page.evaluate((options) => {
    const target = document.querySelector("#calc")!.shadowRoot!.activeElement;
    if (target === null) throw new Error("no shadow focus");
    target.dispatchEvent(
      new KeyboardEvent("keydown", { ...options, bubbles: true, composed: true, cancelable: true })
    );
  }, init);
}

interface Stop {
  name: string;
  keypad: boolean;
  row: boolean;
  hidden: boolean;
  top: number;
  left: number;
}

/**
 * Tabs from #outside until focus returns there, recording every focus inside the shadow root.
 * WebKit's Tab skips buttons unless Safari's "Press Tab to highlight each item" is on, so WebKit
 * presses Option+Tab, which moves through every control as that setting does.
 */
async function tabCycle(page: Page): Promise<Stop[]> {
  const webkit = page.context().browser()?.browserType().name() === "webkit";
  await page.locator("#outside").focus();
  const stops: Stop[] = [];
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press(webkit ? "Alt+Tab" : "Tab");
    const stop = await page.evaluate((): Stop | "outside" | null => {
      if (document.activeElement?.id === "outside") return "outside";
      const el = document.querySelector("#calc")!.shadowRoot!.activeElement;
      if (el === null) return null;
      let hidden = false;
      for (let node: Element | null = el; node !== null; node = node.parentElement) {
        if (node.matches('[hidden], [inert], [aria-hidden="true"]')) hidden = true;
      }
      if (getComputedStyle(el).visibility === "hidden") hidden = true;
      const rect = el.getBoundingClientRect();
      return {
        name: el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "",
        keypad: el.matches('[aria-label="Keypad"] button'), // a key, not the scrollable region
        row: el.closest("[data-row-id]") !== null,
        hidden,
        top: rect.top,
        left: rect.left,
      };
    });
    if (stop === "outside") return stops;
    if (stop !== null) stops.push(stop);
  }
  throw new Error(`focus never returned to #outside: ${JSON.stringify(stops.map((s) => s.name))}`);
}

test("KB-3 Escape closes the popover, Functions panel, ABC page, keypad, then the calculator, by rank and not by opening order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openShell(page, "?w=800&h=600");
  await rowField(page, "1").click();
  await api(page, "c.updateSettings({ keypad: true })");
  for (const name of ["Functions", "ABC", "Graph settings"])
    await page.getByRole("button", { name, exact: true }).click(); // 800 px: the tray, whose letters page keeps Functions (09 K-3)
  await expect
    .poll(() => layers(page))
    .toEqual({ settings: true, functions: true, abc: true, keypad: true, closed: false }); // a LIFO stack would now close ABC before Functions
  await escapeOneLayerAtATime(page, [
    { settings: false },
    { functions: false },
    { abc: false },
    { keypad: false },
    { closed: true },
  ]);
  expect(await prevented(page)).toEqual([true, true, true, true, false]);
});

test("KB-3 on the phone keypad Escape closes the popover, Functions panel, keypad, then the calculator", async ({
  page,
}) => {
  await openShell(page, "?w=400&h=700");
  await rowField(page, "1").click();
  await api(page, "c.updateSettings({ keypad: true })"); // under 600 px: the K-6 phone keypad on every project
  for (const name of ["Functions", "Graph settings"])
    await page.getByRole("button", { name, exact: true }).click();
  await expect
    .poll(() => layers(page))
    .toEqual({ settings: true, functions: true, abc: false, keypad: true, closed: false });
  await escapeOneLayerAtATime(page, [
    { settings: false },
    { functions: false },
    { keypad: false },
    { closed: true },
  ]);
  expect(await prevented(page)).toEqual([true, true, true, false]);
});

test("KB-7 shortcuts match event.code with Option-modified keys and skip composition", async ({
  page,
}) => {
  await openShell(page);
  await rowField(page, "1").click();
  await page.keyboard.type("x");
  await send(page, { code: "KeyK", key: "˚", altKey: true });
  await expect.poll(() => keypadOpen(page)).toBe(true);
  await send(page, { code: "KeyK", key: "k", ctrlKey: true, isComposing: true });
  await frames(page);
  expect(await keypadOpen(page)).toBe(true);
  await send(page, { code: "KeyZ", key: "w", ctrlKey: true });
  await expect.poll(async () => (await rows(page))[0].latex).toBe("");
  await send(page, { code: "KeyY", key: "z", ctrlKey: true });
  await expect.poll(async () => (await rows(page))[0].latex).toBe("x");
  await page.keyboard.press("Alt+KeyK");
  await expect.poll(() => keypadOpen(page)).toBe(false);
});

test("KB-13 Undo, Redo, Clear all, Add item and every keypad key are tabbable in visual order; a hidden keypad and collapsed list are skipped", async ({
  page,
}) => {
  await openShell(page, `?w=800&h=600&rows=${enc(["1"])}`);
  await rowField(page, "1").click();
  for (const key of ["End", "2", "Control+KeyZ", "Control+KeyK"]) await page.keyboard.press(key); // Undo and Redo both enabled; keypad open
  await page.getByRole("button", { name: /^edit list/i }).click();
  const open = await tabCycle(page);
  expect(open.filter((d) => d.hidden)).toEqual([]);
  expectOrder(
    open.map((d) => d.name),
    [/^add item/i, /^undo/i, /^redo/i, /^clear all/i]
  );
  const keys = open.filter((d) => d.keypad);
  expect(keys.length).toBeGreaterThan(0);
  expect(keys).toHaveLength(
    await page.locator('#calc [aria-label="Keypad"] button:visible').count()
  );
  expect(
    keys.filter((d, i) => i > 0 && d.top < keys[i - 1].top - 2 && d.left <= keys[i - 1].left)
  ).toEqual([]); // up only into a group further right
  await api(page, "c.updateSettings({ keypad: false })"); // tabCycle left focus on #outside, outside the shadow root
  await page.getByRole("button", { name: /^collapse list/i }).click();
  // AN-3's 200 ms collapse outlasts 15 frames on a 120 Hz display, so wait for it to finish first.
  await expect
    .poll(() =>
      page.evaluate(
        () => globalThis.__calculatorHarness!.engine.getSnapshot().settings.expressionsCollapsed
      )
    )
    .toBe(true);
  await frames(page, 15);
  expect(
    (await tabCycle(page)).filter((d) => d.row || (d.keypad && !/^show keypad$/i.test(d.name)))
  ).toEqual([]);
});
