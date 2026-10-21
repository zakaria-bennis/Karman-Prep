import { expect, it } from "vitest";
import { SITE_THEMES, type SiteTheme } from "../../themes/palettes";
import { contrastRatio, toOklch } from "./contrast";
import { buildSkinPalette, deriveRoles } from "./derive";
import { DESMOS_CURVES, desmosCurves, invertHex } from "./desmos-palette";
import { CURVE_SLOTS } from "./skins";

function t(id: string): SiteTheme {
  const theme = SITE_THEMES.find((x) => x.id === id);
  if (!theme) throw new Error(`No site theme ${id}`);
  return theme;
}

it("TH-3 background, label and unadjusted roles come from the 10.3 mapping", () => {
  for (const theme of SITE_THEMES) {
    const r = deriveRoles(theme);
    const message = theme.id;
    expect([r.paper, r.list, r.chrome, r.key, r.keyOperator], message).toEqual(
      theme.dark
        ? [theme.canvas, theme.surface, theme.canvas, theme.raised, theme.surface]
        : [theme.surface, theme.surface, theme.raised, theme.surface, theme.canvas]
    );
    expect([r.accentLabel, r.focusBarLabel], message).toEqual(
      theme.dark ? [theme.canvas, theme.canvas] : [theme.surface, theme.surface]
    );
    expect(r.text, message).toBe(theme.text);
    expect(r.axis, message).toBe(theme.text);
    expect(r.focusRing, message).toBe(theme.math);
    // The quiz's interactive blue (math) is the accent and the focused-row bar, as the reference
    // uses its one blue for both.
    expect(r.accent, message).toBe(r.focusBar);
    // TH-4 keeps the hue; 8-bit encoding moves it by under 2 degrees.
    expect(Math.abs(toOklch(r.accent).h - toOklch(theme.math).h), message).toBeLessThan(2);
    if (theme.dark) expect(r.accent, message).toBe(theme.math);
  }
});

it("R-2 the warning marker keeps its orange hue, 3:1 on the list and chrome in every skin; the tooltip is the skin's ink labelled in its page colour", () => {
  for (const theme of SITE_THEMES) {
    const r = deriveRoles(theme);
    expect(contrastRatio(r.warning, r.list), theme.id).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(r.warning, r.chrome), theme.id).toBeGreaterThanOrEqual(3);
    const { h } = toOklch(r.warning);
    expect(h, theme.id).toBeGreaterThan(45);
    expect(h, theme.id).toBeLessThan(65);
    expect(r.tooltipLabel, theme.id).toBe(theme.dark ? theme.canvas : theme.surface);
    expect(toOklch(r.tooltip).l > toOklch(r.tooltipLabel).l, theme.id).toBe(theme.dark);
    expect(contrastRatio(r.tooltipLabel, r.tooltip), theme.id).toBeGreaterThanOrEqual(7);
  }
  expect(deriveRoles(t("charcoal")).warning).toBe("#fa7e19"); // dark skins keep the seed unchanged
});

it("TH-4 Clean paper's Enter fill derives to #0f5b96", () => {
  expect(t("paper").math).toBe("#145e99");
  expect(deriveRoles(t("paper")).accent).toBe("#0f5b96");
});

it("F-A1 light skins use Desmos's six colours and dark skins their inverses (black a light grey), all with a 40% fill", () => {
  for (const theme of SITE_THEMES) {
    const palette = buildSkinPalette(theme);
    const expected = theme.dark
      ? ["#38bbbf", "#d28f4c", "#cb7abc", "#9fbd59", "#0581e6", "#c4c4c4"]
      : ["#c74440", "#2d70b3", "#348543", "#6042a6", "#fa7e19", "#000000"];
    expect(
      CURVE_SLOTS.map((k) => palette.curves[k]),
      theme.id
    ).toEqual(expected);
    expect(
      CURVE_SLOTS.map((k) => palette.fillAlpha[k]),
      theme.id
    ).toEqual(CURVE_SLOTS.map(() => 0.4));
  }
});

it("TH-19 major and minor gridlines have OKLCH chroma at most 0.02 and keep their contrast targets", () => {
  for (const theme of SITE_THEMES) {
    const roles = deriveRoles(theme);
    for (const role of ["gridMajor", "gridMinor"] as const)
      expect(toOklch(roles[role]).c, `${theme.id} ${role}`).toBeLessThanOrEqual(0.02 + 1e-9);
    expect(contrastRatio(roles.gridMajor, roles.paper)).toBeGreaterThanOrEqual(3);
    const minor = contrastRatio(roles.gridMinor, roles.paper);
    expect(minor).toBeGreaterThanOrEqual(1.4);
    expect(minor).toBeLessThanOrEqual(1.6);
  }
});

it("F-A1 invertHex matches CSS invert(100%)", () => {
  expect(invertHex("#000000")).toBe("#ffffff");
  expect(invertHex("#c74440")).toBe("#38bbbf");
  expect(invertHex(invertHex("#2d70b3"))).toBe("#2d70b3");
  expect(desmosCurves(false)).toEqual(DESMOS_CURVES);
});
