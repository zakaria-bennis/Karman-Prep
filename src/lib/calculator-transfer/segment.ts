// Segment grammar, types, Phase 1 gates and segment-level narrowing (TR-10 to TR-15, TR-17, TR-18,
// TR-21, TR-77). A recursive-descent recogniser over lex.ts tokens decides whether one normalised math
// segment is an expression, equation, inequality, function or system, and records the names each
// row defines, uses and calls. Eager and framework-free; it never imports the calculator parser (AR-3,
// TR-74), so the limits below repeat 02's values.

import { lexQuestionMath, type QToken, type QTokenKind } from "./lex";

/** TR-77: the transfer phase in force; later phases raise it. */
export const TRANSFER_PHASE: number = 1;

/**
 * Decision 7: `characters` is 02's MAX_ROW_CHARACTERS and `depth` its MAX_NESTING_DEPTH, repeated
 * (AR-3); `tokens` is a plan value, the safe proxy for 02's MAX_TREE_NODES (2,000): a segment of
 * t tokens parses to at most 2t − 1 nodes.
 */
export const SEGMENT_LIMITS = { characters: 2048, tokens: 600, depth: 64 } as const;

export interface RowDefinition {
  name: string;
  type: "value" | "function";
  param: string | null;
}

export interface SegmentRow {
  /** Normalised LaTeX of the row (a system line with `&` removed, trimmed). */
  latex: string;
  kind: "expression" | "equation" | "inequality" | "function";
  defines: RowDefinition | null;
  /** Names used as values, first appearance, without the defined name and the parameter. */
  names: string[];
  /** Question-function names called, first appearance, without the definition head. */
  calls: string[];
  /** Names used inside point coordinates, first appearance, without the parameter. */
  pointNames: string[];
}

export type SegmentKind =
  | "expression"
  | "equation"
  | "inequality"
  | "function"
  | "system"
  | "pair" // TR-15: one row of one or more coordinate pairs; pairs.ts reads the coordinates
  | "functionCoordinate"; // TR-17: `name(a)=b`, its call not a dependency (TR-20)

export type SegmentResult =
  | { ok: true; kind: SegmentKind; rows: SegmentRow[] }
  | { ok: false; rule: string; detail: string };

type Node =
  | { t: "num"; text: string }
  | { t: "name"; text: string }
  | { t: "pi" }
  | { t: "bin"; op: string; a: Node; b: Node }
  | { t: "sign"; op: string; a: Node }
  | { t: "pow"; base: Node; exp: Node }
  | { t: "group"; inner: Node }
  | { t: "point"; items: Node[] }
  | { t: "abs"; inner: Node }
  | { t: "frac"; num: Node; den: Node }
  | { t: "sqrt"; index: Node | null; arg: Node }
  | { t: "call"; name: string; arg: Node }
  | { t: "fn"; name: string; exp: Node | null; base: Node | null; args: Node[] };

class Reject extends Error {
  constructor(
    readonly rule: string,
    readonly detail: string
  ) {
    super(detail);
  }
}
const reject = (rule: string, detail: string): never => {
  throw new Reject(rule, detail);
};

const ATOM_START = new Set<QTokenKind>(["num", "name", "pi", "absOpen", "frac", "sqrt", "fn"]);

/** Decision 6's grammar stage for one row: relation chains of sums, or a list of points. */
class Parser {
  private i = 0;
  private depth = 0;

  constructor(
    private readonly tokens: QToken[],
    private readonly callNames: ReadonlySet<string>
  ) {}

  /** Top level: relation-chain items separated by `,` or `;`, which only points may use. */
  parseRow(): Node[][] {
    const items = [this.chain()];
    while (this.at("comma") || this.at("semi")) {
      this.i++;
      items.push(this.chain());
    }
    if (this.i < this.tokens.length) reject("TR-8", `unexpected ${this.peek()?.text}`);
    if (items.length > 1 && !items.every((c) => c.length === 1 && c[0].t === "point"))
      reject("TR-8", "top-level comma outside a pair list");
    return items;
  }

