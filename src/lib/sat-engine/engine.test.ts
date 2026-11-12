import { describe, expect, it } from "vitest";
import { assemblePanels } from "./assemble";
import { MODULE_SHAPE } from "./blueprint";
import { coldStartParams } from "./params";
import { routeHarder } from "./routing";
import { rawScale, sectionScaleScore, thetaForScale } from "./scale";
import { scoreSection, totalScore } from "./scoring";
import { syntheticPool } from "./simulate";

const { items } = syntheticPool({ seed: 3, perSkill: 40, truthNoise: 0.4 });
const pretestPool = syntheticPool({ seed: 4, perSkill: 6, truthNoise: 0.4 }).items.map((i) => ({
  ...i,
  id: `pre-${i.id}`,
  family: `pre-${i.family}`,
}));
const panels = assemblePanels(items, { count: 2, seed: "test", pretestPool });

describe("assembly", () => {
  it("builds full modules with two pretest questions each", () => {
    for (const panel of panels)
      for (const s of panel.sections)
        for (const m of [s.module1, s.easier, s.harder]) {
          expect(m.slots).toHaveLength(MODULE_SHAPE[s.section].size);
          expect(m.slots.filter((x) => x.pretest)).toHaveLength(MODULE_SHAPE[s.section].pretest);
          expect(m.shortfall).toBe(0);
        }
  });

  it("never repeats a question family across forms", () => {
    const ids = panels.flatMap((p) =>
      p.sections.flatMap((s) =>
        [s.module1, s.easier, s.harder].flatMap((m) => m.slots.map((x) => x.item.family))
      )
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("makes the harder Module 2 harder than the easier one, and hard forms harder", () => {
    const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
    const rating = (m: { slots: { item: { difficulty: number }; pretest: boolean }[] }) =>
      mean(m.slots.filter((x) => !x.pretest).map((x) => x.item.difficulty));
    for (const p of panels)
      for (const s of p.sections) expect(rating(s.harder)).toBeGreaterThan(rating(s.easier));
    const [standard, hard] = panels;
    expect(rating(hard.sections[1].harder)).toBeGreaterThan(rating(standard.sections[1].harder));
  });
});

describe("routing and scoring", () => {
  const math = panels[0].sections[1];
  const answerAll = (correct: boolean) =>
    math.module1.slots.map((s) => ({ item: s.item, correct, pretest: s.pretest }));

  it("sends strong Module 1 work to the harder module and weak work to the easier one", () => {
    const params = (rs: ReturnType<typeof answerAll>) =>
      rs
        .filter((r) => !r.pretest)
        .map((r) => ({ item: coldStartParams(r.item), correct: r.correct }));
    expect(routeHarder(params(answerAll(true)), math.routing)).toBe(true);
    expect(routeHarder(params(answerAll(false)), math.routing)).toBe(false);
  });

  it("ignores pretest answers and keeps scores on the 200-800 scale", () => {
    const module2 = math.harder.slots.map((s) => ({
      item: s.item,
      correct: true,
      pretest: s.pretest,
    }));
    const perfect = scoreSection({
      section: "math",
      module1: answerAll(true),
      module2,
      route: "harder",
    });
    expect(perfect.scored).toBe(2 * (MODULE_SHAPE.math.size - MODULE_SHAPE.math.pretest));
    expect(perfect.score).toBeGreaterThanOrEqual(750);
    expect(perfect.score).toBeLessThanOrEqual(800);
    const flipped = scoreSection({
      section: "math",
      module1: answerAll(true).map((r) => (r.pretest ? { ...r, correct: false } : r)),
      module2,
      route: "harder",
    });
    expect(flipped.score).toBe(perfect.score);
    expect(totalScore(perfect, perfect).score).toBe(2 * perfect.score);
  });

  it("caps the easier path below the top of the scale", () => {
    const module2 = math.easier.slots.map((s) => ({
      item: s.item,
      correct: true,
      pretest: s.pretest,
    }));
    const easierPerfect = scoreSection({
      section: "math",
      module1: answerAll(false),
      module2,
      route: "easier",
    });
    expect(easierPerfect.score).toBeLessThan(700);
  });
});

describe("scale", () => {
  it("is increasing and inverts", () => {
    for (const section of ["reading", "math"] as const) {
      for (let t = -3; t < 3; t += 0.5)
        expect(rawScale(section, t + 0.5)).toBeGreaterThanOrEqual(rawScale(section, t));
      expect(sectionScaleScore(section, thetaForScale(section, 600))).toBe(600);
    }
  });
});

describe("question order", () => {
  it("keeps pretest questions out of the first two and last two places", () => {
    for (const p of panels)
      for (const s of p.sections)
        for (const m of [s.module1, s.easier, s.harder]) {
          const n = m.slots.length;
          for (const i of [0, 1, n - 2, n - 1]) expect(m.slots[i].pretest).toBe(false);
        }
  });
});
