# 04 semantics, part 1 of 2: names, definitions, relations, graph descriptors and resolution (Tasks 1 to 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 1 of 2 of package `04-semantics.md`, which holds the package header (IDs, contributions), the Conventions (paths, commands, expected-failure wording, the test helpers `REAL`, `DEG`, `CX`, `P`, `src`, `analyze`, `n`, `codes`, `tree`, `rel`, and the corpus notation) and the Decisions with the contract amendments; they apply to every task here, and "decision N" below refers to that file. Tasks run in number order across both parts; part 2 (`04-semantics-2-eval.md`) starts at Task 5.

---

<!-- prettier-ignore-start -->
### Task 1: Names, reserved names and row error messages (RC-3; error copy for RC-2, RC-7, RC-8, RC-19, RC-20)
**Files:** Create `analysis/index.ts` (section 3 types, `COMPLEX_HINT`, re-export of `rowErrorMessage`), `analysis/names.ts`, `analysis/messages.ts`; Test `analysis/names.test.ts`.\
**Interfaces.** Consumes `Node`, `SourceSpan`, `parseLatex` (`core/latex/`), `isBuiltinName` (`core/latex/operator-names.ts`), `RowErrorCode` (`corpus/types.ts`). Produces every section 3 type except `analyzeRows` and `userFunctionNames`, and:
```ts
// analysis/names.ts
export const COORDINATE_NAMES: readonly string[]; // ["x", "y", "r", "\\theta"]
export interface NameUse { name: string; span: SourceSpan; call: boolean; inPoint: boolean }
export function collectNameUses(tree: Node): NameUse[]; // ids and calls to non-built-in names, stable by span.start
export function isReservedName(name: string, settings: AnalysisSettings): boolean; // RC-3
// analysis/messages.ts
export function displayName(name: string): string;
export function rowErrorMessage(code: RowErrorCode, names: string[]): string;
```
- [ ] **Step 0: Check the contract amendments** (package header, "Contract amendments"). `P=docs/superpowers/plans/2026-10-16-calculator-v2-phase1; for s in "one-parameter function-definition" "zero-parameter entry" "userFunctionNames" "once per evaluated row" "when every link holds"; do grep -qF "$s" $P/01-interfaces.md || echo "01 lacks: $s"; done; grep -qF userFunctionNames $P/07-engine-worker.md || echo "07 lacks: userFunctionNames"`.
  Expected: no output. Any output: stop and ask the lead to land the amendment the line names.
