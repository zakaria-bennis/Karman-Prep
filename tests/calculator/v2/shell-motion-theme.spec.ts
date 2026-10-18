// Calculator v2 shell motion and theme browser tests (10 Tasks 11 and 12): the motion limits of
// AN-14, the quiz and OS reduced-motion paths of AN-13 and AR-38, on the harness page
// /v2/calculator.html.

import { expect, test } from "@playwright/test";
import {
  allZero,
  api,
  frames,
  hostVar,
  INSTANT,
  instantMotion,
  keypadOpen,
  motionAcrossLayers,
  motionNow,
  openShell,
  overshoots,
  seconds,
  useConsoleGuard,
} from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

test("AN-14 no transition or animation exceeds 400 ms or overshoots, and durations come from :host custom properties", async ({
  page,
}) => {
  await openShell(page, "?w=800&h=600");
  const all = await motionAcrossLayers(page);
  expect(all.flatMap((m) => m.durations).filter((d) => seconds(d) > 0.4)).toEqual([]);
  expect(all.flatMap((m) => m.easing).filter(overshoots)).toEqual([]);
  expect(await hostVar(page, "--kc-duration-normal")).toBe("400ms");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect([await hostVar(page, "--kc-duration-normal"), allZero(await motionNow(page))]).toEqual([
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
  expect(await hostVar(page, "--kc-duration-fast")).toBe("200ms");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await hostVar(page, "--kc-duration-fast")).toBe("0ms");
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
  await page.keyboard.press("Control+KeyK");
  await frames(page, 1);
  const keypad = page.getByRole("region", { name: "Keypad" });
  const first = await keypad.boundingBox();
  await page.waitForTimeout(300);
  expect(await keypad.boundingBox()).toEqual(first);
});
