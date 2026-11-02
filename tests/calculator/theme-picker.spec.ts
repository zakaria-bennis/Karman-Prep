// The Settings theme picker (founder decisions 2026-10-22 and 2026-10-26) on the shell harness: a
// combobox button that opens a list of Dark (the auto choice), Classic and the ten Light and ten Dark themes;
// keyboard and pointer picks; the choice applies at once, is remembered on the device (a retired
// theme moves to its nearest one) and reaches every calculator; Classic is the /calculator page's
// default (the harness's theme=classic) and the auto choice (labelled Dark) the quiz's; a change keeps the expressions and
// the view; the list fits a 390 px phone; blocked storage still applies the choice. Every theme is
// applied once and its colours checked on the calculator.

import { expect, test, type Page } from "@playwright/test";
import { THEME_STORAGE_KEY } from "@/lib/calculator/theme/choice";
import { resolveSkinId } from "@/lib/calculator/theme/roles";
import { SKIN_COLORS, SKIN_NAMES } from "@/lib/calculator/theme/skin-colors.generated";
import { THEME_SKIN_IDS, type SkinId } from "@/lib/calculator/theme/skins";
import { enc, hostVar, openSettings, openShell, tap, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const paper = (skin: SkinId) => SKIN_COLORS[skin].normal.roles.paper;
const button = (page: Page) => page.getByRole("combobox", { name: /^Theme/ });
const list = (page: Page) => page.getByRole("listbox", { name: "Theme" });
const option = (page: Page, name: string) => list(page).getByRole("option", { name, exact: true });

async function pick(page: Page, isMobile: boolean, name: string): Promise<void> {
  await tap(isMobile, button(page));
  await expect(list(page)).toBeVisible();
  await tap(isMobile, option(page, name));
  await expect(list(page)).toBeHidden();
}

test("the Theme button opens Dark (the auto choice), Classic and the Light and Dark groups; the keyboard opens, moves, finds and picks at once", async ({
  page,
}) => {
  await openShell(page, "?skin=sage&w=800&h=700");
  await openSettings(page);
  await expect(button(page)).toHaveAccessibleName("Theme Dark");
  expect(await hostVar(page, "--kc-paper")).toBe(paper("sage"));
  await expect(list(page)).toBeHidden();
  await button(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(list(page)).toBeVisible();
  await expect(list(page).getByRole("option")).toHaveCount(22);
  await expect(list(page).getByRole("group", { name: "Light" }).getByRole("option")).toHaveCount(
    10
  );
  await expect(list(page).getByRole("group", { name: "Dark" }).getByRole("option")).toHaveCount(10);
  const active = () =>
    button(page).evaluate((b) => {
      const id = b.getAttribute("aria-activedescendant");
      return id === null
        ? null
        : b.getRootNode() instanceof ShadowRoot
          ? (b.getRootNode() as ShadowRoot).getElementById(id)?.textContent
          : document.getElementById(id)?.textContent;
    });
  expect(await active()).toBe("Dark");
  await page.keyboard.press("ArrowDown");
  expect(await active()).toBe("Classic");
  await page.keyboard.press("Enter");
  await expect(list(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
  await expect(button(page)).toHaveAccessibleName("Theme Classic");
  expect(await hostVar(page, "--kc-paper")).toBe(paper("classic"));
  // Typing a name's first letters finds it; Space picks.
  await page.keyboard.press("Space");
  await page.keyboard.type("neo");
  expect(await active()).toBe("Neon Night");
  await page.keyboard.press("Space");
  expect(await hostVar(page, "--kc-paper")).toBe(paper("neon"));
  expect(await hostVar(page, "color-scheme")).toBe("dark");
  // Escape closes the list and leaves the popover open; a second Escape closes the popover.
  await page.keyboard.press("ArrowDown");
  await expect(list(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(list(page)).toBeHidden();
  await expect(page.getByRole("region", { name: "Graph Settings" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Graph Settings" })).toHaveCount(0);
});

test("every one of the 20 themes applies from the list: its paper, list, keypad and accent reach the calculator", async ({
  page,
  isMobile,
}) => {
  await openShell(page, `?theme=classic&w=800&h=700&rows=${enc(["y=x^2"])}`);
  await page.evaluate(() => globalThis.__shell!.handle.calculator.updateSettings({ keypad: true }));
  await openSettings(page);
  for (const skin of THEME_SKIN_IDS) {
    await pick(page, isMobile, SKIN_NAMES[skin]);
    const roles = SKIN_COLORS[skin].normal.roles;
    for (const [name, role] of [
      ["--kc-paper", "paper"],
      ["--kc-list", "list"],
      ["--kc-key", "key"],
      ["--kc-accent", "accent"],
    ] as const)
      expect(await hostVar(page, name), `${skin} ${name}`).toBe(roles[role]);
    await expect(button(page)).toHaveAccessibleName(`Theme ${SKIN_NAMES[skin]}`);
    await expect(page.locator(`#calc [data-theme-choice="${skin}"]`)).toHaveAttribute(
      "aria-selected",
      "true"
    );
  }
});

test("Classic is the /calculator default on a dark site theme; a pick is remembered after a reload and in the quiz, and Dark (the auto choice) follows the site theme", async ({
  page,
  isMobile,
}) => {
  await openShell(page, "?skin=observatory&theme=classic&w=800&h=700");
  expect(await hostVar(page, "--kc-paper")).toBe(paper("classic"));
  expect(await hostVar(page, "color-scheme")).toMatch(/^(only light|light only)$/);
  await openSettings(page);
  await expect(button(page)).toHaveAccessibleName("Theme Classic");
  await pick(page, isMobile, "Forest");
  expect(await hostVar(page, "--kc-paper")).toBe(paper("forest"));
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe("forest");
  // A fresh page of the same browser (the same device storage) stands in for a reload, so no
  // navigation cuts short the lazy chunks this page is still loading (WebKit logs those).
  const again = await page.context().newPage();
  await openShell(again, "?skin=observatory&theme=classic&w=800&h=700");
  expect(await hostVar(again, "--kc-paper")).toBe(paper("forest"));
  expect(await hostVar(again, "color-scheme")).toBe("dark");
  const quiz = await page.context().newPage();
  await openShell(quiz, "?skin=ivory&w=800&h=700"); // the quiz: its default would be the auto choice (Dark)
  expect(await hostVar(quiz, "--kc-paper")).toBe(paper("forest"));
  await openSettings(quiz);
  await expect(button(quiz)).toHaveAccessibleName("Theme Forest");
  await pick(quiz, isMobile, "Dark");
  expect(await hostVar(quiz, "--kc-paper")).toBe(paper(resolveSkinId("ivory")));
  await quiz.evaluate(() => (document.documentElement.dataset.theme = "charcoal"));
  await expect.poll(() => hostVar(quiz, "--kc-paper")).toBe(paper("charcoal"));
});

test("a stored theme from the old list opens as its nearest current theme", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "blush"), THEME_STORAGE_KEY);
  await openShell(page, "?theme=classic&w=800&h=700");
  expect(await hostVar(page, "--kc-paper")).toBe(paper("pink"));
  await openSettings(page);
  await expect(button(page)).toHaveAccessibleName("Theme Pastel Pink");
});

test("a theme change keeps the expressions, the view, the keypad and the open popover", async ({
  page,
  isMobile,
}) => {
  await openShell(page, `?w=800&h=700&rows=${enc(["y=x^2", "a=3", "(1,2)"])}`);
  await page.evaluate(() => {
    const c = globalThis.__shell!.handle.calculator;
    c.setMathBounds({ left: -4, right: 9, bottom: -3, top: 6 });
    c.updateSettings({ keypad: true });
  });
  const state = () =>
    page.evaluate(() => {
      const c = globalThis.__shell!.handle.calculator;
      return {
        rows: c.getExpressions(),
        // To 3 decimals: WebKit on a phone can move the graph's size by a fraction of a pixel.
        bounds: Object.fromEntries(
          Object.entries(c.graphpaperBounds.mathCoordinates).map(([k, v]) => [
            k,
            Math.round(v * 1000) / 1000,
          ])
        ),
        keypad: c.settings.keypad,
      };
    });
  const before = await state();
  await openSettings(page);
  for (const name of ["Charcoal", "Dreamsicle", "Classic"]) {
    await pick(page, isMobile, name);
    expect(await state()).toEqual(before);
  }
  await expect(page.getByRole("region", { name: "Graph Settings" })).toBeVisible();
});

test("on a 390 by 844 phone the list fits the popover, every option is a tap target of 32 px or more, and a tap applies", async ({
  page,
  isMobile,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openShell(page);
  await openSettings(page);
  await tap(isMobile, button(page));
  const boxes = await list(page).evaluate((l) => {
    const pop = l.closest(".kc-settings-body")!.getBoundingClientRect();
    const r = l.getBoundingClientRect();
    return {
      pop: { left: pop.left, right: pop.right, top: pop.top, bottom: pop.bottom },
      list: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
      options: [...l.querySelectorAll("[role=option]")].map((o) => {
        const name = o.querySelector<HTMLElement>(".kc-theme-name")!;
        return {
          height: o.getBoundingClientRect().height,
          clipped: name.scrollWidth > name.clientWidth + 1,
        };
      }),
    };
  });
  expect(boxes.list.left).toBeGreaterThanOrEqual(boxes.pop.left);
  expect(boxes.list.right).toBeLessThanOrEqual(boxes.pop.right);
  expect(boxes.list.top).toBeGreaterThanOrEqual(boxes.pop.top);
  expect(boxes.list.bottom).toBeLessThanOrEqual(boxes.pop.bottom + 1);
  for (const o of boxes.options) {
    expect(o.height).toBeGreaterThanOrEqual(32);
    expect(o.clipped).toBe(false); // every name reads in full
  }
  const last = option(page, "Ember");
  await last.evaluate((el) => el.scrollIntoView({ block: "nearest" }));
  await tap(isMobile, last);
  await expect(list(page)).toBeHidden();
  expect(await hostVar(page, "--kc-paper")).toBe(paper("ember"));
});

test("with storage blocked the pick still applies for this calculator and nothing throws", async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  await openShell(page, "?skin=paper&theme=classic&w=800&h=700");
  expect(await hostVar(page, "--kc-paper")).toBe(paper("classic"));
  await openSettings(page);
  await pick(page, isMobile, "Lavender");
  expect(await hostVar(page, "--kc-paper")).toBe(paper("lavender"));
});
