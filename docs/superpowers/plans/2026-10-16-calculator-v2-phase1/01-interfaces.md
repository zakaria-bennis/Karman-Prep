# Calculator v2 Phase 1: cross-package interfaces

Every type, constant and signature that more than one work package uses. Package tasks quote these
exactly in their **Interfaces** blocks; a change here changes every consumer and needs the lead's
sign-off in the same PR. Paths are repository-relative. **Owner** is the work package (see
`00-index.md`) that creates the file; nobody else edits it except through the scaffolds and
extension edits listed in `00-index.md` section 5.

The contracts are split into three files so each stays under 700 lines; section numbers run on:

| File                           | Sections                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `01-interfaces.md` (this file) | 0 conventions, 1 parser, deadline and dev counters, 2 corpus and runners, 3 analysis, 4 evaluator and display, 5 plot     |
| `01-interfaces-runtime.md`     | 6 theme, 7 worker protocol and backends, 8 engine, public API and UI hooks, 9 editor foundation, 10 renderer              |
| `01-interfaces-integration.md` | 11 editor UI, 12 shell and quiz host, 13 seam foundations and quiz seam, 14 transfer, 15 paste and standalone, 16 tooling |

## 0. Conventions

- Test titles start with the spec IDs they verify, then a statement:
  `it("PR-17 unary minus binds looser than ^", …)`, `test("AR-20 toolbar opens floating at 1024", …)`.
  Several IDs are written `"AR-10, AR-17 …"`. Corpus cases name their IDs in `rules`.
  `scripts/calculator-v2/check-spec-ids.mjs` reads both (section 16).
- A member or file marked `// added by NN-key` is declared by that later package through the
  extension edit in `00-index.md` section 5.2. Earlier packages neither declare nor call it, so
  each wave type-checks on its own.
- "Undefined" is `{ type: "undefined" }` as a `Value`, `NaN` from real plotting functions, and the
  text `undefined` on screen (NM-6).
- Pixel quantities are CSS px; `dpr` is the device pixel ratio. World coordinates are math units.
- Nothing in `src/lib/calculator-v2/core/`, `plot/` or `worker/` touches `window`, `document` or
  React, and nothing anywhere in v2 calls `eval`, `new Function` or string `setTimeout` (AR-44).
- Files under `core/corpus/` import each other with relative paths only (no `@/`), so Vitest,
  `npx tsx` scripts and Playwright specs load them alike. No file references `vite/client` or
  `import.meta.glob`.

## 1. Parser (owner: 02-parser)

```ts
// src/lib/calculator-v2/core/latex/ast.ts
export interface SourceSpan {
  start: number;
  end: number;
} // UTF-16 offsets into normalizeLatex(input)
export type RelOp = "=" | "<" | ">" | "<=" | ">=";
export type InequalityOp = Exclude<RelOp, "=">;
export type ConstName = "e" | "pi" | "tau";
export type Node =
  | { kind: "num"; value: number; span: SourceSpan }
  | { kind: "id"; name: string; span: SourceSpan } // "x", "A", "a_{1}", "v_{max}", "\\alpha", "e_{3}"
  | { kind: "const"; name: ConstName; span: SourceSpan }
  | { kind: "add" | "sub" | "mul" | "div" | "pow"; left: Node; right: Node; span: SourceSpan }
  | { kind: "neg" | "pct" | "deg" | "fact" | "abs"; arg: Node; span: SourceSpan }
  | { kind: "root"; arg: Node; index: Node | null; span: SourceSpan } // \sqrt, \sqrt[n]
  | { kind: "call"; name: string; args: Node[]; span: SourceSpan } // \log_{b}x is call "log" args [x, b]
  | { kind: "point"; x: Node; y: Node; span: SourceSpan }
  | { kind: "rel"; ops: RelOp[]; operands: Node[]; span: SourceSpan }; // operands.length === ops.length + 1
```

