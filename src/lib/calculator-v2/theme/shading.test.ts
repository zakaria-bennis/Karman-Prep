import { expect, it } from "vitest";
import { compositeOver, compositeShading, contrastRatio } from "./contrast";
import { SKIN_COLORS } from "./skin-colors.generated";
import { CURVE_SLOTS, SKIN_IDS } from "./skins";

const MAX_FILL_ALPHA = 0.4;

it("TH-8 each skin's cap keeps every curve at 4.5:1 over any shading and never exceeds a 40% mix", () => {
  for (const id of SKIN_IDS) {
    const { roles, curves, fillAlpha, shadingCap } = SKIN_COLORS[id].normal;
    const fills = CURVE_SLOTS.map((k) => ({ color: curves[k], alpha: fillAlpha[k] }));
    for (const k of CURVE_SLOTS) {
      expect(
        contrastRatio(curves[k], roles.paper) / shadingCap,
        `${id} ${k}`
      ).toBeGreaterThanOrEqual(4.5);
      expect(shadingCap, `${id} ${k}`).toBeLessThanOrEqual(
        contrastRatio(compositeOver(curves[k], MAX_FILL_ALPHA, roles.paper), roles.paper) + 1e-9
      );
    }
    // Every curve stays 4.5:1 over the strongest shading, all six fills stacked.
    const darkest = compositeShading(roles.paper, fills, shadingCap);
    for (const k of CURVE_SLOTS)
      expect(contrastRatio(curves[k], darkest), `${id} ${k} over all fills`).toBeGreaterThanOrEqual(
        4.5 - 1e-6
      );
    expect(shadingCap, id).toBeGreaterThan(1.3); // stronger than the Phase 1 cap
  }
});

it("TH-8 single fills use min(40%, the cap over 1.04) so an overlap stays 1.04 apart", () => {
  for (const id of SKIN_IDS) {
    const { roles, curves, fillAlpha, shadingCap } = SKIN_COLORS[id].normal;
    for (const k of CURVE_SLOTS) {
      const one = { color: curves[k], alpha: fillAlpha[k] };
      expect(fillAlpha[k]).toBeLessThanOrEqual(MAX_FILL_ALPHA);
      const single = compositeShading(roles.paper, [one], shadingCap);
      expect(contrastRatio(single, roles.paper), `${id} ${k}`).toBeLessThanOrEqual(
        shadingCap / 1.04 + 0.01
      );
      for (const j of CURVE_SLOTS) {
        const two = compositeShading(
          roles.paper,
          [one, { color: curves[j], alpha: fillAlpha[j] }],
          shadingCap
        );
        expect(contrastRatio(two, single), `${id} ${k}+${j}`).toBeGreaterThanOrEqual(1.04 - 0.005);
      }
    }
  }
});
