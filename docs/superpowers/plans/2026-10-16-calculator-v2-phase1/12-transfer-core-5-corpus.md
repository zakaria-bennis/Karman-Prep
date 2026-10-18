# 12 transfer-core, part 5 of 5: quiz host entry, transfer corpus, one-parser check and package gate (Tasks 11 to 14)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 5 of 5 of package `12-transfer-core.md`, which holds the package header, Conventions
(test helpers `REAL`, `stem`, `N`, `verdicts`, `rowsOf`, `P`, `seeded`, `latexOf`, `analysed`),
Decisions, Deliberate deviations, Preconditions and the ID coverage; they apply to every task
here. Tasks run in number order across the five parts. `ct/` is `src/lib/calculator-transfer/`,
`tr/` is `src/components/calculator-v2/transfer/` and `cases/` is `src/lib/calculator-v2/core/corpus/cases/`.

---

### Task 11: Quiz host transfer entry (TR-71)

**Files:** Modify `src/components/calculator-v2/host/quiz-host.ts` (extension edit, `00-index.md` 5.2); Test `tr/quiz-host-transfer.test.ts`.

**Interfaces:**

- Consumes: Task 9's `applyTransfer(target: TransferTarget, payload: unknown, trigger: TransferTrigger): Extract<TransferResult, { status: "added" | "renamed" | "already-present" | "rejected" }>`;
  Task 1's `TransferResult`, `TransferTrigger`; 10's (`01-interfaces-integration.md` section 12)
  `mountQuizCalculator(options: QuizMountOptions): QuizCalculatorHandle`, with
  `QuizMountOptions` (`{ element: HTMLElement; frame: HTMLElement; chromeSlot: HTMLElement; reducedMotion: boolean; announceReset: boolean }`)
  and `QuizCalculatorHandle` (`readonly calculator: KarmanCalculator; focusOnOpen(trigger: OpenTrigger): void; focusBoundary(edge: "first" | "last"): void; setReducedMotion(value: boolean): void; reflow(): void; destroy(): void`).
- Produces: `QuizCalculatorHandle` gains `applyTransfer(payload: unknown, trigger: TransferTrigger): TransferResult; // added by 12-transfer-core`.

