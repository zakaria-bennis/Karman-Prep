import { describe, expect, it } from "vitest";
import { PARTNER_REGIONS, PARTNER_TOTAL, partnerDots, partnerMapOn } from "./partner-regions";

describe("partner map data", () => {
  it("adds up to 65 districts, one dot each", () => {
    expect(PARTNER_TOTAL).toBe(65);
    expect(partnerDots()).toHaveLength(65);
  });

  it("labels areas, and names only the districts that agreed in writing", () => {
    for (const r of PARTNER_REGIONS) {
      expect(r.label).not.toMatch(/district|school|unified|public|academy|high/i);
      expect((r.named ?? []).length).toBeLessThanOrEqual(r.count);
    }
    expect(
      partnerDots()
        .filter((d) => d.named)
        .map((d) => d.label)
    ).toEqual(["Greenwich Public Schools"]);
  });

  it("puts the dots in the same places every time, near their area", () => {
    const a = partnerDots();
    expect(partnerDots()).toEqual(a);
    for (const d of a) {
      const r = PARTNER_REGIONS.find((x) => x.label === d.label || x.named?.includes(d.label))!;
      expect(Math.abs(d.lat - r.lat)).toBeLessThanOrEqual(r.spread + 1e-9);
    }
  });

  it("stays off unless PARTNER_MAP is exactly on", () => {
    expect(partnerMapOn({})).toBe(false);
    expect(partnerMapOn({ PARTNER_MAP: "true" })).toBe(false);
    expect(partnerMapOn({ PARTNER_MAP: "on" })).toBe(true);
  });
});
