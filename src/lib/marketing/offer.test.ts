import { describe, expect, it } from "vitest";
import { GUARANTEE, guaranteeBandLabel, guaranteedGain, guaranteeMax } from "./offer";

describe("the tiered guarantee", () => {
  it("promises by starting score and by track", () => {
    expect(guaranteedGain(1000, "private")).toBe(200);
    expect(guaranteedGain(1200, "private")).toBe(200);
    expect(guaranteedGain(1210, "private")).toBe(160);
    expect(guaranteedGain(1300, "cohort")).toBe(120);
    expect(guaranteedGain(1310, "cohort")).toBe(80);
    expect(guaranteedGain(1400, "private")).toBe(120);
    expect(guaranteedGain(1410, "cohort")).toBe(40);
    expect(guaranteedGain(1450, "private")).toBe(60);
  });

  it("sets no points target from 1460", () => {
    expect(GUARANTEE.noGuaranteeFrom).toBe(1460);
    expect(guaranteedGain(1460, "private")).toBeNull();
    expect(guaranteedGain(1600, "cohort")).toBeNull();
  });

  it("promises less on the shared track, never more, and less as the start rises", () => {
    GUARANTEE.bands.forEach((band, i) => {
      expect(band.cohort).toBeLessThan(band.private);
      if (i > 0) {
        expect(band.private).toBeLessThan(GUARANTEE.bands[i - 1].private);
        expect(band.cohort).toBeLessThan(GUARANTEE.bands[i - 1].cohort);
        expect(band.upTo).toBeGreaterThan(GUARANTEE.bands[i - 1].upTo);
      }
    });
    expect(GUARANTEE.bands.at(-1)!.upTo + 10).toBe(GUARANTEE.noGuaranteeFrom);
    expect(guaranteeMax("private")).toBe(200);
    expect(guaranteeMax("cohort")).toBe(150);
  });

  it("names each band's starting scores", () => {
    expect(GUARANTEE.bands.map((_, i) => guaranteeBandLabel(i))).toEqual([
      "1200 or lower",
      "1210 to 1300",
      "1310 to 1400",
      "1410 to 1450",
    ]);
  });

  it("puts Private 10 on the cohort's numbers and Private 20 on the full ones", () => {
    expect(GUARANTEE.trackOf).toEqual({
      cohort: "cohort",
      "private-10": "cohort",
      "private-20": "private",
    });
  });
});
