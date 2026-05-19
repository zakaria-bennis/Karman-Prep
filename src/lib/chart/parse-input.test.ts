import { describe, it, expect } from "vitest";
import { parseEquation, parsePoints, parseBars } from "./parse-input";

describe("parseEquation", () => {
  describe("linear", () => {
    it("y = mx + b", () => {
      const r = parseEquation("y = 2x + 5");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "linear", m: 2, b: 5 });
    });
    it("y = mx - b", () => {
      const r = parseEquation("y = 3x - 7");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "linear", m: 3, b: -7 });
    });
    it("implicit slope of 1: y = x + 1", () => {
      const r = parseEquation("y = x + 1");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "linear", m: 1, b: 1 });
    });
    it("negative implicit slope: y = -x", () => {
      const r = parseEquation("y = -x");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "linear", m: -1, b: 0 });
    });
    it("fractional slope: y = 0.5x + 2", () => {
      const r = parseEquation("y = 0.5x + 2");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "linear", m: 0.5, b: 2 });
    });
    it("constant: y = 5", () => {
      const r = parseEquation("y = 5");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "linear", m: 0, b: 5 });
    });
    it("f(x) prefix is normalized: f(x) = 2x", () => {
      const r = parseEquation("f(x) = 2x");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "linear", m: 2, b: 0 });
    });
    it("unicode minus is normalized: y = −2x + 3", () => {
      const r = parseEquation("y = −2x + 3");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "linear", m: -2, b: 3 });
    });
  });

  describe("quadratic", () => {
    it("y = x^2", () => {
      const r = parseEquation("y = x^2");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "quadratic", a: 1, b: 0, c: 0 });
    });
    it("y = 2x^2 - 3x + 1", () => {
      const r = parseEquation("y = 2x^2 - 3x + 1");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "quadratic", a: 2, b: -3, c: 1 });
    });
    it("y = -x^2 + 5", () => {
      const r = parseEquation("y = -x^2 + 5");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "quadratic", a: -1, b: 0, c: 5 });
    });
    it("y = x^2 - 4x + 4 (perfect square)", () => {
      const r = parseEquation("y = x^2 - 4x + 4");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "quadratic", a: 1, b: -4, c: 4 });
    });
  });

  describe("absolute_value", () => {
    it("y = |x - 3| + 2", () => {
      const r = parseEquation("y = |x - 3| + 2");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "absolute_value", a: 1, h: 3, k: 2 });
    });
    it("y = 2|x + 1|", () => {
      const r = parseEquation("y = 2|x + 1|");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "absolute_value", a: 2, h: -1, k: 0 });
    });
    it("y = -|x|", () => {
      const r = parseEquation("y = -|x|");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "absolute_value", a: -1, h: 0, k: 0 });
    });
  });

  describe("exponential", () => {
    it("y = 2 * 3^x", () => {
      const r = parseEquation("y = 2 * 3^x");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "exponential", a: 2, b: 3 });
    });
    it("y = 2^x (no coefficient)", () => {
      const r = parseEquation("y = 2^x");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toEqual({ kind: "exponential", a: 1, b: 2 });
    });
  });

  describe("errors", () => {
    it("empty string", () => {
      const r = parseEquation("");
      expect(r.ok).toBe(false);
    });
    it("unsupported family: y = sin(x)", () => {
      const r = parseEquation("y = sin(x)");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("supported shapes");
    });
    it("garbage input", () => {
      const r = parseEquation("hello world");
      expect(r.ok).toBe(false);
    });
  });
});

describe("parsePoints", () => {
  it("(x, y) pairs separated by commas", () => {
    const r = parsePoints("(1, 2), (3, 4), (5, 6)");
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.value).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
  });
  it("(x y) with space separator", () => {
    const r = parsePoints("(1 2) (3 4)");
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.value).toEqual([
        [1, 2],
        [3, 4],
      ]);
  });
  it("one pair per line", () => {
    const r = parsePoints("1, 2\n3, 4\n5, 6");
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.value).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
  });
  it("negative numbers", () => {
    const r = parsePoints("(-1, -2), (3, -4)");
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.value).toEqual([
        [-1, -2],
        [3, -4],
      ]);
  });
  it("decimal coordinates", () => {
    const r = parsePoints("(1.5, 2.25)");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([[1.5, 2.25]]);
  });
  it("empty input", () => {
    const r = parsePoints("");
    expect(r.ok).toBe(false);
  });
  it("odd number of values", () => {
    const r = parsePoints("1, 2, 3");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/even/i);
  });
});

describe("parseBars", () => {
  it('"Category: value" comma-separated', () => {
    const r = parseBars("A: 5, B: 3, C: 8");
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.value).toEqual([
        { category: "A", value: 5 },
        { category: "B", value: 3 },
        { category: "C", value: 8 },
      ]);
  });
  it('"Category = value" newline-separated', () => {
    const r = parseBars("A = 5\nB = 3");
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.value).toEqual([
        { category: "A", value: 5 },
        { category: "B", value: 3 },
      ]);
  });
  it("space separator", () => {
    const r = parseBars("Apples 5\nOranges 3");
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.value).toEqual([
        { category: "Apples", value: 5 },
        { category: "Oranges", value: 3 },
      ]);
  });
  it("quoted categories with spaces", () => {
    const r = parseBars('"Reading & Writing": 60, "Math": 40');
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.value).toEqual([
        { category: "Reading & Writing", value: 60 },
        { category: "Math", value: 40 },
      ]);
  });
  it("empty input", () => {
    const r = parseBars("");
    expect(r.ok).toBe(false);
  });
  it("malformed entry", () => {
    const r = parseBars("A: 5, B");
    expect(r.ok).toBe(false);
  });
});
