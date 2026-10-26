import { expect, it } from "vitest";
import { SITE_THEMES } from "../../themes/palettes";
import { contrastRatio, deltaEOk, toOklch } from "./contrast";
import { buildSkinPalette, deriveRoles } from "./derive";
import { DESMOS_CURVES, desmosCurves, invertHex } from "./desmos-palette";
import { CURVE_SLOTS, DARK_SKIN_IDS, LIGHT_SKIN_IDS, THEME_SKIN_IDS } from "./skins";
import { CALCULATOR_THEMES, SITE_THEME_SKINS, type CalculatorTheme } from "./themes";

function t(id: string): CalculatorTheme {
  const theme = CALCULATOR_THEMES.find((x) => x.id === id);
  if (!theme) throw new Error(`No calculator theme ${id}`);
  return theme;
}

it("lists exactly ten light then ten dark themes, in THEME_SKIN_IDS order, each named once", () => {
  expect(CALCULATOR_THEMES.map((x) => x.id)).toEqual([...THEME_SKIN_IDS]);
  expect(CALCULATOR_THEMES.filter((x) => !x.dark).map((x) => x.id)).toEqual([...LIGHT_SKIN_IDS]);
  expect(CALCULATOR_THEMES.filter((x) => x.dark).map((x) => x.id)).toEqual([...DARK_SKIN_IDS]);
  expect(CALCULATOR_THEMES.map((x) => x.name)).toEqual([
    "White",
    "Map",
    "Sage",
    "Dreamsicle",
    "Marigold",
    "Pastel Pink",
    "Sky",
    "Mint",
    "Lavender",
    "Sand",
    "Observatory",
    "Charcoal",
    "Forest",
    "Plum",
    "Midnight Navy",
    "Ocean",
    "Berry",
    "Slate",
    "Neon Night",
    "Ember",
  ]);
});

it("White is completely white: paper, list, chrome and keys", () => {
  const r = deriveRoles(t("white"));
  expect([r.paper, r.list, r.chrome, r.key]).toEqual(["#ffffff", "#ffffff", "#ffffff", "#ffffff"]);
});

it("the light themes are each their own recipe: no two share a chrome or an accent, and each pair differs clearly in what shows most", () => {
  const light = CALCULATOR_THEMES.filter((x) => !x.dark).map((x) => ({
    id: x.id,
    r: deriveRoles(x),
  }));
  for (const role of ["chrome", "accent"] as const) {
    expect(new Set(light.map((x) => x.r[role])).size, role).toBe(light.length);
  }
  for (let i = 0; i < light.length; i++) {
    for (let j = i + 1; j < light.length; j++) {
      const a = light[i].r;
      const b = light[j].r;
      // The most a viewer sees of each theme: its chrome, its keypad and its accent.
      const apart = Math.max(
        deltaEOk(a.chrome, b.chrome),
        deltaEOk(a.keyOperator, b.keyOperator),
        deltaEOk(a.accent, b.accent)
      );
      expect(apart, `${light[i].id} / ${light[j].id}`).toBeGreaterThan(0.08);
    }
  }
});

it("TH-3 surfaces come from the theme as written; the accent keeps its hue and has 7:1 with its label", () => {
  for (const theme of CALCULATOR_THEMES) {
    const r = deriveRoles(theme);
    const message = theme.id;
    expect([r.paper, r.list, r.chrome, r.key, r.keyOperator], message).toEqual([
      theme.paper,
      theme.list,
      theme.chrome,
      theme.key,
      theme.keyOperator,
    ]);
    expect([r.accentLabel, r.focusBarLabel], message).toEqual([
      theme.accentLabel,
      theme.accentLabel,
    ]);
    expect(r.accent, message).toBe(r.focusBar);
    // TH-4 keeps the hue of a coloured accent; 8-bit encoding moves it by under 2 degrees.
    if (toOklch(theme.accent).c > 0.05)
      expect(Math.abs(toOklch(r.accent).h - toOklch(theme.accent).h), message).toBeLessThan(2);
    expect(contrastRatio(r.accentLabel, r.accent), message).toBeGreaterThanOrEqual(7);
  }
});