  private peek(offset = 0): QToken | undefined {
    return this.tokens[this.i + offset];
  }
  private at(kind: QTokenKind, text?: string): boolean {
    const t = this.peek();
    return t !== undefined && t.kind === kind && (text === undefined || t.text === text);
  }
  private expect(kind: QTokenKind, text: string) {
    if (!this.at(kind, text)) reject("TR-8", `expected ${text}`);
    this.i++;
  }
  /** 02's G13 nesting count (decision 7). */
  private nested<T>(read: () => T): T {
    if (++this.depth > SEGMENT_LIMITS.depth) reject("TR-21", "too-deep");
    const value = read();
    this.depth--;
    return value;
  }
  private braced(open: string, close: string): Node {
    return this.nested(() => {
      this.expect("open", open);
      const inner = this.sum();
      this.expect("close", close);
      return inner;
    });
  }

  /** The sums of one relation chain; the relations are kept as `rel` tokens by the caller. */
  private chain(): Node[] {
    const sums = [this.sum()];
    while (this.at("rel")) {
      this.i++;
      sums.push(this.sum());
    }
    return sums;
  }

  private sum(): Node {
    let left = this.term();
    while (this.at("op", "+") || this.at("op", "-")) {
      const op = this.tokens[this.i++].text;
      left = { t: "bin", op, a: left, b: this.term() };
    }
    return left;
  }

  private term(): Node {
    let left = this.factor();
    for (;;) {
      if (this.at("op", "*") || this.at("op", "/")) {
        const op = this.tokens[this.i++].text;
        left = { t: "bin", op, a: left, b: this.factor() };
      } else if (this.startsAtom()) {
        left = { t: "bin", op: "juxt", a: left, b: this.postfix() };
      } else return left;
    }
  }

  private startsAtom(): boolean {
    const t = this.peek();
    return t !== undefined && (ATOM_START.has(t.kind) || (t.kind === "open" && t.text === "("));
  }

  private factor(): Node {
    if (this.at("op", "+") || this.at("op", "-")) {
      const op = this.tokens[this.i++].text;
      return { t: "sign", op, a: this.postfix() };
    }
    return this.postfix();
  }

  private postfix(): Node {
    const base = this.atom();
    if (!this.at("op", "^")) return base;
    this.i++;
    return { t: "pow", base, exp: this.script() };
  }

  /** An exponent or log base: `{sum}`, one digit, one Latin letter or `\pi`. */
  private script(): Node {
    if (this.at("open", "{")) return this.braced("{", "}");
    return this.nested(() => {
      const t = this.peek();
      if (t?.kind === "num" && /^\d$/.test(t.text)) return (this.i++, { t: "num", text: t.text });
      if (t?.kind === "name" && /^[A-Za-z]$/.test(t.text))
        return (this.i++, { t: "name", text: t.text });
      if (t?.kind === "pi") return (this.i++, { t: "pi" });
      return reject("TR-8", "exponent");
    });
  }

  private atom(): Node {
    const t = this.peek();
    if (!t) return reject("TR-8", "missing operand");
    switch (t.kind) {
      case "num":
        this.i++;
        return { t: "num", text: t.text };
      case "pi":
        this.i++;
        return { t: "pi" };
      case "name":
        this.i++;
        if (this.callNames.has(t.text) && this.at("open", "(")) return this.call(t.text);
        return { t: "name", text: t.text };
      case "open":
        if (t.text === "(") return this.parenthesised();
        break;
      case "absOpen":
        return this.nested(() => {
          this.i++;
          const inner = this.sum();
          if (!this.at("absClose")) reject("TR-8", "unclosed bar");
          this.i++;
          return { t: "abs", inner };
        });
      case "frac": {
        this.i++;
        const num = this.braced("{", "}");
        return { t: "frac", num, den: this.braced("{", "}") };
      }
      case "sqrt": {
        this.i++;
        const index = this.at("open", "[") ? this.braced("[", "]") : null;
        return { t: "sqrt", index, arg: this.braced("{", "}") };
      }
      case "fn":
        return this.fn(t.text);
    }
    return reject("TR-8", `unexpected ${t.text}`);
  }

