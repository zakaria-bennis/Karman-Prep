# Phase 2 maths plan for the calculator: what is left after main's lists work

Written 2026-10-19 from `origin/main` at 9bf4834, plus T1 to T5,
F-A1 and the Desmos review fixes up to 84fd1c4. It says what is left of tasks T6 to T15 of `plan.md` and wins where they differ; it cites their
detail rather than repeating it. T1 to T5
are done and are not repeated. The "Desmos facts captured" section at the end of `plan.md` and
`desmos-reference-values.json` stay the source of truth: where they disagree with the spec
(a-math-semantics.md) or with `plan.md`'s design notes, Desmos wins (appendix F, decision 2).

F-A1 (2026-10-19, Desmos colours and 40% shading with no caps) already supersedes 89ac84f's
palette decision, and `f-desmos-parity.md` already records that. No task here touches colours.

## How this was checked

Every entry of `desmos-reference-values.json` was run through the current engine: values through
`evaluateLatex` (with the row `L=[5,3,8,1]` before any case that uses `L`), errors through
`analyzeRows`, and the `graphable` rows through `analyzeRows` for their kind. Result:

- **Values:** 141 of 204 match. 11 of the 141 match only because the row is an `unsupported` error
  and Desmos also gives undefined (`L[0]`, `L[9]`, `L[-1]`, `mean([])`, `median([])`,
  `stdev([1])`, `var([1])`, `quantile(L,1.2)`, `quartile(L,5)`, `\{1<0:5\}`, `\{1<0\}`); they are
  not real matches yet.
- **Of the 63 that do not match,** 58 are notation or built-ins main has not shipped (indexing,
  slicing, filtering, statistics, list functions, gcd and lcm, piecewise). Only 5 are wrong answers
  from code that has shipped: the range counts listed under M1 below.
- **Errors:** 40 of 41 match. The one gap is the piecewise comma error (T10).
- **Graphable rows:** `[(1,2),(3,4)]` and `(a,a^{2})` with `a=[1,2,3]` are point rows, as in
  Desmos. `y=x\{0<x<2\}` and `\{x<0:-1,x>0:1\}` are "This calculator doesn't support that
  notation."; `y=[1,2,3]x` is "Graphing a list of curves isn't supported yet." (T10 and T11).

Extra probes outside the captured file (Desmos behaviour taken from `plan.md`'s design notes, not
yet captured) found the point-arithmetic and point-definition gaps in M4 and M5.

## Status of T6 to T15 against the current code

| Task                       | Status | What main or this branch already has                                                                                                                                                                                                                                                                            | What is left                                                                                                                                                                       |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T6 list syntax             | Partly | Ellipsis token (`...`, `\ldots`, `\dots`, `…`); `parseList` in `latex/lists.ts` for `[]`, `[a,b,c]`, `[a...b]`, `[a,b,...,c]`; `range-bound` error; ranges are `list` nodes with `range: true` (not a separate `range` node); printer and `toSExpr` print them; `2[1,2]` multiplies. Keystroke cases 40 and 41. | `L[…]` after an id, call or list is read by `failIfIndexed` and rejected as `unsupported` (index, slice or filter). No `index` node, no `parseCondition`, no open slice `L[2...]`. |
| T7 list evaluation         | Partly | `eval/lists.ts`: `makeList`, `rangeValue`, `map1`, `map2`, `mapN`, `pointValue`; `MAX_LIST_ELEMENTS = 10000`; broadcasting truncates to the shorter list; built-ins broadcast (`mod([7,8],3)`, `nCr([5,6],2)`, `[1,2,3]!`); `format.ts` shows 30 elements then `…`.                                             | Index, slice and filter evaluation. Point times scalar and point arithmetic (M4). The range count rule is wrong (M1).                                                              |
| T8 list analysis           | Mostly | `nested-list` ("Cannot store a list of numbers in a list."), `list-too-long`, `range-step`, `list-mixed` row errors; `[(1,2),(3,4)]` and points of lists are kind `point` and draw one dot per defined pair (`from-analysis.ts` case `point`).                                                                  | A name whose definition is point-shaped (`P=[(1,2),(3,4)]` then `P`, or `A=(1,2)`) is not graphed (M5). A point times a piecewise restriction waits for T10.                       |
| T9a statistics, gcd, lcm   | Done   | `length` is on the allowlist but not in `SHIPPED`.                                                                                                                                                                                                                                                              | Everything.                                                                                                                                                                        |
| T9b two-list functions     | Not    | Nothing.                                                                                                                                                                                                                                                                                                        | Everything.                                                                                                                                                                        |
| T10 piecewise              | Done   | Task 7 below.                                                                                                                                                                                                                                                                                                   | Plot-level checks (plot tests are outside the maths fence) and the keystroke case.                                                                                                 |
| T11 multi-branch graphs    | Not    | `analysis/lists.ts` rejects list-valued curves with `DEFERRED_FEATURES.listCurves`.                                                                                                                                                                                                                             | Everything.                                                                                                                                                                        |
| T12 no connectors at jumps | Not    | `explicit.ts` phase 2 bisects only pairs that jump more than the view height or change sign by more than 1 px, so `floor(x)` steps are joined by vertical segments.                                                                                                                                             | Everything.                                                                                                                                                                        |
| T13 output UI and API      | Mostly | `row-results.test.tsx` checks one box per element and `…` after 30 with a hand-built list; `engine.lists.test.ts` checks `valueText` `[1, 2, …, 10]` and `expressionAnalysis` for a list row; `toApiEvaluation` returns `other` for a list of points.                                                           | One engine test that a list of points row reports `{ type: "other" }`, and one row test driven by the engine instead of a hand-built list.                                         |
| T14 random and shuffle     | Not    | The worker protocol carries `hello.seed`; `executor.ts` ignores it.                                                                                                                                                                                                                                             | Everything (optional, as before).                                                                                                                                                  |
| T15 keystroke corpus       | Partly | Cases 40 (`[1...5]`), 41 (`[1,2,...,5]`), 42, 45, 46, 54, 55 (`[` and `{`).                                                                                                                                                                                                                                     | A `!` keystroke case (`3!`), and a piecewise keystroke case once T10 parses braces.                                                                                                |

