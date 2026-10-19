import { expect, it } from "vitest";
import { SITE_THEMES, type SiteTheme } from "../../themes/palettes";
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
    if (theme.dark) expect(r.accent, message).toBe(theme.gold);
  }
});

it("TH-4 Clean paper's Enter fill derives to #6d531f", () => {
  expect(deriveRoles(t("paper")).accent).toBe("#6d531f");
});

it("F-A1 light skins use Desmos's six colours and dark skins their inverses, all with a 40% fill", () => {
  for (const theme of SITE_THEMES) {
    const palette = buildSkinPalette(theme);
    const expected = theme.dark
      ? ["#38bbbf", "#d28f4c", "#cb7abc", "#9fbd59", "#0581e6", "#ffffff"]
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

it("F-A1 invertHex matches CSS invert(100%)", () => {
  expect(invertHex("#000000")).toBe("#ffffff");
  expect(invertHex("#c74440")).toBe("#38bbbf");
  expect(invertHex(invertHex("#2d70b3"))).toBe("#2d70b3");
  expect(desmosCurves(false)).toEqual(DESMOS_CURVES);
});
