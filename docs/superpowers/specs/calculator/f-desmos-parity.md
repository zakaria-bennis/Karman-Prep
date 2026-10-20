# Calculator appendix F: Desmos parity findings and owner decisions (2026-10-18)

This appendix records a second, deeper behaviour study of the Desmos graphing calculator
(desmos.com/calculator, desktop 1440x900 and phone 390x844) made on 2026-10-17 and 2026-10-18 with
REA scenario captures and headless browser runs. Only observable behaviour was recorded: no Desmos
code, stylesheets, icons, fonts or images were copied, and the screenshots stay outside the
repository. Each requirement below is written for Karman and is testable.

## Owner decisions (2026-10-18)

These decisions override the text of the other spec files and of the findings below wherever they
conflict.

1. **Priority.** The next build delivers, in this order: points of interest and coordinate labels;
   the + menu and tables; regression; the visual retune (colours, grid, rows, fonts); opening the
   calculator docked from the toolbar button on desktop; then Transfer to Calculator including
   tables. These come before the remaining Phase 1 polish.
2. **Behaviour wins.** Where Desmos's observable behaviour differs from this spec (for example
   regression log mode unchecked by default, a blank or non-numeric cell failing the whole fit,
   point labels with 5 decimals at the default view, Page Up and Page Down stepping through points
   in audio trace), match Desmos. Keep only Karman's accessibility additions (spoken point kinds,
   named table cells and headers, live-region announcements) and the D9 contrast rules.
3. **No inference.** The + menu offers Expression and Table only. FN-59's inference item and
   Desmos's inference wizard are out of scope; notes, folders and images stay excluded (CB-1).
4. **Shading.** Inequality shading is as close to Desmos's strength (about 40 percent of the
   curve colour) as the D9 rule allows: raise the TH-8 cap until any curve would drop below 4.5:1
   (7:1 in reverse contrast) over the shading in a skin, per skin, never beyond Desmos's strength.
   _Superseded 2026-10-19 by amendment F-A1 below: every fill is 40% with no cap._
5. **Colours.** Curves use Karman's own palette with Desmos's feel: hue order red, blue, green,
   purple, then a neutral (near-black on light skins, near-white on dark skins); mid-dark and
   moderately saturated, all curves within a narrow lightness band, never neon. Exact shades are
   derived per skin to meet D9 (cap chroma at 0.17 on light skins and 0.14 on dark skins).
   _Resolved 2026-10-18 (founder's delegation): the hue order is not applied. No palette in those
   windows meets TH-7's colour-blind distance floor (red, orange and green merge under deutan and
   protan simulation), and that guarantee wins; TH-6's derivation stays. See `05-visual.md`._
   _Superseded 2026-10-19 by amendment F-A1 below: curves are Desmos's own colours._
6. **Docking.** On desktop (at least 1024 px wide), the toolbar and side buttons open the
   calculator docked on the left of the quiz; on smaller screens it opens full screen.
7. **Fonts.** All calculator UI text, including the window title, uses the sans UI font (Arial);
   only math uses KaTeX fonts.

## Parity increment scope

The parity increment (finished 2026-10-18) delivered these IDs
ahead of their phases, with the wording this appendix's findings give them; their phase tags read
"Parity". Points of interest: POI-1 to POI-14, POI-16 to POI-20, A11Y-9, KB-14, K-9. Add item and
tables: S-2, S-10 to S-13, D-1, D-4 to D-13, D-16, D-19, D-20, D-41, D-42. Regression: PR-30, D-2,
D-3, D-22, D-24 to D-34, D-36, D-37, D-39, D-44 to D-46, POI-3, K-8, A11Y-10. Visual retune: TH-6,
TH-7, TH-8, TH-17, TH-19, G-25, L-3, L-16. Docking: L-4. Transfer to Calculator, including tables
and coordinate pairs: the Phase 1 TR- IDs plus TR-22 to TR-25, TR-34, TR-39, TR-60, TR-61, TR-63,
D-17, D-18.

### Amendment F-A1 (owner, 2026-10-19): Desmos colours and shading, no curve contrast caps

This replaces decisions 4 and 5. It also drops the D9 contrast rules for curves and shading
(TH-6, TH-7, TH-8 and TH-11), whatever decision 2 says, and changes TH-10's new-row order, G-17's
shading clause and FN-74's TH-11 lift. Each of those rules carries an "Amended 2026-10-19 (F-A1)"
note. The 10.3 targets for text, axes, gridlines, focus and keys are unchanged.

F-A1 supersedes the 2026-10-18 resolution of decision 5 (keep TH-7's colour-blind guarantee over
the Desmos hue order, recorded in `05-visual.md` by commit 89ac84f) and the per-skin TH-8 shading
cap that shipped with the parity visual retune: the owner's later explicit instruction
(2026-10-19) is to match Desmos's colours exactly, so the colour-blind spacing and the shading cap
are both gone.

