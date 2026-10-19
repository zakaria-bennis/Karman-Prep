import { describe, expect, it } from "vitest";
import {
  adjustLightness,
  compositeOver,
  contrastRatio,
  deltaEOk,
  fromOklch,
  inGamut,
  simulateCvd,
  toOklch,
} from "./contrast";

describe("calculator v2 colour math", () => {
  it("TH-4 Warm ivory secondary text and Clean paper Enter fill move to the spec's colours", () => {
    expect(adjustLightness("#536457", "#fffdf7", 7)).toBe("#495a4d");
    expect(adjustLightness("#735925", "#ffffff", 7)).toBe("#6d531f");
  });

  it("TH-4 a missing role moves only in OKLCH lightness, away from its background, to the target plus 0.05", () => {
    const cases: [string, string, number, string][] = [
      ["#536457", "#fffdf7", 7, "#495a4d"],
      ["#bdcbbf", "#293c32", 7, "#bfcdc1"],
      ["#8495ab", "#e8edf4", 3, "#77879d"],
    ];
    for (const [color, bg, target, out] of cases) {
      const message = `${color} on ${bg} to ${target}:1`;
      expect(adjustLightness(color, bg, target), message).toBe(out);
      expect(contrastRatio(out, bg), message).toBeGreaterThanOrEqual(target + 0.05);
      expect(Math.abs(toOklch(out).h - toOklch(color).h), message).toBeLessThan(2);
      expect(toOklch(out).c, message).toBeLessThanOrEqual(toOklch(color).c + 0.002);
      expect(Math.sign(toOklch(out).l - toOklch(color).l), message).toBe(
        toOklch(bg).l > toOklch(color).l ? -1 : 1
      );
    }
  });

  it("TH-4 a colour that already meets its target is returned unchanged", () => {
    expect(adjustLightness("#81917F", "#fffdf7", 3)).toBe("#81917f");
  });

  it("TH-4 colour math reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 10);
    expect(contrastRatio("#ffffff", "#777777")).toBeCloseTo(4.478, 3);
    const { l, c, h } = toOklch("#285b79");
    expect(fromOklch(l, c, h)).toBe("#285b79");
    expect(deltaEOk("#000000", "#ffffff")).toBeCloseTo(1, 3);
    expect(compositeOver("#000000", 0.5, "#ffffff")).toBe("#808080");
    expect(compositeOver("#285b79", 0.25, "#fffdf7")).toBe("#c9d5d8");
    expect(compositeOver("#285b79", 0, "#fffdf7")).toBe("#fffdf7");
    expect(simulateCvd("#ff0000", "protan")).toBe("#6d5f00");
    expect(simulateCvd("#ff0000", "deutan")).toBe("#a39000");
    expect(simulateCvd("#0000ff", "tritan")).toBe("#006b96");
    expect(simulateCvd("#285b79", "deutan")).toBe("#425278");
    expect(() => contrastRatio("red", "#ffffff")).toThrow("Expected #rrggbb");
    const o = toOklch("#285b79");
    expect(inGamut(o.l, o.c, o.h)).toBe(true);
    expect(inGamut(0.5, 0.1, 140)).toBe(true);
    expect(inGamut(0.5, 0.3, 140)).toBe(false);
  });
});