- [ ] **Step 1: Write the failing tests** in `analysis/names.test.ts`:
```ts
it("RC-3 reserved names are coordinates, constants, i in complex mode and built-ins", () => {
  for (const x of ["x", "y", "r", "\\theta", "e", "pi", "tau", "sin", "ln", "arccot"]) expect(isReservedName(x, REAL), x).toBe(true);
  for (const x of ["t", "a", "A", "i", "a_{1}", "\\alpha"]) expect(isReservedName(x, REAL), x).toBe(false);
  expect(isReservedName("i", CX)).toBe(true);
});
it("RC-3 name uses come in source order with call and point flags", () => {
  const flags = (l: string, fns?: Set<string>) => collectNameUses(tree(l, fns)).map((u) => [u.name, u.call, u.inPoint]);
  expect(flags("(t,\\log_{b}x)")).toEqual([["t", false, true], ["b", false, true], ["x", false, true]]);
  expect(flags("f(2)+c", new Set(["f"]))).toEqual([["f", true, false], ["c", false, false]]);
});
it("RC-2, RC-7, RC-8, RC-19, RC-20 row errors and the complex hint use the exact copy of 01-interfaces section 3", () => {
  const table: [RowErrorCode, string[], string][] = [["syntax", [], "This can't be read. Check for a missing bracket or operator."], ["point-arity", [], "A point needs exactly two coordinates."],
    ["unsupported", ["t"], "This calculator doesn't support that notation."], ["unsupported", ["r"], "r is for polar graphs, which aren't available yet."],
    ["unsupported", ["θ"], "θ is for polar graphs, which aren't available yet."], ["relation-chain", [], "A chain of inequalities must point one way and use at most one =."],
    ["too-many-nodes", [], "This row is too long to evaluate. Split it into smaller definitions."], ["too-deep", [], "This row is nested too deeply."],
    ["too-many-params", [], "Functions can have at most 8 parameters."], ["duplicate-definition", ["a"], "a is defined more than once."], ["dependency", ["a"], "a has more than one definition."],
    ["cycle", ["a"], "a is defined in terms of itself."], ["reserved-name", ["e"], "e is reserved and can't be redefined."], ["arity", ["g", "2"], "g takes 2 arguments."],
    ["arity", ["sin", "1"], "sin takes 1 argument."], ["arity", ["arctan", "1 or 2"], "arctan takes 1 or 2 arguments."], ["point-coordinates", [], "A point's coordinates can't use x or y."],
    ["mixed-variables", [], "Use an equation such as y=… to graph an expression in x and y."], ["polar-variable", ["r"], "r only has a meaning in a polar equation."],
    ["timeout", [], "This is taking too long. Try a smaller range or fewer terms."]];
  for (const [code, names, text] of table) expect(rowErrorMessage(code, names)).toBe(text);
  expect(COMPLEX_HINT).toEqual({ text: "Turn on complex mode to use i.", action: "Turn on complex mode" });
  const shown = [["\\theta", "θ"], ["pi", "π"], ["tau", "τ"], ["\\alpha", "α"], ["a_{1}", "a_1"], ["v_{max}", "v_max"], ["A", "A"]];
  for (const [name, text] of shown) expect(displayName(name)).toBe(text);
});
```
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-v2/core/analysis/names.test.ts`. Expected: FAIL, `Error: Cannot find module './names' imported from …/analysis/names.test.ts` (imports in order: `./names`, `./messages`, `./index`, `../latex/index`).
- [ ] **Step 3: Implement.** `isReservedName`: `COORDINATE_NAMES`, `e`, `pi`, `tau`, `i` when `settings.complex`, and `isBuiltinName`. `collectNameUses` walks every node: an `id` is a use; a `call` of a non-built-in name is a use with `call: true`; `inPoint` holds below a `point`. `displayName` maps `\alpha` … `\omega` (no omicron), `pi`, `tau` to letters and `_{…}` to `_…`. `rowErrorMessage` holds the table as data; `unsupported` uses the polar sentence only when `names[0]` is `r` or `θ`; `arity` adds `s` unless `names[1] === "1"`.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/calculator-v2/core/analysis && git commit -m "Add v2 reserved names and row error messages"`.
### Task 2: analyzeRows for definitions, values and chips (RC-1, RC-2, RC-4, RC-6, RC-10, RC-19, NM-17)
**Files:** Create `analysis/definitions.ts`, `analysis/resolve.ts`, `analysis/classify.ts`, `corpus/semantics.corpus.test.ts`; Modify `analysis/index.ts` (adds `analyzeRows`, `userFunctionNames`), `cases/classify-rows.ts`, `cases/classify-definitions.ts`; Test `analysis/analyze.test.ts`.\
**Interfaces.** Consumes Task 1; `normalizeLatex`, `parseLatex`, `functionDefinitionHead`, `MAX_FUNCTION_PARAMS`, `toSExpr` (`core/latex/index.ts`); `CORPUS`, `runnerFor`, `CorpusCase`, `ExpectedField` (`corpus/`). Produces `analyzeRows` and `userFunctionNames` (section 3 as amended) and:
```ts
// analysis/definitions.ts
export interface DefinitionHead { name: string; type: "value" | "function"; params: string[]; body: Node; span: SourceSpan }
export interface ParsedRow { source: RowSource; empty: boolean; tree: Node | null; error: RowError | null; head: DefinitionHead | null }
export function parseRows(rows: readonly RowSource[], settings: AnalysisSettings): ParsedRow[];
// analysis/resolve.ts
export interface Resolution {
  isDefined(name: string): boolean;
  coordinatesOf(tree: Node, locals: readonly string[]): ReadonlySet<string>; // ⊆ COORDINATE_NAMES, through definitions
}
export function resolveDefinitions(rows: readonly ParsedRow[]): Resolution;
// analysis/classify.ts
export function classifyRow(row: ParsedRow, resolution: Resolution, settings: AnalysisSettings): RowAnalysis;
```
- [ ] **Step 1: Write the runner, the cases and the unit tests**
```ts
// corpus/semantics.corpus.test.ts (relative imports only)
const FILE = "src/lib/calculator-v2/core/corpus/semantics.corpus.test.ts", casesFor = (f: ExpectedField) => CORPUS.filter((c) => runnerFor(c, f)?.file === FILE);
const latexOf = (c: CorpusCase) => ("latex" in c.input ? c.input.latex : ""), title = (c: CorpusCase, f: ExpectedField) => `${c.rules.join(", ")} ${c.id} ${f}`;
function analyseCase(c: CorpusCase): RowAnalysis {
  const latex = [...(c.rows ?? []), latexOf(c)], rows = latex.map((l, i) => ({ id: i === latex.length - 1 ? "case" : `row-${i + 1}`, latex: l, hidden: false }));
  const row = analyzeRows(rows, { angleMode: c.settings?.angleMode ?? "radians", complex: c.settings?.complex ?? false }).byId.get("case");
  if (!row) throw new Error(c.id); return row;
}
for (const c of casesFor("kind")) it(title(c, "kind"), () => expect(analyseCase(c).kind).toBe(c.kind));
for (const c of casesFor("chips")) it(title(c, "chips"), () => expect(analyseCase(c).chips).toEqual(c.chips));
for (const c of casesFor("error")) it(title(c, "error"), () => expect(analyseCase(c).error?.code ?? null).toBe(c.error));
```
`cases/classify-rows.ts`:
* the empty string `""` → empty · `y_{1}\sim mx_{1}+b` → error unsupported · `3+4` → value (RC-2)
* `A+a` [rows: `A=3`] → value, chips ["a"] · `A+a` [rows: `A=3`, `a=4`] → value (RC-1)
* `b+a+b` → value, chips ["b", "a"] · `a_{1}+2` → value, chips ["a_{1}"] · `f(2)` → value, chips ["f"] (RC-10)
* `2e_{3}` → value, chips ["e_{3}"] (PR-15, RC-10)
* `2i` → value, chips ["i"] · `i+a` → value, chips ["i", "a"] · `2i` [rows: `i=3`] → value (NM-17)
* {cx} `2i` → value (NM-17)
* `e=2` → error reserved-name · `\pi=3` → error reserved-name · `i=2` → definition · `t+1` → value, chips ["t"] (RC-3, RC-19)
* {cx} `i=2` → error reserved-name (RC-3, RC-19)
* `t=2` → definition · `r=2` → error unsupported · `\theta=1` → error unsupported (RC-2, RC-19)

