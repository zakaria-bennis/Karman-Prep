# 12 transfer-core, part 3 of 5: stem classification, question function names, dependencies and answer choices (Tasks 6 to 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 3 of 5 of package `12-transfer-core.md`, which holds the package header, Conventions
(test helpers `REAL`, `stem`, `N`, `verdicts`, `rowsOf`, `P`, `seeded`, `latexOf`, `analysed`),
Decisions, Deliberate deviations, Preconditions and the ID coverage; they apply to every task
here. Tasks run in number order across the five parts. `ct/` is `src/lib/calculator-transfer/`,
`tr/` is `src/components/calculator-v2/transfer/` and `cases/` is `src/lib/calculator-v2/core/corpus/cases/`.

---

### Task 6: Stem classification, descriptions, sources and boundaries (TR-1, TR-3, TR-5, TR-6, AR-3; TR-50 contribution)

**Files:** Create `ct/describe.ts`, `ct/classify.ts`; Test `ct/describe.test.ts`, `ct/classify.test.ts`, `ct/boundaries.test.ts`.

**Interfaces:**

- Precondition: P2 has confirmed the TR-50 row of 00-index section 5.3; `describe.test.ts`
  holds a TR-50 contribution.
- Consumes: Task 2's `splitMathText(text: string, serializedFunctionLines: boolean, atLineStart: boolean, atLineEnd: boolean): MathSegment[]`
  and `MathSegment`; Task 3's `normalizeQuestionMath(latex: string, context: "math" | "cell" | "coordinate"): string`;
  Task 5's `classifySegment(latex: string, role: "stem" | "choice", functionNames: ReadonlySet<string>): SegmentResult`,
  `SegmentResult`, `SegmentRow`; Task 1's `TransferPayload`.
