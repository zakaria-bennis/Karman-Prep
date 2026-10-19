# Karman calculator v2: functions and data

Part of the Karman calculator v2 design. Main overview:
[`../2026-10-16-karman-calculator-v2-design.md`](../2026-10-16-karman-calculator-v2-design.md).

## Purpose

This file defines what every function in the functions panel computes, and how tables and
regressions behave, so that each answer a student can get from v2 is fixed in advance and tested
against an independent reference value. It covers every K-4 category (the category list and order
are owned by `e-ux-keypad-accessibility-theme.md`; this file only defines the functions), including
the Complex category that K-4 places between Matrices and Advanced. It also covers the real-number and
complex-mode domain rules those functions depend on, table creation and editing (x₁/y₁ naming,
columns, point styles, table-from-function, paste, zoom fit, transferred tables) and regressions
(models, fit objective, solvers, automatic log mode, R² and r, RMSE, residuals, the constant model,
and v1's adjust and refit). IDs scheduled in Phases 1 to 3 are part of the switch-over gate in the
main overview. It resolves review findings F13, F14, F17 and C7.

## IDs defined here

- Shared function rules: FN-1 to FN-11 (tolerances in FN-11).
- Real and complex domains: FN-12 to FN-17.
- Trig and inverse trig: FN-18 to FN-22.
- Statistics: FN-23 to FN-33.
- List operations: FN-34 to FN-39.
- Visualizations: FN-40 to FN-44.
- Probability distributions: FN-45 to FN-52.
- Inference: FN-53 to FN-59.
- Calculus: FN-60 to FN-67.
- Hyperbolic trig: FN-68.
- Geometry: FN-69 to FN-71.
- Custom colors: FN-72 to FN-74.
- Number theory: FN-75 to FN-79.
- Matrices: FN-80 to FN-83.
- Complex: FN-84 to FN-87.
- Advanced: FN-88 to FN-90.
- Tables: D-1 and D-4 to D-21.
- Regressions: D-2, D-3 and D-22 to D-40.

## 1. How to read this file

- Each checklist line has the form "**ID** statement. (Phase N; verified by _type_ test)". When a
  rule still needs test-day confirmation, its statement ends with "(confirm by REA behaviour
  capture in Phase N)" before the final period.
- A rule marked "(confirm by REA behaviour capture in Phase N)" is a concrete Karman default
  written from general mathematical and UI knowledge. The lead confirms it against test-day
  behaviour (owner-authorised REA behaviour capture limited to timing and screenshots of visible
  behaviour, as the main overview section 10.4 defines) before that phase's tests are frozen. A
  rule without that mark is either a standard mathematical definition or a Karman convention that
  does not depend on test-day behaviour.
- Evidence for test-day behaviour is limited to: the College Board sheet SY2026-2027 (D2: no notes,
  folders or images; automatic log mode for applicable regressions), the approved radians default
  (D5), and the REA function-list observation of 2026-10-16 (category names and the functions in
  each). No numerical convention below is claimed to match test day without that mark being
  cleared.
- Cross-references: number display (R-5, NM-1 to NM-9) and the "undefined" text (NM-6), the
  colour and style picker (R-1, R-4), the keypad and K-4 panel, the scientific calculator (SC-),
  animation (AN-), screen reader output (A11Y-) and theme contrast (TH-) are in
  `e-ux-keypad-accessibility-theme.md`, except the NM- items, which are in `a-math-semantics.md`.
  Parsing, row classification, list rules, angle-unit exactness and graph sampling are in
  `a-math-semantics.md`. The public API and file layout are in
  `d-architecture-integration.md`. Transfer to Calculator is in `c-transfer.md`.
- "Undefined" means the evaluator's undefined value. "The list-length limit" is the a-math limit
  (10,000 elements).

## 2. Shared function rules

- **FN-1** Every function in this file has at least one evaluation test (or, for drawn objects, a rendering-geometry test) against a committed reference value, in addition to the K-4 panel-order test, and a function counts as delivered only when that test passes. (Phase 1; verified by unit test)
- **FN-2** Single-list functions without a second parameter (mean, median, min, max, stdev, stdevp, var, varp, mad, count, total, gcd, lcm) accept one list `f([1,2,3])`, a table column `f(x₁)`, or two or more comma-separated numbers or lists, which are concatenated in order into one list, so `mean(1,[2,3])` = 2. (Phase 2; verified by unit test)
- **FN-3** A function of scalars applied to a list returns the list of results element by element (`sin([0, π/2])` = `[0, 1]`), and functions of two or more lists pair elements by index over the shorter length, following the list rules in `a-math-semantics.md`. (Phase 2; verified by unit test)
- **FN-4** A function evaluated outside its stated domain returns undefined, which every row output, table cell and label shows as "undefined" (NM-6), never as NaN, Infinity or a JavaScript exception message; API values report it as API-9 and API-10 define. (Phase 1; verified by unit test)
- **FN-5** A single-list statistic over a list that contains an undefined element returns undefined (`mean([1, 0/0, 3])` is undefined), except count, which counts every element (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-6** Only circular-trig inputs and inverse-trig outputs depend on the angle unit (radians by default, D5); arg is in radians in both modes (NM-23, NM-25); every other function in this file, including hyperbolic functions, exp and the distributions, ignores it. (Phase 1; verified by unit test)
- **FN-7** random, shuffle and distribution sampling use a seeded xoshiro128\*\* generator: each mount and each setBlank() (per-question reset, R10) draws a fresh 32-bit seed from `crypto.getRandomValues`, each row's stream is derived from (question seed, row id, the row's re-randomize count) so editing one row never changes another row's values, and a test-only seed option on the KarmanCalculator constructor (`d-architecture-integration.md`) makes every value deterministic. (Phase 3; verified by unit test)
- **FN-8** A row whose value uses random, shuffle or distribution sampling shows a "Re-randomize" button (accessible name "Re-randomize row n") that increments that row's re-randomize count and re-evaluates the rows that depend on it (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by component test)
- **FN-9** Every function in the scientific calculator's function set (SC- IDs) evaluates with the definitions in this file by the end of Phase 2, even where this file schedules the rest of its category later. (Phase 2; verified by unit test)
- **FN-10** Reference values for statistics, distributions, inference, matrices, colour conversion and regression come from committed generator scripts (`scripts/calculator-v2/reference-values.py` using SciPy and NumPy, and `scripts/calculator-v2/reference-values.R` for inference), which write JSON fixtures to `src/lib/calculator-v2/core/lib/__fixtures__/reference/` with the library versions recorded in each file; CI reads only the JSON and never installs SciPy, NumPy or R; statistics fixtures are committed in Phase 2 and the other classes when their functions ship. (Phase 2; verified by unit test)
- **FN-11** Tests compare results with the tolerance table below; the operators and elementary functions of NM-43 use its relative 1e-13 (exact equality for the NM-4, NM-26 and NM-28 snapped values), Γ and factorial use NM-44's relative 1e-12, and any other function class not in the table uses relative error 1e-12 (absolute 1e-12 when the reference value is 0). (Phase 1; verified by unit test)

### Tolerances

| Function class                               | Tolerance                                          | Reference source                           |
| -------------------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| Descriptive statistics, corr, spearman       | relative 1e-12 (absolute 1e-12 at 0)               | NumPy, SciPy                               |
| pdf, cdf                                     | absolute 1e-10; relative 1e-8 below 1e-6           | SciPy                                      |
| inversecdf, continuous                       | relative 1e-9 (absolute 1e-9 at 0)                 | SciPy                                      |
| inversecdf discrete, nCr, nPr, gcd, lcm, mod | exact                                              | SciPy, closed form                         |
| Inference score, stderr, dof                 | relative 1e-10                                     | R `t.test`, `prop.test(correct = FALSE)`   |
| Inference p-values, interval bounds          | absolute 1e-9                                      | R                                          |
| d/dx with a symbolic rule                    | relative 1e-12                                     | closed form                                |
| d/dx by central difference                   | relative 1e-6                                      | closed form                                |
| Definite integral                            | relative 1e-8 (absolute 1e-10 at 0)                | SciPy `quad`, closed form                  |
| Σ, Π                                         | exact for integers below 2^53, else relative 1e-12 | closed form                                |
| Matrices with condition number below 1e6     | relative 1e-10                                     | NumPy                                      |
| Colour conversion                            | each sRGB channel within 1/255                     | published Oklab formulas                   |
| Linear-in-parameter regression               | relative 1e-9 (Norris, Pontius); 1e-6 (Longley)    | NIST StRD certified values                 |
| Nonlinear regression                         | relative 1e-6                                      | NIST StRD certified values                 |
| Log-mode regression                          | relative 1e-10                                     | ordinary least squares on transformed data |

