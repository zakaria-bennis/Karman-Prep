# Phase 2 maths implementation plan for Calculator V2: lists, factorial and number theory, piecewise and restrictions

## What the code accepts today

> **Rebased onto main, 2026-10-19.** This plan was written against an older base. Main has since
> shipped list literals and ranges (PR-34), element-by-element list evaluation and range expansion
> (NM-32 to NM-38), list errors in analysis including `nested-list` (NM-34), regressions on list
> rows and point lists, and Desmos-style row errors and tooltips (R-2, R-5). The "today" notes
> below and tasks T6 to T8 describe the old base: re-scope them against main's `latex/lists.ts`,
> `eval/lists.ts` and `analysis/lists.ts` before starting, and keep main's behaviour and wording.
> T1 to T5 were carried over onto main.

- **Normalizer.** `\left\{` and `\right\}` become `\{` and `\}` (normalize.ts:178-188). The tokenizer reads them as commands named `{` and `}` (tokens.ts:163-168). Nothing rewrites `\ldots`.
- **Ellipsis bug.** There is no ellipsis token. `1...10` currently tokenizes as `1.`, `.`, `.10`, because readDigits takes a single dot (tokens.ts:81, 134-153). Ranges cannot parse until this is fixed.
- **Postfix and brackets.** `!` is rejected as unsupported (atoms.ts:27, 84-86). `[` in atom position is rejected (atoms.ts:124). `\{` falls into parseCommandAtom and comes back unsupported (atoms.ts:337).
- **Relations.** Relations only exist at the top of a row (parser.ts:85-98). Conditions inside brackets or braces need a new entry point.
- **Value model.** `list` already exists (values.ts:14). Formatting already prints lists (format.ts:26, 33), and the API already reports number lists (api/results.ts:77-82). The helper API's `listValue` exists too.
- **Duplicated walkers.** The child-node switch is copied in ast.ts:22, classify.ts:133 and names.ts:56. The printer and both compilers also switch exhaustively on node kinds.
- **Built-in gate.** One global gate, `SHIPPED_PHASE = 1`, controls which built-ins are available (operator-names.ts:44, 225-228). Tests pin it: operator-names.test.ts:10 (104 names) and :24-43, and elementary.reference.test.ts "FN-1" (15 built-ins, phase 1).
- **Plot output.** CurveGeometry, LineSetGeometry, PointGeometry and RegionGeometry are flat arrays, with NaN pairs separating runs (plot/geometry.ts). So several branches can be joined into one geometry with no protocol change.
- **Seed.** The worker receives a seed in `hello`, but the executor throws it away (worker/executor.ts:81-83).

## Design decisions

- **New nodes** in ast.ts:10-19:
  - `list {items}`
  - `range {start, second: Node|null, end: Node|null}`. `end` is null only for an open slice like `L[2...]`.
  - `index {target, index}`
  - `piecewise {branches: {cond, value: Node|null}[], otherwise: Node|null}`
  - `fact` already exists.

  S-expressions: `(list …)`, `(range A B)` or `(range A S B)`, `(index L I)`, and `(piecewise C1 V1 C2 V2 O)`, with `_` standing for a missing value.

- **Restrictions are not a separate node.** Desmos treats `x\{0<x<2\}` as ordinary implicit multiplication by a piecewise that is 1 or undefined. So `y=x\{x>0\}` parses as `(rel = (id y) (mul (id x) (piecewise …)))`. Several restrictions chain as products, which gives PR-32's "and" for free.
  - **Departs from spec:** the `restrict` head in a-math §2.7 is never produced.
- **Index versus multiplication.** `[` straight after an id, a call, a list, a range, an index or a `)` group is an index (postfix level 10). After a number it is still multiplication, so `2[1,2]` is `[2,4]`.
- **Lists in graphs** use a new pass, `core/eval/branches.ts`, so the hot real-number compiler (compile-real.ts) stays numbers-only:
  1. Fold every subtree that does not depend on x or y into a constant: a list literal of numbers, or a single number.
  2. Inline user functions whose bodies hold lists.
  3. Count branches as the shortest list length (NM-33), without looking inside arguments of whole-list functions like `mean`.
  4. Produce one scalar tree per element.
- **Per-name shipping.** Replace the phase comparison with an explicit `SHIPPED` set in operator-names.ts. Each task adds its own names, so the build stays green at every commit.

