// A lesson's text as the narrator says it: math read aloud ("72 over 360", "x squared", "pi r
// squared"), marks dropped, a blank read as "blank". Used to make the videos' narration
// (scripts/lessons/build-videos.ts); the captions keep the written form.
import type { Rich } from "./types";

const WORDS: [RegExp, string][] = [
  [/\\(left|right|displaystyle|,|;|!|:|quad|qquad)/g, " "],
  [/\\text\{([^}]*)\}/g, " $1 "],
  [/\\mathrm\{([^}]*)\}/g, " $1 "],
  [/\^\{?\\circ\}?/g, " degrees"],
  [/\\%/g, " percent"],
  [/\\pi/g, " pi "],
  [/\\theta/g, " theta "],
  [/\\(cdot|times)/g, " times "],
  [/\\div/g, " divided by "],
  [/\\(le|leq)\b/g, " is less than or equal to "],
  [/\\(ge|geq)\b/g, " is greater than or equal to "],
  [/\\(ne|neq)\b/g, " does not equal "],
  [/\\approx/g, " is about "],
  [/\\pm/g, " plus or minus "],
  [/\\sin/g, " sine "],
  [/\\cos/g, " cosine "],
  [/\\tan/g, " tangent "],
  [/\\angle/g, " angle "],
  [/\\triangle/g, " triangle "],
  [/\\overline\{([^}]*)\}/g, " segment $1 "],
];

/** The index just past the brace group that opens at `open`. */
function closeOf(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return i + 1;
  }
  return -1;
}

function power(p: string): string {
  const t = p.trim();
  if (t === "2") return " squared";
  if (t === "3") return " cubed";
  if (t === "-1") return " to the negative one";
  return ` to the ${t}`;
}

/** One piece of LaTeX, spoken. */
export function speakMath(latex: string): string {
  let s = latex.replace(/\\[dt]frac/g, "\\frac");
  for (const [re, to] of WORDS) s = s.replace(re, to);
  // fractions and roots, innermost first
  for (let guard = 0; guard < 40; guard++) {
    const at = s.search(/\\frac\{|\\sqrt\{|\\sqrt\[/);
    if (at < 0) break;
    if (s.startsWith("\\sqrt[", at)) {
      const end = s.indexOf("]", at);
      const n = s.slice(at + 6, end);
      const b1 = closeOf(s, end + 1);
      const body = s.slice(end + 2, b1 - 1);
      s = `${s.slice(0, at)} the ${n === "3" ? "cube" : `${n}th`} root of ${body} ${s.slice(b1)}`;
      continue;
    }
    const isFrac = s.startsWith("\\frac", at);
    const a0 = at + (isFrac ? 5 : 5);
    const a1 = closeOf(s, a0);
    if (a1 < 0) break;
    const a = s.slice(a0 + 1, a1 - 1);
    if (!isFrac) {
      s = `${s.slice(0, at)} the square root of ${a} ${s.slice(a1)}`;
      continue;
    }
    const b1 = closeOf(s, a1);
    if (b1 < 0) break;
    const b = s.slice(a1 + 1, b1 - 1);
    s = `${s.slice(0, at)} ${a} over ${b} ${s.slice(b1)}`;
  }
  s = s
    .replace(/\^\{([^}]*)\}/g, (_, p: string) => power(p))
    .replace(/\^(-?\w)/g, (_, p: string) => power(p))
    .replace(/_\{([^}]*)\}/g, " sub $1")
    .replace(/_(\w)/g, " sub $1")
    .replace(/([a-zA-Z])\(([^()]*)\)/g, (m, f: string, x: string) =>
      /^[fghpqrstvw]$/.test(f) ? `${f} of ${x}` : m
    )
    .replace(/[{}]/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/(\w|\))\s*-\s*/g, "$1 minus ")
    .replace(/(^|[\s(])-\s*(?=[\w.])/g, "$1negative ")
    .replace(/<=/g, " is less than or equal to ")
    .replace(/>=/g, " is greater than or equal to ")
    .replace(/</g, " is less than ")
    .replace(/>/g, " is greater than ")
    .replace(/=/g, " equals ")
    .replace(/\+/g, " plus ")
    .replace(/\*/g, " times ")
    .replace(/\//g, " over ")
    .replace(/(\d),(\d{3})/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/** A whole line of lesson text, spoken. */
export function speak(text: Rich): string {
  return text
    .replace(/\$([^$]+)\$/g, (_, tex: string) => ` ${speakMath(tex)} `)
    .replace(/\*\*/g, "")
    .replace(/<\/?[ui]>/g, "")
    .replace(/_{3,}/g, " blank ")
    .replace(/%/g, " percent")
    .replace(/°/g, " degrees")
    .replace(/\s+([,.;:?!])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
