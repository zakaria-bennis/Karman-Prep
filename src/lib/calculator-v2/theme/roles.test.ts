import { expect, it } from "vitest";
import { CHROME_VARS, CURVE_VARS, FILL_ALPHA_VARS, ROLE_VARS, resolveSkinId } from "./roles";

it("TH-5 unknown or missing theme ids fall back to Warm ivory or Observatory by prefers-color-scheme", () => {
  expect(resolveSkinId("paper", true)).toBe("paper");
  expect(resolveSkinId("plum", false)).toBe("plum");
  expect(resolveSkinId("unknown", false)).toBe("ivory");
  expect(resolveSkinId(undefined, false)).toBe("ivory");
  expect(resolveSkinId(null, true)).toBe("observatory");
  expect(resolveSkinId("", true)).toBe("observatory");
});

it("TH-3 every role, curve slot and fill alpha has its own --kc- custom property", () => {
  expect(ROLE_VARS).toEqual({
    paper: "--kc-paper",
    list: "--kc-list",
    chrome: "--kc-chrome",
    key: "--kc-key",
    keyOperator: "--kc-key-operator",
    accent: "--kc-accent",
    text: "--kc-text",
    textSecondary: "--kc-text-secondary",
    error: "--kc-error",
    axis: "--kc-axis",
    gridMajor: "--kc-grid-major",
    gridMinor: "--kc-grid-minor",
    focusRing: "--kc-focus-ring",
    focusBar: "--kc-focus-bar",
    focusBarLabel: "--kc-focus-bar-label",
    accentLabel: "--kc-accent-label",
    boundary: "--kc-boundary",
  });
  expect(Object.values(CURVE_VARS)).toEqual([
    "--kc-curve-1",
    "--kc-curve-2",
    "--kc-curve-3",
    "--kc-curve-4",
    "--kc-curve-5",
    "--kc-curve-6",
  ]);
  expect(Object.values(FILL_ALPHA_VARS)).toEqual([
    "--kc-fill-alpha-1",
    "--kc-fill-alpha-2",
    "--kc-fill-alpha-3",
    "--kc-fill-alpha-4",
    "--kc-fill-alpha-5",
    "--kc-fill-alpha-6",
  ]);
  expect(Object.values(CHROME_VARS)).toEqual([
    "--kcc-chrome",
    "--kcc-text",
    "--kcc-text-secondary",
    "--kcc-boundary",
    "--kcc-focus",
    "--kcc-accent",
    "--kcc-accent-label",
  ]);
});
