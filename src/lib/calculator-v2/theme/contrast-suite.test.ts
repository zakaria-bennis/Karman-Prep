// The 12-skin contrast suite: measures the generated table against the 10.3 role targets (TH-1).
// Curves and shading follow Desmos (F-A1), so TH-7, TH-8 and TH-11 are no longer checked here.
import { expect, it } from "vitest";
import { compositeOver, compositeShading, contrastRatio } from "./contrast";
import { SKIN_COLORS } from "./skin-colors.generated";
import { CURVE_SLOTS, SKIN_IDS, type SkinId, type SkinPalette } from "./skins";
import { ROLE_TARGETS } from "./targets";

function pal(s: SkinId): SkinPalette {
  return SKIN_COLORS[s].normal;
}

function fills(s: SkinId): { color: string; alpha: number }[] {
  const { curves, fillAlpha } = pal(s);
  return CURVE_SLOTS.map((k) => ({ color: curves[k], alpha: fillAlpha[k] }));
}

it("TH-1 every 10.3 foreground role meets its target on each background it sits on in all 12 skins", () => {
  // Primary and secondary text are measured on TEXT_BACKGROUNDS, not the accent: OI-33 amends
  // 10.3 so labels on the accent use the Enter key label role (accentLabel), checked below.
  for (const s of SKIN_IDS) {
    const { roles } = pal(s);
    for (const t of ROLE_TARGETS) {
      for (const bg of t.on) {
        const ratio = contrastRatio(roles[t.fg], roles[bg]);
        expect(ratio, `${s}: ${t.fg} on ${bg}`).toBeGreaterThanOrEqual(t.min);
        if (t.max !== undefined) {
          expect(ratio, `${s}: ${t.fg} on ${bg}`).toBeLessThanOrEqual(t.max);
        }
      }
    }
  }
});

it("TH-1 minor gridlines are lighter than major gridlines", () => {
  // Curves have no contrast target: they are Desmos's colours (F-A1).
  for (const s of SKIN_IDS) {
    const { roles } = pal(s);
    expect(
      contrastRatio(roles.gridMinor, roles.paper),
      `${s}: gridMinor below gridMajor on paper`
    ).toBeLessThan(contrastRatio(roles.gridMajor, roles.paper));
  }
});

it("TH-1 light-DOM chrome text and tooltip text reach 7:1 and boundary and focus 3:1 on the chrome", () => {
  for (const s of SKIN_IDS) {
    const { roles } = pal(s);
    for (const fg of ["text", "textSecondary"] as const) {
      expect(
        contrastRatio(roles[fg], roles.chrome),
        `${s}: ${fg} on chrome`
      ).toBeGreaterThanOrEqual(7);
    }
    for (const fg of ["boundary", "focusRing"] as const) {
      expect(
        contrastRatio(roles[fg], roles.chrome),
        `${s}: ${fg} on chrome`
      ).toBeGreaterThanOrEqual(3);
    }
    expect(
      contrastRatio(roles.accentLabel, roles.accent),
      `${s}: accentLabel on accent`
    ).toBeGreaterThanOrEqual(7);
  }
});

it("F-A1 shading stacks 40% fills over the paper with no cap", () => {
  expect(compositeShading("#ffffff", [])).toBe("#ffffff");
  const one = compositeShading("#ffffff", [{ color: "#c74440", alpha: 0.4 }]);
  expect(one).toBe(compositeOver("#c74440", 0.4, "#ffffff"));
  const two = compositeShading("#ffffff", [
    { color: "#c74440", alpha: 0.4 },
    { color: "#2d70b3", alpha: 0.4 },
  ]);
  expect(two).toBe(compositeOver("#2d70b3", 0.4, one));
  for (const s of SKIN_IDS) {
    const six = compositeShading(pal(s).roles.paper, fills(s));
    expect(contrastRatio(six, pal(s).roles.paper), `${s}: six fills`).toBeGreaterThan(1.3);
  }
});