Tree rules fixed here: `\sin^{-1}x` is `call arcsin` (all twelve trig and hyperbolic names, PR-26);
`\sin^{2}x` is `pow(call sin, 2)`; `^{-1}` on another built-in is `pow(call, neg(num 1))`;
`p\%\operatorname{of}q` is `mul(pct p, q)`; `\cdot`, `\times` and juxtaposition all give `mul`;
`\frac` and `/` give `div`; `i` is `id "i"` (the evaluator decides its meaning, PR-15);
`e_{…}` with any subscript is an `id` (OI-27).

S-expressions (`toSExpr`, the corpus `tree` field): `(num V)` with `V = String(value)`; `(id NAME)`;
`(const pi)`; `(neg A)`, `(pct A)`, `(deg A)`, `(fact A)`, `(abs A)`; `(add A B)` and the other
binary heads; `(root A)` or `(root A N)`; `(call NAME A1 A2 …)`; `(point A B)`; `(rel = A B)` for
one relation and `(rel (OP1 OP2 …) A B C …)` for chains, with ops written `= < > <= >=`.
Example: `y=mx+b` is `(rel = (id y) (add (mul (id m) (id x)) (id b)))`.

```ts
// src/lib/calculator-v2/core/latex/tokens.ts
export type SymbolChar =
  | "+"
  | "-"
  | "*"
  | "/"
  | "^"
  | "_"
  | "!"
  | "%"
  | "="
  | "<"
  | ">"
  | "|"
  | ","
  | ":"
  | "."
  | "'"
  | "~";
export type Token =
  | { t: "digits"; text: string; span: SourceSpan } // digits with at most one ".", inner spaces removed (PR-10)
  | { t: "letter"; ch: string; span: SourceSpan } // one Latin letter
  | { t: "command"; name: string; span: SourceSpan } // no backslash: "frac", "sin", "alpha", "lvert", "rvert"
  | { t: "symbol"; ch: SymbolChar; span: SourceSpan }
  | { t: "open"; ch: "(" | "[" | "{"; span: SourceSpan }
  | { t: "close"; ch: ")" | "]" | "}"; span: SourceSpan }
  | { t: "end"; span: SourceSpan };
export function tokenize(normalized: string): Token[] | ParseError;

// src/lib/calculator-v2/core/latex/errors.ts
export type ParseErrorCode =
  | "syntax"
  | "unsupported"
  | "point-arity"
  | "relation-chain"
  | "too-many-nodes"
  | "too-deep";
export interface ParseError {
  code: ParseErrorCode;
  span: SourceSpan;
  detail: string;
} // detail: English, logs and tests only
export function isParseErrorCode(code: string): code is ParseErrorCode;

// src/lib/calculator-v2/core/latex/index.ts
export const MAX_ROWS = 100;
export const MAX_ROW_CHARACTERS = 2048;
export const MAX_TREE_NODES = 2000;
export const MAX_NESTING_DEPTH = 64;
export const MAX_FUNCTION_PARAMS = 8;
export interface ParseOptions {
  userFunctions?: ReadonlySet<string>;
} // names some row defines as functions (PR-23)
export type ParseResult =
  | { ok: true; tree: Node; normalized: string }
  | { ok: false; error: ParseError; normalized: string };
export function normalizeLatex(input: string): string; // PR-3, PR-4; "\\left|" -> "\\lvert ", "\\right|" -> "\\rvert "
export function parseLatex(input: string, options?: ParseOptions): ParseResult; // never throws (PR-38)
export function functionDefinitionHead(input: string): { name: string; params: string[] } | null; // RC-4 pre-scan
export function printLatex(tree: Node): string; // PR-37 canonical MathQuill LaTeX
export function toSExpr(tree: Node): string;
export function treesEqual(a: Node, b: Node): boolean; // ignores spans
export function countNodes(tree: Node): number;
```