`cases/classify-definitions.ts`:
* `a=3` → definition · `f(x)=x^{2}` → function-definition (RC-2, RC-4, RC-6)
* `a=2x` → dependent-definition · `A=\pi r^{2}` → dependent-definition · `P=(1,2)` → definition · `b=a+1` [rows: `a=2`] → definition (RC-6)
* `C=2\pi r` → dependent-definition (RC-6, RC-17)
* `C=8h+15` → definition, chips ["h"] (RC-6, RC-10)
* `g(a,b)=a+b` → function-definition · `f(t)=t+1` → function-definition · `f(a)+a` [rows: `a=5`, `f(a)=a+1`] → value (RC-4)
* `f(a,b,c,d,g,h,k,m,n)=a` → error too-many-params · `f(x,x)=x` → error duplicate-definition · `f(2)` [rows: `f(x,x)=x`] → value (RC-4)
* `x(t)=t` → error reserved-name (RC-3, RC-4)
```ts
// analysis/analyze.test.ts
it("RC-4 a function definition reports its name, parameters and body", () => {
  const r = analyze(["g(a,b)=a+b"]), body = r.functions.get("g")?.body;
  expect([r.rows[0].defines, body && toSExpr(body)]).toEqual([{ name: "g", type: "function", params: ["a", "b"] }, "(add (id a) (id b))"]);
});
it("RC-6 a dependent definition joins functions with no parameters and never parses as a call", () => {
  const r = analyze(["a=2x", "b=3", "f(x)=x+1"]), helper = parseLatex("a(x+1)", { userFunctions: userFunctionNames(r.functions) });
  expect([r.functions.get("a")?.params, r.functions.has("b"), userFunctionNames(r.functions)]).toEqual([[], false, new Set(["f"])]);
  expect(r.rows[1].defines).toEqual({ name: "b", type: "value", params: [] });
  expect(helper.ok && toSExpr(helper.tree)).toBe("(mul (id a) (add (id x) (num 1)))");
});
it("RC-10 uses lists every referenced name in first-appearance order", () => expect(analyze(["c=1", "b+a+c+b"]).rows[1].uses).toEqual(["b", "a", "c"]));
it("NM-17 the complex hint shows only when i is the only undefined name in real mode", () => {
  expect(analyze(["2i"]).rows[0]).toMatchObject({ chips: ["i"], complexHint: true });
  expect([analyze(["i+a"]).rows[0].complexHint, analyze(["i=3", "2i"]).rows[1].complexHint]).toEqual([false, false]);
  expect(analyze(["2i"], CX).rows[0]).toMatchObject({ chips: [], complexHint: false });
});
```
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-v2/core/corpus/semantics.corpus.test.ts src/lib/calculator-v2/core/analysis/analyze.test.ts`. Expected: FAIL, every test with `TypeError: analyzeRows is not a function` (`analysis/index.ts` exists from Task 1 without it).
- [ ] **Step 3: Implement** the three modules, `analyzeRows` and `userFunctionNames` (the names in `functions` whose `params.length > 0`):
  1. Pre-scan every row with `functionDefinitionHead`. A head whose name `isReservedName(name, settings)` stays out of `userFunctions` and gives its row `reserved-name` naming `displayName(name)` (RC-4 function names are non-reserved letters; the row still parses, as a product, for `tree`); every other head name joins `userFunctions`. A head with more than `MAX_FUNCTION_PARAMS` parameters gives `too-many-params` without parsing (this relies on 02's `functionDefinitionHead` returning any number of parameters, repeats included, as written). A call to a pre-scanned name whose head row has an error stays a call with no chip, no error and no arity check (decision 4). A name no head defines, such as `f` in `f(2)` with no `f(…)=` row, is not pre-scanned, so the row parses as the product `(mul (id f) (num 2))` and `f` becomes a chip (PR-23, RC-10).
  2. `normalizeLatex(latex).trim() === ""` → `empty`. A parse error → kind `error`, the parse code, `names: []`, its span.
  3. Heads: a `rel` with ops `["="]` whose left side is a `call` of a pre-scanned name → function head (repeated parameter → `duplicate-definition` naming it). Left side `id n`, n not `x`/`y`: `r` or `\theta` → `unsupported` naming it; `isReservedName` → `reserved-name`; else a value head. Left side `const` → `reserved-name` with its `displayName`.
  4. `coordinatesOf` adds the coordinates of each referenced defined name's body (function bodies with their parameters as locals), memoised and guarded against revisits. Value head → `dependent-definition` when its body has coordinates, else `definition`; function head → `function-definition` (definition rows have `relation: null`); a bare expression with no coordinates → `value`. Until Task 3 adds `shapeOf`, every other row without an error (a relation that is not a head, such as `y=2x+3`; a point; an expression in `x` or `y`) gets kind `value`, step 5's chips and `complexHint`, `relation: null`, `graph: null` and `isGraphable: false`; Task 3 replaces this fallback, and Task 3 Step 2's expected `"null"` for `y=2x+3` relies on it. In this task every row has `graph: null`.
  5. Chips: uses that are not locals, coordinates, reserved or defined (every head defines its name, with or without an error), deduplicated in order; `uses`: the same filter without "defined". `complexHint`: `!settings.complex` and chips exactly `["i"]`.
  6. `functions`: error-free function heads plus error-free dependent-definition heads with `params: []`; `valueOrder`: error-free defining rows in list order (Task 4 sorts it); `byId` by row id.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/calculator-v2/core && git commit -m "Analyse v2 definitions, values and slider chips"`.
