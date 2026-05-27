// @vitest-environment node
//
// Unit tests for the Phase 5 pure-regex detection layer in
// scripts/lib/math-notation-patterns.mjs.
//
// We test the regexes directly — each pattern needs to MATCH the
// real OCR-mangle cases it's designed to catch and REJECT the
// known false-positive traps (chemistry subscripts, coefficients,
// metaphorical noun usage).
//
// These tests are pure: no IO, no LLM calls. Fast (<5ms each).

import { describe, expect, it } from "vitest";
import {
  PHASE5_VERSION,
  RISK_TIERS,
  DETECTION_PATTERNS,
  detectBareDigitAfterLetter,
  detectAmbiguousFraction,
  detectAmbiguousRational,
  detectSqrtWithoutParens,
  detectAllPatterns,
  applyRepair,
} from "../../../scripts/lib/math-notation-patterns.mjs";

type Detection = {
  pattern: string;
  risk_tier: string;
  match: string;
  start: number;
  end: number;
  candidates: string[];
};

describe("phase5 module identity", () => {
  it("exposes the version sentinel used in raw_metadata", () => {
    expect(PHASE5_VERSION).toBe("phase5_math_repair_v1");
  });

  it("enumerates all 5 risk tiers expected by the migration CHECK", () => {
    expect(RISK_TIERS.LOW_RISK_OCR).toBe("low_risk_ocr");
    expect(RISK_TIERS.MEDIUM_RISK_GROUPING).toBe("medium_risk_grouping");
    expect(RISK_TIERS.HIGH_RISK_ANSWER_CHANGING).toBe("high_risk_answer_changing");
    expect(RISK_TIERS.OPEN_ENDED_UNCERTAIN).toBe("open_ended_uncertain");
    expect(RISK_TIERS.VISUAL_UNCLEAR).toBe("visual_unclear");
  });
});

describe("detectBareDigitAfterLetter — true positives", () => {
  it("matches the classic x2 → x^2 case", () => {
    const ds: Detection[] = detectBareDigitAfterLetter("Solve x2 + 3x + 1 = 0");
    expect(ds).toHaveLength(1);
    expect(ds[0].pattern).toBe(DETECTION_PATTERNS.BARE_DIGIT_AFTER_LETTER);
    expect(ds[0].match).toBe("x2");
    expect(ds[0].candidates).toEqual(["x^2"]);
    expect(ds[0].risk_tier).toBe(RISK_TIERS.LOW_RISK_OCR);
  });

  it("matches y3 and a4 in the same string", () => {
    const ds: Detection[] = detectBareDigitAfterLetter("If y3 = a4, find a + y");
    expect(ds.map((d) => d.match).sort()).toEqual(["a4", "y3"]);
  });

  it("preserves the source offsets so applyRepair can splice", () => {
    const text = "x2 + 1";
    const [d] = detectBareDigitAfterLetter(text) as Detection[];
    expect(text.slice(d.start, d.end)).toBe("x2");
  });
});

describe("detectBareDigitAfterLetter — false-positive guards", () => {
  it("does NOT match chemistry subscripts like CO2 or H2O", () => {
    // The "2" in CO2 / H2O is preceded by an uppercase letter, which
    // is preceded by another uppercase — the lookbehind blocks it.
    // What about "O2" alone? That IS preceded by ^ — could match.
    // But CO2 in the middle of text is what we care about.
    expect(detectBareDigitAfterLetter("Combustion: CO2 and H2O released")).toEqual([]);
  });

  it("does NOT match coefficients like 2x or 3y", () => {
    expect(detectBareDigitAfterLetter("Simplify 2x + 3y")).toEqual([]);
  });

  it("does NOT match multi-digit suffixes like x12 or var_99", () => {
    // x12 → letter followed by 1, then another digit 2. The negative
    // lookahead (?![0-9]) on the captured digit blocks both 1 and 2.
    expect(detectBareDigitAfterLetter("Set x12 = 5")).toEqual([]);
  });

  it("does NOT match standalone digits or letters", () => {
    expect(detectBareDigitAfterLetter("3 + 5 = 8")).toEqual([]);
    expect(detectBareDigitAfterLetter("xyz abc")).toEqual([]);
  });
});