  private parenthesised(): Node {
    return this.nested(() => {
      this.i++;
      const items = [this.sum()];
      while (this.at("comma")) {
        this.i++;
        items.push(this.sum());
      }
      this.expect("close", ")");
      if (items.length === 1) return { t: "group", inner: items[0] };
      if (items.length === 2) return { t: "point", items };
      return reject("TR-8", "tuple");
    });
  }

  private argumentList(): Node[] {
    return this.nested(() => {
      this.expect("open", "(");
      const args = [this.sum()];
      while (this.at("comma")) {
        this.i++;
        args.push(this.sum());
      }
      this.expect("close", ")");
      return args;
    });
  }

  /** TR-18: a question function name before `(` is a call, with exactly one argument (TR-13). */
  private call(name: string): Node {
    const args = this.argumentList();
    if (args.length !== 1) reject("TR-13", `${name} takes one argument`);
    return { t: "call", name, arg: args[0] };
  }

  /** A table 4.2 function: optional `^` exponent, `_` base for log, then `(…)` or a PR-24 run. */
  private fn(name: string): Node {
    this.i++;
    let exp: Node | null = null;
    let base: Node | null = null;
    for (;;) {
      if (exp === null && this.at("op", "^")) {
        this.i++;
        exp = this.script();
      } else if (base === null && name === "log" && this.at("op", "_")) {
        this.i++;
        base = this.script();
      } else break;
    }
    if (this.at("open", "(")) {
      const args = this.argumentList();
      if (args.length > (name === "arctan" ? 2 : 1)) reject("TR-8", `${name} arguments`);
      return { t: "fn", name, exp, base, args };
    }
    if (!this.startsAtom()) return reject("TR-8", `${name} without an argument`);
    let run = this.postfix();
    while (this.startsAtom()) run = { t: "bin", op: "juxt", a: run, b: this.postfix() };
    return { t: "fn", name, exp, base, args: [run] };
  }
}

interface Collected {
  names: string[];
  calls: string[];
  pointNames: string[];
  points: Node[][];
}

const collected = (): Collected => ({ names: [], calls: [], pointNames: [], points: [] });
const addOnce = (list: string[], value: string) => {
  if (!list.includes(value)) list.push(value);
};

/** Names, calls and point names in source order. */
function collect(node: Node, out: Collected, inPoint = false): void {
  if (node.t === "name") {
    addOnce(out.names, node.text);
    if (inPoint) addOnce(out.pointNames, node.text);
  } else if (node.t === "call") addOnce(out.calls, node.name);
  else if (node.t === "point") out.points.push(node.items);
  for (const child of children(node)) collect(child, out, inPoint || node.t === "point");
}

/** The direct child nodes of `node`, in source order. */
function children(node: Node): Node[] {
  switch (node.t) {
    case "bin":
      return [node.a, node.b];
    case "sign":
      return [node.a];
    case "pow":
      return [node.base, node.exp];
    case "group":
    case "abs":
      return [node.inner];
    case "point":
      return node.items;
    case "frac":
      return [node.num, node.den];
    case "sqrt":
      return node.index ? [node.index, node.arg] : [node.arg];
    case "call":
      return [node.arg];
    case "fn":
      return [node.exp, node.base, ...node.args].filter((n): n is Node => n !== null);
    default:
      return [];
  }
}

/** Numeric constants of a function coordinate: numbers, signs, frac, sqrt, π, groups, ×, ÷, integer powers. */
function isNumericConstant(node: Node): boolean {
  switch (node.t) {
    case "num":
    case "pi":
      return true;
    case "sign":
      return isNumericConstant(node.a);
    case "group":
      return isNumericConstant(node.inner);
    case "bin":
      return (
        node.op !== "+" &&
        node.op !== "-" &&
        node.op !== "juxt" &&
        isNumericConstant(node.a) &&
        isNumericConstant(node.b)
      );
    case "frac":
      return isNumericConstant(node.num) && isNumericConstant(node.den);
    case "sqrt":
      return (node.index === null || isNumericConstant(node.index)) && isNumericConstant(node.arg);
    case "pow":
      return isNumericConstant(node.base) && isInteger(node.exp);
    default:
      return false;
  }
}
const isInteger = (node: Node): boolean =>
  node.t === "num"
    ? !node.text.includes(".")
    : node.t === "sign"
      ? isInteger(node.a)
      : node.t === "group" && isInteger(node.inner);