### Task 3: Relations, expressions, points and graph descriptors (RC-2, RC-5, RC-11 to RC-15, RC-17)
**Files:** Create `analysis/graph.ts`; Modify `analysis/classify.ts`, `cases/classify-relations.ts`, `cases/classify-rows.ts`; Test `analysis/graph.test.ts`.\
**Interfaces.** Consumes Task 2 (`ParsedRow`, `Resolution`, `classifyRow`). Produces:
```ts
// analysis/graph.ts
export interface RowShape {
  kind: RowKind;
  graph: RowGraph | null; // before classifyRow's hidden, chips and error filter
  error: { code: RowErrorCode; names: string[] } | null;
  relation: { ops: RelOp[] } | null;
}
export function shapeOf(tree: Node, coordinatesOf: (node: Node) => ReadonlySet<string>, unboundT: boolean): RowShape;
export function functionGraph(name: string, params: readonly string[], span: SourceSpan): RowGraph | null; // RC-5
```
- [ ] **Step 1: Write the failing tests**
```ts
// analysis/graph.test.ts
function describeGraph(g: RowGraph | null): string {
  if (!g || g.kind === "point") return g ? "point" : "null";
  if (g.kind === "explicit") return `explicit ${g.independent} ${toSExpr(g.expr)}`;
  if (g.kind === "implicit" || g.kind === "lines") return `${g.kind === "lines" ? `lines ${g.orientation}` : "implicit"} ${toSExpr(g.expr)}`;
  return `${g.kind} ${g.ops.join(" ")} ${g.operands.map(toSExpr).join(" ")}`;
}
const X3 = "(add (mul (num 2) (id x)) (num 3))", X2 = "(pow (id x) (num 2))", Y2 = "(pow (id y) (num 2))";
const GRAPHS: Record<string, [string[], string][]> = {
  "RC-5": [[["f(x)=x^{2}"], "explicit x (call f (id x))"], [["P(t)=500(1.03)^{t}"], "explicit x (call P (id x))"], [["h(y)=y+1"], "explicit x (call h (id x))"], [["g(a,b)=a+b"], "null"]],
  "RC-11": [[["y=2x+3"], `explicit x ${X3}`], [["2x+3=y"], `explicit x ${X3}`], [["x=y^{2}"], `explicit y ${Y2}`],
    [["y=5"], "lines horizontal (sub (id y) (num 5))"], [["x=-3"], "lines vertical (sub (id x) (neg (num 3)))"],
    [["a=2x", "y=a"], "explicit x (id a)"], [["y=ax+b"], "null"]],
  "RC-12": [[["x^{2}+y^{2}=25"], `implicit (sub (add ${X2} ${Y2}) (num 25))`], [["x^{2}=4"], `lines vertical (sub ${X2} (num 4))`],
    [["y^{2}=9"], `lines horizontal (sub ${Y2} (num 9))`]],
  "RC-14": [[["1<y<3"], "region < < (num 1) (id y) (num 3)"], [["2<3"], "constant-region < (num 2) (num 3)"], [["2=3"], "null"]],
  "RC-15": [[["(1,2)"], "point"], [["a=3", "(a,2)"], "point"], [["(a,b)"], "null"]],
  "RC-17": [[["x^{2}"], `explicit x ${X2}`], [["y^{2}+1"], `explicit y (add ${Y2} (num 1))`], [["3+4"], "null"]],
};
for (const [id, cases] of Object.entries(GRAPHS))
  it(`${id} rows carry the graph descriptor their kind implies`, () => {
    for (const [rows, want] of cases) expect(describeGraph(analyze(rows).rows[rows.length - 1].graph), rows.join("; ")).toBe(want);
  });
it("RC-14, RC-15 graph is non-null exactly when the row is graphable, and hidden rows never graph", () => {
  for (const c of CORPUS.filter((x) => "latex" in x.input))
    for (const r of analyze([...(c.rows ?? []), (c.input as { latex: string }).latex], { ...REAL, ...c.settings }).rows)
      expect(r.graph !== null, c.id).toBe(r.isGraphable);
  expect(analyzeRows([{ id: "h", latex: "y=x", hidden: true }], REAL).rows[0]).toMatchObject({ kind: "curve-y", isGraphable: false, graph: null });
});
it("RC-17, RC-2, RC-19 r, θ and unbound t errors name the variable", () => {
  const rows: [string, string[], string][] = [["2\\pi r", ["r"], "r is for polar graphs, which aren't available yet."],
    ["\\sin\\theta", ["θ"], "θ is for polar graphs, which aren't available yet."], ["r=2", ["r"], "r is for polar graphs, which aren't available yet."],
    ["\\theta=1", ["θ"], "θ is for polar graphs, which aren't available yet."], ["(t,t^{2})", ["t"], "This calculator doesn't support that notation."]];
  for (const [l, names, message] of rows) expect(analyze([l]).rows[0].error, l).toMatchObject({ code: "unsupported", names, message });
});
```
`cases/classify-relations.ts`:
* `y=2x+3` → curve-y · `x=y^{2}` → curve-x (PR-42, RC-11)
* `2x+3=y` → curve-y · `y=a` [rows: `a=3`] → horizontal-lines (RC-11)
* `y=a` [rows: `a=2x`] → curve-y · `y=a(x+1)` [rows: `a=2x`] → curve-y (RC-6, RC-11)
* `y=x(x+1)` [rows: `x(t)=t`] → curve-y (RC-3, RC-4, RC-11)
* `y=5` → horizontal-lines · `x=-3` → vertical-lines (RC-11, RC-19)
* `2x+3y=12` → implicit · `2x+5=17` → vertical-lines (RC-12)
* `x^{2}+y^{2}=25` → implicit · `x^{2}=4` → vertical-lines · `y^{2}=9` → horizontal-lines · `y-1=2(x+3)` → implicit · `2x+3y=6` → implicit · `(x-2)^{2}+(y+1)^{2}=9` → implicit (PR-42, RC-12)
* `3p+4=19` → unsolved-relation, chips ["p"] · `3p+4<19` → unsolved-relation, chips ["p"] · `3p+4>19` → unsolved-relation, chips ["p"] (RC-13)
* `y>2x+1` → region · `x\le3` → region · `2<3` → constant-relation · `3>2` → constant-relation · `2=3` → constant-relation (RC-14)
* `1<y<3` → region · `y\le2x+1` → region · `-2\le x<5` → region · `y>x` → region · `y<-x+4` → region (PR-42, RC-14)
* `y=ax+b` → curve-y, chips ["a", "b"] (RC-10, RC-11)
* `y>ax` → region, chips ["a"] (RC-10, RC-14)
* `y=2(x-3)^{2}+1` · `y=(x-1)(x+3)` · `y=x^{2}+2x-3` · `y=(1.20)^{x/4}` · `y=\left|x-3\right|` · `y=\sqrt{x-3}+2` · `y=\frac{x^{2}-1}{x-1}` · `y=-x+7`, each → curve-y (PR-42, RC-11)
* `P(t)=500(1.03)^{t}` → function-definition · `f(x)=3x-2` → function-definition · `f(4)` [rows: `f(x)=3x-2`] → value (PR-42, RC-4, RC-5)
* `h(y)=y+1` → function-definition (RC-5)
* `r=2\sin\theta` → error unsupported · `y=A` [rows: `A=\pi r^{2}`] → error unsupported (RC-2)