- Produces: section 14's `classify.ts` declarations `StemInput`, `ChoiceInput`, `TransferItemKind`,
  `TransferItem` and `classifyStem(stem: StemInput): ReadonlyMap<number, TransferItem>` exactly
  (keys are decision 1's whole-text `splitMathText` indexes), and:

```ts
// describe.ts
export const DESCRIPTION_LIMIT = 60;
export function plainMath(latex: string): string; // plain-text form (rules in Step 3)
export function describeMath(latex: string): string; // plainMath cut to 60 characters, then "…"
export function describeSystem(kinds: readonly ("equation" | "inequality")[]): string;
export function describeChoice(letter: string): string; // "choice B"
// classify.ts
export type SegmentVerdict = { item: TransferItem } | { rule: string; detail: string };
export function explainStem(stem: StemInput): ReadonlyMap<number, SegmentVerdict>; // every non-text segment index
```

- [ ] **Step 1: Write the failing tests.** `describe.test.ts`:

```ts
it("TR-50 descriptions are the plain-text form of the math, cut at 60 characters", () => {
  const rows: [string, string][] = [
    ["y=2x+3", "y = 2x + 3"],
    ["y\\le-x+4", "y ≤ -x + 4"],
    ["-2<x\\le5", "-2 < x ≤ 5"],
    ["P(t)=500(1.03)^{t}", "P(t) = 500(1.03)^t"],
    ["(x-2)^2+(y+1)^2=9", "(x - 2)² + (y + 1)² = 9"],
    ["\\frac{1}{2}x", "(1/2)x"],
    ["y=\\frac{x+1}{x-2}", "y = (x + 1)/(x - 2)"],
    ["\\sqrt{50}", "√50"],
    ["\\sqrt{x+4}", "√(x + 4)"],
    ["\\sqrt[3]{x}", "∛x"],
    ["\\left|x-3\\right|", "|x - 3|"],
    ["2\\cdot5\\div x", "2·5÷x"],
    ["A=\\pi r^{2}", "A = πr²"],
    ["x_{1}=2", "x₁ = 2"],
    ["v_{max}", "v_max"],
    ["\\log_{2}x+\\sin x", "log₂ x + sin x"],
    ["\\sin^{-1}x", "sin^(-1) x"],
    ["e^{x}", "e^x"],
    ["2^{10}", "2^10"],
    ["\\alpha+1", "α + 1"],
  ];
  for (const [latex, text] of rows) expect(describeMath(latex), latex).toBe(text);
  expect(describeMath("y=" + "1+".repeat(40) + "1")).toBe(
    ("y = " + "1 + ".repeat(40) + "1").slice(0, 60) + "…"
  );
  expect([
    describeSystem(["equation", "equation"]),
    describeSystem(["inequality", "inequality", "inequality"]),
    describeSystem(["equation", "inequality"]),
    describeChoice("B"),
  ]).toEqual([
    "system of 2 equations",
    "system of 3 inequalities",
    "system of 2 equations and inequalities",
    "choice B",
  ]);
});
```

`classify.test.ts`:

```ts
const rowMap = (m: ReadonlyMap<number, TransferItem>) =>
  [...m].map(([i, item]) => [i, item.payload.rows]);
it("TR-1 stem items come only from inline, display and reviewed serialized math segments", () => {
  expect(
    rowMap(classifyStem(stem("If $y=2x+3$ and \\(2x+5=17\\), then $$x^{2}+y^{2}=25$$ holds.")))
  ).toEqual([
    [1, ["y=2x+3"]],
    [3, ["2x+5=17"]],
    [5, ["x^{2}+y^{2}=25"]],
  ]);
  const serialized =
    "5. The function f is defined by f(x) = (1/2)(x + 11). What is the value of f(3)?";
  expect(rowMap(classifyStem(stem(serialized, true)))).toEqual([
    [1, ["f(x) = \\frac{1}{2}(x + 11)"]],
  ]);
  expect(classifyStem(stem(serialized, false)).size).toBe(0);
  expect(classifyStem(stem("Prose y=2x+3 outside delimiters")).size).toBe(0);
});
it("TR-1 an item carries its source id, kind, accepting rule, description and a rows payload without a question key", () => {
  expect(classifyStem(stem("Graph $y=2x+3$.")).get(1)).toEqual({
    sourceId: "stem:1",
    kind: "equation",
    ruleId: "TR-13",
    description: "y = 2x + 3",
    payload: {
      version: 1,
      sourceId: "stem:1",
      description: "y = 2x + 3",
      format: "rows",
      dependencies: [],
      rows: ["y=2x+3"],
    },
  });
  const sys = classifyStem(stem("$\\begin{cases}y=2x\\\\y\\ge x^{2}\\end{cases}$")).get(0);
  expect([sys?.kind, sys?.ruleId, sys?.description, sys?.payload.rows]).toEqual([
    "system",
    "TR-12",
    "system of 2 equations and inequalities",
    ["y=2x", "y\\ge x^{2}"],
  ]);
});
it("TR-3 classifier inputs carry no figure fields", () => {
  expectTypeOf<keyof StemInput>().toEqualTypeOf<"text" | "serializedFunctionLines">();
  expectTypeOf<keyof ChoiceInput>().toEqualTypeOf<"letter" | "text">();
});
it("TR-5 rejected segments get no entry and no placeholder", () => {
  const text = "Find $x$ if $x\\ne3$, $(2,5)$, $\\sinh x$ and $y=2x$.";
  expect([...classifyStem(stem(text)).keys()]).toEqual([9]);
  expect(verdicts(text)).toEqual([
    [1, "TR-10"],
    [3, "TR-9"],
    [5, "TR-77"],
    [7, "TR-77"],
    [9, "item"],
  ]);
  expectTypeOf<TransferItem>().not.toHaveProperty("disabled");
});
it("TR-6 classifyStem keys are indexes of one whole-text splitMathText call, rows come from that segment, and results are memoized", () => {
  const text = "[[u]]Use $y=2x$[[/u]] and <i>$y>x+1$</i> with \\(2x+5=17\\)";
  const segments = splitMathText(text, false, true, true);
  const items = classifyStem(stem(text));
  expect([...items.keys()]).toEqual([1, 3, 5]);
  for (const [i, item] of items) {
    const s = segments[i];
    expect(s.kind === "text" ? null : normalizeQuestionMath(s.latex, "math")).toBe(
      item.payload.rows?.[0]
    );
    expect(item.sourceId).toBe(`stem:${i}`);
  }
  expect(classifyStem(stem(text))).toBe(items);
  // a marker between math segments takes an index of its own; run-by-run numbering would give 1 and 2
  expect(
    [...classifyStem(stem("Use <i>$a=1$</i>$b=2$")).values()].map((t) => [
      t.sourceId,
      t.payload.rows,
    ])
  ).toEqual([
    ["stem:1", ["a=1"]],
    ["stem:3", ["b=2"]],
  ]);
  // a currency "$" kept as text splits the text in two, and both pieces count
  expect([
    ...classifyStem(stem("It was $5 for the pen and $6 for the case, so $y=5x+6$.")).keys(),
  ]).toEqual([3]);
});
```

`boundaries.test.ts` (test-local `importClosure(entries)`: follows `import … from`, `export … from` and `import(…)` specifiers, type-only ones included; `@/x` → `src/x`; relative paths resolved with `.ts`, `.tsx`, `/index.ts`; bare specifiers kept as written):

```ts
const TRANSFER_MODULES = ["payload", "normalize", "lex", "segment", "describe", "classify"]
  .map((m) => `src/lib/calculator-transfer/${m}.ts`)
  .concat("src/components/learn/math-segments.ts");
it("AR-3 classification and payload building reach no v2 parser, MathField, render, worker, React or KaTeX module", () => {
  const closure = importClosure(TRANSFER_MODULES);
  expect(closure).toEqual(expect.arrayContaining(TRANSFER_MODULES));
  expect(closure.filter((f) => !f.startsWith("src/"))).toEqual([]);
  expect(
    closure.filter((f) => /calculator-v2|vendor\/mathquill|\/render\/|\/worker\//.test(f))
  ).toEqual([]);
});
it("TR-3 no transfer module reads figure data", () => {
  for (const file of TRANSFER_MODULES)
    expect(readFileSync(file, "utf8"), file).not.toMatch(
      /image_url|figure_kind|figure_chart_data|figure_geometry_data|ChartKind|function_plot|scatterplot|boxplot/
    );
});
```

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-transfer/describe.test.ts src/lib/calculator-transfer/classify.test.ts src/lib/calculator-transfer/boundaries.test.ts`. Expected: FAIL in all three files: `describe.test.ts` with `Failed to resolve import "./describe"`; `classify.test.ts` with `Failed to resolve import "./classify"`; both `boundaries.test.ts` tests with `ENOENT: no such file or directory, open 'src/lib/calculator-transfer/describe.ts'` (the first listed module that does not exist yet).
- [ ] **Step 3: Implement.**
  - `plainMath`: a recursive scan of the LaTeX: `\left`/`\right` dropped; `\frac{A}{B}` → `A/B`, each part in parentheses when its text holds a space or an operator, the whole in parentheses when a letter, digit, `(` or `√` follows; `\sqrt{A}` → `√A` when A is digits or one name, else `√(A)`, `\sqrt[3]`/`\sqrt[4]` → `∛`/`∜`, other indexes `√[n](A)`; `^E` → `²`/`³` for `2`/`3`, `^E` when E is digits or one character, else `^(E)`; `_E` → Unicode subscript digits for digits, else `_E`; `\cdot` `·`, `\div` `÷`, `\le` `≤`, `\ge` `≥`, `\pi` `π`, Greek names their letters; functions print their name and a space before a following letter or digit; relations and binary `+`/`-` are spaced (`-` is binary after an operand: alphanumeric, `)`, `}` or a closing bar); other source whitespace is dropped and spaces are collapsed.
  - `describeMath(l)`: `plainMath(l)`, then `text.slice(0, 60) + "…"` when longer than 60. `describeSystem`: the count with `equations`, `inequalities` or `equations and inequalities`.
  - `explainStem`: `splitMathText(stem.text, stem.serializedFunctionLines, true, true)` (decision 1; the index `i` of each segment in that array is its key), then for each non-text segment `normalizeQuestionMath(latex, "math")` and `classifySegment(…, "stem", functionNames)` where `functionNames` holds the stem's function-definition head names (Task 7 adds prose names and resolution). An accepted segment becomes `{ item }` with `sourceId` `stem:<i>`, the kind (`function` for a single function row), the decision 6 rule, `describeMath` or `describeSystem`, and `payload: { version: 1, sourceId, description, format: "rows", dependencies: [], rows }`. `classifyStem` keeps the items; both memoize on `` `${flag}\u0000${text}` `` in a `Map` cleared when it reaches 200 entries.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS (8 tests).
- [ ] **Step 5: Commit** `git add src/lib/calculator-transfer && git commit -m "Classify question stems into transfer items with descriptions (TR-1, TR-3, TR-5, TR-6, AR-3)"`.

### Task 7: Question function names, dependencies and core agreement (TR-18, TR-19, TR-20, TR-21, TR-37, TR-77)

**Files:** Create `ct/names.ts`; Modify `ct/classify.ts`, `ct/boundaries.test.ts` (adds `"names"` to `TRANSFER_MODULES`); Test `ct/names.test.ts`, `ct/classify.names.test.ts`.

**Interfaces:**

- Consumes: Task 2's `splitMathText(text: string, serializedFunctionLines: boolean, atLineStart: boolean, atLineEnd: boolean): MathSegment[]`;
  Task 3's `normalizeQuestionMath(latex: string, context: "math" | "cell" | "coordinate"): string`;
  Task 4's `lexQuestionMath(latex: string): LexResult`; Task 5's
  `classifySegment(latex: string, role: "stem" | "choice", functionNames: ReadonlySet<string>): SegmentResult`
  and `SegmentRow` (`defines`, `names`, `calls`, `pointNames`); Task 6's `explainStem(stem: StemInput): ReadonlyMap<number, SegmentVerdict>`,
  `classifyStem(stem: StemInput): ReadonlyMap<number, TransferItem>`, `describeMath(latex: string): string`.
  In tests only: 04's `analyzeRows(rows: readonly RowSource[], settings: AnalysisSettings): AnalysisResult`
  (`AnalysisResult.rows: RowAnalysis[]`, `RowAnalysis.error: RowError | null`) and 02's `CORPUS: readonly CorpusCase[]`.
- Produces (package-internal):

```ts
// names.ts
export function loneName(latex: string): string | null; // normalised "f", "f_{1}" or "f(x)" → the name; else null
export function proseFunctionNames(segments: readonly MathSegment[]): Set<string>; // TR-19 prose rule
```

- [ ] **Step 1: Write the failing tests.** `names.test.ts`:

```ts
const p = (text: string) => [...proseFunctionNames(splitMathText(text, false, true, true))].sort();
it("TR-19 a name directly after 'function' or 'functions' in prose is a question function name", () => {
  expect(p("the function $f$ is linear")).toEqual(["f"]);
  expect(p("functions $f$ and $g$ are defined")).toEqual(["f", "g"]);
  expect(p("functions $f$, $g$, and $h$")).toEqual(["f", "g", "h"]);
  expect(p("The function f is defined by")).toEqual(["f"]);
  expect(p("The function <i>f</i> is defined by")).toEqual(["f"]);
  expect(p("the function <i>$g$</i> is linear")).toEqual(["g"]);
  expect(p("Functions p and q")).toEqual(["p", "q"]);
  expect(p("the function $f(x)$ above")).toEqual(["f"]);
  expect(p("the function's graph, a functional $k$, the function below, function $y=2x$")).toEqual(
    []
  );
  expect([
    loneName("f"),
    loneName("f_{1}"),
    loneName("g(x)"),
    loneName("2f"),
    loneName("y=f(x)"),
  ]).toEqual(["f", "f_{1}", "g", null, null]);
});
```

`classify.names.test.ts`:

```ts
it("TR-18 name(…) is implicit multiplication unless name is a question function name", () => {
  expect(rowsOf("Graph $y=a(x+3)$.")).toEqual([[1, ["y=a(x+3)"], []]]);
  expect(verdicts("For the function $a$, graph $y=a(x+3)$.")).toEqual([
    [1, "TR-10"],
    [3, "TR-20"],
  ]);
});
it("TR-19 a stem definition name(v)=… makes name a question function name", () => {
  expect(rowsOf("Let $f(x)=x^{2}$; graph $y=f(x)+1$.")).toEqual([
    [1, ["f(x)=x^{2}"], []],
    [3, ["y=f(x)+1"], ["f(x)=x^{2}"]],
  ]);
  const serialized = classifyStem(
    stem("5. The function f is defined by f(x) = (1/2)(x + 11). What is the value of f(3)?", true)
  );
  expect([...serialized].map(([i, t]) => [i, t.kind, t.payload.rows])).toEqual([
    [1, "function", ["f(x) = \\frac{1}{2}(x + 11)"]],
  ]);
});
it("TR-20 a call to a question function name needs exactly one exportable stem definition", () => {
  expect(verdicts("For the function $f$, find $y=f(x)$.")).toEqual([
    [1, "TR-10"],
    [3, "TR-20"],
  ]);
  expect(verdicts("If $f(x)=2x$ or $f(x)=3x$, graph $y=f(x)$.")).toEqual([
    [1, "item"],
    [3, "item"],
    [5, "TR-20"],
  ]);
  // decision 9: the cycle set comes first, so both definitions get TR-21 before their calls are
  // looked at, and f is left with no exportable definition
  expect(verdicts("If $f(x)=g(x)+1$ and $g(x)=f(x)$, graph $y=f(x)$.")).toEqual([
    [1, "TR-21"],
    [3, "TR-21"],
    [5, "TR-20"],
  ]);
  // f's only definition fails its own call check (g has no definition), so it is not exportable
  expect(verdicts("The function $g$ is linear. If $f(x)=g(x)+1$, graph $y=f(x)$.")).toEqual([
    [1, "TR-10"],
    [3, "TR-20"],
    [5, "TR-20"],
  ]);
  expect(verdicts("The function $f$ has $f(x)=x^{2}$; graph $y=f(x)+1$.")).toEqual([
    [1, "TR-10"],
    [3, "item"],
    [5, "item"],
  ]);
});
it("TR-37 a name defined by exactly one exportable stem segment becomes a dependency, deepest first", () => {
  expect(rowsOf("If $k=3$, graph $y=kx+1$.")).toEqual([
    [1, ["k=3"], []],
    [3, ["y=kx+1"], ["k=3"]],
  ]);
  expect(rowsOf("If $k=3$ or $k=5$, graph $y=kx+1$.")).toEqual([
    [1, ["k=3"], []],
    [3, ["k=5"], []],
    [5, ["y=kx+1"], []],
  ]);
  expect(rowsOf("Let $a=2$, $f(x)=ax^{2}$ and $g(x)=f(x)+3$.").at(-1)).toEqual([
    5,
    ["g(x)=f(x)+3"],
    ["a=2", "f(x)=ax^{2}"],
  ]);
});
it("TR-77 a row that is not a definition and depends on a stem definition built on r gets no control in Phase 1", () => {
  expect(verdicts("If $A=\\pi r^{2}$, find $y=A$.")).toEqual([
    [1, "item"],
    [3, "TR-77"],
  ]);
});
it("TR-77 a point whose parts use a t that neither the item's rows nor its dependencies define gets no control in Phase 1", () => {
  expect(verdicts("Plot $P=(t,2)$.")).toEqual([[1, "TR-77"]]);
  expect(rowsOf("If $t=2$, plot $P=(t,2)$.")).toEqual([
    [1, ["t=2"], []],
    [3, ["P=(t,2)"], ["t=2"]],
  ]);
  expect(verdicts("If $t=2$ or $t=3$, plot $P=(t,2)$.")).toEqual([
    [1, "item"],
    [3, "item"],
    [5, "TR-77"],
  ]);
  expect(verdicts("If $a=t+1$, plot $P=(a,2)$.")).toEqual([
    [1, "item"],
    [3, "TR-77"],
  ]);
});
it("TR-21 an item whose rows define a name twice or cyclically gets no control, and an item never carries a dependency for a name its own rows define", () => {
  expect(verdicts("Solve $\\begin{cases}a=2\\\\a=3\\end{cases}$.")).toEqual([[1, "TR-21"]]);
  expect(verdicts("Solve $\\begin{cases}a=b\\\\b=a\\end{cases}$.")).toEqual([[1, "TR-21"]]);
  expect(verdicts("Use $\\begin{cases}f(x)=2x\\\\f(x)=3x\\end{cases}$.")).toEqual([[1, "TR-21"]]);
  expect(rowsOf("If $a=2$, solve $\\begin{cases}a=5\\\\y=ax\\end{cases}$.")).toEqual([
    [1, ["a=2"], []],
    [3, ["a=5", "y=ax"], []],
  ]);
  expect(
    rowsOf("If $a=2$ and $f(x)=ax$, solve $\\begin{cases}a=5\\\\y=f(x)\\end{cases}$.").at(-1)
  ).toEqual([5, ["a=5", "y=f(x)"], ["f(x)=ax"]]);
});
it("TR-21 every output the classifier accepts analyses in the v2 core with no row error", () => {
  const stems = [
    ...TR21_STEMS,
    ...CORPUS.flatMap((c) =>
      "question" in c.input
        ? [`$${c.input.question}$`]
        : "latex" in c.input && c.id.startsWith("sat-forms-")
          ? [`$${c.input.latex}$`]
          : []
    ),
  ];
  let accepted = 0;
  for (const text of stems)
    for (const item of classifyStem(stem(text)).values()) {
      const latex = [...item.payload.dependencies, ...(item.payload.rows ?? [])];
      const a = analyzeRows(
        latex.map((l, i) => ({ id: `r${i}`, latex: l, hidden: false })),
        REAL
      );
      expect(
        a.rows.map((r) => r.error?.code ?? null),
        text
      ).toEqual(latex.map(() => null));
      accepted++;
    }
  expect(accepted).toBeGreaterThan(50);
});
```

`TR21_STEMS` (a literal array in `classify.names.test.ts`) holds every stem text used in Tasks 6
and 7, and every Task 5 segment wrapped in `$…$` (the TR-21 nesting inputs at depths 64 and 65
included). It therefore contains the item-level cases above: the `cases` systems that define `a`
twice, define `a` and `b` in a cycle and define `f` twice; the two `a=5` systems whose outside `a=2`
is dropped; and the four `P=(t,2)` and `P=(a,2)` stems.

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-transfer/names.test.ts src/lib/calculator-transfer/classify.names.test.ts src/lib/calculator-transfer/boundaries.test.ts`. Expected: FAIL in all three files:
  - `names.test.ts`: `Failed to resolve import "./names"`.
  - `boundaries.test.ts` (with `"names"` appended to `TRANSFER_MODULES`): both tests with `ENOENT: no such file or directory, open 'src/lib/calculator-transfer/names.ts'`.
  - `classify.names.test.ts`: assertion failures, because Task 6's `explainStem` has no prose names, no call resolution, no dependencies and no item-level checks. The TR-18 test fails on `[3, "TR-20"]` (receives `[3, "item"]`); TR-19 and TR-37 on their dependency lists (for example `[3, ["y=kx+1"], []]` where `[3, ["y=kx+1"], ["k=3"]]` is expected); TR-20 on `[3, "TR-20"]`; both TR-77 tests on `"TR-77"` (receive `"item"`); the item-level TR-21 test on `[[1, "TR-21"]]` (receives `[[1, "item"]]`); the TR-21 arbiter on an accepted item that errors (for example the `\begin{cases}a=2\\a=3\end{cases}` system analyses with `duplicate-definition`).
