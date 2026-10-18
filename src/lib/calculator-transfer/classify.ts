// Stem classification (TR-1, TR-3, TR-5, TR-6): which question math segments get a Transfer
// control and what each inserts. Items are keyed by the segment index of one whole-text
// splitMathText call (decision 1). Eager and framework-free; it reads question text only and
// imports nothing from the v2 calculator (AR-3, TR-74).

import { splitMathText } from "../../components/learn/math-segments";
import { describeMath, describeSystem } from "./describe";
import { lexQuestionMath, type QToken } from "./lex";
import { normalizeQuestionMath } from "./normalize";
import type { TransferPayload } from "./payload";
import { classifySegment, type SegmentKind, type SegmentResult, type SegmentRow } from "./segment";

export interface StemInput {
  text: string;
  serializedFunctionLines: boolean;
}
export interface ChoiceInput {
  letter: string;
  text: string;
}
export type TransferItemKind =
  | "expression"
  | "equation"
  | "inequality"
  | "function"
  | "system"
  | "choice";
export interface TransferItem {
  sourceId: string; // "stem:<splitMathText index>" or "choice:<letter>"
  kind: TransferItemKind;
  ruleId: string; // accepting rule, e.g. "TR-11"; the only content TR-73 reports
  description: string; // table 8.1
  payload: Omit<TransferPayload, "questionKey">;
}
export type SegmentVerdict = { item: TransferItem } | { rule: string; detail: string };

/** Decision 6: the accepting rule of each item kind. */
const ACCEPTING_RULE: Readonly<Record<TransferItemKind, string>> = {
  expression: "TR-11",
  equation: "TR-13",
  inequality: "TR-11",
  function: "TR-13",
  system: "TR-12",
  choice: "TR-40",
};

const MEMO_LIMIT = 200;
function memoized<K, V>(): (key: K, compute: () => V) => V {
  const memo = new Map<K, V>();
  return (key, compute) => {
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    if (memo.size >= MEMO_LIMIT) memo.clear();
    const value = compute();
    memo.set(key, value);
    return value;
  };
}
const stemKey = (stem: StemInput) => `${stem.serializedFunctionLines}\u0000${stem.text}`;

/** TR-13 and the core's head pre-scan: a Latin letter, optionally subscripted. */
const FUNCTION_HEAD = /^[A-Za-z](?:_\{[A-Za-z0-9]+\})?$/;

/** TR-19: names a row of `latex` defines as functions (`name(v)=…`), whatever else the row holds. */
function functionHeads(latex: string): string[] {
  const lexed = lexQuestionMath(latex);
  if (!lexed.ok) return [];
  const lines: QToken[][] = [[]];
  for (const t of lexed.tokens) {
    if (t.kind === "newline") lines.push([]);
    else if (!["begin", "end", "sysOpen", "sysClose", "amp"].includes(t.kind))
      lines[lines.length - 1].push(t);
  }
  return lines.flatMap(([name, open, param, close, rel]) =>
    name?.kind === "name" &&
    FUNCTION_HEAD.test(name.text) &&
    open?.kind === "open" &&
    open.text === "(" &&
    param?.kind === "name" &&
    /^[A-Za-z]$/.test(param.text) &&
    close?.kind === "close" &&
    close.text === ")" &&
    rel?.kind === "rel" &&
    rel.text === "="
      ? [name.text]
      : []
  );
}

/** The kind of an accepted segment, its description and its payload rows. */
function itemFor(
  sourceId: string,
  kind: SegmentKind,
  rows: readonly SegmentRow[],
  dependencies: string[]
): TransferItem {
  const description =
    kind === "system"
      ? describeSystem(rows.map((r) => (r.kind === "inequality" ? "inequality" : "equation")))
      : describeMath(rows[0].latex);
  return {
    sourceId,
    kind,
    ruleId: ACCEPTING_RULE[kind],
    description,
    payload: {
      version: 1,
      sourceId,
      description,
      format: "rows",
      dependencies,
      rows: rows.map((r) => r.latex),
    },
  };
}

interface StemSegment {
  index: number;
  latex: string;
  result: SegmentResult;
}

/** Every non-text segment of the stem, normalised and classified with the stem's function names. */
function stemSegments(stem: StemInput): StemSegment[] {
  const segments = splitMathText(stem.text, stem.serializedFunctionLines, true, true);
  const math = segments.flatMap((s, index) =>
    s.kind === "text" ? [] : [{ index, latex: normalizeQuestionMath(s.latex, "math") }]
  );
  const functionNames = new Set(math.flatMap((m) => functionHeads(m.latex)));
  return math.map((m) => ({ ...m, result: classifySegment(m.latex, "stem", functionNames) }));
}

const explainMemo = memoized<string, ReadonlyMap<number, SegmentVerdict>>();

/** A verdict for every non-text segment of the stem, keyed by its whole-text segment index. */
export function explainStem(stem: StemInput): ReadonlyMap<number, SegmentVerdict> {
  return explainMemo(stemKey(stem), () => {
    const verdicts = new Map<number, SegmentVerdict>();
    for (const { index, result } of stemSegments(stem)) {
      verdicts.set(
        index,
        result.ok
          ? { item: itemFor(`stem:${index}`, result.kind, result.rows, []) }
          : { rule: result.rule, detail: result.detail }
      );
    }
    return verdicts;
  });
}

const classifyMemo = memoized<string, ReadonlyMap<number, TransferItem>>();

/** TR-1, TR-5: the stem's transfer items; rejected segments get no entry. */
export function classifyStem(stem: StemInput): ReadonlyMap<number, TransferItem> {
  return classifyMemo(stemKey(stem), () => {
    const items = new Map<number, TransferItem>();
    for (const [index, verdict] of explainStem(stem))
      if ("item" in verdict) items.set(index, verdict.item);
    return items;
  });
}
