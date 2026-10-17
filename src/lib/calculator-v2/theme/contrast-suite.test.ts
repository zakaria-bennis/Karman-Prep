// The 12-skin contrast suite: measures the generated table against the 10.3 role targets (TH-1),
// the TH-7 colour-blind distance and the TH-8 fill alphas.
import { expect, it } from "vitest";
import { compositeOver, contrastRatio, deltaEOk, simulateCvd } from "./contrast";
import { SKIN_COLORS } from "./skin-colors.generated";
import { CURVE_SLOTS, SKIN_IDS, type SkinId, type SkinPalette } from "./skins";
import { ROLE_TARGETS } from "./targets";

const VISIONS = ["normal", "protan", "deutan", "tritan"] as const;

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

it("TH-1 minor gridlines are lighter than major gridlines and curves reach 5.85:1 on the paper", () => {
  for (const s of SKIN_IDS) {
    const { roles, curves } = pal(s);
    expect(
      contrastRatio(roles.gridMinor, roles.paper),
      `${s}: gridMinor below gridMajor on paper`
    ).toBeLessThan(contrastRatio(roles.gridMajor, roles.paper));
    for (const k of CURVE_SLOTS) {
      expect(contrastRatio(curves[k], roles.paper), `${s}: ${k} on paper`).toBeGreaterThanOrEqual(
        5.85
      );
    }
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

it("TH-7 the six curve colours are at least 0.08 ΔE_OK apart under normal, protan, deutan and tritan vision", () => {
  for (const s of SKIN_IDS) {
    const { curves } = pal(s);
    for (const vision of VISIONS) {
      const seen = (k: (typeof CURVE_SLOTS)[number]) =>
        vision === "normal" ? curves[k] : simulateCvd(curves[k], vision);
      for (let i = 0; i < CURVE_SLOTS.length; i++) {
        for (let j = i + 1; j < CURVE_SLOTS.length; j++) {
          const a = CURVE_SLOTS[i];
          const b = CURVE_SLOTS[j];
          expect(
            deltaEOk(seen(a), seen(b)),
            `${s}: ${a} and ${b}, ${vision}`
          ).toBeGreaterThanOrEqual(0.08);
        }
      }
    }
  }
});

it("TH-8 each fill alpha gives 1.15:1 against the paper", () => {
  for (const s of SKIN_IDS) {
    const { roles } = pal(s);
    fills(s).forEach(({ color, alpha }, i) => {
      const ratio = contrastRatio(compositeOver(color, alpha, roles.paper), roles.paper);
      const label = `${s}: ${CURVE_SLOTS[i]} fill`;
      expect(ratio, label).toBeGreaterThanOrEqual(1.15);
      expect(ratio, label).toBeLessThan(1.17);
    });
  }
});
