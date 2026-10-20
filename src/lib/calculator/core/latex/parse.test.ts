import { describe, expect, it } from "vitest";
import { isParseErrorCode } from "./errors";
import {
  countNodes,
  MAX_NESTING_DEPTH,
  MAX_TREE_NODES,
  parseLatex,
  type ParseResult,
} from "./index";

const code = (s: string) => {
  const r = parseLatex(s);
  return r.ok ? "ok" : r.error.code;
};
const spanOf = (s: string) => {
  const r = parseLatex(s);
  return r.ok ? null : [r.error.code, r.error.span.start, r.error.span.end];
};
const inRange = (r: ParseResult) =>
  r.ok ||
  (r.error.span.start >= 0 &&
    r.error.span.start <= r.error.span.end &&
    r.error.span.end <= r.normalized.length);

describe("parse never throws", () => {
  it("PR-38 half-typed MathQuill structures return syntax errors", () => {
    for (const input of ["\\frac{}{}", "x^{}", "2+", "\\left(", "\\operatorname{}", "="])
      expect([code(input), inRange(parseLatex(input))]).toEqual(["syntax", true]);
  });
  it("PR-38 an empty root or root index has its own code, as Desmos's messages do", () => {
    expect(["\\sqrt{}", "\\sqrt[3]{ }", "\\sqrt[]{8}", "\\sqrt[ ]{}"].map(spanOf)).toEqual([
      ["empty-root", 5, 7],
      ["empty-root", 8, 11],
      ["empty-root-index", 5, 7],
      ["empty-root-index", 5, 8],
    ]);
  });
  it("PR-38 errors carry their code and the span of the offending text", () => {
    expect(["x\\pm1", "2+", "(1,2,3)", "a<x>b", "  ", "\\left|x|y|\\right|"].map(spanOf)).toEqual([
      ["unsupported", 1, 4],
      ["syntax", 2, 2],
      ["point-arity", 0, 7],
      ["relation-chain", 3, 4],
      ["syntax", 0, 0],
      ["syntax", 8, 9],
    ]);
  });
  it("PR-38 the node and depth limits give too-many-nodes and too-deep", () => {
    expect([
      MAX_TREE_NODES,
      MAX_NESTING_DEPTH,
      spanOf("(".repeat(65) + "x" + ")".repeat(65)),
    ]).toEqual([2000, 64, ["too-deep", 64, 65]]);
    expect(
      [
        "x+".repeat(999) + "x",
        "x+".repeat(1000) + "x",
        "-".repeat(5000) + "x",
        "(".repeat(64) + "x" + ")".repeat(64),
        "\\frac{".repeat(5000),
      ].map(code)
    ).toEqual(["ok", "too-many-nodes", "too-many-nodes", "ok", "too-deep"]);
    expect([64, 65].map((k) => code("x^{".repeat(k) + "1" + "}".repeat(k)))).toEqual([
      "ok",
      "too-deep",
    ]);
  });
  it("PR-38 2,000 seeded random fragment strings never throw and keep spans in range", () => {
    const parts =
      "x 2 . + - ^ _ { } ( ) [ | \\frac \\sqrt \\left( \\right) \\sin \\log = < \\le , \\% ! e \\pi \\operatorname{ \\cdot f a_ \\lvert \\rvert ° ²"
        .split(" ")
        .concat(" ");
    let seed = 20261016;
    const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    for (let i = 0; i < 2000; i++) {
      let input = "";
      for (let j = 1 + Math.floor(next() * 12); j > 0; j--)
        input += parts[Math.floor(next() * parts.length)];
      const r = parseLatex(input, { userFunctions: new Set(["f"]) });
      expect(
        inRange(r) && (r.ok ? countNodes(r.tree) <= 2000 : isParseErrorCode(r.error.code)),
        input
      ).toBe(true);
    }
  });
});
