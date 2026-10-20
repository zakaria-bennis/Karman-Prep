// The contrast suite: measures the generated table against the 10.3 role targets (TH-1).
// Curves and shading follow Desmos (F-A1), so TH-7, TH-8 and TH-11 are no longer checked here.
// The hand-set classic skin copies the reference calculator's measured colours. It is measured
// too: every pair meets its target except the ones CLASSIC_REFERENCE_EXCEPTIONS lists, each pinned
// to the reference's measured ratio, so a change to either side shows up here.
import { expect, it } from "vitest";
import { compositeOver, compositeShading, contrastRatio } from "./contrast";
import { SKIN_COLORS } from "./skin-colors.generated";
import { CURVE_SLOTS, SITE_SKIN_IDS, SKIN_IDS, type SkinId, type SkinPalette } from "./skins";
import { TONE_SPECS, toneBackground, toneOver } from "./tones";
import { TONES } from "./vars";

/**
 * The classic skin's pairs that miss Karman's 10.3 targets because the reference calculator's own
 * colours do, with the measured ratio. PENDING FOUNDER DECISION (AAA targets versus the reference
 * look): until then the classic skin keeps the reference values and these stay listed.
 */
const CLASSIC_REFERENCE_EXCEPTIONS: Readonly<Record<string, number>> = {
  "textSecondary on paper": 5.74,
  "textSecondary on list": 5.74,
  "textSecondary on chrome": 5.04,
  "textSecondary on key": 5.74,
  "textSecondary on keyOperator": 4.9,
  "error on list": 4.5,
  "warning on chrome": 2.82,
  "gridMajor on paper": 2.85,
  "gridMinor on paper": 1.32,
  "focusBarLabel on focusBar": 4.6,
  "accentLabel on accent": 4.6,
  "boundary on list": 1.92,
  "boundary on chrome": 1.68,
  "boundary on key": 1.92,
  "rowNumber tone on tab": 6.63,
  "textMuted tone on list": 5.74,
  "equals tone on list": 4.74,
  "fieldPlaceholder tone on list": 3.59,
  "errorTip tone on tooltipLabel": 5.74,
};

it("TH-1 the classic skin meets every 10.3 target except its listed reference values", () => {
  const { roles } = pal("classic");
  const pairs = ROLE_TARGETS.flatMap((t) => t.on.map((bg) => ({ ...t, bg })));
  for (const fg of ["text", "textSecondary"] as const)
    pairs.push({ fg, bg: "chrome", on: [], min: 7 });
  for (const fg of ["boundary", "focusRing"] as const)
    pairs.push({ fg, bg: "chrome", on: [], min: 3 });
  pairs.push({ fg: "accentLabel", bg: "accent", on: [], min: 7 });
  for (const t of pairs) {
    const name = `${t.fg} on ${t.bg}`;
    const ratio = contrastRatio(roles[t.fg], roles[t.bg]);
    const pinned = CLASSIC_REFERENCE_EXCEPTIONS[name];
    if (pinned !== undefined) {
      expect(ratio, `classic: ${name} (reference value)`).toBeCloseTo(pinned, 2);
      continue;
    }
    expect(ratio, `classic: ${name}`).toBeGreaterThanOrEqual(t.min);
    if (t.max !== undefined) expect(ratio, `classic: ${name}`).toBeLessThanOrEqual(t.max);
  }
});
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
  for (const s of SITE_SKIN_IDS) {
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
  for (const s of SITE_SKIN_IDS) {
    const { roles } = pal(s);
    expect(
      contrastRatio(roles.gridMinor, roles.paper),
      `${s}: gridMinor below gridMajor on paper`
    ).toBeLessThan(contrastRatio(roles.gridMajor, roles.paper));
  }
});

it("TH-1 light-DOM chrome text and tooltip text reach 7:1 and boundary and focus 3:1 on the chrome", () => {
  for (const s of SITE_SKIN_IDS) {
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

it("TH-1 every tone meets its 10.3 target in all 12 site skins; the classic skin's misses are its listed reference values", () => {
  for (const s of SKIN_IDS) {
    const { roles, tones } = pal(s);
    for (const tone of TONES) {
      const spec = TONE_SPECS[tone];
      for (const on of spec.on) {
        const bg = toneBackground(roles, on);
        const name = `${tone} tone on ${on}`;
        const ratio = contrastRatio(toneOver(roles, tone, tones[tone], bg), bg);
        const pinned = s === "classic" ? CLASSIC_REFERENCE_EXCEPTIONS[name] : undefined;
        if (pinned !== undefined) expect(ratio, `classic: ${name}`).toBeCloseTo(pinned, 2);
        else expect(ratio, `${s}: ${name}`).toBeGreaterThanOrEqual(spec.min);
      }
    }
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
  for (const s of SITE_SKIN_IDS) {
    const six = compositeShading(pal(s).roles.paper, fills(s));
    expect(contrastRatio(six, pal(s).roles.paper), `${s}: six fills`).toBeGreaterThan(1.3);
  }
});
