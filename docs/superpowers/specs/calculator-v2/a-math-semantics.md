# Calculator v2: math semantics

Date: 2026-10-16 · Part of the [Karman calculator v2 design](../2026-10-16-karman-calculator-v2-design.md) · Owner: Zakaria Bennis

This file defines what every row means mathematically. It covers how LaTeX from typing, the API, paste and Transfer to Calculator becomes a syntax tree; how a row is classified; how numbers, lists, angles and complex values evaluate and display; what counts as a correct graph; and how points of interest are found. Every rule is a checklist ID with an automated test, and a golden corpus shared with the Transfer tests holds the expected results. Where test-day behaviour was not captured, a rule gives a concrete default and says when REA behaviour capture confirms it. A capture that disagrees with a default changes the rule, its corpus cases and its tests in one pull request.

IDs defined here:

- **PR-1 to PR-45**: input dialects, parsing grammar and precedence, typing outcomes, the golden corpus, member access.
- **RC-1 to RC-21**: row classification, reserved names, collisions and cycles.
- **NM-1 to NM-44**: number display, fractions, real-number domain, complex mode, angle mode, lists, limits and tolerances.
- **G-1 to G-24**: what graphs and what a correct graph is. G-1 and G-3 to G-6 keep their original meaning. G-2 keeps its meaning except that single points moved to G-7, so Phase 1 can test them. G-5 moves to Phase 1 because the zoom and Home controls in L-1 ship in Phase 1.
- **POI-1 to POI-16**: points of interest, labels, trace and draggable points.

IDs referenced from other files: T-1 to T-6, T-13, R-2, R-5 to R-7, S-1, S-9, SC-6, SC-9, K-4, L-1, AN-, A11Y-2, A11Y-11, A11Y- and TH- (e-ux-keypad-accessibility-theme.md); FN-, including FN-47, FN-48, FN-50, FN-57, FN-58 and FN-79, D-1 and D-2 (b-functions-and-data.md); TR-, including TR-7, TR-11, TR-12, TR-14, TR-24, TR-28, TR-31, TR-35, TR-62, TR-67 and TR-73 (c-transfer.md); AR- and API-, including AR-3, AR-58 and API-13 (d-architecture-integration.md).

## 1. Ground rules

- **Target.** Behaviour matches the SAT testing configuration (D2). The test-day calculator is a reference for observable behaviour only. Nothing here copies its code, assets or exact visual design.
- **Scientific calculator.** The Scientific calculator (CB-3) uses these rules; SC-6 adds `ans`, SC-9 adds the ×10ⁿ key for scientific notation, and `e` is Euler's number in both calculators.
- **Existing engines are non-normative.** Neither the deployed engine (`karman-calculator/lib/`) nor the legacy engine (`src/lib/calculator/`) is a reference. Their tests do not carry forward, except that their inputs feed the G-24 parity check. The table lists the conflicts this file settles.

| Topic          | Deployed engine                                                    | Legacy engine                                   | v2 rule         |
| -------------- | ------------------------------------------------------------------ | ----------------------------------------------- | --------------- |
| Letter runs    | `[a-z]+` read as one lower-cased name (`lib/math.js:53`)           | 2–5 letters split into products (`math.ts:208`) | PR-13, RC-1     |
| `1e3`          | 1000 (`lib/math.js:46`)                                            | not handled                                     | PR-10 (2·e·3)   |
| (−8)^(1/3)     | NaN in real mode (`lib/complex.js:37-38`)                          | needs complex mode                              | NM-10           |
| sin(180°)      | about 1.22e-16 (`lib/math.js:199-204`)                             | same conversion (`math.ts:77-78`)               | NM-26           |
| Default angle  | degrees (`karman-calculator/README.md:42`)                         | degrees                                         | NM-24 (radians) |
| Small values   | 10 significant digits (`lib/math.js:15`)                           | snaps values below 1e-14 to 0 (`math.ts:255`)   | NM-1 to NM-4    |
| Roots          | none                                                               | absolute threshold 1e-7 (`numerics.ts:10`)      | POI-5           |
| Curve sampling | at most 2,048 samples and a midpoint test (`lib/graph.js:159-180`) | 400–1,600 fixed samples (`plot.ts:27`)          | G-9 to G-15     |
| Implicit grid  | at most 180×160 cells (`lib/implicit.js:13-14`)                    | 8 px cells (`plot.ts:183`)                      | G-16            |

**Conventions.**

- _Undefined_ is the single non-value state. It displays as `undefined` (NM-6) and never as NaN or Infinity.
- _px_ means CSS pixels. Graph tests run on an 800×600 px graph area at device pixel ratio 1, in the default view (G-5) unless a rule says otherwise.
- _Tree_ means the canonical syntax tree in the corpus notation (section 2.8).
- _Test kinds_: unit (Vitest, node), component (Vitest, jsdom, with the real MathField), browser (Playwright), visual, contrast, perf.

## 2. Parsing (PR-)

### 2.1 Input paths and dialects

There are three input paths. Typed input comes from the MathField. API and paste input is LaTeX. Question dialect is the KaTeX source of question content that Transfer to Calculator reads; the question style guide (`question-imports/chatgpt/KarmanGPT.txt`, section 16) writes it with `\dfrac`, `\cdot`, `\le`, `\%` and `x_1`.