it("R-2 the warning marker keeps its orange hue, 3:1 on the list and chrome in every skin; the tooltip is the skin's ink labelled in its page colour", () => {
  for (const theme of CALCULATOR_THEMES) {
    const r = deriveRoles(theme);
    expect(contrastRatio(r.warning, r.list), theme.id).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(r.warning, r.chrome), theme.id).toBeGreaterThanOrEqual(3);
    const { h } = toOklch(r.warning);
    expect(h, theme.id).toBeGreaterThan(45);
    expect(h, theme.id).toBeLessThan(65);
    expect(r.tooltipLabel, theme.id).toBe(theme.dark ? theme.paper : theme.list);
    expect(toOklch(r.tooltip).l > toOklch(r.tooltipLabel).l, theme.id).toBe(theme.dark);
    expect(contrastRatio(r.tooltipLabel, r.tooltip), theme.id).toBeGreaterThanOrEqual(7);
  }
  expect(deriveRoles(t("charcoal")).warning).toBe("#fa7e19"); // dark skins keep the seed unchanged
});

it("Observatory, Charcoal, Forest and Plum keep the site themes' colours, so the auto choice matches the quiz", () => {
  for (const id of ["observatory", "charcoal", "forest", "plum"]) {
    const site = SITE_THEMES.find((x) => x.id === id)!;
    const theme = t(id);
    expect([theme.paper, theme.list, theme.key, theme.text, theme.accent], id).toEqual([
      site.canvas,
      site.surface,
      site.raised,
      site.text,
      site.math,
    ]);
  }
});

it("every site theme maps to a calculator theme of the same lightness", () => {
  for (const site of SITE_THEMES) {
    const skin = SITE_THEME_SKINS[site.id];
    expect(skin, site.id).toBeDefined();
    expect(t(skin).dark, site.id).toBe(site.dark);
  }
});

it("F-A1 light skins use Desmos's six colours and dark skins their inverses (black a neutral grey), all with a 40% fill", () => {
  for (const theme of CALCULATOR_THEMES) {
    const palette = buildSkinPalette(theme);
    const curves = CURVE_SLOTS.map((k) => palette.curves[k]);
    if (theme.dark) {
      expect(curves.slice(0, 5), theme.id).toEqual(
        CURVE_SLOTS.slice(0, 5).map((k) => invertHex(DESMOS_CURVES[k]))
      );
      expect(toOklch(curves[5]).c, theme.id).toBeLessThan(0.01);
    } else {
      expect(palette.curves, theme.id).toEqual(DESMOS_CURVES);
    }
    expect(
      CURVE_SLOTS.map((k) => palette.fillAlpha[k]),
      theme.id
    ).toEqual(CURVE_SLOTS.map(() => 0.4));
  }
});

it("TH-19 major and minor gridlines have OKLCH chroma at most 0.02 and keep their contrast targets", () => {
  for (const theme of CALCULATOR_THEMES) {
    const roles = deriveRoles(theme);
    for (const role of ["gridMajor", "gridMinor"] as const)
      expect(toOklch(roles[role]).c, `${theme.id} ${role}`).toBeLessThanOrEqual(0.02 + 1e-9);
    expect(contrastRatio(roles.gridMajor, roles.paper), theme.id).toBeGreaterThanOrEqual(3);
    const minor = contrastRatio(roles.gridMinor, roles.paper);
    expect(minor, theme.id).toBeGreaterThanOrEqual(1.4);
    expect(minor, theme.id).toBeLessThanOrEqual(1.6);
  }
});

it("F-A1 invertHex matches CSS invert(100%)", () => {
  expect(invertHex("#000000")).toBe("#ffffff");
  expect(invertHex("#c74440")).toBe("#38bbbf");
  expect(invertHex(invertHex("#2d70b3"))).toBe("#2d70b3");
  expect(desmosCurves(false)).toEqual(DESMOS_CURVES);
});
