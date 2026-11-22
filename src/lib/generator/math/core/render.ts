/*
 * Does a generated text render in MathText, and does it read cleanly? The text is split the
 * way MathText splits it (math-segments.ts), every math piece must compile in KaTeX with
 * errors on, and both prose and math are scanned for the slips a template can make: a stray
 * dollar sign, LaTeX in prose, "NaN", a coefficient of 1, "+ -", a power of 1.
 */
import katex from "katex";
import { splitMathText } from "@/components/learn/math-segments";

const PROSE_PROBLEMS: [RegExp, string][] = [
  [/\$/, "a dollar sign outside math"],
  [/\\[a-zA-Z(]/, "a LaTeX command in prose"],
  [/\bNaN\b/, "a missing value"],
  [/\[object/, "an object printed as text"],
  [/ {2,}/, "a double space"],
  [/ [,;:?]| \.(?!\d)/, "a space before punctuation"],
];

const MATH_PROBLEMS: [RegExp, string][] = [
  [/NaN|undefined|Infinity|null/, "a missing value"],
  [/\+\s*-|-\s*-|-\s*\+|\+\s*\+/, "two signs in a row"],
  [
    /(^|[^\d.}\\a-zA-Z])1(?=[a-zA-Z(\\])(?!\\frac|\\cdot|\\times|\\text|\\%|\\le|\\ge|\\ne|\\right|\\left)/,
    "a coefficient of 1",
  ],
  [/\^\{?1\}?(?![\d.])/, "a power of 1"],
  [/(^|[^\d.])0(?=[a-zA-Z])/, "a coefficient of 0"],
  [/\\frac\{(-?\d+)\}\{1\}/, "a fraction over 1"],
  [/\\sqrt\{1\}|\\sqrt\{0\}/, "a square root of 0 or 1"],
  [/\(\s*\)/, "empty parentheses"],
];

export interface RenderIssue {
  text: string;
  problem: string;
}

/** Problems with one MathText string; an empty list means it renders and reads cleanly. */
export function renderIssues(text: string): RenderIssue[] {
  const issues: RenderIssue[] = [];
  if (!text || !text.trim()) return [{ text, problem: "empty text" }];
  const segments = splitMathText(text, false, true, true);
  for (const segment of segments) {
    if (segment.kind === "text") {
      for (const [pattern, problem] of PROSE_PROBLEMS) {
        if (pattern.test(segment.value)) issues.push({ text: segment.value, problem });
      }
      continue;
    }
    try {
      katex.renderToString(segment.latex, {
        throwOnError: true,
        displayMode: segment.kind === "block",
        strict: "ignore",
      });
    } catch (error) {
      issues.push({
        text: segment.latex,
        problem: `KaTeX: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    for (const [pattern, problem] of MATH_PROBLEMS) {
      if (pattern.test(segment.latex)) issues.push({ text: segment.latex, problem });
    }
  }
  return issues;
}