## Tasks

Each task is one commit and starts with a failing test. Test titles lead with the requirement ID, as the repo convention requires.

### T1. Shared child walker (refactor, no behaviour change)

- **ast.ts:** export `sourceChildren(node)`, which returns children in source order (root index before root argument).
- **Use it** in classify.ts:122-160 and names.ts:55-83, and delete the two copies.
- **Why:** later tasks then change one switch instead of three.
- **Tests:** the existing suites stay green. Add one test in ast.test.ts that `sourceChildren` covers every node kind.

### T2. Ship built-ins by name; add `length` and `abs`

- **operator-names.ts:**
  - Add `SHIPPED: ReadonlySet<string>`, starting with the 15 Phase 1 names.
  - `isShippedBuiltin` reads the set. `phase` stays as information only. As built, the panel filters by `isShippedBuiltin` and `PANEL_PRESENTATIONS` (operator-names.ts, `PANEL_CATEGORIES`), not by phase, so a shipped name with a panel entry joins the panel at once. Only trig, inverse trig, exp, ln and log have panel entries, so the panel does not change.
  - Add `op("length", 4, 2, V)` and `op("abs", 12, 2, [1])`. Desmos accepts both. Confirm `abs` first.
- **Tests:**
  - operator-names.test.ts:10: count goes to 106.
  - New test: every name in `SHIPPED` has a rule. Put it in core/lib/builtins.test.ts, which avoids an import from latex into lib.
- **Desmos note:** typing `abs` or `length` will now become an operator name (PR-13 split, MathQuill autoOperatorNames). This matches Desmos.
- **As done:** `abs` shipped with T3. `length` is allowlisted only, not shipped: it is not in `SHIPPED`, so a row using it is `unsupported` until the statistics task ships list-reducing built-ins. f-desmos-parity.md lists it under "Not yet matched".

### T3. Number theory and rounding (FN-76, FN-77, FN-78, plus `abs`)

- **New file core/lib/number-theory.ts** with real rules:
  - `floor`, `ceil`, `sign`
  - `round(x[, n])`: halves away from zero, decided on the shortest decimal form
  - `mod(a, b) = a − b·⌊a/b⌋`
  - `nCr`, `nPr`: exact multiplicative loop below 2^53, 0 when r > n
  - `abs`
  - Complex rules return NaN, except `abs`, which returns the modulus.
