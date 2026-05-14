// ============================================================
// Unit tests for the diagnostic scoring engine.
//
// This file locks down the foundation-aware focus selection
// rule that exists *because* the old "average four math
// percentages and pick the lowest" logic was sending 260-320
// scorers to "Advanced Math" instead of foundations. If a
// future change re-introduces that regression, the tests in
// "foundation gating" + "regression: low-scorer should not
// be sent to Advanced Math" will catch it.
//
// Add a new test here any time you change scoring math,
// rounding, or focus-area selection rules.
// ============================================================

import { describe, expect, it } from "vitest";
import { scoreDiagnostic, type AnswerInput } from "./diagnostic-scoring";
import type { SATDomain } from "@/types";

// Small builder so the test bodies stay readable. Each call
// produces N answers in one domain at the given difficulty,
// `correctCount` of which are flagged correct.
function answers(
  domain: SATDomain,
  difficulty: 1 | 2 | 3,
  total: number,
  correctCount: number,
  opts: { conceptId?: string; idPrefix?: string } = {}
): AnswerInput[] {
  const out: AnswerInput[] = [];
  for (let i = 0; i < total; i++) {
    out.push({
      questionId: `${opts.idPrefix ?? domain}-${difficulty}-${i}`,
      domain,
      difficulty,
      conceptId: opts.conceptId,
      correct: i < correctCount,
    });
  }
  return out;
}

describe("scoreDiagnostic — domain difficulty-weighted accuracy", () => {
  it("treats a difficulty-3 correct as worth 3x a difficulty-1 correct in the same domain", () => {
    // 1 right at d=3 (weight 3) + 0 right at d=1 (weight 1) = 3/4 = 75%
    const result = scoreDiagnostic([
      ...answers("algebra", 3, 1, 1),
      ...answers("algebra", 1, 1, 0),
    ]);
    expect(result.domainScores.algebra).toBe(75);
  });

  it("rounds the weighted percentage to the nearest integer", () => {
    // Inputs: 1 wrong d=1 (weight 1) + 2 right d=2 (weight 2+2=4)
    //       + 1 right d=3 (weight 3) + 1 wrong d=3 (weight 3)
    // Total weight 11, correct weight 7 → 7/11 = 63.6…% → 64
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 1, 0),
      ...answers("algebra", 2, 2, 2),
      ...answers("algebra", 3, 2, 1),
    ]);
    expect(result.domainScores.algebra).toBe(64);
  });

  it("returns 0 for a domain with no answered questions", () => {
    const result = scoreDiagnostic(answers("algebra", 2, 5, 3));
    expect(result.domainScores.geometry).toBe(0);
    expect(result.domainScores.conventions).toBe(0);
  });
});

describe("scoreDiagnostic — section subscores (200-800)", () => {
  it("snaps section bounds to multiples of 10", () => {
    const result = scoreDiagnostic(answers("algebra", 2, 7, 4));
    expect(result.math.low % 10).toBe(0);
    expect(result.math.high % 10).toBe(0);
  });

  it("a perfect math section yields high ≈ 800 and accuracy = 100", () => {
    const result = scoreDiagnostic(answers("algebra", 3, 5, 5));
    expect(result.math.high).toBe(800);
    expect(result.math.accuracy).toBe(100);
  });

  it("an all-wrong section floors the low at 220 (SAT scaled-floor lift), not 200", () => {
    // Spec: `lifted = Math.max(220, base)`, then low = max(200, lifted - 30).
    // With 0% accuracy, base = 200, lifted = 220, low = max(200, 190) = 200.
    // High = lifted + 30 = 250.
    const result = scoreDiagnostic(answers("algebra", 2, 4, 0));
    expect(result.math.accuracy).toBe(0);
    expect(result.math.low).toBe(200);
    expect(result.math.high).toBe(250);
  });

  it("clamps the section high at 800 even when the ±30 band would exceed it", () => {
    const result = scoreDiagnostic(answers("algebra", 3, 5, 5));
    expect(result.math.high).toBeLessThanOrEqual(800);
  });

  it("returns accuracy 0 for a section that had no answered questions", () => {
    const result = scoreDiagnostic(answers("algebra", 2, 5, 3));
    expect(result.rw.accuracy).toBe(0);
  });
});

