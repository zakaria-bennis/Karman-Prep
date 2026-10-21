// The five default curve colours on every skin (owner decision, 2026-10-21): red, blue, green,
// purple and black as new rows take them, each at least 3:1 on the graph paper and clearly apart
// (OKLab ΔE) from the other four and from the axis and grid greys. Desmos's colours are kept
// wherever they pass; the one change is black on the dark skins (derive.ts darkInk).
import { expect, it } from "vitest";
import { contrastRatio, deltaEOk } from "./contrast";
import { defaultCurveColours } from "./derive";
import { DESMOS_CURVES, NEW_ROW_GREEN } from "./desmos-palette";
import { resolveRowColor } from "./roles";
import { SKIN_COLORS } from "./skin-colors.generated";
import { SKIN_IDS } from "./skins";
import { CURVE_GREYS, CURVE_MIN_CONTRAST, CURVE_MIN_DELTA_E } from "./targets";

const NAMES = ["red", "blue", "green", "purple", "black"] as const;

it("the five default colours are what new rows draw on each skin", () => {
  for (const skin of SKIN_IDS) {
    const { dark, curves } = SKIN_COLORS[skin].normal;
    const drawn = ["c1", "c2", NEW_ROW_GREEN, "c4", "c6"].map((c) => resolveRowColor(c, skin).hex);
    expect(defaultCurveColours(dark, curves), skin).toEqual(drawn);
  }
});

it("each default colour has 3:1 on the paper on every skin", () => {
  for (const skin of SKIN_IDS) {
    const { dark, curves, roles } = SKIN_COLORS[skin].normal;
    defaultCurveColours(dark, curves).forEach((hex, i) => {
      expect(contrastRatio(hex, roles.paper), `${skin} ${NAMES[i]} ${hex}`).toBeGreaterThanOrEqual(
        CURVE_MIN_CONTRAST
      );
    });
  }
});

it("the default colours stand apart from each other and from the axis and gridlines", () => {
  for (const skin of SKIN_IDS) {
    const { dark, curves, roles } = SKIN_COLORS[skin].normal;
    const colours = defaultCurveColours(dark, curves);
    colours.forEach((a, i) => {
      for (let j = i + 1; j < colours.length; j++) {
        expect(deltaEOk(a, colours[j]), `${skin} ${NAMES[i]}/${NAMES[j]}`).toBeGreaterThanOrEqual(
          CURVE_MIN_DELTA_E
        );
      }
      for (const grey of CURVE_GREYS) {
        expect(deltaEOk(a, roles[grey]), `${skin} ${NAMES[i]}/${grey}`).toBeGreaterThanOrEqual(
          CURVE_MIN_DELTA_E
        );
      }
    });
  }
});

it("Desmos's colours are kept on every skin except black on the dark ones", () => {
  for (const skin of SKIN_IDS) {
    const { dark, curves } = SKIN_COLORS[skin].normal;
    if (!dark) expect(curves, skin).toEqual(DESMOS_CURVES);
    else expect(curves.c6, skin).not.toBe("#ffffff"); // white vanishes into the near-white axis
  }
});

it("the bar is Desmos's own closest pair: blue and purple on white", () => {
  const pair = deltaEOk(DESMOS_CURVES.c2, DESMOS_CURVES.c4);
  expect(pair).toBeGreaterThanOrEqual(CURVE_MIN_DELTA_E);
  expect(pair).toBeLessThan(0.13);
});