- [ ] **Step 3: Implement.**
  - `proseFunctionNames`: read consecutive text segments as one text with the exact source markers (`[[u]]`, `[[/u]]`, `<u>`, `</u>`, `[[i]]`, `[[/i]]`, `<i>`, `</i>`) removed. For each `\bfunctions?\b` match (case-insensitive) in that text, read names from the following text: skip spaces; at the end of the text the next segment, when it is math with a `loneName`, gives one name and reading continues in the text after it; in prose a Latin letter not followed by a letter gives one name. After a name, a plural keyword continues past `,`, `, and` or `and` (with spaces); any other text stops.
  - `explainStem`: `functionNames` = prose names plus function heads. Every non-text segment first goes through `classifySegment`. Then, before any segment resolves (decision 9):
    - _Candidates_: the segments that passed with exactly one row whose `defines` is not `null`; `definitions` maps each defined name to its candidate segments (one name may have several).
    - _Cycle set_: build the graph with an edge from each candidate to every candidate in `definitions` of each name in its row's `names` and `calls`, find its strongly connected components (Tarjan), and put in the set every candidate whose component has two or more members. (A candidate cannot reach itself in one step: a name used in its own definition is already the segment-level `TR-21` of Task 5.)
    - _Exportable_: `isExportable(c)` is true when `c` is not in the cycle set and `resolve(c)` gives an item. Both are module-private closures of one stem context, built once per `explainStem` memo key and reused by Task 8's choices (`resolve(i: number): SegmentVerdict`, `isExportable(i: number): boolean`, `i` a segment index), memoized per index; candidates outside the cycle set form an acyclic graph, so the recursion ends.

    `resolve(i)` runs decision 6's `classify.ts` checks in this order and returns the first rejection:
    1. Its own segment rejection (from `classifySegment`).
    2. A candidate in the cycle set → `TR-21` (cycle), before its calls are looked at.
    3. Own names: the names its rows define (`defines.name`). Calls to own names need nothing more; every other call needs exactly one exportable definition, else `TR-20` (zero or several exportable definitions alike).
    4. Dependencies: names used or called, not own, with exactly one exportable definition, resolved recursively through those definitions' `names` and `calls`, deepest first, without repeats, never entering an own name (stop rule).
    5. Item checks (decision 7): an own name defined by two rows → `TR-21`; a cycle in the graph whose nodes are the item's definition rows and its dependency definitions, with an edge from each of them to the definition of every name in its `names` and `calls` → `TR-21`.
    6. Gates (decision 8): a non-definition row whose dependency rows use `r` → `TR-77`; a row whose `pointNames`, followed through the `names` of the definitions they reach (own rows and dependencies), include `t`, while no own row and no dependency defines `t` → `TR-77`.

    Items get `payload.dependencies` as those definitions' normalised LaTeX. In `If $f(x)=g(x)+1$ and $g(x)=f(x)$, graph $y=f(x)$.` segments 1 and 3 form one component (step 2, `TR-21`), and segment 5's call to `f` finds no exportable definition (step 3, `TR-20`).

