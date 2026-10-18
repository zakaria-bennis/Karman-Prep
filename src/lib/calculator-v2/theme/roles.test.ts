import { expect, it } from "vitest";
import { compositeOver, compositeShading, contrastRatio, toOklch } from "./contrast";
import {
  CHROME_VARS,
  CURVE_VARS,
  EXPLICIT_COLOUR_NOTE,
  FILL_ALPHA_VARS,
  ROLE_VARS,
  hostThemeCss,
  nextSlot,
  resolveRowColor,
  resolveSkinId,
} from "./roles";
import { SKIN_COLORS } from "./skin-colors.generated";
import { SHADING_CAP_VAR } from "./vars";
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
    warning: "--kc-warning",
    tooltip: "--kc-tooltip",
    tooltipLabel: "--kc-tooltip-label",
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

it("TH-10 new rows take slots c1 to c6 in order and repeat", () => {
  expect(Array.from({ length: 14 }, (_, i) => nextSlot(i))).toEqual([
    "c1",
    "c2",
    "c3",
    "c4",
    "c5",
    "c6",
    "c1",
    "c2",
    "c3",
    "c4",
    "c5",
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
        adjusted: false,
      });
    }
  }
  expect(resolveRowColor("c1", "ivory").hex).not.toBe(resolveRowColor("c1", "observatory").hex);
  expect(resolveRowColor("not-a-colour", "paper")).toEqual(resolveRowColor("c1", "paper"));
});

it("TH-11 an explicit hex at 4.53:1 on Warm ivory is lifted to 5.85:1 and stays 4.5:1 over capped shading (OI-1)", () => {
  const { roles, curves, fillAlpha } = pal("ivory");
  const paper = roles.paper;
  expect(contrastRatio("#757575", paper)).toBeCloseTo(4.53, 2);
  const r = resolveRowColor("#757575", "ivory");
  expect(r).toMatchObject({ hex: "#626262", adjusted: true });
  expect(contrastRatio(r.hex, paper)).toBeGreaterThanOrEqual(5.85);
  const shade = compositeShading(paper, [
    { color: r.hex, alpha: r.fillAlpha },
    { color: curves.c1, alpha: fillAlpha.c1 },
  ]);
  expect(contrastRatio(shade, paper)).toBeLessThanOrEqual(1.3);
  expect(contrastRatio(r.hex, shade)).toBeGreaterThanOrEqual(4.5);
});

it("TH-11 explicit colours keep hue and chroma (except to stay in gamut) and move only in lightness", () => {
  const cases: [string, SkinId, string | null][] = [
    ["#2E7D32", "ivory", "#207126"],
    ["#ffd400", "ivory", null],
    ["#1f3fbf", "observatory", null],
  ];
  for (const [hex, skin, out] of cases) {
    const paper = pal(skin).roles.paper;
    const r = resolveRowColor(hex, skin);
    const label = `${hex} on ${skin}`;
    expect(r.adjusted, label).toBe(true);
    if (out !== null) expect(r.hex, label).toBe(out);
    expect(contrastRatio(r.hex, paper), label).toBeGreaterThanOrEqual(5.9);
    const before = toOklch(hex);
    const after = toOklch(r.hex);
    expect(Math.abs(after.h - before.h), label).toBeLessThan(0.5);
    expect(after.c, label).toBeLessThanOrEqual(before.c + 0.002);
    expect(
      contrastRatio(compositeOver(r.hex, r.fillAlpha, paper), paper),
      label
    ).toBeGreaterThanOrEqual(1.15);
  }
});

it("TH-11 an explicit colour already at 5.85:1 is unchanged and shows no note", () => {
  expect(resolveRowColor("#000000", "paper")).toMatchObject({ hex: "#000000", adjusted: false });
  expect(resolveRowColor("#FFFFFF", "observatory")).toMatchObject({
    hex: "#ffffff",
    adjusted: false,
  });
  expect(EXPLICIT_COLOUR_NOTE).toBe("Colour adjusted for contrast on this theme");
});

it("TH-3 hostThemeCss declares every role, curve and fill alpha and the shading cap of the skin on :host and nothing else", () => {
  const { roles, curves, fillAlpha, shadingCap } = pal("sage");
  const css = hostThemeCss("sage");
  expect(css.startsWith(":host{")).toBe(true);
  expect(css.endsWith("}")).toBe(true);
  const entries = css
    .slice(6, -1)
    .split(";")
    .map((decl) => decl.split(":"));
  expect(entries).toHaveLength(33);
  expect(entries).toEqual([
    ...COLOR_ROLES.map((r) => [ROLE_VARS[r], roles[r]]),
    ...CURVE_SLOTS.map((k) => [CURVE_VARS[k], curves[k]]),
    ...CURVE_SLOTS.map((k) => [FILL_ALPHA_VARS[k], String(fillAlpha[k])]),
    [SHADING_CAP_VAR, String(shadingCap)],
  ]);
});
