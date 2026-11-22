import { describe, expect, it } from "vitest";
import {
  SE_CAP,
  THETA_MAX,
  THETA_MIN,
  eap,
  expectedScore,
  itemInformation,
  numberRightDistribution,
  pCorrect,
  summedScoreEap,
  thetaForExpectedScore,
  mle,
  type ItemParams,
} from "./irt";

const item = { a: 1, b: 0, c: 0.2 };

describe("3PL", () => {
  it("is halfway between the floor and 1 at theta = b", () => {
    expect(pCorrect(item, 0)).toBeCloseTo(0.6, 6);
    expect(pCorrect(item, -10)).toBeCloseTo(0.2, 4);
    expect(pCorrect(item, 10)).toBeCloseTo(1, 4);
  });

  it("gives the most information just above b when there is guessing", () => {
    const at = (t: number) => itemInformation(item, t);
    expect(at(0.15)).toBeGreaterThan(at(-0.5));
    expect(at(0.15)).toBeGreaterThan(at(1));
  });
});

describe("EAP", () => {
  const items = [-1.5, -0.5, 0, 0.5, 1.5].map((b) => ({ a: 1.2, b, c: 0.2 }));

  it("rises with more right answers and stays near the prior with none", () => {
    expect(eap([]).theta).toBeCloseTo(0, 3);
    const all = eap(items.map((i) => ({ item: i, correct: true })));
    const none = eap(items.map((i) => ({ item: i, correct: false })));
    expect(all.theta).toBeGreaterThan(0.8);
    expect(none.theta).toBeLessThan(-0.8);
  });

  it("costs more for missing easy questions than hard ones at the same raw score", () => {
    // Under 3PL a right answer to a hard question after missing easy ones looks like a guess,
    // so the consistent pattern (misses on the hardest) scores higher.
    const missedEasy = eap(items.map((i, k) => ({ item: i, correct: k !== 0 && k !== 1 })));
    const missedHard = eap(items.map((i, k) => ({ item: i, correct: k !== 3 && k !== 4 })));
    expect(missedHard.theta).toBeGreaterThan(missedEasy.theta);
  });
});

describe("number-right tables", () => {
  const items = Array.from({ length: 10 }, (_, k) => ({ a: 1, b: -2 + 0.45 * k, c: 0.15 }));

  it("gives distributions that sum to 1", () => {
    for (const row of numberRightDistribution(items))
      expect(row.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 9);
  });

  it("orders summed-score EAPs by raw score", () => {
    const table = summedScoreEap(items);
    for (let r = 1; r < table.length; r++)
      expect(table[r].theta).toBeGreaterThan(table[r - 1].theta);
  });

  it("inverts the test characteristic curve", () => {
    const theta = thetaForExpectedScore(items, 6);
    expect(expectedScore(items, theta)).toBeCloseTo(6, 4);
  });
});

describe("maximum likelihood", () => {
  const items: ItemParams[] = [-2, -1, 0, 1, 2].map((b) => ({ a: 1.6, b, c: 0.2 }));
  it("puts all right and all wrong at the limits", () => {
    expect(mle(items.map((item) => ({ item, correct: true }))).theta).toBe(THETA_MAX);
    expect(mle(items.map((item) => ({ item, correct: false }))).theta).toBe(THETA_MIN);
  });
  it("rises with the number right and reports a capped standard error", () => {
    const thetas = [1, 2, 3, 4].map(
      (right) => mle(items.map((item, k) => ({ item, correct: k < right }))).theta
    );
    for (let i = 1; i < thetas.length; i++) expect(thetas[i]).toBeGreaterThan(thetas[i - 1]);
    expect(mle([]).se).toBe(SE_CAP);
  });
});
