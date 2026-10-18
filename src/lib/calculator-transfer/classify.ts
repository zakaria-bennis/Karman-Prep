// Stem classification (TR-1, TR-3, TR-5, TR-6) with question function names, calls and stem
// dependencies (TR-18 to TR-21, TR-37, TR-77), whole answer choices (TR-40) and control names
// (TR-50): which question math segments get a Transfer control and what each inserts. Items are keyed by the segment index of one whole-text
// splitMathText call (decision 1). Eager and framework-free; it reads question text only and
// imports nothing from the v2 calculator (AR-3, TR-74).

import { splitMathText, type MathSegment } from "../../components/learn/math-segments";
import { describeChoice, describeMath, describeSystem } from "./describe";
import { lexQuestionMath, type QToken } from "./lex";
import { FUNCTION_HEAD, proseFunctionNames } from "./names";
import { normalizeQuestionMath } from "./normalize";
import {
  EVALUATE_REASONS,
  functionCoordinateItem,
  functionCoordinateParts,
  inIntervalContext,
  pairCoordinates,
  pairItem,
} from "./pairs";
import type { TransferPayload } from "./payload";
import {
  classifySegment,
  TRANSFER_PHASE,
  type SegmentKind,
  type SegmentResult,
  type SegmentRow,
} from "./segment";

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
  | "choice"
  | "table"
  | "pair"
  | "functionCoordinate";
/** TR-60, TR-61: the formats of a coordinate pair or function coordinate (pairs.ts). */
export interface TransferChooser {
  point: Omit<TransferPayload, "questionKey">;
  tableRow: Omit<TransferPayload, "questionKey">;
  evaluate: { label: string; reason: string } | null; // function coordinates: disabled (TR-62)
}
export interface TransferItem {
  sourceId: string; // "stem:<splitMathText index>", "choice:<letter>" or "table" (table.ts)
  kind: TransferItemKind;
  ruleId: string; // accepting rule, e.g. "TR-11"; the only content TR-73 reports
  description: string; // table 8.1
  payload: Omit<TransferPayload, "questionKey">; // a chooser item's: its Point payload
  chooser?: TransferChooser;
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
  table: "TR-22",
  pair: "TR-15",
  functionCoordinate: "TR-17",
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
  kind: Exclude<SegmentKind, "pair" | "functionCoordinate">,
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

type Rejection = { rule: string; detail: string };
type Resolution = { dependencies: SegmentRow[] } | Rejection;

interface StemSegment {
  index: number;
  result: SegmentResult;
}

/**
 * One stem's classified segments, candidate definitions and cycle set (decision 9), with the
 * memoized resolver of decision 6's classify.ts steps. Choices resolve against it too (Task 8).
 */
class StemContext {
  readonly functionNames: ReadonlySet<string>;
  readonly segments: readonly StemSegment[];
  private readonly split: readonly MathSegment[];
  private readonly candidates = new Map<number, SegmentRow>();
  private readonly definitions = new Map<string, number[]>();
  private readonly cycleSet: ReadonlySet<number>;
  private readonly verdicts = new Map<number, SegmentVerdict>();

  constructor(stem: StemInput | null) {
    const split = stem ? splitMathText(stem.text, stem.serializedFunctionLines, true, true) : [];
    this.split = split;
    const math = split.flatMap((s, index) =>
      s.kind === "text" ? [] : [{ index, latex: normalizeQuestionMath(s.latex, "math") }]
    );
    this.functionNames = new Set([
      ...proseFunctionNames(split),
      ...math.flatMap((m) => functionHeads(m.latex)),
    ]);
    this.segments = math.map((m) => ({
      index: m.index,
      result: classifySegment(m.latex, "stem", this.functionNames),
    }));
    for (const { index, result } of this.segments) {
      const defines = result.ok && result.rows.length === 1 ? result.rows[0].defines : null;
      if (!result.ok || !defines) continue;
      this.candidates.set(index, result.rows[0]);
      this.definitions.set(defines.name, [...(this.definitions.get(defines.name) ?? []), index]);
    }
    this.cycleSet = this.findCycleSet();
  }