- [ ] **Step 4: Run** the Step 2 command, then `n exec 22 npx vitest run src/lib/calculator-transfer`. Expected: PASS (`names.test.ts` 1 test, `classify.names.test.ts` 8 tests, `boundaries.test.ts` 2 tests). If the TR-21 arbiter finds an accepted row that errors, narrow `segment.ts` or the item checks (decision 7) and add the input to the Task 5 TR-21 list or to the item-level TR-21 test (and so to `TR21_STEMS`) in the same commit.
- [ ] **Step 5: Commit** `git add src/lib/calculator-transfer && git commit -m "Resolve question function names and stem dependencies (TR-18 to TR-21, TR-37, TR-77)"`.

### Task 8: Answer choices and accessible names (TR-1, TR-21, TR-37, TR-40; TR-50 contribution)

**Files:** Modify `ct/classify.ts`; Test `ct/classify.choice.test.ts`.

**Interfaces:**

- Precondition: P2 has confirmed the TR-50 row of 00-index section 5.3; the TR-50 test here is a
  contribution.
- Consumes: Task 2's `splitMathText(text: string, serializedFunctionLines: boolean, atLineStart: boolean, atLineEnd: boolean): MathSegment[]`;
  Task 3's `normalizeQuestionMath(latex: string, context: "math" | "cell" | "coordinate"): string`;
  Task 5's `classifySegment(latex: string, role: "stem" | "choice", functionNames: ReadonlySet<string>): SegmentResult`;
  Task 6's `classifyStem(stem: StemInput): ReadonlyMap<number, TransferItem>`, `describeChoice(letter: string): string`,
  `SegmentVerdict`; Task 7's `proseFunctionNames(segments: readonly MathSegment[]): Set<string>` and
  `explainStem`'s resolver (decision 6's `classify.ts` steps). In tests only: 04's
  `analyzeRows(rows: readonly RowSource[], settings: AnalysisSettings): AnalysisResult`.