## Desmos mismatches in existing main code

These are wrong or missing behaviours in code that has already shipped. Fix them before the new
features, because the new features build on them (indexing a range, piecewise over a range).

### M1. Range element count rounds, as in Desmos (NM-36) — confirmed by capture

**Done.** `core/lib/range.ts` `rangeShape` is the one rule for analysis and evaluation. The
function catalogue settled the open case: a count below the values written before the ellipsis
(`[1,2,...,0]`, `[1,3,...,1]`) and a non-finite count (`[1...0/0]`) are "Ranges must be arithmetic
sequences.", which is now the `range-step` text; there is no empty range.

| Case               | Desmos                                 | Karman before                  | Karman now |
| ------------------ | -------------------------------------- | ------------------------------ | ---------- |
| `[1...3.5]`        | `[1, 2, 3, 4]`                         | `[1, 2, 3]`                    | as Desmos  |
| `[1...3.6]`        | `[1, 2, 3, 4]`                         | `[1, 2, 3]`                    | as Desmos  |
| `[0.5...3]`        | `[0.5, 1.5, 2.5, 3.5]`                 | `[0.5, 1.5, 2.5]`              | as Desmos  |
| `[1,3,...,8]`      | `[1, 3, 5, 7, 9]`                      | `[1, 3, 5, 7]`                 | as Desmos  |
| `[10,8,...,1]`     | `[10, 8, 6, 4, 2, 0]`                  | `[10, 8, 6, 4, 2]`             | as Desmos  |
| `[1,2,...,0]`      | "Ranges must be arithmetic sequences." | the empty list                 | as Desmos  |
| `[0,0.1,...,1]`    | 0.3 exactly                            | 0.30000000000000004            | as Desmos  |
| `[1,1.1,...,1.25]` | `[1, 1.1, 1.2, 1.3]` (derived)         | `[1, 1.1, 1.2000000000000002]` | as derived |
| `[1,2,3,...,10]`   | `[1, …, 10]` (derived)                 | syntax error                   | as derived |

- **Files:** `core/lib/range.ts` `rangeShape` (starts and ends, count n = 1 + round((last −
  first)/s) with JavaScript rounding, halves up, elements first + k·s with no snap to the bound,
  every other written value checked on the sequence within 10 bits) on exact fractions from
  `core/lib/rational.ts` where they fit, as Desmos folds constants; `core/eval/lists.ts`
  `rangeValue` and `core/analysis/lists.ts` both use it. `latex/lists.ts` takes any number of
  values on each side of the ellipsis; the list node's `range` is the number of starts. There is no
  empty range: a count below the starts or ends is `range-step`.
- **Tests:** `core/lib/desmos.reference.test.ts` checks every catalogue range value exactly;
  `core/eval/lists.test.ts` covers the fraction counts, the unsnapped last element and the extra
  starts and ends; `core/corpus/cases/lists.ts` pins the new trees.
- **Docs:** NM-36 in `a-math-semantics.md` and "Range length" and "Exact ranges" in
  `f-desmos-parity.md`. Capture `[1,1.1,...,1.25]`, `[1...3.0000000001]`, `[1,2,3,...,10]`,
  `[1,...,9,10]` and `[1,2,4,...,10]` live to confirm the derived rows.

### M2. `log` with two arguments is an arity error (RC-20) — recorded in f-desmos-parity.md

**Done.** A subscript base sets `base: true` on the call node; `classify.ts` counts only written
arguments against `log`'s one. The catalogue's other log findings came with it: exact whole-number
logs (`\log_{3}(81)` = 4), `log-power` ("Only log^2 is supported."), `empty-subscript` and
`name-subscript` ("'ln' cannot have a subscript.", also on trig and hyperbolic names). Every
catalogue ln value and error is checked. Left: `\log_{\infty}(5)` = 0 waits for `\infty` as a
value (`\ln((1,2))` now reads "Function 'ln' cannot be applied to a point."). When infinities
become values, `realLog` in `core/lib/builtins.ts` must return them as Desmos's `log_base` does:
−∞ for an argument of 0 and ±∞ for a base of 1 (NaN only for a base of 0 or a negative argument),
so `\frac{1}{\log(0)}` is 0.

- **Desmos:** `\log(1,2)` reads "Function 'log' requires only 1 argument. For example, try typing:
  log(x)." (the same text as the captured `\log(1,2,3)`). A base is written only as a subscript.
- **Karman:** `\log(1,2)` is a value row that evaluates log base 2 of 1, because `latex/calls.ts`
  builds `\log_{b}(x)` and `\log(x,b)` as the same call.
- **Files:** `latex/calls.ts` (only the subscript form appends the base argument; mark it, for
  example by building the subscript base as a separate field or a distinct call name used only
  internally), `core/lib/arity.ts` or the analysis arity check, `core/corpus/cases/parse-calls.ts`.
- **Tests:** add `\log(1,2)` to the error checks in `desmos.reference.test.ts` (as a local case,
  since it is not in the captured file, or capture it and add it to the JSON). `\log_{2}(8)` = 3
  stays.
- **Docs:** move "`log` with two arguments" in `f-desmos-parity.md` to the matched list.

### M2b. Trig exactness, trig powers and point arguments — done (function catalogue)