- **PR-1** Typed, API and paste input go through one normalizer and one parser, so the same math always yields the same tree. Question dialect is first rewritten by the eager TR-7 normalisation in `src/lib/calculator-transfer/` (AR-3); PR-5 and PR-6 state the question-dialect rules that normalisation applies, and the corpus asserts that each question-dialect case and its TR-7 output parse to the same tree, except that a mixed number in a table cell or point coordinate is compared by value, because TR-28 writes it as an improper fraction (PR-6). (Phase 1; verified by unit test)
- **PR-2** For every corpus case with LaTeX input, parsing the LaTeX and parsing the MathField's `latex()` after loading that LaTeX give identical trees. (Phase 1; verified by component test)
- **PR-3** The normalizer maps `\dfrac` and `\tfrac` to `\frac`; drops `\left`, `\right`, `\displaystyle` and the spacing commands `\,` `\;` `\:` `\!` `\ ` `\quad`; maps `\cdot` and `\times` to explicit multiplication, `\div` to division, `\le` `\leq` `\leqslant` to ≤, `\ge` `\geq` `\geqslant` to ≥, and `\lt` `\gt` to < and >; and maps `\operatorname{n}`, `\mathrm{n}` and `\text{n}` to the operator n when n is on the allowlist (PR-12). (Phase 1; verified by unit test)
- **PR-4** The normalizer maps the Unicode characters − – × · ÷ π θ τ ≤ ≥ ² ³ and the subscript digits ₀ to ₉ to their LaTeX forms, so `x₁` becomes `x_{1}` and `x²` becomes `x^{2}`. (Phase 1; verified by unit test)
- **PR-5** In question dialect, `{,}` between digit groups is removed (`1{,}250` is 1250). In question-dialect math segments, a bare comma is always a separator and is never read as a thousands separator; question table cells follow TR-24. (Phase 1; verified by unit test)
- **PR-6** In question dialect, an integer literal a followed directly by `\frac{b}{c}` with integer literals 0 < b < c is a mixed number when it starts the math or follows an operator, relation, comma or opening bracket. It becomes `\left(a+\frac{b}{c}\right)`, except in table cells and point coordinates, where TR-28 writes the improper fraction (`2\frac{1}{2}` becomes `\frac{5}{2}`). Elsewhere `-2\frac{1}{2}` becomes `-\left(2+\frac{1}{2}\right)`. Typed, API and paste input keep the product meaning: `2\frac{1}{2}` is 1. (Phase 1; verified by unit test)
- **PR-7** Postfix `\%` divides by 100 (`44\%` is 0.44), and `p\%\operatorname{of}q` is p/100·q, in every input path (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **PR-8** `^{\circ}`, `^\circ`, `°` and `\degree` are a postfix degree sign; NM-27 gives its meaning. (Phase 1; verified by unit test)
- **PR-9** These constructs return a parse error with code `unsupported`, never a partial tree: `\pm`, `\mp`, `\ne`, `\approx`, `\infty` outside integral or sum bounds and the bound arguments of cdf (FN-48, FN-52), `\text{}` holding anything but an allowlisted name, `\begin{…}` environments in every phase (matrix literals are written `[a,b;c,d]` per FN-80 and parse to the head `matrix` from Phase 4), and `\sim` until PR-30 ships in Phase 3. Until the rule that gives them meaning ships, these also return `unsupported`: postfix `!` (NM-15, FN-79; Phase 2); member access `.` after a name (PR-45; Phase 3); lists, ranges, comprehensions, piecewise braces and restrictions (PR-31, PR-32, PR-34; Phase 2); `\sum`, `\prod`, `\int`, `\frac{d}{dx}`, primes, `\operatorname{with}`, `\operatorname{and}` and `\operatorname{or}` (PR-28, PR-33, PR-35; Phase 4); and any call to an allowlisted built-in, with or without parentheses (PR-24, PR-25), whose FN- rule has not shipped (confirm `\ne` by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)

### 2.2 Numbers and names

- **PR-10** A number literal is digits with at most one decimal point (`12`, `0.5`, `.5`, `5.`). A sign is never part of a literal. Spaces between digits are ignored as in LaTeX, so `2 3` is 23. Neither calculator has E-notation, so `2e3` is 2·e·3; scientific notation is entered as `\times10^{3}` with the ×10ⁿ key (SC-9). (Phase 1; verified by unit test)
- **PR-11** An identifier is one Latin letter, case-sensitive, or one lowercase Greek letter command other than `\pi`, `\tau` and omicron. It may carry a subscript of letters and digits (`a_{1}`, `x_{12}`, `v_{max}`). Subscripts are compared as written, so `a_{1}` and `a_{01}` are different names. (Phase 1; verified by unit test)
- **PR-12** One allowlist module, `src/lib/calculator-v2/core/latex/operator-names.ts`, lists every built-in operator name and auto-command. It generates the parser's names, MathQuill's `autoOperatorNames` and `autoCommands` (T-3) and the functions panel entries (K-4), and a test asserts that all three match. Member names (`null`, `p`, `pleft`, `pright`, `score`, `dof`, `stderr`, `conf`, `lower`, `upper`, `estimate`) are a separate list in the same module: they generate K-4 panel entries that insert `.name` at the caret, are recognised only directly after `.` (PR-45), and are never parser bare names, PR-13 split targets or MathQuill autoOperatorNames; the three-way match test compares the non-member names, and a corpus case asserts that `3p+4=19` offers a chip for p after category 7 ships. (Phase 1; verified by unit test)
  - _Amended 2026-10-19 (appendix F decision 2, Desmos behaviour wins):_ the allowlist also holds `abs` (category 12) and `length` (category 4), which Desmos accepts as built-in names, so typing them now gives an operator name. Built-ins ship by name through the module's `SHIPPED` set, one task at a time; each entry's `phase` stays only as the K-4 panel schedule.
- **PR-13** A run of Latin letters outside a command is split left to right, taking at each position the longest allowlisted name or auto-command that starts there. This is the rule MathQuill applies while typing (T-3). Letters that start no name are single-letter identifiers multiplied implicitly: `mx` is m·x, `sinx` is sin x and `2pix` is 2πx. (Phase 1; verified by unit test)
- **PR-14** A digit run directly after a single-letter identifier is that identifier's subscript: `x1` is `x_{1}` and `a12` is `a_{12}`. This matches automatic numeral subscripts while typing (T-4). (Phase 1; verified by unit test)
- **PR-15** `e`, `\pi` and `\tau` are the constants e, π and 2π. `i` is the imaginary unit only in complex mode (NM-17). `\theta` is the polar angle. Every other letter is an identifier. `e_{…}` with any subscript is an ordinary identifier distinct from the constant e, so typed `2e3` (T-4 gives `2e_{3}`) is 2·e₃ with an add-slider chip for e₃. (Phase 1; verified by unit test)

### 2.3 Operators and precedence

| Level (loosest first) | Operators                                                                             | Grouping                                  |
| --------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1                     | `\operatorname{with}`                                                                 | right side is a comma list of definitions |
| 2                     | `,` in lists, points, arguments and piecewise branches                                | separator                                 |
| 3                     | `\operatorname{or}`                                                                   | left to right                             |
| 4                     | `\operatorname{and}`                                                                  | left to right                             |
| 5                     | `=` `<` `>` `\le` `\ge` `\sim`                                                        | chains, see PR-29                         |
| 6                     | `+` and binary `-`                                                                    | left to right                             |
| 7                     | `\cdot` `\times` `/` `\div` and implicit multiplication                               | left to right, one shared level           |
| 8                     | unary `-` and `+`                                                                     | prefix                                    |
| 9                     | built-in function without parentheses                                                 | prefix, argument by PR-24                 |
| 10                    | `^`, postfix `!` `\%` and degree sign, prime `'`                                      | `^` right to left; postfix on one atom    |
| 11                    | numbers, names, groups, `\frac`, roots, bars, lists, calls, member access `.` (PR-45) | atoms                                     |

- **PR-16** Operators bind as the precedence table says. (Phase 1; verified by unit test)
- **PR-17** Unary minus binds looser than `^` and `!`: `-x^{2}` is −(x²), `-2^{2}` is −4, `(-2)^{2}` is 4 and `-3!` is −6. (Phase 1; verified by unit test)
- **PR-18** Implicit and explicit multiplication and division share one level and group left to right, so raw `6\div2(1+2)` is 9 and raw `1/2x` is x/2. Typed `1/2x` builds `\frac{1}{2x}` (T-2), which is 1/(2x) (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **PR-19** Exponents come from structure: `^{…}` holds the exponent. Raw `^` without braces takes the next single character or command, as in LaTeX, so `x^23` is x²·3. `a^{b^{c}}` nests to the right, and a raw double superscript `a^b^c` is a parse error. (Phase 1; verified by unit test)
- **PR-20** Postfix `!`, `\%` and the degree sign apply to the atom just before them, including a superscripted atom: `x^{2}!` is (x²)!, `2x!` is 2·(x!) and `3!^{2}` is 36. Until NM-15 ships in Phase 2, `!` returns `unsupported` (PR-9), so the `!` cases here and in PR-17 run from Phase 2. (Phase 1; verified by unit test)
- **PR-21** Typed absolute-value bars arrive as `\left|…\right|`. In raw input a `|` opens a bar when it follows the start, an operator, a relation, `(`, `[`, `\{`, `,` or another opening bar, and closes one otherwise. The cases `|x|-|y|`, `||x|-1|` and `2|x-3|` parse as written. (Phase 1; verified by unit test)
- **PR-22** Parentheses holding exactly two top-level comma-separated parts form a point. One part is a group, and three or more parts are a parse error. (Phase 1; verified by unit test)

### 2.4 Functions

- **PR-23** `n(…)` is a call only when n is a built-in name, or a single-letter identifier (optionally subscripted) that some row defines as a function, in any row order (G-6). Otherwise it is implicit multiplication: `a(x-h)^{2}+k` is a·(x−h)²+k, and `f(2)` with no definition of f is f·2. (Phase 1; verified by unit test)
- **PR-24** Without parentheses, a built-in function's argument is the run of implicitly multiplied factors after it (numbers, names, constants, powers, groups, fractions, roots and absolute values), including a leading unary minus. It ends before `+`, binary `-`, `\cdot`, `\times`, `/`, `\div`, a relation, `,`, `:`, a closing bracket or another built-in name. So `\sin2x` is sin(2x), `\sin x+1` is sin(x)+1, `\sin x\cos x` is sin(x)·cos(x), `\ln x^{2}` is ln(x²), `\sin2\pi x` is sin(2πx), `\sin-x` is sin(−x) and `\sin x\cdot2` is 2·sin(x) (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **PR-25** When `(` directly follows a built-in name, that group alone holds the arguments: `\sin(x)y` is sin(x)·y and `\sin(x)^{2}` is (sin x)². (Phase 1; verified by unit test)
- **PR-26** A superscript between a function name and its argument raises the result to that power: `\sin^{2}x` is (sin x)² and `\ln^{2}x` is (ln x)². The exception is `^{-1}` on the six circular and six hyperbolic trig names, which means the inverse function: `\sin^{-1}x` is arcsin x and `\cosh^{-1}x` is arcosh x. On any other built-in, `^{-1}` is the reciprocal of the result (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **PR-27** `\log x` is base 10, `\log_{b}x` is base b and `\ln x` is natural. `\sqrt{x}` is the square root and `\sqrt[n]{x}` is the nth root; NM-11 gives its domain. (Phase 1; verified by unit test)
- **PR-28** Calculus syntax: `f'(x)` and `f''(x)` differentiate a defined one-parameter function. `\frac{d}{dx}` takes its argument by the PR-24 rule. `\int_{a}^{b}…dx` takes everything up to its trailing differential and is a parse error without one. `\sum_{n=a}^{b}` and `\prod_{n=a}^{b}` take their argument by the PR-24 rule, with n local. (Phase 4; verified by unit test)

### 2.5 Relations and conditions

- **PR-29** The relations are `=`, `<`, `>`, `\le` and `\ge`. A chain of inequalities pointing the same way, such as `0\le x<10`, is allowed. A chain that mixes directions (`a<x>b`), mixes `=` with `<`, `>`, `\le` or `\ge` (`x=y<3`), or contains more than one `=` is a parse error. (Phase 1; verified by unit test)
- **PR-30** `\sim` may appear once, at top level, with an expression on each side. It means a regression (D-2). (Phase 3; verified by unit test)
- **PR-31** `\{c_1:v_1,c_2:v_2,…,v\}` is piecewise: the value of the first true condition is used, and the optional final bare value is the otherwise case. With no otherwise case and no true condition the result is undefined. `\{c\}` alone is 1 when c is true and undefined otherwise. (Phase 2; verified by unit test)
- **PR-32** Condition braces directly after an expression or relation restrict it, as in `y=x^{2}\{x>0\}`. Several restrictions combine with and, as in `\{0<x<2\}\{y>1\}`, and the row is undefined wherever any restriction is false or undefined. (Phase 2; verified by unit test)
- **PR-33** Inside conditions, `\operatorname{and}` binds tighter than `\operatorname{or}`, and both bind looser than relations. (Phase 4; verified by unit test)

### 2.6 Lists and substitution

- **PR-34** List syntax covers `[a,b,c]`, `[]`, the ranges `[a...b]` and `[a,b,...,c]` (`\ldots` is accepted for `...`), indexing `L[i]`, slicing `L[i...j]`, filtering `L[c]` with a condition c, and comprehensions `[e\operatorname{for}n=L,m=M]`, whose loop names are local to the brackets. NM-30 to NM-38 give the meaning. (Phase 2; verified by unit test)
- **PR-35** `e\operatorname{with}a=1,b=2` substitutes the listed definitions into e only, at the loosest precedence. (Phase 4; verified by unit test)

### 2.7 Typing outcomes (MathQuill configuration)

The MathQuill settings belong to T-1 to T-4. This file fixes the LaTeX and trees those settings must produce, so a configuration change that alters parsing fails a test here.

- **PR-36** Keystroke cases run through the real MathField produce these results. `y=x^2`, right arrow, `+3/4` gives `y=x^{2}+\frac{3}{4}`, as observed on 2026-10-16. `x^2+1` with no arrow gives `x^{2}+1` (T-6), and `e^-x` gives `e^{-x}` (T-1). `3x/4` gives `\frac{3x}{4}` (T-2). `y=sqrtx`, right arrow, `+pi` gives `y=\sqrt{x}+\pi`, as observed. `x1` gives `x_{1}`, `2e3` gives `2e_{3}` (T-4, PR-15), `<=` gives `\le`, `sinx` gives `\sin x`, and `mx` stays two identifiers. (Phase 1; verified by component test)
- **PR-37** The parser's printer turns any tree back into canonical MathQuill LaTeX, and parsing that output returns the same tree. Transfer to Calculator writes the TR-7 normalised LaTeX, which PR-44 checks parses to its corpus tree, and printer output is used only for the TR-35 duplicate check. (Phase 1; verified by unit test)

### 2.8 Syntax tree and errors

The corpus writes trees as S-expressions. The heads are `num`, `id`, `const`, `add`, `sub`, `neg`, `mul`, `div`, `pow`, `fact`, `pct`, `deg`, `abs`, `root`, `call`, `member`, `point`, `list`, `matrix`, `range`, `index`, `for`, `with`, `piecewise`, `restrict`, `rel`, `and`, `or`, `sim`, `prime`, `deriv`, `int`, `sum` and `prod`. `\frac` and `/` both give `div`. For example, `y=mx+b` is `(rel = (id y) (add (mul (id m) (id x)) (id b)))`. Classification (section 3) is a separate field.

- **PR-38** Parsing never throws. It returns a tree or an error with a code and the source span, and R-2 turns the code into a plain-language message. (Phase 1; verified by unit test)
- **PR-45** Member access: an atom (a name or a call) whose value is a distribution or an inference test, followed directly by `.` and a PR-12 member name or one of `pdf`, `cdf`, `random`, forms `n.m` or `n.m(args)` at level 11, parsing to the head `member` (`(member (id T) score)`); this gives FN-47, FN-48, FN-50, FN-57 and FN-58 their `D.pdf(x)`, `D.cdf(…)`, `D.random(n)` and `T.score` forms; a member on any other value or an unknown member is a row error, and until Phase 3 a `.` after a name returns `unsupported` (PR-9). (Phase 3; verified by unit test)

PR-39 to PR-44 define the golden corpus in section 7.

## 3. Row classification (RC-)

| Row                                 | Outcome                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `y=2x+3`, `2x+3=y`                  | explicit curve y=f(x)                                         |
| `x=y^{2}`                           | explicit curve x=g(y)                                         |
| `2x+3y=12`, `x^{2}+y^{2}=25`        | implicit curve                                                |
| `2x+5=17`, `x^{2}=4`                | vertical lines at x=6; at x=−2 and x=2                        |
| `y>2x+1`, `x\le3`, `1<y<3`          | shaded region                                                 |
| `x^{2}`                             | curve y=x²                                                    |
| `3+4`                               | value 7                                                       |
| `a=3`                               | definition of a with value 3; slider-eligible (R-7)           |
| `a=2x`, `A=\pi r^{2}`               | dependent definition; not graphed                             |
| `C=8h+15`                           | definition of C; add-slider chip for h                        |
| `y=ax+b`                            | chips for a, b and all; nothing graphed (observed 2026-10-16) |
| `3p+4=19`, `3p+4<19`                | chip for p; nothing graphed                                   |
| `f(x)=x^{2}`, `P(t)=500(1.03)^{t}`  | function definition; graphed against the horizontal axis      |
| `g(a,b)=a+b`                        | function definition; not graphed                              |
| `f(2)` with f defined / not defined | value / product f·2 with a chip for f                         |
| `a(x-h)^{2}+k`                      | product; chips for a, h and k                                 |
| `(1,2)`                             | point                                                         |
| `(\cos t,\sin t)`                   | parametric curve                                              |
| `r=2\sin\theta`                     | polar curve                                                   |
| `2<3`                               | whole view shaded                                             |
| `x+y`, `e=2`, `a=a+1`               | error                                                         |
| `y_{1}\sim mx_{1}+b`                | regression (D-2)                                              |

- **RC-1** Names are case-sensitive, so `A` and `a` are different names. This fixes the deployed engine, which lower-cases every name (`karman-calculator/lib/math.js:53`, `lib/model.js:33-39`). (Phase 1; verified by unit test)
- **RC-2** A row takes the first rule that matches, in this order: empty; table (D-1); regression with `\sim` (D-2); function definition (RC-4); definition of a name (RC-6); relation (RC-11 to RC-14); point or parametric curve (RC-15, RC-16); bare expression (RC-17). Until RC-16 and RC-18 ship in Phase 2, a point whose parts depend on a `t` that no row defines, and any row other than an RC-6 definition that uses `r` or `\theta` (including the `r=…` and `\theta=…` rows of RC-19), give a row error with code `unsupported` (R-2); `A=\pi r^{2}` stays a dependent definition (RC-6). (Phase 1; verified by unit test)
- **RC-3** The reserved names are `x` and `y` (coordinates), `r` and `\theta` (polar), `e`, `\pi`, `\tau`, `i` in complex mode, and every built-in name. `t` is the parametric parameter only inside a point whose `t` no row defines. (Phase 1; verified by unit test)
- **RC-4** `f(p_1,…,p_n)=body` defines a function when f is a single non-reserved letter (optionally subscripted) and the parameters are 1 to 8 distinct single letters; x, y and t are allowed as parameters. Parameters are local and shadow other names. (Phase 1; verified by unit test)
- **RC-5** A one-parameter definition graphs as y = f(p) against the horizontal axis, whatever the parameter is called (`f(x)=x^{2}`, `P(t)=500(1.03)^{t}`, `h(y)=y+1`). Definitions with two or more parameters are not graphed (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **RC-6** `n=expr`, with n a single non-reserved name, defines n. The row shows n's value when expr evaluates to a number, point or list. When expr depends on x, y, r or θ the definition is dependent: it is not graphed, and other rows may use it. So after `a=2x`, the row `y=a` graphs y=2x, and `A=\pi r^{2}` defines A in terms of the polar r (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **RC-7** A name defined in more than one row, as a value, function, list or table column, puts an error on every defining row, and rows that use the name show a dependency error. (Phase 1; verified by unit test)
- **RC-8** A definition cycle puts an error on every row in the cycle. This covers self-reference (`a=a+1`), mutual reference (`a=b` with `b=a`) and recursion through functions; recursive functions are not supported. (Phase 1; verified by unit test)
- **RC-9** Definitions resolve in any row order, and hidden rows still define their names; hiding affects only the graph. (Phase 1; verified by unit test)
- **RC-10** Names that are used but neither defined, reserved nor built in become add-slider chips (R-6) in order of first appearance, with `all` added when there are two or more. The row graphs nothing until they are defined. A chip adds the row `n=1` with bounds −10 ≤ n ≤ 10 and no step (R-7). (Phase 1; verified by unit test)
- **RC-11** A relation with exactly `y` on one side and no `y` on the other is an explicit curve y=f(x). Exactly `x` on one side gives x=g(y). `y=c` and `x=c` are horizontal and vertical lines. (Phase 1; verified by unit test)
- **RC-12** Any other equation in x and y is an implicit curve. An equation in x alone is the set of vertical lines at its real solutions in view (`2x+5=17` is x=6 and `x^{2}=4` is x=±2), and an equation in y alone gives horizontal lines. (Phase 1; verified by unit test)
- **RC-13** An equation or inequality whose only free names are not coordinates is not solved: `3p+4=19` and `3p+4<19` each offer a chip for p and graph nothing (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **RC-14** An inequality in x, y or both is a shaded region (G-17). An inequality with no free names shades the whole view when true and nothing when false, and an equation with no free names draws nothing (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **RC-15** A point `(a,b)` whose parts evaluate to numbers is a point. A point that uses x or y is an error. (Phase 1; verified by unit test)
- **RC-16** A point whose parts depend on a `t` that no row defines is a parametric curve. (Phase 2; verified by unit test)
- **RC-17** A bare expression with no free names shows its value. One in x alone graphs as y equal to the expression, and one in y alone graphs as x equal to it. One in both x and y is an error. One that uses r or θ and neither x nor y, such as `2\pi r` or `\sin\theta`, is an error that names r or θ, while `C=2\pi r` stays an RC-6 dependent definition; the corpus has a case for each (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **RC-18** A relation in `r` or `\theta` with no x or y is polar (G-19). In a row that mixes r or θ with x or y, r is √(x²+y²) and θ is the angle of (x, y) in (−π, π] (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **RC-19** Defining a reserved name is an error, with three exceptions: `x=…` and `y=…` are graphs (RC-11), `r=…` and `\theta=…` are polar (RC-18), and `t=2` defines t, after which `(t,t^{2})` is a point (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **RC-20** A call with the wrong number of arguments is an error that names the expected count. (Phase 1; verified by unit test)
  - _Amended 2026-10-19 (appendix F decision 2, Desmos behaviour wins):_ a built-in uses Desmos's wording: "Function 'floor' requires only 1 argument. For example, try typing: floor(x)." when too many arguments are given and "Function 'nCr' requires 2 arguments. For example, try typing: nCr(1, 2)." when too few. The example uses the nearest accepted count, `x` for one argument and `1, 2, …` for more. A user function keeps "f takes 1 argument.". The error's names are the function, the expected count and the given count.
- **RC-21** After `setBlank()` (API-) for a new question, nothing from the previous question resolves: no name, slider, function, table column, viewport or math setting. Classification starts from an empty scope, in radians with complex mode off (R10, S-9, AR-58). Display size and reverse contrast are the only settings kept for the page session, and neither changes parsing, classification, evaluation or display text. (Phase 1; verified by browser test)

## 4. Numbers (NM-)

### 4.1 Display

- **NM-1** A numeric result shows at most 12 significant digits, rounded as JavaScript `toPrecision(12)` rounds. Trailing zeros are trimmed and −0 shows as 0, so `\frac{1}{3}` shows 0.333333333333 and `\pi` shows 3.14159265359 (confirm the digit count by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **NM-2** A value with 10^-6 ≤ |v| < 10^12 shows as a plain decimal. Any other non-zero value shows as m×10^n with 1 ≤ |m| < 10 and at most 12 significant digits in m, so `2^{40}` shows 1.09951162778×10^12 (confirm the thresholds by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **NM-3** No global or relative epsilon snaps a result to zero. `10^{-20}` shows 1×10^-20; `0.1+0.2` shows 0.3 only because of NM-1 rounding; and `0.1+0.2-0.3` shows 5.55111512313×10^-17. (Phase 1; verified by unit test)
  - _Amended 2026-10-19 (appendix F decision 2, Desmos behaviour wins; maths-core MATHS-CORE-1, 2 and 61):_ constants are evaluated exactly. A decimal or integer literal is the rational n/d with |n| and d up to 2^53−1 (a longer literal is its double), and constant values stay exact through +, −, ×, ÷, %, integer powers, rational powers whose roots are exact, √ of a perfect-square rational, mod, abs and round(x, n), which is round(x·10^r)/10^r with r = round(n) and only the whole-number rounding on a double. Any other built-in receives the rational's double. A result that cannot be held exactly, and any non-rational input such as π, uses doubles, but an integer-valued double sub-result re-enters the exact path. Definitions (`a=1.005`) and user-function calls on constants keep the exact value. Graphing, in real and complex mode alike, folds each maximal sub-tree that does not depend on x or y (including definitions read from the scope, constant user calls, and constant parts of user-function bodies) once on this exact path, and uses doubles only for the parts that depend on x or y, so a constant part plots the value its row shows: `y=x+10^{18}(0.1+0.2-0.3)` plots on y=x and `y=10^{4}\operatorname{round}(1.005,2)-10100` at 0, as live Desmos does (observed 2026-10-19, `rea-targets/obs/review/mc02-graph.cjs` and `obs/mc02-fold/probe.cjs`). Known deviation: Desmos also plots `y=10^{18}(x\cdot0+0.1+0.2-0.3)` at 0, while V2 evaluates that x-dependent sum in doubles and plots it at 55.5. No epsilon is involved, so `0.1+0.2-0.3` shows 0, `\operatorname{round}(1.005,2)` shows 1.01, `\operatorname{mod}(0.3,0.1)` shows 0, `\pi-\pi+0.1+0.2-0.3` shows 0, while `\pi+0.1+0.2-0.3-\pi` is 4.440892098500626×10^-16 and `2^{0.5}\cdot2^{0.5}` is 2.0000000000000004. The old `0.1+0.2-0.3` example above no longer holds. (Phase 2; verified by unit test, `eval/exact-fold.test.ts`, `eval/compile.test.ts` NM-21 and corpus `display-numbers` 12 and 28 to 41)
- **NM-4** In radian mode, a circular trig argument within 4 units in the last place of k·π/12, for an integer |k| ≤ 2^20, is evaluated as exactly 15k degrees by NM-26. So `\sin\pi` is 0, `\cos\frac{\pi}{2}` is 0, `\tan\frac{\pi}{4}` is 1 and `\tan\frac{\pi}{2}` is undefined. (Phase 1; verified by unit test)
- **NM-5** A point shows as `(a, b)`, each coordinate formatted by NM-1 and NM-2. (Phase 1; verified by unit test)
- **NM-6** Any non-finite result, and any non-real result in real mode, shows the single text `undefined` and never NaN or Infinity. (Phase 1; verified by unit test)
- **NM-7** The exact-fraction toggle (R-5) is offered for a scalar result v when the continued fraction of v reaches p/q in lowest terms with q ≤ 10^4 and |v − p/q| ≤ 10^-12·max(1, |v|). It shows an improper fraction with the sign in front, never appears for integers, and never changes the stored value. So 0.375 offers 3/8, `0.1+0.2` offers 3/10, `\frac{2}{3}` offers 2/3, and `\sqrt{2}` and `\pi` offer none (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **NM-8** Axis numbers label ticks spaced at 1, 2 or 5 times a power of 10. Each label uses the fewest decimals its step needs (a step of 0.2 labels 0.2, 0.4, 0.6; a step of 5,000 labels 5000, 10000) and switches to the NM-2 form outside NM-2's plain range. (Phase 1; verified by unit test)
- **NM-9** Display rounding affects only text. Evaluation, conditions, list operations and regressions use the full double value. (Phase 1; verified by unit test)

### 4.2 Real-number domain

- **NM-10** For a negative base a and a real exponent b, the result is real when b equals p/q in lowest terms with q odd and q ≤ 99. The rational form comes from the tree when the exponent is a fraction of integer literals, and otherwise from the value, using the smallest such q with |b − p/q| ≤ 4 ulp(b). The result is (−1)^p·|a|^b. Otherwise the result is undefined in real mode. So (−8)^{1/3} is −2, (−8)^{2/3} is 4, (−8)^{−1/3} is −0.5, (−32)^{0.2} is −2, and both (−8)^{0.5} and (−2)^{π} are undefined (confirm decimal exponents by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **NM-11** `\sqrt[n]{x}` with odd integer n gives the real root of a negative x (`\sqrt[3]{-27}` is −3). With even n it is undefined for x < 0. A non-integer n means x^{1/n} under NM-10. (Phase 1; verified by unit test)
- **NM-12** These are undefined: division by zero, ln and log of zero or a negative number, a log base that is not positive or equals 1, even roots of negatives, arcsin and arccos outside [−1, 1], and trig values at their poles. (Phase 1; verified by unit test)
- **NM-13** 0^0 is 1 (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **NM-14** A result whose magnitude exceeds the largest double is undefined (`10^{400}`); a result that underflows is 0 (`10^{-400}`). (Phase 1; verified by unit test)
- **NM-15** x! is Γ(x+1) and is undefined at negative integers: 0.5! is 0.886226925453, 170! is finite and 171! is undefined. (Phase 2; verified by unit test)
- **NM-16** The sampled curves for `y=x^{1/3}` and `y=x^{2/3}` include points at x = −4, and `y=x^{2/3}` matches `y=\sqrt[3]{x^{2}}` within 0.5 px for x < 0. (Phase 1; verified by unit test)

### 4.3 Complex mode

- **NM-17** With complex mode off, `i` is an ordinary name and gets an add-slider chip. A row whose only undefined name is `i` also shows a hint to turn on complex mode in Settings (S-1, R-2) (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **NM-18** With complex mode on, `i` is the imaginary unit, and arithmetic, powers, roots, exp, ln, log, trig and hyperbolic functions accept complex values using principal branches. Ln z has imaginary part in (−π, π]; √z has a non-negative real part; z^w is e^{w·Ln z}; inverse trig and inverse hyperbolic functions use the principal branches of C99 `casin` and its companions. (Phase 1; verified by unit test)
- **NM-19** Complex mode never changes a value that real mode defines. (−8)^{1/3} is −2 in both modes, while (−8)^{1/2} is 2.82842712475i and `\sqrt{-4}` is 2i only in complex mode (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **NM-20** A complex result shows as a+bi, each part formatted by NM-1 and NM-2. A part with |part| ≤ 10^-14·|other part| shows as 0 and is omitted, so e^{iπ} shows −1, and a unit imaginary part shows as `i`, not `1i`. (Phase 1; verified by unit test)
- **NM-21** In complex mode a curve point is plotted only where its value is real, meaning |Im| ≤ 10^-12·max(1, |Re|); the real part is plotted. (Phase 1; verified by unit test)
- **NM-22** A relation or condition with a non-real operand is false. min, max, sort and other ordering functions return undefined for non-real input. (Phase 1; verified by unit test)
- **NM-23** The Complex functions category (R3; K-4 places it between Matrices and Advanced, and FN-84 to FN-87 define its functions) works in complex mode: real(z) and imag(z) return the real and imaginary parts, conj(z) returns the conjugate, arg(z) returns the angle in radians in (−π, π] in both angle modes, and |z| returns the modulus (confirm arg's unit by REA behaviour capture in Phase 4). (Phase 4; verified by unit test)

### 4.4 Angle mode

- **NM-24** Radians is the default (D5). The S-1 setting switches to degrees, and per-question reset returns to radians (R10, S-9). (Phase 1; verified by browser test)
- **NM-25** Degree mode changes only the inputs of sin, cos, tan, csc, sec and cot, the outputs of their inverses (including two-argument arctan) and polar θ (G-19). Hyperbolic functions, exp, ln, complex exponentials, arg, derivatives and integrals are unaffected; derivatives of degree-mode trig include the π/180 factor because the function does. A non-real argument (complex mode) is always in radians, whatever the angle unit (FN-18). (Phase 1; verified by unit test)
- **NM-26** In degree mode the argument is reduced exactly modulo 360 (IEEE remainder, exact for doubles) before conversion. Multiples of 90 give exactly 0 or ±1, multiples of 30 give exactly ±0.5 for sin and cos, and multiples of 45 give exactly ±1 for tan and cot. tan at odd multiples of 90, cot at multiples of 180, and sec and csc at their poles are undefined. So sin 30 is 0.5, cos 90 is 0, sin 180 is 0, tan 45 is 1, cos 60 is 0.5, sin 3630 is 0.5 and tan 90 is undefined. (Phase 1; verified by unit test)
- **NM-27** The degree sign converts degrees: x° is x·π/180 in radian mode and x in degree mode. A trig argument written in degrees is evaluated by NM-26, so `\sin(30°)` is exactly 0.5 in both modes (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **NM-28** Inverse trig ranges: arcsin [−π/2, π/2], arccos [0, π], arctan (−π/2, π/2), two-argument arctan(y, x) (−π, π], arccot (0, π), arcsec [0, π] without π/2, and arccsc [−π/2, π/2] without 0, with the matching degree ranges. In degree mode a result within 8 ulp of a multiple of 15 returns that multiple exactly: arcsin 0.5 is 30, arctan 1 is 45 and arccos(−1) is 180. In radian mode arcsin 1 is π/2 (confirm the arccot range by REA behaviour capture in Phase 1). (Phase 1; verified by unit test)
- **NM-29** Switching the angle unit or complex mode starts a new evaluation generation (AR-46) in the same task as the switch. No message from the superseded generation updates any row or curve after the switch. Every row value and every curve reflects the new setting within 250 ms of the switch for a 20-row list drawn from the Phase 1 corpus on the desktop CI profile. (Phase 1; verified by browser test)

### 4.5 Lists and table columns

- **NM-30** Lists are indexed from 1. An index out of range or non-integer gives undefined, and a list of indices gives a list (`L[[1,3]]`) (confirm non-integer indices by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **NM-31** `L[i...j]` slices inclusively, and `L[c]` keeps the elements for which condition c is true (`L[L>2]`). (Phase 2; verified by unit test)
- **NM-32** Operators, one-argument built-ins and user functions apply element by element, and a scalar combines with every element. Functions that take a whole list, such as mean, total and sort, do not broadcast over that list; FN- marks each one. (Phase 2; verified by unit test)
- **NM-33** Lists of different lengths are truncated to the shorter one, so `[1,2,3]+[10,20]` is `[11,22]` and `(L_{1},L_{2})` pairs only up to the shorter length. This replaces the legacy NaN-on-mismatch. (Phase 2; verified by unit test)
- **NM-34** A nested list is an error with a plain-language message (R-2). (Phase 2; verified by unit test)
- **NM-35** A list, including a range or comprehension result, holds at most 10,000 elements; a longer one is an error. (Phase 2; verified by unit test)
- **NM-36** `[a...b]` steps by 1, or by −1 when b < a. `[a,b,...,c]` steps by s = b − a, and s = 0 is an error. The element count is n = floor((c − a)/s + 10^-9) + 1, elements are a + k·s (never accumulated), and the last element is exactly c when |a + (n−1)s − c| ≤ 10^-9·|s|. A range whose step points away from c is empty. So `[0,0.1,...,1]` has 11 elements and ends exactly at 1, `[10...1]` has 10, `[1...10.5]` ends at 10, and `[1,3,...,10]` is `[1,3,5,7,9]` (confirm the empty case by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **NM-37** A comprehension over several names forms every combination, with the first listed name varying fastest (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **NM-38** A list result shows its first 30 elements, then `…`. (Phase 2; verified by unit test)
- **NM-39** A table column is a list. Trailing blank cells are trimmed, and an interior blank cell is an undefined element. (Phase 3; verified by unit test)
- **NM-40** Point lists and the two-list data functions skip any pair in which either element is undefined; D-2 regressions and FN- cov, corr and spearman consume paired lists under this rule. A single-list statistic over a list that contains an undefined element returns undefined, except count (FN-5), so the mean of a column with an interior blank is undefined (confirm by REA behaviour capture in Phase 3). (Phase 3; verified by unit test)
- **NM-41** A condition compares full double values: `=` is true only for equal values, and any comparison with undefined is false (confirm `\{0.1+0.2=0.3:1,0\}` by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
  - _Amended 2026-10-19 (appendix F decision 2; MATHS-CORE-1, 54):_ under the NM-3 amendment the operands are exact constants first, so `\{0.1+0.2=0.3:1,0\}` is 1, as in Desmos. A link between two operands that both hold an exact rational compares the rationals, not their doubles, so two distinct rationals that round to the same double, such as (2^53−2)/(2^53−1) and (2^53−3)/(2^53−2), are not equal (MATHS-CORE-54). A graphed condition that depends on x compares doubles.

### 4.6 Limits and tolerances

| Limit                                | Value                                       |
| ------------------------------------ | ------------------------------------------- |
| Rows                                 | 100 (the deployed engine has 32)            |
| Characters per row                   | 2,048 (T-13; every input path, matching v1) |
| Tree nodes per row                   | 2,000                                       |
| Nesting depth                        | 64                                          |
| Function parameters                  | 8 (RC-4)                                    |
| List elements                        | 10,000 (NM-35)                              |
| Curve evaluations per view           | G-15                                        |
| Table rows and regression iterations | D-1 and D-2                                 |

- **NM-42** Each limit in the table is enforced without freezing or crashing. Typing, paste or keypad input that would exceed the row or character limit is refused with a status message in the calculator's live region and leaves the list unchanged (T-13, A11Y-2); transfer input that would exceed either limit inserts nothing and is reported only through the TR-67 region with the TR-73 message "This can't be added to the calculator." (A11Y-11). setExpression or setState input that exceeds either limit throws invalid-argument and changes nothing (API-13). Exceeding the tree-node, nesting-depth, parameter or list-element limit gives a row error (R-2). (Phase 1; verified by unit test)
- **NM-43** For +, −, ×, ÷, powers, roots, exp, ln, log, circular and hyperbolic trig and their inverses, each result is within 10^-13 relative error of reference values computed with at least 30-digit arithmetic and committed to the corpus. This covers each function from the phase it ships in. The snapped values of NM-4, NM-26 and NM-28 are checked for exact equality instead. (Phase 1; verified by unit test)
- **NM-44** Γ and factorial are within 10^-12 relative error of the same kind of reference values. (Phase 2; verified by unit test)

Tolerances for statistics, distributions, inference, regression and calculus are defined with those functions in b-functions-and-data.md (FN-, D-), using the same reference-value format.

## 5. Graphing (G-)

### 5.1 What graphs

- **G-1** `y=f(x)`, `x=g(y)`, implicit equations and inequalities graph. Shaded regions have a dashed boundary for strict inequalities and a solid one for non-strict. (Phase 1; verified by unit test)
- **G-2** Polar `r=f(\theta)`, parametric `(f(t),g(t))`, point lists built from lists, piecewise `\{\}` and domain restrictions graph. Single points are G-7. (Phase 2; verified by unit test)
- **G-3** Lists, ranges, comprehensions and lists of functions graph according to NM-30 to NM-38 and G-22. (Phase 2; verified by unit test)
- **G-4** Points of interest, labels, trace and draggable points follow POI-1 to POI-16. (Phase 2; verified by browser test)
- **G-5** Pan works by drag and arrow keys. Pinch zooms, and the wheel zooms about the pointer. Zoom In and Zoom Out zoom about the view centre by a factor of 2 per press. Home restores the default view: x from −10 to 10, y centred on 0, equal units on both axes (observed on 2026-10-16: y from −8.60887 to 8.60887 in the 1440×900 desktop layout). AN- sets the animation timing (confirm the zoom factor by REA behaviour capture in Phase 1). (Phase 1; verified by browser test)
- **G-6** Function definitions with one or more parameters (`f(x)=…`, `g(a,b)=…`) can be used from any row, in any order (RC-4, RC-9). (Phase 1; verified by unit test)
- **G-7** A point `(a,b)` with numeric coordinates draws as a dot within 0.5 px of its position. A point with an undefined coordinate is not drawn. (Phase 1; verified by unit test)
- **G-8** Lines from `x=c`, `y=c` and one-variable equations (RC-12) span the whole view, within 0.5 px of c. (Phase 1; verified by unit test)

### 5.2 Curve correctness

These rules are checked on the sampler's polylines and contours, not on pixels.

- **G-9** No segment crosses a pole. For `\tan x`, `\frac{1}{x}` and `\frac{x^{2}-1}{x-2}`, both endpoints of every segment lie in the same interval of continuity. (Phase 1; verified by unit test)
- **G-10** Curves reach their domain endpoints. `\sqrt{1-x^{2}}` ends within 0.5 px of (±1, 0); `\sqrt{x}` and `\sqrt{x-3}+2` start within 0.5 px of (0, 0) and (3, 2); and `\ln x` continues to the bottom edge of the view. (Phase 1; verified by unit test)
- **G-11** Every polyline vertex lies within 0.5 px of the curve, and every segment midpoint lies within 0.5 px of it, measured perpendicular in pixels. This holds in the default view and after a 10^6× zoom-in about (1, f(1)) for `x^{2}`, `x^{10}`, `e^{x}`, `\sin x`, `\frac{1}{x}` and `\tan x`, because the sampler refines where slope or curvature is large. (Phase 1; verified by unit test)
- **G-12** In every pixel column where f is defined throughout, the drawn vertical extent covers at least 90% of f's true range over that column, clipped to the view; the reference uses 64 samples per column. Steep regions therefore reach the view edge, and unresolvable oscillation, such as `\sin(100x)` in the default view or `\sin\frac{1}{x}` near 0, draws as a filled band, never as a false smooth curve. (Phase 1; verified by unit test)
- **G-13** Removable holes and isolated undefined points, such as x = 1 in `\frac{x^{2}-1}{x-1}`, leave no visible break wider than 1 px and get no marker. (Phase 1; verified by unit test)
- **G-14** Jumps in `\operatorname{floor}(x)`, `\operatorname{round}(x)`, `\operatorname{sign}(x)` and piecewise steps get no connector, and the polyline on each side ends within 0.5 px of the jump's x. (Phase 2; verified by unit test)
- **G-15** Each explicit, polar or parametric curve uses at most 20,000 evaluations per view, and each implicit curve or region at most 250,000. Work beyond the budget falls back to the G-12 band, never to an invented curve. (Phase 1; verified by perf test)

### 5.3 Implicit curves and inequalities

- **G-16** Implicit curve points lie within 0.5 px of the true zero set. Closed curves such as `x^{2}+y^{2}=25` have no gap wider than 1 px, and `xy=6` draws both branches with no connector. With `y=5`, both the circle and the tangent line draw, and (0, 5) lies on both within 0.5 px. (Phase 1; verified by unit test)
- **G-17** An inequality shades the side where it holds: every pixel centre more than 1 px from the boundary is shaded exactly when the inequality is true there, and the boundary lies within 1 px of the curve. Compound inequalities such as `1<y<3` shade between both boundaries. Where two shaded rows overlap, the overlap has a higher contrast ratio against the paper than either region alone (TH-8), and shading never lowers a curve below its contrast target (D9, TH-). (Phase 1; verified by unit test)
- **G-18** A restricted inequality such as `y>x\{x>0\}` shades only where the restriction holds, and a polar inequality such as `r<2` shades the enclosed region. (Phase 2; verified by unit test)

### 5.4 Polar and parametric curves

- **G-19** Polar curves measure θ in the current angle unit (NM-25). The default domain is 0 ≤ θ ≤ 12π (0 ≤ θ ≤ 2160 in degrees). Negative r plots in the opposite direction, `r=c` is a circle, and `\theta=c` is the full line through the origin (confirm the default domain and `\theta=c` by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **G-20** Parametric curves default to 0 ≤ t ≤ 1. Polar and parametric rows show their domain as editable inline bounds (`0\le\theta\le12\pi`, `0\le t\le1`), and a restriction on the row narrows that domain. (Phase 2; verified by component test)
- **G-21** Polar and parametric curves meet G-9, G-11 and G-12 over their parameter range, and domain bounds or restrictions clip within 0.5 px of the bound's point. (Phase 2; verified by unit test)
- **G-22** `y=[1,2,3]x` and other list-valued curves draw one curve per element, all in the row's colour and style. (Phase 2; verified by unit test)

### 5.5 Viewport limits and parity

- **G-23** Zooming in stops at a span of 10^-9·max(1, |centre|) per axis, and zooming out stops at a span of 10^15. No bound goes beyond ±10^15, and G-11 holds at both limits. These widen the deployed engine's limits (`karman-calculator/lib/graph.js:11-15`). (Phase 1; verified by unit test)
- **G-24** Every curve in the existing engines' test suites (`src/lib/calculator/engine.test.ts`, `tests/unit/calculator/standalone.test.ts`, `karman-calculator/tests/smoke.mjs`, `tests/calculator/*.spec.ts`) renders in v2 and meets G-9 to G-17. This check gates the Phase 3 switch-over. Its curve inputs are copied once into a committed corpus file under `src/lib/calculator-v2/core/corpus/` (PR-39), so the check keeps running after the removal PR deletes those suites (overview section 8.3). (Phase 3; verified by unit test)

### 5.6 Documented limits (not gates)

The calculator README documents these limits. None of them blocks a phase.

- Double-root contours such as `(y-x)^{2}=0`, and isolated solution points such as `x^{2}+y^{2}=0`, may not draw.
- The self-intersection point of an implicit curve, such as a figure-eight, may show a gap of up to 2 px.
- Implicit components less than 1 px across may not draw.
- Integer arithmetic beyond 2^53 loses precision.

## 6. Points of interest (POI-)

| Graph kind                                     | Intercepts                       | Extrema                                   | Intersections |
| ---------------------------------------------- | -------------------------------- | ----------------------------------------- | ------------- |
| `y=f(x)`, one-parameter functions, regressions | x-intercepts and the y-intercept | local maxima and minima, corners included | yes           |
| `x=g(y)`                                       | y-intercepts and the x-intercept | leftmost and rightmost turning points     | yes           |
| Implicit equations (circles, conics, lines)    | both axes                        | none                                      | yes           |
| Vertical and horizontal lines                  | the axis crossing                | none                                      | yes           |
| Inequality boundaries                          | as the boundary curve            | as the boundary curve                     | yes           |
| Polar, parametric, points, tables              | none                             | none                                      | none          |

- **POI-1** Points of interest appear only for the focused row's graphed curves, as dots. Hidden rows and rows with errors have none. (Phase 2; verified by browser test)
- **POI-2** Each graph kind gets the kinds of point of interest that the coverage table gives it. (Phase 2; verified by unit test)
- **POI-3** Regression curves (D-2) get the `y=f(x)` points of interest. (Phase 3; verified by unit test)
- **POI-4** Intersections are found between the focused row's curves and every other visible graphed curve, including inequality boundaries and vertical lines. (Phase 2; verified by unit test)
- **POI-5** Detection is scale-invariant. Roots come from sign-change bracketing with a bracketing solver, and touching roots from local minimisation of |f| relative to f's local scale. No absolute threshold on |f| is used, so `y=10^{-8}(x-3)` has exactly one root, at 3. (Phase 2; verified by unit test)
- **POI-6** Excluded: poles (`\tan x` has no intercepts at its poles), removable holes (`\frac{x^{2}-1}{x-1}` has nothing at x = 1), restriction endpoints that are not true zeros, and anything outside the row's domain or restriction. (Phase 2; verified by unit test)
- **POI-7** An even-multiplicity root such as (x−2)² is reported once. Points of interest closer than 10^-9·max(1, |x|) merge into one dot that lists every kind; for (x−2)² that is the intercept and the minimum at (2, 0). (Phase 2; verified by unit test)
- **POI-8** Corner extrema, such as the minimum of |x−1| at (1, 0), are found from a sign change in slope. (Phase 2; verified by unit test)
- **POI-9** The search covers the view widened by 10% on each side. Dots are drawn only inside the view and are recomputed when panning or zooming settles. (Phase 2; verified by browser test)
- **POI-10** When a curve has more than 100 points of one kind in the search region, that kind is hidden until the view is zoomed in, so no partial set is shown (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **POI-11** Simple roots and intersections are accurate to 10^-10·max(1, |x*|) in x. Extrema are accurate to 10^-7·max(1, |x*|) in x and 10^-12·max(1, |y*|) in y. A root of multiplicity m is accurate to 10·ε^(1/m)·max(1, |x*|), where ε = 2.2×10^-16. (Phase 2; verified by unit test)
- **POI-12** A label rounds each coordinate to d decimals, where d = ceil(−log10 u) + 1, clamped to 0 to 12, and u is that axis's world units per px. Trailing zeros are trimmed, a label never shows more digits than POI-11's accuracy supports, and outside NM-2's range it uses the ×10^n form. So in the default 800 px wide view, the root of x²−2 labels as 1.414 (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **POI-13** Clicking or tapping a dot shows its label `(x, y)`, formatted by POI-12; A11Y- covers keyboard and screen-reader access. (Phase 2; verified by browser test)
- **POI-14** Pressing on a curve and dragging along it traces the curve: it shows the coordinates of the nearest curve point, labelled by POI-12, and snaps to a point of interest within 8 px (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by browser test)
- **POI-15** A point can be dragged when each coordinate is a numeric literal or a bare slider name, or when one coordinate is a bare slider name and the other depends only on that slider. Dragging rewrites the literals or sets the sliders to values rounded by POI-12, so `(a,a^{2})` moves a and follows the parabola; other points stay fixed. This keeps the deployed engine's literal-point dragging (`karman-calculator/lib/graph.js:81-91`). (Phase 2; verified by browser test)
- **POI-16** The golden cases in the table below pass, using the default view unless stated. (Phase 2; verified by unit test)

| Rows                          | Expected points of interest                                             |
| ----------------------------- | ----------------------------------------------------------------------- |
| `y=x^{2}-2`                   | zeros at (±1.41421356237, 0); minimum and y-intercept merged at (0, −2) |
| `y=(x-2)^{2}`                 | one dot at (2, 0), both zero and minimum; y-intercept (0, 4)            |
| y = absolute value of (x − 1) | minimum (1, 0); y-intercept (0, 1)                                      |
| `y=\tan x`                    | zeros at kπ in view; nothing at the poles                               |
| `y=\frac{x^{2}-1}{x-1}`       | zero (−1, 0); y-intercept (0, 1); nothing at x = 1                      |
| `y=2x+1` and `y=-x+7`         | intersection (2, 5)                                                     |
| `x^{2}+y^{2}=25` and `y=x+1`  | intersections (3, 4) and (−4, −3)                                       |
| `x^{2}+y^{2}=25` and `y=5`    | one intersection, (0, 5)                                                |
| `y=\sin x`                    | 7 zeros: 0, ±π, ±2π, ±3π                                                |
| `y=10^{-8}(x-3)`              | exactly one zero, (3, 0)                                                |

## 7. Golden corpus (shared with Transfer)

- **PR-39** One golden corpus lives under `src/lib/calculator-v2/core/corpus/`, split by category into files under 700 lines. It is the only source of expected parse, classification and display results. The PR-, RC- and NM- Vitest suites and the TR- transfer tests all import it. (Phase 1; verified by unit test)
- **PR-40** Each case has an `id`; `rules`, listing the IDs it checks; an `input` that is `latex`, `keys` (a keystroke list) or `question` (question-dialect KaTeX); optional context `rows` and `settings` (angle unit, complex mode); and an expected `tree`, `latex` (printer output), `kind` (RC- outcome), `display` (NM- text) or `error` code. (Phase 1; verified by unit test)
- **PR-41** A coverage test fails unless every PR-, RC- and NM- ID in this file has at least one case. The G- and POI- golden cases live in the sampler and POI suites and take their row inputs from the corpus. (Phase 1; verified by unit test)
- **PR-42** The corpus has cases for these SAT forms: lines in slope-intercept, point-slope and standard form; quadratics in vertex, factored and expanded form; exponential growth and decay with percent rates (`P(t)=500(1.03)^{t}`, `(1.20)^{x/4}`); function notation; systems of two linear equations and a linear–quadratic system; numeric circle equations; absolute value, radical and rational functions, including one with a hole; inequalities, compound inequalities and systems of inequalities; and mixed numbers, percents and degree measures in question dialect. (Phase 1; verified by unit test)
- **PR-43** The corpus has cases for `x_{1}`, `y_{1}` tables with blank cells, coordinate pairs as points and as table rows, and function coordinates as a table row, a point and an `f(2)` row; the `f(2)` case asserts a call with a value, never f·2, so Evaluate either uses f's existing definition or writes the question's definition first, and is otherwise shown disabled with its reason, including when f is defined nowhere (TR-31, TR-62). (Phase 3; verified by unit test)
- **PR-44** Every TR- outcome names a corpus case. The transfer tests assert that the LaTeX written into the row parses to that case's tree and kind. Transferred inequalities and compound inequalities in x, y or both, and each such line of a transferred system of inequalities, classify as shaded regions (RC-14) and graph with shading, overlaps included (G-17; TR-11, TR-12); a transferred inequality whose only free names are not coordinates, such as `3p+4>19`, classifies by RC-13 (chip for p, nothing graphed); transferred circle equations classify as implicit curves (RC-12, TR-14). (Phase 1; verified by unit test)

The Phase 1 plan grows the corpus; it has no fixed size. An REA capture that contradicts a default updates the rule, its cases and its tests in the same pull request.

## 8. Phase summary

| Phase | IDs                                                                                                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | PR-1 to PR-27, PR-29, PR-36 to PR-42, PR-44; RC-1 to RC-15, RC-17, RC-19 to RC-21; NM-1 to NM-6, NM-8 to NM-14, NM-16 to NM-22, NM-24 to NM-29, NM-42, NM-43; G-1, G-5 to G-13, G-15 to G-17, G-23 |
| 2     | PR-31, PR-32, PR-34; RC-16, RC-18; NM-7, NM-15, NM-30 to NM-38, NM-41, NM-44; G-2 to G-4, G-14, G-18 to G-22; POI-1, POI-2, POI-4 to POI-16                                                        |
| 3     | PR-30, PR-43, PR-45; NM-39, NM-40; G-24; POI-3                                                                                                                                                     |
| 4     | PR-28, PR-33, PR-35; NM-23                                                                                                                                                                         |

## 9. Review findings resolved here

| Finding                      | Resolution                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F2 grammar                   | PR-1 to PR-38 and PR-45 state the grammar, precedence, dialects and typing outcomes; PR-39 to PR-44 define the shared corpus; section 1 makes both existing engines non-normative |
| F15 row semantics            | RC-1 to RC-21 and the classification table; PR-43 and PR-44 tie Transfer outcomes, including `f(2)`, to corpus cases                                                              |
| F16 points of interest       | POI-1 to POI-16: coverage table, exclusions, scale-invariant detection, multiplicity-aware accuracy, labels, caps and golden cases                                                |
| F17 domains and complex mode | NM-10 to NM-16 for real mode, NM-17 to NM-22 for complex mode, NM-23 for the Complex category (R3)                                                                                |
| F18 angle mode               | NM-24 to NM-29; G-19 to G-21 for polar and parametric domains                                                                                                                     |
| F19 display and tolerances   | NM-1 to NM-9, the limits table, NM-42 to NM-44                                                                                                                                    |
| F20 lists                    | PR-34, NM-30 to NM-41, G-22                                                                                                                                                       |
| C6 graph correctness         | G-9 to G-24 and the documented limits                                                                                                                                             |
