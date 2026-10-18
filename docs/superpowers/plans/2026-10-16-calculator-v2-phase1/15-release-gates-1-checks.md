# 15 release-gates, part 1 of 3: launch policy, the `--phase` checker, corpus coverage, unit ports, the asset scan and the bundle rules (Tasks 1 to 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 1 of 3 of package `15-release-gates.md`, which holds the package header (Goal, IDs, IDs by task, Owns), the Rules R1 to R6 and the Notes for the lead; they apply to every task here, and "R<n>" and "Notes for the lead" below refer to that file. Tasks run in number order across the three parts; part 2 (`15-release-gates-2-parity.md`) starts at Task 7.

---

### Task 1: Calculator launch policy and the v2 commands (resolves OI-11)

**Files:** Modify `CLAUDE.md` (section "Calculator launch policy"), `docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md` (section 10.5, first bullet).

**Interfaces:** Consumes and produces no code.

- [ ] **Step 1: Check the starting text.** `grep -c "The standalone runtime has no third-party" CLAUDE.md` prints `1`; `grep -c '"Calculator launch policy" (the section on the' docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md` prints `0`.
- [ ] **Step 2: Apply OI-11 to the overview.** Replace the two-line bullet that starts ``- `CLAUDE.md`, "Karman calculator checks":`` with this one line, verbatim from `open-items.md`:

```text
- `CLAUDE.md`, "Calculator launch policy" (the section on the `08c8c76` base): the Phase 1 PR replaces "The standalone runtime has no third-party dependencies; run `npm run calculator:build` after editing its `lib/` modules." with "Calculator v2 (Worker variable `CALCULATOR_V2_ROLLOUT`) vendors MathQuill and bundles KaTeX and React, with notices in `public/calculator-notices.txt`; `npm run calculator:build` builds v1 and then v2." The same PR adds the v2 commands `npx vitest run src/lib/calculator-v2` and `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios`. The switch-over PR describes v2 as the default. The Phase 4 PR that ships S-3 and S-4 changes "Question changes clear calculator and scratch work." to "Question changes clear calculator and scratch work; only the calculator display size and reverse contrast persist for the page session." The removal PR drops v1.
```

- [ ] **Step 3: Apply it to `CLAUDE.md`.** In "Calculator launch policy" replace these two lines:

```text
API, SDK, or proprietary component. The standalone runtime has no third-party
dependencies; run `npm run calculator:build` after editing its `lib/` modules.
```

with the block below, keeping the following "Question changes clear" lines unchanged (Phase 4 changes them):

```text
API, SDK, or proprietary component. Calculator v2 (Worker variable
`CALCULATOR_V2_ROLLOUT`) vendors MathQuill and bundles KaTeX and React, with
notices in `public/calculator-notices.txt`; `npm run calculator:build` builds v1
and then v2. v2 checks: `npx vitest run src/lib/calculator-v2` and
`npm run test:calculator -- --project=calculator-chrome --project=calculator-ios`.
```

- [ ] **Step 4: Verify.** `grep -c "no third-party" CLAUDE.md` prints `0`; `grep -c "Calculator v2 (Worker variable" CLAUDE.md`, `grep -c "npx vitest run src/lib/calculator-v2" CLAUDE.md` and `grep -c "calculator-chrome --project=calculator-ios" CLAUDE.md` each print `1`; `grep -c '"Calculator launch policy" (the section on the' docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md` prints `1`; `npx prettier --check CLAUDE.md docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md` passes.
- [ ] **Step 5: Commit.** `git add CLAUDE.md docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md && git commit -m "Record calculator v2 in the launch policy and add its commands (OI-11)"`

### Task 2: Spec-ID checker `--phase N` (extension edit)

**Files:** Modify `scripts/calculator-v2/check-spec-ids.mjs`; Test `tests/unit/calculator-v2/check-spec-ids.test.ts`. In that file `C` is 02's `import * as C from "../../../scripts/calculator-v2/check-spec-ids.mjs"` and `readFileSync` its existing `node:fs` import; hoist the existing CLI test's `run` helper to file scope, then add the tests below inside the `describe("check-spec-ids")` block. Titles stay ID-free and synthetic IDs use `QQ-`, as 02 set.

**Interfaces:** Consumes (02, `01-interfaces-integration.md` section 16): `expandIds(list: string): string[]`, `packageIds(indexMarkdown: string): Map<string, string[]>`, `titledIds(source: string): Set<string>`, `corpusIds(cases: readonly CorpusCase[]): Set<string>`, `missingIds(required: readonly string[], found: ReadonlySet<string>): string[]`; and 02 Task 3's package-internal `INDEX_PATH` (`"docs/superpowers/plans/2026-10-16-calculator-v2-phase1/00-index.md"`, not in section 16). Produces: `export function phaseIds(overviewMarkdown: string, phase: number): string[];` (section 16), package-internal `export const OVERVIEW_PATH = "docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md";` and the CLI mode `--phase <1-4>`.

- [ ] **Step 1: Write the failing tests.**

```
const SYNTH = ["### 7.2 IDs by phase", "**Phase 1**", "| File | IDs |", "| --- | --- |", "| A | QQ-1 to QQ-3; ZZ-1 |", "**Phase 2**", "| File | IDs |", "| --- | --- |",
  "| E | QQ-4 (staged from Phase 1, section 7.3); ZZ-2 |", "### 7.3 Dependency checks", "| QQ-9 | ZZ-9 |"].join("\n");
it("phaseIds reads the section 7.2 tables up to the phase plus staged IDs and ignores section 7.3", () => { expect(C.phaseIds(SYNTH, 1)).toEqual(["QQ-1", "QQ-2", "QQ-3", "ZZ-1", "QQ-4"]);
  expect(C.phaseIds(SYNTH, 2)).toEqual(["QQ-1", "QQ-2", "QQ-3", "ZZ-1", "QQ-4", "ZZ-2"]); for (const bad of [0, 5]) expect(() => C.phaseIds(SYNTH, bad)).toThrow(`phase ${bad} is not 1 to 4`); });
it("phaseIds over the overview gives the 391 IDs 00-index allocates for Phase 1, K-4 included, and all 645 at Phase 4", () => { const overview = readFileSync(C.OVERVIEW_PATH, "utf8"); const one = C.phaseIds(overview, 1);
  expect([one.length, new Set(one).size, one.includes("K-4")]).toEqual([391, 391, true]); expect([...one].sort()).toEqual([...C.packageIds(readFileSync(C.INDEX_PATH, "utf8")).values()].flat().sort());
  const all = C.phaseIds(overview, 4); expect([all.length, new Set(all).size]).toEqual([645, 645]); });
it("the CLI --phase reports on every ID due by the phase and rejects a missing or unknown phase", () => { const one = run("--phase", "1");
  expect(one.status === 0 ? one.stdout : one.stderr).toMatch(/^check-spec-ids: (all 391 IDs covered|\d+ of 391 IDs have no test title or counted corpus rules entry:)/); expect([run("--phase", "5").status, run("--phase").status]).toEqual([2, 2]); }, 60_000);
```