**Done.** `core/lib/trig.ts` follows Desmos: exact only at quarter turns (a double that is a whole
multiple of π, or twice an odd multiple of π/2), a degree argument times π/180 and an inverse's
degree result divided by it, no π/12 or 15° snapping, cot = 1/tan, arccot through arctan(1/x)
or π/2 − arctan(x), and arctan(y, x) as atan2 (`\arctan(0,0)` = 0). `latex/calls.ts` adds
`trig-power` ("Only sin^2 and sin^-1 are supported. Otherwise, use parens."), and
`analysis/list-calls.ts` gives every elementary built-in and `\sqrt` of a point "Function 'sin'
cannot be applied to a point.". `core/lib/desmos-trig.fixture.json` holds the catalogue's 390
values and 63 errors for circular trig, inverse trig, exp and user-function arity;
`desmos-trig.reference.test.ts` checks them (217 real trig values exactly) with the unshipped
notation as expected failures. User-function arity, `f()` and `\exp` without parentheses already
matched.

**Review fixes (task 6).** Complex sin, cos, tan, sinh, cosh and tanh now build their parts from
the quarter-turn-exact sin, cos and tan (`exactSin`, `exactCos`, `exactTan` in `trig.ts`; tan is
+∞ at an odd quarter turn) and tanh, tan and complex arctanh and arccoth use Desmos's own formulas,
so `\cosh(\frac{\pi}{2}i)` and `\coth(\frac{\pi}{2}i)` are 0 and `\operatorname{arctanh}(2)` has
imaginary part −π/2. `desmos-hyperbolic.fixture.json` holds the catalogue's 211 hyperbolic values
and 19 errors, checked in `desmos-trig.reference.test.ts` (derivatives, the `ar`-spelled inverses
and the hidden complexArc… names are expected failures). A trig or log power is allowed only as
the literal tokens `2` and `-1` (`\sin^{2.0}`, `\sin^{(2)}`, `\sin^{-1.0}` are the power errors).
A user function called with a point is type-checked through its body (`f((1,2))` with
`f(x)=\sin(x)` reads "Function 'sin' cannot be applied to a point."), and an nth root of a point
reads "Function 'nthroot' cannot be applied to a point and a number." (both inferred from
Desmos's source, not captured live). Left, with reasons:

- **Poles as infinities.** Desmos's tan, sec, csc and cot return ±∞ at a pole, so
  `\frac{1}{\tan(\frac{\pi}{2})}` is 0 and `\arctan(\tan(\frac{\pi}{2}))` is π/2 there. The
  calculator's value model turns every non-finite number into undefined (`numberValue`), so
  `\frac{1}{\frac{1}{0}}` is undefined too; this waits for infinities as values (with `\infty`
  and `realLog` above), not a trig change.
- **Root parsing.** `\sqrt(4)`, `\sqrt{4,9}` and `\sqrt[[2,3]]{64}` need two new parser error
  families: Desmos's bracket matching ("Expected '(' to match ')'.") and bare comma sequences,
  type-checked as a point ("Points are written like this: (1, 2)."; also `1,000`) or a list.
  `\sqrt(4)` reading as `\sqrt{4}` is also PR-27's corpus case 48, so it needs a spec decision.
- **Unshipped names.** `\operatorname{sqrt}`, `\operatorname{factorial}`, matrices and dot calls
  (`L.\sin`, `a.\operatorname{floor}`) need the allowlist and the elementary reference script.
- **Precision and complex rounding** (nCr(1000,500), nPr(200,100), complex floor, ceil, round
  and mod) are outside this task.

### M3. Colour counter for new rows (TH-10, F-A1) — recorded in f-desmos-parity.md, not maths

- **Desmos:** a running colour counter; a row inserted after the first of red, blue, green is
  purple. **Karman:** colour from the row's position, so it repeats blue.
- The expected failure "F-A1 a row inserted mid-list continues Desmos's colour cycle" in
  `core/api/engine.rows.test.ts` pins it. Not a maths task: listed here so the list of known gaps
  is complete; schedule it with the UI work, not in this plan's order.

### M4. Point arithmetic, members, distance and midpoint (NM-32, PR-45, FN-70, FN-71) — done

**Done** (task 8 of the 2026-10-20 run, function catalogue geometry family). `eval/ops.ts`: points
add, subtract and negate coordinate by coordinate, scale by and divide by a real number, and two
points multiply to their dot product (`(1,2)\cdot(3,4)` = 11); `|P|` is the length.
`latex/calls.ts` reads `P.x`, `P.y` and `P.z` as the member call `x` (`coordinateAxis`), a lone
other letter (`P.X`) as Desmos's "Sorry, I don't understand the way that '.' is used here.".
`lib/geometry.ts` evaluates distance (overflow-safe hypot) and midpoint (P/2 + Q/2), which
broadcast over point lists. `analysis/points.ts` types all of it and gives Desmos's errors:
"Cannot add a point and a number.", "Cannot divide a number by a point.", "Cannot raise a point to
a number.", the juxtaposed "Cannot multiply a point by a point." (read from the spans: `\cdot` is
the dot product), "Cannot use a point as a coordinate of a point.", "Cannot access coordinate
'.x' of a number." (".z" of a 2d point), "Function 'distance' requires 2 points.", "Function
'midpoint' requires a segment or 2 points.", "Function 'distance' requires 2 arguments. " (with
its trailing space), "Function 'distance' cannot be called with dot notation." and "Cannot call
'.midpoint' on a point.". `core/lib/desmos-geometry.fixture.json` holds the catalogue's 136
values, 103 errors, 15 graphed rows and 43 display flags, including the point cases of the
statistics-lists, elementary, calculus, matrices and actions families; `desmos-geometry.reference.test.ts`
checks them. Not matched (expected failures): 3D points and `\times` as the cross product, `for`
and `with`, the hidden names hypot, pointDot, pointDet, pointPerp and complexMultiplyPoints,
`.\operatorname{length}`, parametric points in t (RC-16), `y=` rows with a constant side,
Desmos's free-variable texts, and the point texts of unshipped features: derivatives ("Cannot take
derivative with respect to 'a' because it is a point."), sum, product and integral bounds, arg,
det, `.det`, random and tone.

