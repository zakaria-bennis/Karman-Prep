// @vitest-environment node
//
// Unit tests for the Phase 6 normalization helpers in
// scripts/lib/grader-normalize.mjs. Heavy SymPy-backed test cases
// are mocked at the answersEquivalent level because the real
// SymPy bridge requires Python — see the integration test below
// for the path-not-taken behavior.

import { describe, expect, it, vi } from "vitest";
import {
  normalizeLetter,
  normalizeNumeric,
  tallyAgreement,
} from "../../../scripts/lib/grader-normalize.mjs";

describe("normalizeLetter — MC answer cleanup", () => {
  it("passes single letters through (case-insensitive)", () => {
    expect(normalizeLetter("A")).toBe("A");
    expect(normalizeLetter("b")).toBe("B");
    expect(normalizeLetter("C")).toBe("C");
    expect(normalizeLetter(" D ")).toBe("D");
  });

  it("extracts the letter from verbose forms", () => {
    expect(normalizeLetter("(A)")).toBe("A");
    expect(normalizeLetter("A.")).toBe("A");
    expect(normalizeLetter("A)")).toBe("A");
    expect(normalizeLetter("Choice B")).toBe("B");
    expect(normalizeLetter("Option C")).toBe("C");
    expect(normalizeLetter("The answer is D.")).toBe("D");
  });

  it("returns null when no A-D letter is found", () => {
    expect(normalizeLetter("E")).toBeNull();
    expect(normalizeLetter("")).toBeNull();
    expect(normalizeLetter(null)).toBeNull();
    expect(normalizeLetter(undefined)).toBeNull();
    expect(normalizeLetter("the cat sat")).toBeNull();
  });
});

describe("normalizeNumeric — open-ended numeric parsing", () => {
  it("parses plain numbers + scientific", () => {
    expect(normalizeNumeric("0.5")).toBe(0.5);
    expect(normalizeNumeric("-3.14")).toBe(-3.14);
    expect(normalizeNumeric(42)).toBe(42);
    expect(normalizeNumeric("1.5e-3")).toBeCloseTo(0.0015, 6);
  });

  it("parses simple fractions", () => {
    expect(normalizeNumeric("1/2")).toBe(0.5);
    expect(normalizeNumeric("-3/4")).toBe(-0.75);
    expect(normalizeNumeric("5 / 8")).toBe(0.625);
  });

  it("parses percent", () => {
    expect(normalizeNumeric("50%")).toBe(0.5);
    expect(normalizeNumeric("-25%")).toBe(-0.25);
  });

  it("strips currency + thousands separator", () => {
    expect(normalizeNumeric("$3.14")).toBe(3.14);
    expect(normalizeNumeric("1,234.5")).toBe(1234.5);
  });

  it("strips trailing units", () => {
    expect(normalizeNumeric("5 dollars")).toBe(5);
    expect(normalizeNumeric("3.14 meters")).toBe(3.14);
  });

  it("returns null for non-numeric", () => {
    expect(normalizeNumeric(null)).toBeNull();
    expect(normalizeNumeric("")).toBeNull();
    expect(normalizeNumeric("any positive integer")).toBeNull();
    // Division by zero
    expect(normalizeNumeric("1/0")).toBeNull();
  });
});

describe("tallyAgreement — vote rollup", () => {
  it("returns a consensus when the majority agrees", () => {
    const r = tallyAgreement(["A", "A", "B"]);
    expect(r.consensus).toBe("A");
    expect(r.count).toBe(2);
    expect(r.unanimous).toBe(false);
    expect(r.total_valid).toBe(3);
  });

  it("marks unanimous correctly", () => {
    const r = tallyAgreement(["A", "A", "A"]);
    expect(r.consensus).toBe("A");
    expect(r.unanimous).toBe(true);
  });

  it("returns null consensus when no answer holds majority", () => {
    const r = tallyAgreement(["A", "B", "C"]);
    expect(r.consensus).toBeNull();
    expect(r.unanimous).toBe(false);
    expect(r.total_valid).toBe(3);
  });

  it("filters out null/undefined votes (failed voters)", () => {
    const r = tallyAgreement(["A", null, undefined, "A"]);
    expect(r.total_valid).toBe(2);
    expect(r.consensus).toBe("A");
    expect(r.unanimous).toBe(true);
  });

  it("normalizes letter forms before tallying", () => {
    const r = tallyAgreement(["A", "(A)", "Choice A"]);
    expect(r.consensus).toBe("A");
    expect(r.unanimous).toBe(true);
  });

  it("handles empty input", () => {
    const r = tallyAgreement([]);
    expect(r.consensus).toBeNull();
    expect(r.total_valid).toBe(0);
    expect(r.unanimous).toBe(false);
  });
});