### Answer-affecting conventions

| Choice                | Rule                                                                                 | ID           | Basis                              |
| --------------------- | ------------------------------------------------------------------------------------ | ------------ | ---------------------------------- |
| Sample or population  | var, stdev, cov use n − 1; varp, stdevp, covp use n                                  | FN-28, FN-30 | standard definition                |
| Quartiles             | median of halves, overall median excluded for odd n                                  | FN-26        | Karman default, confirm in Phase 2 |
| Quantile              | linear interpolation (type 7), as the legacy engine; the deployed v1 has no quantile | FN-27        | Karman default, confirm in Phase 2 |
| Box-plot whiskers     | min to max; 1.5·IQR only with "Exclude outliers"                                     | FN-43        | Karman default, confirm in Phase 3 |
| mad                   | mean absolute deviation from the mean                                                | FN-29        | Karman default, confirm in Phase 2 |
| spearman ties         | mid-ranks                                                                            | FN-32        | standard definition                |
| Histogram bins        | left-closed, multiples of w, default w = 1                                           | FN-40        | Karman default, confirm in Phase 3 |
| geodist support       | k = 1, 2, 3, …                                                                       | FN-46        | Karman default, confirm in Phase 3 |
| Discrete cdf bounds   | inclusive                                                                            | FN-48        | Karman default, confirm in Phase 3 |
| Discrete inversecdf   | smallest k with F(k) ≥ p                                                             | FN-49        | standard definition                |
| Two-sample t          | Welch, dof not rounded                                                               | FN-54        | Karman default, confirm in Phase 3 |
| Two-proportion z      | pooled p̂ for the test, unpooled for the interval                                     | FN-55, FN-58 | standard definition                |
| Alternative and level | two-sided, conf = 0.95                                                               | FN-58, FN-59 | Karman default, confirm in Phase 3 |
| Random                | seeded per question, reseeded by reset                                               | FN-7         | Karman convention                  |
| Log mode              | automatic for applicable forms                                                       | D-27 to D-30 | test day (College Board sheet)     |
| r display             | linear and log-mode fits only                                                        | D-31         | Karman convention                  |

## 3. Real and complex domains

These rules close F17. They apply to the operators and functions in this file; the evaluator in
`a-math-semantics.md` implements them for `^`, `/` and roots.