- Produces: section 14's `classifyChoice(choice: ChoiceInput, stem: StemInput | null): TransferItem | null`
  and `accessibleNames(items: readonly TransferItem[]): Map<string, string>` exactly, and:

```ts
export function explainChoice(choice: ChoiceInput, stem: StemInput | null): SegmentVerdict;
export const PLAIN_CHOICE: RegExp; // /^[0-9A-Za-z+\-−×·÷/^=<>≤≥().,\sπ√²³]+$/ (TR-40's character list plus whitespace)
```

- [ ] **Step 1: Write the failing tests** (`choice(text, letter = "B")` = `classifyChoice({ letter, text }, null)`):

```ts
it("TR-1, TR-40 a whole choice is one item whose segments pass with TR-10 excepted and whose prose is only separators or 'and'", () => {
  expect(choice("$x$")).toEqual({
    sourceId: "choice:B",
    kind: "choice",
    ruleId: "TR-40",
    description: "choice B",
    payload: {
      version: 1,
      sourceId: "choice:B",
      description: "choice B",
      format: "rows",
      dependencies: [],
      rows: ["x"],
    },
  });
  expect(choice("$y=2x$ and $y=x+1$")?.payload.rows).toEqual(["y=2x", "y=x+1"]);
  expect(choice("$y=2x$; $y>x$, and $x\\le3$")?.payload.rows).toEqual(["y=2x", "y>x", "x\\le3"]);
  expect(choice("$\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}$")?.payload.rows).toEqual([
    "y\\ge x^{2}",
    "y<4",
  ]);
  for (const t of [
    "$x$ only",
    "$y=2x$ or $y=3x$",
    "$x\\ne3$",
    "$y=2x$ and $\\angle B$",
    "No solution",
    "",
    "$12",
    "$(2,5)$",
    "$(1,2)$ and $(3,4)$",
    "$0<x>2$",
  ])
    expect(choice(t), t).toBeNull();
  expect(explainChoice({ letter: "B", text: "$y=2x$ or $y=3x$" }, null)).toMatchObject({
    rule: "TR-40",
  });
});
it("TR-40 a choice without delimiters is one segment when its whole text is plain math", () => {
  const cases: [string, string][] = [
    ["y = 2x + 3", "y = 2x + 3"],
    ["−5", "-5"],
    ["3/4", "\\frac{3}{4}"],
    ["2 1/2", "\\left(2+\\frac{1}{2}\\right)"],
    ["x² − 4 ≤ 5", "x^{2} - 4 \\le 5"],
    ["√(x+1)", "\\sqrt{x+1}"],
  ];
  for (const [t, row] of cases) expect(choice(t)?.payload.rows, t).toEqual([row]);
  for (const t of ["None of these", "x is 2", "|x|", "$5 per hour", "x ≈ 3"])
    expect(choice(t), t).toBeNull();
});
it("TR-37, TR-40 choices resolve calls and dependencies against the stem only; choices are never a dependency source", () => {
  expectTypeOf(classifyChoice).parameters.toEqualTypeOf<[ChoiceInput, StemInput | null]>();
  expect(
    classifyChoice(
      { letter: "A", text: "$y=f(x)+2$" },
      stem("The function $f$ is defined by $f(x)=x^{2}$.")
    )?.payload.dependencies
  ).toEqual(["f(x)=x^{2}"]);
  expect(classifyChoice({ letter: "A", text: "$y=g(x)$" }, stem("the function $g$"))).toBeNull();
  expect(classifyChoice({ letter: "A", text: "$y=kx$" }, null)?.payload.dependencies).toEqual([]);
  expect(
    classifyChoice({ letter: "A", text: "$y=kx$" }, stem("If $k=3$, which line?"))?.payload
      .dependencies
  ).toEqual(["k=3"]);
  expect(classifyChoice({ letter: "A", text: "$k=3$ and $y=kx$" }, null)?.payload).toMatchObject({
    rows: ["k=3", "y=kx"],
    dependencies: [],
  });
  // decision 9's stop rule: the choice's own k=5 is used, not the stem's k=3
  expect(
    classifyChoice({ letter: "A", text: "$k=5$ and $y=kx$" }, stem("If $k=3$, which line?"))
      ?.payload
  ).toMatchObject({ rows: ["k=5", "y=kx"], dependencies: [] });
});
it("TR-21 a choice whose rows define a name twice or cyclically gets no control, and every accepted choice analyses with no row error", () => {
  for (const text of ["$a=2$ and $a=3$", "$a=b$ and $b=a$", "$f(x)=2x$; $f(x)=3x$"])
    expect(explainChoice({ letter: "B", text }, null), text).toMatchObject({ rule: "TR-21" });
  const context = stem("The function $f$ is defined by $f(x)=x^{2}$, and $k=3$.");
  const TR21_CHOICES = [
    "$x$",
    "$y=2x$ and $y=x+1$",
    "$y=2x$; $y>x$, and $x\\le3$",
    "$\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}$",
    "y = 2x + 3",
    "−5",
    "3/4",
    "2 1/2",
    "x² − 4 ≤ 5",
    "√(x+1)",
    "$y=f(x)+2$",
    "$y=kx$",
    "$k=3$ and $y=kx$",
    "$k=5$ and $y=kx$",
  ];
  let accepted = 0;
  for (const text of TR21_CHOICES) {
    const item = classifyChoice({ letter: "B", text }, context);
    if (!item) throw new Error(`no item: ${text}`);
    const latex = [...item.payload.dependencies, ...(item.payload.rows ?? [])];
    const a = analyzeRows(
      latex.map((l, i) => ({ id: `r${i}`, latex: l, hidden: false })),
      REAL
    );
    expect(
      a.rows.map((r) => r.error?.code ?? null),
      text
    ).toEqual(latex.map(() => null));
    accepted++;
  }
  expect(accepted).toBe(TR21_CHOICES.length);
});
it("TR-50 accessibleNames prefixes each description and numbers repeats within the question", () => {
  const items = [
    ...classifyStem(stem("Solve $2x=4$, check $2x=4$ and graph $y=x$; again $2x=4$.")).values(),
  ];
  expect([...accessibleNames(items)]).toEqual([
    ["stem:1", "Transfer to Calculator: 2x = 4"],
    ["stem:3", "Transfer to Calculator: 2x = 4, occurrence 2"],
    ["stem:5", "Transfer to Calculator: y = x"],
    ["stem:7", "Transfer to Calculator: 2x = 4, occurrence 3"],
  ]);
});
```

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-transfer/classify.choice.test.ts`. Expected: FAIL, all 5 tests with a `TypeError` that the first missing export it calls is not a function (Vitest prints it as `(0 , __vi_import_<n>__.<name>) is not a function`): `classifyChoice` in the TR-1/TR-40, TR-40 and TR-37/TR-40 tests, `explainChoice` in the TR-21 test, `accessibleNames` in the TR-50 test.
- [ ] **Step 3: Implement.** `explainChoice`: `splitMathText(text, false, true, true)`; no math segments → the trimmed text must be non-empty and match `PLAIN_CHOICE`, then it is one segment (else `TR-40`); with math, every text segment must match `/^(?:[\s,;]|\band\b)*$/i` (else `TR-40`). Each segment: `normalizeQuestionMath(…, "math")`, `classifySegment(…, "choice", names)` with `names` = the stem's function names, the choice's own heads and `proseFunctionNames` of the choice. The rows of all its segments, in order, form one item that goes through Task 7's resolver steps 3 to 6 (step 2 concerns stem candidates only; a choice is never a candidate) with the stem's exportable definitions, from the stem's own cycle set and `isExportable`, as the only dependency source: own names are those any choice row defines (stop rule), dependencies are unioned in segment order without repeats, and the item checks catch a name defined twice or a cycle across segments (`TR-21`). Any rejection is the choice's verdict. Item: `sourceId` `choice:<letter>`, kind `choice`, rule `TR-40`, `describeChoice(letter)`. `classifyChoice` memoizes on letter, text and the stem key. `accessibleNames` counts each description in order and writes `` `Transfer to Calculator: ${d}` `` plus `` `, occurrence ${k}` `` for `k > 1`.
- [ ] **Step 4: Run** the Step 2 command, then `n exec 22 npx vitest run src/lib/calculator-transfer`. Expected: PASS (5 tests in `classify.choice.test.ts`). If the TR-21 choice arbiter finds an accepted choice that errors, narrow the item checks (decision 7) and add the input to its list in the same commit.
- [ ] **Step 5: Commit** `git add src/lib/calculator-transfer && git commit -m "Classify whole answer choices and name transfer controls (TR-40)"`.