`cases/classify-rows.ts`, appended:
* `(1,2)` → point · `(a,2)` [rows: `a=3`] → point · `(a,b)` → point, chips ["a", "b"] · `(x,2)` → error point-coordinates · `(1,y)` → error point-coordinates · `(a,1)` [rows: `a=2x`] → error point-coordinates (RC-15)
* `(t,t^{2})` → error unsupported (RC-2)
* `(t,t^{2})` [rows: `t=2`] → point (RC-19)
* `x^{2}` → curve-y · `y^{2}+1` → curve-x · `x+y` → error mixed-variables · `2\pi r` → error unsupported · `\sin\theta` → error unsupported (RC-17)
* `a(x-h)^{2}+k` → curve-y, chips ["a", "h", "k"] (RC-10, RC-17)
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-v2/core/analysis/graph.test.ts src/lib/calculator-v2/core/corpus/semantics.corpus.test.ts`. Expected: FAIL, the RC-11 descriptor test receives `"null"` for `y=2x+3` (Task 2 Step 3's fallback).
- [ ] **Step 3: Implement `shapeOf`** for every non-definition tree, with `C = coordinatesOf(tree)`; it replaces Task 2's fallback:
  1. `r` or `\theta` in `C` → `unsupported` naming it (RC-2). Then a `point`: `unboundT` (a `t` inside the point while no row defines `t`) → `unsupported` naming `t`; `x` or `y` in `C` → `point-coordinates`; else kind `point`, graph `{ kind: "point" }`.
  2. Equation `L=R`: when `L` is `(id y)` with `y ∉ coords(R)`, or `R` is `(id y)` with `y ∉ coords(L)`, the other side `O` gives `curve-y`/`explicit("x", O)` if `x ∈ coords(O)`, else `horizontal-lines`/`lines("horizontal", (sub (id y) O))`. Then the same test for `x` gives `curve-x`/`explicit("y", O)` or `vertical-lines`/`lines("vertical", (sub (id x) O))`. Otherwise `C ⊇ {x, y}` → `implicit` `(sub L R)`; `{x}` → `vertical-lines` `(sub L R)`; `{y}` → `horizontal-lines` `(sub L R)`; no coordinates → `unsolved-relation` with chips, else `constant-relation` with graph `null`.
  3. Inequality chain: coordinates → `region` with operands and ops as written; none → `unsolved-relation` with chips, else `constant-relation` with `constant-region`. `relation` is `{ ops }` on every `rel` row.
  4. Bare expression: none → `value`; `{x}` → `curve-y`/`explicit("x", tree)`; `{y}` → `curve-x`/`explicit("y", tree)`; both → `mixed-variables`. `functionGraph`: one parameter → decision 1, spanning the row; else `null`. `classifyRow` sets `isGraphable` = graph non-null, no error, no chips, not hidden, and nulls `graph` otherwise.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/calculator-v2/core && git commit -m "Classify v2 relations, points and expressions with graph descriptors"`.
