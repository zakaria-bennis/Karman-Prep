import { describe, expect, it } from "vitest";
import { guaranteeFor } from "./guarantee";

describe("guaranteeFor", () => {
  it("covers only the Cohort and Private plans", () => {
    expect(guaranteeFor(null, [{ score: 1200 }])).toBeNull();
    expect(guaranteeFor("practice", [{ score: 1200 }])).toBeNull();
    expect(guaranteeFor("group", [{ score: 1200 }])?.plan).toBe("Cohort");
    expect(guaranteeFor("private-20", [{ score: 1200 }])?.plan).toBe("Private");
  });

  it("asks +100 under a 1400 baseline and +50 from 1400", () => {
    const low = guaranteeFor("private", [{ score: 1190 }, { score: 1300 }]);
    expect(low).toMatchObject({ baseline: 1190, needed: 100, target: 1290, gained: 110, met: true });
    const high = guaranteeFor("cohort", [{ score: 1400 }, { score: 1430 }]);
    expect(high).toMatchObject({ needed: 50, target: 1450, gained: 30, met: false });
  });

  it("waits for a first score", () => {
    expect(guaranteeFor("private", [])).toMatchObject({ baseline: null, needed: null, met: false });
  });
});
