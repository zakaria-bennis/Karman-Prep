// The 12-skin contrast suite: measures the generated table against the 10.3 role targets (TH-1),
// the TH-7 colour-blind distance, the TH-8 fill alphas and the TH-8 capped shading, and the
// TH-11 explicit row colours over that shading.
import { expect, it } from "vitest";
import { compositeOver, compositeShading, contrastRatio, deltaEOk, simulateCvd } from "./contrast";
import { resolveRowColor } from "./roles";
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

it("TH-8 shading never exceeds 1.3:1, two fills stay 1.04:1 from one, and every curve stays 4.5:1 over it", () => {
  for (const s of SKIN_IDS) {
    const { roles, curves } = pal(s);
    const paper = roles.paper;
    const f = fills(s);
    const one = f.map((fill) => compositeShading(paper, [fill]));
    const shades: { label: string; color: string }[] = one.map((color, i) => ({
      label: `${CURVE_SLOTS[i]} fill`,
      color,
    }));
    for (let i = 0; i < f.length; i++) {
      for (let j = 0; j < f.length; j++) {
        if (i === j) continue;
        const label = `${CURVE_SLOTS[i]} and ${CURVE_SLOTS[j]} fills`;
        const two = compositeShading(paper, [f[i], f[j]]);
        expect(contrastRatio(two, paper), `${s}: ${label} on paper`).toBeLessThanOrEqual(1.3);
        expect(
          contrastRatio(two, one[i]),
          `${s}: ${label} against the ${CURVE_SLOTS[i]} fill`
        ).toBeGreaterThanOrEqual(1.04);
        expect(
          contrastRatio(two, one[j]),
          `${s}: ${label} against the ${CURVE_SLOTS[j]} fill`
        ).toBeGreaterThanOrEqual(1.04);
        shades.push({ label, color: two });
      }
    }
    const six = compositeShading(paper, f);
    expect(contrastRatio(six, paper), `${s}: six fills on paper`).toBeLessThanOrEqual(1.3);
    shades.push({ label: "six fills", color: six });
    for (const k of CURVE_SLOTS) {
      for (const shade of shades) {
        expect(
          contrastRatio(curves[k], shade.color),
          `${s}: ${k} over ${shade.label}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

it("TH-8 no fills give the paper, one fill under the cap gives that fill over the paper, and one fill over the cap is pulled back to 1.3:1", () => {
  expect(compositeShading("#fffdf7", [])).toBe("#fffdf7");
  // 1.16:1 against the paper, under the cap.
  const under = compositeShading("#fffdf7", [{ color: "#285b79", alpha: 0.1 }]);
  expect(under).toBe("#eaedea");
  expect(under).toBe(compositeOver("#285b79", 0.1, "#fffdf7"));
  // The uncapped "#c9d5d8" is 1.475:1 against the paper.
  const over = compositeShading("#fffdf7", [{ color: "#285b79", alpha: 0.25 }]);
  expect(over).toBe("#dae2e2");
  expect(contrastRatio(over, "#fffdf7")).toBeLessThanOrEqual(1.3);
});

it("TH-11 explicit colours meet 5.85:1 on the paper and 4.5:1 over capped shading in all 12 skins", () => {
  for (const s of SKIN_IDS) {
    const paper = pal(s).roles.paper;
    for (const hex of ["#757575", "#2e7d32", "#ffd400", "#1f3fbf"]) {
      const r = resolveRowColor(hex, s);
      const own = { color: r.hex, alpha: r.fillAlpha };
      const label = `${s}: ${hex} as ${r.hex}`;
      expect(contrastRatio(r.hex, paper), `${label} on paper`).toBeGreaterThanOrEqual(5.85);
      expect(
        contrastRatio(r.hex, compositeShading(paper, [own])),
        `${label} over its own fill`
      ).toBeGreaterThanOrEqual(4.5);
      fills(s).forEach((f, i) => {
        expect(
          contrastRatio(r.hex, compositeShading(paper, [own, f])),
          `${label} over its own and the ${CURVE_SLOTS[i]} fill`
        ).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
