# 04 semantics: row analysis, evaluator, Phase 1 built-ins and number display

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Package:** `semantics`, increment 1A, wave 1, depends on 02-parser. Read `00-index.md` (Global Constraints, sections 4 and 5) and `01-interfaces.md` sections 0 to 4 first; names below match them. This file holds the package's shared header (IDs, contributions, Conventions, Decisions); its 10 tasks are in two part files, each under 700 lines (table below). Index section 2 still names only this file, which stays the package's entry point.

**Goal:** Classify every row (kind, chips, errors, dependency order, `RowAnalysis.graph`), evaluate rows and real plot functions with the Phase 1 real and complex rules, implement the Phase 1 built-ins with exact angles, and format numbers, points and complex values, with classification and display expectations held in the golden corpus.

**Architecture:** `core/analysis/` parses each row once after the PR-23 function pre-scan, resolves definitions across rows and classifies in RC-2's order. `core/eval/` compiles trees into closures over `Value` (plus a real-mode `number` path for plotting) and formats display text. `core/lib/` holds built-ins, arities, exact trig tables and test tolerance classes. No DOM (AR-44).

**Spec:** `a-math-semantics.md` sections 3 and 4 and G-6; `b-functions-and-data.md` sections 2 to 4 and FN-60. Defaults marked "confirm by REA behaviour capture" ship as written (index section 8).
**IDs (57):** RC-1 to RC-15, RC-17, RC-19, RC-20; NM-1 to NM-6, NM-8 to NM-14, NM-17 to NM-22, NM-25 to NM-28, NM-43; G-6; FN-1, FN-4, FN-6, FN-11 to FN-14, FN-17 to FN-22, FN-60.
**Contributions made (00-index 5.3; requested in 15-release-gates "Notes for the lead", which asks the lead for the four 5.3 rows):** Task 9 writes the counted corpus cases for NM-16 (owner 07) and RC-21 (owner 11) in `cases/classify-rows.ts`, and for NM-24 (owner 11) and NM-29 (owner 10) in `cases/display-numbers.ts`. It also writes the counted cases PR-41's coverage test needs for this package's NM-8 and NM-43.

<!-- prettier-ignore-start -->
## Plan files
Tasks run in number order; part 2 starts where part 1 ends.

| File | Tasks | Concern |
| --- | --- | --- |
| `04-semantics-1-analysis.md` | 1 to 4 | Reserved names and row error copy; definitions, values and chips; relations, points and graph descriptors; collisions, cycles, order and arity (RC-, G-6) |
| `04-semantics-2-eval.md` | 5 to 10 | Number display; real powers, roots and complex arithmetic; built-ins with exact angles; closure compiler and row evaluation; display and domain golden cases; reference values, tolerances and the package gate (NM-, FN-) |

## Conventions
- Paths: `analysis/`, `eval/`, `lib/`, `corpus/` are folders of `src/lib/calculator-v2/core/`; `cases/` is `corpus/cases/`.
- Commands run from the worktree root under Node 22 and carry the `n exec 22` prefix (index section 1).
- Expected failures quote Vitest 4.1 in the node environment, which every test here uses: a missing module fails the whole file with `Error: Cannot find module './x' imported from <absolute path>`,
  naming the file's first missing import in source order (each Step 2 lists that order); calling a missing export fails each test with `TypeError: x is not a function`.
- Test helpers, declared locally where used: `REAL = { angleMode: "radians", complex: false } as const`, `DEG` and `CX` (REAL with degrees or complex); `P = Math.PI`;
  `src(l: string[])` gives `RowSource`s with ids `r0, r1, …` and `hidden: false`; `analyze(l, s: AnalysisSettings = REAL) = analyzeRows(src(l), s)`; `n = numberValue`;
  `codes(l)` = each row's `error?.code ?? null`; `tree(latex, userFunctions?)` = the `parseLatex` tree (throws on error); `rel(a, b) = Math.abs(a - b) <= 1e-13 * Math.abs(b)`.
- Number-level functions return `NaN` for undefined; `numberValue` maps every non-finite number to `UNDEFINED`. Trig results are returned as `v + 0`, so `-0` never leaves `lib/trig.ts`;
  nothing else normalises `-0` (`numberValue`, `toPlotNumber` and `compileReal` keep it), and only `formatNumber` shows it as `0`.
