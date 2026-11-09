import { expect, it } from "vitest";
import { SKIN_COLORS } from "@/lib/calculator/theme/skin-colors.generated";
import { parseCssColor } from "../theme-hint";
import { nearestSkin } from "./nearest-skin";

it("picks a dark skin for a dark quiz and a light skin for a light quiz (founder, 2026-11-08)", () => {
  const darkPick = nearestSkin({ background: [14, 20, 28], accent: [120, 170, 230] });
  const lightPick = nearestSkin({ background: [240, 244, 248], accent: [40, 90, 150] });
  expect(SKIN_COLORS[darkPick].normal.dark).toBe(true);
  expect(SKIN_COLORS[lightPick].normal.dark).toBe(false);
});

it("reads computed CSS colours", () => {
  expect(parseCssColor("rgb(1, 2, 3)")).toEqual([1, 2, 3]);
  expect(parseCssColor("rgba(1, 2, 3, 0.5)")).toEqual([1, 2, 3]);
  expect(parseCssColor("color(srgb 1 0 0.5)")).toEqual([255, 0, 127.5]);
  expect(parseCssColor("oklch(0.5 0.1 200)")).toBeNull();
});