Follow-up fixes (task 8 parity pass, 2026-10-20):

- A point result shows its "=" value again (`2(1,2)`, `-(1,2)`, `(1,2)+(3,4)`, `midpoint(…)`,
  `P`, `[(1,2),(3,4)]+(1,1)`), as Desmos's `evaluationDisplayed` does in the geometry captures;
  only a literal point or list of literal points (`(2,3)`, `[(1,2),(3,4)]`, and so `A=(1,2)`, by
  Desmos's evaluability rule for a definition's body) shows none (`api/results.ts`
  `rowShowsValue`). The statistics-lists "no evaluation" rows (`P+(1,1)`, `mean(P)`) are rows
  whose `expressionAnalysis` has no evaluation object, which Desmos leaves out for every point
  value; they are listed as graphed rows, not as rows without a shown value.
- Plotted rows with point arithmetic draw: `eval/compile-real.ts` sends a sum, difference,
  product, quotient, negation or `|…|` with an operand that may be a point, and a user call with
  a point argument, to the general evaluator (`y=\left|A-(x,0)\right|`, `y=(x,1)\cdot(1,1)`,
  `\left|(x,y)-(1,1)\right|=2`, `y=g((x,0))`).
- A user call whose body gives a point is typed as one and graphs (`f(3)` after `f(a)=(a,2a)`).
- `.x` and `.y` read any `(…)` group (`((1,2)+(3,4)).x`, `\left(2P\right).y`).
- A comma at the end of a sum, at the row's end or in a braced argument, reads Desmos's "Points
  are written like this: (1, 2)." (`1,000`, `1,2`, `\sqrt{4,9}`); `(,)` and `{1,2}` stay syntax.