- **Corpus notation.** A bullet holds cases in file order (ids `<file>-<n>`, 1-based): an optional `{deg}`, `{cx}` or `{deg, cx}` prefix sets `settings` for every case
  in it; cases are separated by ` · `; `[rows: …]` after a case sets its `rows`; after `→` come the case's expected fields, comma-separated: a kind word, `chips […]`, `error <code>`
  (kind `error` too) and a quoted `display`; the closing parenthesis is `rules` for every case in the bullet. A case with a kind other than `empty` or `error` and no chips listed gets `chips: []`.

## Decisions binding this package
**Contract amendments.** `01-interfaces.md` and 07 already state the amendments this package's tests assert; Task 1 Step 0 checks that they stay there before wave 1 starts:
- 01 section 3: the "`RowGraph` by kind" paragraph ends "A one-parameter function-definition gives `explicit` `{ independent: "x", expr: (call f (id x)) }` spanning the row; two or more parameters
  give `null`." (decision 1); `functions` has the comment `// error-free function definitions; also holds each error-free dependent definition as a zero-parameter entry` (decision 2); and
  `userFunctionNames(functions: ReadonlyMap<string, FunctionDefinition>): ReadonlySet<string>` (names whose `params.length > 0`) follows `rowErrorMessage`.
- 01 section 4: decision 5's text after the `evaluateRows` signature and decision 6's first sentence after `compileExpression`, both verbatim.
- 07 Task 5: `runHelper` parses with `{ userFunctions: userFunctionNames(analysis.functions) }`, so after `a=2x` the helper `a(x+1)` is a product, as the row `a(x+1)` is (04 Task 2 asserts that
  tree), and 07's API-10 test pins it.

1. **RC-5 graph.** A one-parameter `function-definition` gets `{ kind: "explicit", independent: "x", expr: (call f (id x)) }` spanning the row and is graphable; two or more parameters give `null`. 07's `plotInputFor` maps `row.graph`, so it needs no change.
2. **Dependent definitions** (RC-6) appear in `AnalysisResult.functions` as zero-parameter `FunctionDefinition`s and evaluate in the caller's `vars` (so `y=a` after `a=2x` compiles); constant definitions reach compilers only through `CompileScope.values`. They are never callable: rows parse with the pre-scanned heads only, and helpers with `userFunctionNames`.
3. **`RowError`:** `names` holds `displayName` text, `[name, arityText]` for `arity`; `span` is the parse error's span, the call's span for `arity`, the first use for `dependency` and `unsupported`, else `null`. Chips hold LaTeX names (`"a_{1}"`). A row with an error has `chips: []`, `complexHint: false`, `graph: null` and keeps `tree` and `defines`.
4. **Error precedence** per row: parse error; head errors (`too-many-params`, `reserved-name`, `unsupported` for `r=`/`\theta=`, a repeated parameter as `duplicate-definition`); `duplicate-definition`; `cycle`; `arity`; `dependency`; `unsupported` (r, θ, unbound `t`); `point-coordinates`; `mixed-variables`. A row using a name defined in a cycle, or calling a function whose head row has an error, has no error and evaluates to `UNDEFINED`.
5. **`evaluateRows`** returns entries only for error-free, chip-free rows of kind `value`, `definition` and `point`. It calls `deadlineFor(id)` once per evaluated row, checks that `Deadline` before evaluating the row and passes it to the row's `Compiled` closure, which calls `deadline.check()` at every user-function call. A row whose check throws `DeadlineExceeded` is omitted, its dependants evaluate to `UNDEFINED`, and callers learn of expiry through their own `deadlineFor`.
6. **Relations as expressions** (NM-22): `compileExpression` on a `rel` node gives `n(1)` when every link holds between real operands, else `UNDEFINED`. `relationHolds` (`eval/ops.ts`, Task 8) is that test, and `evaluateLatex` shows a `constant-relation` case row through it (Task 8 Step 3). 07 Task 3 builds one `{ kind: "rel", ops, operands, span }` node per constant-region row and evaluates it once with `compileExpression` (01 section 4's decision-6 comment).
7. **Complex details:** a complex result with `im === 0` is a `number`; a zero part on a branch cut reads as `+0` (C99); a non-real inverse-trig result stays in radians in degree mode; arithmetic with a point gives `UNDEFINED`; a point stores `NaN` for an undefined or non-real coordinate and shows `(1, undefined)`.

<!-- prettier-ignore-end -->
