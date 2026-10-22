// The Settings theme picker (owner decision, 2026-10-22) on the shell harness: Auto, Classic and the
// 12 site skins as a radio group; arrow keys, Space and Enter; the choice applies at once, is
// remembered on the device and reaches every calculator; Classic is the /calculator page's default
// (the harness's theme=classic) and Auto the quiz's; a change keeps the expressions and the view;
// it fits a 390 px phone; blocked storage still applies the choice.

import { expect, test, type Page } from "@playwright/test";
import { THEME_STORAGE_KEY } from "@/lib/calculator/theme/choice";
import { SKIN_COLORS } from "@/lib/calculator/theme/skin-colors.generated";
import { enc, hostVar, openSettings, openShell, tap, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const paper = (skin: keyof typeof SKIN_COLORS) => SKIN_COLORS[skin].normal.roles.paper;
const group = (page: Page) => page.getByRole("radiogroup", { name: "Theme" });
const option = (page: Page, name: string) => group(page).getByRole("radio", { name });

test("the Theme section lists Auto, Classic and the 12 site themes; the quiz starts on Auto and arrow keys, Space and Enter pick at once", async ({
  page,
  browserName,
}) => {
  await openShell(page, "?skin=sage&w=800&h=600");
  await openSettings(page);
  await expect(group(page).getByRole("radio")).toHaveCount(14);
  await expect(option(page, "Auto")).toBeChecked();
  expect(await hostVar(page, "--kc-paper")).toBe(paper("sage"));
  await option(page, "Auto").focus();
  await page.keyboard.press("ArrowRight");
  await expect(option(page, "Classic")).toBeChecked();
  await expect(option(page, "Classic")).toBeFocused();
  expect(await hostVar(page, "--kc-paper")).toBe(paper("classic"));
  await page.keyboard.press("ArrowDown");
  await expect(option(page, "Observatory")).toBeChecked();
  expect(await hostVar(page, "--kc-paper")).toBe(paper("observatory"));
  await page.keyboard.press("ArrowLeft");
  await expect(option(page, "Classic")).toBeChecked();
  // The selected swatch carries the accent ring; the focused option draws the popover's outline.
  const looks = await option(page, "Classic").evaluate((input) => {
    const label = input.closest("label")!;
    return {
      ring: getComputedStyle(label.querySelector(".kc-theme-swatch")!).boxShadow,
      outline: getComputedStyle(label).outlineStyle,
    };
  });
  expect(looks.ring).not.toBe("none");
  // WebKit does not match :focus-visible on a scripted focus moved by arrow keys; same rule there.
  if (browserName === "chromium") expect(looks.outline).toBe("solid");
  await option(page, "Plum").focus();
  await page.keyboard.press("Enter");
  await expect(option(page, "Plum")).toBeChecked();
  expect(await hostVar(page, "--kc-paper")).toBe(paper("plum"));
  await option(page, "Rose").focus();
  await page.keyboard.press(" ");
  await expect(option(page, "Rose")).toBeChecked();
  expect(await hostVar(page, "--kc-paper")).toBe(paper("rose"));
  // The popover stays open through every pick.
  await expect(page.getByRole("region", { name: "Graph Settings" })).toBeVisible();
});

test("Classic is the /calculator default on a dark site theme; a pick is remembered after a reload and in the quiz, and Auto follows the site theme", async ({
  page,
  isMobile,
}) => {
  await openShell(page, "?skin=observatory&theme=classic&w=800&h=600");
  expect(await hostVar(page, "--kc-paper")).toBe(paper("classic"));
  expect(await hostVar(page, "color-scheme")).toMatch(/^(only light|light only)$/);
  await openSettings(page);
  await expect(option(page, "Classic")).toBeChecked();
  await tap(isMobile, option(page, "Forest"));
  expect(await hostVar(page, "--kc-paper")).toBe(paper("forest"));
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe("forest");
  await page.waitForLoadState("networkidle"); // WebKit logs the lazy chunks a reload cuts short
  await page.reload();
  await page.waitForFunction(() => globalThis.__shell !== undefined);
  expect(await hostVar(page, "--kc-paper")).toBe(paper("forest"));
  expect(await hostVar(page, "color-scheme")).toBe("dark");
  await openShell(page, "?skin=ivory&w=800&h=600"); // the quiz: its default would be Auto
  expect(await hostVar(page, "--kc-paper")).toBe(paper("forest"));
  await openSettings(page);
  await expect(option(page, "Forest")).toBeChecked();
  await tap(isMobile, option(page, "Auto"));
  expect(await hostVar(page, "--kc-paper")).toBe(paper("ivory"));
  await page.evaluate(() => (document.documentElement.dataset.theme = "charcoal"));
  await expect.poll(() => hostVar(page, "--kc-paper")).toBe(paper("charcoal"));
});

test("a theme change keeps the expressions, the view, the keypad and the open popover", async ({
  page,
  isMobile,
}) => {
  await openShell(page, `?w=800&h=600&rows=${enc(["y=x^2", "a=3", "(1,2)"])}`);
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
        bounds: c.graphpaperBounds.mathCoordinates,
        keypad: c.settings.keypad,
      };
    });
  const before = await state();
  await openSettings(page);
  for (const name of ["Charcoal", "Peach", "Classic"]) {
    await tap(isMobile, option(page, name));
    expect(await state()).toEqual(before);
  }
  await expect(page.getByRole("region", { name: "Graph Settings" })).toBeVisible();
});

test("on a 390 by 844 phone the Theme section fits the popover, every option is a tap target of 30 px or more, and a tap applies", async ({
  page,
  isMobile,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openShell(page);
  await openSettings(page);
  const last = option(page, "Plum");
  await last.evaluate((el) => el.closest("label")!.scrollIntoView({ block: "nearest" }));
  const boxes = await group(page).evaluate((g) => {
    const pop = g.closest(".kc-settings-body")!.getBoundingClientRect();
    return {
      pop: { left: pop.left, right: pop.right },
      options: [...g.querySelectorAll("label")].map((l) => {
        const r = l.getBoundingClientRect();
        const name = l.querySelector<HTMLElement>(".kc-theme-name")!;
        return {
          left: r.left,
          right: r.right,
          height: r.height,
          clipped: name.scrollWidth > name.clientWidth + 1,
        };
      }),
    };
  });
  expect(boxes.pop.left).toBeGreaterThanOrEqual(0);
  expect(boxes.pop.right).toBeLessThanOrEqual(390);
  for (const o of boxes.options) {
    expect(o.left).toBeGreaterThanOrEqual(boxes.pop.left);
    expect(o.right).toBeLessThanOrEqual(boxes.pop.right);
    expect(o.height).toBeGreaterThanOrEqual(30);
    expect(o.clipped).toBe(false); // every name reads in full
  }
  await tap(isMobile, last);
  await expect(last).toBeChecked();
  expect(await hostVar(page, "--kc-paper")).toBe(paper("plum"));
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
  await openShell(page, "?skin=paper&theme=classic&w=800&h=600");
  expect(await hostVar(page, "--kc-paper")).toBe(paper("classic"));
  await openSettings(page);
  await tap(isMobile, option(page, "Lavender"));
  await expect(option(page, "Lavender")).toBeChecked();
  expect(await hostVar(page, "--kc-paper")).toBe(paper("lavender"));
});
