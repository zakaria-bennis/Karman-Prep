import { expect, it } from "vitest";
import { SITE_THEMES, type SiteTheme } from "../../themes/palettes";
import { contrastRatio, deltaEOk, inGamut, simulateCvd, toOklab, toOklch } from "./contrast";
import {
  curveCandidates,
  curveScore,
  deriveRoles,
  pickCurveSlots,
  type CurveCandidate,
} from "./derive";
import type { CurveSlot } from "./skins";

const CVD = ["protan", "deutan", "tritan"] as const;
const LATER_SLOTS: readonly CurveSlot[] = ["c2", "c3", "c4", "c5", "c6"];

function t(id: string): SiteTheme {
  const theme = SITE_THEMES.find((x) => x.id === id);
  if (!theme) throw new Error(`No site theme ${id}`);
  return theme;
}

// Both TH-6 tests read the same candidates; compute them once per theme, on first use.
const candidateCache = new Map<string, CurveCandidate[]>();
function candidatesOf(theme: SiteTheme): CurveCandidate[] {
  let cands = candidateCache.get(theme.id);
  if (!cands) {
    cands = curveCandidates(deriveRoles(theme).paper);
    candidateCache.set(theme.id, cands);
  }
  return cands;
}

function byHex(cands: readonly CurveCandidate[], hex: string): CurveCandidate {
  const found = cands.find((c) => c.hex === hex);
  if (!found) throw new Error(`${hex} is not a candidate`);
  return found;
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

it(
  "TH-6 candidates are in-gamut OKLCH grid colours at least 5.95:1 on the paper",
  { timeout: 60_000 },
  () => {
    for (const theme of SITE_THEMES) {
      const paper = deriveRoles(theme).paper;
      const cands = candidatesOf(theme);
      expect(cands.length, theme.id).toBeGreaterThan(1000);
      expect(new Set(cands.map((c) => c.hex)).size, theme.id).toBe(cands.length);
      for (const c of cands) {
        const message = `${theme.id} ${c.hex}`;
        expect(c.contrast, message).toBe(contrastRatio(c.hex, paper));
        expect(c.contrast, message).toBeGreaterThanOrEqual(5.95);
        expect(Math.abs(c.l * 100 - Math.round(c.l * 100)), message).toBeLessThan(1e-9);
        const k = (c.c - 0.07) / 0.015;
        expect(Math.abs(k - Math.round(k)), message).toBeLessThan(1e-9);
        expect(c.c, message).toBeLessThanOrEqual(0.26);
        expect(c.h % 4, message).toBe(0);
        expect(inGamut(c.l, c.c, c.h), message).toBe(true);
        const o = toOklch(c.hex);
        expect(Math.abs(o.l - c.l), message).toBeLessThan(0.005);
        expect(Math.abs(o.c - c.c), message).toBeLessThan(0.005);
        expect(c.labs, message).toEqual([
          toOklab(c.hex),
          ...CVD.map((kind) => toOklab(simulateCvd(c.hex, kind))),
        ]);
      }
    }
  }
);

it(
  "TH-6 slot c1 is the highest-chroma candidate with hue 240 to 270 and each later slot maximises the minimum ΔE_OK",
  { timeout: 60_000 },
  () => {
    for (const theme of SITE_THEMES) {
      const cands = candidatesOf(theme);
      const slots = pickCurveSlots(cands);
      const p = byHex(cands, slots.c1);
      expect(p.h, theme.id).toBeGreaterThanOrEqual(240);
      expect(p.h, theme.id).toBeLessThanOrEqual(270);
      const blues = cands.filter((x) => x.h >= 240 && x.h <= 270);
      expect(p.c, theme.id).toBe(Math.max(...blues.map((x) => x.c)));
      expect(curveScore(p, []), theme.id).toBe(Infinity);
      for (const x of cands) {
        if (x.hex === p.hex) continue;
        // Each vision is compared with itself only, never across visions.
        expect(curveScore(x, [p]), `${theme.id} ${x.hex}`).toBeCloseTo(
          Math.min(
            deltaEOk(x.hex, p.hex),
            ...CVD.map((kind) => deltaEOk(simulateCvd(x.hex, kind), simulateCvd(p.hex, kind)))
          ),
          10
        );
      }
      const chosen: CurveCandidate[] = [p];
      for (const slot of LATER_SLOTS) {
        const pick = byHex(cands, slots[slot]);
        expect(curveScore(pick, chosen), `${theme.id} ${slot}`).toBe(
          Math.max(...cands.map((x) => curveScore(x, chosen)))
        );
        chosen.push(pick);
      }
    }
  }
);