// answersEquivalent integration with the SymPy bridge — we mock
// math-equivalence at the module boundary so this stays pure.
describe("answersEquivalent — cheapest-first cascade", () => {
  it("byte-equal returns 'equivalent' without touching SymPy", async () => {
    vi.resetModules();
    const mockBridge = vi.fn();
    vi.doMock("../../../scripts/lib/math-equivalence.mjs", () => ({
      areExpressionsEquivalent: mockBridge,
    }));
    const { answersEquivalent } = await import("../../../scripts/lib/grader-normalize.mjs");
    expect(await answersEquivalent({ answerA: "  A  ", answerB: "a" })).toBe("equivalent");
    expect(mockBridge).not.toHaveBeenCalled();
    vi.doUnmock("../../../scripts/lib/math-equivalence.mjs");
  });

  it("MC letter normalization decides without SymPy", async () => {
    vi.resetModules();
    const mockBridge = vi.fn();
    vi.doMock("../../../scripts/lib/math-equivalence.mjs", () => ({
      areExpressionsEquivalent: mockBridge,
    }));
    const { answersEquivalent } = await import("../../../scripts/lib/grader-normalize.mjs");
    expect(
      await answersEquivalent({
        answerA: "(B)",
        answerB: "B.",
        answerFormat: "multiple_choice",
      })
    ).toBe("equivalent");
    expect(
      await answersEquivalent({
        answerA: "A",
        answerB: "B",
        answerFormat: "multiple_choice",
      })
    ).toBe("not_equivalent");
    expect(mockBridge).not.toHaveBeenCalled();
    vi.doUnmock("../../../scripts/lib/math-equivalence.mjs");
  });

  it("numeric_entry: numeric match works without SymPy", async () => {
    vi.resetModules();
    const mockBridge = vi.fn();
    vi.doMock("../../../scripts/lib/math-equivalence.mjs", () => ({
      areExpressionsEquivalent: mockBridge,
    }));
    const { answersEquivalent } = await import("../../../scripts/lib/grader-normalize.mjs");
    expect(
      await answersEquivalent({
        answerA: "0.5",
        answerB: "1/2",
        answerFormat: "numeric_entry",
      })
    ).toBe("equivalent");
    expect(mockBridge).not.toHaveBeenCalled();
    vi.doUnmock("../../../scripts/lib/math-equivalence.mjs");
  });

  it("numeric_entry: distinct numbers return not_equivalent without SymPy", async () => {
    vi.resetModules();
    const mockBridge = vi.fn();
    vi.doMock("../../../scripts/lib/math-equivalence.mjs", () => ({
      areExpressionsEquivalent: mockBridge.mockResolvedValue({
        equivalent: null,
        method: "inconclusive",
        reason: "x",
      }),
    }));
    const { answersEquivalent } = await import("../../../scripts/lib/grader-normalize.mjs");
    expect(
      await answersEquivalent({
        answerA: "3",
        answerB: "4",
        answerFormat: "numeric_entry",
      })
    ).toBe("not_equivalent");
    vi.doUnmock("../../../scripts/lib/math-equivalence.mjs");
  });

  it("numeric_entry: SymPy says equivalent → return 'equivalent'", async () => {
    vi.resetModules();
    vi.doMock("../../../scripts/lib/math-equivalence.mjs", () => ({
      areExpressionsEquivalent: vi.fn().mockResolvedValue({
        equivalent: true,
        method: "sympy",
        reason: "x",
      }),
    }));
    const { answersEquivalent } = await import("../../../scripts/lib/grader-normalize.mjs");
    expect(
      await answersEquivalent({
        answerA: "(x+1)^2",
        answerB: "x^2 + 2*x + 1",
        answerFormat: "numeric_entry",
      })
    ).toBe("equivalent");
    vi.doUnmock("../../../scripts/lib/math-equivalence.mjs");
  });

  it("inconclusive when SymPy fails AND inputs aren't numeric", async () => {
    vi.resetModules();
    vi.doMock("../../../scripts/lib/math-equivalence.mjs", () => ({
      areExpressionsEquivalent: vi.fn().mockResolvedValue({
        equivalent: null,
        method: "inconclusive",
        reason: "parse_error",
      }),
    }));
    const { answersEquivalent } = await import("../../../scripts/lib/grader-normalize.mjs");
    expect(
      await answersEquivalent({
        answerA: "any positive integer",
        answerB: "infinitely many",
        answerFormat: "numeric_entry",
      })
    ).toBe("inconclusive");
    vi.doUnmock("../../../scripts/lib/math-equivalence.mjs");
  });
});
