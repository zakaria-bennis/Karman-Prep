import { expect, it } from "vitest";
import {
  CHROME_VARS,
  CURVE_VARS,
  FILL_ALPHA_VARS,
  ROLE_VARS,
  TONE_VARS,
  colourAfter,
  hostThemeCss,
  nextSlot,
  resolveRowColor,
  resolveSkinId,
} from "./roles";
import { SKIN_COLORS } from "./skin-colors.generated";
import { COLOR_ROLES, CURVE_SLOTS, SKIN_IDS, type SkinId, type SkinPalette } from "./skins";
import { TONES } from "./vars";

function pal(s: SkinId): SkinPalette {
  return SKIN_COLORS[s].normal;
}

it("TH-5 the site theme picks its calculator theme; classic when no site theme applies", () => {
  expect(resolveSkinId("paper")).toBe("white");
  expect(resolveSkinId("peach")).toBe("dreamsicle");
  expect(resolveSkinId("rose")).toBe("pink");
  expect(resolveSkinId("plum")).toBe("plum");
  expect(resolveSkinId("observatory")).toBe("observatory");
  expect(resolveSkinId("classic")).toBe("classic");
  expect(resolveSkinId("neon")).toBe("classic"); // a calculator theme, not a site theme
  expect(resolveSkinId("unknown")).toBe("classic");
  expect(resolveSkinId(undefined)).toBe("classic");
  expect(resolveSkinId(null)).toBe("classic");
  expect(resolveSkinId("")).toBe("classic");
});

it("TH-3 every role, tone, curve slot and fill alpha has its own --kc- custom property", () => {
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
    selection: "--kc-selection",
  });
  expect(Object.values(TONE_VARS)).toEqual([
    "--kc-tone-row-number",
    "--kc-tone-text-muted",
    "--kc-tone-equals",
    "--kc-tone-field-text",
    "--kc-tone-field-placeholder",
    "--kc-tone-segment-text",
    "--kc-tone-selected-fill",
    "--kc-tone-field-line",
    "--kc-tone-error-tip",
  ]);
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

it("F-A1 new rows cycle red, blue, Desmos's new-row green, purple, black and repeat, skipping orange", () => {
  const g = "#388c46";
  expect(Array.from({ length: 12 }, (_, i) => nextSlot(i))).toEqual([
    ...["c1", "c2", g, "c4", "c6"],
    ...["c1", "c2", g, "c4", "c6"],
    ...["c1", "c2"],
  ]);
  expect(resolveRowColor(g, "white").hex).toBe("#388c46");
  expect(resolveRowColor(g, "observatory").hex).toBe("#c773b9");
  expect(resolveRowColor("c3", "white").hex).toBe("#348543"); // the picker's green stays
});

it("F-A1 the colour after a column or row follows the new-row cycle, so red follows black", () => {
  const after = (c: string | undefined) => colourAfter(c, 7);
  expect(["c1", "c2", "#388c46", "c3", "c4", "c5", "c6"].map(after)).toEqual([
    "c2",
    "#388c46",
    "c4",
    "c4",
    "c6",
    "c6",
    "c1",
  ]);
  expect([after("#123456"), after(undefined), after("#388C46")]).toEqual([
    nextSlot(7),
    nextSlot(7),
    "c4",
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
  expect(resolveRowColor("c1", "white").hex).not.toBe(resolveRowColor("c1", "observatory").hex);
  expect(resolveRowColor("not-a-colour", "map")).toEqual(resolveRowColor("c1", "map"));
});

it("F-A1 an explicit colour is used as is with a 40% fill on light skins and inverted on dark skins", () => {
  expect(resolveRowColor("#757575", "sky")).toEqual({ hex: "#757575", fillAlpha: 0.4 });
  expect(resolveRowColor("#FFD400", "marigold")).toEqual({ hex: "#ffd400", fillAlpha: 0.4 });
  expect(resolveRowColor("#000000", "observatory")).toEqual({ hex: "#ffffff", fillAlpha: 0.4 });
  expect(resolveRowColor("#c74440", "observatory").hex).toBe("#38bbbf");
});

it("TH-3 hostThemeCss declares the colour scheme, then every role, tone, curve and fill alpha of the skin on :host and nothing else", () => {
  const { roles, tones, curves, fillAlpha } = pal("sage");
  const css = hostThemeCss("sage");
  expect(css.startsWith(":host{")).toBe(true);
  expect(css.endsWith("}")).toBe(true);
  const entries = css
    .slice(6, -1)
    .split(";")
    .map((decl) => decl.split(":"));
  expect(entries).toHaveLength(43);
  expect(entries).toEqual([
    ["color-scheme", "only light"],
    ...COLOR_ROLES.map((r) => [ROLE_VARS[r], roles[r]]),
    ...TONES.map((t) => [TONE_VARS[t], `${Math.round(tones[t] * 100)}%`]),
    ...CURVE_SLOTS.map((k) => [CURVE_VARS[k], curves[k]]),
    ...CURVE_SLOTS.map((k) => [FILL_ALPHA_VARS[k], String(fillAlpha[k])]),
  ]);
  expect(hostThemeCss("observatory").startsWith(":host{color-scheme:dark;")).toBe(true);
  expect(hostThemeCss("classic").startsWith(":host{color-scheme:only light;")).toBe(true);
});