```ts
// src/lib/calculator-v2/core/latex/operator-names.ts
export type MathFieldAction = { op: "write" | "cmd" | "keystroke" | "typedText"; arg: string };
export interface OperatorName {
  name: string; // "sin", "arcsin", "log", "mean", "with", "of", …
  category: number | null; // 1–15 in K-4 order; null for with/for/and/or/of
  phase: 1 | 2 | 3 | 4; // when its FN- rule ships (K-4 schedule)
  arity: readonly number[] | "variadic";
}
export interface PanelEntry {
  name: string;
  label: string;
  spoken: string;
  actions: readonly MathFieldAction[];
}
export interface PanelCategory {
  id: number; // 1–15
  heading: string; // CATEGORY_HEADINGS[id - 1]
  entries: readonly PanelEntry[];
}
export const CATEGORY_HEADINGS: readonly string[]; // 15 headings in K-4 order, "Trig" … "Advanced"
export const OPERATOR_NAMES: readonly OperatorName[]; // every K-4 function name plus with, for, and, or, of
export const MEMBER_NAMES: readonly string[]; // null p pleft pright score dof stderr conf lower upper estimate
export const AUTO_COMMANDS: readonly string[]; // sqrt cbrt nthroot pi theta tau phi infinity infty sum prod int
export const SHIPPED_PHASE: 1;
export function isBuiltinName(name: string): boolean;
export function isShippedBuiltin(name: string): boolean; // phase <= SHIPPED_PHASE
export function mathQuillAutoOperatorNames(): string; // space-separated, members excluded (T-3)
export function mathQuillAutoCommands(): string;
export function panelCategories(): readonly PanelCategory[]; // Phase 1: ids 1, 2 and 8 in that order; 8 holds exp, ln, log, log_a only (K-4)
```

Phase 1 shipped built-ins: sin cos tan csc sec cot, arcsin arccos arctan arccsc arcsec arccot
(arctan also with two arguments), exp, ln, log. Panel actions follow K-5: a function entry is
`[{ op: "write", arg: "\\sin\\left(\\right)" }, { op: "keystroke", arg: "Left" }]`; logₐ is
`[{ op: "cmd", arg: "\\log" }, { op: "cmd", arg: "_" }]`.

### 1.1 Deadline and development counters (owner: 02-parser)

```ts
// src/lib/calculator-v2/core/deadline.ts
export class DeadlineExceeded extends Error {
  readonly rowId: string | null;
  constructor(rowId: string | null);
}
export interface Deadline {
  check(): void;
} // throws DeadlineExceeded once expired
export function createDeadline(ms: number, now: () => number, rowId: string | null): Deadline;
export const NO_DEADLINE: Deadline;
export const ROW_VALUE_DEADLINE_MS = 250; // AR-48
export const REGRESSION_DEADLINE_MS = 1000;
export const POI_DEADLINE_MS = 500;

// src/lib/calculator-v2/dev-counters.ts (AR-61, AR-41)
export type DevCounter = "calculators" | "workers" | "reflows";
declare global {
  var __karmanCalculatorCounters: Record<DevCounter, number> | undefined;
}
export function bumpDevCounter(name: DevCounter, delta: 1 | -1): void;
// no-op when process.env.NODE_ENV === "production" (Turbopack, Vite's define and esbuild's define
// all replace it, so production bundles keep no counter code)
```

Callers: 07 bumps `workers` when a `Worker` is constructed and terminated; 10 bumps `calculators`
in the `KarmanCalculator` constructor and `destroy()`; 05 bumps `reflows` (+1) in
`MathField.reflow()`.

## 2. Golden corpus (owner: 02-parser; case files owned per section 2.1)

