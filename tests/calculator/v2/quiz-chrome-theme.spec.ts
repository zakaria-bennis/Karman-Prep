// Calculator v2 window chrome contrast, focus outlines and theme repaint in the quiz hosts
// (11 task 13; contributions TH-1, TH-14, TH-2, AR-37).

import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { contrastRatio } from "../../../src/lib/calculator-v2/theme/contrast";
import { SKIN_IDS } from "../../../src/lib/calculator-v2/theme/skins";
import { chromeOnly, dock, openV2, trigger } from "./quiz-helpers";

const hex = (css: string) =>
  `#${css
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map((n) => Math.round(Number(n)).toString(16).padStart(2, "0"))
    .join("")}`;

const styleOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, background: s.backgroundColor };
    });

const setSkin = (page: Page, skin: string) =>
  page.evaluate((s) => document.documentElement.setAttribute("data-theme", s), skin);

const barColour = async (page: Page) =>
  hex((await styleOf(page, "[data-calculator-titlebar]")).background);

async function ring(
  page: Page,
  skin: string,
  name: string,
  role: "button" | "separator" = "button"
) {
  await page.keyboard.press("Shift");
  await page.getByRole(role, { name, exact: true }).focus();
  // TH-14 on the focused element itself
  const f = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement!);
    return { outline: [s.outlineStyle, s.outlineWidth, s.outlineOffset], colour: s.outlineColor };
  });
  expect(f.outline, `${skin} ${name}`).toEqual(["solid", "2px", "2px"]);
  expect(
    contrastRatio(hex(f.colour), await barColour(page)),
    `${skin} ${name}`
  ).toBeGreaterThanOrEqual(3);
}

test("TH-1, TH-14 window chrome, every title-bar control, the move handle, grip, splitter and loader keep 7:1 text, 3:1 boundaries and a 2 px 3:1 focus outline in all 12 skins", async ({
  page,
  context,
}, info) => {
  chromeOnly(info.project.name);
  await openV2(page, "diagnostic", { width: 1280, height: 800 });
  const loading = await context.newPage();
  await loading.route(/\/calculator-v2\/host\/quiz-host\.ts/, () => {});
  await loading.goto("/?flow=diagnostic&calc=v2");
  await trigger(loading).click();
  await expect(loading.getByText("Loading calculator…")).toBeVisible();
  for (const skin of SKIN_IDS) {
    await setSkin(page, skin);
    await setSkin(loading, skin);
    const bar = await barColour(page);
    for (const sel of [
      "[aria-roledescription='move handle']",
      "[aria-label='Close calculator']",
      "[aria-label='Maximize calculator']",
      "[aria-label='Minimize calculator']",
    ])
      expect(
        contrastRatio(hex((await styleOf(page, sel)).color), bar),
        `${skin} ${sel}`
      ).toBeGreaterThanOrEqual(7);
    expect(
      contrastRatio(
        hex((await styleOf(page, "[aria-roledescription='resize handle']")).color),
        bar
      ),
      skin
    ).toBeGreaterThanOrEqual(3);
    const panel = await styleOf(loading, "[role=status]:has-text('Loading calculator…')");
    expect(contrastRatio(hex(panel.color), hex(panel.background)), skin).toBeGreaterThanOrEqual(7);
    for (const name of [
      "Karman calculator",
      "Maximize calculator",
      "Minimize calculator",
      "Close calculator",
      "Resize calculator",
    ])
      await ring(page, skin, name);
  }
  await dock(page);
  for (const skin of SKIN_IDS) {
    await setSkin(page, skin);
    expect(
      contrastRatio(hex((await styleOf(page, "[role=separator]")).color), await barColour(page)),
      skin
    ).toBeGreaterThanOrEqual(3);
    await ring(page, skin, "Undock calculator");
    await ring(page, skin, "Resize calculator dock", "separator");
  }
  await page.getByRole("button", { name: "Maximize calculator" }).click();
  for (const skin of SKIN_IDS) {
    await setSkin(page, skin);
    await ring(page, skin, "Restore calculator size");
  }
});

test("TH-2, AR-37 window chrome, splitter, grip and loader take only --kcc-* colours and repaint on a data-theme change", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  const css = readFileSync("src/components/calculator/CalculatorWindow.module.css", "utf8");
  expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|color-mix\(/);
  expect(
    [...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]).filter((v) => !v.startsWith("--kcc-"))
  ).toEqual([]);
  await openV2(page, "diagnostic", { width: 1280, height: 800 });
  const seen: string[] = [];
  for (const skin of ["ivory", "observatory"]) {
    await setSkin(page, skin);
    const [bar, token] = await page.evaluate(() => [
      getComputedStyle(document.querySelector("[data-calculator-titlebar]")!).backgroundColor,
      getComputedStyle(document.documentElement).getPropertyValue("--kcc-chrome").trim(),
    ]);
    expect(hex(bar)).toBe(token.toLowerCase());
    seen.push(bar);
  }
  expect(seen[0]).not.toBe(seen[1]);
});

test("TH-17 the window title and calculator UI text use Arial", async ({ page }) => {
  await openV2(page);
  const title = await page
    .locator("[data-calculator-titlebar] > span")
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(title).toMatch(/^Arial, sans-serif$/);
});
