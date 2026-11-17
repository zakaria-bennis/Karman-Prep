// Evens out the spacing of math written as plain text in an answer choice (founder, 2026-11-17:
// "-13x" is right, "−9 x⁶" with a gap is wrong). The bank holds some choices typed unevenly
// ("−9 x⁶ + 6 x³ −13x + 6"); this changes how they are shown, never what is stored. It is
// deliberately narrow, so prose is left alone:
//   a number, a space, then a letter with a raised power  ->  the space goes ("9 x⁶" -> "9x⁶")
//   a term, a space, then a minus or plus stuck to the next number  ->  a space is put after it
//   ("x³ −13x" -> "x³ − 13x")
// Math set in LaTeX is not touched: it is laid out by the typesetter.
const RAISED = "⁰¹²³⁴⁵⁶⁷⁸⁹";

export function tidyMathText(text: string): string {
  if (/[\\$]/.test(text)) return text;
  return text
    .replace(new RegExp(`(\\d) ([a-zA-Z])(?=[${RAISED}])`, "g"), "$1$2")
    .replace(new RegExp(`([${RAISED}\\w)]) ([−+])(?=[\\da-zA-Z(])`, "g"), "$1 $2 ");
}
