# 12 transfer-core, part 1 of 5: payload contract, segment splitter and question-dialect normalisation (Tasks 1 to 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 1 of 5 of package `12-transfer-core.md`, which holds the package header, Conventions
(test helpers `REAL`, `stem`, `N`, `verdicts`, `rowsOf`, `P`, `seeded`, `latexOf`, `analysed`),
Decisions, Deliberate deviations, Preconditions and the ID coverage; they apply to every task
here. Tasks run in number order across the five parts. `ct/` is `src/lib/calculator-transfer/`,
`tr/` is `src/components/calculator-v2/transfer/` and `cases/` is `src/lib/calculator-v2/core/corpus/cases/`.

---

### Task 1: Payload contract and status messages (AR-16, TR-35, TR-36, TR-73)

**Files:** Create `ct/payload.ts`; Test `ct/payload.test.ts`.

**Interfaces:**

- Consumes: nothing.
- Produces: `TransferPayload`, `TransferTrigger`, `TransferResult`, `MAX_QUEUED_TRANSFERS`,
  `TRANSFER_MESSAGES` exactly as `01-interfaces-integration.md` section 14 (`payload.ts`).

- [ ] **Step 1: Write the failing tests** (`ct/payload.test.ts`, node):

```ts
it("AR-16 TransferPayload has exactly the AR-16 fields and types", () => {
  expectTypeOf<keyof TransferPayload>().toEqualTypeOf<
    | "version"
    | "questionKey"
    | "sourceId"
    | "description"
    | "format"
    | "dependencies"
    | "rows"
    | "table"
    | "pairs"
    | "pointTableKey"
  >();
  expectTypeOf<TransferPayload["version"]>().toEqualTypeOf<1>();
  expectTypeOf<TransferPayload["format"]>().toEqualTypeOf<
    "rows" | "point" | "tableRow" | "evaluate" | "table"
  >();
  expectTypeOf<TransferPayload["table"]>().toEqualTypeOf<
    { headers: (string | null)[]; columns: string[][] } | undefined
  >();
  expectTypeOf<TransferPayload["pairs"]>().toEqualTypeOf<[string, string][] | undefined>();
  expectTypeOf<TransferTrigger>().toEqualTypeOf<"mouse" | "keyboard" | "touch">();
  expectTypeOf<TransferResult["status"]>().toEqualTypeOf<
    "added" | "renamed" | "already-present" | "rejected" | "unavailable" | "queue-full"
  >();
});
it("AR-16 payload.ts is an eager leaf with no imports and no browser globals", () => {
  const src = readFileSync("src/lib/calculator-transfer/payload.ts", "utf8");
  expect(src).not.toMatch(/^\s*import\s/m);
  expect(src).not.toMatch(/\b(window|document|navigator)\b/);
});
it("TR-35, TR-36, TR-73 TRANSFER_MESSAGES holds table 11.1's copy", () => {
  expect(TRANSFER_MESSAGES.added("y = 2x + 3")).toBe("Added to calculator: y = 2x + 3.");
  expect(TRANSFER_MESSAGES.alreadyPresent(2)).toBe("Already in the calculator, row 2.");
  expect(TRANSFER_MESSAGES.renamed("f₂", "f")).toBe("Added as f₂ because f is already defined.");
  expect(TRANSFER_MESSAGES.rejected).toBe("This can't be added to the calculator.");
  expect(TRANSFER_MESSAGES.unavailableRetry).toBe(
    "Calculator unavailable. Use Retry in the calculator panel."
  );
  expect(TRANSFER_MESSAGES.unavailableReload).toBe(
    "Calculator unavailable. Reload the page to use it."
  );
  expect(TRANSFER_MESSAGES.tooManyWaiting).toBe(
    "Too many transfers are waiting. Try again when the calculator has opened."
  );
  expect(MAX_QUEUED_TRANSFERS).toBe(20);
});
```

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-transfer/payload.test.ts`. Expected: FAIL, `Failed to resolve import "./payload"`.
- [ ] **Step 3: Implement** `ct/payload.ts`: the section 14 declarations verbatim, `TRANSFER_MESSAGES` as an `as const` object whose three message functions build the template strings above. No imports.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS (3 tests).
- [ ] **Step 5: Commit** `git add src/lib/calculator-transfer && git commit -m "Add the transfer payload contract and status messages (AR-16)"`.

### Task 2: Shared math segment splitter (TR-6)

**Files:** Create `src/components/learn/math-segments.ts`; Modify `src/components/learn/MathText.tsx`; Test `src/components/learn/math-segments.test.tsx`.

**Interfaces:**

- Consumes (existing, framework-free, unchanged): `currencyDollarDelimiters(text: string): Set<number>`
  (`currency-dollar-delimiters.ts`) and
  `parseSerializedFunctionLines(text: string, options?: { atLineStart?: boolean; atLineEnd?: boolean }): SerializedFunctionRun[]`
  (`serialized-function-math.ts`), moved with the parser; `parseSourceUnderlining(text: string): SourceTextRun[]`
  and `parseSourceItalics(text: string): SourceItalicRun[]`, which stay in MathText.
- Produces: exactly section 14's `math-segments.ts` block and nothing else (decision 1, P1):

```ts
export type MathSegment =
  | { kind: "text"; value: string }
  | { kind: "inline"; latex: string; sourceFunction?: true }
  | { kind: "block"; latex: string };
