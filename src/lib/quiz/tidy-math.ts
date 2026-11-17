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

const UP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

/** A power typed with a caret in plain text ("9x^3") is shown raised ("9x³"), and a hyphen
 *  between two terms as a minus sign. Only whole-number powers; LaTeX is left to the typesetter. */
export function raisePowers(text: string): string {
  if (/[\\$]/.test(text)) return text;
  return (
    text
      .replace(/\^(\d+)/g, (_, digits: string) => [...digits].map((d) => UP[d]).join(""))
      // a hyphen between two terms of math (a number or a power before it, a number after)
      .replace(new RegExp(`(\\d[a-zA-Z]?|[${RAISED})]) - (?=[\\d(])`, "g"), "$1 − ")
  );
}