```ts
// src/lib/calculator-v2/core/corpus/types.ts
export type RowKind =
  | "empty"
  | "value"
  | "definition"
  | "dependent-definition"
  | "function-definition"
  | "curve-y"
  | "curve-x"
  | "implicit"
  | "vertical-lines"
  | "horizontal-lines"
  | "region"
  | "constant-relation"
  | "unsolved-relation"
  | "point"
  | "error";
export type RowErrorCode =
  | ParseErrorCode
  | "too-many-params"
  | "duplicate-definition"
  | "dependency"
  | "cycle"
  | "reserved-name"
  | "arity"
  | "point-coordinates"
  | "mixed-variables"
  | "polar-variable"
  | "timeout";
export interface CorpusSettings {
  angleMode?: "radians" | "degrees";
  complex?: boolean;
}
export type CorpusInput =
  | { latex: string } // typed, API and plain paste dialect
  | { keys: string[] } // MathField keystrokes, e.g. ["y","=","x","^","2","Right","+","3","/","4"]
  | { question: string; context?: "math" | "cell" | "coordinate" } // question dialect (TR-7)
  | { pastedQuestionMath: string }; // OI-6: rendered question math pasted (13-paste-standalone)
export interface CorpusCase {
  id: string; // "<case-file>-<n>", unique across the corpus
  rules: string[]; // spec IDs this case checks
  input: CorpusInput;
  rows?: string[]; // context rows, in order, before the case row
  settings?: CorpusSettings;
  tree?: string; // toSExpr
  latex?: string; // printLatex output, MathField latex() for keys, or the toPasteLatex output
  // written to MathQuill for pastedQuestionMath cases (13)
  kind?: RowKind;
  chips?: string[]; // RC-10 names in order
  display?: string; // formatValue text
  error?: RowErrorCode;
}
export type InputKind = "latex" | "keys" | "question" | "pastedQuestionMath";
export type ExpectedField = "tree" | "latex" | "kind" | "chips" | "display" | "error";
export const EXPECTED_FIELDS: readonly ExpectedField[]; // in the order above
export function inputKind(input: CorpusInput): InputKind;
export function expectedFields(c: CorpusCase): ExpectedField[]; // fields present on c, EXPECTED_FIELDS order

// src/lib/calculator-v2/core/corpus/cases/index.ts — static registry; imports every file of 2.1
export const CORPUS_FILES: Readonly<Record<string, readonly CorpusCase[]>>; // "parse-literals" → cases

// src/lib/calculator-v2/core/corpus/index.ts
export const CORPUS: readonly CorpusCase[]; // Object.values(CORPUS_FILES).flat(), file order of 2.1
export function casesFor(rule: string): CorpusCase[];
```

### 2.1 Case files

Each file under `core/corpus/cases/` default-exports `CorpusCase[]` and stays under 700 lines.
02-parser creates every file; the stubs it creates for other owners are scaffolds
(`00-index.md` section 5.1).

| File                                                                                                               | Owner                | Content                                                                     |
| ------------------------------------------------------------------------------------------------------------------ | -------------------- | --------------------------------------------------------------------------- |
| `parse-literals.ts`, `parse-operators.ts`, `parse-calls.ts`, `parse-relations.ts`, `parse-errors.ts`, `printer.ts` | 02-parser            | PR- trees, parse errors, printer round trips                                |
| `sat-forms.ts`                                                                                                     | 02-parser            | PR-42 forms, tree only                                                      |
| `classify-rows.ts`, `classify-definitions.ts`, `classify-relations.ts`                                             | 04-semantics         | RC- kinds and chips, including the PR-42 SAT forms with their kinds         |
| `display-numbers.ts`, `display-complex.ts`, `domain-real.ts`, `domain-functions.ts`                                | 04-semantics         | NM- and FN- display values and domain errors                                |
| `keys.ts`                                                                                                          | 05-editor-foundation | PR-36 keystroke cases (`latex`, optionally `tree`), including OI-27's `2e3` |
| `graph.ts`                                                                                                         | 07-engine-worker     | Row inputs for the G- golden cases; no expected fields                      |
| `question-dialect.ts`                                                                                              | 12-transfer-core     | PR-1, PR-5, PR-6, PR-44 question-dialect cases                              |
| `paste.ts`                                                                                                         | 13-paste-standalone  | T-12 and OI-6 cases                                                         |

### 2.2 Runners

Every expected field of every case is compared by exactly one runner. `runnerFor` is the routing
rule; each runner selects its cases with `CORPUS.filter((c) => runnerFor(c, f)?.file === FILE)`
for each field `f` it compares. `coverage.test.ts` (15, PR-41) asserts that every
`(case, expected field)` pair has a runner, that each runner file exists and contains `runnerFor(`
and an access to each field it claims, and that every PR-, RC- and NM- ID of appendix A has a case.
`check-spec-ids.mjs` counts a case's `rules` only when the case has at least one expected field.