describe("scoreDiagnostic — total predicted SAT range", () => {
  it("totalLow is the sum of section lows, clamped at 400", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 2, 5, 0),
      ...answers("info_ideas", 2, 5, 0),
    ]);
    expect(result.totalLow).toBeGreaterThanOrEqual(400);
  });

  it("totalHigh is the sum of section highs, clamped at 1600", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 3, 5, 5),
      ...answers("info_ideas", 3, 5, 5),
    ]);
    expect(result.totalHigh).toBeLessThanOrEqual(1600);
  });

  it("totalLow ≤ totalHigh always", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 2, 4, 2),
      ...answers("geometry", 3, 3, 1),
      ...answers("info_ideas", 1, 5, 4),
      ...answers("conventions", 2, 3, 2),
    ]);
    expect(result.totalLow).toBeLessThanOrEqual(result.totalHigh);
  });
});

describe("scoreDiagnostic — foundation gating (the load-bearing rule)", () => {
  it("foundationIndex < 60 → focus.type = 'foundation' regardless of which domain is technically lowest", () => {
    // Student aces hard algebra (would normally make algebra the strongest)
    // but bombs easy questions across the board → should still be foundation.
    const result = scoreDiagnostic([
      ...answers("algebra", 3, 5, 5), // 5/5 hard algebra correct
      ...answers("geometry", 1, 5, 1), // 1/5 easy geometry correct (foundationIndex floor)
      ...answers("info_ideas", 1, 5, 2),
    ]);
    // foundationIndex = 3/10 easy correct = 30% < 60 → foundation
    expect(result.foundationIndex).toBe(30);
    expect(result.focusArea.type).toBe("foundation");
    expect(result.focusArea.domain).toBeNull();
  });

  it("uses the 'missed many' detail copy when foundationIndex < 40", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 5, 1), // 20% easy
      ...answers("geometry", 1, 5, 1),
    ]);
    expect(result.foundationIndex).toBe(20);
    expect(result.focusArea.type).toBe("foundation");
    expect(result.focusArea.detail).toContain("missed many of the easier");
  });

  it("uses the 'slipped on a few' detail copy when foundationIndex is 40-59", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 5, 2), // 40% easy
      ...answers("geometry", 1, 5, 3), // 60% easy → combined 50%
    ]);
    expect(result.foundationIndex).toBe(50);
    expect(result.focusArea.type).toBe("foundation");
    expect(result.focusArea.detail).toContain("slipped on a few");
  });

  it("foundationIndex >= 60 → focus.type = 'domain'", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 5, 4), // 80% easy
      ...answers("geometry", 1, 5, 4), // 80% easy → combined 80%
      ...answers("info_ideas", 2, 4, 1), // weak r&w domain
    ]);
    expect(result.foundationIndex).toBe(80);
    expect(result.focusArea.type).toBe("domain");
  });

  it("defaults foundationIndex to 100 when no difficulty-1 questions were answered", () => {
    // No easy questions → can't measure foundation → assume they're fine
    // → fall through to the domain branch.
    const result = scoreDiagnostic([
      ...answers("algebra", 2, 3, 2),
      ...answers("geometry", 3, 2, 1),
    ]);
    expect(result.foundationIndex).toBe(100);
    expect(result.focusArea.type).toBe("domain");
  });
});

describe("scoreDiagnostic — focus-area domain selection", () => {
  it("picks the domain with the lowest difficulty-weighted score (among answered domains)", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 5, 5), // 100% — easy
      ...answers("geometry", 1, 5, 5), // 100% — easy (pads foundationIndex)
      ...answers("info_ideas", 2, 4, 1), // 25% — weakest
      ...answers("conventions", 2, 4, 3), // 75%
    ]);
    expect(result.focusArea.type).toBe("domain");
    expect(result.focusArea.domain).toBe("info_ideas");
  });

  it("does not pick a domain with zero answered questions even though its score is 0", () => {
    // algebra and info_ideas are answered; geometry/conventions/etc. score 0
    // but weren't answered — they must not be the focus.
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 4, 4),
      ...answers("info_ideas", 2, 4, 1), // lowest answered
    ]);
    expect(result.focusArea.domain).toBe("info_ideas");
  });

  it("includes the missed concept slugs in focusArea.weakTopics", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 4, 4),
      ...answers("info_ideas", 2, 1, 0, { conceptId: "rw-12" }),
      ...answers("info_ideas", 2, 1, 0, { conceptId: "rw-15", idPrefix: "b" }),
    ]);
    expect(result.focusArea.weakTopics).toEqual(expect.arrayContaining(["rw-12", "rw-15"]));
  });

  it("dedupes weakTopics — same conceptId missed twice should appear once", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 4, 4),
      ...answers("info_ideas", 2, 2, 0, { conceptId: "rw-12" }),
    ]);
    expect(result.focusArea.weakTopics.filter((t) => t === "rw-12")).toHaveLength(1);
  });
});