### Task 4: Collisions, cycles, order and arity (RC-7, RC-8, RC-9, RC-20)
**Files:** Create `lib/arity.ts`; Modify `analysis/resolve.ts`, `analysis/classify.ts`, `analysis/index.ts`, `cases/classify-definitions.ts`; Test `analysis/resolve.test.ts`.\
**Interfaces.** Consumes Tasks 1 to 3; `OPERATOR_NAMES`, `isShippedBuiltin` (`core/latex/operator-names.ts`). Produces:
```ts
// lib/arity.ts
export const BUILTIN_ARITY: ReadonlyMap<string, readonly number[]>; // derived from OPERATOR_NAMES (PR-12's one list): category !== null, isShippedBuiltin, numeric arity
export function arityText(arity: readonly number[]): string; // [1] → "1", [2] → "2", [1, 2] → "1 or 2"
// analysis/resolve.ts, added to Resolution
duplicates: ReadonlySet<string>; // names with two or more error-free heads
cyclicRows: ReadonlySet<string>; // row ids
valueOrder: string[]; // error-free defining rows, dependencies first, ties in list order
```
- [ ] **Step 1: Write the failing tests**
```ts
// analysis/resolve.test.ts
it("RC-7 every defining row of a duplicated name errors and its users show dependency", () => {
  const d = "duplicate-definition"; expect(codes(["a=1", "a=2", "a+1", "f(x)=x", "f=2", "f(3)"])).toEqual([d, d, "dependency", d, d, "dependency"]);
  expect(analyze(["a=1", "a=2", "a+1"]).rows[2].error?.message).toBe("a has more than one definition.");
});
it("RC-8 every row in a cycle errors, including recursion through functions", () => {
  expect([codes(["a=a+1"]), codes(["a=b", "b=a", "c=a+1"])]).toEqual([["cycle"], ["cycle", "cycle", null]]);
  expect(codes(["f(x)=g(x)", "g(x)=f(x)", "h(x)=h(x-1)"])).toEqual(["cycle", "cycle", "cycle"]);
  expect(analyze(["a=b", "b=a"]).rows[0].error?.message).toBe("a is defined in terms of itself.");
});
it("RC-9 definitions resolve in any row order and hidden rows still define", () => {
  expect(analyze(["y=a", "a=2"]).rows[0]).toMatchObject({ kind: "horizontal-lines", chips: [] });
  expect(analyze(["f(2)", "f(x)=x^{2}"]).rows[0]).toMatchObject({ kind: "value", chips: [] });
  const hidden = analyzeRows([{ id: "h", latex: "a=3", hidden: true }, { id: "u", latex: "a+1", hidden: false }], REAL);
  expect(hidden.byId.get("u")?.chips).toEqual([]);
  expect(analyze(["c=b+1", "b=a+1", "a=1", "f(x)=cx"]).valueOrder).toEqual(["r2", "r1", "r0", "r3"]);
});
it("RC-20 a call with the wrong number of arguments names the expected count", () => {
  const sin = analyze(["\\sin(1,2)"]).rows[0].error;
  expect([sin?.code, sin?.names, sin?.message, sin?.span?.start]).toEqual(["arity", ["sin", "1"], "sin takes 1 argument.", 0]);
  expect(analyze(["f(x)=x", "f(1,2)"]).rows[1].error?.message).toBe("f takes 1 argument.");
  expect(analyze(["g(a,b)=a+b", "g(1)"]).rows[1].error?.message).toBe("g takes 2 arguments.");
  expect(analyze(["\\arctan(1,2,3)"]).rows[0].error?.message).toBe("arctan takes 1 or 2 arguments.");
  expect(codes(["\\arctan(1,2)", "\\log_{2}(8)"])).toEqual([null, null]);
});
```
`cases/classify-definitions.ts`, appended:
* `a+1` [rows: `a=1`, `a=2`] → error dependency · `a=1` [rows: `a=2`] → error duplicate-definition · `f=2` [rows: `f(x)=x`] → error duplicate-definition · `f(3)` [rows: `f(x)=x`, `f=2`] → error dependency (RC-7)
* `a=a+1` → error cycle · `a=b` [rows: `b=a`] → error cycle · `f(x)=g(x)` [rows: `g(x)=f(x)`] → error cycle · `f(x)=f(x-1)` → error cycle · `c=a+1` [rows: `a=b`, `b=a`] → definition (RC-8)
* `a=2` [rows: `y=a`] → definition (RC-9)
* `\sin(1,2)` → error arity · `f(1,2)` [rows: `f(x)=x`] → error arity · `g(1)` [rows: `g(a,b)=a+b`] → error arity · `\arctan(1,2,3)` → error arity · `\arctan(1,2)` → value · `\log_{2}(8)` → value (RC-20)
* `y=f(x)+g(1,2)` [rows: `f(x)=x^{2}`, `g(a,b)=a+b`] → curve-y (G-6)
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-v2/core/analysis/resolve.test.ts src/lib/calculator-v2/core/corpus/semantics.corpus.test.ts -t "RC-7|RC-8|RC-9|RC-20|G-6"`. Expected: FAIL, the RC-7 codes are all `null` where `duplicate-definition` is expected.
- [ ] **Step 3: Implement.** `BUILTIN_ARITY = new Map(OPERATOR_NAMES.flatMap((o) => (o.category !== null && isShippedBuiltin(o.name) && o.arity !== "variadic" ? [[o.name, o.arity] as const] : [])))`, no arity restated (`[1, 2]` for arctan and log; `\log_{b}x` is `(call log x b)`). Resolution: duplicates first; cycles by Tarjan's SCC over error-free, non-duplicate defining rows, with an edge from each body use (parameters excluded) to the row defining that name (an SCC of two or more rows, or a self-edge, is cyclic); `valueOrder` by depth-first post-order from rows in list order. `classifyRow` applies decision 4: `cycle` names the row's own name; `arity` walks calls in source order (built-in arity from `BUILTIN_ARITY`, user arity from an error-free head) with `[displayName(name), arityText(…)]`; `dependency` names the first used duplicated name on a row that does not define it.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/calculator-v2/core && git commit -m "Report v2 duplicate, cycle, dependency and arity errors in dependency order"`.

<!-- prettier-ignore-end -->
