# 12 transfer-core: classifier, payload, question-dialect normalisation, apply step and transfer corpus

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Package:** `transfer-core`, increment 1B, wave 6. Depends on 02-parser, 04-semantics,
07-engine-worker, 09-editor-ui and 10-shell, all merged with 1A. Read `00-index.md` (Global Constraints and
sections 4 to 6) and `01-interfaces.md` sections 0 to 4, `01-interfaces-runtime.md` section 8 and
`01-interfaces-integration.md` sections 12 and 14 first; every name below matches them. This file
holds the package's shared header; its 14 tasks are in five part files, each under 700 lines
(table below).

**Goal:** Decide, without the v2 parser, which question math gets a Transfer control and what it
inserts (the eager classifier and payload in `src/lib/calculator-transfer/`), normalise question
dialect by table 4.1, apply payloads to the calculator through its public API with Phase 1 naming,
duplicate, dependency, limit and undo rules (the lazy `transfer/apply.ts`), and prove both halves
on the golden corpus and a committed transfer fixture corpus.

**Architecture:** Eager, framework-free modules (`payload.ts`, `normalize.ts`, `lex.ts`,
`segment.ts`, `names.ts`, `describe.ts`, `classify.ts`) read only question text through the
splitter MathText renders with (`src/components/learn/math-segments.ts`). A small lexer and
recursive-descent recogniser implement tables 4.1 and 4.2 and the TR- rules; they import nothing
from `src/lib/calculator-v2/` (AR-3, TR-74). The lazy `src/components/calculator-v2/transfer/`
validates with Zod, plans with the v2 parser and `analyzeRows` (canonical LaTeX, names, limits,
errors), and commits one `setExpressions` call. `quiz-host.ts` gains `applyTransfer`.

**Spec:** `c-transfer.md` sections 3 to 7, 11 (table 11.1), 12, 13 (TR-77) and 14;
`a-math-semantics.md` PR-1, PR-5, PR-6, PR-21 (bar pairing), PR-44; `d-architecture-integration.md`
AR-3, AR-16. Open items: OI-6 (Task 3, spec text before the PR-1 and PR-6 tests), OI-22 (Task 9).

**IDs (36):** PR-1, PR-5, PR-6, PR-44; TR-1, TR-3, TR-5 to TR-14, TR-18 to TR-21, TR-26 to TR-28,
TR-32, TR-35 to TR-38, TR-40, TR-71 to TR-73, TR-77, TR-79; AR-3, AR-16.

**Owns** (00-index section 2): `src/lib/calculator-transfer/` except `clipboard.ts` and
`clipboard.test.ts`; `src/components/learn/math-segments.ts`; `src/components/learn/MathText.tsx`;
`src/components/calculator-v2/transfer/`; `core/corpus/cases/question-dialect.ts`. Extension edit:
`src/components/calculator-v2/host/quiz-host.ts` (00-index 5.2). Spec text: OI-6, OI-22.

## Plan files

Tasks run in number order; each part starts where the previous one ends.

| File                              | Tasks    | Concern                                                                                                 |
| --------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `12-transfer-core-1-normalize.md` | 1 to 3   | Payload contract and messages; shared segment splitter; question-dialect normalisation and its corpus   |
| `12-transfer-core-2-lex.md`       | 4 and 5  | Question-math lexer (tables 4.1 and 4.2); segment grammar, types, Phase 1 gates and segment narrowing   |
| `12-transfer-core-3-classify.md`  | 6 to 8   | Stem items, descriptions and boundaries; question function names, dependencies, item narrowing; choices |
| `12-transfer-core-4-apply.md`     | 9 and 10 | Apply step (validation, core check, insertion, undo); apply-time duplicates, renames and dependencies   |
| `12-transfer-core-5-corpus.md`    | 11 to 14 | Quiz host entry; transfer fixture corpus; one-parser verification (PR-1); package gate                  |

## Conventions

- Paths: `ct/` is `src/lib/calculator-transfer/`, `tr/` is `src/components/calculator-v2/transfer/`,
  `cases/` is `src/lib/calculator-v2/core/corpus/cases/`. Commands run from the worktree root
  under Node 22 (00-index section 1): every `npx`, `npm` and `node` command in the part files is
  written with the `n exec 22` prefix this machine needs, whose default Node is newer; `git` and
  `grep` commands carry none.