- [ ] **Step 2: Run them and see them fail.** `npx vitest run tests/unit/calculator-v2/check-spec-ids.test.ts -t "phaseIds|--phase"`. Expected: FAIL, 3 tests: the first with `TypeError: C.phaseIds is not a function`; the second with `The "path" argument must be of type string … Received undefined` (`C.OVERVIEW_PATH` is not exported yet); the third because `--phase` is still an unknown mode, so stderr holds the usage text.
- [ ] **Step 3: Implement** (JSDoc-typed, in the file's existing style):

```text
phaseIds  phase not an integer 1..4: throw new Error(`phase ${phase} is not 1 to 4`). Read the lines after /^### 7\.2 / up to the next /^#{1,3} /;
          /^\*\*Phase ([1-4])\*\*$/ sets the table phase; a row /^\|([^|]*)\|([^|]*)\|$/ whose trimmed first cell is neither "File" nor only
          dashes contributes its second cell: each /([A-Z][A-Z0-9]*-\d+) \(staged from Phase ([1-4])[^)]*\)/ marks that ID due from that phase
          and is replaced by the bare ID, then the cell goes through expandIds. An ID is due when its table phase or its staged phase is <= phase.
          Result in first-occurrence order, without repeats.
CLI       --phase <n>: required = phaseIds(readFileSync(join(ROOT, OVERVIEW_PATH), "utf8"), n); a missing n or a thrown error prints the usage
          on stderr and exits 2; otherwise the found set, messages and exit codes of --ids and --packages apply unchanged.
```

- [ ] **Step 4: Run them and see them pass.** `npx vitest run tests/unit/calculator-v2/check-spec-ids.test.ts`. Expected: PASS, 9 tests (3 new tests; 02's 6 still pass).
- [ ] **Step 5: Commit.** `git add scripts/calculator-v2/check-spec-ids.mjs tests/unit/calculator-v2/check-spec-ids.test.ts && git commit -m "Add the --phase mode to the calculator v2 spec-ID checker"`

### Task 3: Golden corpus coverage (PR-41)

**Files:** Create `src/lib/calculator-v2/core/corpus/coverage.test.ts`. The counted cases come from the case files' owners: each due ID's owner writes its own, and 02 (Tasks 7, 10 and 11) and 04 (`04-semantics-2-eval.md` Task 9) also write the cases for PR-2, PR-39 to PR-41, NM-8, NM-16, NM-24, NM-29, NM-42, NM-43 and RC-21 (Notes for the lead; `00-index.md` 5.3). Only as a fallback, R3 fix commits add Step 3's table rows for IDs Step 2 lists.

**Interfaces:** Consumes `CORPUS: readonly CorpusCase[]`, `CORPUS_RUNNERS: readonly CorpusRunner[]`, `runnerFor(c: CorpusCase, field: ExpectedField): CorpusRunner | null`, `expectedFields(c: CorpusCase): ExpectedField[]` (02, section 2); `SHIPPED_PHASE: 1` (02, `core/latex/operator-names.ts`); `corpusIds`, `phaseIds`, `OVERVIEW_PATH` (Task 2). Produces nothing. Imports are relative (section 0): the script is `../../../../../scripts/calculator-v2/check-spec-ids.mjs`.

- [ ] **Step 1: Write the test.**

```
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CORPUS } from "./index";
import { CORPUS_RUNNERS, runnerFor } from "./runners";
import { expectedFields } from "./types";
import { SHIPPED_PHASE } from "../latex/operator-names";
import { corpusIds, OVERVIEW_PATH, phaseIds } from "../../../../../scripts/calculator-v2/check-spec-ids.mjs";
describe("golden corpus coverage", () => {
  it("PR-41 every expected field of every case has a runner", () => { expect(CORPUS.flatMap((c) => expectedFields(c).filter((f) => runnerFor(c, f) === null).map((f) => `${c.id}.${f}`))).toEqual([]); });
  it("PR-41 each runner file exists, selects cases with runnerFor and reads every field it claims", () => { const problems: string[] = [];
    for (const r of CORPUS_RUNNERS) { if (!existsSync(r.file)) { problems.push(`${r.file} missing`); continue; } const src = readFileSync(r.file, "utf8"); if (!src.includes("runnerFor(")) problems.push(`${r.file} has no runnerFor(`);
      for (const f of r.fields) if (!new RegExp(`\\.${f}\\b|["'\`]${f}["'\`]`).test(src)) problems.push(`${r.file} never reads ${f}`); }
    expect(problems).toEqual([]); });
  it("PR-41 every PR-, RC- and NM- ID due by the shipped phase has a case with an expected field", () => { const due = phaseIds(readFileSync(OVERVIEW_PATH, "utf8"), SHIPPED_PHASE).filter((id) => /^(PR|RC|NM)-/.test(id));
    expect(due.length).toBeGreaterThanOrEqual(83); const found = corpusIds(CORPUS); expect(due.filter((id) => !found.has(id))).toEqual([]); });
});
```

- [ ] **Step 2: Run it.** First confirm that the eleven cases 02 and 04 write at this package's request were merged; this prints nothing, and each line it prints names an ID that goes through Step 3's fallback:

```
printf '%s\n' "PR-2 printer" "PR-39 parse-literals" "PR-40 parse-literals" "PR-41 parse-literals" "NM-42 parse-errors" "NM-8 display-numbers" "NM-24 display-numbers" "NM-29 display-numbers" "NM-43 display-numbers" "NM-16 classify-rows" "RC-21 classify-rows" | while read -r id file; do grep -q "\"$id\"" "src/lib/calculator-v2/core/corpus/cases/$file.ts" || echo "missing $id in $file.ts"; done
```

Then `npx vitest run src/lib/calculator-v2/core/corpus/coverage.test.ts`. Expected: PASS on first run (R4), because 02 and 04 wrote those eleven cases and every other due ID's owner wrote its own. A failure is an R3 fix in the owning package: the first test lists `<case>.<field>` pairs without a runner (02, or the case file's owner), the second a runner file that misses a field it claims (that runner's owner, `01-interfaces.md` section 2.2), the third the due IDs with no counted case (Step 3).

- [ ] **Step 3: Fallback only: fill each ID the third test lists (R3, one commit per ID, `Fix <ID>: corpus case for PR-41 (<NN-key>)`).** Skip this step when the third test passes. The rows for the eleven moved IDs repeat the cases 02 and 04 write and apply only to an ID that Step 2's check printed. Append the row's cases at the end of the named file with the file's next free `id`; the values are the spec's own. When the last column names a titled test, `grep -n '"<ID> ' <that file>` must find it before the commit; if it does not, stop and report the ID to the lead, because the case alone does not verify the rule. An ID that Step 2 lists and the table lacks: stop and report it to the lead; this task never invents a case.

| ID                  | File (owner)               | Cases                                                                                                                                           | What verifies the rule                                                                                                                                                                   |
| ------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-1                | `question-dialect.ts` (12) | `{ rules: ["PR-1"], input: { question: "y=2x+3", context: "math" }, tree: "(rel = (id y) (add (mul (num 2) (id x)) (num 3)))" }`                | `tree` (12's runner parses the TR-7 output)                                                                                                                                              |
| PR-2                | `printer.ts` (02)          | `{ rules: ["PR-2"], input: { latex: "y=\\sqrt{x}+\\frac{3}{4}" }, tree: "(rel = (id y) (add (root (id x)) (div (num 3) (num 4))))" }`           | 05's titled PR-2 test in `tests/calculator/v2/math-field.spec.ts` loads every `latex` case into a MathField and compares trees; `tree` pins the parse it must reproduce                  |
| PR-5                | `question-dialect.ts` (12) | `{ rules: ["PR-5"], input: { question: "1{,}250", context: "math" }, display: "1250" }`                                                         | `display`                                                                                                                                                                                |
| PR-6                | `question-dialect.ts` (12) | `{ rules: ["PR-6"], input: { question: "2\\frac{1}{2}", context: "math" }, display: "2.5" }`                                                    | `display`                                                                                                                                                                                |
| PR-36               | `keys.ts` (05)             | `{ rules: ["PR-36"], input: { keys: ["y", "=", "x", "^", "2", "Right", "+", "3", "/", "4"] }, latex: "y=x^{2}+\\frac{3}{4}" }`                  | `latex` (05's runner types the keys into a real MathField)                                                                                                                               |
| PR-37               | `printer.ts` (02)          | `{ rules: ["PR-37"], input: { latex: "y=mx+b" }, latex: "y=mx+b", tree: "(rel = (id y) (add (mul (id m) (id x)) (id b)))" }`                    | `latex` and `tree`                                                                                                                                                                       |
| PR-38               | `parse-errors.ts` (02)     | `{ rules: ["PR-38"], input: { latex: "\\frac{}{}" }, error: "syntax" }`                                                                         | `error`                                                                                                                                                                                  |
| PR-39, PR-40, PR-41 | `parse-literals.ts` (02)   | `{ rules: ["PR-39", "PR-40", "PR-41"], input: { latex: "x_{1}" }, tree: "(id x_{1})" }`                                                         | structural rules any case exercises; 02's titled PR-39 and PR-40 tests and this task's PR-41 tests are the real checks                                                                   |
| PR-44               | `question-dialect.ts` (12) | `{ rules: ["PR-44", "RC-14"], input: { question: "y>2x+1", context: "math" }, kind: "region" }`                                                 | `kind`                                                                                                                                                                                   |
| RC-21               | `classify-rows.ts` (04)    | `{ rules: ["RC-21", "NM-19"], input: { latex: "\\sqrt{-4}" }, kind: "value", display: "undefined" }`                                            | `display` in the empty, radians, real-mode scope a new question starts from; 11's titled RC-21 test in `tests/calculator/v2/quiz-reset.spec.ts` checks `setBlank()`                      |
| NM-8                | `display-numbers.ts` (04)  | `{ rules: ["NM-8", "NM-2"], input: { latex: "2\\cdot5000" }, display: "10000" }`                                                                | labelled as NM-8's documented plain form for the second label of a 5,000 step; 04's titled NM-8 test in `core/eval/format.test.ts` checks `formatAxisLabel`                              |
| NM-9                | `display-numbers.ts` (04)  | `{ rules: ["NM-9"], input: { latex: "(0.1+0.2)\\cdot10^{17}-3\\cdot10^{16}" }, display: "4" }`                                                  | `display` (only the full double gives 4; the shown 0.3 gives 0)                                                                                                                          |
| NM-16               | `classify-rows.ts` (04)    | `{ rules: ["NM-16"], input: { latex: "y=x^{2/3}" }, kind: "curve-y" }`                                                                          | the row NM-16 samples; 07's titled NM-16 tests in `plot/from-analysis.test.ts` (and Task 10's FN-15 pixels) are the real check                                                           |
| NM-19               | `display-numbers.ts` (04)  | `{ rules: ["NM-19"], input: { latex: "(-4)^{\\frac{1}{3}}" }, display: "-1.58740105197" }` and the same case with `settings: { complex: true }` | `display` in both modes                                                                                                                                                                  |
| NM-24               | `display-numbers.ts` (04)  | `{ rules: ["NM-24"], input: { latex: "\\sin(90)" }, display: "0.893996663601" }`                                                                | `display` (radians by default)                                                                                                                                                           |
| NM-25               | `display-numbers.ts` (04)  | `{ rules: ["NM-24", "NM-25"], input: { latex: "\\sin(90)" }, settings: { angleMode: "degrees" }, display: "1" }`                                | `display` in degrees                                                                                                                                                                     |
| NM-29               | `display-numbers.ts` (04)  | `{ rules: ["NM-29"], input: { latex: "\\cos(60)" }, settings: { angleMode: "degrees" }, display: "0.5" }`                                       | a value a switch to degrees must reach; 10's titled NM-29 test in `tests/calculator/v2/shell-settings.spec.ts`, which times the switch, is the real check                                |
| NM-42               | `parse-errors.ts` (02)     | ``{ rules: ["NM-42", "PR-38"], input: { latex: `-${Array(500).fill("xy").join("+")}=2x` }, error: "too-many-nodes" }`` (2,004 nodes)            | `error`                                                                                                                                                                                  |
| NM-43               | `display-numbers.ts` (04)  | `{ rules: ["NM-43"], input: { latex: "\\ln\\left(2\\right)" }, display: "0.69314718056" }`                                                      | `display`, the `ln` entry with `args: [2]` of `core/corpus/reference/elementary.json` (`0.6931471805599453094172321`) at NM-1's 12 digits; 04's titled NM-43 reference tests check 1e-13 |

- [ ] **Step 4: Run it and see it pass.** Step 2's check and its vitest command, then `npx vitest run src/lib/calculator-v2/core/corpus` (each added case passes its runner). Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/core/corpus/coverage.test.ts && git commit -m "Check golden corpus coverage of every shipped PR-, RC- and NM- ID (PR-41)"`
- [ ] **Step 6: Mutation checks** (R4; command for each: `npx vitest run src/lib/calculator-v2/core/corpus/coverage.test.ts -t "<title start>"`; after each, `git checkout -- <file>` and rerun to PASS):
  - `"PR-41 every expected field"`: in `src/lib/calculator-v2/core/corpus/runners.ts` remove `"chips"` from 04's runner `fields` (`["kind", "chips", "display", "error"]` becomes `["kind", "display", "error"]`), so `runnerFor(c, "chips")` is `null`. Expected: FAIL at the first test's `toEqual([])`, received a list of `<case>.chips` pairs from 04's `classify-*.ts` cases.
  - `"PR-41 each runner file"`: in `runners.ts` change 04's runner `file` to `"src/lib/calculator-v2/core/corpus/semantics.missing.test.ts"`. Expected: FAIL at the second test's `toEqual([])`, received `["src/lib/calculator-v2/core/corpus/semantics.missing.test.ts missing"]`.
  - `"PR-41 every PR-"`: first `grep -rl '"PR-41"' src/lib/calculator-v2/core/corpus/cases` prints only `src/lib/calculator-v2/core/corpus/cases/parse-literals.ts` (if it prints more files, make the same edit in each and restore each); in `parse-literals.ts` delete `"PR-41"` from every `rules` array that holds it (02's `t(35, ["PR-39", "PR-40", "PR-41"], …)` becomes `t(35, ["PR-39", "PR-40"], …)`). Expected: FAIL at the third test's last `toEqual([])`, received `["PR-41"]`.

### Task 4: V1 unit ports (V1-19, V1-20, V1-21, V1-23, V1-24, V1-26, V1-29, V1-30, V1-31)

**Files:** Create `tests/unit/calculator-v2/parity.test.ts` (00-index section 7: unit-verified V1 items live here, ported from `tests/unit/calculator/standalone.test.ts`).

**Interfaces:** Consumes `parseLatex(input: string, options?: ParseOptions): ParseResult`, `normalizeLatex(input: string): string`, `printLatex(tree: Node): string`, `toSExpr(tree: Node): string`, `treesEqual(a: Node, b: Node): boolean`, `MAX_ROWS`, `MAX_ROW_CHARACTERS`, `NO_DEADLINE: Deadline` (02, sections 1 and 1.1); `analyzeRows(rows: readonly RowSource[], settings: AnalysisSettings): AnalysisResult`, `rowErrorMessage(code: RowErrorCode, names: string[]): string`, `evaluateRows(analysis: AnalysisResult, settings: EvalSettings, deadlineFor: (rowId: string) => Deadline): Map<string, Value>`, `evaluateLatex(latex: string, context?: { rows?: string[]; settings?: Partial<EvalSettings> }): Value` (04, sections 3 and 4, with 04's RC-5 amendment to section 3: a one-parameter function-definition gives `explicit` `{ independent: "x", expr: (call f (id x)) }`); `plotRow(input: PlotInput, view: ViewSpec, deadline: Deadline): Geometry`, `defaultViewport(size: PixelSize): Viewport`, `worldToPx(view: ViewSpec, x: number, y: number): [number, number]` and the geometry types (06, section 5); `plotInputFor(row: RowAnalysis, scope: CompileScope, value: Value | null): PlotInput | null` and 07's `buildCompileScope(analysis: AnalysisResult, values: ReadonlyMap<string, Value>, settings: EvalSettings): CompileScope` (`plot/from-analysis.ts`, `01-interfaces.md` section 5); `createEngine(options?: CalculatorOptions, deps?: Partial<EngineDeps>): CalculatorEngine`, `KarmanCalculatorError` (07, section 8). Produces nothing.

- [ ] **Step 1: Write the tests** (imports, then helpers).

```
import { describe, expect, it, vi } from "vitest";
import { MAX_ROWS, MAX_ROW_CHARACTERS, normalizeLatex, parseLatex, printLatex, toSExpr, treesEqual } from "@/lib/calculator-v2/core/latex/index";
import { NO_DEADLINE } from "@/lib/calculator-v2/core/deadline";
import { analyzeRows, rowErrorMessage } from "@/lib/calculator-v2/core/analysis/index";
import { evaluateLatex, evaluateRows } from "@/lib/calculator-v2/core/eval/compile";
import { plotRow } from "@/lib/calculator-v2/plot/index";
import { defaultViewport, worldToPx, type ViewSpec } from "@/lib/calculator-v2/plot/viewport";
import type { CurveGeometry, LineSetGeometry, PointGeometry, RegionGeometry } from "@/lib/calculator-v2/plot/geometry";
import { buildCompileScope, plotInputFor } from "@/lib/calculator-v2/plot/from-analysis";
import { createEngine } from "@/lib/calculator-v2/core/api/engine";
import { KarmanCalculatorError } from "@/lib/calculator-v2/core/api/errors";
const RAD = { angleMode: "radians", complex: false } as const; const VIEW: ViewSpec = { viewport: defaultViewport({ width: 800, height: 600 }), size: { width: 800, height: 600 }, dpr: 1 };
const PX = 20 / 800; // world units per CSS px in VIEW (x from -10 to 10 across 800 px)
function pipeline(latexRows: string[]) { const a = analyzeRows(latexRows.map((latex, i) => ({ id: String(i + 1), latex, hidden: false })), RAD); const byRow = evaluateRows(a, RAD, () => NO_DEADLINE);
  const scope = buildCompileScope(a, byRow, RAD); const input = (id: string) => plotInputFor(a.byId.get(id)!, scope, byRow.get(id) ?? null); return { a, byRow, input, plot: (id: string) => plotRow(input(id)!, VIEW, NO_DEADLINE) }; }
const sexpr = (latex: string) => { const r = parseLatex(latex); return r.ok ? toSExpr(r.tree) : `error ${r.error.code}`; }; const num = (latex: string, rows?: string[]) => evaluateLatex(latex, { rows });
const thrown = (f: () => void) => { try { f(); return null; } catch (e) { return e; } };
const runs = (p: Float64Array) => { const out: [number, number][][] = [[]]; for (let i = 0; i < p.length; i += 2) { if (Number.isNaN(p[i])) out.push([]); else out.at(-1)!.push([p[i], p[i + 1]]); } return out.filter((r) => r.length > 0); };
describe("V1 parity: unit ports (overview 6.1)", () => {
it("V1-19 numeric suffixes become subscripts: x1, a12 and x_{1}", () => { expect(["x1", "a12", "x_{1}"].map(sexpr)).toEqual(["(id x_{1})", "(id a_{12})", "(id x_{1})"]);
  const [a, b] = [parseLatex("x1+x12"), parseLatex("x_{1}+x_{12}")]; expect(a.ok && b.ok && treesEqual(a.tree, b.tree)).toBe(true); const t = parseLatex("a12"); expect(t.ok && printLatex(t.tree)).toBe("a_{12}");
  expect(num("x_{1}+x_{12}", ["x1=2", "x12=3"])).toEqual({ type: "number", value: 5 }); });
it("V1-20 Unicode subscripts, \\frac and \\sqrt are normalised: x₁=\\frac{6}{2} and x_1+\\sqrt{16} give 7", () => { expect([normalizeLatex("x₁"), normalizeLatex("x²")]).toEqual(["x_{1}", "x^{2}"]);
  expect(num("x_1+\\sqrt{16}", ["x₁=\\frac{6}{2}"])).toEqual({ type: "number", value: 7 }); const [d, f] = [parseLatex("\\dfrac{6}{2}"), parseLatex("\\frac{6}{2}")]; expect(d.ok && f.ok && treesEqual(d.tree, f.tree)).toBe(true); });
it("V1-21 precedence and implicit products: -2^{2} is -4, (-2)^{2} is 4, 2(3+4) is 14, typed 2^{3^{2}} is 512 and raw 2^3^2 is an error", () => {
  expect(["-2^{2}", "(-2)^{2}", "2(3+4)", "2^{3^{2}}"].map((l) => num(l))).toEqual([-4, 4, 14, 512].map((value) => ({ type: "number", value }))); expect(sexpr("2^3^2")).toBe("error syntax"); });
it("V1-23 code-like input never executes and becomes a plain-language row error", () => { const alert = vi.fn(); vi.stubGlobal("alert", alert);
  for (const latex of ["window.alert(1)", "constructor.constructor(1)", "x;alert(1)", "x.__proto__", "x[0]", "<img src=x>"]) { expect(() => parseLatex(latex)).not.toThrow(); const { a, byRow } = pipeline([latex]); const r = a.rows[0];
    expect([latex, r.kind, r.isGraphable, r.error!.message]).toEqual([latex, "error", false, rowErrorMessage(r.error!.code, r.error!.names)]); expect(byRow.get("1") ?? { type: "undefined" }).toEqual({ type: "undefined" }); }
  expect(alert).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });
it("V1-24 definitions and functions resolve in any row order: y=f(x)+b, b=3, f(x)=a·x^{2}, a=2 gives 11 at x=2", () => { const p = pipeline(["y=f(x)+b", "b=3", "f(x)=a\\cdot x^{2}", "a=2"]); const r = p.a.byId.get("1")!;
  expect([r.kind, r.chips, r.error]).toEqual(["curve-y", [], null]); const input = p.input("1"); expect(input?.kind === "explicit" && input.f(2)).toBe(11); });
it("V1-26 row, length and node limits refuse input without freezing: 100 rows, 2,048 characters, 2,000 nodes", () => { const engine = createEngine(); const t0 = performance.now();
  expect(engine.editRow("1", "1".repeat(MAX_ROW_CHARACTERS + 1), "typing")).toBe("char-limit"); expect(engine.getExpressions()[0].latex ?? "").toBe(""); expect(engine.editRow("1", "1".repeat(MAX_ROW_CHARACTERS), "typing")).toBeNull();
  engine.setExpressions(Array.from({ length: MAX_ROWS }, (_, i) => ({ id: String(i + 1), latex: "" }))); expect(engine.insertRowAfter(null)).toBe("row-limit");
  const e = thrown(() => engine.setExpression({ id: String(MAX_ROWS + 1), latex: "1" })); expect(e instanceof KarmanCalculatorError && e.code).toBe("invalid-argument"); expect(engine.getExpressions()).toHaveLength(MAX_ROWS);
  expect(sexpr(`-${Array(500).fill("xy").join("+")}=2x`)).toBe("error too-many-nodes"); expect(performance.now() - t0).toBeLessThan(250); engine.destroy(); });
it("V1-29 explicit curves, one-variable equations as lines, points and one-argument functions graph", () => { const p = pipeline(["y=2x+3", "x^{2}=4", "(2,3)", "f(t)=t^{2}"]);
  expect(p.a.rows.map((r) => r.kind)).toEqual(["curve-y", "vertical-lines", "point", "function-definition"]); const [line, roots, fn] = [p.input("1"), p.input("2"), p.input("4")];
  expect([line?.kind === "explicit" && line.f(1), roots?.kind === "lines" && [roots.f(2), roots.f(-2)], fn?.kind === "explicit" && fn.f(3)]).toEqual([5, [0, 0], 9]);
  const at = [...(p.plot("2") as LineSetGeometry).positions].sort((x, y) => x - y); expect(at.map((v, i) => Math.abs(v - [-2, 2][i]) * 40 <= 0.5)).toEqual([true, true]); expect([...(p.plot("3") as PointGeometry).coords]).toEqual([2, 3]); });
it("V1-30 implicit equations graph: the circle x^{2}+y^{2}=25 within 0.5 px and both branches of xy=6 with no connector", () => { const p = pipeline(["x^{2}+y^{2}=25", "xy=6"]); expect(p.a.rows.map((r) => r.kind)).toEqual(["implicit", "implicit"]);
  const circle = p.input("1"); expect(circle?.kind === "implicit" && [circle.F(3, 4), circle.F(0, 0)]).toEqual([0, -25]);
  const ring = runs((p.plot("1") as CurveGeometry).polylines); expect([ring.length > 0, ring.flat().every(([x, y]) => Math.abs(Math.hypot(x, y) - 5) <= 0.5 * PX)]).toEqual([true, true]); // G-16: every point within 0.5 px of the circle
  const r = runs((p.plot("2") as CurveGeometry).polylines);
  expect([r.some((s) => s.every(([x, y]) => x > 0 && y > 0)), r.some((s) => s.every(([x, y]) => x < 0 && y < 0)), r.filter((s) => s.some(([x]) => x > 0) && s.some(([x]) => x < 0)).length]).toEqual([true, true, 0]); });
it("V1-31 inequalities shade where they hold, with dashed strict and solid non-strict boundaries", () => { const p = pipeline(["y>2x+1", "x^{2}+y^{2}\\le9", "1<y<3"]); expect(p.a.rows.map((r) => r.kind)).toEqual(["region", "region", "region"]);
  const covers = (g: RegionGeometry, x: number, y: number) => { const [px, py] = worldToPx(VIEW, x, y); for (let i = 0; i < g.spans.length; i += 4) if (py >= g.spans[i] && py < g.spans[i + 1] && px >= g.spans[i + 2] && px < g.spans[i + 3]) return true; return false; };
  const [above, disc, band] = ["1", "2", "3"].map((id) => p.plot(id) as RegionGeometry);
  expect([covers(above, 0, 5), covers(above, 0, -5), covers(disc, 0, 0), covers(disc, 5, 0), covers(band, 0, 2), covers(band, 0, 4)]).toEqual([true, false, true, false, true, false]);
  expect([above.boundaries.length > 0, disc.boundaries.length > 0]).toEqual([true, true]); // so the dashed and solid checks below cannot pass vacuously
  expect([above.boundaries.every((b) => b.dashed), disc.boundaries.every((b) => !b.dashed)]).toEqual([true, true]); });
});
```

- [ ] **Step 2: Run them.** `npx vitest run tests/unit/calculator-v2/parity.test.ts`. Expected: PASS on first run (R4); a failure is an R3 fix in 02, 04, 06 or 07.
- [ ] **Step 3: Commit.** `git add tests/unit/calculator-v2/parity.test.ts && git commit -m "Port the v1 engine unit cases to calculator v2 (V1-19 to V1-31)"`
- [ ] **Step 4: Mutation checks** (R4; command for each: `npx vitest run tests/unit/calculator-v2/parity.test.ts -t "<ID> "`; after each, `git checkout -- <file>` and rerun to PASS):
  - V1-19: in `src/lib/calculator-v2/core/latex/atoms.ts` skip PR-14's digit-suffix rule (02 Task 7: a digits token that starts where a Latin identifier ends stays a number). Expected: FAIL at the first `toEqual`, received `["(mul (id x) (num 1))", "(mul (id a) (num 12))", "(id x_{1})"]`.
  - V1-20: in `src/lib/calculator-v2/core/latex/normalize.ts` remove the ten subscript-digit mappings (`₀` to `₉`). Expected: FAIL at the first `toEqual`, received `["x₁", "x^{2}"]`.
  - V1-21: in `src/lib/calculator-v2/core/latex/parser.ts` make `unary` wrap `neg` around the atom before the postfix `^` is read, so `-2^{2}` parses as `(pow (neg (num 2)) (num 2))`. Expected: FAIL at the first `toEqual`, its first value `{ type: "number", value: 4 }`.
  - V1-23: in `src/lib/calculator-v2/core/analysis/classify.ts` give a row with a parse error kind `"value"` (keep its `error`). Expected: FAIL at the loop's `toEqual` for `"window.alert(1)"`, received kind `"value"`.
  - V1-24: in `src/lib/calculator-v2/core/analysis/resolve.ts` make `isDefined(name)` true only for function heads, so the value heads `b` and `a` no longer count as defined. Expected: FAIL at the first `toEqual`, received `["curve-y", ["b"], null]`.
  - V1-26: in `src/lib/calculator-v2/core/api/engine.ts` remove `editRow`'s `MAX_ROW_CHARACTERS` refusal. Expected: FAIL at `expect(engine.editRow("1", "1".repeat(MAX_ROW_CHARACTERS + 1), "typing")).toBe("char-limit")`, received `null`.
  - V1-29: in `src/lib/calculator-v2/plot/from-analysis.ts` make `plotInputFor` return `null` for a `lines` graph. Expected: FAIL at the second `toEqual`, received `[5, false, 9]`.
  - V1-30: in `src/lib/calculator-v2/plot/contour.ts` write every chained run into `polylines` without the `NaN, NaN` pair that ends a run. Expected: FAIL at the last `toEqual` (the `xy=6` branches), received `[false, false, 1]`.
  - V1-31: in `src/lib/calculator-v2/plot/region.ts` set every boundary's `dashed` to `false` (in place of `ops[k] === "<" || ops[k] === ">"`). Expected: FAIL at the last `toEqual`, received `[false, true]`.

### Task 5: Asset and icon scan (TH-18)

**Files:** Create `src/lib/calculator-v2/assets-scan.test.ts` (node environment; a test file, so AR-1 exempts it).

**Interfaces:** Consumes the module graphs (`ENTRIES`) of `src/components/calculator-v2/host/quiz-host.ts` (the lazy chunk, 10), `src/lib/calculator-v2/worker/compute.worker.ts` (the worker, 07) and `src/components/calculator-v2/standalone/main.tsx` (13); the file `src/components/calculator/TransferControl.tsx` with its direct imports only (14; its eager import graph is quiz code, not calculator output); 13's `buildStandalone(options?: { outDir?: string }): Promise<StandaloneBuild>` (`scripts/build/calculator-v2.mjs`, imported as `../../../scripts/build/calculator-v2.mjs`), which empties `outDir` and writes the standalone page with `metafile.json` there and never writes `styles/generated.ts`. Produces test-local helpers:

```
const ASSET = /\.(png|jpe?g|gif|webp|avif|ico|bmp|svg|woff2?|ttf|otf|eot)$/i; const KATEX_WOFF2 = /(^|\/)KaTeX_[A-Za-z0-9_-]+\.woff2$/;
const SPEC = /(?:^|[^\w$.])(?:import|export)\s+(?!type\b)(?:[\w*{}\s,$]+\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
interface Graph { files: string[]; packages: { specifier: string; from: string }[] }
function moduleGraph(entries: string[], root = process.cwd(), follow = true): Graph; // BFS; drops ?query; "@/" -> src/; relative tries "", .ts, .tsx, .mjs, .js, /index.ts, /index.tsx; code files are read and followed, other files are leaves; bare specifiers go to packages; an unresolvable relative specifier throws; follow false reads the entries only and lists their asset and CSS leaves, not their code imports
function scanGraph(graph: Graph, root = process.cwd()): string[]; // problems "<kind> <file> <detail>", kinds below
function scanStandalone(dir: string): string[];
```

`scanGraph` kinds: `asset` (an ASSET leaf or package specifier that is not a KaTeX woff2); `stylesheet` (a package `.css` specifier other than `katex/dist/katex.min.css`, AR-39); `icon-package` (a package whose name matches `/icon|svg|font|emoji/i` other than `lucide-react`); `inline-svg` (`/<svg[\s>]/` in a `.tsx` file outside `src/components/calculator-v2/icons/`); `css-url` and `css-font-face` (`url(` or `@font-face` in a graph CSS file, AR-36); `desmos` (`/desmos/i` in a file path, a specifier, or a string literal matching ``/["'`]((?:https?:)?\/\/[^"'`\s]+|[^"'`\s]+\.(?:png|jpe?g|gif|webp|svg|woff2?|ttf|otf|js|css|json))["'`]/g``). `scanStandalone`: `asset` for an ASSET file not matching `KATEX_WOFF2`; `asset` for a `metafile.json` input with an ASSET extension other than `node_modules/katex/dist/fonts/KaTeX_*.woff2`; `icon-package` for an input whose path holds `lucide` outside `node_modules/lucide-react/`; `desmos` for any file path, metafile input or output key, or `url(…)`, `src=` or `href=` target in `index.html` and `calculator.css` matching `/desmos/i`.

- [ ] **Step 1: Write the failing tests** (Step 3's helpers use only these imports).

```
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { buildStandalone } from "../../../scripts/build/calculator-v2.mjs";
it("TH-18 the scanner flags a Desmos-named asset, a non-KaTeX font, a package stylesheet, an icon package, inline SVG outside icons and CSS fonts", () => { const root = mkdtempSync(join(tmpdir(), "kc-th18-"));
  const put = (p: string, body: string) => { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), body); }; const dir = "src/components/calculator-v2/host";
  put(`${dir}/quiz-host.ts`, ['import "./a";', 'import logo from "./desmos-logo.png";', 'import font from "./Inter.woff2";', 'import { FaHome } from "react-icons/fa";', 'import "some-pkg/style.css";', 'import "katex/dist/katex.min.css";', 'import k from "katex/dist/fonts/KaTeX_Main-Regular.woff2";', 'import "./s.css";'].join("\n"));
  put(`${dir}/a.tsx`, 'export const A = () => <svg viewBox="0 0 1 1" />; export const u = "https://example.test/desmos-calculator.js";'); put(`${dir}/desmos-logo.png`, ""); put(`${dir}/Inter.woff2`, ""); put(`${dir}/s.css`, '@font-face { src: url("x.woff2"); }');
  const problems = scanGraph(moduleGraph([`${dir}/quiz-host.ts`], root), root);
  expect([...new Set(problems.map((p) => p.split(" ")[0]))].sort()).toEqual(["asset", "css-font-face", "css-url", "desmos", "icon-package", "inline-svg", "stylesheet"]);
  expect(problems).toContain(`asset ${dir}/quiz-host.ts ./Inter.woff2`); expect(problems.filter((p) => p.includes("katex"))).toEqual([]); });
it("TH-18 the lazy chunk, worker and standalone entry graphs reference no Desmos asset, no other font or image and no icon outside lucide-react and calculator-v2/icons", () => {
  const graph = moduleGraph(ENTRIES); expect(graph.files).toContain("vendor/mathquill/mathquill.js"); expect(graph.packages.map((p) => p.specifier)).toEqual(expect.arrayContaining(["lucide-react", "katex/dist/katex.min.css"]));
  expect(scanGraph(graph)).toEqual([]); });
it("TH-18 TransferControl draws its glyph from the lucide-react Calculator and ArrowUpRight icons and references no other asset", () => { const file = "src/components/calculator/TransferControl.tsx"; const src = readFileSync(file, "utf8");
  const names = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"lucide-react"/g)].flatMap((m) => m[1].split(",").map((s) => s.trim())); expect(names).toEqual(expect.arrayContaining(["Calculator", "ArrowUpRight"]));
  expect(/<svg[\s>]|<img[\s>]/.test(src)).toBe(false); expect(scanGraph(moduleGraph([file], process.cwd(), false))).toEqual([]); });
it("TH-18 the standalone output serves only KaTeX woff2 fonts and holds no Desmos asset", () => {
  expect(readdirSync(out, { recursive: true }).map(String).some((f) => KATEX_WOFF2.test(f))).toBe(true); expect(existsSync(join(out, "metafile.json"))).toBe(true); expect(scanStandalone(out)).toEqual([]); });
```

`ENTRIES` is the three graph entries above. `let out = ""`; a `beforeAll` (timeout 120 000 ms) sets `out = mkdtempSync(join(tmpdir(), "kc-th18-standalone-"))` and awaits `buildStandalone({ outDir: out })`; an `afterAll` runs `rmSync(out, { recursive: true, force: true })`. The test never runs the CLI, so `npm test` never rewrites the tracked `styles/generated.ts` and cannot race 10's styles drift test.

- [ ] **Step 2: Run them and see them fail.** `npx vitest run src/lib/calculator-v2/assets-scan.test.ts`. Expected: FAIL, `ReferenceError: moduleGraph is not defined` (and `scanStandalone is not defined` in the fourth test).
- [ ] **Step 3: Implement** `moduleGraph`, `scanGraph` and `scanStandalone` in the test file as specified.
- [ ] **Step 4: Run them and see them pass.** Same command, then `git status --short src/components/calculator-v2/styles` prints nothing. Expected: PASS (4 tests). A real finding is an R3 fix in the owning package.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/assets-scan.test.ts && git commit -m "Scan calculator v2 graphs and standalone output for fonts, icons and Desmos assets (TH-18)"`

### Task 6: Standalone budget and the TR-74 eager rule (extension edit)

**Files:** Modify `scripts/build/check-calculator-v2-bundle.mjs`, `docs/calculator-v2-bundle-baseline.json` (script-written) and, as an extension edit (00-index 5.2 row), 11's `tests/unit/calculator-v2/bundle-check.test.ts`, whose `syntheticBuild` also writes `CORE_MARKER` into the last lazy file, beside `mq-root-block`; Create `tests/unit/calculator-v2/standalone-budget.test.ts` (this package's bundle-rule tests).

**Interfaces:** Consumes `BUDGETS`, `BundleBaseline`, `BundleReport`, `checkBundle(options: { root: string; baseline: BundleBaseline }): Promise<BundleReport>`, `EAGER_ROUTES` (11, section 16) and `formatBaseline(baseline: BundleBaseline): Promise<string>` (11 Task 14; `01-interfaces-integration.md` section 16); `rowErrorMessage` (04); and reads as text, never imports, 12's `src/lib/calculator-transfer/` and 14's eager quiz modules `src/components/calculator/TransferControl.tsx`, `transfer-selection.ts`, `transfer-report.ts` and `use-transfer-bridge.ts` (the hook `CalculatorScope.tsx` imports, 14 note 4). Produces in `check-calculator-v2-bundle.mjs` the section 16 exports under `// added by 15-release-gates:` (and `BUDGETS` carries section 16's `standaloneGzipBytes: 614400`, added here if 11 left it out):

```
export const STANDALONE_DIR = "tmp/calculator-v2-standalone";
export const CORE_MARKER = "Check for a missing bracket or operator."; // part of rowErrorMessage("syntax", []) (01 section 3), reachable only through core/analysis
export function checkStandalone(root: string, baseline: BundleBaseline): { standaloneGzipBytes: number | null; problems: string[] };
export function checkEagerCore(input: { root: string; eager: Readonly<Record<string, readonly string[]>>; lazy: readonly string[] }): string[]; // paths under <root>/.open-next/assets/_next/
```

`checkStandalone`: `n` and `w` are the level-9 gzip sizes of `<root>/STANDALONE_DIR/calculator.js` and `worker.js`; `b` is `baseline.standaloneGzipBytes`. Missing `calculator.js`: `standaloneGzipBytes` is `null`, no other rule runs, and the only problem is `AR-33 standalone output tmp/calculator-v2-standalone/calculator.js missing; run npm run calculator:build` when `b` is a number (none while it is `null`). Otherwise `standaloneGzipBytes` is `n` and the problems are, in this order: `AR-33 standalone calculator.js: <n> gzip bytes, budget 614400` when `n > 614400`; `AR-33 standalone worker.js: <w> gzip bytes, budget 256000` when `worker.js` exists and `w > 256000` (a missing `worker.js` is no problem; 13's standalone spec loads it); `AR-33 standaloneGzipBytes grew to <n> from <b> (over 10%); update docs/calculator-v2-bundle-baseline.json in this PR with --update-baseline` when `b` is a number and `n - b > 0.1 * b` (11's growth rule). `checkEagerCore`: `TR-74 positive control: the lazy chunk group does not contain the calculator-v2 core marker` when no lazy file holds `CORE_MARKER`; `TR-74 calculator-v2 core code found in eager file <file> of <route>` for each eager file that holds it. `checkBundle` runs `checkEagerCore` with each route's `eagerFiles` and the lazy group right after its AR-33 budgets, then `checkStandalone`, puts its value in `measured.standaloneGzipBytes`, and its own growth loop skips that field. `--update-baseline` now also writes `measured.standaloneGzipBytes` (11's CLI kept the committed value).

- [ ] **Step 1: Write the failing tests.** Imports: `BUDGETS`, `CORE_MARKER`, `STANDALONE_DIR`, `checkEagerCore`, `checkStandalone`, `type BundleBaseline` (`../../../scripts/build/check-calculator-v2-bundle.mjs`); `rowErrorMessage` (`@/lib/calculator-v2/core/analysis/index`); `node:fs`, `node:crypto` (`randomBytes`), `node:zlib` (`gzipSync`), `node:os` and `node:path` helpers. `tree(files)` writes a temp root; `gz(body)` is `gzipSync(body, { level: 9 }).length`; `baseline(s)` is a `BundleBaseline` with `standaloneGzipBytes: s`, zero sizes, empty route maps and `perf: null`; `js`, `worker` are `${STANDALONE_DIR}/calculator.js` and `/worker.js`; `asset(f)` is `.open-next/assets/_next/${f}`; `sources(text)` lists non-test `.ts`, `.tsx` and `.mjs` files under `src/` and `scripts/` outside `__fixtures__` and the bundle script whose text includes `text`; `valueImports(file)` lists the specifiers of its static imports that are not `import type` (side-effect imports included), its `export … from` re-exports that are not `export type`, and its string-literal `import()` calls, read with Task 5's `SPEC` regex (copied, since test files do not import each other); `APPLY` is `/transfer\/apply(\.tsx?)?$/`.

```
it("AR-33 the standalone rule measures calculator.js and passes within 614400 gzip bytes", () => { const body = "x".repeat(5000); expect(BUDGETS.standaloneGzipBytes).toBe(614400);
  expect(checkStandalone(tree({ [js]: body, [worker]: "w" }), baseline(null))).toEqual({ standaloneGzipBytes: gz(body), problems: [] }); });
it("AR-33 the standalone rule fails calculator.js over 614400 and worker.js over 256000 gzip bytes", () => { const text = checkStandalone(tree({ [js]: randomBytes(620_000), [worker]: randomBytes(260_000) }), baseline(null)).problems.join("\n");
  expect(text).toMatch(/^AR-33 standalone calculator\.js: \d+ gzip bytes, budget 614400$/m); expect(text).toMatch(/^AR-33 standalone worker\.js: \d+ gzip bytes, budget 256000$/m); });
it("AR-33 the standalone output is required once the baseline records it, and growth over 10% fails", () => { expect(checkStandalone(tree({}), baseline(null))).toEqual({ standaloneGzipBytes: null, problems: [] });
  expect(checkStandalone(tree({}), baseline(1000)).problems).toEqual(["AR-33 standalone output tmp/calculator-v2-standalone/calculator.js missing; run npm run calculator:build"]); const body = randomBytes(2000); const n = gz(body); const b = Math.floor(n / 1.2);
  expect(checkStandalone(tree({ [js]: body }), baseline(b)).problems).toEqual([`AR-33 standaloneGzipBytes grew to ${n} from ${b} (over 10%); update docs/calculator-v2-bundle-baseline.json in this PR with --update-baseline`]); expect(checkStandalone(tree({ [js]: body }), baseline(n)).problems).toEqual([]); });
it("AR-33 the committed baseline records the standalone gzip size as a number", () => { const baseline = JSON.parse(readFileSync("docs/calculator-v2-bundle-baseline.json", "utf8")) as BundleBaseline; expect(typeof baseline.standaloneGzipBytes).toBe("number"); });
it("TR-74 the core marker is the row syntax message and only calculator-v2 core analysis holds it", () => { expect(rowErrorMessage("syntax", [])).toContain(CORE_MARKER); const found = sources(CORE_MARKER);
  expect(found.length).toBeGreaterThan(0); expect(found.filter((f) => !f.startsWith("src/lib/calculator-v2/core/analysis/"))).toEqual([]); });
it("TR-74 calculator-v2 core code in an eager quiz-route file fails, the lazy group must hold it, and eager code keeps AR-33's 10240-byte budget", () => { const run = (eagerBody: string, lazyBody: string) => checkEagerCore({ root: tree({ [asset("static/chunks/eager.js")]: eagerBody, [asset("static/chunks/lazy.js")]: lazyBody }), eager: { "/diagnostic/page": ["static/chunks/eager.js"] }, lazy: ["static/chunks/lazy.js"] });
  expect(BUDGETS.eagerAddedGzipBytes).toBe(10240); // TR-74's budget clause: AR-33's eager rule, whose over-budget case is 11's "AR-33 each gzip budget fails above its limit"
  const m = `m="${CORE_MARKER}"`; expect(run("/* eager */", m)).toEqual([]); expect(run(m, m)).toEqual(["TR-74 calculator-v2 core code found in eager file static/chunks/eager.js of /diagnostic/page"]);
  expect(run("/* eager */", "/* lazy */")).toEqual(["TR-74 positive control: the lazy chunk group does not contain the calculator-v2 core marker"]); });
it("TR-74 the eager transfer modules import no calculator-v2, MathQuill, render, plot or worker module, the transfer library imports no React, and only calculator-v2 imports transfer/apply", () => {
  const lib = readdirSync("src/lib/calculator-transfer", { recursive: true }).map(String).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$|(^|\/)__fixtures__\//.test(f) && f !== "clipboard.ts").map((f) => `src/lib/calculator-transfer/${f}`);
  const eager = [...lib, ...["TransferControl.tsx", "transfer-selection.ts", "transfer-report.ts", "use-transfer-bridge.ts"].map((f) => `src/components/calculator/${f}`)]; expect(lib.length).toBeGreaterThan(0); // use-transfer-bridge.ts: 14's eager hook, imported by CalculatorScope.tsx (14 note 4)
  expect(eager.flatMap((f) => valueImports(f).filter((s) => /calculator-v2|mathquill|\/render\/|\/plot\/|\/worker\//.test(s)).map((s) => `${f} -> ${s}`))).toEqual([]);
  expect(lib.flatMap((f) => valueImports(f).filter((s) => /^react(-dom)?(\/|$)/.test(s)).map((s) => `${f} -> ${s}`))).toEqual([]); // framework-free (TR-74)
  expect(sources("transfer/apply").filter((f) => valueImports(f).some((s) => APPLY.test(s)) && !f.startsWith("src/components/calculator-v2/"))).toEqual([]); });
```

- [ ] **Step 2: Run them and see them fail.** `npx vitest run tests/unit/calculator-v2/standalone-budget.test.ts`. Expected: FAIL in every test but the last, which guards code 12 and 14 shipped: `checkStandalone is not a function`, `checkEagerCore is not a function`, the marker test on the missing `CORE_MARKER`, and the baseline test with `expected 'object' to be 'number'` (`standaloneGzipBytes` is `null`).
- [ ] **Step 3: Implement** the produced exports, the `checkBundle` wiring and the `--update-baseline` field; make the `syntheticBuild` extension edit in 11's test file; `npx vitest run tests/unit/calculator-v2/bundle-check.test.ts` passes.
- [ ] **Step 4: Check the real build, then see the tests pass.** `npm run cf:build` (its `prebuild` runs `npm run calculator:build`, which writes the standalone output), `node scripts/build/check-calculator-v2-bundle.mjs --update-baseline`, `node scripts/build/check-calculator-v2-bundle.mjs`, then `npx vitest run tests/unit/calculator-v2/standalone-budget.test.ts tests/unit/calculator-v2/bundle-check.test.ts`. Expected: exit 0, then PASS. `git diff docs/calculator-v2-bundle-baseline.json` shows `standaloneGzipBytes` set and any measured drift within the budgets. If the check prints the TR-74 positive-control problem (the minified lazy group no longer holds the sentence verbatim), set `CORE_MARKER` to `"This row is nested too deeply."` (`rowErrorMessage("too-deep", [])`, 01 section 3) with its comment, change the marker test's `rowErrorMessage("syntax", [])` to `rowErrorMessage("too-deep", [])`, and repeat this step; if the positive control still fails, stop and report to the lead.
- [ ] **Step 5: Commit.** `git add scripts/build/check-calculator-v2-bundle.mjs docs/calculator-v2-bundle-baseline.json tests/unit/calculator-v2/standalone-budget.test.ts tests/unit/calculator-v2/bundle-check.test.ts && git commit -m "Add the standalone budget and the TR-74 eager rule to the bundle check"`
- [ ] **Step 6: Mutation check (the eager-import test, R4).** At the top of `src/components/calculator/use-transfer-bridge.ts` add the line `import "@/components/calculator-v2/host/quiz-host";` (a value import from eager quiz code into the lazy chunk); run `npx vitest run tests/unit/calculator-v2/standalone-budget.test.ts -t "TR-74 the eager transfer modules"`. Expected: FAIL at the first `toEqual([])`, received `["src/components/calculator/use-transfer-bridge.ts -> @/components/calculator-v2/host/quiz-host"]` (the list entry added for 14 note 4 is what catches it). Then `git checkout -- src/components/calculator/use-transfer-bridge.ts` and rerun; Expected: PASS.
