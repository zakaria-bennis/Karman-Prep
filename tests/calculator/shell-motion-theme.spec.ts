// Calculator shell motion and theme browser tests: the motion limits of
// AN-14, the quiz and OS reduced-motion paths of AN-13 and AR-38, the live theme of TH-15 and the
// focus rings of TH-14 (with OI-31's inset row ring), on the harness page /harness/calculator.html.

import { expect, test } from "@playwright/test";
import { contrastRatio } from "@/lib/calculator/theme/contrast";
import { SKIN_COLORS } from "@/lib/calculator/theme/skin-colors.generated";
import { SKIN_IDS } from "@/lib/calculator/theme/skins";
import {
  allZero,
  api,
  enc,
  focusedRow,
  frames,
  hostVar,
  INSTANT,
  instantMotion,
  keypadOpen,
  motionAcrossLayers,
  motionNow,
  openShell,
  overshoots,
  PROJECTS,
  rowField,
  rows,
  seconds,
  shortcutKeys,
  strokes,
  tabRings,
  toHex,
  useConsoleGuard,
} from "./shell-helpers";
import { layoutNodeMarked, markLayoutNode, recordStrokes, setThemeAndWait } from "./shell-probes";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

test("AN-14 no transition or animation exceeds 400 ms or overshoots, and durations come from :host custom properties", async ({
  page,
}) => {
  await openShell(page, "?w=800&h=600");
  const all = await motionAcrossLayers(page);
  expect(all.flatMap((m) => m.durations).filter((d) => seconds(d) > 0.4)).toEqual([]);
  expect(all.flatMap((m) => m.easing).filter(overshoots)).toEqual([]);
  expect(await hostVar(page, "--kc-dur-250")).toBe("250ms");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect([await hostVar(page, "--kc-dur-250"), allZero(await motionNow(page))]).toEqual([
    "0ms",
    true,
  ]);
});
test("AN-13 the quiz Question animations setting or the OS preference makes calculator motion instant, Home fade, row insert and list collapse included", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openShell(page, "?w=800&h=600&reducedMotion=1"); // desktop on every project, so Collapse list widens the graph
  await expect(page.locator("#calc")).toHaveAttribute("data-reduced-motion", "true");
  expect(allZero(await motionAcrossLayers(page))).toBe(true);
  expect(await instantMotion(page)).toEqual(INSTANT);
  await api(page, "globalThis.__shell.handle.setReducedMotion(false)");
  await expect(page.locator("#calc")).toHaveAttribute("data-reduced-motion", "false");
  expect(await hostVar(page, "--kc-dur-200")).toBe("200ms");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await hostVar(page, "--kc-dur-200")).toBe("0ms");
  expect(await instantMotion(page)).toEqual(INSTANT); // the OS path: reducedMotionMedia into GraphPanel
});
test("AR-38 CSS transitions and keyframes stop under prefers-reduced-motion and the keypad opens within a frame", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openShell(page, "?w=800&h=600");
  expect(allZero(await motionAcrossLayers(page))).toBe(true);
  await page.keyboard.press("Escape");
  await expect.poll(() => keypadOpen(page)).toBe(false); // focus is on Graph settings; closes the keypad left open
  await page.keyboard.press((await shortcutKeys(page)).keypad);
  await frames(page, 1);
  const keypad = page.getByRole("region", { name: "Keypad" });
  const first = await keypad.boundingBox();
  await page.waitForTimeout(300);
  expect(await keypad.boundingBox()).toEqual(first);
});
test("TH-15 site theme (light to dark), contrast and forced-colour changes repaint within one frame with no remount and no lost rows; with no site theme the calculator is classic whatever the colour scheme", async ({
  page,
}) => {
  await page.addInitScript(recordStrokes);
  await openShell(page, `?skin=ivory&w=800&h=600&rows=${enc(["y=x", "1+1"])}`);
  await rowField(page, "2").click();
  await page.evaluate(markLayoutNode); // sets a property on [data-kc-layout] that a remount would lose
  const after = await page.evaluate(setThemeAndWait, "observatory");
  const roles = SKIN_COLORS.observatory.normal.roles; // the site's Observatory is the calculator's
  expect([after.strokes.includes(roles.axis.toLowerCase()), after.paper]).toEqual([
    true,
    roles.paper.toLowerCase(),
  ]);
  expect([
    await page.evaluate(layoutNodeMarked),
    (await rows(page)).length,
    await focusedRow(page),
  ]).toEqual([true, 2, "2"]);
  const s0 = (await strokes(page)).length;
  await page.emulateMedia({ contrast: "more" });
  await frames(page);
  expect((await strokes(page)).length).toBeGreaterThan(s0);
  const s1 = (await strokes(page)).length;
  await page.emulateMedia({ forcedColors: "active" });
  await frames(page);
  expect((await strokes(page)).length).toBeGreaterThan(s1);
  const paper = async () => (await hostVar(page, "--kc-paper")).trim().toLowerCase();
  await page.emulateMedia({
    contrast: "no-preference",
    forcedColors: "none",
    colorScheme: "light",
  });
  await page.evaluate(() => {
    delete document.documentElement.dataset.theme;
  });
  await frames(page);
  const classic = SKIN_COLORS.classic.normal.roles.paper.toLowerCase();
  expect(await paper()).toBe(classic); // no site theme: classic
  await page.emulateMedia({ colorScheme: "dark" });
  await frames(page, 1);
  expect(await paper()).toBe(classic); // the OS colour scheme does not change the calculator
  const back = await page.evaluate(setThemeAndWait, "sage"); // and a light site theme again
  expect(back.paper).toBe(SKIN_COLORS.sage.normal.roles.paper.toLowerCase());
});
for (const skin of SKIN_IDS)
  test(`TH-14 every shell focusable shows a 2px solid focus-ring outline (offset 2px; rows and the list resizer -2px, OI-31; the delete cross -4px, AK-17) at 3:1 or more in ${skin}`, async ({
    page,
  }, info) => {
    test.skip(!PROJECTS.includes(info.project.name), "computed colours are engine-independent");
    await openShell(page, `?theme=${skin}&w=800&h=600&rows=${enc(["y=x"])}`);
    await api(page, "c.updateSettings({ keypad: true })");
    const rings = await tabRings(page);
    expect([rings.length > 0, rings.some((r) => r.inset)]).toEqual([true, true]); // never vacuous; the row was reached
    for (const r of rings) {
      expect([r.style, r.width, r.offset, toHex(r.color).hex], r.name).toEqual([
        "solid",
        "2px",
        r.inset || r.name.startsWith("Resize expression list")
          ? "-2px"
          : r.name.startsWith("Delete expression")
            ? "-4px"
            : "2px",
        SKIN_COLORS[skin].normal.roles.focusRing.toLowerCase(),
      ]);
      expect(
        contrastRatio(toHex(r.color).hex, toHex(r.background).hex),
        r.name
      ).toBeGreaterThanOrEqual(3);
    }
  });