- Test helpers, declared locally in each test file that uses them:
  `REAL = { angleMode: "radians", complex: false } as const`;
  `stem(text, serializedFunctionLines = false): StemInput`;
  `N(s, c = "math") = normalizeQuestionMath(s, c)`;
  `verdicts(text) = [...explainStem(stem(text))].map(([i, v]) => [i, "item" in v ? "item" : v.rule])`;
  `rowsOf(text) = [...classifyStem(stem(text))].map(([i, t]) => [i, t.payload.rows, t.payload.dependencies])`;
  `P(rows, extra = {}): TransferPayload` = `{ version: 1, questionKey: "a1:q1", sourceId: "stem:1", description: "test", format: "rows", dependencies: [], rows, ...extra }`;
  `seeded(rows: string[] = [])` = `createTestEngine().engine` (07's `core/api/__fixtures__/test-engine.ts`),
  then `setExpressions` with ids `"1"…"n"` when `rows` is non-empty, then `clearHistory()`;
  `latexOf(e) = e.getExpressions().map((r) => r.latex ?? "")`;
  `analysed(e) = analyzeRows(e.getExpressions().map((r) => ({ id: r.id, latex: r.latex ?? "", hidden: r.hidden ?? false })), REAL)`.
- Segment indexes in tests are positions in `splitMathText(text, serializedFunctionLines, true, true)`
  (decision 1); every segment counts, text segments included.
- No non-null assertions in tests or code (`if (!x) throw new Error(...)` instead), so lint stays clean.

## Decisions binding this package

1. **Segment index.** A stem item's map key and its `sourceId` (`stem:<i>`) use the index `i` in
   one whole-text call `splitMathText(text, serializedFunctionLines, true, true)`, which is what
   `01-interfaces-integration.md` section 14 records ("stem:<splitMathText index>") and what 14's
   Task 5 computes (`mathKeys`: the k-th rendered math segment gets the index of the k-th non-text
   segment of that call). Every segment counts, text included: source markers (`[[u]]`, `<i>`, …)
   stay inside text segments, and a currency `$` the splitter keeps as text yields two text
   segments (`"costs $"`, then the rest), each with its own index. For `Use <i>$a=1$</i>$b=2$` the
   items are `stem:1` and `stem:3`. MathText still renders run by run (underline, italic, then
   `splitMathText` with line-edge flags); Task 2 pins that its rendered math segments are, in
   order, exactly the non-text segments of the whole-text call.
2. **Plain text.** `isPlainMathText(s)` is true when `s` contains none of `\ { } ^ _`. Only then do
   table 4.1's plain `a/b` rule and the plain mixed form `a b/c` apply, with guards: the integer
   `a` is not preceded by a letter, digit, `.`, `^`, `_`, `}` or `\`, and `b` is not followed by a
   digit, `.` or `^`. Under PR-18 the tree is unchanged (`div` either way). The Unicode rows of
   table 4.1 (`²`, `³`, `π`, `θ`, `√(…)`) apply to any input, as PR-4 already does in the parser.
3. **Spacing.** A control word (`\` plus letters) consumes the spaces after it, as in TeX; the
   output puts one space between a command name and a following letter (`4·x` gives `4\cdot x`,
   `2\quad x` gives `2x`, `\sin 30` gives `\sin30`). No other whitespace changes.
4. **Default deny for unlisted notation:** `\ ` and `\qquad`, `\tau` (v2 reads it as 2π), `\lt`,
   `\gt`, uppercase Greek, `\{` outside a system wrapper, `√` not followed by `(`, raw `|` that
   cannot pair, and the functions `\csch`, `\sech`, `\coth`, `\arccsc`, `\arcsec`, `\arccot` (not
   in table 4.2) all give `TR-8`; so does `\frac` or `\sqrt` without braces (`\frac12`, `\sqrt2`),
   which table 4.2 allows and which this plan denies only as deviation D3. TR-24's cell thousands
   rule waits for Phase 3.
5. **Letter runs.** A maximal run of Latin letters outside a command is a function token when it
   equals a `SEGMENT_FUNCTIONS` name (`sin`, `ln`, …); otherwise a run of three or more letters is
   `TR-9`, a run of one or two letters that is a unit word after a digit (spaces allowed, D2) is
   `TR-9`, and every other letter is an identifier (`i` alone is `TR-9`).
6. **Rule IDs on items:** expression `TR-11`, equation `TR-13`, inequality `TR-11`, function
   `TR-13`, system `TR-12`, choice `TR-40`. Rejections report the first failing check in this
   order: size (`TR-21`), lexer (`TR-8`, `TR-9`), system shape (`TR-12`), grammar (`TR-8`; `TR-13`
   for a question-function call without exactly one argument; `TR-21` for nesting deeper than 64),
   relation chain (`TR-11`), lone symbol (`TR-10`, stem only), Phase 1 gates (`TR-77`), segment
   narrowing (`TR-21`); then in `classify.ts`: a candidate stem definition in the cycle set
   (`TR-21`, decision 9; the set is computed before any segment resolves, so a definition in a
   cycle gets `TR-21` before its own calls are looked at), a call whose name lacks exactly one
   exportable definition (`TR-20`), and, once dependencies are known, item duplicates and cycles
   (`TR-21`), `r` through dependencies (`TR-77`) and a point with an undefined `t` (`TR-77`).
7. **TR-21 narrowing** (each mirrors a v2 row error; no core import, AR-3).
   - Segment level (`segment.ts`): a bare expression using both `x` and `y` (mixed-variables); a
     value definition of `e`, or an equation whose left operand is exactly `\pi` or `e`
     (reserved-name); a function parameter in `r e i \theta` (reserved-name); a defined name used
     in its own body (cycle); a point using `x` or `y` (point-coordinates); more than 2,048
     characters (`MAX_ROW_CHARACTERS`, limits); more than 600 lexer tokens (too-many-nodes, see
     below); nesting deeper than 64 by 02's G13 count, where each group, `\left|…\right|` bar,
     `\frac` argument, `\sqrt` index or argument, exponent, subscript and call argument list adds
     one level and a braced or `(` argument counts once (`MAX_NESTING_DEPTH`, too-deep).
   - The token cap is a plan value, not a spec value: a safe proxy for 02's `MAX_TREE_NODES`
     (2,000), which the classifier cannot count without the parser (AR-3). Each lexer token adds
     at most one node to 02's tree: a `num` or `pi` token one leaf; a `name` token one leaf, or
     the `call` node when it heads a question-function call; a binary operator, a `-` sign
     (`neg`; a `+` sign adds none), `frac`, `sqrt` and `fn` one node each; an `absOpen` the `abs`
     node and its `absClose` none; the `(` of a pair the `point` node, any other `(` none; the
     relation tokens of a chain one `rel` node together; `)`, braces, brackets, `comma`, `semi`,
     `_` and the environment tokens none. The only node without a token is the `mul` of implicit
     multiplication, at most one between two adjacent tokens. So a segment of t tokens parses to
     at most 2t − 1 nodes, and 600 tokens bound a row at 1,199 nodes, under 2,000 with margin.
     System lines are rows of the same segment, so the cap bounds each of them too.
   - Stem level (`classify.ts`, before any segment resolves): candidate stem definitions in the
     cycle set of decision 9 (cycle, RC-8).
   - Item level (`classify.ts`, after dependency resolution): rows of one item that define one
     name twice, as values or functions (duplicate-definition, RC-7), and rows plus dependencies
     whose definitions reach each other through `names` and `calls` in a cycle (cycle, RC-8).
     Dependencies never share a name with each other (decision 9) or with an item row (decision
     9's stop rule), so these two checks cover every duplicate and cycle an item can carry.
   - The TR-21 tests (Tasks 5, 7 and 8) are the arbiter: a disagreement they find narrows the
     classifier, never the core.
8. **TR-77 Phase 1 gates.** In `segment.ts`: `\sinh \cosh \tanh`; any `\theta`; `r` used outside a
   value definition of another name (a function's own parameter `r` is a TR-21 case); a segment
   that is one or more points (pairs); a function coordinate `name(c)=d` with `name` a question
   function name and `c`, `d` numeric constants. In `classify.ts`, once dependencies are known: a
   non-definition row whose dependency rows use `r`; and a row with a point whose coordinates use
   a free `t` (not the row's own function parameter), directly or through the item's dependency
   definitions, while neither the item's rows nor its dependencies define `t`. This is TR-77's "a
   point whose parts depend on a t that no row defines": a stem definition of `t` that becomes a
   dependency is inserted first, or the calculator's own `t` is used (TR-37), so `t` is defined.
9. **Dependencies.** A _candidate definition_ is a stem segment of exactly one row that defines a
   value (`n=…`, `n` not `x`, `y`) or a function (`f(v)=…`) and passes `classifySegment`. Before
   any segment resolves, `classify.ts` computes the _cycle set_: every candidate that lies on a
   cycle of the graph with an edge from each candidate to every candidate defining a name in its
   `names` or `calls` (all definitions of that name, however many). Each candidate in the cycle
   set gets `TR-21`. An _exportable definition_ is a candidate outside the cycle set whose own
   resolution (decision 6's `classify.ts` checks) gives an item, so a definition that fails its
   own call check (`TR-20`) is not exportable and is never inserted as a dependency that the
   calculator would read as a product. Candidates outside the cycle set form an acyclic graph, so
   this recursion ends. A name with exactly one exportable definition is a dependency of any other
   item using or calling it, transitively, deepest first, without repeats; a call to a name with
   zero or several exportable definitions is `TR-20`. So in
   `If $f(x)=g(x)+1$ and $g(x)=f(x)$, graph $y=f(x)$.` both definitions are in the cycle set
   (`TR-21`) and `y=f(x)` calls an `f` with no exportable definition (`TR-20`). **Stop rule:** a
   name that one of the item's own rows defines is never a dependency and needs no outside
   definition (no `TR-20` for calling it); resolution does not continue through it. So `$a=2$`
   with `$\begin{cases}a=5\\y=ax\end{cases}$` gives the system rows `a=5`, `y=ax` and no
   dependency.
10. **Apply-time names (TR-35 to TR-37, TR-72).** "Used" names are those defined (`defines`) or
    referenced (`uses`) by any existing row's analysis. A dependency is written only when its name
    is unused. A transferred definition of a name the calculator defines with different canonical
    LaTeX is renamed to the lowest `b_{n}` (n ≥ 2) that is unused and not written by this transfer,
    unless an existing `b_{n}` definition equals the renamed row, which is then a duplicate. A row
    equal (canonical LaTeX) to an existing row or an earlier row of the same transfer is not
    written. All rows duplicate gives `already-present`; otherwise `renamed` when any rename
    applied (the message names the first) and `added` else. The focus row is the first payload row
    (written or matched), never a dependency.
11. **Commit.** One `setExpressions` of the writes; new ids continue the decimal sequence above
    the largest decimal id present; the first write reuses the last row's id when that row's latex
    is blank (OI-22). `TransferTarget` cannot see 07's id counter (07 decision 7), so a transfer
    right after the student deletes the last row writes that row's freed id again; precondition
    P4 confirms that this is safe and Task 9's freed-id component test checks the rendered list.
    Any inserted row with an error, any existing row that gains one (its error is `null` before
    the transfer and not `null` in the prospective list; a row that already errors, such as
    `x+y`, never blocks a transfer), more than `MAX_ROWS` rows or a written row over
    `MAX_ROW_CHARACTERS` rejects the whole transfer. A collapsed list is expanded on every
    non-rejected result. Errors thrown by the target give `rejected`; focus errors after a commit
    are ignored.
12. **Mixed-number positions (PR-6, TR-28).** PR-6's "starts the math or follows an operator,
    relation, comma or opening bracket" is read as: the start of the math; after `+ - * / = < >`,
    `\cdot`, `\div`, `\le` or `\ge`; after `,`; after an opening `(`, `[` or `{`. A digit run that
    starts right after `^` or `_` is never the integer `a`: under 02's G4 a brace-less exponent or
    subscript is one token, so in `x^2\frac{1}{2}` the `2` is the whole exponent and the fraction
    sits on the baseline. The question shows x²·½, and the unchanged row parses to that product,
    the same tree as its typed twin. Inside a braced exponent the integer follows `{` and the rule
    applies (`x^{2\frac{1}{2}}` becomes `x^{\left(2+\frac{1}{2}\right)}`).

## Deliberate deviations (lead sign-off, precondition P3)

D1 and D2 follow from one fact: TeX ignores spaces in math mode, so the source spellings below
render identically and the student cannot tell them apart. D3 keeps default deny (TR-5) for a
spelling that the PR-6 pass would otherwise misread.

- **D1 (PR-6, TR-28; Task 3 Step 4 pass 8).** PR-6 says the integer is "followed directly by"
  `\frac`. This plan also accepts spaces between them: `y=2 \frac{1}{3}x` becomes
  `y=\left(2+\frac{1}{3}\right)x`. The question shows the mixed number 2⅓ either way; the
  product reading would insert a row worth (2/3)x where the question shows (7/3)x. Tests that
  rely on it carry the comment `// D1`.
- **D2 (TR-9 units; decision 5, Task 4).** Table 4.2 excludes units "directly after a digit". This
  plan also excludes a unit word separated from the digit by spaces: `5 mm` is `TR-9`, because it
  renders as `5mm` and would otherwise insert 5·m·m. Tests that rely on it carry `// D2`.
- **D3 (TR-8; decision 4, Task 4).** Table 4.2 allows `\frac` and `\sqrt`, and both TeX and 02's
  parser (G4 single-token arguments; 02's PR-16 case 49 parses `\frac12` as `(div (num 1) (num 2))`)
  read a brace-less argument as one token, so `\frac12` is ½ and `\sqrt2x` is √2·x. This plan
  gives the brace-less spelling `TR-8` instead of accepting it, because the package's other
  question-dialect rules are written for braces. Above all, Task 3's PR-6 pass matches
  `2\frac{1}{2}`; accepting `2\frac12`, which also renders as 2½, without teaching that pass the
  second spelling would insert the product 1 where the question shows 2½, the harm PR-6 exists
  to prevent. The TR-10 lone forms, `plainMath` and `renameName` would each need the second
  spelling too. Denying costs a missing control, and TR-80's bank scan (Phase 3) reports whether
  the spelling occurs in live questions. Tests that rely on it carry `// D3`.

If the lead rejects D1, pass 8 drops "optional spaces" and the PR-6 row `y=2 \frac{1}{3}x`
expects `y=2 \frac{1}{3}x` unchanged. If the lead rejects D2, decision 5 drops "(spaces
allowed)" and `5 mm` moves from Task 4's TR-9 list to its "exclusions are exact" list. If the
lead rejects D3: Task 4's lexer reads a `\frac` or `\sqrt` argument that does not start with `{`
(or `[` for a `\sqrt` index) as 02's G4 single-token argument (one digit split off a digit run,
whose rest is lexed next; one Latin letter; `\pi`; a Greek identifier command) and emits it
between zero-width `open:{` and `close:}` tokens, so later stages see one spelling; Task 3's pass
8 also matches `a\frac bc` with single digits `b < c` and writes the same braced sum; `plainMath`
reads the single-token arguments (`\frac12` → `1/2`); `renameName` braces a renamed single-letter
argument (`\frac a2` → `\frac{a_{2}}2`); `\frac12` and `\sqrt2` leave Task 4's TR-8 list for its
first test (`["frac:\\frac", "open:{", "num:1", "close:}", "open:{", "num:2", "close:}"]` and
`["sqrt:\\sqrt", "open:{", "num:2", "close:}"]`), `\frac12` joins Task 5's stem TR-10 list, and
Task 3's PR-6 rows gain `2\frac12` → `\left(2+\frac{1}{2}\right)` for `"math"`.

## Preconditions and notes for the lead

Preconditions, confirmed by the lead before the named task starts:

- **P1 (before Task 2): index scheme.** Decision 1 uses the whole-text `splitMathText` index that
  `01-interfaces-integration.md` section 14 already records and 14's Task 5 already computes, so
  neither file changes and this package adds no cross-package name. Optional clarification of the
  section 14 comment: `"stem:<index in splitMathText(text, serializedFunctionLines, true, true)>"`.
- **P2 (before Task 6): 00-index section 5.3 rows, a check only.** Both rows are already in
  section 5.3; confirm they are there, each once, with this text, and add nothing:
  `| TR-50 | 14 | 12: descriptions and occurrence numbering, ct/describe.test.ts, ct/classify.choice.test.ts |`
  and
  `| PR-1 | 12 | 13: pasted plain text and pasted rendered question math (OI-6) parse to the tree of their typed twin, clipboard.test.ts |`.
  Also confirm that 13's plan has the `PR-1`-titled paste-dialect test in `clipboard.test.ts`
  (13's paste path is the third input dialect PR-1 names; Task 13 here covers typed and API
  input). The check is
  `grep -cE '^\| (TR-50 +\| 14|PR-1 +\| 12) ' docs/superpowers/plans/2026-10-16-calculator-v2-phase1/00-index.md`,
  which prints 2, and
  `cat docs/superpowers/plans/2026-10-16-calculator-v2-phase1/13-paste-standalone*.md | grep -c 'it("PR-1 pasted plain text and pasted rendered question math'`,
  which prints 1.
- **P3 (before Task 3): deviations D1, D2 and D3** signed off, or rejected with the fallbacks
  above.
- **P4 (before Task 9): freed row ids.** Decision 11 writes a freed id again when the student
  has just deleted the last row, while 09's `useRowPresence` may still hold that id as an exiting
  row (AN-5). The lead confirms with 07 and 09 that a `setExpressions` call carrying an id
  deleted earlier in the same blank cycle is an ordinary new row for 07's engine and renders as
  one list item in 09's list, also while the deleted row still exits. Undo of a deletion already
  brings an id back while its row exits, so both packages need this with or without transfers.
  Task 9's freed-id component test checks the rendered side; if it fails, the defect is 09's (the
  undo path fails the same way), the lead routes the fix to 09, and decision 11's id rule stays.

Notes:

- 14 owns TR-50; the TR-50-titled tests here (Tasks 6 and 8) are contributions recorded in
  section 5.3's TR-50 row (checked by P2).
- 14 renders a control from `items.get(segmentIndex)`. If a source marker sits inside a math
  delimiter pair (`$a<i>b</i>$`), MathText's run-by-run rendering finds a different number of math
  segments than the whole-text split, and later ordinals shift. Such a segment is always rejected
  here, but 14 may add a cheap guard: render only when `segments[segmentIndex]` has the wrapper's
  own `latex`.
- Task 14 measures the classifier's eager gzip as an early signal for AR-33 (14 and 15 gate it).

## ID coverage

Every ID of this package has at least one test whose title (or corpus `rules` entry) names it:

| Task | IDs                                                           |
| ---- | ------------------------------------------------------------- |
| 1    | AR-16, TR-35, TR-36, TR-73                                    |
| 2    | TR-6                                                          |
| 3    | TR-7, TR-28, PR-1, PR-5, PR-6, PR-44 (and the corpus `rules`) |
| 4    | TR-8, TR-9                                                    |
| 5    | TR-10 to TR-14, TR-18, TR-21, TR-77                           |
| 6    | TR-1, TR-3, TR-5, TR-6, AR-3 (TR-50 contribution)             |
| 7    | TR-18 to TR-21, TR-37, TR-77                                  |
| 8    | TR-1, TR-21, TR-37, TR-40 (TR-50 contribution)                |
| 9    | AR-16, TR-26, TR-27, TR-32, TR-38, TR-71, TR-73, PR-44        |
| 10   | TR-35 to TR-38, TR-72                                         |
| 11   | TR-71                                                         |
| 12   | TR-79, PR-44                                                  |
| 13   | PR-1                                                          |
| 14   | gate: `check-spec-ids.mjs --ids` with all 36 IDs              |
