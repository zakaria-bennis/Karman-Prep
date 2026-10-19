// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MathText from "./MathText";
import { splitMathText, type MathSegment } from "./math-segments";

vi.mock("@/components/calculator/CalculatorSourceAction", () => ({
  CalculatorSourceAction: ({ latex }: { latex: string }) => (
    <span data-testid="source-action" data-latex={latex} />
  ),
}));
afterEach(cleanup);

const TEXTS: [string, boolean][] = [
  ["Line $y=2x+3$, then \\(x\\le5\\) and $$\\begin{cases}y=2x\\\\y=x+1\\end{cases}$$ end.", false],
  ["[[u]]Solve $2x=4$[[/u]] then <i>check $x=2$</i> for $x$.", false],
  ["Use <i>$a=1$</i>$b=2$", false],
  ["A pen is $\\$12.50$; it was $5 for the pen and $6 for the case.", false],
  ["5. The function f is defined by f(x) = (1/2)(x + 11). What is the value of f(3)?", true],
  ["√(x²) = 24 − 5x\nWhat is the solution to the given equation?", true],
];
const mathOf = (segs: MathSegment[]) => segs.flatMap((s) => (s.kind === "text" ? [] : [s.latex]));

it("TR-6 MathText renders, in order, exactly the non-text segments of the whole-text splitMathText call", () => {
  for (const [text, lines] of TEXTS) {
    const { container, unmount } = render(
      <MathText text={text} calculator serializedFunctionLines={lines} />
    );
    const rendered = [...container.querySelectorAll("[data-testid=source-action]")].map((e) =>
      e.getAttribute("data-latex")
    );
    expect(rendered, text).toEqual(mathOf(splitMathText(text, lines, true, true)));
    expect(rendered.length, text).toBeGreaterThan(0);
    unmount();
  }
});
it("TR-6 segment indexes count every segment of one whole-text split, source markers and split currency text included", () => {
  expect(splitMathText(TEXTS[2][0], false, true, true)).toEqual([
    { kind: "text", value: "Use <i>" },
    { kind: "inline", latex: "a=1" },
    { kind: "text", value: "</i>" },
    { kind: "inline", latex: "b=2" },
  ]);
  expect(splitMathText(TEXTS[3][0], false, true, true).map((s) => s.kind)).toEqual([
    "text",
    "inline",
    "text",
    "text",
  ]);
});
it("TR-6 splitMathText is MathText's former parser and math-segments.ts is framework-free", () => {
  expect(splitMathText("a $x$ b $$y=1$$", false, true, true)).toEqual([
    { kind: "text", value: "a " },
    { kind: "inline", latex: "x" },
    { kind: "text", value: " b " },
    { kind: "block", latex: "y=1" },
  ]);
  // the currency branch keeps the text through the first "$" and rescans: two text segments
  expect(splitMathText("costs $5 for the pen and $6 for the case", false, true, true)).toEqual([
    { kind: "text", value: "costs $" },
    { kind: "text", value: "5 for the pen and $6 for the case" },
  ]);
  expect(readFileSync("src/components/learn/math-segments.ts", "utf8")).not.toMatch(
    /from "(react|katex)/
  );
  const mathText = readFileSync("src/components/learn/MathText.tsx", "utf8");
  expect(mathText).toMatch(/from "\.\/math-segments"/);
  expect(mathText).not.toMatch(/function parse\(/);
});