/** TR-24 and TR-15: normalised LaTeX that is exactly one numeric constant (section 2's term). */
export function isNumericConstantLatex(latex: string): boolean {
  const lexed = lexQuestionMath(latex);
  if (!lexed.ok || lexed.tokens.length === 0 || lexed.tokens.length > SEGMENT_LIMITS.tokens)
    return false;
  try {
    const items = new Parser(lexed.tokens, new Set()).parseRow();
    return items.length === 1 && items[0].length === 1 && isNumericConstant(items[0][0]);
  } catch (error) {
    if (error instanceof Reject) return false;
    throw error;
  }
}

const is = (t: QToken | undefined, kind: QTokenKind, text?: string) =>
  t !== undefined && t.kind === kind && (text === undefined || t.text === text);

/** Decision 6 step 5: TR-10's lone number over a token slice. */
function isLoneNumber(t: QToken[]): boolean {
  const s = is(t[0], "op", "+") || is(t[0], "op", "-") ? t.slice(1) : t;
  const frac = (k: number) =>
    is(s[k], "frac") &&
    is(s[k + 1], "open", "{") &&
    is(s[k + 2], "num") &&
    is(s[k + 3], "close", "}") &&
    is(s[k + 4], "open", "{") &&
    is(s[k + 5], "num") &&
    is(s[k + 6], "close", "}");
  if (s.length === 1) return is(s[0], "num");
  if (s.length === 7) return frac(0);
  return (
    s.length === 11 &&
    is(s[0], "open", "(") &&
    is(s[1], "num") &&
    is(s[2], "op", "+") &&
    frac(3) &&
    is(s[10], "close", ")")
  );
}

/** TR-10's lone forms: a lone number, a name, a name with a numeric power, `name(name)`. */
function isLoneSymbol(t: QToken[]): boolean {
  if (isLoneNumber(t)) return true;
  if (!is(t[0], "name")) return false;
  if (t.length === 1) return true;
  if (is(t[1], "op", "^"))
    return t.length === 3
      ? is(t[2], "num")
      : is(t[2], "open", "{") && is(t.at(-1), "close", "}") && isLoneNumber(t.slice(3, -1));
  return t.length === 4 && is(t[1], "open", "(") && is(t[2], "name") && is(t[3], "close", ")");
}

interface ParsedRow {
  tokens: QToken[];
  sums: Node[];
  pair: boolean;
  row: SegmentRow;
}

/** TR-13 and the core's head pre-scan: a Latin letter, optionally subscripted. */
const FUNCTION_HEAD = /^[A-Za-z](?:_\{[A-Za-z0-9]+\})?$/;

/** Grammar (step 3), head and kind (step 4) for one row's tokens. */
function parseRow(tokens: QToken[], latex: string, functionNames: ReadonlySet<string>): ParsedRow {
  const rels = tokens.filter((t) => t.kind === "rel").map((t) => t.text);
  const oneEquals = rels.length === 1 && rels[0] === "=";
  const functionHead =
    oneEquals &&
    is(tokens[0], "name") &&
    FUNCTION_HEAD.test(tokens[0].text) &&
    is(tokens[1], "open", "(") &&
    is(tokens[2], "name") &&
    /^[A-Za-z]$/.test(tokens[2].text) &&
    is(tokens[3], "close", ")") &&
    is(tokens[4], "rel", "=");
  const valueHead =
    oneEquals &&
    is(tokens[0], "name") &&
    is(tokens[1], "rel", "=") &&
    tokens[0].text !== "x" &&
    tokens[0].text !== "y";
  const callNames = new Set(functionNames);
  if (functionHead) callNames.add(tokens[0].text);
  const items = new Parser(tokens, callNames).parseRow();
  const pair = items.length > 1 || (items[0].length === 1 && items[0][0].t === "point");
  const sums = items.length === 1 ? items[0] : [];

  let kind: SegmentRow["kind"];
  if (rels.length === 0) kind = "expression";
  else if (oneEquals) kind = functionHead ? "function" : "equation";
  else if (rels.every((r) => r === "<" || r === "<=") || rels.every((r) => r === ">" || r === ">="))
    kind = "inequality";
  else return reject("TR-11", "mixed relation chain");

  const defines: RowDefinition | null = functionHead
    ? { name: tokens[0].text, type: "function", param: tokens[2].text }
    : valueHead
      ? { name: tokens[0].text, type: "value", param: null }
      : null;
  const out = collected();
  for (const item of items) for (const node of defines ? item.slice(1) : item) collect(node, out);
  const drop = (list: string[]) => list.filter((n) => n !== defines?.param);
  const row: SegmentRow = {
    latex,
    kind,
    defines,
    names: drop(out.names),
    calls: out.calls,
    pointNames: drop(out.pointNames),
  };
  return { tokens, sums, pair, row };
}