- **Wiring:** builtins.ts:66 spreads these into `RULES`. compile-real.ts:196 picks them up automatically through `BUILTINS`. Add the names to `SHIPPED`.
- **Tests:**
  - builtins.test.ts: the spec examples, e.g. mod(−1,3)=2, mod(7,−3)=−2, round(1.005,2)=1.01, round(1234,−2)=1200, nCr(52,5)=2598960.
  - New corpus file core/corpus/cases/number-theory.ts, registered in cases/index.ts.
  - Update the "FN-1" test in elementary.reference.test.ts so it compares against `SHIPPED`, not phase 1.
  - Flip parse-errors.ts cases 28-29 only if they use these names (they don't).
- **Confirm in Desmos:** whether `round(−2.5)` is −3 (spec) or −2 (JavaScript); halves for `round(1.005,2)`; non-integer `nCr`.

### T4. Factorial (NM-15, NM-44, FN-79, PR-17, PR-20)

- **New file core/lib/gamma.ts:** Lanczos with g=607/128 and 15 terms, plus reflection for x < 0.5. Undefined at 0, −1, −2, …; overflow gives NaN.
- **Parsing:** remove `!` from `UNSUPPORTED_POSTFIX` (atoms.ts:27). The postfix loop (atoms.ts:87) builds `fact`, which resets `afterExponent`, so `3!^{2}` parses.
- **Evaluation:**
  - ops.ts: `factV`.
  - compile.ts:111-112 and compile-real.ts:141 call gamma(x+1) instead of returning undefined.
  - The printer already handles `fact` (printer.ts:99).
- **Reference values:** extend scripts/calculator-v2/reference-elementary.mjs with integer and half-integer factorials. Both have exact closed forms (half-integers through √π at 40 digits). Compare at 1e-12 using the `gamma` tolerance class in tolerance.ts.
- **Corpus:**
  - Move parse-errors.ts cases 11-15 into parse-operators.ts as trees: `(fact (pow (id x) (num 2)))`, `(mul (num 2) (fact (id x)))`, `(neg (fact (num 3)))`.
  - Display cases: 3!=6, −3!=−6, 3!^{2}=36, 0.5!=0.886226925453, 171! undefined, (−1)! undefined.

### T5. Hyperbolic functions (FN-68)

- **New file core/lib/hyperbolic.ts:** real and complex rules for all 12 names, angle `"none"`. arcosh, artanh, arsech and arcoth extend to complex.
- **Shipping:** add the names to `SHIPPED`. PR-26 `\cosh^{-1}` then works through calls.ts:149-155.
- **Corpus:** flip parse-errors.ts:30-31 and parse-calls.ts:28 (`sinhx`) to trees and values.
- **Reference values:** add mathjs BigNumber values to the elementary reference script.

### T6. List syntax: tokenizer, AST, parser and printer (PR-34 syntax)

- **tokens.ts:**
  - Add a `"..."` SymbolChar, emitted when three dots are adjacent.
  - readDigits (tokens.ts:140) must stop before a dot that is followed by another dot.
- **normalize.ts:30:** rewrite `\ldots` and `\dots` to `...`.
- **New file latex/lists.ts:** atoms.ts is 421 lines, so keep it out of there.
  - `parseList(state, open)`: `[]`, items, `[a...b]`, `[a,b,...,c]`.
  - `parseIndex(state, target)`: the content is `parseCondition` (a sum with an optional relation chain), or a range including the open `a...`.
- **parser.ts:** export `parseCondition`, reusing takeRelop and checkChain (parser.ts:187-218).
- **atoms.ts:**
  - Line 124 calls parseList.
  - The takePostfix loop (atoms.ts:83) also accepts an `open "["` token when the node can be indexed (see the index rule above).
- **Other updates:** printer.ts (list, range and index cases; add them to `BARE_BASES`), ast.ts `toSExpr` and `children`.
- **Placeholder:** compile.ts and compile-real.ts get exhaustive cases that return UNDEFINED or NaN until T7. T7 must land straight after, before any release.
- **Corpus:**
  - New file cases/parse-lists.ts: `[1,2,3]`, `[]`, `[1...10]`, `[1,3,...,9]`, `\left[1\ldots5\right]`, `L[2]`, `L[2...4]`, `L[L>2]`, `L[[1,3]]`, `2[1,2]` as mul, `[1,2]^{2}`.
  - Remove parse-errors.ts:17 and :53. Keep :54 (`for`); comprehensions stay unsupported.
  - Add printer round-trip cases.

### T7. List evaluation and broadcasting (NM-30 to NM-33, NM-35, NM-36, NM-38, FN-3, NM-32)

- **New file core/eval/lists.ts:**
  - `MAX_LIST_LENGTH = 10000`, added to latex/limits.ts.
  - `broadcast1` and `broadcast2`, truncating to the shorter list (NM-33). A nested result is UNDEFINED.
  - `makeRange`: the NM-36 element count formula, elements computed as a + k·s, the last element snapped to c, and a step of 0 is UNDEFINED.
  - `indexList`: 1-based. Out of range is undefined. A list of indices gives a list.
  - `sliceList`, and `filterList`, which keeps elements whose mask item is 1.
- **ops.ts:** wrap the arithmetic operators (`binary` at ops.ts:26) and the unary ones with the broadcast helpers. Add point × scalar for Desmos point scaling, needed by T10's restricted points.
- **compile.ts:**
  - A list, range or index node delegates to a new `eval/compile-lists.ts`, which takes `compileNode` as a callback so compile.ts (378 lines) stays small.
  - A `rel` node with a list operand gives an elementwise mask of ONE and UNDEFINED (compile.ts:130-140).
  - A `point` node whose coordinates hold lists gives a list of points (compile.ts:121-129).
- **builtins.ts:143 `applyBuiltin`:** any list argument broadcasts element by element (FN-3).
- **format.ts:26 and 33:** show the first 30 elements, then `…`.
- **Tests:**
  - compile.test.ts.
  - New corpus file cases/lists.ts with display cases: `[1,2,3]+[10,20]`→`[11, 22]`, `[10...1]`, `[0,0.1,...,1]` (11 elements ending at exactly 1), `[1,3,...,10]`, `[1...10.5]`, `L[0]` undefined, `L[2...4]`, `L[L>2]`, `\sin([0,\frac{\pi}{2}])`, `[1,2,3]!`, a 10,001-element range.
  - format.test.ts for NM-38.

### T8. List analysis (NM-34, G-2 point lists, RC-15)

- **corpus/types.ts:** add RowErrorCode `nested-list`. messages.ts gets the text "Lists can't contain other lists." Match Desmos's wording after a capture.
- **classify.ts:** a static check finds a list or range directly inside a list literal.
- **graph.ts:37:** `isPointShaped(node, lookup)` is true for:
  - a point
  - a list whose items are all points
  - an index of a point-shaped list
  - a mul of something point-shaped by a piecewise
  - an id whose value-definition body is point-shaped (through resolve.ts)

  Point-shaped rows get kind `point`.

- **from-analysis.ts:93-98:** accept a list of points.
- **Tests:** classify-rows corpus (`[(1,2),(3,4)]` is kind `point`; `(L_{1},L_{2})` with list rows); from-analysis.test.ts (points concatenated, undefined pairs skipped).

### T9a. Single-list statistics and gcd/lcm (FN-2, FN-23 to FN-29, FN-75)

- **New file core/lib/statistics.ts:** mean, median, min, max, total, count, length, var, varp, stdev, stdevp, mad, quantile, quartile, gcd, lcm.
- **New `LIST_FUNCTIONS` registry:** `apply(values: Value[]): Value`, with FN-2 concatenation of the arguments.
- **builtins.ts:** dispatch to the registry before the per-element path.
- **compile-real.ts:190:** a reducer call flattens its arguments (list-literal items, an id with a constant list value, scalars) into a buffer, so `y=\max(x,2)` graphs.
- **Tests:** builtins and statistics tests using the spec examples; corpus display cases; flip parse-errors.ts:28-29 (`mean(1,2)` = 1.5).

### T9b. Two-list and list-operation functions, shipped early (FN-30, FN-31, FN-35, FN-36, FN-38)

- **New file core/lib/list-functions.ts:** cov, covp, corr, join, sort(L[, K]), unique.
- **Spec departure:** appendix B schedules these for Phase 3. Ship them now because the owner wants Desmos parity, and record that in the spec.

### T10. Piecewise and conditions (PR-31, PR-32, NM-41, G-2, G-18)

- **parser.ts:32:** add `}` to `OPERATOR_COMMANDS`, so `\}` ends the implicit-multiplication run.
- **New file latex/piecewise.ts:** `parsePiecewise`. Parts are separated by commas, each `cond : value` with the condition from `parseCondition`. Only the last part may be a bare value (the otherwise case). `\{c\}` alone is allowed. A bare condition that is not a relation is a syntax error. atoms.ts:128 routes the `{` command here.
- **Evaluation:**
  - compile.ts: the first true condition wins. A list condition broadcasts. No true condition and no otherwise case gives UNDEFINED. A value-less branch is 1.
  - compile-real.ts: the same, with NaN short-circuit.
- **Printer:** `\left\{x>0:x,-x\right\}`.
- **Corpus:**
  - Remove parse-errors.ts:18-19.
  - Parse cases, including chained conditions such as `\{0<x<2:x\}`.
  - Kind cases: `y=x\{0<x<2\}` curve-y; `x^{2}+y^{2}=1\{x>0\}` implicit; `y>x\{x>0\}` region; `x=2\{y>0\}` curve-x; `(1,2)\{a>0\}` point.
  - Display: `\{0.1+0.2=0.3:1,0\}` gives 0, per NM-41 exact comparison.
  - Plot tests: the restricted explicit curve ends within 0.5 px of x=2 (explicit.ts EDGE_BISECTIONS already bisects to the domain edge); the region is shaded only where x>0.

### T11. Multi-branch graphs (G-3, G-22)

- **New file core/eval/branches.ts:**
  - `dependsOnCoordinates`: x and y, dependent definitions (zero-parameter entries in `scope.functions`), and user calls, memoized.
  - `foldConstants`, using compileExpression once per values pass.
  - `inlineListFunctions`, depth-limited by MAX_CALL_DEPTH.
  - `branchTrees(expr, scope): Node[]`, capped at `MAX_PLOT_BRANCHES`.
- **plot/index.ts:15-31 PlotInput:**
  - explicit: `f` becomes `fs: RealFn1[]`
  - lines: `fs`
  - implicit: `Fs`
  - region: `branches: RealFn2[][]`
- **New file plot/merge.ts:** joins per-branch geometries. Polylines, bands, positions and spans are concatenated, with NaN separators for curves; evaluations are summed.
- **Budgets:** plotExplicit, plotImplicit and plotRegion take an optional budget limit. Starting proposal, to be tuned with budget.perf.test.ts:
  - explicit: full EXPLICIT_BUDGET per branch, total capped at 10×
  - implicit and region: 2 × IMPLICIT_BUDGET split across the branches
- **from-analysis.ts:56-91:** build the closures from `branchTrees`.
- **Worker protocol (protocol.ts):** no change. Geometry keeps its shape, and `PROTOCOL_VERSION` stays 1. Add a protocol.test.ts case: a merged curve passes `isWorkerMessage`, and its transferables are listed once.
- **Tests:** from-analysis.test.ts and golden.test.ts:
  - `y=[1,2,3]x` gives 3 runs
  - `x=[1,2,3]` gives 3 positions
  - `y>[0,1]x`
  - `L=[1,2]` with `y=Lx`
  - `f(x)=[1,2]x`
  - `y=x+\operatorname{mean}([1,2,3])` gives 1 run
  - the complex-mode path

### T12. No connectors across jumps (G-14)

- **Problem:** explicit.ts:167-177 only splits a curve when the jump is bigger than the view height or crosses zero. Unit steps in `floor(x)` will still be joined by a vertical line.
- **Fix:** add a discontinuity bisection. If bisection shrinks a pair's interval but its jump stays above 0.5 px, set `poleBreak`.
- **Tests (explicit.test.ts):** floor, round, sign and a piecewise step end within 0.5 px of each jump, with no vertical segment.

### T13. Output UI and API (NM-38, R-5)

- **row-results.test.tsx:** `[1,2,3]` shows "= [1, 2, 3]"; a 40-element range shows "…". ExpressionRow.tsx:307-311 should need no change; check that `groupIntegerDigits` is harmless inside lists.
- **engine.results.test.ts:** list evaluation, and the list-of-points case reported as `other`.

### T14 (optional). Seeded random and shuffle (FN-7, FN-37)

- **Seed path:** executor.ts:81 stores `hello.seed`. `runValuesPass` and `evaluateRows` pass it on. `CompileScope` gains `rowSeed`, hashed from the seed and the row id.
- **New file core/lib/random.ts:** xoshiro128\*\*. `random()`, `random(n)`, `random(n,s)`, `shuffle(L[, s])`.
- **Plots:** branches.ts treats `random` as constant, so it folds like any other constant.
- **Deferred:** Desmos's re-randomize button (FN-8).

### T15. Keystroke corpus (PR-36)

- **cases/keys.ts:** add keystrokes for `[`,`1`,`.`,`.`,`.`,`5`, for `{`, and for `!`.
- **Check in tests/calculator/v2/math-field.spec.ts** what MathQuill actually emits (`...` or `\ldots`, `\left\{`).

## Where the spec text differs from Desmos (follow Desmos)

1. **Restrictions:** a-math §2.7 lists a `restrict` head, but Desmos semantics is multiplication by a piecewise.
2. **Shipping phases:** appendix B schedules cov, corr, join, sort, unique, shuffle and random for Phase 3. They ship now.
3. **New names:** `length` and `abs` are Desmos names that are not in PR-12's list.
4. **Spec gaps that Desmos fills:**
   - **Open slice:** `L[2...]` is not in PR-34.
   - **Point arithmetic:** Desmos supports it. V2 gets only point × scalar here.
   - **Point definitions:** Desmos graphs definition rows that are points (`A=(1,2)`, `A=[(1,2)]`), which RC-6 forbids. This is a follow-up.
5. **Unconfirmed defaults. Capture these in Desmos before freezing the tests:**
   - non-integer index (NM-30)
   - display limit of 30 elements (NM-38)
   - nested-list message (NM-34)
   - rounding of halves (FN-77)
   - quartile method (FN-26): Desmos may not exclude the median
   - quantile type 7 (FN-27)
   - sort with undefined elements (FN-36)
   - empty-range case (NM-36)
   - non-integer nCr (FN-78)
   - `=` exactness in conditions (NM-41)
6. **Errors that stay undefined:** NM-35 (list too long) and nested lists reached through names are row errors in the spec. Here they evaluate to undefined, because the value model has no error variant; that needs a follow-up.
7. **Budgets:** G-15 states one budget per row. With several branches, the budget is split per branch (T11).
8. **Spec text to update:** the PR-9 parse-error list (corpus cases 11-19, 28-31 and 53) and the K-4 phase schedule both need edits in the same commits, following the open-items rule.

## Repo rules

- compile.ts (378 lines), atoms.ts (421) and explicit.ts (457) get new sibling modules instead of growing. Every new file is designed to stay under about 300 lines.
- Placeholder cases in T6 must not leave unused imports or parameters. `@typescript-eslint/no-unused-vars` is an error.

### Critical Files for Implementation

- src/lib/calculator-v2/core/latex/atoms.ts
- src/lib/calculator-v2/core/eval/compile.ts
- src/lib/calculator-v2/core/eval/compile-real.ts
- src/lib/calculator-v2/core/lib/builtins.ts
- src/lib/calculator-v2/plot/from-analysis.ts

---

## Desmos facts captured 2026-10-19 (these OVERRIDE the "to confirm" items above)

Reference values: docs/superpowers/plans/2026-10-19-calculator-v2-phase2-desmos/desmos-reference-values.json (observed in desmos.com/calculator). Highlights:

- round: halves go toward +infinity (JavaScript Math.round semantics): round(2.5)=3, round(-2.5)=-2. round(x,n) = Math.round(x\*10^n)/10^n, n may be negative (round(1234,-2)=1200, round(2.5,-1)=0); non-integer n (round(2.5,1.5)) returned 2.5 — treat n by rounding/flooring so that case holds.
- mod(a,b) takes the sign of b: mod(-7,3)=2, mod(7,-3)=-2, mod(5,0)=undefined.
- nCr/nPr use the gamma generalisation for non-integers: nCr(5.5,2)=12.375, nCr(5,2.5)=10.86497744840672, nCr(-1,2)=1, nCr(5,-1)=0, nCr(2,5)=0, nPr(5,6)=0.
- factorial: gamma(x+1); 0!=1, 2.5!=3.323350970447842, (-2.5)!=2.363271801207355, (-1)! undefined, 170!=7.257415615307999e306, 171! undefined.
- gcd/lcm: gcd(-12,18)=6, lcm(0,5)=0, gcd(2.5,5)=1, gcd(2.4,5)=1.
- sign(0)=0.
- Non-integer index FLOORS: L[1.6]=L[1], L[2.5]=L[2], L[4.6]=L[4]; L[0], L[-1], out of range = undefined.
- Ranges: count = round((end-start)/step)+1 with step = second-start (default ±1 toward end): [1...3.4]=[1,2,3], [1...3.5]=[1,2,3,4], [0.5...3]=[0.5,1.5,2.5,3.5], [3...1]=[3,2,1], [1...0]=[1,0], [1,3,...,8]=[1,3,5,7,9], [10,8,...,1]=[10,8,6,4,2,0].
- Broadcasting truncates to shortest list. Built-ins broadcast: max([1,2],5)=[5,5]. Reducers take varargs: mean(1,2,3)=2, total(1,2)=3, min(3,1,2)=1, length(5)=1.
- quantile = linear interpolation (type 7). quartile = median of lower/upper half excluding the median (L=[5,3,8,1]: q0=1,q1=2,q2=4,q3=6.5,q4=8, q5 undefined).
- mad = mean absolute deviation from the mean. stdev/var of 1 element undefined; mean/median of [] undefined; total([])=0; length([])=0.
- sort(L,K) sorts L by keys K; mismatched lengths returns L unchanged. unique keeps first-occurrence order.
- join(1,2)=[1,2].
- Piecewise: first true wins; {c} alone = 1 or undefined; conditions broadcast over lists ({[1,2,3]>1:1,0}=[0,1,1]); chained conditions allowed.
- Error texts: "Cannot store a list of numbers in a list." ; "Function 'nCr' requires 2 arguments. For example, try typing: nCr(1, 2)." ; "Function 'floor' requires only 1 argument. For example, try typing: floor(x)." ; "Range must have an upper and lower bound." ; "Lists may not have more than 10,000 elements." ; "You need something on both sides of the ',' symbol."
