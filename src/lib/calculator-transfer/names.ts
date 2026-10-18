// Question function names from prose (TR-19): a name directly after "function" or "functions",
// in prose or as a lone math segment. Eager and framework-free; no v2 import (AR-3).

import type { MathSegment } from "../../components/learn/math-segments";
import { lexQuestionMath } from "./lex";
import { normalizeQuestionMath } from "./normalize";

/** TR-13 and the core's head pre-scan: a Latin letter, optionally subscripted. */
export const FUNCTION_HEAD = /^[A-Za-z](?:_\{[A-Za-z0-9]+\})?$/;

const SOURCE_MARKERS = /\[\[\/?[ui]\]\]|<\/?[ui]>/g;

/** A lone normalised `f`, `f_{1}` or `f(x)` gives its name; anything else gives null. */
export function loneName(latex: string): string | null {
  const lexed = lexQuestionMath(normalizeQuestionMath(latex, "math"));
  if (!lexed.ok) return null;
  const [name, open, param, close, ...rest] = lexed.tokens;
  if (name?.kind !== "name" || !FUNCTION_HEAD.test(name.text)) return null;
  if (open === undefined) return name.text;
  const call =
    open.kind === "open" &&
    open.text === "(" &&
    param?.kind === "name" &&
    close?.kind === "close" &&
    close.text === ")" &&
    rest.length === 0;
  return call ? name.text : null;
}

type Run = { kind: "text"; value: string } | { kind: "math"; latex: string };

/** Consecutive text segments joined with the source markers removed, math segments between. */
function runsOf(segments: readonly MathSegment[]): Run[] {
  const runs: Run[] = [];
  for (const s of segments) {
    const last = runs.at(-1);
    if (s.kind !== "text") runs.push({ kind: "math", latex: s.latex });
    else if (last?.kind === "text") last.value += s.value.replace(SOURCE_MARKERS, "");
    else runs.push({ kind: "text", value: s.value.replace(SOURCE_MARKERS, "") });
  }
  return runs;
}

const LIST_SEPARATOR = /^\s*(?:,\s*and\b|,|and\b)/;

/** TR-19: names read after each "function" or "functions" in the prose of `segments`. */
export function proseFunctionNames(segments: readonly MathSegment[]): Set<string> {
  const names = new Set<string>();
  const runs = runsOf(segments);
  runs.forEach((run, r) => {
    if (run.kind !== "text") return;
    for (const m of run.value.matchAll(/\bfunctions?\b/gi)) {
      const plural = m[0].length > "function".length;
      let at = { r, i: (m.index ?? 0) + m[0].length };
      for (;;) {
        const name = readName(runs, at);
        if (!name) break;
        names.add(name.name);
        at = name.after;
        if (!plural) break;
        const current = runs[at.r];
        if (current?.kind !== "text") break;
        const separator = current.value.slice(at.i).match(LIST_SEPARATOR);
        if (!separator) break;
        at = { r: at.r, i: at.i + separator[0].length };
      }
    }
  });
  return names;
}

type Position = { r: number; i: number };

/** One name at `at` (spaces skipped): a prose Latin letter, or a lone math segment at the run end. */
function readName(runs: Run[], at: Position): { name: string; after: Position } | null {
  const run = runs[at.r];
  if (run?.kind !== "text") return null;
  let i = at.i;
  while (/\s/.test(run.value[i] ?? "")) i++;
  if (i >= run.value.length) {
    const math = runs[at.r + 1];
    const name = math?.kind === "math" ? loneName(math.latex) : null;
    return name ? { name, after: { r: at.r + 2, i: 0 } } : null;
  }
  const letter = run.value[i];
  if (/[A-Za-z]/.test(letter) && !/[A-Za-z]/.test(run.value[i + 1] ?? ""))
    return { name: letter, after: { r: at.r, i: i + 1 } };
  return null;
}
