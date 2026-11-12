import { describe, expect, it } from "vitest";
import { calibrate, type Answer } from "./calibrate";
import { answer, normal, rng } from "./simulate";

describe("calibration (MML-EM with priors)", () => {
  it("recovers item difficulty from sparse simulated answers", () => {
    const random = rng(7);
    const truth = Array.from({ length: 40 }, (_, i) => ({
      id: `q${i}`,
      a: 0.8 + 0.6 * random(),
      b: -2 + (4 * i) / 39,
      c: 0.2,
    }));
    const answers: Answer[] = [];
    for (let p = 0; p < 1500; p++) {
      const theta = normal(random);
      // Each student sees 20 of the 40 items, like a sparse practice log.
      for (const t of truth)
        if (random() < 0.5)
          answers.push({ person: `s${p}`, item: t.id, correct: answer(random, t, theta) });
    }
    const result = calibrate(
      truth.map((t) => ({ id: t.id, start: { a: 1, b: 0, c: 0.2 } })),
      answers
    );
    const errors = truth.map((t) => result.items.get(t.id)!.params.b - t.b);
    const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);
    expect(rmse).toBeLessThan(0.3);
  });

  it("puts new items on the anchors' scale (fixed-parameter calibration)", () => {
    const random = rng(11);
    const anchors = Array.from({ length: 20 }, (_, i) => ({
      id: `a${i}`,
      a: 1.1,
      b: -1.5 + (3 * i) / 19,
      c: 0.2,
    }));
    const fresh = [
      { id: "new-hard", a: 1.1, b: 1.2, c: 0.2 },
      { id: "new-easy", a: 1.1, b: -1, c: 0.2 },
    ];
    const answers: Answer[] = [];
    // This group is stronger than average (mean 0.7): anchors must absorb that, not the new items.
    for (let p = 0; p < 1200; p++) {
      const theta = normal(random, 0.7, 1);
      for (const t of [...anchors, ...fresh])
        answers.push({ person: `s${p}`, item: t.id, correct: answer(random, t, theta) });
    }
    const result = calibrate(
      [
        ...anchors.map((t) => ({ id: t.id, start: t, fixed: true })),
        ...fresh.map((t) => ({ id: t.id, start: { a: 1, b: 0, c: 0.2 } })),
      ],
      answers
    );
    expect(result.population.mean).toBeGreaterThan(0.5);
    expect(result.items.get("new-hard")!.params.b).toBeCloseTo(1.2, 0);
    expect(result.items.get("new-easy")!.params.b).toBeCloseTo(-1, 0);
  });
});