- **FN-12** With complex mode off, a negative base raised to a rational exponent follows NM-10 (odd q ≤ 99; rational form from the tree, or from the value within 4 ulp): `(-8)^{1/3}` = −2, `(-8)^{2/3}` = 4, `(-32)^{0.2}` = −2 (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **FN-13** With complex mode off, `\sqrt[n]{x}` (the ⁿ√ key) equals x^(1/n) under FN-12, so an odd root of a negative number is real (`\sqrt[3]{-8}` = −2), while an even root of a negative number, a negative base with any other exponent (`(-8)^{1/2}`, `(-8)^{\pi}`) and `\sqrt[0]{x}` are undefined. (Phase 1; verified by unit test)
- **FN-14** With complex mode off, x/0 is undefined for every x, 0^0 = 1, ln and log of a non-positive number are undefined, and any result whose magnitude exceeds the largest double (about 1.8×10^308) is undefined (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **FN-15** `y=x^{1/3}` and `y=x^{2/3}` paint at x = −4 (y ≈ −1.587401052 and y ≈ 2.519842100), and `y=x^{2/3}` and `y=\sqrt[3]{x^2}` paint identical pixels for −10 ≤ x ≤ 10 in the default view. (Phase 1; verified by visual test)
- **FN-16** With complex mode off, `i` is an ordinary name (NM-17): it gets an add-slider chip, and a row whose only undefined name is `i` also shows the R-2 hint "Turn on complex mode to use i." with a "Turn on complex mode" action (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by component test)
- **FN-17** With complex mode on, every function uses its principal branch (√z, Ln z with Arg in (−π, π], z^w = exp(w·Ln z)), except that a value real mode defines is unchanged (NM-19), so `(-8)^{1/3}` = −2 in both modes while `(-8)^{1/2}` = 2.82842712475i; numeric rows show a + bi; the graph plots a point only where the value is real (|Im| ≤ 1e-12·max(1, |Re|)); statistics, distributions, inference, tables, visualizations and regressions accept real values only and treat a non-real element as undefined (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)

## 4. Trig and inverse trig

- **FN-18** sin, cos and tan take their argument in the current angle unit (and, in complex mode, a complex argument in radians); tan is undefined wherever cos is exactly 0 after the exact angle reduction in `a-math-semantics.md` (`\tan(\pi/2)`, and `\tan(90)` in degrees). (Phase 1; verified by unit test)
- **FN-19** csc = 1/sin, sec = 1/cos and cot = cos/sin, each undefined where its denominator is exactly 0 after angle reduction, so cot(π/2) = 0 and cot(0) is undefined. (Phase 1; verified by unit test)
- **FN-20** arcsin has domain [−1, 1] and range [−π/2, π/2], arccos has domain [−1, 1] and range [0, π], arctan has range (−π/2, π/2); outputs are in the current angle unit (arcsin(1) = π/2 in radians and 90 in degrees), and `\sin^{-1}` and `\arcsin` name the same function (parsing in `a-math-semantics.md`). (Phase 1; verified by unit test)
- **FN-21** arccsc(x) = arcsin(1/x) and arcsec(x) = arccos(1/x), both defined for |x| ≥ 1; arccot(x) = π/2 − arctan(x), with range (0, π) and arccot(0) = π/2 (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **FN-22** arctan(y, x) with two arguments returns the angle of the point (x, y) in (−π, π] in the current angle unit (arctan(1, −1) = 3π/4), and arctan(0, 0) is undefined (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)

## 5. Statistics

- **FN-23** mean(L) = Σx/n, total(L) = Σx and count(L) = n; mean of an empty list is undefined, total([]) = 0 and count([]) = 0. (Phase 2; verified by unit test)
- **FN-24** median(L) is the middle value of the sorted list for odd n and the mean of the two middle values for even n (median([3, 1, 4, 2]) = 2.5); median([]) is undefined. (Phase 2; verified by unit test)
- **FN-25** min(L) and max(L) return the smallest and largest element, and are undefined for an empty list. (Phase 2; verified by unit test)
- **FN-26** quartile(L, k) for k ∈ {0, 1, 2, 3, 4} returns min, Q1, median, Q3 and max, where Q1 and Q3 are the medians of the lower and upper halves of the sorted list with the overall median excluded when n is odd (quartile([1..7], 1) = 2, quartile([1..8], 3) = 6.5); for n = 1 every quartile is the single value, and any other k is undefined (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **FN-27** quantile(L, p) for 0 ≤ p ≤ 1 uses linear interpolation between order statistics, h = (n − 1)p and result = x₍⌊h⌋₎ + (h − ⌊h⌋)(x₍⌊h⌋+1₎ − x₍⌊h⌋₎) with 0-based sorted values (Hyndman–Fan type 7, as the legacy engine `src/lib/calculator/math.ts:137-142`; the deployed v1 has no quantile), so quantile([1..7], 0.25) = 2.5 while quartile([1..7], 1) = 2; p outside [0, 1] is undefined (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **FN-28** var(L) and stdev(L) use the sample denominator n − 1 and are undefined for n < 2; varp(L) and stdevp(L) use n, are 0 for n = 1 and undefined for n = 0 (stdev([2,4,4,4,5,5,7,9]) = 2.138089935 and stdevp of the same list = 2). (Phase 2; verified by unit test)
- **FN-29** mad(L) is the mean absolute deviation from the mean, Σ|x − mean(L)|/n (mad([1,2,3,4,10]) = 2.4), undefined for an empty list (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **FN-30** cov(X, Y) = Σ(x − x̄)(y − ȳ)/(n − 1), undefined for n < 2, and covp(X, Y) uses n; pairs are formed by index over the shorter list (FN-3). (Phase 3; verified by unit test)
- **FN-31** corr(X, Y) is the Pearson correlation Σ(x − x̄)(y − ȳ)/√(Σ(x − x̄)²·Σ(y − ȳ)²), signed, never computed as √R², and undefined when n < 2 or either list has zero variance. (Phase 3; verified by unit test)
- **FN-32** spearman(X, Y) is the Pearson correlation of the ranks of X and the ranks of Y, with tied values given the mean of the ranks they span (spearman([1,2,2,3], [1,2,3,4]) = 0.9486832981). (Phase 3; verified by unit test)
- **FN-33** stats(L) returns the five-number summary [min, Q1, median, Q3, max] using FN-26 quartiles and displays it as a labelled row ("min 1, Q1 2, median 4, Q3 6, max 7"); indexing it with `[2]` returns Q1 (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)

## 6. List operations

- **FN-34** repeat(v, n) returns n copies of v, concatenating the elements when v is a list (repeat([1,2], 3) = [1,2,1,2,1,2]); n must be an integer ≥ 0 and the result within the list-length limit, otherwise undefined (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-35** join(A, B, …) concatenates any mix of numbers and lists in argument order (join(1, [2,3], 4) = [1,2,3,4]). (Phase 3; verified by unit test)
- **FN-36** sort(L) returns L in ascending order with undefined elements last; sort(L, K) reorders L by ascending keys K, pairing by index over the shorter length and keeping the original order for equal keys. (Phase 3; verified by unit test)
- **FN-37** shuffle(L) returns a random permutation of L from the row's seeded stream (FN-7), and shuffle(L, s) with an integer seed s returns the same permutation on every evaluation. (Phase 3; verified by unit test)
- **FN-38** unique(L) removes repeated values, keeping each value's first occurrence in the original order (unique([3,1,3,2,1]) = [3,1,2]); two values are repeats when they are equal as doubles. (Phase 3; verified by unit test)
- **FN-39** The `for` key inserts the list-comprehension operator, whose meaning (iteration order, nesting, length limit) is defined by PR-34, NM-35 and NM-37 in `a-math-semantics.md`; this file adds only the test that the key inserts it at the caret. (Phase 3; verified by component test)

## 7. Visualizations

- **FN-40** histogram(L, w) bins values into [k·w, (k + 1)·w), left-closed and aligned to integer multiples of w (default w = 1, w > 0, otherwise undefined), and draws one bar per non-empty bin with height equal to its count (histogram([0.5, 1, 1, 2.9]) has counts 1, 2, 1 on [0, 1), [1, 2), [2, 3)) (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-41** A histogram row's style menu offers bar heights count (default), relative frequency (count/n) and density (count/(n·w)); bars are outlined in the row colour and filled at the theme's region opacity (TH-), and hovering, focusing or tapping a bar shows a label with its bin and height ("[1, 2): 2") (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by component test)
- **FN-42** dotplot(L) draws one dot per value at x = value, stacking values that are equal at 10 significant digits so the k-th equal value is centred at y = k (k = 1, 2, …) (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-43** boxplot(L) draws a box from Q1 to Q3 with a median line (FN-26 quartiles) and whiskers to min and max, centred at y = 1 with height 1 (offset and height editable in the style menu); the style menu's "Exclude outliers" option draws values more than 1.5·IQR beyond the box as separate points and ends the whiskers at the most extreme remaining values (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-44** Visualization rows ignore undefined elements, draw nothing for an empty list, cannot be dragged, are excluded from points of interest, and append one sentence, after the A11Y-1 text, to the graph's accessible name giving the kind, n and its five-number summary (boxplot), bin width (histogram) or value count (dotplot). (Phase 3; verified by component test)

## 8. Probability distributions

| Constructor          | Defaults     | Valid parameters                | Support         |
| -------------------- | ------------ | ------------------------------- | --------------- |
| `normaldist(μ, σ)`   | μ = 0, σ = 1 | σ > 0                           | all reals       |
| `tdist(ν)`           | none         | ν > 0                           | all reals       |
| `chisqdist(k)`       | none         | k > 0                           | x ≥ 0           |
| `uniformdist(a, b)`  | a = 0, b = 1 | a < b                           | a ≤ x ≤ b       |
| `binomialdist(n, p)` | none         | integer n ≥ 0, 0 ≤ p ≤ 1        | k = 0, 1, …, n  |
| `poissondist(λ)`     | none         | λ > 0                           | k = 0, 1, 2, …  |
| `geodist(p)`         | none         | 0 < p ≤ 1                       | k = 1, 2, 3, …  |
| `discretedist(V, W)` | W all 1      | W ≥ 0, ΣW > 0, same length as V | the values in V |

- **FN-45** Each constructor accepts exactly the parameters in the table, fills omitted trailing parameters with the defaults shown, and for invalid parameters returns undefined with the row error "Check the distribution's parameters." (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-46** geodist(p) counts trials up to and including the first success, so pdf(geodist(p), k) = (1 − p)^(k − 1)·p for integers k ≥ 1 and 0 elsewhere (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-47** pdf(D, x) and `D.pdf(x)` return the density for a continuous D and the probability P(X = x) for a discrete D (0 at non-support points, including non-integers for integer-valued distributions); discretedist normalises W to sum 1 and adds the weights of repeated values. (Phase 3; verified by unit test)
- **FN-48** cdf(D, x) = P(X ≤ x) and cdf(D, a, b) = P(a ≤ X ≤ b), with both bounds inclusive for a discrete D (cdf(binomialdist(10, 0.5), 3, 5) = 0.568359375), ±∞ accepted as bounds, a > b giving 0, and `D.cdf(…)` equivalent (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-49** inversecdf(D, p) for a continuous D returns the x with cdf(D, x) = p for 0 < p < 1 and the support endpoint at p = 0 or 1 when it is finite (undefined when infinite); for a discrete D it returns the smallest support value k with cdf(D, k) ≥ p; p outside [0, 1] is undefined (inversecdf(normaldist(), 0.975) = 1.959963985). (Phase 3; verified by unit test)
- **FN-50** random() returns one uniform value in [0, 1), random(n) returns n of them, random(L) returns one element of L, random(L, n) returns n elements drawn with replacement, and random(D, n) or `D.random(n)` returns n samples of D (continuous by inversion of a uniform draw, discrete by FN-49); n must be an integer from 0 to the list-length limit, and an extra final integer argument seeds the call (random(5, 7) is reproducible) (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-51** mean, median, stdev and var applied to a distribution return its theoretical value (mean(binomialdist(10, 0.3)) = 3, stdev(binomialdist(10, 0.5)) = 1.58113883, median(uniformdist(2, 6)) = 4) (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-52** A row whose value is a distribution draws its pdf in the row colour (a curve when continuous, a point at each support value when discrete) and shows a "Find cumulative probability" toggle; when on, the row shows editable bounds (defaults: min −∞, max the distribution's mean), the value of cdf over those bounds, and shades that area (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by component test)

## 9. Inference

All tests use the data-list forms below. The null value, alternative and confidence level are
row settings that reset per question.

- **FN-53** ztest(L, σ) is the one-sample z test of the mean with known σ > 0: estimate x̄, stderr σ/√n, score (x̄ − μ₀)/stderr with null μ₀ = 0 by default; ztest(L1, L2, σ1, σ2) is the two-sample test with estimate x̄1 − x̄2, stderr √(σ1²/n1 + σ2²/n2) and null difference 0 by default (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-54** ttest(L) is the one-sample t test with s = stdev(L), stderr s/√n, dof n − 1 and n ≥ 2; ttest(L1, L2) is Welch's unpooled two-sample test with stderr √(s1²/n1 + s2²/n2) and the Welch–Satterthwaite dof, not rounded; a paired test is written ttest(L1 − L2) (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-55** zproptest(x, n) is the one-proportion z test with p̂ = x/n, stderr √(p₀(1 − p₀)/n) and null p₀ = 0.5 by default; zproptest(x1, n1, x2, n2) is the two-proportion test with the pooled p̂ = (x1 + x2)/(n1 + n2) and stderr √(p̂(1 − p̂)(1/n1 + 1/n2)); counts must be integers with 0 ≤ x ≤ n and n ≥ 1 (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-56** chisqtest(C1, …, Ck) takes k ≥ 2 equal-length lists of observed counts (the columns of an r × k table, r ≥ 2) or one matrix (FN-80), uses expected = row total × column total / grand total, score Σ(O − E)²/E and dof (r − 1)(k − 1), and is undefined if any expected count is 0; chisqgof(O, E) takes equal-length observed and expected lists (length ≥ 2), rescales E to the observed total and uses dof = length − 1 (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-57** Every test T exposes T.score, T.stderr, T.null, T.dof (undefined for z tests), T.pleft = P(S ≤ score), T.pright = P(S ≥ score) and T.p, the p-value for the selected alternative: min(1, 2·min(pleft, pright)) for "≠" (the default), pleft for "<" and pright for ">"; chi-square tests are always right-tailed. (Phase 3; verified by unit test)
- **FN-58** T.conf is the confidence level (default 0.95, 0 < conf < 1), T.estimate the point estimate, and T.lower and T.upper are estimate ∓ c·SE with c = Φ⁻¹((1 + conf)/2) for z procedures and the t quantile at the test's dof for t procedures; proportion intervals use the unpooled SE (√(p̂(1 − p̂)/n), or √(p̂1(1 − p̂1)/n1 + p̂2(1 − p̂2)/n2)), and chi-square tests have undefined estimate, lower and upper (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **FN-59** An inference row shows a null-value field, an alternative selector ("≠" default, "<", ">"), the score, p-value and dof, a small plot of the null distribution with the p-value tail or tails shaded, and an interval toggle that shows lower, upper and conf; the Add menu's inference item (S-2) inserts `ttest()` with the caret inside the parentheses (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by component test)

## 10. Calculus

exp, ln, log and logₐ ship in Phase 1 because typing (T-3) and v1 parity need them; the rest of the
category ships in Phase 4.

- **FN-60** exp(x) = e^x; ln(x) is the natural log and log(x) the base-10 log, both for x > 0; logₐ(x) = ln x / ln a for a > 0, a ≠ 1 and x > 0 (`\log_2(8)` = 3); in complex mode ln and log use the principal branch (FN-17). (Phase 1; verified by unit test)
- **FN-61** d/dx E is computed symbolically on the syntax tree with the sum, product, quotient, power and chain rules and the derivative of every elementary function in this file (trig, inverse trig, hyperbolic, exp, ln, log, logₐ, abs, square and nth roots), branch by branch for piecewise expressions, and is undefined where E is not differentiable (d/dx x³ at x = 2 is exactly 12; d/dx |x| at 0 is undefined); d/dt and other variables work the same way. (Phase 4; verified by unit test)
- **FN-62** floor, ceil, round, sign and mod have derivative 0 away from their jumps and undefined at them, cdf(D, x) has derivative pdf(D, x), and any other function without a symbolic rule is differentiated by a central difference with h = 6.06×10⁻⁶·max(1, |x|). (Phase 4; verified by unit test)
- **FN-63** f′(x) is d/dx f(x) for a one-argument user function f, and f′′(x) its second derivative; prime notation on a function of several arguments, or on a name that is not a function, is the error "Prime notation works on one-argument functions." (Phase 4; verified by unit test)
- **FN-64** `\int_a^b E\,dt` uses adaptive 7–15 point Gauss–Kronrod quadrature to relative tolerance 1e-10 with at most 2,000 subintervals, accepts infinite bounds through the substitution t = u/(1 − u²), returns −∫ from b to a when a > b, and is undefined when the estimate does not converge (∫₀¹ x² dx = 0.3333333333; ∫ e^(−x²) over all reals = 1.772453851). (Phase 4; verified by unit test)
- **FN-65** `\sum_{n=a}^{b} E` adds E for every integer n from a to b inclusive, is 0 when b < a, is undefined when a bound is not an integer, and is the error "Use at most 10,000 terms." when b − a + 1 exceeds 10,000 (confirm by REA behaviour capture in Phase 4). (Phase 4; verified by unit test)
- **FN-66** `\prod_{n=a}^{b} E` multiplies E for every integer n from a to b inclusive, is 1 when b < a, and has the same integer-bound and 10,000-term rules as FN-65 (confirm by REA behaviour capture in Phase 4). (Phase 4; verified by unit test)
- **FN-67** `y=\int_0^x e^{-t^2}dt` plots across a 1440 px wide graph in under 50 ms of plot-worker time on the desktop CI profile, because consecutive samples integrate only the interval added since the previous sample. (Phase 4; verified by perf test)

## 11. Hyperbolic trig

- **FN-68** sinh, cosh and tanh use their exponential definitions, csch = 1/sinh, sech = 1/cosh and coth = cosh/sinh (csch(0) and coth(0) undefined), none depend on the angle unit, and the typed inverses arcsinh (all reals), arccosh (x ≥ 1, result ≥ 0) and arctanh (|x| < 1) are accepted; arccsch(x) = arcsinh(1/x) for x ≠ 0, arcsech(x) = arccosh(1/x) for 0 < x ≤ 1 and arccoth(x) = arctanh(1/x) for |x| > 1, each also reached by `^{-1}` on csch, sech and coth (PR-26). (Phase 2; verified by unit test)
  - _Amended 2026-10-19 (appendix F decision 2, Desmos behaviour wins):_ the names are Desmos's (`arcsinh`, `arccosh`, `arctanh`, `arccsch`, `arcsech`, `arccoth`), sinh(1) = 1.1752011936438014 and arccosh(0.5) is undefined in real mode, as in Desmos. In complex mode arccosh, arctanh, arcsech and arccoth extend outside their real domains on the principal branch (arccosh(0.5) = (π/3)i), and every hyperbolic function takes complex arguments. No functions-panel entries ship yet; the names are typed.

## 12. Geometry

- **FN-69** polygon(P1, P2, …, Pn), polygon(list of points) and polygon(X, Y) with paired lists draw a closed polygon through the vertices in order, edged in the row's colour and line style and filled at the theme's region opacity (TH-); two vertices draw a segment, fewer than two or any undefined vertex is a row error, and self-intersecting polygons fill by the even-odd rule. (Phase 4; verified by visual test)
- **FN-70** distance(P, Q) = √((x_Q − x_P)² + (y_Q − y_P)²) (distance((1,2), (4,6)) = 5) and broadcasts over point lists. (Phase 4; verified by unit test)
- **FN-71** midpoint(P, Q) = ((x_P + x_Q)/2, (y_P + y_Q)/2), broadcasts over point lists, and plots as a point when it is a row's value. (Phase 4; verified by unit test)

## 13. Custom colors

- **FN-72** rgb(r, g, b) takes channels from 0 to 255 (clamped) and hsv(h, s, v) takes h in degrees (taken modulo 360) and s, v in [0, 1] (clamped); both return a colour value (rgb(255, 0, 0) is #ff0000, hsv(120, 1, 1) is #00ff00) and broadcast over lists to give a list of colours. (Phase 4; verified by unit test)
- **FN-73** okhsv(h, s, v), oklab(L, a, b) and oklch(L, C, h) follow the published Oklab, Oklch and Okhsv conversion formulas with h in degrees, clip colours outside the sRGB gamut channel by channel to [0, 1], and match the reference conversion within 1/255 per channel. (Phase 4; verified by unit test)
- **FN-74** A colour value can be stored in a variable (`c=rgb(20,120,200)`) and chosen by name in a row's colour picker (R-4), and a list of colours colours a list-valued row element by element; student-chosen colours keep their hue and chroma and are drawn with the TH-11 lightness adjustment, so every curve meets D9. (Phase 4; verified by component test)

## 14. Number theory

The ⁿ√ key follows FN-13. The functions in this section ship in Phase 2 because the scientific
calculator (SC-) uses them and v1 already offers floor, ceil and round.

- **FN-75** gcd and lcm take two or more integers or lists (FN-2) and work on absolute values: gcd(12, 18) = 6, lcm(4, 6) = 12, gcd(0, 0) = 0 and lcm(n, 0) = 0; any non-integer argument gives undefined. (Phase 2; verified by unit test)
- **FN-76** mod(a, b) = a − b·⌊a/b⌋, so the result has the sign of b (mod(−1, 3) = 2, mod(7, −3) = −2, mod(5.5, 2) = 1.5), and mod(a, 0) is undefined (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
  - _Amended 2026-10-19 (appendix F decision 2, Desmos behaviour wins):_ confirmed in Desmos: mod(−7, 3) = 2, mod(7, −3) = −2 and mod(5, 0) is undefined. It is computed through the exact fmod (`a % b`, plus b when the signs differ) rather than a − b·⌊a/b⌋.
- **FN-77** floor and ceil are the usual integer functions; round(x) rounds halves away from zero (round(2.5) = 3, round(−2.5) = −3); round(x, n) rounds to n decimal places for an integer n, deciding halves on the shortest decimal form of x (round(1.005, 2) = 1.01, round(1234, −2) = 1200); sign(x) is −1, 0 or 1 (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
  - _Amended 2026-10-19 (appendix F decision 2, Desmos behaviour wins):_ round follows Desmos (JavaScript `Math.round`): halves go toward +∞, so round(2.5) = 3 and round(−2.5) = −2. round(x, n) is Math.round(x·10^n)/10^n with n rounded to a whole number and allowed to be negative (round(1234, −2) = 1200, round(2.5, −1) = 0, round(2.5, 1.5) = 2.5); halves are decided on the binary value, so round(1.005, 2) = 1. sign(0) = 0. A complex argument is undefined. `abs(x)` is also a built-in (|x|, the modulus of a complex number).
- **FN-78** nPr(n, r) = n!/(n − r)! and nCr(n, r) = n!/(r!(n − r)!) for integers 0 ≤ r ≤ n, exact below 2^53 (nCr(52, 5) = 2598960); r > n gives 0, and negative or non-integer arguments give undefined (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
  - _Amended 2026-10-19 (appendix F decision 2, Desmos behaviour wins):_ nCr and nPr follow the Γ generalisation, nCr(n, r) = Γ(n+1)/(Γ(r+1)Γ(n−r+1)) and nPr(n, r) = Γ(n+1)/Γ(n−r+1), with a pole in the denominator giving 0: nCr(5.5, 2) = 12.375, nCr(5, 2.5) ≈ 10.864977448406723, nCr(−1, 2) = 1, nCr(5, −1) = 0, nCr(2, 5) = 0 and nPr(5, 6) = 0. A whole r ≥ 0 uses the exact multiplicative product, so integer results below 2^53 stay exact.
- **FN-79** x! = Γ(x + 1) for real x (5! = 120, (1/2)! = 0.8862269255), undefined at negative integers and when the result overflows (FN-14) (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
  - _Amended 2026-10-19 (appendix F decision 2, Desmos behaviour wins):_ confirmed in Desmos: 0! = 1, 2.5! = 3.323350970447842, (−2.5)! = 2.363271801207355, (−1)! is undefined, 170! = 7.257415615307999e306 and 171! is undefined. Whole factorials up to 170! are the correctly rounded exact products; other arguments use Lanczos (g = 607/128) with reflection below ½. A complex argument is undefined.

## 15. Matrices

- **FN-80** A matrix literal is written `[a,b;c,d]`, with commas between entries, semicolons between rows, equal row lengths, 1 to 20 rows and columns and real entries; the Matrix key inserts an empty 2 × 2 literal, the `;` key inserts a row separator, a matrix value displays as a bracketed grid rendered with KaTeX, and the `#` key seen in the observed public panel is absent (confirm by REA behaviour capture in Phase 4). (Phase 4; verified by component test)
- **FN-81** A + B and A − B need equal sizes; scalar·A multiplies every entry; A·B (explicit or implicit) needs columns(A) = rows(B); A^n for integer n needs square A (A^0 = I, negative n uses the inverse, undefined when singular); transpose(A) is the transpose, inserted by the K-4 transpose key (`A^{T}` is A to the power T under PR-19); a size mismatch is the error "Matrix sizes do not match." (Phase 4; verified by unit test)
- **FN-82** det(A) is computed by LU decomposition with partial pivoting (det([1,2;3,4]) = −2) and trace(A) is the sum of the diagonal; both need a square A and are undefined otherwise. (Phase 4; verified by unit test)
- **FN-83** rref(A) is the reduced row echelon form by Gauss–Jordan elimination with partial pivoting, treating |v| ≤ 1e-10·max|A| as 0 (rref([1,2;2,4]) = [1,2;0,0]); rank(A) is the number of non-zero rows of rref(A); rows(A) and columns(A) return the dimensions. (Phase 4; verified by unit test)

## 16. Complex

- **FN-84** real, imag, conj and arg make up the Complex category, which K-4 places between Matrices and Advanced (owner order, R3); the category is a Karman addition (the 2026-10-16 function-list observation showed no Complex heading), complex mode itself stays the S-1 settings toggle, and the PR-12 allowlist assigns these four names to that category. (Phase 4; verified by unit test)
- **FN-85** real(z) and imag(z) return the real and imaginary parts (real(3 − 4i) = 3, imag(3 − 4i) = −4); with complex mode off they accept real arguments, with real(x) = x and imag(x) = 0. (Phase 4; verified by unit test)
- **FN-86** conj(a + bi) = a − bi (conj(3 − 4i) = 3 + 4i), and conj(x) = x for real x in either mode. (Phase 4; verified by unit test)
- **FN-87** arg(z) is the principal argument atan2(Im z, Re z) in (−π, π] in both angle modes (NM-23) (arg(−1) = π, arg(i) = π/2), and arg(0) = 0; the modulus of z is |z| from the absolute-value key (confirm by REA behaviour capture in Phase 4). (Phase 4; verified by unit test)

## 17. Advanced

- **FN-88** tone(f, g) is a tone with frequency f in hertz (20 ≤ f ≤ 20,000, otherwise undefined) and gain g (default 1) clamped to [0, 1], and lists give one tone per element; the row shows the A11Y-14 Play/Stop toggle, sound starts only when that button is pressed (never on load or edit), and it stops when the row is hidden or deleted, the calculator closes, or setBlank() runs. (Phase 4; verified by component test)
- **FN-89** `E with v=A, w=B` evaluates E with v bound to A and w bound to B for that row only (`x^2 with x=3` is 9; `a+b with a=[1,2], b=10` is [11, 12]); A and B are evaluated in the row's outer scope, `with` has the lowest precedence, and the bound names stay undefined elsewhere. (Phase 4; verified by unit test)
- **FN-90** In piecewise conditions, domain restrictions and inequality rows, `A and B` holds when both hold and `A or B` when either holds, with `and` binding tighter than `or`; `y=x^2\{x<-1 or x>1\}` draws only |x| > 1, and an inequality row joined by and or or shades the intersection or union of the regions (confirm by REA behaviour capture in Phase 4). (Phase 4; verified by unit test)

## 18. Tables

Tables keep every v1 table capability (section 20) and add the editing rules C7 asked for. A cell
is a small math field, not a native input, so the Karman keypad (K-2) works in tables exactly as
in rows.

- **D-1** Tables with x₁, y₁ columns, extra columns, point styles and table-from-function, as detailed in D-4 to D-21. (Parity; verified by browser test)
- **D-4** A new table, whether from the Add menu, typing, paste or Transfer to Calculator, names its columns by the rule of TR-25: the first column xₙ and the others yₙ to yₙ₊ₖ₋₁, with the lowest n ≥ 1 for which every one of those names is unused (not defined by any row, not a column header and not referenced by any row), so the first two-column table is x₁, y₁ and naming never fails. (Phase 3; verified by unit test)
- **D-5** A table from the Add menu (S-2; it replaces the active row when that row is an empty expression, S-12), or from typing `table` into an empty row (the row becomes a table as soon as its entire LaTeX is the five letters `table`, on the final `e`, before PR-13 analysis is shown; any other word stays math), has headers xₙ and yₙ, no data rows and focus in the first cell of its blank row; every table always shows exactly one blank row below its data rows (appendix F 22: one, not the two empty body rows the reference shows), typing into it makes it a data row and adds a new blank row, and while a cell or header has focus one blank header slot named "New column header" shows to the right of the last column, until the table holds MAX_TABLE_COLUMNS columns. (Phase 3; verified by component test)
- **D-6** Each cell is a MathField (the same adapter, typing rules T-1 to T-5 and keypad as rows, with the phone keyboard suppressed while the keypad is open, K-2) that accepts any expression evaluating to a real number from numbers, constants and variables defined in other rows (`1/3`, `-2.5`, `\sqrt{2}`, `\pi/4`, `a`), shows the math as typed, holds at most 128 characters, and shows a warning marker at its left, with the message in a hover, focus and tap tooltip (R-2) and `aria-invalid` and `aria-describedby` on the cell's field, when it cannot be evaluated: "Too many variables. Try defining 'a'." for an undefined name, "Points are written like this: (1, 2)." for a comma, "A cell can't use its own table's columns." for its own columns, and the row parse messages otherwise; such a cell is an undefined element and the rest of its column still works (appendix F). (Parity; verified by component test)
- **D-7** In a cell, Enter moves to the same column in the next row (creating a row from the blank row), and Enter in the blank row leaves the table for the next list item, or a new empty expression when the table is last; Tab and Shift+Tab walk the headers and then the cells row by row, wrapping between rows and skipping the blank header slot and computed cells, and past either end Tab leaves the table as usual; ArrowUp and ArrowDown move to the cell above or below, ArrowUp from row 1 enters the column header, ArrowUp from a header leaves for the previous list item and ArrowDown from the blank row for the next; ArrowLeft and ArrowRight move the caret and cross into the neighbouring cell only at the caret's edge; Tab or ArrowRight inside a fraction, radical or exponent first leaves that structure and stays in the cell; a cell entered by Enter, Tab or ArrowUp or ArrowDown has its content selected, so typing replaces it; Backspace in an empty cell moves up the same column (from row 1 to the header) and is defined further in D-8 and D-9. Shift+Enter is not bound in cells (appendix F did not observe it). (Phase 3; verified by component test)
- **D-8** Rows are added from the blank row, by Enter on the last data row, or with the "Add row to table n" button (v1 "Add data row", `karman-calculator/lib/extras.js:197-207`), which focuses the first cell of the blank row; each data row has a "Delete table n row k" control shown on hover or focus and always on touch, which deletes the row as one undo step (appendix F: these controls go beyond the reference, for touch and assistive technology); as in the reference, Backspace in an empty cell of a wholly empty data row deletes that row and selects the cell above, Backspace in the blank row selects the same column of the last data row, and Backspace in an empty expression row directly below a table deletes that row and enters the table's blank row; clearing every cell of an interior row leaves the empty row in place until it is deleted; a table holds at most 1,000 data rows, and at the limit the Add row button is disabled, typing in the blank row is refused and the status message "Tables hold up to 1,000 rows." is announced. (Phase 3; verified by component test)
- **D-9** Typing a header into the blank header slot adds a column in place, the slot's field becoming the new header with focus kept and a new slot following it (at most 10 columns per table; the slot is not shown at 10); a new data column takes the next palette colour; Backspace in an empty header moves to the previous header and never deletes a column or its data (appendix F: the reference has no column delete); "Delete column" is in each later column's D-12 style menu, as is "Add regression for table n", which opens the D-3 model menu and is also the D-3 control on L-1 with a fine pointer (K-8); the first column has no delete, and the whole table is deleted with its row delete control (R-3). (Phase 3; verified by component test)
- **D-10** The first column header must be a variable name (x₁, t, n; one letter with an optional subscript, as PR-11 defines; x and y name a column but define no list), else it warns "The first column needs a name, such as x₁."; each later header is either a new variable name (a data column with entered cells), the name of a list an expression row or regression defines (a computed column showing that list, as the residual column of D-33 appears), or an expression in the first column's variable (`2x_1`, `x_1^2`, `f(x_1)`), which makes a computed column whose read-only cells show computed values row by row; a name another table also defines warns "You've defined '{name}' in more than one place. Try deleting some of the definitions of '{name}'." (RC-7) on both headers; changing a data column's header to an expression makes it computed (undoable, D-20): its typed values are kept, unshown, and return if the header becomes a name again, so nothing is lost and nothing extra is announced (appendix F: the reference discards them); Enter in a header moves to that column's row 1 cell (D-7). (Parity; verified by unit test)
- **D-11** Each variable or data column is a list named by its header and usable in any row (`y_1` alone shows the list); trailing blank cells are not part of the list, an interior blank or invalid cell is an undefined element (FN-5), every later column is plotted as points against the first column, skipping pairs with an undefined value, and a column with an empty header is not plotted and keeps its data. (Parity; verified by unit test)
- **D-12** Each later column has a colour and style tab in its header, a button named "Points for header" with aria-pressed: activating it shows or hides the column's points, and its icon shows an empty outline while they are hidden; a long-press, a right-click, Shift+F10 or the ContextMenu key opens the column's style menu (a dialog "Style for header") with Show points (default on), point style filled circle (default), open circle or cross, "Connect points" lines (off by default, joining the points in row order) with solid (default), dashed or dotted style, the six palette colours, and Delete column (D-9); Escape closes it (KB-3) and returns focus to the tab, and each change is one undo step (D-20). Point size, opacity and drag mode (appendix F lists them) stay open for Phase 4. (Phase 3; verified by component test)
- **D-13** For a row `y=E(x)` or `f(x)=E`, the row's menu (a menu "Options for expression n", opened by a long-press on the gutter tab or by a right-click, Shift+F10 or the ContextMenu key anywhere on the row; R-4's style picker joins it in Phase 2; a row with nothing to offer keeps the browser's own menu) offers "Create table", which inserts below the row, as one undo step, a table whose first column xₙ (D-4) holds −2, −1, 0, 1, 2 and whose second column is the computed column E(xₙ) (headed f(xₙ) for a named function), plotted in the function row's colour; editing the x cells recomputes the second column; focus selects the first x cell and a toast "Table created." with an Undo action shows for 6 s and is announced as "Table created. Undo is available." (appendix F). Deliberate difference: the first column is xₙ, not the expression's own x, so it never clashes with the graph variable. (Phase 3; verified by component test)
- **D-14** Pasting text with tabs or line breaks into a cell fills the table from that cell rightward and downward, adding rows and columns within the D-8 and D-9 limits; CSV, TSV and HTML-table input uses the AR-14 extractor in `src/lib/calculator-transfer/clipboard.ts` (quoted fields, a header row of names dropped, the KaTeX `application/x-tex` annotation read once), every value is validated as a cell (D-6), and an invalid value or exceeded limit rejects the whole paste with one status message. (Phase 3; verified by component test)
- **D-15** The calculator's paste button, given tabular text or an HTML table, creates a new table named by D-4 with the D-14 parser and validation (up to 10 columns), replacing nothing; this deliberately replaces v1's single imported table that each paste overwrote (`src/components/calculator/CalculatorShell.tsx:255`) and v1's two-column limit. (Phase 3; verified by browser test)
- **D-16** Each table has a "Zoom to fit table n" control below its grid, beside "Add row to table n", that moves the view to the bounding box of the table's plotted points widened by 10% of each axis span on every side, using value ± max(1, 0.1·|value|) on an axis whose span is 0, which makes Home available (AN-8); it is aria-disabled while nothing is plotted. It moves the view as Zoom in, Zoom out and Home do: over 400 ms with ease-standard once AN-7's animation lands (instant under AN-13), and at once until then, as those controls are today. Rows holding a point list get the same control ("Zoom to fit row n") when user-typed lists arrive (lists are internal in this phase). Deleting a table with its row delete control leaves an empty expression row with the caret, and Undo restores the table with its data (appendix F 32). (Phase 3; verified by component test and browser test)
- **D-17** When a paste or a Transfer to Calculator adds points (a new table, point rows or a point list, or Table row appends to an existing point table, TR-34 and TR-39) and none of the added points lies inside the current graphpaperBounds, the calculator fits the view once to the bounding box of the added points by the D-16 rule; if any added point is visible the view is unchanged, an Evaluate transfer adds no points and never changes the view, and the per-question reset restores the default view. (Phase 3; verified by browser test)
- **D-18** A transferred table is an ordinary table: every cell, header, row and column is editable and deletable, statistics and regressions use it like a typed table, it keeps the transfer's source id only for the repeat-transfer rule in `c-transfer.md`, and the per-question reset removes it (R10). (Phase 3; verified by browser test)
- **D-19** A table is a grid named "Table n, k columns, m rows"; each entered cell is a textbox named "header, row r" with the header read as written (for example "x₁, row 3", as v1 `karman-calculator/lib/extras.js:161`, and "x₁ squared" for x₁²), and an empty cell, the blank row's included, adds ", blank" ("y₁, row 4, blank"; appendix F: the reference leaves empty cells unnamed); headers are textboxes named "Column j header"; a computed cell is a read-only gridcell named "header, row r, computed, value"; row and column controls use the names in D-8, D-9 and D-16. (Phase 3; verified by component test)
- **D-20** Each committed cell edit, row or column change, paste and table creation is one undo step for the list's Undo and Redo controls. (Phase 3; verified by component test)
- **D-21** A 1,000-row table renders only its visible cells, and a single cell edit updates the plotted points within 50 ms on the desktop CI profile and within 150 ms on the 4× CPU-throttled mobile profile. (Phase 3; verified by perf test)
- **D-41** With the on-screen keypad (K-1), a table's keys edit the cell or header that last had focus, each key one keypad edit of that cell (K-10, D-20); the keypad's ← and → move the caret and cross into the neighbouring cell at the caret's edge as hardware arrows do (D-7), its Enter moves down the column (D-7), and keypad keys always reach an editable cell, never the blank header slot: with the slot or a removed cell last focused they edit the first cell of the blank row (appendix F: the reference closes its keypad on the slot). (Phase 3; verified by component test and browser test)
- **D-42** On narrow lists (390 px phones), every table column keeps its width (96 px) and a table wider than the list scrolls sideways inside its own item, never the page or the list (L-1); the focused cell is scrolled into view. (Phase 3; verified by browser test)

## 19. Regressions

CB-2 (main overview) is met by D-27 to D-30. Fits run in `core/regression/`
(`d-architecture-integration.md`).

- **D-2** `~` regressions (linear, quadratic, exponential, logarithmic, power, constant and custom models) showing parameters, R², r where defined, RMSE and residuals, with CB-2 log mode, as detailed in D-3 and D-22 to D-40. (Phase 3; verified by browser test)
- **D-3** Each table has a compact "Add regression for table n" control in its footer, beside Add row and Zoom to fit, and each later column's style menu (D-12) has "Add regression"; one tap inserts below the table the linear regression `y ~ m x + b` written with the table's first column and that column (the first data column from the footer), with parameter names by D-23, already fitted and focused, so a phone user reaches a fitted linear regression in 1 tap from any table (appendix F: the reference inserts a linear fit at once; v1's six-model chooser, `karman-calculator/lib/extras.js:208-225`, is not carried over, and other models are typed with `~`). (Phase 3; verified by component test and browser test)
- **D-22** A regression row is `L ~ M`, where L evaluates to a list of observations (a column such as y₁, or any list of up to the list-length limit) and M reads one or more predictor lists: table columns, or rows that define a list (`x_{1}=[1...10]` or `y_{1}=2x_{1}`), which fit exactly as the same table would; every name of M that no expression row or table data column defines, other than x and y, is a parameter (0 to 8, in order of appearance in M), fitted and then defined for other rows; a name another row defines is a constant in the fit (appendix F 18), and a row with no parameter is valid and shows R² of the model as given (appendix F: the reference allows it). A scalar L is the error "Regression needs a list of data.", using x or y as the predictor is "Use the table column, such as x₁, not x.", and more than 8 parameters is "A regression can fit at most 8 parameters.". (Phase 3; verified by unit test)
- **D-23** The D-3 menu names parameters m, b, a and c unless a name is already defined by a row or used as a table column header, in which case every parameter of the inserted model takes the lowest free numeric subscript (m₁, b₁). (Phase 3; verified by unit test)
- **D-44** Two regressions may fit the same parameter name; each fits its own value, and only a row that references the shared name shows the error "m has more than one definition." (RC-7's message; appendix F observed the reference doing the same with its own wording). (Phase 3; verified by unit test)
- **D-24** Observations pair L with the predictor lists by index over the shortest length (FN-3); a blank or non-numeric element in any used list, or a model undefined for the data, fails the whole fit with the row error "We couldn't find any region where this model is defined." in place of results, and fewer usable pairs than parameters is not an error: the fit is exact (minimum-norm where underdetermined, D-26) and RMSE replaces R² (D-32), as Desmos does (appendix F decision 2). (Parity; verified by unit test)
- **D-25** Outside log mode the fit minimises SSE = Σ(yᵢ − M(xᵢ))² in original units: a model affine in its parameters (detected symbolically) is solved directly by column-scaled Householder QR, and any other model by Levenberg–Marquardt with Jacobians by central differences (step 6.06×10⁻⁶·max(1, |p|) per parameter) until FN-61 ships in Phase 4, and symbolic Jacobians where FN-61 rules exist from then on, with the D-39 tolerances unchanged, started from {1, 0.1, −1, 0, 10} for every parameter (v1, `karman-calculator/lib/regression.js:65`) and also from the log-mode solution for a log-mode form, with at most 200 iterations per start, stopping when the relative SSE change is below 1e-12 or the relative step below 1e-10. (Phase 3; verified by unit test)
- **D-26** A nonlinear fit whose best start did not meet the stopping test is labelled "Approximate fit"; rank-deficient data (a design or Jacobian whose scaled singular values fall below 10⁻¹² of the largest, such as `y_1 ~ a b x_1` or a quadratic through two points) fit silently with the minimum-norm solution, as Desmos does (appendix F decision 2). (Parity; verified by unit test)
- **D-27** Log mode applies automatically when, after normalising parameter order, multiplication and notation on the syntax tree, M is a·b^x, a·c^(bx) or c^(mx + k) with a numeric base c > 0 and c ≠ 1, a·e^(bx) or a·exp(bx), a·x^b, or a + b·ln x, where x is the single predictor list and a, b, m, k are parameters (the forms of `src/lib/calculator/log-regression.ts:15-23`, matched structurally instead of by regular expression). (Phase 3; verified by unit test)
- **D-28** Log mode needs every used observation to have y > 0 for the exponential forms, x > 0 and y > 0 for the power form and x > 0 for the logarithmic form; when one fails, the Log mode checkbox is not shown and the row is fitted by D-25 in original units, with no note (appendix F: Desmos hides the checkbox silently). (Parity; verified by unit test)
- **D-29** In log mode the parameters come from ordinary least squares on the transformed data (ln y on x, ln y on ln x, or y on ln x) mapped back (a·b^x: a = e^intercept, b = e^slope; c^(mx + k): m = slope/ln c, k = intercept/ln c), R² and r are computed on the transformed data, residuals stay in original units, and the statistics keep the heading "Statistics" (the checked box and the appearance of r are the cue, as in Desmos). (Parity; verified by unit test)
- **D-30** A row where log mode applies shows a "Log mode" checkbox, unchecked by default (owner decision of 2026-10-18: Desmos parity replaces CB-2's checked default); checking it refits by D-29 and adds r, unchecking refits by D-25 in original units, and the per-question reset restores the default. (Parity; verified by component test)
- **D-31** Every fit shows R² = 1 − SSE/SST with SST = Σ(y − ȳ)² over the used observations (undefined when SST = 0 or there are no more observations than parameters, D-32; negative values shown as computed); the signed Pearson r, never √R², is shown only for a linear fit (one predictor, model affine in it with a free intercept, in any parameter names or order) and for a log-mode fit, replacing v1's raw-data r on every model (`karman-calculator/lib/extras.js:309`) as `docs/enhanced-quiz-engine.md:92` requires. (Parity; verified by unit test)
- **D-32** RMSE = √(SSE/n) in original units over the n used observations is shown only when R² is undefined (n ≤ number of parameters, or SST = 0), in R²'s place, as Desmos does; otherwise no RMSE is shown (appendix F decision 2 replaces v1's RMSE on every fit). (Parity; verified by component test)
- **D-33** Each regression defines its residual list eₖ (the lowest k no row or table data column defines, in row order) before any plotting, as y − ŷ in original units, a list usable in other rows that follows the data and parameters; its "Plot residuals" control adds eₖ to the table the observations come from as a read-only computed column in the palette colour after the regression's, plotted against the first column, as one undo step, and is not shown once that column exists or when the observations are not a table column. (Phase 3; verified by component test)
- **D-34** The constant model `y_1 ~ b` fits b = the mean of the used y values and shows R² = 0 when SST > 0 (undefined when SST = 0), no r, and RMSE equal to the population standard deviation of y (v1 parity, `karman-calculator/README.md:32`). (Phase 3; verified by unit test)
- **D-35** Removed by appendix F: the reference shows no parameter sliders on a regression, and the v1 sliders (`karman-calculator/lib/extras.js:312-317`) are not carried into calculator v2. A row such as `m=2` with a slider (Phase 2 sliders) is the way to explore a model by hand. (Not planned)
- **D-36** A single-predictor fit draws M with the fitted parameters as a curve in x in the regression row's colour (hidden with the row's colour tab, R-1); a multi-predictor fit draws no curve. (Phase 3; verified by visual test)
- **D-37** A regression row shows, in this order (appendix F): the Log mode checkbox when log mode applies, "Regression parameters" with each parameter as "name = value", then "Statistics" (R² or RMSE in its place, and r when defined) and "Residuals" (eₖ and Plot residuals) side by side, wrapping onto two lines on narrow lists, and "Approximate fit" when Levenberg–Marquardt did not converge; a failed fit shows only the row error. Every value is a focusable read-only field named as it is read ("m equals 600", "b equals negative 1164000", "R squared equals 1"), so Tab visits each in order; the row's textbox is named "Expression n. Has graph and regression. To access statistics, press Tab." while it has a fit. (Phase 3; verified by component test)
- **D-38** A fit over 1,000 observations with 8 parameters completes within 100 ms on the desktop CI profile and within 300 ms on the 4× CPU-throttled mobile profile. (Phase 3; verified by perf test)
- **D-39** The regression corpus passes within the tolerance table: NIST Norris end to end through the KarmanCalculator API (a table plus a `y_1 ~ m x_1 + b` row, parameters read back with HelperExpression), NIST Pontius through the QR path, NIST Longley (six predictors) through the QR path, NIST Misra1a, Chwirut2 and Thurber through the core Levenberg–Marquardt API from NIST's certified start 1 values with log mode off, a log-mode fixture whose linearised and original-unit fits differ (asserting parameters, transformed R² and r, and original-unit residuals), and a data set with one non-positive y that falls back with the D-28 note. (Phase 3; verified by unit test) Parity increment: NIST Longley and the three nonlinear sets ship as fixtures (`src/lib/calculator-v2/regression/__fixtures__/nist.ts`); Norris and Pontius join when their files can be fetched.
- **D-40** On desktop Chromium and iPhone WebKit, a student enters, then separately pastes, the table 1990, 2000, 2010, 2020 against 30,000, 36,000, 42,000, 48,000, adds `y_1 ~ m x_1 + b` both by the D-3 control and by typing `~`, sees m = 600, b = −1164000, R² = 1 and r = 1, presses "Zoom to fit table 1" and finds all four points inside graphpaperBounds, and after transferring the same table from a fixture question finds every transferred point inside graphpaperBounds (D-17). (Phase 3; verified by browser test)
- **D-45** Regression results show each parameter at 6 significant digits and R² and r at 4 decimals, trailing zeros trimmed (2.02, 3.13429, 0.0267857; R² = 1); a parameter typed in another row has its full value (NM-1, 12 significant digits), and the fit itself always uses full precision. (Parity; verified by unit test)
- **D-46** A regression refits on every keystroke in its row and every committed cell edit of the lists it reads, in the same values pass as everything else, with no submit or refit control (appendix F: the reference fits live). (Phase 3; verified by unit test)

## 20. v1 parity for tables and regressions

The main overview's V1- inventory can cite these rows. Evidence is the deployed v1 runtime in
`karman-calculator/` and its tests in `tests/calculator/`.

| v1 capability                                                          | Evidence                                 | v2 ID                             |
| ---------------------------------------------------------------------- | ---------------------------------------- | --------------------------------- |
| Add table with x₁, y₁                                                  | `tests/calculator/standalone.spec.ts:40` | D-4, D-5                          |
| Add data row, 1,000-row cap                                            | `extras.js:197-207`                      | D-8                               |
| Per-row delete                                                         | `extras.js:179-190`                      | D-8                               |
| Cell labels "x1 row 3"                                                 | `extras.js:161`                          | D-19                              |
| Multi-row paste into a cell                                            | `extras.js:170-176`                      | D-14                              |
| CSV, TSV and HTML table paste, header dropped                          | `src/lib/calculator/paste.ts:130-226`    | D-14, D-15                        |
| Model chooser and Add regression                                       | `extras.js:208-225`                      | D-3                               |
| Linear, quadratic, exponential, constant models                        | `extras.js:210-215`                      | D-3, D-34                         |
| R², signed r, RMSE                                                     | `extras.js:308-310`                      | D-31, D-32                        |
| "Approximate fit" label                                                | `extras.js:309`                          | D-26                              |
| Fit sliders, Adjusted model, Refit data                                | `extras.js:243-361`                      | D-35                              |
| Non-identifiable model error                                           | `regression.js:117-137`                  | D-26                              |
| Up to 8 parameters; x₁ not x                                           | `regression.js:49-53`                    | D-22                              |
| sin, cos, tan and inverses, ln, log, exp, floor, ceil, round, min, max | `karman-calculator/lib/math.js:17-34`    | FN-18, FN-20, FN-25, FN-60, FN-77 |
| Complex arithmetic toggle                                              | `karman-calculator/lib/complex.js`       | FN-17                             |

Deliberate changes, none of which removes a capability: paste creates a new table instead of
overwriting the imported one (D-15); r is no longer shown for nonlinear models (D-31); radians
replace v1's degrees default (D5); log mode is added (D-27 to D-30).

## 21. Reference data sets

- NIST StRD linear regression: Norris, Pontius, Longley; nonlinear regression: Misra1a,
  Chwirut2, Thurber. Each is committed with its certified values as a JSON fixture beside the
  generated reference values (FN-10).
- Distribution, inference, statistics, matrix and colour fixtures are produced by the FN-10
  scripts; each fixture names the function, arguments, expected value and tolerance class.
- Table and transfer fixtures for D-40 live with the browser tests in `tests/calculator/v2/` and
  use synthetic questions only; no student data and no observation artifacts enter the repository.