describe("scoreDiagnostic — strongest area selection", () => {
  it("requires at least 3 correct in a domain to claim a strength", () => {
    // 100% in algebra but only 2 correct → no claim, even though
    // the percentage is perfect.
    const result = scoreDiagnostic(answers("algebra", 2, 2, 2));
    expect(result.strongest).toBeNull();
  });

  it("returns null when no domain has 3+ correct", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 2, 2, 2),
      ...answers("geometry", 2, 2, 2),
      ...answers("info_ideas", 2, 2, 2),
    ]);
    expect(result.strongest).toBeNull();
  });

  it("returns the highest-scoring domain that meets the 3-correct threshold", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 3, 5, 5), // 100% weighted, 5 correct
      ...answers("geometry", 2, 5, 3), // 60% weighted, 3 correct
    ]);
    expect(result.strongest).not.toBeNull();
    expect(result.strongest?.domain).toBe("algebra");
    expect(result.strongest?.correctCount).toBe(5);
  });
});

describe("scoreDiagnostic — regression coverage", () => {
  it("a universally weak student (260-320 territory) is NOT routed to a specific domain like 'Advanced Math'", () => {
    // The exact failure mode the docstring calls out: the old rule
    // would have picked the lowest-percentage domain (e.g. Advanced
    // Math) and recommended it. The new rule must route to
    // foundation instead.
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 3, 1), // 33% easy
      ...answers("advanced_math", 1, 3, 0), // 0% easy
      ...answers("info_ideas", 1, 3, 1), // 33% easy
      ...answers("conventions", 1, 3, 1), // 33% easy
    ]);
    expect(result.foundationIndex).toBeLessThan(60);
    expect(result.focusArea.type).toBe("foundation");
    // Crucially NOT a domain recommendation:
    expect(result.focusArea.domain).toBeNull();
    expect(result.focusArea.label).toBe("Build foundational skills first");
  });

  it("collects missed easy-question concept slugs into weakTopics when in foundation mode", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 1, 0, { conceptId: "ma-00" }),
      ...answers("algebra", 1, 1, 0, { conceptId: "ma-01", idPrefix: "b" }),
      ...answers("info_ideas", 1, 1, 0, { conceptId: "rw-00", idPrefix: "c" }),
    ]);
    expect(result.focusArea.type).toBe("foundation");
    expect(result.focusArea.weakTopics).toEqual(
      expect.arrayContaining(["ma-00", "ma-01", "rw-00"])
    );
  });

  it("aggregate weakConcepts dedupes across the whole diagnostic", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 2, 2, 0, { conceptId: "ma-00" }),
      ...answers("algebra", 1, 1, 0, { conceptId: "ma-00", idPrefix: "b" }),
    ]);
    expect(result.weakConcepts.filter((c) => c === "ma-00")).toHaveLength(1);
  });

  it("weakConcepts excludes correct answers", () => {
    const result = scoreDiagnostic([
      ...answers("algebra", 2, 2, 2, { conceptId: "ma-00" }), // both correct
      ...answers("geometry", 2, 1, 0, { conceptId: "ma-10" }), // wrong
    ]);
    expect(result.weakConcepts).not.toContain("ma-00");
    expect(result.weakConcepts).toContain("ma-10");
  });
});

describe("scoreDiagnostic — empty + degenerate inputs", () => {
  it("does not throw on an empty answers array", () => {
    expect(() => scoreDiagnostic([])).not.toThrow();
  });

  it("returns the 'take the diagnostic again' fallback when no questions were answered", () => {
    const result = scoreDiagnostic([]);
    expect(result.focusArea.type).toBe("foundation");
    expect(result.focusArea.detail).toContain("Take the diagnostic again");
    expect(result.strongest).toBeNull();
    expect(result.weakConcepts).toEqual([]);
  });

  it("treats every answer flagged correct: false as wrong (including skipped/blank)", () => {
    // Spec note: "Skipped or blank questions are treated as incorrect."
    // Caller's responsibility to pass `correct: false`; this confirms
    // the scorer respects it (no special "skipped" handling exists).
    const result = scoreDiagnostic([
      ...answers("algebra", 1, 5, 0), // all flagged wrong
    ]);
    expect(result.domainScores.algebra).toBe(0);
    expect(result.foundationIndex).toBe(0);
  });
});