- [ ] **Step 1: Write the failing tests** (`// @vitest-environment jsdom`; mocks as 10's `host/quiz-host.test.ts`, plus `./apply`):

```ts
const h = vi.hoisted(() => ({
  instance: null as unknown,
  apply: vi.fn(() => ({
    status: "added",
    message: "Added to calculator: y = x.",
    focusRowId: "1",
  })),
}));
vi.mock("../KarmanCalculator", () => ({
  KarmanCalculator: class {
    engine = {};
    constructor() {
      h.instance = this;
    }
    getExpressions() {
      return [{ id: "1" }];
    }
    destroy() {
      return undefined;
    }
  },
  lastFocusedRow: () => null,
}));
vi.mock("@/components/calculator/report-error", () => ({ reportCalculatorError: vi.fn() }));
vi.mock("../ui/hooks/dev-hooks", () => ({ exposeEngineForTests: () => () => undefined }));
vi.mock("./apply", () => ({ applyTransfer: h.apply }));
it("TR-71 the quiz handle applies a bridge payload through transfer/apply.ts with the mounted calculator as target", () => {
  const div = () => document.createElement("div");
  const handle = mountQuizCalculator({
    element: div(),
    frame: div(),
    chromeSlot: div(),
    reducedMotion: false,
    announceReset: false,
  });
  const payload = { version: 1 };
  expect(handle.applyTransfer(payload, "touch")).toEqual({
    status: "added",
    message: "Added to calculator: y = x.",
    focusRowId: "1",
  });
  expect(h.apply).toHaveBeenCalledWith(h.instance, payload, "touch");
});
it("TR-71 transfer/apply.ts is imported only by the quiz host among non-test modules", () => {
  const importers = sourceFiles("src").filter(
    (f) =>
      !/\.test\.tsx?$|__fixtures__/.test(f) &&
      /from "[^"]*transfer\/apply"/.test(readFileSync(f, "utf8"))
  );
  expect(importers).toEqual(["src/components/calculator-v2/host/quiz-host.ts"]);
});
```

`sourceFiles(dir)` lists `.ts`/`.tsx` files under `dir` recursively as repo-relative POSIX paths.

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/components/calculator-v2/transfer/quiz-host-transfer.test.ts`. Expected: FAIL, both tests: the first with `TypeError: handle.applyTransfer is not a function`; the second on its assertion, receiving `[]` where `["src/components/calculator-v2/host/quiz-host.ts"]` is expected.
- [ ] **Step 3: Implement.** In `quiz-host.ts` add `import { applyTransfer as applyTransferPayload } from "../transfer/apply";` and type imports of `TransferResult`, `TransferTrigger` from `@/lib/calculator-transfer/payload`; add the member to `QuizCalculatorHandle`; in the returned handle `applyTransfer: (payload, trigger) => applyTransferPayload(calculator, payload, trigger)`. Pass `calculator` itself (never `calculator.<member>`), so 10's AR-35 test still passes and `focusExpression` moves DOM focus (TR-66).
- [ ] **Step 4: Run** the Step 2 command and `n exec 22 npx vitest run src/components/calculator-v2/host`. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/components/calculator-v2 && git commit -m "Expose transfer application on the quiz calculator handle (TR-71)"`.

### Task 12: Transfer corpus fixtures (TR-79, PR-44)

**Files:** Create `ct/__fixtures__/types.ts`, `index.ts`, `exclusions.ts`, `lone-symbols.ts`, `sat-forms.ts`, `inequalities.ts`, `phase-blocks.ts`, `functions.ts`, `collisions.ts`; Test `ct/transfer-corpus.test.ts`.

**Interfaces:**

- Consumes:
  - Task 3: `normalizeQuestionMath(latex: string, context: "math" | "cell" | "coordinate"): string`.
  - Tasks 6 to 8: `explainStem(stem: StemInput): ReadonlyMap<number, SegmentVerdict>`,
    `explainChoice(choice: ChoiceInput, stem: StemInput | null): SegmentVerdict`, `SegmentVerdict`,
    `TransferItemKind`.
  - Tasks 9 and 10: `applyTransfer(target: TransferTarget, payload: unknown, trigger: TransferTrigger): Extract<TransferResult, { status: "added" | "renamed" | "already-present" | "rejected" }>`.
  - 02: `CORPUS: readonly CorpusCase[]`; `parseLatex(input: string, options?: ParseOptions): ParseResult`;
    `functionDefinitionHead(input: string): { name: string; params: string[] } | null`; `toSExpr(tree: Node): string`.
  - 04: `analyzeRows(rows: readonly RowSource[], settings: AnalysisSettings): AnalysisResult` (`RowAnalysis.kind`, `RowAnalysis.error`).
  - 07, through Conventions' `seeded`: `createTestEngine(options?: CalculatorOptions, config?: { backend?: "fake" | "main-thread"; randomSeeds?: number[] }): TestEngine`.
  - Fixture files import only `./types` and the `TransferItemKind` type.
- Produces:

```ts
// __fixtures__/types.ts
export type FixtureSource =
  | { kind: "stem"; text: string; segment: number; serializedFunctionLines?: boolean }
  | { kind: "choice"; letter: string; text: string; stem?: string };
export type FixtureExpect =
  | { control: false; rule: string }
  | {
      control: true;
      kind: TransferItemKind;
      rows: string[];
      dependencies?: string[];
      corpus: string[]; // one question-dialect case id per row
      status: "added" | "renamed" | "already-present" | "rejected";
      inserted: string[];
    }; // the whole list after apply
export interface TransferFixture {
  id: string;
  rules: string[];
  source: FixtureSource;
  calculator?: string[];
  expect: FixtureExpect;
}
// __fixtures__/index.ts
export const FIXTURE_FILES: Readonly<Record<string, readonly TransferFixture[]>>; // the seven files of the category map, in the fixture list's order
export const TRANSFER_FIXTURES: readonly TransferFixture[];
```

Category map. TR-79 asks for one file per required corpus category of `c-transfer.md` section
14, and that list says Phase 3 categories are added when TR-77 enables them, so Phase 1 commits
the Phase 1 categories. Two choices here are deliberate. The first category is split into
`exclusions.ts` and `lone-symbols.ts` because its two halves have different shapes: the TR-8 and
TR-9 strings only ever block and are generated from two string arrays, while each TR-10 form
blocks in the stem, inserts as a choice and names a corpus case. And `functions.ts` is an extra
file for question function names, calls and dependencies (TR-18 to TR-20, TR-37), which no
listed category covers.

| Required category (section 14)                                    | Phase              | File                                                          |
| ----------------------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| Every TR-9 exclusion and TR-10 lone-symbol form, also as a choice | 1                  | `exclusions.ts` (TR-9, TR-8 extras), `lone-symbols.ts`        |
| Common SAT forms                                                  | 1                  | `sat-forms.ts`                                                |
| Inequalities, compound, mixed chains, systems and mixed systems   | 1                  | `inequalities.ts`                                             |
| Phase 1 polar and parametric blocks (TR-77)                       | 1                  | `phase-blocks.ts`                                             |
| Pairs, several pairs, intervals, symbolic pairs, labelled points  | 3 (TR-15, TR-16)   | deferred (Phase 1's blocked pairs are in `phase-blocks.ts`)   |
| `f(2)=5` and its variants                                         | 3 (TR-17)          | deferred (Phase 1's blocked `f(2)=5` is in `phase-blocks.ts`) |
| Section 5 table rows, `30,000`, blank cell, nine-column table     | 3 (TR-22 to TR-25) | deferred                                                      |
| Collisions: existing `x_{1}`, second `f`, repeat transfers        | 1                  | `collisions.ts`                                               |
| Collisions: regression on `y_{1}`, point-table appends            | 3 (D-2, TR-34)     | deferred                                                      |
| None: question function names, calls and dependencies (extra)     | 1                  | `functions.ts`                                                |

Fixtures (ids `<file>-<n>`; `$L$` stem means `{ kind: "stem", text: "$L$", segment: 0 }`; "as choice" adds the same as `{ kind: "choice", letter: "B", text: "$L$" }` with kind `choice`; `qd-n` is `question-dialect-n`; an allowed fixture with no calculator inserts exactly its rows after its dependencies):

- `exclusions.ts` (TR-8, TR-9): every Task 4 TR-9 string and `\Delta x`, `\tau+1`, `\operatorname{abs}(x)`, `3!`, `\lvert x\rvert` (TR-8), each as `$L$` stem and as choice, blocked with its rule (the file builds these from two string arrays); allowed: `$x\le3$` stem (inequality, rows `x\le3`, qd-11) and as choice; `$0.\overline{3}x$` stem (expression, `\frac{1}{3}x`, qd-30).
- `lone-symbols.ts` (TR-10, TR-40): `x`, `5`, `-5`, `3.25`, `\frac{3}{4}`, `2\frac{1}{2}`, `x_{1}`, `a_{n}`, `x^{2}`, `x^{-1}`, `x^{\frac{1}{2}}`, `y^{-\frac{2}{3}}`, `f(x)` blocked TR-10 as stem and allowed as choice (rows the normalised form; qd-83, 84, 85, 86, 8, 37, 87, 88, 89, 90, 92, 93, 91); allowed stems `$2x$` (qd-48), `$\sqrt{50}$` (qd-49), `$2^{10}$` (qd-50); plain choice `−5` (qd-85).
- `sat-forms.ts` (TR-11 to TR-14, TR-26, TR-27): stems `$y=2x+3$` (qd-45), `$2x+3y=6$` (qd-68), `$y=2(x-3)^{2}+1$` (qd-69), `$P(t)=500(1.03)^{t}$` (function, qd-46), `$C=8h+15$` (qd-56), `$3p+4=19$` (qd-47), `$(x-2)^2+(y+1)^2=9$` (qd-55), `$x^{2}+y^{2}=25$` (qd-67); systems `$\begin{cases}y=2x\\y=x+1\end{cases}$` (qd-58, 59) and `$\begin{aligned}2x+y&=5\\x-y&=1\end{aligned}$` (qd-65, 66); blocked `$f(x)=\begin{cases}x&x<0\\2x&x\ge0\end{cases}$` TR-12; choice `$y=2x+3$` (qd-45) and plain choice `y = 2x + 3` (qd-81); the serialized stem of Task 6 at segment 1 with `serializedFunctionLines: true` (function, qd-82).
- `inequalities.ts` (TR-11, TR-12, TR-26, PR-44): `$y>2x+1$` (qd-51), `$y\le-x+4$` (qd-53), `$3p+4>19$` (qd-54), `$-2<x\le5$` (qd-52), `$1<y<3$` (qd-75), system `$\begin{cases}y\ge x^{2}\\y<4\end{cases}$` (qd-60, 61), mixed system `$\left\{\begin{array}{l}y=2x+1\\y>x\end{array}\right.$` (qd-76, 77); blocked `$0<x>2$` and `$x=y<3$` (TR-11) and `$\begin{cases}y=2x\\0<y>2\end{cases}$` (TR-11); each also as choice.
- `phase-blocks.ts` (TR-77): blocked `$2\pi r$`, `$\sin\theta=\frac{3}{5}$`, `$(\cos t,\sin t)$`, `$\sinh x$`, `$y=\cosh(x)$`, `$\tanh2$`, `$(2,5)$`, `$(1,2),(3,4)$`, `$r=5$`, `$P=(t,2)$` (a point on a `t` no row defines); stem "The linear function $f$ has $f(2)=5$." segment 3 and stem "If $A=\pi r^{2}$, find $y=A$." segment 3, all TR-77; allowed `$A=\pi r^{2}$` (qd-62) and `$C=2\pi r$` (qd-78).
- `functions.ts` (TR-18 to TR-20, TR-37): stem "The function $f$ is defined by $f(x)=x^{2}$. Graph $y=f(x)+1$." segment 1 blocked TR-10, segment 3 allowed (function, qd-64), segment 5 allowed (deps `f(x)=x^{2}`, qd-73); "For the function $f$, graph $y=f(x)$." segment 3 TR-20; "If $f(x)=2x$ or $f(x)=3x$, graph $y=f(x)$." segment 5 TR-20; "Graph $y=a(x+3)$." segment 1 (qd-72); "For functions $f$ and $g$, $f(x)=x^{2}$ and $g(x)=f(x)+3$." segment 7 (deps `f(x)=x^{2}`, qd-63); "If $k=3$, graph $y=kx+1$." segment 3 (deps `k=3`, qd-70); "If $k=3$ or $k=5$, graph $y=kx+1$." segment 5 (no deps, qd-70); `$f(x)=f(x-1)+1$` TR-21; choices `$y=f(x)+2$` with stem "The function $f$ is defined by $f(x)=x^{2}$." (deps, qd-79), `$y=g(x)$` with stem "the function $g$" (TR-20), `$y=kx$` with no stem (qd-80).
- `collisions.ts` (TR-35 to TR-37, TR-73), each `corpus` naming one case per payload row: calculator `x_{1}=4` + `$x_{1}=2$` → renamed, inserted `x_{1}=4`, `x_{2}=2` (qd-74); calculator `f(x)=3x` + `$f(x)=x^{2}$` → renamed, `f(x)=3x`, `f_{2}(x)=x^{2}` (qd-64); calculator `f(x)=3x` + the functions.ts stem at segment 5 → added, `f(x)=3x`, `y=f(x)+1` (qd-73); calculator `y=2x+3` + `$y=2x+3$` → already-present, `y=2x+3` (qd-45); calculator `f(x)=3x`, `f_{2}(x)=x^{2}` + `$f(x)=x^{2}$` → already-present, `f(x)=3x`, `f_{2}(x)=x^{2}` (qd-64); calculator `y=kx` + "If $k=3$, graph $y=kx+1$." segment 3 → added, `y=kx`, `y=kx+1` (qd-70); calculator `"y=x", ""` + `$y=2x+3$` → added, `y=x`, `y=2x+3` (OI-22; qd-45); calculator `a=b` + choice `$b=a$` → rejected, inserted `a=b`, `corpus: []` (rejected fixtures are the only ones with an empty `corpus`); blocked `$x_{1}\ne2$` TR-9.

- [ ] **Step 1: Write `__fixtures__/types.ts` and the failing runner** (`ct/transfer-corpus.test.ts`, which imports `FIXTURE_FILES` and `TRANSFER_FIXTURES` from `./__fixtures__`; the fixture files and `index.ts` come in Step 3):

```ts
function verdictOf(f: TransferFixture): SegmentVerdict {
  const s = f.source;
  if (s.kind === "choice")
    return explainChoice(
      { letter: s.letter, text: s.text },
      s.stem === undefined ? null : { text: s.stem, serializedFunctionLines: false }
    );
  return (
    explainStem({ text: s.text, serializedFunctionLines: s.serializedFunctionLines ?? false }).get(
      s.segment
    ) ?? { rule: "none", detail: "no math segment" }
  );
}
describe("transfer corpus", () => {
  for (const f of TRANSFER_FIXTURES)
    it(`TR-79, ${f.rules.join(", ")} ${f.id}`, () => {
      const v = verdictOf(f);
      if (!f.expect.control) return void expect("rule" in v ? v.rule : "item").toBe(f.expect.rule);
      if (!("item" in v)) throw new Error(`${f.id}: ${v.rule} ${v.detail}`);
      expect([v.item.kind, v.item.payload.rows, v.item.payload.dependencies]).toEqual([
        f.expect.kind,
        f.expect.rows,
        f.expect.dependencies ?? [],
      ]);
      const e = seeded(f.calculator ?? []);
      expect(
        applyTransfer(e, { ...v.item.payload, questionKey: "fixture:q" }, "mouse").status
      ).toBe(f.expect.status);
      expect(latexOf(e)).toEqual(f.expect.inserted);
      expect(analysed(e).rows.map((r) => r.error?.code ?? null)).toEqual(
        f.expect.inserted.map(() => null)
      );
    });
  for (const f of TRANSFER_FIXTURES)
    if (f.expect.control && f.expect.status !== "rejected")
      it(`PR-44 ${f.id} rows parse to their corpus case trees and kinds`, () => {
        const want = f.expect as Extract<FixtureExpect, { control: true }>;
        want.rows.forEach((row, i) => {
          const c = CORPUS.find((k) => k.id === want.corpus[i]);
          if (!c || !("question" in c.input)) throw new Error(`${f.id}: corpus ${want.corpus[i]}`);
          expect(normalizeQuestionMath(c.input.question, c.input.context ?? "math")).toBe(row);
          const heads = new Set(
            [...(c.rows ?? []), row].flatMap((r) => functionDefinitionHead(r)?.name ?? [])
          );
          const r = parseLatex(row, { userFunctions: heads });
          expect(r.ok && toSExpr(r.tree)).toBe(c.tree);
          const a = analyzeRows(
            [...(c.rows ?? []), row].map((l, k) => ({ id: `r${k}`, latex: l, hidden: false })),
            REAL
          );
          expect(a.rows[a.rows.length - 1].kind).toBe(c.kind);
        });
      });
  it("TR-79 the seven files of the category map, in the fixture list's order, each under 700 lines with allowed and blocked outcomes", () => {
    expect(Object.keys(FIXTURE_FILES)).toEqual([
      "exclusions",
      "lone-symbols",
      "sat-forms",
      "inequalities",
      "phase-blocks",
      "functions",
      "collisions",
    ]);
    const ids = new Set<string>();
    for (const [name, list] of Object.entries(FIXTURE_FILES)) {
      expect(
        readFileSync(`src/lib/calculator-transfer/__fixtures__/${name}.ts`, "utf8").split("\n")
          .length
      ).toBeLessThan(700);
      expect(list.some((f) => f.expect.control) && list.some((f) => !f.expect.control), name).toBe(
        true
      );
      for (const f of list) {
        expect(f.id.startsWith(`${name}-`)).toBe(true);
        expect(ids.has(f.id)).toBe(false);
        ids.add(f.id);
      }
    }
    expect(ids.size).toBeGreaterThan(200);
  });
});
```

The PR-44 loop skips rejected fixtures, whose `corpus` is `[]`; every other `control: true`
fixture names one corpus id per row (the lists above), and a missing id throws.

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-transfer/transfer-corpus.test.ts`. Expected: FAIL, `Failed to resolve import "./__fixtures__" from "src/lib/calculator-transfer/transfer-corpus.test.ts"` (no `index.ts` yet).
- [ ] **Step 3: Write the seven fixture files and `__fixtures__/index.ts`** as listed above; `index.ts` builds `FIXTURE_FILES` in the listed order and `TRANSFER_FIXTURES` as `Object.values(FIXTURE_FILES).flat()`.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS, since the code under test is Tasks 3 to 11, already merged. A failure is a defect in the owning task's module (fix it there, in this task's commit, naming the ID) unless the fixture contradicts the spec, in which case the fixture is corrected.
- [ ] **Step 5: Commit** `git add src/lib/calculator-transfer && git commit -m "Add the transfer fixture corpus run through classify, payload and apply (TR-79, PR-44)"`.

### Task 13: One parser for typed, API and paste input (PR-1)

Verification task (the gate rule 00-index section 2 states for 15): the code under test is 02's
parser, 04's analysis, 05's speech text and 07's engine, all merged in 1A, so the tests are
expected to PASS on first run and there is no failing run. A failure is a defect in that package:
stop, report the failing LaTeX to the lead, and do not edit that package's files (00-index
section 4). Task 3's PR-1 test covers question dialect; precondition P2's 13 contribution covers
the paste path.

**Files:** Create `ct/one-parser.test.ts` (node).

**Interfaces:**

- Consumes: 07's `createTestEngine(options?: CalculatorOptions, config?: { backend?: "fake" | "main-thread"; randomSeeds?: number[] }): TestEngine`
  (`engine: CalculatorEngine`, `flushFrames(): void`) and `CalculatorEngine.setExpressions(list: ExpressionState[]): void`,
  `getSnapshot(): EngineSnapshot`; 04's `analyzeRows(rows: readonly RowSource[], settings: AnalysisSettings): AnalysisResult`
  (`AnalysisResult.byId: ReadonlyMap<string, RowAnalysis>`, `RowAnalysis.tree: Node | null`), `RowSource`,
  `AnalysisSettings`; 02's `parseLatex(input: string, options?: ParseOptions): ParseResult`,
  `functionDefinitionHead(input: string): { name: string; params: string[] } | null`, `toSExpr(tree: Node): string`.
- Produces: nothing.

- [ ] **Step 1: Write the tests** (`sourceFiles(dir)` as in Task 11, without `*.test.ts(x)` and `__fixtures__` files):

```ts
const spy = vi.hoisted(() => ({ results: [] as AnalysisResult[] }));
vi.mock("@/lib/calculator-v2/core/analysis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/calculator-v2/core/analysis")>();
  return {
    ...actual,
    analyzeRows: (rows: readonly RowSource[], settings: AnalysisSettings) => {
      const result = actual.analyzeRows(rows, settings);
      spy.results.push(result);
      return result;
    },
  };
});
const LATEX = [
  "y=2x+3",
  "f(x)=x^{2}",
  "y=f(x)+1",
  "a=2",
  "y=a(x+3)",
  "\\left|x-3\\right|",
  "\\frac{1}{2}x",
  "-2<x\\le5",
  "(1,250)",
  "2\\cdot5\\div x",
  "\\sqrt{x+1}",
  "\\sin^{-1}x",
];
it("PR-1 API input analysed by the engine has exactly the tree parseLatex gives the same LaTeX", () => {
  const t = createTestEngine();
  t.engine.setExpressions(LATEX.map((latex, i) => ({ id: String(i + 1), latex })));
  t.flushFrames();
  t.engine.getSnapshot();
  const ids = LATEX.map((_, i) => String(i + 1));
  const result = [...spy.results].reverse().find((r) => ids.every((id) => r.byId.has(id)));
  if (!result) throw new Error("the engine never analysed the rows");
  const userFunctions = new Set(LATEX.flatMap((l) => functionDefinitionHead(l)?.name ?? []));
  LATEX.forEach((latex, i) => {
    const parsed = parseLatex(latex, { userFunctions });
    if (!parsed.ok) throw new Error(`${latex}: ${parsed.error.code}`);
    const tree = result.byId.get(ids[i])?.tree;
    expect(tree ? toSExpr(tree) : null, latex).toBe(toSExpr(parsed.tree));
  });
});
it("PR-1 the engine's analysis and the MathField speech text parse only through core/latex's parseLatex", () => {
  const api = sourceFiles("src/lib/calculator-v2/core/api");
  const analysers = api.filter((f) => /\banalyzeRows\b/.test(readFileSync(f, "utf8")));
  expect(analysers.length).toBeGreaterThan(0);
  for (const f of analysers) // the analysis index module, the one the spy above wraps
    expect(readFileSync(f, "utf8"), f).toMatch(
      /import\s*\{[^}]*\banalyzeRows\b[^}]*\}\s*from\s*"(?:\.\.\/analysis|@\/lib\/calculator-v2\/core\/analysis)(?:\/index)?"/
    );
  const users = [
    ...sourceFiles("src/lib/calculator-v2/core/analysis"),
    ...api,
    "src/components/calculator-v2/math-field/speech.ts",
  ];
  for (const file of users) {
    const src = readFileSync(file, "utf8");
    const specifiers = [...src.matchAll(/\bfrom\s+"([^"]+)"|\bimport\(\s*"([^"]+)"\s*\)/g)].map(
      (m) => m[1] ?? m[2]
    );
    expect(
      specifiers.filter((s) =>
        /^mathjs|^katex|(^|\/)calculator\/|latex\/(normalize|tokens|parser|atoms|calls|letters)$/.test(
          s
        )
      ),
      file
    ).toEqual([]);
    expect(src, file).not.toMatch(/\btokenize\s*\(/);
  }
  const callers = users.filter((f) => /\bparseLatex\s*\(/.test(readFileSync(f, "utf8")));
  expect(callers).toContain("src/components/calculator-v2/math-field/speech.ts");
  expect(callers.some((f) => f.startsWith("src/lib/calculator-v2/core/analysis/"))).toBe(true);
});
```

- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-transfer/one-parser.test.ts`. Expected: PASS (2 tests) on first run, as stated above.
- [ ] **Step 3: Commit** `git add src/lib/calculator-transfer/one-parser.test.ts && git commit -m "Check that typed and API input share one parser (PR-1)"`.

