import { expect, it } from "vitest";
import {
  CHROME_VARS,
  CURVE_VARS,
  FILL_ALPHA_VARS,
  ROLE_VARS,
  hostThemeCss,
  nextSlot,
  resolveRowColor,
  resolveSkinId,
} from "./roles";
import { SKIN_COLORS } from "./skin-colors.generated";
import { COLOR_ROLES, CURVE_SLOTS, SKIN_IDS, type SkinId, type SkinPalette } from "./skins";

function pal(s: SkinId): SkinPalette {
  return SKIN_COLORS[s].normal;
}

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

it("F-A1 new rows cycle red, blue, green, purple, black and repeat, skipping orange", () => {
  expect(Array.from({ length: 12 }, (_, i) => nextSlot(i))).toEqual([
    "c1",
    "c2",
    "c3",
    "c4",
    "c6",
    "c1",
    "c2",
    "c3",
    "c4",
    "c6",
    "c1",
    "c2",
  ]);
});

it("TH-10 a slot id resolves from the active skin and re-maps when the skin changes", () => {
  for (const s of SKIN_IDS) {
    for (const k of CURVE_SLOTS) {
      expect(resolveRowColor(k, s), `${s}: ${k}`).toEqual({
        hex: pal(s).curves[k],
        fillAlpha: pal(s).fillAlpha[k],
      });
    }
  }
  expect(resolveRowColor("c1", "ivory").hex).not.toBe(resolveRowColor("c1", "observatory").hex);
  expect(resolveRowColor("not-a-colour", "paper")).toEqual(resolveRowColor("c1", "paper"));
});

it("F-A1 an explicit colour is used as is with a 40% fill on light skins and inverted on dark skins", () => {
  expect(resolveRowColor("#757575", "ivory")).toEqual({ hex: "#757575", fillAlpha: 0.4 });
  expect(resolveRowColor("#FFD400", "paper")).toEqual({ hex: "#ffd400", fillAlpha: 0.4 });
  expect(resolveRowColor("#000000", "observatory")).toEqual({ hex: "#ffffff", fillAlpha: 0.4 });
  expect(resolveRowColor("#c74440", "observatory").hex).toBe("#38bbbf");
});

it("TH-3 hostThemeCss declares every role, curve and fill alpha of the skin on :host and nothing else", () => {
  const { roles, curves, fillAlpha } = pal("sage");
  const css = hostThemeCss("sage");
  expect(css.startsWith(":host{")).toBe(true);
  expect(css.endsWith("}")).toBe(true);
  const entries = css
    .slice(6, -1)
    .split(";")
    .map((decl) => decl.split(":"));
  expect(entries).toHaveLength(29);
  expect(entries).toEqual([
    ...COLOR_ROLES.map((r) => [ROLE_VARS[r], roles[r]]),
    ...CURVE_SLOTS.map((k) => [CURVE_VARS[k], curves[k]]),
    ...CURVE_SLOTS.map((k) => [FILL_ALPHA_VARS[k], String(fillAlpha[k])]),
  ]);
});