  /** Candidates on a cycle: members of a strongly connected component of two or more (Tarjan). */
  private findCycleSet(): Set<number> {
    const edges = (c: number) => {
      const row = this.candidates.get(c);
      return row ? [...row.names, ...row.calls].flatMap((n) => this.definitions.get(n) ?? []) : [];
    };
    const order = new Map<number, number>();
    const low = new Map<number, number>();
    const stack: number[] = [];
    const onStack = new Set<number>();
    const cycle = new Set<number>();
    const visit = (v: number) => {
      order.set(v, order.size);
      low.set(v, order.size - 1);
      stack.push(v);
      onStack.add(v);
      for (const w of edges(v)) {
        if (!order.has(w)) {
          visit(w);
          low.set(v, Math.min(low.get(v) ?? 0, low.get(w) ?? 0));
        } else if (onStack.has(w)) low.set(v, Math.min(low.get(v) ?? 0, order.get(w) ?? 0));
      }
      if (low.get(v) !== order.get(v)) return;
      const component: number[] = [];
      for (let w = stack.pop(); w !== undefined; w = stack.pop()) {
        onStack.delete(w);
        component.push(w);
        if (w === v) break;
      }
      if (component.length > 1) for (const w of component) cycle.add(w);
    };
    for (const c of this.candidates.keys()) if (!order.has(c)) visit(c);
    return cycle;
  }

  /** The verdict of stem segment `index` (decision 6's classify.ts steps 1 to 6). */
  resolve(index: number): SegmentVerdict {
    const hit = this.verdicts.get(index);
    if (hit) return hit;
    const segment = this.segments.find((s) => s.index === index);
    let verdict: SegmentVerdict;
    if (!segment) verdict = { rule: "TR-1", detail: "not a math segment" };
    else if (!segment.result.ok)
      verdict = { rule: segment.result.rule, detail: segment.result.detail };
    else if (this.cycleSet.has(index)) verdict = { rule: "TR-21", detail: "cycle" };
    else if (segment.result.kind === "pair" || segment.result.kind === "functionCoordinate")
      verdict = this.chooserVerdict(index, segment.result.kind);
    else {
      const { kind, rows } = segment.result;
      const resolution = this.resolveRows(rows);
      verdict =
        "rule" in resolution
          ? resolution
          : {
              item: itemFor(
                `stem:${index}`,
                kind as Exclude<SegmentKind, "pair" | "functionCoordinate">,
                rows,
                resolution.dependencies.map((d) => d.latex)
              ),
            };
    }
    this.verdicts.set(index, verdict);
    return verdict;
  }

  /** TR-15 to TR-17: a pair or function-coordinate segment's item, read from its source text. */
  private chooserVerdict(index: number, kind: "pair" | "functionCoordinate"): SegmentVerdict {
    const source = this.split[index];
    const raw = source.kind === "text" ? "" : source.latex;
    const sourceId = `stem:${index}`;
    if (kind === "pair") {
      if (inIntervalContext(this.split, index)) return { rule: "TR-16", detail: "an interval" };
      const pairs = pairCoordinates(raw);
      return pairs ? { item: pairItem(sourceId, pairs) } : { rule: "TR-15", detail: "coordinates" };
    }
    const parts = functionCoordinateParts(raw);
    if (parts === null) return { rule: "TR-17", detail: "coordinates" };
    return { item: functionCoordinateItem(sourceId, parts, this.evaluateReason(parts)) };
  }

  /**
   * TR-62's reason for the disabled Evaluate option (TR-31 is not shipped), from the question
   * alone: no definition, several, one using a name with no value here, else no value yet.
   */
  evaluateReason({ name, a }: { name: string; a: string }): string {
    const defined = this.definitions.get(name) ?? [];
    if (defined.length === 0) return EVALUATE_REASONS.undefined(name);
    if (defined.length > 1) return EVALUATE_REASONS.ambiguous(name);
    const [row] = this.exportable(name);
    if (row === undefined) return EVALUATE_REASONS.undefined(name);
    const valueless = row.names.find((n) => this.exportable(n).length !== 1);
    return valueless === undefined
      ? EVALUATE_REASONS.noValue(name, a)
      : EVALUATE_REASONS.usesName(name, valueless);
  }