/** Decision 8's segment-level Phase 1 gates (TR-77). */
function gate(p: ParsedRow) {
  const { row, tokens } = p;
  if (TRANSFER_PHASE < 2) {
    const hyperbolic = tokens.find((t) => t.kind === "fn" && /^(sinh|cosh|tanh)$/.test(t.text));
    if (hyperbolic) reject("TR-77", `${hyperbolic.text} waits for FN-68`);
    if (tokens.some((t) => t.kind === "name" && t.text.startsWith("\\theta")))
      reject("TR-77", "θ waits for RC-16");
    const usesR = tokens.some((t) => t.kind === "name" && t.text === "r");
    const exempt =
      row.defines?.type === "function"
        ? row.defines.param === "r" // a TR-21 case
        : row.defines?.type === "value" && row.defines.name !== "r";
    if (usesR && !exempt) reject("TR-77", "r outside a definition waits for RC-18");
  }
}

/** TR-17: `name(a)=b` with a question function name and numeric constants a and b. */
function isFunctionCoordinate(p: ParsedRow, functionNames: ReadonlySet<string>): boolean {
  const [left, right] = p.sums;
  return (
    p.sums.length === 2 &&
    p.row.kind === "equation" &&
    left.t === "call" &&
    functionNames.has(left.name) &&
    isNumericConstant(left.arg) &&
    isNumericConstant(right)
  );
}

/** TR-15: the tokens without capital-letter point labels (`A(2,3)`), or null when there are none. */
function withoutPointLabels(tokens: QToken[]): QToken[] | null {
  const out: QToken[] = [];
  let depth = 0;
  let itemStart = true;
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (depth === 0 && itemStart && t.kind === "name" && /^[A-Z]$/.test(t.text)) {
      if (is(tokens[k + 1], "open", "(")) continue;
    }
    if (t.kind === "open") depth++;
    else if (t.kind === "close") depth--;
    itemStart = depth === 0 && (t.kind === "comma" || t.kind === "semi");
    out.push(t);
  }
  return out.length < tokens.length ? out : null;
}

/** A labelled pair list read without its labels, else null (decision: labels are not transferred). */
function labelledPairs(
  tokens: QToken[],
  latex: string,
  functionNames: ReadonlySet<string>
): ParsedRow | null {
  const unlabelled = withoutPointLabels(tokens);
  if (unlabelled === null) return null;
  try {
    const parsed = parseRow(unlabelled, latex, functionNames);
    return parsed.pair ? parsed : null;
  } catch (error) {
    if (error instanceof Reject) return null;
    throw error;
  }
}

/** Decision 7's segment-level narrowing (TR-21): each mirrors a calculator row error. */
function narrow(p: ParsedRow) {
  const { row, sums } = p;
  const d = row.defines;
  if (row.kind === "expression" && row.names.includes("x") && row.names.includes("y"))
    reject("TR-21", "mixed-variables");
  if (d?.name === "e" || (d?.type === "function" && (d.name === "x" || d.name === "y")))
    reject("TR-21", "reserved-name");
  const left = sums[0];
  if (sums.length === 2 && (left.t === "pi" || (left.t === "name" && left.text === "e")))
    reject("TR-21", "reserved-name");
  if (d?.param && ["r", "e", "i"].includes(d.param)) reject("TR-21", "reserved-name");
  if (d && (row.names.includes(d.name) || row.calls.includes(d.name))) reject("TR-21", "cycle");
  const out = collected();
  for (const sum of sums) collect(sum, out);
  for (const items of out.points) {
    const inner = collected();
    for (const item of items) collect(item, inner);
    if (inner.names.includes("x") || inner.names.includes("y"))
      reject("TR-21", "point-coordinates");
  }
}

