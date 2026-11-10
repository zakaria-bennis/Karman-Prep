import { describe, expect, it } from "vitest";
import { guaranteeFor } from "./guarantee";

describe("guaranteeFor", () => {
  it("covers only the Cohort and Private plans", () => {
    expect(guaranteeFor(null, [{ score: 1200 }])).toBeNull();
    expect(guaranteeFor("practice", [{ score: 1200 }])).toBeNull();
    expect(guaranteeFor("group", [{ score: 1200 }])?.plan).toBe("Cohort");
    expect(guaranteeFor("private-20", [{ score: 1200 }])?.plan).toBe("Private");
  });

  it("asks for the target of the starting score and the plan", () => {
    const low = guaranteeFor("private-20", [{ score: 1190 }, { score: 1400 }]);
    expect(low).toMatchObject({
      baseline: 1190,
      needed: 200,
      target: 1390,
      gained: 210,
      none: false,
      met: true,
    });
    const cohort = guaranteeFor("cohort", [{ score: 1400 }, { score: 1430 }]);
    expect(cohort).toMatchObject({ needed: 70, target: 1470, gained: 30, met: false });
  });

  it("gives Private 10 the cohort's numbers", () => {
    expect(guaranteeFor("private-10", [{ score: 1190 }])).toMatchObject({ needed: 150 });
    expect(guaranteeFor("private-20", [{ score: 1190 }])).toMatchObject({ needed: 200 });
    expect(guaranteeFor("private", [{ score: 1250 }])).toMatchObject({ needed: 150 });
  });

  it("carries no guarantee from a 1460 start", () => {
    expect(guaranteeFor("private-20", [{ score: 1460 }, { score: 1520 }])).toMatchObject({
      baseline: 1460,
      needed: null,
      target: null,
      none: true,
      met: false,
    });
    expect(guaranteeFor("cohort", [{ score: 1450 }])).toMatchObject({ needed: 40, none: false });
  });

  it("waits for a first score", () => {
    expect(guaranteeFor("private", [])).toMatchObject({
      baseline: null,
      needed: null,
      none: false,
      met: false,
    });
  });
});