- **Curves.** The six slots hold Desmos's colour-picker colours. Slot numbers are stored in saved
  states, so they never change:
  - c1 red `#c74440`
  - c2 blue `#2d70b3`
  - c3 green `#348543` (the picker's green)
  - c4 purple `#6042a6`
  - c5 orange `#fa7e19`
  - c6 black `#000000`
- **Picker order.** Desmos's colour picker shows red, blue, green, orange, purple, black, so the
  swatches are drawn in the order c1, c2, c3, c5, c4, c6.
- **New rows** cycle red, blue, green, purple, black and repeat, skipping orange, as Desmos's
  next-colour rule does: c1, c2, `#388c46`, c4, c6. Desmos gives new rows a slightly different
  green (`#388c46`) from its picker green (`#348543`), so the new-row green is stored as an explicit
  colour. A new table column or regression column takes the colour after the previous one in this
  cycle, so red follows black (picker green counts as the new-row green, and orange as purple).
  The column colour picker shows the green swatch (c3) as selected for a column in the new-row
  green, so a column always has one swatch checked.
- **Dark skins** show every curve colour inverted, as Desmos's Reverse contrast (`invert(100%)`)
  does. For example, black becomes white, red becomes `#38bbbf` and the new-row green `#c773b9`.
- **Shading.** Every inequality fill is 40% of its curve colour. Overlapping fills stack in row
  order with no cap.
- **Explicit colours.** An explicit `#rrggbb` row colour is used as given, inverted on dark skins,
  and is never adjusted for contrast. The TH-11 "Colour adjusted for contrast" note is removed.
- **Source.** The values live in `src/lib/calculator/theme/desmos-palette.ts`.

### Not yet matched

These Desmos behaviours are known and recorded but not yet built:

- **Colour counter.** Desmos keeps a running colour counter, so a new row continues the cycle
  wherever the last one left off. The calculator still picks the colour from the row's position, so a row
  inserted after the first of red, blue, green repeats blue where Desmos gives purple. The
  expected-failure test "F-A1 a row inserted mid-list continues Desmos's colour cycle" in
  `engine.rows.test.ts` pins the gap; building the counter makes it pass, and its `.fails` must
  then be removed.
- **An ellipsis outside a list.** Desmos reads `1...5` as "Sorry, I don't understand the way that
  '...' is used here."; the calculator shows its syntax error. An expected failure in
  `desmos.reference.test.ts` (`CATALOGUE_ERROR_GAP`).
- **Indexing gaps (NM-30, NM-31).** Indexing, slicing and filtering match Desmos (see below)
  except where they use notation that has not shipped: member access (`L[2].x`, `P[P.x>2].x`,
  `[1,2,3].\operatorname{length}`, now the unsupported-notation message after any index, list or
  point), `and` and `or` in a filter, comprehensions, `length`,
  matrix indexing with `;` ("Cannot index a list of numbers with ';'."; the tokenizer rejects `;`
  until matrices ship), `\ne` in a filter, and indexing a colour, a tone or a matrix. `P[2]`, an
  index of a name defined as a list of points, is not graphed yet (M5). Each is an expected
  failure in `desmos.reference.test.ts` (`INDEX_VALUE_GAP`, `INDEX_ERROR_GAP`, `RELATED_*_GAP`).
  `E[1...3]` with E=[] shows three undefined elements where Desmos shows no value; only its
  missing error is checked, since the display is the UI's.
- **Root gaps (G9).** `\operatorname{sqrt}` and its arity messages, `real`, `\sqrt{4,9}` ("Points are written like this: (1, 2)."), `\sqrt(4)` ("Expected '(' to match
  ')'."; the calculator reads it as a pasted `sqrt(4)`) and `\sqrt[[2,3]]{64}` ("Expected '[' to
  match ']'."; normalizing drops `\left` and `\right`, so it reads as `\sqrt[\left[2,3\right]]{64}`,
  which is [8, 4] in Desmos too). Expected failures in `desmos.reference.test.ts`
  (`ROOT_VALUE_GAP`, `ROOT_ERROR_GAP`).
- **An infinite log base.** Desmos gives `\log_{\infty}(5)` = 0; `\infty` is not a value in the
  calculator yet, so it is undefined. An expected failure in `desmos.reference.test.ts`
  (`CATALOGUE_VALUE_GAP`).
- **Statistics gaps (FN-2, FN-23 to FN-29, FN-75).** The reducers, length, gcd, lcm, the
  aliases gcf, mcd, mcm, stddev, stdDev, stddevp, stdDevP and variance, and inversecdf and
  inverseCdf of a list match the catalogue (see below) except where a case uses notation that
  has not shipped: derivatives, colours and tones, distributions, member access
  (`L.\operatorname{mean}`, `\operatorname{mean}(P).x`), comprehensions and matrices, `shuffle`,
  `random`, `stats`, `boxplot` and `polygon`, `\arg`,
  `\infty` as a value, and a point-valued call such as `\operatorname{mean}(P)`, which evaluates to
  the point but is not graphed yet (M5). Desmos also gives a `y=` row a value when its right side
  is constant (`y=\operatorname{count}(x,1,2)` = 3); the calculator graphs it as a line. Each is an
  expected failure in `desmos.reference.test.ts` (`STATISTICS_GAPS`, `POINT_ROWS`). Not built
  either: the Statistics, List operations and Number theory panel buttons (a UI change, left
  to the panel work). An unknown `\operatorname{…}` name is unsupported in the calculator, while
  Desmos reads it as one multi-letter name: `\operatorname{stddevP}()` reads "Function 'stddevP'
  is not defined.", `\operatorname{stddevP}(L,M)` "Too many variables. Try defining 'stddevP'."
  and `\operatorname{stddevP}(L)` "Try adding 'y=' to the beginning of this equation." (9 captured
  errors in the catalogue, not in the fixture). Matching them needs a multi-letter identifier in
  the parser and free-variable analysis, which is its own task.
- **List operation gaps (FN-30 to FN-38).** cov, covp, corr, spearman, sort, unique, join,
  repeat, argmin and argmax match the catalogue except where a case uses unshipped notation:
  derivatives, colours and tones, member access (`L.\operatorname{sort}`, `.x`), actions (`\to`)
  and `shuffle`. `frequency` is not a Desmos function: its errors ("Function 'frequency' is not
  defined.") need multi-letter names, as above. Desmos folds `0.1+0.2` exactly to 0.3, so
  `unique([0.1+0.2,0.3])` is [0.3] there and two elements here. Rows Desmos graphs as several
  curves (`\operatorname{join}(x,1)`, `\operatorname{repeat}(x,2)`, G-22) or as a call's points
  (`\operatorname{sort}(P,[3,1,2])`, M5) do not graph yet. Each is an expected failure in
  `desmos.reference.test.ts` (`LIST_OPERATION_GAPS`, `LIST_OPERATION_GRAPH_GAPS`). The hidden
  sortPerm, complexSortPerm and uniquePerm, and the hidden names Desmos refuses (repeatAssert,
  frequencyList, frequencyListAssert, sortedLastLessIndex, sortedLastLessEqualIndex: "This
  calculator does not support the 'frequencyList' function."), match; shuffle's do not (T14).
  Known but not captured live, so not in the fixture: Desmos keeps ±Infinity inside a list where
  the engine reads undefined, so `\operatorname{sort}([3,1/0,-1/0,1])` puts −∞ first there,
  `\operatorname{argmin}([3,-1/0,1])` is 2 and `\operatorname{unique}([1/0,1/0,-1/0])` has two
  elements; and `y=\operatorname{length}([1...x])` graphs in Desmos (only a top-level list
  needs a constant length) while NM-31's check refuses it here.
- **Piecewise gaps (PR-31, PR-32).** Piecewise braces and restrictions match Desmos (see below)
  except where they use notation that has not shipped: derivatives and integrals of a piecewise,
  distributions in a condition (`invNorm`, `normaldist`), recursion with a piecewise base case
  (`p(n)=\{n=0:1,np(n-1)\}`, still "p is defined in terms of itself."), `and` and `or` in a
  condition (and Desmos's "Ambiguous use of 'and' and 'or'."), `\sum` and `polygon`. A list
  condition on a curve (`y=x\{[0,1]<x\}`) waits for multi-branch graphs (G-22), a restricted
  parametric (`(t,t^{2})\{t>0.5\}`) for parametric curves, `r=\theta\{\theta<\pi\}` for polar
  curves and `\{A=A:1,0\}` ("Cannot compare a matrix to a matrix.") for matrices. Each is an
  expected failure in `desmos-piecewise.reference.test.ts` or `desmos-relations.reference.test.ts`.
  A point-valued piecewise or restriction (`(1,2)\{a>0\}`) is a point row: a point times a real
  number scales it, the only point arithmetic shipped before M4. Inferred from Desmos's typed
  piecewise and not captured live: a scalar condition's pick broadcasts over a list value
  (`\{1>0:1,[1,2]\}` = [1, 1], `\{1<0:[1,2],[3,4,5]\}` = [3, 4]); a condition comparing points
  is "Cannot compare a point to a point."; a condition chain may point both ways
  (`\{0<a>0:5\}`); and the comparator chain errors of PR-29 and RC-14 other than `x<1<2` and the
  relation operator ones use the bundle's strings.

### Matched after the 2026-10-19 second review

These were captured from Desmos by the second review and now match. Every captured error,
including these, is checked in `desmos.reference.test.ts`:

- **Statistics, length, gcd and lcm (FN-2, FN-23 to FN-29, FN-75).** A reducer reduces one list
  or its number arguments (`mean(1,2,3)` = 2) and broadcasts when a list is among several
  arguments (`max([1,2],5)` = [5, 5], cut to the shortest list). An undefined element makes the
  result undefined; count and length count it. `total([])` and `count([])` are 0. stdev and var
  use n − 1 in two passes; mad is the mean absolute deviation; quantile is type 7 on [0, 1];
  quartile checks [0, 4], rounds half up and takes the medians of the halves without the middle
  value. mean and total of points are a point. length never broadcasts. gcd and lcm round first,
  and in complex mode work on Gaussian integers shown in the first quadrant. count and length do
  not make a row depend on x (`count(x,1)` = 2). The error texts for `mean()`, `min()`,
  `quantile(5,0.5)`, `median(P)`, `quantile(P,0.5)` and `length(L,10)` are Desmos's. The spelling
  aliases evaluate as their canonical function and their errors keep the spelling written
  (`variance(P)` reads "Function 'variance' cannot be applied to a point."); `inversecdf(L,p)` is
  `quantile(L,p)`, with "requires 2 arguments" and "must be a list" texts naming inversecdf. A
  broadcast of mean or total over points is typed a list of points. A list argument the real
  plotter cannot lay out (`y=\operatorname{mean}([1,2,3]^x)`, `y=\max(\sin([1,2]x))`) is plotted
  through the general evaluator rather than drawn blank. The values
  are in `desmos-statistics.fixture.json`.
- **Indexing, slicing and filtering (PR-34, NM-30, NM-31).** `L[i]` is 1-based and rounds a
  non-integer index down (`L[1.9]` = L[1], `L[0.6]` undefined); out of range is undefined. A list,
  several items or a range picks each index in turn (`L[[1,3,5]]`, `L[1,2]`, `L[1,3,...,7]`), and a
  slice is never cut at the end (`L[8...20]` is L[8] then 12 undefined; `L[4...2]` runs
  backwards). `L[a...]`, `L[...b]` and `L[...]` run to the end and from 1. One condition filters
  by position up to the shorter list (`L[L>3]`, `L[2<L<6]`, `L[[1,2,3]>2]` = [4]). `L[]` reads
  "Square brackets cannot be empty.", `5[1]` "Cannot index a number with a number." (a `[` after a
  number indexes it, so `2[1,2]` is no longer a product), and a range or filter that uses x, such
  as `[x...5]` or `L[L>x]`, "Can't plot a list whose length depends on free variable 'x'." `L[x]`
  graphs as a step function. Every catalogue value and error for these is checked
  (`desmos-index.fixture.json`), with the gaps listed above.
- **Index types and free variables (NM-30, NM-31), from the third review.** A `[` after any term
  indexes it (Desmos's parser binds `[` tighter than every operator but `(`): `(L+1)[2]`,
  `L^{2}[1]`, `\pi[1,2]`. Indexing a value analysis types as a number or a point, or indexing by a
  point, reads "Cannot index {a number} with {a point}." with Desmos's ListAccess wording (`a[1]`
  with a=5, `L[1][1]`, `x[1]`, `(1,2)[1]`, `L[(1,2)]`), and a range or filter on a name no row
  defines reads "Can't plot a list whose length depends on free variable 'i'." (`L[i>2]`,
  captured). An index of any list without variables graphs as a step function (`L[2...][x]`,
  `[1...5][x]`, `L[L>3][x]`), where it plotted nothing before. Only `L[i>2]` was captured live; the
  rest follow the decompiled parser and type signatures and await a capture.
- **Piecewise and restrictions (PR-31, PR-32, NM-41).** `\left\{c_1:v_1,c_2:v_2,…,v\right\}`
  takes the value of the first condition that holds, then the bare last value, else undefined. A
  part with no `:` is a condition whose value is 1, so `\{1>0,2<1:4\}` is 1 and `\{1>0:5,1<0\}` is
  5; `\{c\}` alone is 1 or undefined and `\{\}` is 1. Conditions chain (`\{0<a<2:5\}`), `=`
  compares the full doubles, and degree mode applies inside them. A condition with a list operand
  broadcasts every part to the shortest list (`\{[1,2,3]>1:10,20\}` = [20, 10, 10],
  `\{[1,2]>1:[5,6],0\}` = [0, 6]); otherwise only the picked value is evaluated. Braces after an
  expression multiply it, so they restrict curves, implicit curves, regions and functions
  (`y=x\{0<x<2\}`, `x^{2}+y^{2}=1\{x>0\}`, `y>x\{x>0\}`, `f(x)=x\{x>0\}` with `f(-1)`
  undefined) and stack (`\{x>0\}\{x<1\}`); a piecewise in x alone graphs as a curve
  (`\{x<0:-1,x>0:1\}`). A piecewise index picks by its values (`L[\{L>3\}]`). The errors are
  Desmos's: "You need something on both sides of the ',' symbol." and "… of the ':' symbol.", "The
  left side of a ':' must be a condition, like 'x>1'.", "A piecewise expression must have at
  least one condition." (`\{5,6\}`, `y=x\{x\}`), "Every part of a piecewise expression must
  have a condition except the last." and "Cannot use a point and a number as the branches in a
  piecewise. Every branch must have the same type." Every catalogue value and error is checked
  (`desmos-piecewise.fixture.json`), with the gaps listed above.
- **Roots (G9).** `\sqrt{}` and `\sqrt[3]{ }` read "Radical cannot be empty." and `\sqrt[]{8}`
  "Radical index cannot be empty." (checked first), where they were syntax errors. In complex
  mode a negative radicand takes the principal root (`\sqrt[3]{-8}` = 1 + 1.732i). Every catalogue
  root value and error is checked (`desmos-root.fixture.json`), with the gaps listed above.
- **The plan's 14 captured index values** (`L[2]` to `[2...10][4]`, with L=[5,3,8,1]) are a
  reference family of their own.

- **`exp` needs parentheses.** `\exp 2`, `\exp^{2}(1)` and `\exp` on its own read "'exp' is a
  function. Try using parentheses."; `\exp()` reads "Function 'exp' requires an argument. For
  example, try typing: exp(x)." `exp` is no longer a prefix-form name.
- **A run before another call.** `\sin 2\cos 1` and `\sinh 2\cosh 1` read "Use parentheses around
  the argument of 'sin'." (or 'sinh'), the new `argument-parentheses` error. `\sin\cos x` is still
  sin(cos x).
- **User-function arity.** With f(x)=x and g(a,b)=a+b, `f(1,2)` reads "Function 'f' requires only
  1 argument. For example, try typing: f(x).", `f()` "Function 'f' requires an argument. For
  example, try typing: f(x).", and `g(1)` and `g(1,2,3)` "Function 'g' requires 2 arguments. For
  example, try typing: g(1, 2)." An empty `f()` is now an arity error, not a syntax error.
- **Empty arguments.** `\operatorname{nCr}(,2)` and `\operatorname{mod}(1,)` read "You need
  something on both sides of the ',' symbol." (the new `comma-side` error), and `\log_{2}()` reads
  "Function 'log' requires an argument. For example, try typing: log(x)."
- **`log` with two arguments (PR-27, RC-20).** `\log(10,2)` and `\log_{2}(8,2)` read "Function
  'log' requires only 1 argument. For example, try typing: log(x).", since a base is written only
  as a subscript. The parser marks a subscript base on the call (`base`), and the arity check counts
  only the written arguments. `\log_{}(8)` reads "Subscripts cannot be empty." and `\log^{-1}(100)`
  "Only log^2 is supported. Otherwise, use parens." (`\ln` likewise). `\ln_{2}(8)` reads "'ln'
  cannot have a subscript." (the `name-subscript` error), as do the trig and hyperbolic names with
  a subscript. Every ln value and error in the function catalogue is checked too.
- **Trig, exp and point arguments (NM-4, NM-26, NM-28, PR-26, FN-4, FN-22).** Desmos is exact
  only at quarter turns: `\sin(\frac{\pi}{6})` is 0.49999999999999994, `\tan(45)` in degrees is
  0.9999999999999999 and `\arcsin(0.5)` in degrees is 30.000000000000004, so
  `\operatorname{floor}(\tan(\frac{\pi}{4}))` is 0; the calculator no longer snaps multiples of
  π/12, 15° or a degree result. `\arctan(0,0)` is 0 and `\arctan(-0,-1)` is −π. Only `^2` and
  `^{-1}` go on a trig or hyperbolic name ("Only sin^2 and sin^-1 are supported. Otherwise, use
  parens."). An elementary built-in or a square root of a point reads "Function 'sin' cannot be
  applied to a point." Every catalogue value and error for circular trig, inverse trig and exp,
  and every user-function arity text, is checked in `desmos-trig.reference.test.ts`
  (`desmos-trig.fixture.json`; real trig values exactly). Not yet matched (`GAPS` there):
  derivatives, integrals, sums and products, `\infty`, complex mode ignoring the degree setting
  and its branch signs for arcsin, arccos, arccsc and arcsec at real x outside the domain,
  `\sin\cos(0)` (Desmos asks for parentheses), θ outside a polar row, and the degree sign, which
  Desmos does not have.
- **Exact logs (FN-60).** `\log_{3}(81)` is 4 and `\log_{10}(1000)` is 3, as in Desmos, so
  `\operatorname{ceil}(\log_{3}(81))` is 4, not 5. Every log value and error in the function
  catalogue is checked in `desmos.reference.test.ts`.
- **Range length (NM-36).** Desmos rounds a range's element count, n = round((c − a)/s) + 1, so
  `[1...3.5]` is `[1, 2, 3, 4]` and `[1,3,...,8]` is `[1, 3, 5, 7, 9]`, and the calculator now does
  the same. A count that is not finite or is smaller than the values written before the ellipsis
  (`[1,1,...,5]`, `[1...0/0]`, `[1,3,...,1]`, `[1,2,...,0]`) reads "Ranges must be arithmetic
  sequences." Every range value and error in the function catalogue is checked in
  `desmos.reference.test.ts` (`desmos-catalogue.fixture.json`), the range values exactly.
- **Exact ranges (NM-36).** Desmos folds a range of constants in exact fractions, so
  `[0,0.1,...,1]` holds 0.3, not 0.30000000000000004, and `[1,1.1,...,1.25]` counts 2.5 steps,
  rounded to 3. The calculator computes the count and elements on fractions too
  (`core/lib/rational.ts`), and never swaps the last element for the bound (`[1...3.0000000001]`
  is `[1, 2, 3]`). Ranges may have more values on either side of the ellipsis
  (`[1,2,3,...,10]`, `[1,...,9,10]`), checked to lie on the sequence (`[1,2,4,...,10]` is "Ranges
  must be arithmetic sequences."). Only `[0,0.1,...,1]` is captured live; the rest follow Desmos's
  range builder.
- **List errors.** `[1,...]` reads "Range must have an upper and lower bound." (the new
  `range-bound` error) and `[1...10001]` reads "Lists may not have more than 10,000 elements."
  (NM-35's wording, changed to Desmos's).

## The + (Add Item) menu

### Requirements

Scope: Karman shows Expression, Table and Inference only (S-2, CB-1).

1. Render Add item as a toolbar button named "Add item" with `aria-haspopup="menu"` and `aria-expanded` reflecting the menu state.
2. Render the menu as `role="menu"` named "Add item" with exactly three `menuitem`s in the order Expression, Table, Inference.
3. Give each item an icon plus a one-word visible label and an accessible name that starts with "Add" ("Add expression", "Add table", "Add inference").
4. Open the menu on click, Enter, Space or ArrowDown on the Add item button.
5. Move focus to the first item when the menu opens, showing the focus ring only for keyboard opens.
6. Move focus one item with ArrowDown and ArrowUp, wrapping from last to first and first to last.
7. Move focus to the last item on End and to the first item on Home (Desmos ignores Home; Karman should not).
8. Activate the focused item on Enter or Space and close the menu.
9. Close the menu on Escape and return focus to the Add item button, consuming that Escape (KB-3).
10. Close the menu on Tab and leave focus on the Add item button.
11. Close the menu when the Add item button is activated again.
12. Close the menu on a pointer press outside it and let that press reach its target control.
13. Do not create a row when the menu is closed by a click in the empty list area.
14. Anchor the menu below the Add item button with an upward caret on the L-1 layout.
15. Anchor the menu to the right of the Add item button with a caret pointing at it on the L-2 stacked layout, as a popover rather than a bottom sheet.
16. Keep the menu inside the calculator container and do not dim the graph while it is open.
17. Insert every new item immediately after the active (last focused) row, or at the end when no row has ever been active.
18. Keep the last active row as the insertion anchor after focus leaves the list (for example after a graph control click).
19. Add expression always inserts a new empty row after the active row, even when the active row is empty, and focuses it.
20. Add table replaces the active row in place when it is an empty expression row, and otherwise inserts after it.
21. Name a new table's columns xₙ and yₙ by the D-4 rule, so the first table is x₁, y₁ and a second is x₂, y₂.
22. Show a new table with a colour and style tab on the y column, a blank header slot to the right, and focus in the first x cell.
23. Record each Add item insertion, including an in-place replacement, as exactly one undo step that Undo reverses to the previous rows.
24. Convert an empty row to a table as soon as its whole content is `table`, with focus in the first x cell (D-5).
25. Do not convert an empty row on typing `"`, `note`, `folder` or `image`; treat them as ordinary math input (CB-1).
26. Announce the inserted item in the live region (for example "Table 2 added").
27. Hide Add item entirely in Scientific mode (SC-2).

### Gaps against the existing spec

Spec files read: `e-ux-keypad-accessibility-theme.md` (S-2, KB-3, KB-13, AN-4, L-1, L-2, R-3,
A11Y-3) and `b-functions-and-data.md` (D-4, D-5, D-7, D-19, D-20, FN-59), plus CB-1 in the design doc.

| ID               | Spec says                                                                                                                                                                                                   | Desmos does                                                                                                                                                                                                                     | Gap / action                                                                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-2              | Menu with Expression, Table, Inference; Note, Folder, Image never appear; Phases 1-2 add an expression directly                                                                                             | Six items: expression, note, table, inference, folder, image                                                                                                                                                                    | Order matches after removing the excluded items. S-2 does not say where items are inserted, where focus goes, how the menu is navigated or closed, its accessible names or its placement. Add requirements 1-20 above (or a new S-2a to S-2d). |
| S-2 (Phases 1-2) | Add item adds an expression row directly                                                                                                                                                                    | Add expression inserts after the active row, not at the end                                                                                                                                                                     | State that the direct add inserts after the active row and focuses it (requirements 17-19), so Phases 1-2 already match.                                                                                                                       |
| KB-3             | Escape closes one layer, the open menu first                                                                                                                                                                | Escape closes the menu and returns focus to "+"                                                                                                                                                                                 | Add "focus returns to the Add item button" to KB-3 or S-2.                                                                                                                                                                                     |
| KB-13            | Add item reachable by Tab                                                                                                                                                                                   | Same; Tab from the open menu closes it and focuses "+"                                                                                                                                                                          | Specify Tab behaviour inside the menu (requirement 10).                                                                                                                                                                                        |
| (none)           | Arrow keys in the menu are not specified                                                                                                                                                                    | Up/Down wrap, End works, Home does not                                                                                                                                                                                          | Specify the menu-button keyboard pattern, including Home (requirements 4-8).                                                                                                                                                                   |
| L-2              | Stacked toolbar content only                                                                                                                                                                                | Menu opens to the right of "+" as the same popover                                                                                                                                                                              | Specify stacked placement (requirement 15); no bottom sheet.                                                                                                                                                                                   |
| AN-4             | 100 ms fade and 4 px slide for the Add item menu (confirm by REA in Phase 1)                                                                                                                                | Not measurable here (reduced motion on)                                                                                                                                                                                         | Still open; needs a capture with `reduced_motion: no-preference` and frame timing.                                                                                                                                                             |
| D-5              | Table from the menu or typing `table`: headers xₙ, yₙ, no data rows, focus in the first cell of its blank row; one blank row always below the data rows; one blank header slot shows while a cell has focus | Same headers and blank header slot; the snapshot shows **two** empty body rows (focused row 1 plus a faint blank row) and focus in row 1's x cell; `table` converts on the final `e`                                            | Mostly matches. Decide whether Karman shows one or two empty body rows on a new table (Desmos shows two; D-5 implies one). D-5 does not say that a menu table **replaces an empty active row**; add requirement 20.                            |
| D-4              | xₙ naming with the lowest free n                                                                                                                                                                            | x₁/y₁, then x₂/y₂                                                                                                                                                                                                               | Matches.                                                                                                                                                                                                                                       |
| D-7              | Enter down same column, Tab right with wrap                                                                                                                                                                 | Observed exactly that, Tab skipping the blank header slot                                                                                                                                                                       | Matches; add "Tab skips the blank header slot" to D-7.                                                                                                                                                                                         |
| D-19             | Table named "Table n, k columns, m rows"; cells named "x₁, row 3"                                                                                                                                           | `listitem "Table n"`, `grid`, unnamed cell textboxes                                                                                                                                                                            | Karman is deliberately richer; no change.                                                                                                                                                                                                      |
| D-20             | Table creation is one undo step                                                                                                                                                                             | One undo step, with the empty row restored                                                                                                                                                                                      | Matches; extend to all Add item insertions (requirement 23).                                                                                                                                                                                   |
| FN-59            | Add menu's inference item inserts `ttest()` with the caret inside the parentheses                                                                                                                           | Opens an Inference Wizard (distribution, z, t, z-prop, chi-squared independence and goodness of fit) with forms and a Create button that writes `ttest([...])`, `normaldist(0)`, etc.; graph dimmed; close returns an empty row | **Main behavioural gap.** Owner decision needed: keep the simpler `ttest()` insert (cheaper, testable) or build a wizard. If simpler, state that it inserts after the active row like requirement 19 and announces it.                         |
| CB-1             | Notes, folders, images never available                                                                                                                                                                      | Typing `"`, `note` or `folder` converts an empty row in Desmos                                                                                                                                                                  | Spec does not say what Karman does with these shortcuts; add requirement 25.                                                                                                                                                                   |
| R-3              | Enter creates a new row below and focuses it                                                                                                                                                                | Consistent with the insertion rule                                                                                                                                                                                              | Matches.                                                                                                                                                                                                                                       |
| (none)           | Live announcements for inserted items                                                                                                                                                                       | Desmos announces nothing observable                                                                                                                                                                                             | Karman addition (requirement 26) for A11Y-2.                                                                                                                                                                                                   |

## Tables

### Requirements

1. Add item → Table creates a table with headers x₁ and y₁ and puts focus in the first cell of row 1.
2. Typing exactly `table` into an empty expression row converts that row into a table immediately, without Enter, with focus in x₁ row 1.
3. A table always shows exactly one blank row after its last data row; typing in it makes it a data row and adds a new blank row.
4. While a table cell or header is focused, an extra blank header slot is shown to the right of the last column.
5. A point is plotted as soon as both cells of a row hold valid values, before the cell loses focus.
6. Enter in a cell moves to the same column in the next row (creating a row from the blank row).
7. Enter in the blank trailing row leaves the table and focuses the next list item (or a new empty expression).
8. Tab moves to the next data column and, from the last data column, to the first column of the next row; Shift+Tab does the reverse; neither visits the new-column slot.
9. A cell entered by Tab, Shift+Tab or ArrowUp/ArrowDown has its whole content selected, so typing replaces it.
10. ArrowUp/ArrowDown move one cell vertically; ArrowUp from row 1 enters the column header; ArrowDown from the blank row leaves the table for the next item.
11. ArrowLeft/ArrowRight move the caret within a cell and cross into the neighbouring cell only from the caret's edge (the first press on a selection collapses it).
12. Tab or ArrowRight inside a fraction, radical or exponent in a cell first leaves that structure and stays in the cell.
13. Backspace in an empty cell of an otherwise empty interior row deletes that row and focuses the cell above with its content selected.
14. Backspace in the empty trailing row moves focus to the same column of the last data row with its content selected.
15. Backspace in an empty expression row directly below a table deletes that row and puts focus in the table's blank row.
16. Clearing every cell of an interior row leaves an empty row in place until it is deleted explicitly.
17. A cell accepts numbers, negatives, decimals, typed fractions (rendered stacked) and simple expressions such as 2·3 and √2, plotted by their value.
18. A cell that cannot be evaluated shows a warning icon at its left and exposes the message (for example "Too many variables. Try defining 'a'." or "Points are written like this: (1, 2).") to assistive technology, in a hover, focus and tap tooltip on the marker, with `aria-invalid` and `aria-describedby` on the cell. **Matched** (D-6; component test).
19. Rows with a blank or invalid value in a pair are skipped when plotting, and the other rows still plot.
20. Data columns plot as filled circles of size 8 in the column colour, not joined, by default; the second and later data columns take the next palette colours.
21. Activating the column icon toggles that column's points on and off, and the icon shows an empty outline when hidden.
22. Long-press on the column icon opens a style menu with: points on/off, opacity, point size, point shape, point outline, six colours, lines on/off (with opacity, thickness 2.5 default and solid/dashed/dotted), drag on/off and Add regression.
23. Turning lines on joins the column's points in row order.
24. Escape closes the style menu and returns focus to the column icon.
25. A table's Zoom Fit control fits the view to the table's plotted points with padding on every side and makes the Home (default viewport) control available.
26. Typing a new variable name in the blank header slot adds a data column plotted against the first column in a new colour.
27. Typing an expression of the first column's variable in a header (for example x₁², or x² after renaming to x) makes a computed column whose cells show the computed values in a read-only style and which plots against the first column.
28. Renaming the first column header (x₁ to x) keeps its data and plotting.
29. Clearing a later column's header stops that column from plotting but keeps its data.
30. Enter in a header moves to that column's row 1 cell.
31. Converting `y=x^2` to a table inserts a table below it with first column −2, −1, 0, 1, 2 and a computed second column x², plotted in the expression's colour, and shows an undoable confirmation.
32. Deleting a table replaces it with an empty expression row holding the caret, and Undo restores the table with its data.
33. On phone, columns keep their width and the table scrolls horizontally when columns overflow the list width.
34. On phone, the keypad's Right/Left Arrow keys cross into the next or previous cell at the caret's edge and its Enter key moves down a column.
35. On phone, moving onto a non-editable slot must not leave the keypad in a state where key taps are lost (Desmos closes it; Karman should keep focus in an editable cell instead).

### Gaps against the existing spec

| Spec                                                                        | Desmos observed                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Gap / action                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-4 naming x₁, y₁                                                           | Matches (step 1). Create Table from `y=x^2` used plain `x`, x²                                                                                                                                                                                                                                                                                                                                                                                                                         | D-13 says the first column is xₙ by D-4. Desmos reuses the expression's variable. Keep D-13 (xₙ avoids clashing with the graph variable), but record this as a deliberate difference.                                                                                         |
| D-5 creation, `table` keyword, blank row, header slot                       | All match (steps 1–3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | One addition: Enter in an empty row-1 cell leaves an empty row 1 behind (t06-b). D-5 should state what happens to blank interior rows (see D-8 below).                                                                                                                        |
| D-6 cell is a math field accepting expressions                              | Matches: 2·3, √2, fractions; errors as inline warning plus note.                                                                                                                                                                                                                                                                                                                                                                                                                       | D-6 limits values to real numbers; Desmos shows "Points are written like this" for `3,4`. Add the exact warning texts for a list or comma, an unknown variable and a self-reference. Also specify T-4's digit-subscript effect in cells (`1e3` → 1e₃ error).                  |
| D-7 Enter, Shift+Enter, Tab wrap, arrows, Backspace                         | Enter, Tab and Shift+Tab wrapping, arrow edge-crossing and ArrowUp/Down leaving the table **match**. Differences: (a) ArrowUp from row 1 enters the **header**, not the previous list item; (b) Backspace in an empty cell moves **up** (same column), and in a wholly empty row **deletes the row**; (c) entering a cell selects its content; (d) Enter on the blank trailing row leaves the table; (e) Tab inside a structure exits the structure first. Shift+Enter was not tested. | Update D-7 for (a), (b), (c), (d) and (e), or state that Karman deliberately differs. "Backspace moves to the previous cell" is not what Desmos does.                                                                                                                         |
| D-8 "Add row" button, per-row "Delete table n row k" control, 1,000-row cap | Desmos has **no add-row or delete-row buttons**. Rows are added by typing in the blank row or by Enter, and deleted only by Backspace in an empty row. Emptied rows persist.                                                                                                                                                                                                                                                                                                           | Karman's explicit controls go beyond Desmos (good for touch and a11y). Add a rule that Backspace in an empty row deletes it, so keyboard users match Desmos, and say whether emptied interior rows persist.                                                                   |
| D-9 header menu with "Delete column", 10-column cap                         | Desmos has **no column delete control**. An emptied header and column stays (t19), and Backspace in an empty header moves to the previous header.                                                                                                                                                                                                                                                                                                                                      | D-9 is a Karman addition. Add: Backspace in an empty header moves to the previous header (Desmos parity) and never deletes data silently.                                                                                                                                     |
| D-10 first header must be a variable; expression headers are computed       | Matches: x₁²/x² computed, grey cells, own colour (t13, t14). Changing y₁ to an expression **discards the typed data** with no warning.                                                                                                                                                                                                                                                                                                                                                 | Add to D-10: changing a data column's header to an expression replaces its values (undoable, D-20), and say whether a warning or announcement is given.                                                                                                                       |
| D-11 plotting, skipped undefined pairs                                      | Matches (steps 7, 16). A blank-header column is not plotted.                                                                                                                                                                                                                                                                                                                                                                                                                           | Add "a column with an empty header is not plotted and keeps its data".                                                                                                                                                                                                        |
| D-12 style options                                                          | Desmos has 8 point shapes, an opacity field, an outline checkbox, Lines with thickness 2.5 / opacity / three styles, and a **Drag on/off** switch (no X/Y choice in this menu). Opened by **long-press only** (right-click does nothing, which is a gap in Desmos).                                                                                                                                                                                                                    | D-12 lists 3 shapes, which is fine for SAT scope. Add line thickness (default 2.5) and point size default 8 if parity is wanted. R-4's long-press, right-click and Edit-list access exceeds Desmos; keep it, and add a keyboard route (Desmos has none apart from edit mode). |
| D-13 Create table from `y=E(x)`                                             | Matches: values −2…2, computed column, row colour, toast "Table created. Undo", leaves edit mode, focus on the first x cell selected.                                                                                                                                                                                                                                                                                                                                                  | Add the confirmation and undo toast and the focus target to D-13.                                                                                                                                                                                                             |
| D-14 / D-15 paste                                                           | Not observed (clipboard is not exercised headless).                                                                                                                                                                                                                                                                                                                                                                                                                                    | Open: capture in a headed run.                                                                                                                                                                                                                                                |
| D-16 Zoom to fit                                                            | Matches in effect: fit with padding, Home button appears. Desmos shows it only while the table is focused, and shows "Add Regression" otherwise. Animation was not measured (reduced motion).                                                                                                                                                                                                                                                                                          | Keep D-16. Desmos's name is "Zoom Fit"; ours "Zoom to fit table n" is better.                                                                                                                                                                                                 |
| D-19 accessible names "x₁, row 3"                                           | Desmos names cells **only by value**, empty cells have **no name**, row names leak internal strings, and the hide button's name does not toggle.                                                                                                                                                                                                                                                                                                                                       | D-19, A11Y-10 and R-1 (`aria-pressed`) are improvements; keep them. Add a test that empty cells are named ("y₁, row 4, blank").                                                                                                                                               |
| D-20 undo                                                                   | Table delete → Undo restores (t10).                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Matches.                                                                                                                                                                                                                                                                      |
| D-3 / K-8 regression from table                                             | Desmos: the gutter "Add Regression" button inserts a linear fit at once (1 tap when the table is unfocused), and the style menu has "Add Regression".                                                                                                                                                                                                                                                                                                                                  | D-3's model menu (2 taps) is fine. Desmos's default is linear with no menu; consider defaulting the first tap to linear.                                                                                                                                                      |
| K-2 keypad opens on touch focus                                             | Desmos phone: table creation **does not open the keypad**; the toolbar toggle is needed.                                                                                                                                                                                                                                                                                                                                                                                               | K-2 is better; keep it. Add a test that a table created on coarse pointers opens the keypad.                                                                                                                                                                                  |
| K-6 phone keypad, no Tab key                                                | Desmos's phone keypad has ←/→ that cross cells and Enter that moves down; no Tab. Moving onto the new-column slot closes the keypad.                                                                                                                                                                                                                                                                                                                                                   | Add a K- or D- rule: keypad ←/→ cross cells at the edge; the header slot is skipped by keypad arrows (or focusing it keeps the keypad open).                                                                                                                                  |
| L-1 / phone layout                                                          | Desmos phone tables scroll horizontally with a fade (t26).                                                                                                                                                                                                                                                                                                                                                                                                                             | Add a D-/L- rule for horizontal overflow of tables on 390 px (scroll inside the item, fixed column width, focused cell scrolled into view).                                                                                                                                   |
| KB-3 Escape                                                                 | Escape closes the style menu (one layer), and from a cell it blurs the table.                                                                                                                                                                                                                                                                                                                                                                                                          | Matches the KB-3 layering.                                                                                                                                                                                                                                                    |
| S-2 Add item menu (Expression, Table, Inference only)                       | Desmos also lists note, folder and image.                                                                                                                                                                                                                                                                                                                                                                                                                                              | Deliberate (CB-1); no action.                                                                                                                                                                                                                                                 |

**Not observed or open:**

- Shift+Enter in a cell.
- Paste of tabular data.
- Drag mode behaviour.
- Point-size and opacity edits.
- Dark theme.
- Exact zoom-fit padding formula: one data set was measured. Points spanning x 1…3 and y 1…9 gave a view of x −1.5…4.5 and y −4.5…13.5, padding of 2.5 and 5.5 units, far more than D-16's 10%, and apparently limited by the graph's aspect ratio. Confirm with a second data set before copying it.
- The edit-mode icon click (t05-d timed out).
- Real iOS Safari.

## Regression

### Requirements

1. Typing `~` (Shift+Backquote) in a math row inserts `\sim`, displayed as "∼" and read as "similar".
2. Typing a digit straight after a single-letter variable (`y1`, `x1`, including inside an exponent) auto-subscripts it to y₁/x₁.
3. A row ending in `∼` with an empty side shows the error "You need something on both sides of the '∼' symbol." (Karman uses this text: PR-30's `sim-side` code).
4. The regression refits on every keystroke in the row and on every committed or in-progress cell edit in its source table, with no submit step.
5. The results area shows a "Regression parameters" section with one `name = value` per fitted parameter, then "Statistics" and "Residuals" sections side by side.
6. Parameter values display at 6 significant digits with trailing zeros removed (2.02, 3.13429, 0.0267857).
7. R² and r display at 4 decimal places, trimmed when exact (R² = 1), and a negative R² is shown as computed.
8. r is shown for a linear fit with a free intercept and for log-mode fits, and is hidden for quadratic, power, exponential (log off), logarithmic and constant fits.
9. A fitted parameter typed alone in another row shows its full-precision value (12 significant digits), and the parameter is usable in any other expression.
10. Each regression defines a residual list eₖ, numbered by regression creation order, usable in other rows before any plotting.
11. A "plot" control on a table regression adds a read-only computed eₖ column to the source table and plots y − ŷ against the first column in a new colour distinct from the curve.
12. Residuals are in original units even when log mode is on.
13. The fitted curve is drawn over the full visible x range in the regression row's colour, while the data points keep the table column's colour.
14. Exponential, power and logarithmic fits show a "Log mode" checkbox (with help) under the math, and toggling it refits and adds or removes r.
15. When any y ≤ 0 for an exponential fit, the Log mode control is not offered and the original-unit fit is shown.
16. A model that is undefined for the data (blank or non-numeric cell in the used columns, or a model like `log(−a²−1)`) shows the row error "We couldn't find any region where this model is defined." in place of results.
17. A non-numeric table cell shows its own in-cell warning ("Too many variables. Try defining 'q'."). **Matched** (D-6; component test).
18. A name defined by another row (e.g. `m = 3`) is treated as a constant, not a parameter, and the remaining parameters refit.
19. Referencing a parameter name that two regressions both fit is the error "You've defined 'm' in more than one place. Try deleting some of the definitions of 'm'." (Karman uses this text on every row that defines a duplicated name, RC-7; a row that references it reads "m has more than one definition.", D-44.)
20. Each value in the results is a focusable read-only field whose accessible name reads "name equals value", and the row's accessible name ends with "Has graph and regression. To access statistics, press Tab."
21. Tab from the regression row visits Delete, each parameter, each statistic, the residual name, the plot control and the colour toggle, in that order.
22. Row errors are exposed as an ARIA note and appended to the textbox's accessible name, and visually as a warning icon in the colour tab with a hover tooltip. **Matched** (R-2; component and browser tests).
23. On a 390×844 phone the results keep the two-column layout, scroll within the list, and the `~` key is reachable from the letters keypad page.

### Gaps against the existing spec

| Spec ID     | Our spec says                                                                                         | Desmos does (observed)                                                                                                                                                                            | Action                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-30 / CB-2 | Log mode checked by default                                                                           | Unchecked by default for typed rows and for the table dropdown (`d4-01`, `f1-04`)                                                                                                                 | Deliberate divergence (CB-2 exam parity); keep, and note it is not Desmos parity                                                                                   |
| D-28        | Non-positive y → note "Log mode is off: some values are not positive."                                | Checkbox silently absent, no note (`e3-03`)                                                                                                                                                       | Keep our note (better), but the checkbox should also be hidden or disabled                                                                                         |
| D-28        | Logarithmic with x ≤ 0 → error "ln needs positive x values."                                          | Not tested with x ≤ 0. The logarithmic form also shows a Log mode checkbox in Desmos (`d5-01`)                                                                                                    | Add an REA follow-up; decide whether a + b ln x shows the checkbox (it is linear in parameters)                                                                    |
| D-29        | Log-mode statistics headed "Log mode"                                                                 | Heading stays "Statistics"; the only cue is the checked box plus r appearing                                                                                                                      | Fine as a Karman addition; tests must not expect Desmos parity here                                                                                                |
| D-24        | Skip undefined pairs; fewer pairs than parameters → "Add at least as many data points as parameters." | Blank or non-numeric cell → whole fit fails with "We couldn't find any region where this model is defined."; too few points is **not** an error (exact min-norm-like fit, RMSE shown)             | Spec is stricter and friendlier; record the Desmos behaviour as known divergence. NM-40 "skip pair" for regressions is not what Desmos does                        |
| D-26        | Rank-deficient → "These data do not uniquely determine the model parameters."                         | `y₁ ~ a b x₁` and the 2-point quadratic fit silently (b = 1; a = −0.5 …)                                                                                                                          | Spec diverges deliberately; fine                                                                                                                                   |
| D-22        | No parameters → "Add a parameter to fit, for example y₁ ~ m x₁ + b."                                  | `y₁ ~ 2x₁` / `y₁ ~ x₁` are valid and show R² only                                                                                                                                                 | **Gap:** consider allowing a no-parameter model (shows R² of a given model, a common SAT check) instead of erroring                                                |
| D-22        | Undefined predictor/observation names                                                                 | Undefined names (even x₁, y₁, x₂) silently become parameters (`d1-03`, `e4-06`)                                                                                                                   | Spec should state explicitly that only names that no row defines **and that are not lists** are parameters, and that a missing column is an error, not a parameter |
| D-31        | R² always; r for linear and log-mode                                                                  | Matches. With n ≤ p or no data, Desmos shows **RMSE instead of R²**                                                                                                                               | Matches; add a test for the RMSE-only degenerate case if we keep R² undefined                                                                                      |
| D-32        | RMSE shown after R² and r on every fit                                                                | Desmos shows RMSE only in degenerate fits                                                                                                                                                         | Deliberate; fine                                                                                                                                                   |
| D-33        | "Plot residuals" control                                                                              | Button label is just "plot" beside eₖ; becomes a Zoom Fit icon; column greyed and read-only; residual points get a **new** colour, not the regression's colour                                    | **Gap:** D-33 says the regression's colour; Desmos uses a fresh colour so the residuals contrast with the curve. Decide; I recommend a distinct colour             |
| D-33        | eₖ lowest free k                                                                                      | eₖ is numbered per regression at creation (e₁, e₂ …) and exists before plotting                                                                                                                   | Matches; add "exists before plot" to the test                                                                                                                      |
| D-35        | Parameter sliders, "Adjusted model", "Refit data"                                                     | Not present in Desmos (parameters are plain read-only values)                                                                                                                                     | Karman addition; no parity reference                                                                                                                               |
| D-37        | Order: parameters, statistics, Log mode checkbox, Plot residuals, notes                               | Desmos order: math → **Log Mode checkbox first** → parameters → statistics / residuals side by side                                                                                               | **Gap:** move the Log mode checkbox above the parameters to match Desmos and the screenshots                                                                       |
| D-37        | Screen-reader string "Regression: m equals 600, …"                                                    | Desmos uses separate focusable fields in named regions plus "To access statistics, press Tab." on the row                                                                                         | Consider adding the regions and per-value focus in addition to our summary string                                                                                  |
| D-3         | Per-table "Add regression for table n" menu inserts a row below                                       | Desmos's table "Add Regression" embeds the regression **inside the table item** with a 9-model dropdown (adds Cubic, Quartic, Logistic, Sinusoidal) and an "Export to the expression list" action | Our menu has 6 models (adds Constant); fine for SAT. Note that Desmos export rounds to 6 significant digits, which is a pitfall to avoid                           |
| R-5 / NM-9  | Display rounding text-only                                                                            | Matches: m shows 3.13429 in results but 3.13428571429 when referenced, and the fit uses full precision                                                                                            | Matches                                                                                                                                                            |
| PR-30       | `\sim` once at top level                                                                              | Matches; a second clash case was not tested                                                                                                                                                       | —                                                                                                                                                                  |
| (none)      | Parameter name clash between two regressions                                                          | Both rows fit; only a reference to the shared name errors with "You've defined 'm' in more than one place…"                                                                                       | **Gap:** spec should define the clash rule (D-22/D-23 only covers the menu path)                                                                                   |
| (none)      | Name defined elsewhere                                                                                | `m = 3` removes m from the fitted set and refits the rest                                                                                                                                         | **Gap:** spec should state this explicitly (D-22 implies it via "names that no row defines") and test it                                                           |
| (none)      | Mismatched list lengths                                                                               | Truncate to shorter, no warning (matches FN-3)                                                                                                                                                    | Matches D-24 pairing                                                                                                                                               |

## Points of interest and coordinate labels

### Requirements

1. POI dots are drawn only for the selected row's curve(s); with no row selected no dots are drawn.
2. Selecting a row (clicking its row, focusing it, or clicking or tapping its curve) draws its curve heavier and shows its POIs as small grey dots without labels.
3. A single click or tap on a curve away from any POI selects that row and leaves no point or label behind.
4. Clicking or tapping a grey POI dot of the selected curve turns it into a larger dark dot and opens its `(x, y)` label beside it.
5. A click on a POI of an unselected curve only selects the curve; a second click opens the label.
6. Several POI labels can be open at once, and opening one never closes another.
7. Clicking or tapping an open POI dot again closes only that label.
8. Clicking or tapping empty graph paper closes all labels and deselects the row.
9. Focusing or editing a row, pressing zoom buttons, and panning close all open POI labels; zoom and pan keep the row selected.
10. Labels never persist across deselection: reselecting a curve shows grey dots only.
11. Coincident POIs (for example vertex and y-intercept, or a line's x- and y-intercept at the origin) are one dot with one label.
12. POI hit area is at least 12 px from the dot centre on a fine pointer and at least 10 px on touch; 16 px away is a miss.
13. A POI label is a light box with border and shadow placed diagonally off the dot on the side away from the curve, and labels avoid overlapping each other.
14. Integer and terminating values print exactly (`2`, `−0.5`, `0.8`) with a true minus sign and a leading zero below 1.
15. At the default view, non-terminating POI coordinates print with 5 decimals (`0.33333`, `1.41421`, `0.73205`), and zooming in adds decimals (`0.333333` at 8x) while zooming out does not drop below 5 decimals.
16. Pressing on a curve and dragging shows a curve-coloured trace dot with a live `(x, y)` label that has no export action.
17. During a trace, x is rounded to the pixel-scale precision of the view and y is f of that rounded x, shown to at most 5 decimals.
18. During a trace the dot stays on the curve at the nearest point even when the pointer leaves the curve.
19. On a fine pointer the trace snaps to a POI when within a couple of pixels and shows the POI's exact label.
20. Releasing a trace removes the trace dot and label and pins nothing.
21. A circle (implicit conic) gets its axis intercepts and its top and bottom points as POIs, and no leftmost or rightmost points.
22. Intersections with every other visible curve are POIs of the selected curve, and hidden rows contribute no intersections.
23. Escape does not dismiss open POI labels (Karman may choose to differ; see gaps).
24. Audio trace (Alt/Option+T or the keypad key) starts at a POI of the focused row and announces "Audio trace on" with the key help and the first point's kind and coordinates.
25. In audio trace, Page Down and Page Up move to the next and previous POI in x order and announce the kind ("Zero", "Intercept and Extremum", "Intersection with Expression 2") and coordinates.
26. In audio trace, past the last POI the announcement starts "No more points of interest" and the on-screen Next POI button is disabled.
27. In audio trace, Home and End jump to the curve's ends in view, Cmd/Ctrl+Up and Down switch expression, and Escape exits and returns focus to the row.
28. Open POI labels are exposed to assistive technology as text reading the coordinates.

### Gaps against the existing spec

| Spec ID                   | Spec says                                                                  | Desmos does                                                                                                                                                                                                 | Gap / action                                                                                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POI-1                     | POIs only for the focused row; hidden rows none                            | Same; also clicking a curve selects its row and thickens it (steps 3, 29)                                                                                                                                   | Add: clicking or tapping a curve focuses or selects its row; selected curve drawn heavier.                                                                                                                   |
| POI-2 table, implicit row | Implicit equations: extrema "none"                                         | Circle shows top and bottom (y-extrema), not left or right (step 22)                                                                                                                                        | Decide: copy Desmos (add top/bottom for implicit curves) or keep "none" and accept the difference.                                                                                                           |
| POI-4                     | Intersections with every other visible curve                               | Confirmed; hidden curves excluded (step 28)                                                                                                                                                                 | None.                                                                                                                                                                                                        |
| POI-7                     | Merge coincident POIs into one dot listing every kind                      | Confirmed: one dot; screen reader says "Intercept and Extremum" (steps 7, 32)                                                                                                                               | Use Desmos-style combined wording.                                                                                                                                                                           |
| POI-12                    | d = ceil(−log10 u) + 1 decimals; x²−2 root labels as 1.414 at default view | Desmos shows `1.41421` (5 decimals) at the default view, 6 at 8x zoom-in, still 5 at 8x zoom-out (steps 42-43)                                                                                              | Spec example contradicts Desmos; students will compare against Desmos-printed answers. Consider a floor of 5 decimals (or 6 significant digits) for POI labels and keep the zoom-based rule only for traces. |
| POI-13                    | Click or tap a dot shows `(x, y)`                                          | Also: toggle on re-click, many labels open, close on empty click, row focus, edit, zoom, pan; two-step on unselected curve; export-to-list button; dark selected dot (steps 4-15)                           | Spec is silent on all dismissal and multi-label rules; add them (requirements 5-10). Decide whether to offer an "add point to list" action.                                                                  |
| POI-14                    | Trace shows nearest curve point labelled by POI-12; snap within 8 px       | Trace x snapped to round pixel-precision value, y = exact f(x); snap observed at about 1.5 px, not at about 5 px, not on touch at under 1 px; nothing pinned on release; label flips side (steps 17-21, 48) | 8 px snap is larger than Desmos; label rule differs from POI-12. Specify trace rounding separately, no pin on release, and the snap radius (8 px is acceptable but not Desmos-identical).                    |
| POI-9                     | Recompute dots when pan or zoom settles                                    | Dots stay after zoom; labels close (step 14)                                                                                                                                                                | Add: pan or zoom closes open labels.                                                                                                                                                                         |
| KB-14                     | `[` and `]` step through POIs with the graph focused                       | Desmos uses Page Down / Page Up, only inside audio trace (step 35); outside trace there is no keyboard path to labels                                                                                       | Either add Page Up/Down as aliases or document the difference; consider keeping `[`/`]` outside audio trace (Karman is better here).                                                                         |
| A11Y-9                    | Activating a POI announces "x-intercept, 2, 0" matching the visible label  | Clicked labels are plain coordinate text with no kind; audio trace announces "Zero at X: 2. Y: 0." (steps 31, 35)                                                                                           | Karman's kind-first wording is richer; check terms ("Zero" vs "x-intercept", "Intercept and Extremum", "Intersection with Expression 2").                                                                    |
| A11Y-13                   | Left/Right move 1/50 of width (Shift 1/10); Escape or Alt+T stops          | Desmos steps 1/100 of width; Shift does nothing; Page Up/Down for POIs; Home/End; Cmd+Up/Down switches rows; start announcement includes key help; starts on a POI (steps 32-39)                            | Add POI jumps, Home/End, row switching, start-on-POI and "No more points of interest" to A11Y-13; step size is a design choice.                                                                              |
| AN-6                      | Labels fade 100 ms                                                         | Not measurable here (reduced motion was on)                                                                                                                                                                 | Unverified.                                                                                                                                                                                                  |
| K-9                       | Audio key disabled until Phase 4                                           | Desmos phone keypad's speaker key starts trace and swaps in a navigation panel (step 50)                                                                                                                    | Phase 4 design input: navigation panel layout (Point, Point of Interest, Curve, Describe).                                                                                                                   |
| (none)                    | —                                                                          | Escape does not close labels (step 10)                                                                                                                                                                      | Karman could close labels on Escape as a deliberate improvement; record the decision.                                                                                                                        |
| (none)                    | —                                                                          | Touch trace label sits below-right, under the finger's side (step 48)                                                                                                                                       | Consider raising the touch trace label above the finger.                                                                                                                                                     |

## Visual look: curves, grid, rows, typography

### Requirements

Graph

1. Curve stroke width 2.5 CSS px at Display size default (scaled by S-3), round joins, opaque slot colour.
2. Point marker: filled disc of 10 CSS px diameter (radius 5), no stroke, in slot colour.
3. Strict-inequality boundary dash 12 CSS px on / 6 CSS px off at 2.5 px weight; non-strict solid.
4. Curve slots in light skins: OKLCH lightness of all chromatic slots within a 0.10 band and chroma ≤ 0.17 (no neon);
   in dark skins chroma ≤ 0.14 so curves do not glow; every slot still meets TH-6 (5.95:1).
5. Include one neutral (near-text-colour, chroma < 0.03) slot among c1-c6, as Desmos's black, if TH-7 ΔE still holds.
6. Gridlines neutral (OKLCH chroma ≤ 0.02 relative to paper hue) and exactly 1 CSS px for minor and major.
7. Axis stroke 1.5 CSS px (not 2), in the `text` role.
8. Minor gridline pitch 20-30 CSS px at default view; majors every 4 or 5 minors.
9. Axis numbers sans 14 CSS px (spec says 13, see gaps) in `text`; every axis number has a 1.5 CSS px glyph-shaped halo
   in the paper colour, and labels never overlap an axis line.
   List
10. Unfocused rows show no field border, no background fill and no box around the math; rows are separated by a single
    1 CSS px rule in the field-boundary role.
11. Gutter 36-40 CSS px wide in the chrome role; row number at top left 11 CSS px; swatch a 22 CSS px filled disc in the
    slot colour with a glyph showing line/point/inequality style in the paper colour.
12. Focused row: the entire gutter column of that row fills with the focused-row colour (row number in its label
    colour, swatch unchanged), plus the L-3/TH-14 outline; the math area background stays the list colour.
13. Minimum row height 54 CSS px for single-line math; math at 18-20 CSS px with ≥12 CSS px left padding.
14. Evaluation result right-aligned on its own line below the math: muted "=" then the value in a small box
    (raised background, 1 px field-boundary border, 3 px radius); a list shows one box per element, then "…" after 30
    (NM-38). **Matched** (R-5; component and browser tests).
15. Warning marker replaces the swatch in the gutter (not an extra icon in the math area). **Matched** (R-2; component and
    browser tests).
16. Delete control is a quiet muted-colour × at the row's top right, visible on every row.
    Typography
17. Math in KaTeX serif with italic variables and upright digits/function names; all chrome (title bar, toolbar,
    menus, keypad word labels) in the sans UI font — never a serif title.
    Keypad
18. Two visual key tiers: letter/relation keys on the lighter key role, digits/operators on the darker key role,
    Enter on the accent; 1 px key border, 3-4 px radius, 4 px gaps.

### Gaps against the existing spec

- **L-3** says "filled left bar ... and a 2 px outline". Desmos fills the _whole gutter cell_ (38 px) rather than a thin
  bar, and its outline is 1 px. Spec does not say unfocused rows have no border/box, nor give gutter width, row
  height, row separators, swatch size or delete-× styling. Add requirements 10-13, 16.
- **TH-6** fixes c1 hue at 240-270 (blue) and maximises ΔE greedily with chroma up to 0.26; that tends to pick the most
  saturated in-gamut colours (the neon look of the owner screenshot). Desmos's pleasant look comes from capped chroma
  (≤0.17) and an even lightness band. Add an upper chroma cap and lightness band (req 4) and consider a neutral slot
  (req 5). Desmos rotates 5 colours; TH-10 has 6 slots — fine, but note the difference.
- **TH-6/10.3 targets** (5.85:1 curves) are stricter than Desmos (red 4.85, green 4.58), so Karman light-skin curves
  will be somewhat darker than Desmos; that is acceptable and keeps the same "mid-dark" character.
- **TH-8** shading at 1.15:1 is much fainter than Desmos (~1.77:1, 40% alpha). Deliberate for curve contrast, but the
  owner may perceive our fills as washed out; keep, but make sure the boundary stroke and dash do the work.
- **No stroke width, point size or dash pattern** anywhere in the spec (G-1 only says dashed vs solid). Add reqs 1-3.
- **Axis weight** is not specified (owner screenshot has 2 px cream axes, heavier than Desmos's 1.5 px). Add req 7.
- **TH-9** halo (3 px) applies to point labels only; axis numbers have no halo rule. Add req 9.
- **TH-17** axis numbers 13 px vs Desmos ≈14 px; math 18 px vs Desmos ≈19-20 px. Minor; consider 14/19.
- **TH-13** reverse contrast regenerates colours to 7:1, unlike Desmos's plain inversion — ours is better for
  contrast; no change, but note Desmos keeps curve identity only by complement hue, ours should keep hue (TH-10 slots).
- **K-6/SC-4** require 44x44 px phone keys; Desmos uses 31x36. Ours is intentionally larger; keep.
- **R-2** says warning marker in the gutter: matches Desmos. Founder decision 2026-10-18: match Desmos's marker (orange `#fa7e19` triangle replacing the swatch, black tooltip on hover, focus and tap). The earlier `reading` role at 7:1 no longer applies to the marker, which is a non-text icon held to 3:1 (WCAG 1.4.11): `#fa7e19` is 2.6:1 on a white list, so light skins darken it just enough to reach 3:1 and dark skins keep it unchanged. The tooltip text is white on black (21:1, above the 7:1 of TH-1).
