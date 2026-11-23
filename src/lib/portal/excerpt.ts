/*
 * The start of a question for a list (the tutor's every-answer page): at most `max` characters, cut
 * at a word and never inside a math expression, with an ellipsis when anything is left out. The
 * result is still source for MathText, which draws the math. Pure.
 */
import { splitMathText, type MathSegment } from "@/components/learn/math-segments";

const source = (s: MathSegment) =>
  s.kind === "text" ? s.value : s.kind === "inline" ? `\\(${s.latex}\\)` : `$$${s.latex}$$`;

export function excerpt(text: string, max = 400): string {
  const parts = splitMathText(text, false, true, true);
  let out = "";
  let used = 0;
  for (const part of parts) {
    const length = part.kind === "text" ? part.value.length : part.latex.length;
    if (used + length <= max) {
      out += source(part);
      used += length;
      continue;
    }
    if (part.kind === "text") {
      const room = part.value.slice(0, max - used);
      const cut = room.lastIndexOf(" ");
      out += cut > 0 ? room.slice(0, cut) : "";
    }
    return `${out.trimEnd()}…`;
  }
  return out;
}