- Left open, no Desmos capture: `(1,2)\%` (undefined, no error), `L.z` on a list of points
  (Karman's "Cannot access coordinate '.z' of a list of points."), and whether Desmos hides a
  bare numeral's value (`2`, `a=2`, `[1,2,3]`), which its evaluability rule suggests and R-5 and
  RC-17 do not yet say.

### M5. Point-valued names graph (G-2, RC-6, RC-15) — done

**Done.** `analysis/classify.ts` graphs a row as points when it is point-shaped as written or its
list typing is a point or a list of points: `P` and `P[2]` after `P=[(1,2),(3,4)]`,
`(1,2)+(3,4)`, `\operatorname{midpoint}(…)`, `\operatorname{total}(P)`, `sort(P,[3,1,2])`.
A value definition whose body is point-valued (`A=(1,2)`, `P=[(1,2),(3,4)]`) keeps kind
`definition` and gets the graph `{ kind: "point" }`, which `plot/from-analysis.ts` already draws
from the row's value, so RC-6's "definitions do not graph" now holds only for non-point values.
The point-coordinates error reads Desmos's "Too many variables, I don't know what to do with
this." (`(x,y)`, `(x,1)+(1,x)`).

### M6. Karman wording that has no Desmos capture yet

Not known to be wrong, but chosen without a capture. Capture each and match it, or record that it
matches, before the lists work is called Desmos-exact:

- `[1,1,...,5]`: Karman "A range can't step by 0. Make its first two values different."
- `[(1,2),3]`: captured, Desmos's "All elements of a list must have the same type.", now matched.
- 30 elements then `…` in the row value (NM-38).
- An empty range with the step pointing away from the bound (`[1,2,...,0]`): Karman `[]`.

## Remaining tasks, in order

Each task is one commit and starts with a failing test, with test titles leading with the
requirement ID. Gates for every commit: `npx tsc --noEmit`, `npm run lint`, `npx prettier --write`
on the changed files then `npm run format:check`,
`npx vitest run src/lib/calculator src/components/calculator`, `npm run check:sizes`, and
`npx tsx scripts/calculator/generate-skin-colors.ts --check`. File sizes today: `compile.ts` 444
lines, `atoms.ts` 425, `explicit.ts` 457; new behaviour goes in sibling modules, and no file passes
about 700 lines.

Every task that ships captured Desmos values adds them to `desmos.reference.test.ts` as a family
with a stated count, and removes any entry it fixes from the expected-failure sets.

### 1. M1: range count by rounding (NM-36)

As described under M1. Small and isolated; do it first because indexing tests use ranges.

### 2. M2: `log(1,2)` arity error (RC-20)

As described under M2.

### 3. Indexing `L[i]` and `L[[i,j]]` (PR-34, NM-30)

**Done.** One `index` node (`target`, `items`, `range`, read like a list's contents) covers
indexing, slicing and filtering (tasks 3 and 4 together); `core/eval/index-list.ts` evaluates it.
Desmos differs from the notes below in three places, and Desmos wins: a `[` after a number indexes
it (`5[1]` reads "Cannot index a number with a number.", so `2[1,2]` no longer multiplies); a slice
is not clipped to the list (`L[8...20]` is L[8] then 12 undefined, `L[4...2]` runs backwards);
and `L[1,2]` is `L[[1,2]]`. `L[]` reads "Square brackets cannot be empty." and a range or filter
using x reads "Can't plot a list whose length depends on free variable 'x'." (which also fixes
`[x...5]`). The catalogue's 57 values and 8 errors are in `core/lib/desmos-index.fixture.json`;
the unmatched ones wait on unshipped notation (see `f-desmos-parity.md`). `speech.ts` gained the
one `index` case TypeScript's exhaustive switch needs.

**Third review (2026-10-19), done.** A `[` after any term indexes it; analysis types the target
and index (number, point, list of numbers, list of points) and reads Desmos's "Cannot index … with
…." for a number or point target or a point index; a range or filter on an undefined name is
`list-length-free` naming it (`L[i>2]`); `compile-real.ts` folds a constant index target through
`compileExpression`, so `L[2...][x]` graphs; `.` after an index, list or point is the deferred
member access; empty roots and root indexes have Desmos's messages; complex-mode roots of
negatives are principal. The 14 plan values and the catalogue's root cases are reference
families. Not done, with reasons in `f-desmos-parity.md`: notation that has not shipped (member
access, `and`/`or`, piecewise, `for`, `length`, `sum`, derivatives, colours, tones, matrices and
`;`, `random`, actions, `sort`), point arithmetic (M4), `P[2]` graphing (M5), `E[1...3]`'s empty
display (UI), `\sqrt[[2,3]]{64}` (normalizing drops `\left`), and the probes without a live
capture, which follow the decompiled code.

- **AST:** add `{ kind: "index"; target: Node; index: Node; span }` to `latex/ast.ts`, with
  `sourceChildren`, `toSExpr` `(index L I)`, and the printer case (add to `BARE_BASES`).
- **Parser:** in `latex/lists.ts`, replace `failIfIndexed`'s index branch with `parseIndex(state,
target)` for an id, call or list (`INDEXED_KINDS`); slicing and filtering stay `unsupported` until
  task 4. Wire it where `failIfIndexed` is called in `atoms.ts`.
- **Evaluation:** new `core/eval/index-list.ts` (keep `compile.ts` small): 1-based; a non-integer
  index floors (Desmos: `L[1.6]` = `L[1]`, `L[2.5]` = `L[2]`, `L[4.6]` = `L[4]`); 0, negative and
  out of range are undefined; a list of indices gives a list. `compile.ts` and `compile-real.ts`
  get an `index` case (compile-real returns NaN unless the target folds to a constant list).
- **Analysis:** `classify.ts` and `names.ts` pick the node up through `sourceChildren`; an index
  of a point list is point-shaped (`graph.ts`).
- **Tests:** `latex/lists.test.ts` and `core/corpus/cases/parse-lists` cases (`L[2]`, `[1,2][1]`,
  `L[[1,3]]`); reference family for the 12 captured index values (`L[2]`, `L[[1,3]]`, `L[0]`,
  `L[9]`, `L[-1]`, `L[1.4]`, `L[1.5]`, `L[1.6]`, `L[2.5]`, `L[4.6]`, `[1,2,3][2]`,
  `[2...10][4]`, with `L=[5,3,8,1]` as a context row).
- **Docs:** NM-30 in `a-math-semantics.md`: a non-integer index floors (Desmos), not undefined.

### 4. Slicing and filtering `L[a...b]`, `L[a...]`, `L[cond]` (PR-34, NM-31)

**Done** with task 3; `L[3...2]`, `L[0...2]` and `L[2...]` are in the catalogue capture.

- **Parser:** export `parseCondition` from `latex/parser.ts` (a sum with an optional relation
  chain, reusing `takeRelop` and `checkChain`). `parseIndex` reads a range `a...b`, an open range
  `a...`, or a condition. Remove `failIfIndexed` and the `slice` and `filter` entries of
  `DEFERRED_FEATURES` once nothing uses them.
- **Evaluation:** `sliceList` (bounds floored like an index, clipped to the list) and `filterList`
  (keep elements whose mask item is true) in `core/eval/index-list.ts`. A relation with a list
  operand inside the brackets gives an element-wise mask.
- **Tests:** captured `L[2...3]` = `[3, 8]` and `L[L>2]` = `[5, 3, 8]`; local cases for `L[2...]`
  and `L[L=3]`. Capture `L[3...2]`, `L[0...2]` and `L[2...]` in Desmos first and add them to the
  JSON.

### 5. Statistics, gcd, lcm and `length` (FN-2, FN-23 to FN-29, FN-75; T9a)

**Done.** `core/lib/statistics.ts` holds the rules; `compile.ts` and `compile-real.ts` dispatch
to it (compile-real lays out list literals, constant lists and `[1,2,3]x`-style arithmetic, so
`y=\max(x,2)`, `\operatorname{mean}([1,2,3]x)` and `\operatorname{quantile}(L,x)` graph);
`analysis/lists.ts` types reducer calls (a list only when broadcasting) and
`analysis/list-calls.ts` gives Desmos's argument errors; `classify.ts` gives the empty-call texts.
The catalogue's 392 values, 53 errors and 38 no-value rows are in
`core/lib/desmos-statistics.fixture.json` (272, 38 and 35 match; the rest use unshipped
notation, `STATISTICS_GAPS`); the plan file's 38 values are a reference family. Desmos differs
from the notes below in two places, and Desmos wins: `count` and `length` arguments do not count
as uses of x, and `mean(L,M)` broadcasts element by element. gcf, mcd and mcm were added to the
allowlist. Panel buttons were left out because the panel is UI work.

**Parity review (2026-10-19), done.** The spelling aliases stddev, stdDev, stddevp, stdDevP and
variance, and inversecdf and inverseCdf of a list (= quantile), ship with Desmos's error texts and
as upright typed words; the catalogue's 46 values and 22 errors for them join the fixture (438
values, 309 matched; 75 errors, 60 matched; the rest are dot forms or distributions). The real
plotter sends a list function call or index whose list argument it cannot lay out (a power, a
built-in or `|…|` of a list, a name defined from x) to `compileExpression`, so those rows no longer
draw blank. A broadcast of mean or total over points is typed a list of points. Not done: an
unknown `\operatorname{stddevP}` is unsupported where Desmos reads one multi-letter name (9 errors;
needs multi-letter identifiers, see `f-desmos-parity.md`).

- **New file `core/lib/statistics.ts`:** `mean`, `median`, `min`, `max`, `total`, `count`,
  `length`, `var`, `varp`, `stdev`, `stdevp`, `mad`, `quantile`, `quartile`, `gcd`, `lcm`, plus a
  `LIST_FUNCTIONS` registry `apply(values: Value[]): Value` that concatenates its arguments
  (Desmos: `mean(1,2,3)` = 2, `total(1,2)` = 3, `min(3,1,2)` = 1, `length(5)` = 1).
- **Desmos rules from the capture:** `quantile` is type 7 (linear interpolation; outside 0 to 1 is
  undefined); `quartile` is the median of the lower or upper half excluding the median
  (`L=[5,3,8,1]`: 1, 2, 4, 6.5, 8; `quartile(L,5)` undefined); `mad` is the mean absolute
  deviation from the mean; `stdev` and `var` of one element are undefined; `mean` and `median` of
  `[]` are undefined; `total([])` and `length([])` are 0; `gcd(-12,18)` = 6, `lcm(0,5)` = 0,
  `gcd(2.5,5)` = `gcd(2.4,5)` = 1. `max([1,2],5)` = `[5, 5]`: with a list and a scalar, `min` and
  `max` broadcast element by element instead of reducing (capture `max([1,2],[3])` and
  `mean([1,2],3)` to pin the rule before coding).
- **Wiring:** `builtins.ts` dispatches to the registry before the element-by-element path; add the
  names to `SHIPPED` and `PANEL_PRESENTATIONS` as Desmos's Functions panel shows them; arity in
  `core/lib/arity.ts`. `compile-real.ts`: a reducer call flattens list-literal items, ids with a
  constant list value and scalars into a buffer, so `y=\max(x,2)` graphs.
- **Tests:** `core/lib/statistics.test.ts`; reference family for every captured statistics, gcd and
  lcm value (38 entries); `operator-names.test.ts` counts; corpus display cases. Flip
  `parse-errors.ts` cases that use these names to values.
- **Docs:** remove "`length`" from "Not yet matched" in `f-desmos-parity.md`.

### 6. Two-list and list-operation functions (FN-30, FN-31, FN-35, FN-36, FN-38; T9b)

**Done.** `core/lib/list-functions.ts` holds cov, covp, corr, spearman, sort, unique, join and
repeat; argmin and argmax join the reducers in `statistics.ts`, as hidden names
(`HIDDEN_OPERATOR_NAMES`: pasted latex only, never split targets, MathQuill names or panel
entries, since typing `argmin` gives `\arg\min` in Desmos). Desmos does not define `frequency`.
Analysis types the calls (`lists.ts`) and gives Desmos's errors (`list-calls.ts`, `classify.ts`,
the new `both-lists` code and per-name arity examples in `messages.ts`); repeat's count and length
errors and its 10,000-element limit are run-time list errors (`repeat-count`, `repeat-lengths`,
`list-too-long`) the row shows. The real plotter sends these calls to the general evaluator. The
catalogue's 130 values, 72 errors and 16 rows without a value are in
`core/lib/desmos-list-operations.fixture.json` (114, 66 and 9 match); the plan file's 9 values are
a reference family. Not matched: derivatives, colours and tones, member access, actions, shuffle
(T14), frequency's multi-letter-name errors, `unique([0.1+0.2,0.3])` (Desmos folds the constant sum
exactly), and rows that graph several curves (G-22) or a call's points (M5). The plan's "mismatched
lengths return `L` unchanged" for `sort(L,K)` is wrong: Desmos cuts to the shorter list.

**Review fixes (2026-10-19).** cov is covp · n/(n − 1), Desmos's rounding, so whole-number results
stay whole (`cov([1,4,1],[-4,-6,8])` = −8, not −7.999999999999999). A bad count in a list of
counts reads "Each 'repeat' count must be a finite, non-negative integer." (`repeat-counts`).
count and length read x when it decides the list's length (repeat's counts, unique's values, a
range's bounds or a filter), so `y=length(repeat(1,x))` graphs; a top-level list whose length
depends on x through repeat or unique reads "Can't plot a list whose length depends on free
variable 'x'." (`repeat(1,x)`), Desmos's list-length rule. The hidden sortPerm, complexSortPerm
and uniquePerm ship (0-based indexes; sort and unique are built on them), and repeatAssert,
frequencyList, frequencyListAssert, sortedLastLessIndex and sortedLastLessEqualIndex give
Desmos's argument errors and then its refusal, "This calculator does not support the
'frequencyList' function." (`refused-function`, also for the bare name). The fixture now holds
136 values, 157 errors and 17 rows without a value (120, 143 and 9 match). Still open: shuffle
(T14); ±Infinity, which the engine reads as undefined while Desmos keeps it (so
`sort([3,1/0,-1/0,1])`, `argmin([3,-1/0,1])`, `argmax([3,1/0,1])` and `unique([1/0,1/0,-1/0])`
differ); and `y=length([1...x])`, which the NM-31 check refuses although the row is a number.

- **New file `core/lib/list-functions.ts`:** `cov`, `covp`, `corr`, `join`, `sort(L[, K])`,
  `unique`. Desmos: `sort(L,K)` sorts `L` by `K`, and mismatched lengths return `L` unchanged;
  `unique` keeps first-occurrence order; `join(1,2)` = `[1, 2]`.
- **Tests:** reference family for the 9 captured values (`sort` ×3, `unique` ×2, `join` ×2, `cov`
  and `corr`). Capture `sort` with an undefined
  element first (FN-36).
- **Spec:** appendix B moves these from Phase 3 to Phase 2 (Desmos parity).

### 7. Piecewise and restrictions (PR-31, PR-32, NM-41, G-2, G-18; T10)

**Done** (maths engine). `latex/piecewise.ts` parses the braces with Desmos's errors
(`comma-side`, `colon-side`, `colon-condition`, `piecewise-condition`, `piecewise-part`);
`eval/piecewise.ts` evaluates them, lazily unless a condition is a list; `compile-real.ts` plots
them; `analysis/lists.ts` types them and reports `piecewise-types`. Every catalogue value and
error is in `core/lib/desmos-piecewise.fixture.json` and `desmos-piecewise.reference.test.ts`
(23 of 33 values and 6 of 9 errors matched, the rest unshipped notation); the plan capture's 7
values, its comma error and its 2 graphable piecewise rows match, and `L[\{L>3\}]` now does.
Desmos facts the capture settled over this plan: a part with no `:` is a condition with value 1
(`\{1>0,2<1:4\}` = 1), `\{\}` is 1, and `y=x\{x\}` is "A piecewise expression must have at
least one condition.". Left: the plot tests below (`plot/` is another builder's), the keystroke
case (Playwright) and list conditions on curves (task 8). The review of this task added: a
point-valued piecewise or restriction is a point row (`mulV` scales a point by a real number,
the one piece of M4 shipped); a scalar condition's pick broadcasts over a list value; a
condition comparing points is "Cannot compare a point to a point." (captured for `(1,2)=(1,2)`);
`x=>1`, `1==1` and `x<1<2` give Desmos's captured texts; and chains follow Desmos's
ComparatorChain rules (mixing `=` with inequalities refused everywhere, other chains evaluated
link by link and refused only when graphed). All in `desmos-relations.fixture.json` and its
reference test, with 4 expected failures (matrices, a restricted parametric, polar, G-22).
A row using a definition that has an error is still silently undefined, as `A+1` after a matrix
row is; that is not piecewise-specific and stays open.
`components/calculator/math-field/speech.ts` gained one `piecewise` case, which the new node kind
needs to type-check.

- **Parser:** `}` joins `OPERATOR_COMMANDS` in `parser.ts`; new `latex/piecewise.ts`
  `parsePiecewise` with parts `cond : value` separated by commas, a bare last value as otherwise,
  `\{c\}` alone allowed, chained conditions through `parseCondition`. An empty part next to a comma
  is `comma-side` ("You need something on both sides of the ',' symbol.", captured). `atoms.ts`
  routes the `{` command here. New AST node `piecewise {branches: {cond, value | null}[],
otherwise}` with `sourceChildren`, `toSExpr` and printer (`\left\{x>0:x,-x\right\}`).
- **Restrictions** are multiplication by a piecewise (`y=x\{x>0\}` is
  `(rel = (id y) (mul (id x) (piecewise …)))`), so several restrictions chain as products.
- **Evaluation:** first true condition wins; a value-less branch is 1; no true branch and no
  otherwise is undefined; a list condition broadcasts (`\{[1,2,3]>1:1,0\}` = `[0, 1, 1]`);
  `=` compares exactly (NM-41). Same in `compile-real.ts` with NaN short-circuit.
- **Analysis and plots:** kinds for `y=x\{0<x<2\}` (curve-y), `x^{2}+y^{2}=1\{x>0\}` (implicit),
  `y>x\{x>0\}` (region), `x=2\{y>0\}` (curve-x), `(1,2)\{a>0\}` (point).
- **Tests:** reference family for the 7 captured piecewise values; delete `ERROR_GAP` in
  `desmos.reference.test.ts` so `\left\{1<0:5,\right\}` is checked as an ordinary error; plot
  tests: the restricted curve ends within 0.5 px of x = 2; the region is shaded only where x > 0.
  Remove `parse-errors.ts` cases 18 and 19. Add a piecewise keystroke case to `keys.ts`.
- **Docs:** remove "An empty piecewise branch" from "Not yet matched"; a-math §2.7's `restrict`
  head is never produced.

### 8. Multi-branch graphs (G-3, G-22; T11)

- **New file `core/eval/branches.ts`:** `dependsOnCoordinates`, `foldConstants`,
  `inlineListFunctions` (depth-limited by `MAX_CALL_DEPTH`), and `branchTrees(expr, scope)` capped
  at `MAX_PLOT_BRANCHES`; the branch count is the shortest list (NM-33), not looking inside the
  arguments of reducers from task 5.
- **Plot:** `plot/index.ts` `PlotInput` takes arrays of closures; new `plot/merge.ts` concatenates
  per-branch geometries (NaN separators for curves); budgets split as `plan.md` T11 proposes,
  tuned with `budget.perf.test.ts`. `from-analysis.ts` builds closures from `branchTrees`.
- **Analysis:** remove the `listCurves` rejection in `analysis/lists.ts` and its
  `DEFERRED_FEATURES` entry; update `engine.lists.test.ts`'s `y=[1,2]x` expectation.
- **Tests:** `y=[1,2,3]x` gives 3 runs; `x=[1,2,3]` 3 positions; `y>[0,1]x`; `L=[1,2]` with
  `y=Lx`; `f(x)=[1,2]x`; `y=x+\operatorname{mean}([1,2,3])` 1 run; a protocol test that a merged
  curve passes `isWorkerMessage` with its transferables listed once. `PROTOCOL_VERSION` stays 1.

### 9. No connectors across jumps (G-14; T12)

- **File:** `plot/explicit.ts` (or a sibling `plot/jumps.ts`, since `explicit.ts` is 457 lines):
  a pair whose jump stays above 0.5 px after bisection shrinks its interval gets `poleBreak`.
- **Tests (`explicit.test.ts`):** `floor`, `round`, `sign` and a piecewise step each end within
  0.5 px of the jump, with no vertical segment; `golden.test.ts` and the perf budget stay green.

### 10. Output and API checks (NM-38, R-5, API-9; T13 remainder)

**Engine half done** (2026-10-20): `engine.lists.test.ts` checks that `L[2]` reports the number 3
and that `[(1,2),(3,4)]+(1,1)` reports `{ type: "other" }` and draws points (a literal list of
points shows no value, so the test uses a computed one). The row test below is UI work, outside
the maths fence.

- `core/api/engine.lists.test.ts`: a list-of-points row reports `{ type: "other" }` in
  `expressionAnalysis`, and an indexed row (`L[2]`) reports a number.
- `src/components/calculator/ui/list/row-results.test.tsx`: replace the hand-built list with
  an engine-evaluated `[1...40]` row now that list syntax exists, keeping the `…` after 30 check.

### 11. Keystroke corpus (PR-36; T15 remainder)

**Waiting on the UI builders:** `tests/calculator/math-field.spec.ts` pins the keys.ts count at 56
and runs every case on the real MathField, so adding `3!` and a piecewise case has to land with
that spec's count change and a Playwright run, outside the maths fence.

- `core/corpus/cases/keys.ts`: `3!` typed as `["3", "!"]` gives `3!` and `(fact (num 3))`; the
  piecewise case if task 7 did not add it. Check in `tests/calculator/math-field.spec.ts` what
  MathQuill emits for `!` and `:` inside braces.

### 12. Point arithmetic and point-valued names (M4, M5) — done

Done as task 8 of the 2026-10-20 run; see M4 and M5.

### 13 (optional). Seeded `random` and `shuffle` (FN-7, FN-37; T14)

**Not started, needs the plot fence:** Desmos keeps a sample fixed per row and call site until
re-randomize, and two identical rows differ (`random(5,3)-random(5,3)` is not 0), so the seed has
to reach every compile with the row id. Rows get it in `evaluateRows`, but plotted rows
(`y=random()` is a line at the row's sample) are compiled through `buildCompileScope` in
`plot/from-analysis.ts`, which must pass the same row seed; do this task with the plot owner.
The catalogue's forms and error texts are in `statistics-lists.md` section 7.

- `worker/executor.ts` stores `hello.seed`; `runValuesPass` and `evaluateRows` pass it on;
  `CompileScope` gains `rowSeed` hashed from the seed and the row id.
- New `core/lib/random.ts` (xoshiro128\*\*): `random()`, `random(n)`, `random(n,s)`,
  `shuffle(L[, s])`; `branches.ts` folds `random` as a constant.
- Deferred: Desmos's re-randomize button (FN-8).

### 14. Distributions most used on the SAT (FN-45 to FN-51) — done in the maths engine

- Shipped: `normaldist(μ=0, σ=1)`, `tdist(ν, location=0, scale=1)` and `binomialdist(n, p=0.5)`
  as a distribution value (`eval/values.ts`), with `pdf`, `cdf` (one bound or two, in either
  order), `inversecdf`/`inverseCdf`/`quantile` and `mean`, `median`, `stdev`, `var` in the call
  form and after a dot (`D.\operatorname{pdf}(x)`, `D.\operatorname{mean}`; PR-45's member call
  is a `call` node with `member`); lists broadcast both ways; `erf`; and the paste-only legacy
  names `normalcdf`, `normalpdf`, `binomcdf`, `binompdf`, `invNorm` in Desmos's slot order
  (`binomcdf(10,0.5,5)` reads the bounds 10 and 0.5 with 5 trials). Maths in `lib/probability.ts`
  and `lib/distributions.ts`, errors in `analysis/distributions.ts`.
- Checked by `lib/desmos-distributions.reference.test.ts`: 169 of the catalogue's 194 values and
  58 of its 69 error texts match, the legacy `tpdf`, `tcdf`, `invT` and `invBinom` included. Not
  yet matched: derivatives, `\infty` as a value, `random` (task 13), a stored ±∞ behind
  "undefined" (`1/invNorm(1)` is 0 in Desmos; NM-6 keeps one undefined state), "Try adding
  'y='…" for `i` in real mode (the calculator offers its chip), and
  `\operatorname{inv}N\operatorname{or}m(0.975)` (the unknown `\operatorname{inv}` is refused
  before the `or`).
- Parity pass (2026-10-20): the binomial pmf is Loader's saddle point form (finite for thousands
  of trials), its cdf sums Desmos's recurrence until terms stop changing the sum (NaN past 10⁶
  terms or 2⁵³ trials, never a hang) and invBinom bisects; the t cdf for ν > 1000 near its centre
  goes through the normal score with a quadrature correction, and the incomplete beta's prefactor
  uses Stirling errors, so `tdist(10^{14}).cdf(1)` is Φ(1). From Desmos's formulas (not captured
  live): σ = 0 and scale 0 are point masses, binompdf and binomcdf clamp p, mean round(n)·p and
  variance round(n)·p·(1 − p) unchecked, tdist's mean and median its location for every ν. A user
  function returning a distribution reads, errors and graphs as one. `[1,2].\operatorname{pleft}`
  and `a.\operatorname{p}` read Desmos's texts; `or`/`and` in a row with no comparison reads
  "'or' can only be used as part of a condition.". Not changed (no live capture): the arity text
  of `cdf(normaldist())`, `mean(normaldist(),2)`; `L.\operatorname{quantile}(0.5)` waits for
  PR-45's list members.
- Outside the maths fence, still to do: a bare distribution row shows its constructor text
  (`tdist(3, 0, 1)`) instead of Desmos's card, and does not graph its pdf (FN-52, render and UI).
  The other five distributions and inference stay unsupported.

## Spec text to update along the way

- NM-30 (index floors), NM-36 (rounded count and new examples), RC-6 (point definitions graph,
  task 12), PR-34 (indexing, slicing and filtering shipped), appendix B (task 6 names move to
  Phase 2), a-math §2.7 (`restrict` never produced). Each edit lands in the commit that changes the
  behaviour.