/** Decision 6 step 2: the system wrapper, or null for a single row. */
function systemLines(tokens: QToken[]): QToken[][] | null {
  const hasSystemToken = tokens.some(
    (t) => t.kind === "begin" || t.kind === "end" || t.kind === "sysOpen" || t.kind === "sysClose"
  );
  if (!hasSystemToken) return null;
  const wrapped = is(tokens[0], "sysOpen");
  const inner = wrapped ? tokens.slice(1, -1) : tokens;
  const begin = inner[0];
  const end = inner.at(-1);
  if (wrapped && !is(tokens.at(-1), "sysClose")) reject("TR-12", "unclosed system wrapper");
  if (!begin || !end || begin.kind !== "begin" || end.kind !== "end" || end.text !== begin.text)
    reject("TR-12", "system environment not at the top level");
  const body = inner.slice(1, -1);
  if (body.some((t) => ["begin", "end", "sysOpen", "sysClose"].includes(t.kind)))
    reject("TR-12", "nested system");
  const lines: QToken[][] = [[]];
  for (const t of body) {
    if (t.kind === "newline") lines.push([]);
    else lines[lines.length - 1].push(t);
  }
  const nonEmpty = lines.filter((line) => line.length > 0);
  if (nonEmpty.length === 0) reject("TR-12", "empty system");
  return nonEmpty;
}

/** TR-10 to TR-14, TR-18, TR-21, TR-77: classify one normalised math segment. */
export function classifySegment(
  latex: string,
  role: "stem" | "choice",
  functionNames: ReadonlySet<string>
): SegmentResult {
  try {
    return classify(latex, role, functionNames);
  } catch (error) {
    if (error instanceof Reject) return { ok: false, rule: error.rule, detail: error.detail };
    throw error;
  }
}

function classify(
  latex: string,
  role: "stem" | "choice",
  functionNames: ReadonlySet<string>
): SegmentResult {
  if (latex.length > SEGMENT_LIMITS.characters) reject("TR-21", "limits");
  const lexed = lexQuestionMath(latex);
  if (!lexed.ok) return lexed;
  const { tokens } = lexed;
  if (tokens.length > SEGMENT_LIMITS.tokens) reject("TR-21", "limits");
  if (tokens.length === 0) reject("TR-8", "empty segment");

  const lines = systemLines(tokens);
  if (lines) {
    const rows = lines.map((line) => {
      const first = line[0];
      const last = line[line.length - 1];
      const text = latex.slice(first.start, last.end).replace(/&/g, "").trim();
      return parseRow(
        line.filter((t) => t.kind !== "amp"),
        text,
        functionNames
      );
    });
    if (rows.some((r) => r.row.kind === "expression")) reject("TR-12", "expression line");
    for (const r of rows) gate(r);
    for (const r of rows) narrow(r);
    return { ok: true, kind: "system", rows: rows.map((r) => r.row) };
  }

  const parsed =
    labelledPairs(tokens, latex, functionNames) ?? parseRow(tokens, latex, functionNames);
  if (role === "stem" && isLoneSymbol(tokens)) reject("TR-10", "lone symbol");
  gate(parsed);
  // TR-15: a pair list with no names; pairs.ts reads and checks its coordinates.
  if (parsed.pair) {
    if (parsed.row.names.length > 0 || parsed.row.calls.length > 0)
      reject("TR-15", "a pair holds a name");
    return { ok: true, kind: "pair", rows: [parsed.row] };
  }
  narrow(parsed);
  // TR-17, TR-20: the call of a function coordinate is its left side, never a dependency.
  if (isFunctionCoordinate(parsed, functionNames))
    return { ok: true, kind: "functionCoordinate", rows: [{ ...parsed.row, calls: [] }] };
  return { ok: true, kind: parsed.row.kind, rows: [parsed.row] };
}