```ts
// src/lib/calculator-v2/core/corpus/runners.ts
export interface CorpusRunner {
  file: string; // repo-relative path of the test file that compares the fields
  owner: "02" | "04" | "05" | "12" | "13";
  input: InputKind;
  fields: readonly ExpectedField[];
}
export const CORPUS_RUNNERS: readonly CorpusRunner[]; // the five rows below
export function runnerFor(c: CorpusCase, field: ExpectedField): CorpusRunner | null;
export function isParseOnly(c: CorpusCase): boolean;
// latex input, no rows, no settings, no kind/chips/display, and error (if any) is a ParseErrorCode
```

| Runner file                                                   | Owner | Input                | Fields                                                                                             |
| ------------------------------------------------------------- | ----- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `src/lib/calculator-v2/core/corpus/corpus.test.ts`            | 02    | `latex`              | `tree`, `latex`; `error` when `isParseOnly(c)` (compared to `parseLatex`)                          |
| `src/lib/calculator-v2/core/corpus/semantics.corpus.test.ts`  | 04    | `latex`              | `kind`, `chips`, `display`; `error` when not `isParseOnly(c)` (`analyzeRows` then `evaluateLatex`) |
| `tests/calculator/v2/math-field.spec.ts`                      | 05    | `keys`               | `latex`, `tree` (selects `keys` cases from `CORPUS` with `runnerFor`)                              |
| `src/lib/calculator-transfer/question-dialect.corpus.test.ts` | 12    | `question`           | `tree`, `latex`, `kind`, `chips`, `display`, `error`                                               |
| `src/lib/calculator-transfer/clipboard.test.ts`               | 13    | `pastedQuestionMath` | `tree`, `latex`, `kind`, `error`                                                                   |