### Task 14: Package gate

**Files:** none new.

- [ ] **Step 1: Run** `n exec 22 npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 02,03,04,05,06,07,08,09,10,11,12`, then
      `n exec 22 npx tsx scripts/calculator-v2/check-spec-ids.mjs --ids PR-1,PR-5,PR-6,PR-44,TR-1,TR-3,TR-5,TR-6,TR-7,TR-8,TR-9,TR-10,TR-11,TR-12,TR-13,TR-14,TR-18,TR-19,TR-20,TR-21,TR-26,TR-27,TR-28,TR-32,TR-35,TR-36,TR-37,TR-38,TR-40,TR-71,TR-72,TR-73,TR-77,TR-79,AR-3,AR-16`.
      Expected: both exit 0; the second prints `check-spec-ids: all 36 IDs covered`.
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-transfer src/components/learn src/components/calculator-v2 src/components/calculator src/lib/calculator-v2`. Expected: PASS, including 03's AR-1 and AR-2 scans (`seam-boundaries.test.ts`), which enumerate the new eager modules at run time, and 10's quiz-host tests.
- [ ] **Step 3: Run** `n exec 22 npx tsc --noEmit && n exec 22 npm run lint && n exec 22 npm run format:check && n exec 22 node scripts/check-file-sizes.mjs`. Expected: each exits 0; every file this package created is under 700 lines.
- [ ] **Step 4: Run** `grep -rnE "new Function|\beval\(|set(Timeout|Interval)\(\s*['\"]" src/components/calculator-v2/transfer src/lib/calculator-transfer`. Expected: no output (AR-44).
- [ ] **Step 5: Measure** `n exec 22 npx esbuild src/lib/calculator-transfer/classify.ts --bundle --minify --format=esm --log-level=error | gzip -9 | wc -c` (esbuild resolves `@/` through `tsconfig.json`). Record the number in the hand-over note; above 6,144 bytes, tell the lead before wave 7, because AR-33's 10 KB eager budget also holds TransferControl, its styles and the 1A seam.
- [ ] **Step 6: Hand over** the branch to the wave-6 merge. No commit unless a gate needed a fix, which is its own commit naming the ID.