  private isExportable(index: number): boolean {
    return !this.cycleSet.has(index) && "item" in this.resolve(index);
  }

  /** The rows of the exportable definitions of `name`. */
  private exportable(name: string): SegmentRow[] {
    return (this.definitions.get(name) ?? []).flatMap((c) => {
      const row = this.candidates.get(c);
      return row && this.isExportable(c) ? [row] : [];
    });
  }

  /** Steps 3 to 6 for the rows of one item: calls, dependencies, item checks and gates. */
  resolveRows(rows: readonly SegmentRow[]): Resolution {
    const ownRows = rows.filter((r) => r.defines !== null);
    const own = new Set(ownRows.map((r) => r.defines?.name));
    for (const row of rows)
      for (const call of row.calls)
        if (!own.has(call) && this.exportable(call).length !== 1)
          return { rule: "TR-20", detail: `${call} needs one exportable definition` };

    const dependencies: SegmentRow[] = [];
    const visited = new Set<string>();
    const visit = (name: string) => {
      if (own.has(name) || visited.has(name)) return;
      const found = this.exportable(name);
      if (found.length !== 1) return;
      visited.add(name);
      for (const n of [...found[0].names, ...found[0].calls]) visit(n);
      dependencies.push(found[0]);
    };
    for (const row of rows) for (const n of [...row.names, ...row.calls]) visit(n);

    if (own.size < ownRows.length) return { rule: "TR-21", detail: "duplicate-definition" };
    const definitionOf = new Map<string, SegmentRow>();
    for (const row of [...ownRows, ...dependencies])
      if (row.defines) definitionOf.set(row.defines.name, row);
    if (hasCycle(definitionOf)) return { rule: "TR-21", detail: "cycle" };

    if (
      TRANSFER_PHASE < 2 &&
      rows.some((r) => r.defines === null) &&
      dependencies.some((d) => d.names.includes("r"))
    )
      return { rule: "TR-77", detail: "r through a dependency waits for RC-18" };
    if (!definitionOf.has("t"))
      for (const row of rows) {
        const pending = [...row.pointNames];
        const seen = new Set<string>();
        for (let n = pending.pop(); n !== undefined; n = pending.pop()) {
          if (n === "t") return { rule: "TR-77", detail: "a point uses an undefined t" };
          if (seen.has(n)) continue;
          seen.add(n);
          pending.push(...(definitionOf.get(n)?.names ?? []));
        }
      }
    return { dependencies };
  }
}

/** Decision 7's item-level cycle: definitions reaching each other through names and calls. */
function hasCycle(definitionOf: ReadonlyMap<string, SegmentRow>): boolean {
  const state = new Map<string, "open" | "done">();
  const visit = (name: string): boolean => {
    const row = definitionOf.get(name);
    if (!row || state.get(name) === "done") return false;
    if (state.get(name) === "open") return true;
    state.set(name, "open");
    if ([...row.names, ...row.calls].some(visit)) return true;
    state.set(name, "done");
    return false;
  };
  return [...definitionOf.keys()].some(visit);
}

const contextMemo = memoized<string, StemContext>();
const contextFor = (stem: StemInput | null) =>
  contextMemo(stem ? stemKey(stem) : "\u0000none", () => new StemContext(stem));

const explainMemo = memoized<string, ReadonlyMap<number, SegmentVerdict>>();

/** A verdict for every non-text segment of the stem, keyed by its whole-text segment index. */
export function explainStem(stem: StemInput): ReadonlyMap<number, SegmentVerdict> {
  return explainMemo(stemKey(stem), () => {
    const context = contextFor(stem);
    return new Map(context.segments.map(({ index }) => [index, context.resolve(index)]));
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

/** TR-40's plain-math character list, plus whitespace, for a choice without delimiters. */
export const PLAIN_CHOICE = /^[0-9A-Za-z+\-−×·÷/^=<>≤≥().,\sπ√²³]+$/;
const CHOICE_PROSE = /^(?:[\s,;]|\band\b)*$/i;

/** TR-40: the verdict for a whole answer choice, resolved against the stem's definitions only. */
export function explainChoice(choice: ChoiceInput, stem: StemInput | null): SegmentVerdict {
  const segments = splitMathText(choice.text, false, true, true);
  const math = segments.flatMap((s) => (s.kind === "text" ? [] : [s.latex]));
  if (math.length === 0) {
    const plain = choice.text.trim();
    if (plain === "" || !PLAIN_CHOICE.test(plain))
      return { rule: "TR-40", detail: "not plain math" };
    math.push(plain);
  } else if (segments.some((s) => s.kind === "text" && !CHOICE_PROSE.test(s.value)))
    return { rule: "TR-40", detail: "prose outside math" };

  const context = contextFor(stem);
  const latex = math.map((m) => normalizeQuestionMath(m, "math"));
  const names = new Set([
    ...context.functionNames,
    ...latex.flatMap(functionHeads),
    ...proseFunctionNames(segments),
  ]);
  const rows: SegmentRow[] = [];
  const kinds: SegmentKind[] = [];
  for (const l of latex) {
    const result = classifySegment(l, "choice", names);
    if (!result.ok) return { rule: result.rule, detail: result.detail };
    rows.push(...result.rows);
    kinds.push(result.kind);
  }
  const sourceId = `choice:${choice.letter}`;
  const description = describeChoice(choice.letter);
  // TR-40: several pairs make a coordinate-pair item; a function coordinate stands alone.
  if (kinds.every((k) => k === "pair")) {
    const pairs = math.map(pairCoordinates);
    if (pairs.some((p) => p === null)) return { rule: "TR-15", detail: "coordinates" };
    return {
      item: pairItem(
        sourceId,
        pairs.flatMap((p) => p ?? []),
        description
      ),
    };
  }
  if (kinds.includes("functionCoordinate")) {
    const parts = kinds.length === 1 ? functionCoordinateParts(math[0]) : null;
    if (parts === null) return { rule: "TR-17", detail: "a function coordinate among other math" };
    const reason = context.evaluateReason(parts);
    return { item: functionCoordinateItem(sourceId, parts, reason, description) };
  }
  const resolution = context.resolveRows(rows);
  if ("rule" in resolution) return resolution;
  return {
    item: {
      sourceId,
      kind: "choice",
      ruleId: ACCEPTING_RULE.choice,
      description,
      payload: {
        version: 1,
        sourceId,
        description,
        format: "rows",
        dependencies: resolution.dependencies.map((d) => d.latex),
        rows: rows.map((r) => r.latex),
      },
    },
  };
}

const choiceMemo = memoized<string, TransferItem | null>();

/** TR-40: the item for a whole answer choice, or null when it gets no control. */
export function classifyChoice(choice: ChoiceInput, stem: StemInput | null): TransferItem | null {
  const key = `${choice.letter}\u0000${choice.text}\u0000${stem ? stemKey(stem) : ""}`;
  return choiceMemo(key, () => {
    const verdict = explainChoice(choice, stem);
    return "item" in verdict ? verdict.item : null;
  });
}

/** TR-50: sourceId to "Transfer to Calculator: {description}", repeats numbered in order. */
export function accessibleNames(items: readonly TransferItem[]): Map<string, string> {
  const counts = new Map<string, number>();
  const names = new Map<string, string>();
  for (const item of items) {
    const k = (counts.get(item.description) ?? 0) + 1;
    counts.set(item.description, k);
    const suffix = k > 1 ? `, occurrence ${k}` : "";
    names.set(item.sourceId, `Transfer to Calculator: ${item.description}${suffix}`);
  }
  return names;
}