describe("detectAmbiguousFraction", () => {
  it("matches 1/2x as ambiguous and emits BOTH grouping candidates", () => {
    const [d] = detectAmbiguousFraction("Evaluate 1/2x when x = 4") as Detection[];
    expect(d).toBeDefined();
    expect(d.pattern).toBe(DETECTION_PATTERNS.AMBIGUOUS_FRACTION);
    expect(d.risk_tier).toBe(RISK_TIERS.MEDIUM_RISK_GROUPING);
    expect(d.candidates).toContain("(1/2)x");
    expect(d.candidates).toContain("1/(2x)");
  });

  it("does NOT match a simple fraction without a trailing variable", () => {
    expect(detectAmbiguousFraction("The probability is 1/2 of cases")).toEqual([]);
  });

  it("does NOT match a variable in the numerator", () => {
    // x/2 — variable on top, plain fraction, no grouping ambiguity.
    expect(detectAmbiguousFraction("Reduce x/2 to lowest terms")).toEqual([]);
  });
});

describe("detectAmbiguousRational", () => {
  it("matches x+1/x-1 as ambiguous and prefers parens-around-both", () => {
    const [d] = detectAmbiguousRational("Simplify x+1/x-1 fully") as Detection[];
    expect(d).toBeDefined();
    expect(d.pattern).toBe(DETECTION_PATTERNS.AMBIGUOUS_RATIONAL);
    expect(d.risk_tier).toBe(RISK_TIERS.MEDIUM_RISK_GROUPING);
    expect(d.candidates[0]).toBe("(x+1)/(x-1)");
  });

  it("matches 2x+3/4x-5 (multi-coefficient form)", () => {
    const ds: Detection[] = detectAmbiguousRational("Simplify 2x+3/4x-5");
    expect(ds.length).toBeGreaterThan(0);
  });

  it("does NOT match a clean rational already in parens", () => {
    expect(detectAmbiguousRational("Simplify (x+1)/(x-1)")).toEqual([]);
  });
});

describe("detectSqrtWithoutParens", () => {
  it("matches 'sqrt x+1' and emits both interpretations", () => {
    const [d] = detectSqrtWithoutParens("Compute sqrt x+1") as Detection[];
    expect(d).toBeDefined();
    expect(d.pattern).toBe(DETECTION_PATTERNS.SQRT_WITHOUT_PARENS);
    expect(d.risk_tier).toBe(RISK_TIERS.MEDIUM_RISK_GROUPING);
    // Candidate #1: whole operand under radical.
    expect(d.candidates[0]).toBe("sqrt(x+1)");
  });

  it("matches the √ unicode form too", () => {
    const ds: Detection[] = detectSqrtWithoutParens("Take √x+1 of both sides");
    expect(ds.length).toBe(1);
    expect(ds[0].candidates[0]).toBe("√(x+1)");
  });

  it("does NOT match sqrt(x+1) (already parenthesized)", () => {
    expect(detectSqrtWithoutParens("Solve sqrt(x+1) = 3")).toEqual([]);
  });
});

describe("detectAllPatterns — unified detector", () => {
  it("returns detections from every detector at once", () => {
    const text = "Given x2 = 4 and 1/2y = 3, find sqrt y+1";
    const ds = detectAllPatterns(text) as Detection[];
    const patterns = ds.map((d) => d.pattern).sort();
    expect(patterns).toContain(DETECTION_PATTERNS.BARE_DIGIT_AFTER_LETTER);
    expect(patterns).toContain(DETECTION_PATTERNS.AMBIGUOUS_FRACTION);
    expect(patterns).toContain(DETECTION_PATTERNS.SQRT_WITHOUT_PARENS);
  });

  it("returns [] for clean math", () => {
    expect(detectAllPatterns("Solve (x + 1)/(x - 1) = 2 for x.")).toEqual([]);
  });

  it("returns [] for empty / non-string inputs", () => {
    expect(detectAllPatterns("")).toEqual([]);
    expect(detectAllPatterns(null as unknown as string)).toEqual([]);
    expect(detectAllPatterns(undefined as unknown as string)).toEqual([]);
  });
});

describe("applyRepair — slice-and-splice mechanics", () => {
  it("replaces only the detected span (not every occurrence)", () => {
    const text = "x2 + x2 + 1";
    const [first] = detectBareDigitAfterLetter(text) as Detection[];
    expect(applyRepair(text, first, "x^2")).toBe("x^2 + x2 + 1");
  });

  it("throws on non-string input", () => {
    expect(() => applyRepair(null as unknown as string, { start: 0, end: 0 }, "")).toThrow();
  });

  it("throws on malformed detection", () => {
    expect(() => applyRepair("hi", {} as unknown as Detection, "")).toThrow();
  });
});