A `keys` case with `kind`, `chips`, `display` or `error`, or a `pastedQuestionMath` case with
`chips` or `display`, has no runner and fails coverage; such expectations go in a `latex` case
(OI-27's chip for `e_{3}` is a `classify-rows.ts` case on `2e_{3}`). `graph.ts` cases carry no
expected fields; 07's `plot/golden.test.ts` reads their inputs. PR-2's round trip over every
`latex` case runs in 05's `math-field.spec.ts` and compares trees it computes, not case fields.

## 3. Analysis (owner: 04-semantics)

```ts
// src/lib/calculator-v2/core/analysis/index.ts
export interface AnalysisSettings {
  angleMode: "radians" | "degrees";
  complex: boolean;
}
export interface RowSource {
  id: string;
  latex: string;
  hidden: boolean;
}
export interface RowError {
  code: RowErrorCode;
  message: string;
  names: string[];
  span: SourceSpan | null;
}
export interface FunctionDefinition {
  name: string;
  params: string[];
  body: Node;
  rowId: string;
}
export type RowGraph =
  | { kind: "explicit"; independent: "x" | "y"; expr: Node } // curve-y: y=expr(x) on either side; curve-x: x=expr(y)
  | { kind: "implicit"; expr: Node } // sub(lhs, rhs)
  | { kind: "lines"; orientation: "vertical" | "horizontal"; expr: Node } // roots in x (vertical) or y; x^2=4 gives sub(pow(x,2),4)
  | { kind: "region"; operands: Node[]; ops: InequalityOp[] } // the chain as written; 1<y<3 has three operands
  | { kind: "constant-region"; operands: Node[]; ops: InequalityOp[] } // constant-relation inequality; holds or not everywhere
  | { kind: "point" }; // coordinates come from the row's value
export interface RowAnalysis {
  id: string;
  kind: RowKind;
  tree: Node | null;
  error: RowError | null;
  defines: { name: string; type: "value" | "function"; params: string[] } | null;
  uses: string[]; // referenced names, first-appearance order
  chips: string[]; // RC-10 undefined names, first-appearance order; UI adds "all" when length >= 2
  complexHint: boolean; // NM-17, FN-16: real mode and the only undefined name is i
  isGraphable: boolean; // false when error, chips, hidden, or a non-graphing kind
  relation: { ops: RelOp[] } | null; // relations only; strict = "<" | ">"
  graph: RowGraph | null; // non-null exactly when isGraphable
}
export interface AnalysisResult {
  rows: RowAnalysis[];
  byId: ReadonlyMap<string, RowAnalysis>;
  valueOrder: string[]; // defining row ids in dependency order
  functions: ReadonlyMap<string, FunctionDefinition>; // error-free function definitions; also holds each error-free dependent definition as a zero-parameter entry
}
export function analyzeRows(rows: readonly RowSource[], settings: AnalysisSettings): AnalysisResult;
export function rowErrorMessage(code: RowErrorCode, names: string[]): string;
export function userFunctionNames(
  functions: ReadonlyMap<string, FunctionDefinition>
): ReadonlySet<string>; // names whose params.length > 0: the userFunctions for parsing helper latex
export const COMPLEX_HINT = {
  text: "Turn on complex mode to use i.",
  action: "Turn on complex mode",
} as const;
```

`RowGraph` by kind: `curve-y` and `curve-x` give `explicit` (RC-11, either side); `implicit`
gives `implicit`; `vertical-lines` and `horizontal-lines` give `lines` (RC-11 `x=c` and `y=c`
included, RC-12); `region` gives `region` (RC-14); `constant-relation` gives `constant-region` when
every op is an inequality (RC-14 shades the whole view when true) and `null` for an equation;
`point` gives `point`; every other kind gives `null`. A one-parameter function-definition gives
`explicit` `{ independent: "x", expr: (call f (id x)) }` spanning the row; two or more parameters
give `null`.

Row error messages (exact copy; `{n}` is `names[0]`, `{k}` the expected count):

| Code                   | Message                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `syntax`               | "This can't be read. Check for a missing bracket or operator."         |
| `unsupported`          | "This calculator doesn't support that notation."                       |
| `unsupported` + r or θ | "{n} is for polar graphs, which aren't available yet." (RC-2, Phase 1) |
| `point-arity`          | "A point needs exactly two coordinates."                               |
| `relation-chain`       | "A chain of inequalities must point one way and use at most one =."    |
| `too-many-nodes`       | "This row is too long to evaluate. Split it into smaller definitions." |
| `too-deep`             | "This row is nested too deeply."                                       |
| `too-many-params`      | "Functions can have at most 8 parameters."                             |
| `duplicate-definition` | "{n} is defined more than once."                                       |
| `dependency`           | "{n} has more than one definition."                                    |
| `cycle`                | "{n} is defined in terms of itself."                                   |
| `reserved-name`        | "{n} is reserved and can't be redefined."                              |
| `arity`                | "{n} takes {k} argument." / "{n} takes {k} arguments."                 |
| `point-coordinates`    | "A point's coordinates can't use x or y."                              |
| `mixed-variables`      | "Use an equation such as y=… to graph an expression in x and y."       |
| `polar-variable`       | "{n} only has a meaning in a polar equation."                          |
| `timeout`              | "This is taking too long. Try a smaller range or fewer terms." (AR-48) |

## 4. Evaluator and number display (owner: 04-semantics)

```ts
// src/lib/calculator-v2/core/eval/values.ts
export interface Complex {
  re: number;
  im: number;
}
export type Value =
  | { type: "number"; value: number }
  | { type: "complex"; value: Complex }
  | { type: "point"; value: [number, number] }
  | { type: "list"; value: Value[] } // produced from Phase 2
  | { type: "undefined" };
export const UNDEFINED: Value;

// src/lib/calculator-v2/core/eval/compile.ts (Deadline from core/deadline.ts, section 1.1)
export interface EvalSettings {
  angleMode: "radians" | "degrees";
  complex: boolean;
}
export interface CompileScope {
  functions: ReadonlyMap<string, FunctionDefinition>;
  values: ReadonlyMap<string, Value>;
  settings: EvalSettings;
}
export type Compiled = (vars: Readonly<Record<string, Value>>, deadline: Deadline) => Value;
export function compileExpression(tree: Node, scope: CompileScope): Compiled; // closure compiler
// 04 decision 6, Relations as expressions (NM-22): `compileExpression` on a `rel` node gives `n(1)` when every link holds between real operands, else `UNDEFINED`; 07's `constant-region` compiles `{ kind: "rel", ops, operands, span }` with it.
// (`n(1)` is the number value 1, `{ type: "number", value: 1 }`.)
export function compileRealFunction1(
  tree: Node,
  variable: "x" | "y",
  scope: CompileScope
): (t: number) => number; // NaN if undefined, or non-real by NM-21: |Im| > 1e-12·max(1,|Re|); else Re
export function compileRealFunction2(
  tree: Node,
  scope: CompileScope
): (x: number, y: number) => number; // same NM-21 rule
export function evaluateRows(
  analysis: AnalysisResult,
  settings: EvalSettings,
  deadlineFor: (rowId: string) => Deadline
): Map<string, Value>;
// 04 decision 5: `evaluateRows` returns entries only for error-free, chip-free rows of kind `value`, `definition` and `point`. It calls `deadlineFor(id)` once per evaluated row, checks that `Deadline` before evaluating the row and passes it to the row's `Compiled` closure, which calls `deadline.check()` at every user-function call. A row whose check throws `DeadlineExceeded` is omitted, its dependants evaluate to `UNDEFINED`, and callers learn of expiry through their own `deadlineFor`.
export function evaluateLatex(
  latex: string,
  context?: { rows?: string[]; settings?: Partial<EvalSettings> }
): Value; // tests and the 04 corpus runner; never used for UI values (AR-51)

// src/lib/calculator-v2/core/eval/format.ts
export function formatNumber(v: number): string; // NM-1–NM-4, NM-6
export function formatValue(v: Value): string; // NM-5, NM-6, NM-20
export function formatValueLatex(v: Value): string;
export function formatAxisLabel(v: number, step: number): string; // NM-8; the renderer (08) calls it per major tick
```

Display text is fixed: hyphen-minus for signs; scientific form `m×10^n` with `×` U+00D7 and the
exponent written plainly (`1.09951162778×10^12`, `1×10^-20`); points `(a, b)`; complex `a+bi` and
`a-bi`, a zero part omitted, a unit imaginary part written `i` or `-i` (`2i`, `-1`, `3-4i`, `1+i`);
non-finite or non-real-in-real-mode `undefined`. `formatValueLatex` writes the same with
`\times10^{n}`; T-10 thin-space grouping is applied by the renderer only, never here.

## 5. Plot (owner: 06-plot; `from-analysis.ts` owner 07-engine-worker)

```ts
// src/lib/calculator-v2/plot/viewport.ts
export interface Viewport {
  left: number;
  right: number;
  bottom: number;
  top: number;
}
export interface PixelSize {
  width: number;
  height: number;
}
export interface ViewSpec {
  viewport: Viewport;
  size: PixelSize;
  dpr: number;
}
export const ZOOM_BUTTON_FACTOR = 2; // G-5: + button zoomViewport(v, 2, centre), − button zoomViewport(v, 1/2, centre)
export const ZOOM_KEY_FACTOR = 1.25; // KB table: + or = zoomViewport(v, 1.25, centre); − zoomViewport(v, 1/1.25, centre)
export const KEY_PAN_FRACTION = 0.1;
export const MIN_SPAN_FACTOR = 1e-9; // G-23: span >= 1e-9 * max(1, |centre|)
export const MAX_SPAN = 1e15;
export const MAX_ABS_BOUND = 1e15;
export function minSpan(centre: number): number; // G-23: MIN_SPAN_FACTOR * max(1, |centre|)
export function clampViewport(v: Viewport): Viewport; // G-23 limits per axis
export function defaultViewport(size: PixelSize): Viewport; // x -10..10, y centred on 0, equal units
export function isDefaultViewport(v: Viewport, size: PixelSize): boolean; // relative tolerance 1e-9
export function zoomViewport(
  v: Viewport,
  factor: number,
  anchor: { x: number; y: number }
): Viewport; // factor > 1 zooms in (each span divided by factor); clamped by G-23
export function panViewport(v: Viewport, dx: number, dy: number): Viewport; // world units, clamped
export function resizeViewport(v: Viewport, from: PixelSize, to: PixelSize): Viewport; // keeps centre and units per px
export function worldToPx(view: ViewSpec, x: number, y: number): [number, number];
export function pxToWorld(view: ViewSpec, px: number, py: number): [number, number];

// src/lib/calculator-v2/plot/geometry.ts
interface GeometryBase {
  rowId: string;
  evaluations: number;
}
export interface CurveGeometry extends GeometryBase {
  kind: "curve";
  polylines: Float64Array; // world [x0,y0,x1,y1,…]; a NaN,NaN pair ends a run
  bands: Float64Array; // world [x0,x1,yMin,yMax,…] filled G-12 bands
  dashed: boolean;
}
export interface LineSetGeometry extends GeometryBase {
  kind: "lines";
  orientation: "vertical" | "horizontal";
  positions: Float64Array;
  dashed: boolean;
}
export interface PointGeometry extends GeometryBase {
  kind: "points";
  coords: Float64Array; // world [x0,y0,…]
}
export interface RegionGeometry extends GeometryBase {
  kind: "region";
  spans: Float32Array; // CSS px [yTop,yBottom,x0,x1,…] in the ViewSpec's pixel frame
  boundaries: (CurveGeometry | LineSetGeometry)[];
}
export type Geometry = CurveGeometry | LineSetGeometry | PointGeometry | RegionGeometry;
export function geometryTransferables(g: Geometry): ArrayBuffer[];

// src/lib/calculator-v2/plot/budget.ts
export const EXPLICIT_BUDGET = 20_000; // G-15
export const IMPLICIT_BUDGET = 250_000; // G-15

// src/lib/calculator-v2/plot/index.ts
export type PlotInput =
  | { rowId: string; kind: "explicit"; independent: "x" | "y"; f: (t: number) => number } // y=f(x) or x=f(y)
  | { rowId: string; kind: "implicit"; F: (x: number, y: number) => number } // F = lhs - rhs
  | {
      rowId: string;
      kind: "lines";
      orientation: "vertical" | "horizontal";
      f: (t: number) => number;
    } // roots of f in view
  | { rowId: string; kind: "points"; points: [number, number][] }
  | {
      rowId: string;
      kind: "region";
      terms: ((x: number, y: number) => number)[];
      ops: InequalityOp[];
    } // holds where terms[i] ops[i] terms[i+1] for every i
  | { rowId: string; kind: "constant-region"; holds: boolean };
export { EXPLICIT_BUDGET, IMPLICIT_BUDGET } from "./budget"; // so no plot module imports index.ts
export function plotRow(input: PlotInput, view: ViewSpec, deadline: Deadline): Geometry;

// src/lib/calculator-v2/plot/ticks.ts
export interface AxisTicks {
  step: number;
  major: number[];
  minor: number[];
} // labels: formatAxisLabel(value, step) per major tick (section 4), drawn by 08
export const MIN_MAJOR_TICK_PX = 80; // smallest 1, 2 or 5 x 10^k step at least this many px apart
export function axisTicks(min: number, max: number, lengthPx: number): AxisTicks; // minor: step/5 for 1 and 5, step/4 for 2

// src/lib/calculator-v2/plot/from-analysis.ts (owner 07-engine-worker)
export function plotInputFor(
  row: RowAnalysis,
  scope: CompileScope,
  value: Value | null
): PlotInput | null;
// null when row.graph is null, or for "point" when value is not a point with two finite
// coordinates (G-7: not drawn). explicit → compileRealFunction1(expr, independent);
// implicit → compileRealFunction2(expr); lines → compileRealFunction1(expr, "x" | "y");
// region → compileRealFunction2 per operand; constant-region → evaluates the chain once (holds).
export function buildCompileScope(
  analysis: AnalysisResult,
  values: ReadonlyMap<string, Value>,
  settings: EvalSettings
): CompileScope; // values keyed by row id
```

`plot/from-analysis.test.ts` has one test per graphing `RowKind` using the PR-42 SAT forms
(`y=2x+3`, `y-1=2(x+3)`, `2x+3y=6`, `x=y^{2}`, `x^{2}=4`, `y^{2}=9`, `x^{2}+y^{2}=25`, `1<y<3`,
`y\le2x+1`, `3>2`, `(2,3)`), plus NM-16. `plot/golden.test.ts` runs the `graph.ts` inputs through
`analyzeRows`, `evaluateRows`, `plotInputFor` and `plotRow`.