export function splitMathText(
  text: string,
  serializedFunctionLines: boolean,
  atLineStart: boolean,
  atLineEnd: boolean
): MathSegment[];
```

- [ ] **Step 1: Write the failing tests** (`math-segments.test.tsx`, starts with `// @vitest-environment jsdom`):

```tsx
vi.mock("@/components/calculator/CalculatorSourceAction", () => ({
  CalculatorSourceAction: ({ latex }: { latex: string }) => (
    <span data-testid="source-action" data-latex={latex} />
  ),
}));
const TEXTS: [string, boolean][] = [
  ["Line $y=2x+3$, then \\(x\\le5\\) and $$\\begin{cases}y=2x\\\\y=x+1\\end{cases}$$ end.", false],
  ["[[u]]Solve $2x=4$[[/u]] then <i>check $x=2$</i> for $x$.", false],
  ["Use <i>$a=1$</i>$b=2$", false],
  ["A pen is $\\$12.50$; it was $5 for the pen and $6 for the case.", false],
  ["5. The function f is defined by f(x) = (1/2)(x + 11). What is the value of f(3)?", true],
  ["√(x²) = 24 − 5x\nWhat is the solution to the given equation?", true],
];
const mathOf = (segs: MathSegment[]) => segs.flatMap((s) => (s.kind === "text" ? [] : [s.latex]));
it("TR-6 MathText renders, in order, exactly the non-text segments of the whole-text splitMathText call", () => {
  for (const [text, lines] of TEXTS) {
    const { container, unmount } = render(
      <MathText text={text} calculator serializedFunctionLines={lines} />
    );
    const rendered = [...container.querySelectorAll("[data-testid=source-action]")].map((e) =>
      e.getAttribute("data-latex")
    );
    expect(rendered, text).toEqual(mathOf(splitMathText(text, lines, true, true)));
    expect(rendered.length, text).toBeGreaterThan(0);
    unmount();
  }
});
it("TR-6 segment indexes count every segment of one whole-text split, source markers and split currency text included", () => {
  expect(splitMathText(TEXTS[2][0], false, true, true)).toEqual([
    { kind: "text", value: "Use <i>" },
    { kind: "inline", latex: "a=1" },
    { kind: "text", value: "</i>" },
    { kind: "inline", latex: "b=2" },
  ]);
  expect(splitMathText(TEXTS[3][0], false, true, true).map((s) => s.kind)).toEqual([
    "text",
    "inline",
    "text",
    "text",
  ]);
});
it("TR-6 splitMathText is MathText's former parser and math-segments.ts is framework-free", () => {
  expect(splitMathText("a $x$ b $$y=1$$", false, true, true)).toEqual([
    { kind: "text", value: "a " },
    { kind: "inline", latex: "x" },
    { kind: "text", value: " b " },
    { kind: "block", latex: "y=1" },
  ]);
  // the currency branch keeps the text through the first "$" and rescans: two text segments
  expect(splitMathText("costs $5 for the pen and $6 for the case", false, true, true)).toEqual([
    { kind: "text", value: "costs $" },
    { kind: "text", value: "5 for the pen and $6 for the case" },
  ]);
  expect(readFileSync("src/components/learn/math-segments.ts", "utf8")).not.toMatch(
    /from "(react|katex)/
  );
  const mathText = readFileSync("src/components/learn/MathText.tsx", "utf8");
  expect(mathText).toMatch(/from "\.\/math-segments"/);
  expect(mathText).not.toMatch(/function parse\(/);
});
```

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/components/learn/math-segments.test.tsx`. Expected: FAIL, `Failed to resolve import "./math-segments"`.
- [ ] **Step 3: Implement.** Move `MathText.tsx:38-118` (`Seg`, `parse`) to `math-segments.ts` unchanged except the names (`MathSegment`, `splitMathText`) and the two imports `parse` uses (`currencyDollarDelimiters`, `parseSerializedFunctionLines`). In `MathText.tsx` drop `Seg`, `parse` and those two imports, add `import { splitMathText, type MathSegment } from "./math-segments";`, keep the `runs` memo of `MathText.tsx:198-217` exactly (underline runs, italic runs, the `atLineStart`/`atLineEnd` formulas) with `parse(` replaced by `splitMathText(`, and type `renderSegments(segs: MathSegment[])`; keys and markup are unchanged. The classifier keys items by the whole-text call (decision 1); 14 later maps the k-th rendered math segment to the k-th non-text index of that call (extension edit, 14's Task 5), which the first TR-6 test pins.
- [ ] **Step 4: Run** `n exec 22 npx vitest run src/components/learn`. Expected: PASS, every existing MathText test included.
- [ ] **Step 5: Commit** `git add src/components/learn && git commit -m "Share MathText's segment splitter with the transfer classifier (TR-6)"`.

### Task 3: Question-dialect normalisation and its corpus (TR-7, TR-28, PR-1, PR-5, PR-6, PR-44; OI-6)

**Files:** Create `ct/normalize.ts`, `ct/normalize.test.ts`, `ct/question-dialect.corpus.test.ts`; Modify `cases/question-dialect.ts` (scaffold from 02), `docs/superpowers/specs/calculator-v2/a-math-semantics.md` (OI-6).

**Interfaces:**

- Consumes (`01-interfaces.md` sections 1 to 4):
  - 02, `core/corpus/`: `CORPUS: readonly CorpusCase[]`; `runnerFor(c: CorpusCase, field: ExpectedField): CorpusRunner | null`;
    `CorpusCase`; `ExpectedField = "tree" | "latex" | "kind" | "chips" | "display" | "error"`.
  - 02, `core/latex/index.ts`: `parseLatex(input: string, options?: ParseOptions): ParseResult`;
    `functionDefinitionHead(input: string): { name: string; params: string[] } | null`; `toSExpr(tree: Node): string`.
  - 04, `core/analysis/index.ts`: `analyzeRows(rows: readonly RowSource[], settings: AnalysisSettings): AnalysisResult`;
    `RowAnalysis` (`kind: RowKind`, `chips: string[]`, `error: RowError | null`, …).
  - 04, `core/eval/`: `evaluateLatex(latex: string, context?: { rows?: string[]; settings?: Partial<EvalSettings> }): Value`;
    `formatValue(v: Value): string`.
- Produces: `normalizeQuestionMath(latex: string, context: "math" | "cell" | "coordinate"): string` (section 14), plus `isPlainMathText(text: string): boolean` (decision 2); the 93 `question-dialect-<n>` cases; the runner row of section 2.2.

- [ ] **Step 1: Apply OI-6 to `a-math-semantics.md`.** In PR-1 replace
      `because TR-28 writes it as an improper fraction (PR-6). (Phase 1; verified by unit test)` with
      ``because TR-28 writes it as an improper fraction (PR-6). Math pasted from rendered question content (T-12: the `application/x-tex` annotation, or KaTeX's plain-text copy) is question dialect and goes through TR-7 first, like Transfer; other pasted text is paste input. (Phase 1; verified by unit test)``.
      In PR-6 replace `Typed, API and paste input keep the product meaning` with
      `Typed and API input, and pasted text that is not rendered question math, keep the product meaning`.
      13 adds the pasted mixed-number case to `paste.ts`. Run `n exec 22 npx prettier --write docs/superpowers/specs/calculator-v2/a-math-semantics.md`;
      then `grep -c "is question dialect and goes through TR-7 first" docs/superpowers/specs/calculator-v2/a-math-semantics.md`
      and `grep -c "that is not rendered question math" docs/superpowers/specs/calculator-v2/a-math-semantics.md` each print 1.
- [ ] **Step 2: Write the failing tests.** `ct/normalize.test.ts` (node):

```ts
it("TR-7 table 4.1 rewrites each listed source form", () => {
  const rows: [string, string][] = [
    ["−3x+2", "-3x+2"],
    ["5–x", "5-x"],
    ["3\\times4", "3\\cdot4"],
    ["2×5", "2\\cdot5"],
    ["4·x", "4\\cdot x"],
    ["8÷2", "8\\div2"],
    ["\\dfrac{1}{2}x", "\\frac{1}{2}x"],
    ["\\tfrac{3}{4}", "\\frac{3}{4}"],
    ["x\\leq5", "x\\le5"],
    ["y\\geq x", "y\\ge x"],
    ["x≤3", "x\\le3"],
    ["y≥x", "y\\ge x"],
    ["\\displaystyle\\frac{1}{2}", "\\frac{1}{2}"],
    ["\\big(x+1\\big)", "(x+1)"],
    ["\\Bigl(x\\Bigr)", "(x)"],
    ["2\\,x\\;+\\:1\\!", "2x+1"],
    ["2\\quad x", "2x"],
    ["x\\text{ }=\\text{  }5", "x=5"],
    ["30{,}000", "30000"],
    ["x²+y³", "x^{2}+y^{3}"],
    ["2πr", "2\\pi r"],
    ["θ+1", "\\theta+1"],
    ["√(x+1)", "\\sqrt{x+1}"],
    ["√(√(x)+1)", "\\sqrt{\\sqrt{x}+1}"],
    ["3/4", "\\frac{3}{4}"],
    ["2 1/2", "\\left(2+\\frac{1}{2}\\right)"],
    ["0.\\overline{3}", "\\frac{1}{3}"],
    ["0.1\\overline{6}", "\\frac{1}{6}"],
    ["1.\\overline{3}", "\\frac{4}{3}"],
    ["0.\\overline{9}", "1"],
    ["|x-3|", "\\left|x-3\\right|"],
    ["2|x|+1", "2\\left|x\\right|+1"],
    ["|x||y|", "\\left|x\\right|\\left|y\\right|"],
    ["||x|-1|", "\\left|\\left|x\\right|-1\\right|"],
    ["y=2x+3.", "y=2x+3"],
    ["x=5,", "x=5"],
    ["x>4;", "x>4"],
    ["y<1:", "y<1"],
    ["  y=x  ", "y=x"],
  ];
  for (const [input, output] of rows) expect(N(input), input).toBe(output);
});
it("TR-7 notation outside table 4.1 is left as written", () => {
  for (const s of [
    "y = 2x + 3",
    "\\frac{x}{4}",
    "x/4",
    "x^2/3",
    "\\sqrt[3]{x}",
    "a_1+b_{2}",
    "25\\%",
    "\\sin(30)",
    "\\left|x\\right|",
    "x\\ne3",
    "\\$12.50",
    "1,250",
    "12\\text{ cm}",
    "\\{1\\}",
    "\\tau",
    "\\sin x",
    "x|y",
  ])
    expect(N(s), s).toBe(s);
  expect(N("\\sin 30^{\\circ}")).toBe("\\sin30^{\\circ}"); // decision 3
  expect([
    isPlainMathText("2 1/2"),
    isPlainMathText("x²+1"),
    isPlainMathText("x^2"),
    isPlainMathText("\\frac{1}{2}"),
  ]).toEqual([true, true, false, false]);
});
it("PR-1 each question-dialect form and its typed twin parse to the same tree after TR-7", () => {
  const twins: [string, string][] = [
    ["−3x+2", "-3x+2"],
    ["\\dfrac{1}{2}x", "\\frac{1}{2}x"],
    ["x≤3", "x\\le3"],
    ["2 1/2", "\\left(2+\\frac{1}{2}\\right)"],
    ["0.\\overline{3}", "\\frac{1}{3}"],
    ["|x-3|", "\\left|x-3\\right|"],
    ["30{,}000", "30000"],
    ["4·x", "4\\cdot x"],
    ["3/4", "3/4"],
  ];
  for (const [question, typed] of twins) {
    const a = parseLatex(N(question)),
      b = parseLatex(typed);
    expect(a.ok && b.ok && toSExpr(a.tree) === toSExpr(b.tree), question).toBe(true);
  }
});
it("PR-5 {,} between digit groups is removed and a bare comma stays a separator", () => {
  expect([N("1{,}250"), N("2{,}000{,}000"), N("(1,250)"), N("1,250"), N("x{,}y")]).toEqual([
    "1250",
    "2000000",
    "(1,250)",
    "1,250",
    "x{,}y",
  ]);
});
it("PR-6, TR-28 a question mixed number is a parenthesised sum in math and an improper fraction in cells and coordinates", () => {
  const rows: [string, "math" | "cell" | "coordinate", string][] = [
    ["2\\frac{1}{2}", "math", "\\left(2+\\frac{1}{2}\\right)"],
    ["-2\\frac{1}{2}", "math", "-\\left(2+\\frac{1}{2}\\right)"],
    ["x+3\\frac{1}{4}", "math", "x+\\left(3+\\frac{1}{4}\\right)"],
    ["y=2 \\frac{1}{3}x", "math", "y=\\left(2+\\frac{1}{3}\\right)x"], // D1
    ["2\\frac{1}{2}", "cell", "\\frac{5}{2}"],
    ["-2\\frac{1}{2}", "coordinate", "-\\frac{5}{2}"],
    ["12\\frac{3}{4}", "cell", "\\frac{51}{4}"],
    ["2 1/2", "cell", "\\frac{5}{2}"],
    ["2\\frac{3}{2}", "math", "2\\frac{3}{2}"],
    ["2.5\\frac{1}{2}", "math", "2.5\\frac{1}{2}"],
    ["2\\frac{0}{2}", "math", "2\\frac{0}{2}"],
    ["x2\\frac{1}{2}", "math", "x2\\frac{1}{2}"],
    ["2\\frac{x}{2}", "math", "2\\frac{x}{2}"],
    // decision 12: after a comma or an opening bracket the integer starts a mixed number
    ["f(1,2\\frac{1}{2})", "math", "f(1,\\left(2+\\frac{1}{2}\\right))"],
    ["y=(2\\frac{1}{2})x", "math", "y=(\\left(2+\\frac{1}{2}\\right))x"],
    ["x^{2\\frac{1}{2}}", "math", "x^{\\left(2+\\frac{1}{2}\\right)}"],
    // decision 12: a digit run right after ^ or _ is the exponent or subscript, never the integer a
    ["x^2\\frac{1}{2}", "math", "x^2\\frac{1}{2}"],
    ["a_2\\frac{1}{2}", "math", "a_2\\frac{1}{2}"],
  ];
  for (const [input, context, output] of rows)
    expect(N(input, context), `${input} ${context}`).toBe(output);
});
```

`ct/question-dialect.corpus.test.ts` (the section 2.2 runner; reads every field it claims):

```ts
const FILE = "src/lib/calculator-transfer/question-dialect.corpus.test.ts";
const casesFor = (f: ExpectedField) => CORPUS.filter((c) => runnerFor(c, f)?.file === FILE);
function written(c: CorpusCase): string {
  const input = c.input as { question: string; context?: "math" | "cell" | "coordinate" };
  return normalizeQuestionMath(input.question, input.context ?? "math");
}
const userFunctions = (c: CorpusCase) =>
  new Set([...(c.rows ?? []), written(c)].flatMap((r) => functionDefinitionHead(r)?.name ?? []));
function analysed(c: CorpusCase): RowAnalysis {
  const latex = [...(c.rows ?? []), written(c)];
  const rows = latex.map((l, i) => ({
    id: i === latex.length - 1 ? "case" : `row-${i + 1}`,
    latex: l,
    hidden: false,
  }));
  const row = analyzeRows(rows, {
    angleMode: c.settings?.angleMode ?? "radians",
    complex: c.settings?.complex ?? false,
  }).byId.get("case");
  if (!row) throw new Error(c.id);
  return row;
}
const title = (c: CorpusCase, f: ExpectedField) => `${c.rules.join(", ")} ${c.id} ${f}`;
describe("question-dialect corpus runner", () => {
  for (const c of casesFor("latex")) it(title(c, "latex"), () => expect(written(c)).toBe(c.latex));
  for (const c of casesFor("tree"))
    it(title(c, "tree"), () => {
      const r = parseLatex(written(c), { userFunctions: userFunctions(c) });
      expect(r.ok ? toSExpr(r.tree) : `${r.error.code}: ${r.error.detail}`).toBe(c.tree);
    });
  for (const c of casesFor("kind"))
    it(title(c, "kind"), () => expect(analysed(c).kind).toBe(c.kind));
  for (const c of casesFor("chips"))
    it(title(c, "chips"), () => expect(analysed(c).chips).toEqual(c.chips));
  for (const c of casesFor("error"))
    it(title(c, "error"), () => expect(analysed(c).error?.code ?? null).toBe(c.error));
  for (const c of casesFor("display"))
    it(title(c, "display"), () =>
      expect(formatValue(evaluateLatex(written(c), { rows: c.rows, settings: c.settings }))).toBe(
        c.display
      )
    );
});
```

`cases/question-dialect.ts` (relative import `../types` only). Builders: `q(n: number, rules: string[], question: string, expect: Partial<CorpusCase>, extra?: { context?: "cell" | "coordinate"; rows?: string[] }): CorpusCase` gives `{ id: "question-dialect-<n>", rules, input: extra?.context ? { question, context: extra.context } : { question }, ...(extra?.rows ? { rows: extra.rows } : {}), ...expect }`; a line's `[cell]` or `[coordinate]` is `extra.context`, and its `[rows: …]` is `extra.rows` (`[rows: f(x)=x^{2}]` → `{ rows: ["f(x)=x^{2}"] }`). `t(n, rules, latex, expect)` gives a `latex` input (routed to 02's and 04's runners). Each line is `n rules input → fields`; `L` is `latex`, `T` is `tree`, `K` is `kind`, `C` is `chips`, `D` is `display`, `E` is `error`:

```text
1 TR-7,PR-1 "−3x+2" → L "-3x+2" T (add (mul (neg (num 3)) (id x)) (num 2)) K curve-y
2 TR-7,PR-1 "5–x" → L "5-x" T (sub (num 5) (id x))
3 TR-7,PR-1 "3\times4" → L "3\cdot4" T (mul (num 3) (num 4)) D "12"
4 TR-7,PR-1 "2×5" → L "2\cdot5" T (mul (num 2) (num 5)) D "10"
5 TR-7,PR-1 "4·x" → L "4\cdot x" T (mul (num 4) (id x))
6 TR-7,PR-1 "8÷2" → L "8\div2" T (div (num 8) (num 2)) D "4"
7 TR-7,PR-1 "\dfrac{1}{2}x" → L "\frac{1}{2}x" T (mul (div (num 1) (num 2)) (id x))
8 TR-7,PR-1,PR-44 "\tfrac{3}{4}" → L "\frac{3}{4}" T (div (num 3) (num 4)) K value D "0.75"
9 TR-7,PR-1 "x\leq5" → L "x\le5" T (rel <= (id x) (num 5)) K region
10 TR-7,PR-1 "y\geq2x" → L "y\ge2x" T (rel >= (id y) (mul (num 2) (id x))) K region
11 TR-7,PR-1,PR-44 "x≤3" → L "x\le3" T (rel <= (id x) (num 3)) K region
12 TR-7,PR-1 "y≥x" → L "y\ge x" T (rel >= (id y) (id x))
13 TR-7,PR-1 "\displaystyle\frac{1}{2}" → L "\frac{1}{2}" T (div (num 1) (num 2))
14 TR-7,PR-1 "\big(x+1\big)" → L "(x+1)" T (add (id x) (num 1))
15 TR-7,PR-1 "2\,x\;+\:1\!" → L "2x+1" T (add (mul (num 2) (id x)) (num 1))
16 TR-7,PR-1 "x\text{ }=\text{ }5" → L "x=5" T (rel = (id x) (num 5)) K vertical-lines
17 TR-7,PR-5 "30{,}000" → L "30000" T (num 30000) D "30000"
18 PR-5 "1{,}250" → L "1250" T (num 1250) D "1250"
19 PR-5 "(1,250)" → L "(1,250)" T (point (num 1) (num 250)) K point
20 TR-7,PR-1 "y=x²" → L "y=x^{2}" T (rel = (id y) (pow (id x) (num 2))) K curve-y
21 TR-7 "x³" → L "x^{3}" T (pow (id x) (num 3))
22 TR-7,TR-77 "2πr" → L "2\pi r" T (mul (mul (num 2) (const pi)) (id r)) E unsupported
23 TR-7,TR-77 "2θ" → L "2\theta" T (mul (num 2) (id \theta)) E unsupported
24 TR-7,PR-1 "√(x+1)" → L "\sqrt{x+1}" T (root (add (id x) (num 1))) K curve-y
25 TR-7,PR-1 "3/4" → L "\frac{3}{4}" T (div (num 3) (num 4)) D "0.75"
26 TR-7,PR-1 "0.\overline{3}" → L "\frac{1}{3}" T (div (num 1) (num 3)) D "0.333333333333"
27 TR-7 "0.1\overline{6}" → L "\frac{1}{6}" D "0.166666666667"
28 TR-7 "1.\overline{3}" → L "\frac{4}{3}" D "1.33333333333"
29 TR-7 "0.\overline{9}" → L "1" T (num 1)
30 TR-7,PR-44 "0.\overline{3}x" → L "\frac{1}{3}x" T (mul (div (num 1) (num 3)) (id x)) K curve-y
31 TR-7,PR-1 "|x-3|" → L "\left|x-3\right|" T (abs (sub (id x) (num 3))) K curve-y
32 TR-7 "2|x|+1" → L "2\left|x\right|+1" T (add (mul (num 2) (abs (id x))) (num 1))
33 TR-7 "y=2x+3." → L "y=2x+3" K curve-y
34 TR-7 "x=5," → L "x=5"
35 TR-7 "x>4;" → L "x>4" K region
36 TR-7,TR-28,PR-6 "2 1/2" → L "\left(2+\frac{1}{2}\right)" T (add (num 2) (div (num 1) (num 2))) D "2.5"
37 TR-28,PR-6,PR-44 "2\frac{1}{2}" → L "\left(2+\frac{1}{2}\right)" T (add (num 2) (div (num 1) (num 2))) K value D "2.5"
38 TR-28,PR-6 "-2\frac{1}{2}" → L "-\left(2+\frac{1}{2}\right)" T (neg (add (num 2) (div (num 1) (num 2)))) D "-2.5"
39 TR-28,PR-6 "x+3\frac{1}{4}" → L "x+\left(3+\frac{1}{4}\right)" T (add (id x) (add (num 3) (div (num 1) (num 4))))
40 TR-28,PR-6,PR-1 "2\frac{1}{2}" [cell] → L "\frac{5}{2}" T (div (num 5) (num 2)) D "2.5"
41 TR-28,PR-6 "-2\frac{1}{2}" [coordinate] → L "-\frac{5}{2}" T (neg (div (num 5) (num 2))) D "-2.5"
42 PR-6 "2\frac{3}{2}" → L "2\frac{3}{2}" T (mul (num 2) (div (num 3) (num 2))) D "3"
43 PR-6 "2.5\frac{1}{2}" → L "2.5\frac{1}{2}" T (mul (num 2.5) (div (num 1) (num 2))) D "1.25"
44 PR-6 t "2\frac{1}{2}" → T (mul (num 2) (div (num 1) (num 2))) D "1"
45 PR-44,TR-11,TR-26 "y=2x+3" → L "y=2x+3" T (rel = (id y) (add (mul (num 2) (id x)) (num 3))) K curve-y
46 PR-44,TR-13 "P(t)=500(1.03)^{t}" → T (rel = (call P (id t)) (mul (num 500) (pow (num 1.03) (id t)))) K function-definition
47 PR-44,TR-13,TR-26 "3p+4=19" → T (rel = (add (mul (num 3) (id p)) (num 4)) (num 19)) K unsolved-relation C [p]
48 PR-44,TR-11 "2x" → T (mul (num 2) (id x)) K curve-y
49 PR-44,TR-11 "\sqrt{50}" → T (root (num 50)) K value D "7.07106781187"
50 PR-44,TR-11 "2^{10}" → T (pow (num 2) (num 10)) K value D "1024"
51 PR-44,TR-11,TR-26 "y>2x+1" → T (rel > (id y) (add (mul (num 2) (id x)) (num 1))) K region
52 PR-44,TR-11 "-2<x\le5" → T (rel (< <=) (neg (num 2)) (id x) (num 5)) K region
53 PR-44,TR-11 "y\le-x+4" → T (rel <= (id y) (add (neg (id x)) (num 4))) K region
54 PR-44,TR-11,TR-26 "3p+4>19" → T (rel > (add (mul (num 3) (id p)) (num 4)) (num 19)) K unsolved-relation C [p]
55 PR-44,TR-14 "(x-2)^2+(y+1)^2=9" → T (rel = (add (pow (sub (id x) (num 2)) (num 2)) (pow (add (id y) (num 1)) (num 2))) (num 9)) K implicit
56 PR-44,TR-13 "C=8h+15" → T (rel = (id C) (add (mul (num 8) (id h)) (num 15))) K definition C [h]
57 PR-44,TR-26 "3>2" → T (rel > (num 3) (num 2)) K constant-relation
58 PR-44,TR-12 "y=2x" → T (rel = (id y) (mul (num 2) (id x))) K curve-y
59 PR-44,TR-12 "y=x+1" → T (rel = (id y) (add (id x) (num 1))) K curve-y
60 PR-44,TR-12 "y\ge x^{2}" → T (rel >= (id y) (pow (id x) (num 2))) K region
61 PR-44,TR-12 "y<4" → T (rel < (id y) (num 4)) K region
62 PR-44,TR-77 "A=\pi r^{2}" → T (rel = (id A) (mul (const pi) (pow (id r) (num 2)))) K dependent-definition
63 PR-44,TR-37 "g(x)=f(x)+3" [rows: f(x)=x^{2}] → T (rel = (call g (id x)) (add (call f (id x)) (num 3))) K function-definition
64 PR-44,TR-37 "f(x)=x^{2}" → T (rel = (call f (id x)) (pow (id x) (num 2))) K function-definition
65 PR-44,TR-12 "2x+y=5" → T (rel = (add (mul (num 2) (id x)) (id y)) (num 5)) K implicit
66 PR-44,TR-12 "x-y=1" → T (rel = (sub (id x) (id y)) (num 1)) K implicit
67 PR-44,TR-14 "x^{2}+y^{2}=25" → T (rel = (add (pow (id x) (num 2)) (pow (id y) (num 2))) (num 25)) K implicit
68 PR-44,TR-13 "2x+3y=6" → T (rel = (add (mul (num 2) (id x)) (mul (num 3) (id y))) (num 6)) K implicit
69 PR-44,TR-13 "y=2(x-3)^{2}+1" → T (rel = (id y) (add (mul (num 2) (pow (sub (id x) (num 3)) (num 2))) (num 1))) K curve-y
70 PR-44,TR-37 "y=kx+1" [rows: k=3] → T (rel = (id y) (add (mul (id k) (id x)) (num 1))) K curve-y
71 PR-44,TR-37 "k=3" → T (rel = (id k) (num 3)) K definition
72 PR-44,TR-18 "y=a(x+3)" → T (rel = (id y) (mul (id a) (add (id x) (num 3)))) K curve-y C [a]
73 PR-44,TR-37 "y=f(x)+1" [rows: f(x)=x^{2}] → T (rel = (id y) (add (call f (id x)) (num 1))) K curve-y
74 PR-44,TR-36 "x_{1}=2" → T (rel = (id x_{1}) (num 2)) K definition
75 PR-44,TR-11 "1<y<3" → T (rel (< <) (num 1) (id y) (num 3)) K region
76 PR-44,TR-12 "y=2x+1" → T (rel = (id y) (add (mul (num 2) (id x)) (num 1))) K curve-y
77 PR-44,TR-12 "y>x" → T (rel > (id y) (id x)) K region
78 PR-44,TR-77 "C=2\pi r" → T (rel = (id C) (mul (mul (num 2) (const pi)) (id r))) K dependent-definition
79 PR-44,TR-37 "y=f(x)+2" [rows: f(x)=x^{2}] → T (rel = (id y) (add (call f (id x)) (num 2))) K curve-y
80 PR-44,TR-37 "y=kx" → T (rel = (id y) (mul (id k) (id x))) K curve-y C [k]
81 PR-44,TR-40 "y = 2x + 3" → L "y = 2x + 3" T (rel = (id y) (add (mul (num 2) (id x)) (num 3))) K curve-y
82 PR-44,TR-1 "f(x) = \dfrac{1}{2}(x + 11)" → L "f(x) = \frac{1}{2}(x + 11)" T (rel = (call f (id x)) (mul (div (num 1) (num 2)) (add (id x) (num 11)))) K function-definition
83 PR-44,TR-10 "x" → T (id x) K curve-y
84 PR-44,TR-10 "5" → T (num 5) K value D "5"
85 PR-44,TR-10 "-5" → T (neg (num 5)) K value D "-5"
86 PR-44,TR-10 "3.25" → T (num 3.25) K value D "3.25"
87 PR-44,TR-10 "x_{1}" → T (id x_{1}) K value C [x_{1}]
88 PR-44,TR-10 "a_{n}" → T (id a_{n}) K value C [a_{n}]
89 PR-44,TR-10 "x^{2}" → T (pow (id x) (num 2)) K curve-y
90 PR-44,TR-10 "x^{-1}" → T (pow (id x) (neg (num 1))) K curve-y
91 PR-44,TR-10 "f(x)" → T (mul (id f) (id x)) K curve-y C [f]
92 PR-44,TR-10 "x^{\frac{1}{2}}" → L "x^{\frac{1}{2}}" T (pow (id x) (div (num 1) (num 2))) K curve-y
93 PR-44,TR-10 "y^{-\frac{2}{3}}" → L "y^{-\frac{2}{3}}" T (pow (id y) (neg (div (num 2) (num 3)))) K curve-x
```

In the file, write LaTeX with doubled backslashes (`"3\\times4"`), each case on one line, under 700 lines.

- [ ] **Step 3: Run** `n exec 22 npx vitest run src/lib/calculator-transfer/normalize.test.ts src/lib/calculator-transfer/question-dialect.corpus.test.ts`. Expected: FAIL, `Failed to resolve import "./normalize"`.
- [ ] **Step 4: Implement `normalizeQuestionMath`** as passes over the trimmed input, with `plain = isPlainMathText(input)` computed first:
  1. One left-to-right scanner (decision 3) maps `−`, `–` to `-`; `×`, `·`, `\times` to `\cdot`; `÷` to `\div`; `\dfrac`, `\tfrac` to `\frac`; `\leq`, `≤` to `\le`; `\geq`, `≥` to `\ge`; `²`, `³` to `^{2}`, `^{3}`; `π`, `θ` to `\pi`, `\theta`; and removes `\displaystyle`, `\big \Big \bigg \Bigg` with an optional `l`, `r` or `m` suffix, `\,` `\;` `\:` `\!` `\quad`, and `\text{…}` whose content is only spaces.
  2. `{,}` between digits: `/(\d)\{,\}(?=\d)/g` → `$1`.
  3. `√(` with its balanced `)` → `\sqrt{…}`, repeated until none remains (unbalanced: left as is).
  4. When `plain`: `a b/c` → `a\frac{b}{c}`, then `a/b` → `\frac{a}{b}`, with decision 2's guards.
  5. `(\d*)\.(\d*)\\overline\{(\d+)\}` → the exact fraction: with integer part A, fixed digits B and repeating digits C, numerator `(A·10^|B| + B)·(10^|C| − 1) + C` over `10^|B|·(10^|C| − 1)`, reduced by the gcd; written `\frac{n}{d}`, or `n` when `d = 1`; left unchanged when the digits exceed 15.
  6. Raw `|` (not part of `\left|`, `\right|` or `\|`) pairs by PR-21 as 02's G11 reads it: scanning left to right with a stack of open bars, a raw bar closes the innermost open bar only when one is open and the bar does not follow an operator (`+ - * / ^`, `\cdot`, `\div`), a relation (`= < >`, `\le`, `\ge`), `(`, `[`, `{`, `,` or an opening bar; otherwise it opens. Paired bars become `\left|`, `\right|` (`2|x|+1`, `|x||y|`, `||x|-1|`); an input left with an open bar keeps all its raw bars (`x|y`).
  7. One trailing `,` `.` `;` or `:` is removed, then the result is trimmed.
  8. PR-6 at decision 12's positions: an integer `a` (a maximal digit run, no `.` beside it), optional spaces (D1), `\frac{b}{c}` with integer literals `0 < b < c`, where the text before `a` is empty or ends with `+ - * / = < > , ( [ {`, `\cdot`, `\div`, `\le` or `\ge` (so never `^` or `_`), becomes `\left(a+\frac{b}{c}\right)` for `"math"` and `\frac{a·c+b}{c}` for `"cell"` and `"coordinate"`; a sign before `a` stays where it is. The braced `\frac{b}{c}` is the only spelling matched (D3).
- [ ] **Step 5: Run** the Step 3 command, then `n exec 22 npx vitest run src/lib/calculator-v2/core/corpus`. Expected: PASS; 02's runner and 04's runner pick up case 44, and this runner picks up `sat-forms-35` to `sat-forms-37`.
- [ ] **Step 6: Commit** `git add src/lib/calculator-transfer src/lib/calculator-v2/core/corpus/cases/question-dialect.ts docs/superpowers/specs/calculator-v2/a-math-semantics.md && git commit -m "Normalise question-dialect math for transfer and add its corpus (TR-7, TR-28, PR-1, PR-5, PR-6, OI-6)"`.
