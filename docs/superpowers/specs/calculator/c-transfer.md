# Calculator, part C: Transfer to Calculator

Date: 2026-10-16 · Status: owner decisions of 2026-10-16 applied · Parent:
[2026-10-16-calculator-design.md](../2026-10-16-calculator-design.md)

This file specifies Transfer to Calculator from end to end: which question content gets a control
and how each math segment, table and answer choice is classified; exactly what each transfer
inserts in the calculator, including x₁/y₁ naming, collisions, repeat transfers and `f(2)`; how
the control is revealed and operated with a mouse, a keyboard, touch and assistive technology; the
format chooser; what happens after a transfer; the data contract; phasing; and tests. It replaces
§7 of the first draft and resolves review findings F3, F4, F5 and C4, using the repository code
cited inline as ground truth.

**IDs defined here:**

- Sources and default deny: TR-1 to TR-6
- Classifying math segments: TR-7 to TR-21
- Tables: TR-22 to TR-25
- What a transfer inserts: TR-26 to TR-39
- Answer choices: TR-40 to TR-42
- The control: TR-43 to TR-53
- Touch: TR-54 to TR-59
- Format chooser: TR-60 to TR-63
- After a transfer: TR-64 to TR-70
- Data contract and code layout: TR-71 to TR-75
- Release: TR-77
- Corpus and bank checks: TR-79 to TR-80

## 1. Owner requirements (verbatim)

> make sure that a student can press a small button labeled "Transfer to Calculator" on points,
> tables, functions, expressions, and equations. They pop up exactly how they should on the
> calculator row, formatted properly, with tables being formatted as x_1, y_1. Also, make sure that
> coordinates and function coordinates can be exported either in a table or as a coordinate pair.
> For function coordinates, a third option: just ask for the function coordinate. The button needs
> to be small and unobtrusive, and only appear if you hover over the proper equation table,
> coordinate pair, expression, or function in the quiz engine. Exporting anything to the calculator
> will automatically open the calculator on the left-hand side of the quiz engine on desktop and
> just open up the calculator on the full screen on mobile. On mobile, the user needs to actually
> click the thing they want to export, then export, and then click the export to calculator button
> afterward that appears on top of it. Again, just make sure the button is like a little calculator
> button with an arrow going up to the right, so it looks like an export calculator button. Also,
> make sure you cannot export figures, graphs, histograms, bar charts, box plots, volumetric
> figures, or circles into the actual calculator. If it's not an expression, equation, coordinate
> pair, table, function, or function coordinate, then it cannot be exported.

Owner confirmations already given:

- The third option puts `f(2)` in a row so the calculator evaluates it.
- Desktop docking applies when the viewport is at least 1024 px wide and more than 500 px tall;
  otherwise a transfer opens the calculator full screen (TR-64, section 17 item 6).
- On 2026-10-16 the owner confirmed the seven readings of this text listed in section 17; each is a
  fixed rule, not a pending default.

Earlier handoff requirement: direct export of equations, expressions, tables, points and function
points from questions without student notation cleanup, using x1/y1-style table variables correctly.

## 2. Related parts and terms

| Part                               | Rules this file relies on                                                                                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| d-architecture-integration.md      | AR-: availability, docked and full-screen layouts, lazy loading, bridge and the AR-11 version-switching wrappers, bundle budget. API-: the public methods `transfer/apply.ts` uses, and `setBlank()` |
| a-math-semantics.md                | PR-: grammar, relation chains (PR-29) and canonical LaTeX. RC-: row classification, definitions, reserved names. G-17: inequality shading                                                            |
| b-functions-and-data.md            | D-: table behaviour, point styles, zoom fit                                                                                                                                                          |
| e-ux-keypad-accessibility-theme.md | K-2 keypad and system keyboard, AN- motion, TH- skin tokens, A11Y- speech, SC- Scientific mode, T-12 paste normalisation                                                                             |

| Term                   | Meaning                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Item                   | One thing that can carry a control: a math segment, a system block, a question table, or a whole answer choice              |
| Control                | The Transfer to Calculator button attached to one item                                                                      |
| Numeric constant       | Built only from numbers, signs, `\frac`, `\sqrt`, `\pi`, parentheses, `\cdot`, `\div` and integer powers; contains no names |
| Question function name | A name the question treats as a function (TR-19)                                                                            |
| Point table            | A two-column calculator table that collects table-row transfers (TR-34)                                                     |
| Canonical LaTeX        | The printer's output for a row (PR-37); used only for the TR-35 duplicate check                                             |
| Unused name            | Not defined by any row, not a table column header, and not referenced by any row in the calculator                          |
| Fine and coarse reveal | Fine: revealed by a mouse, a hovering pen or the keyboard. Coarse: revealed by touch or a pen tap                           |

## 3. Sources and default deny

- **TR-1** Controls come only from these sources in a math question: the math segments of `question_text` (inline `$…$` and `\(…\)`, display `$$…$$`, reviewed serialized function lines), the native question table (`figure_kind = "table"` with `figure_table_data`), each answer choice's `choice_text` taken whole, and each `choice_table_data`. (Phase 1; verified by unit test)
- **TR-2** Nothing else gets a control: passages, hints, explanations, review screens, table captions and footers, individual table cells, prose outside math delimiters and the student's own answers render none. (Phase 1; verified by component test)
- **TR-3** Figures never get a control and the classifier never reads their data: `image_url` images, `figure_kind` image, svg, graph, geometric, 3d_shape, other and chart, every `ChartKind` (scatterplot, line_graph, bar_chart, function_plot, boxplot, pie), `figure_chart_data` including function_plot expressions, and `figure_geometry_data`. (Phase 1; verified by unit test)
- **TR-4** Controls render only where the calculator itself is available for the question under CalculatorScope's existing eligibility, the condition under which AR-10's useCalculator() returns a bridge (math question in a math section, quiz active and not read-only), so Reading and Writing questions render none. (Phase 1; verified by browser test)
- **TR-5** Default deny: content that fails any rule in sections 4 and 5, or whose type is not enabled in the current phase (TR-77), gets no control, and nothing is rendered in its place (no disabled control). (Phase 1; verified by unit test)
- **TR-6** The classifier splits question text with the same function MathText uses, moved from `src/components/learn/MathText.tsx:43-118` into a shared framework-free module, so each rendered segment maps to exactly one classification result by index. (Phase 1; verified by unit test)

The owner's blocked list mapped to repository content:

| Owner term             | Repository representation                                          | Result                                             |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| Figures                | `image_url`; `figure_kind` image, svg, other                       | No control                                         |
| Graphs                 | `figure_kind` graph; charts scatterplot, line_graph, function_plot | No control                                         |
| Histograms, bar charts | Chart bar_chart; histograms in raster images                       | No control                                         |
| Box plots              | Chart boxplot                                                      | No control                                         |
| Volumetric figures     | `figure_kind` 3d_shape                                             | No control                                         |
| Circles                | Circle figures in geometric, svg and image figures                 | No control; circle equations are equations (TR-14) |

## 4. Classifying math segments

### 4.1 Normalisation

- **TR-7** Each segment is normalised by table 4.1 before classification, the transfer inserts exactly that normalised LaTeX, and nothing else about the author's notation changes. (Phase 1; verified by unit test)

Table 4.1, normalisation:

| Source                                                                                             | Becomes                             |
| -------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Unicode minus `−`, or an en dash `–` used as minus                                                 | `-`                                 |
| `\times`, `×`, `·` between factors                                                                 | `\cdot`                             |
| `÷`                                                                                                | `\div`                              |
| `\dfrac`, `\tfrac`                                                                                 | `\frac`                             |
| `\leq`, `\geq`, `≤`, `≥`                                                                           | `\le`, `\ge`                        |
| `\displaystyle`, `\big`-family sizing, `\,` `\;` `\:` `\!` `\quad`, `\text{ }` holding only spaces | Removed                             |
| `{,}` between digit groups, as in `30{,}000`                                                       | Removed (thousands separator)       |
| Superscript digits `²`, `³` in plain text                                                          | `^{2}`, `^{3}`                      |
| `π`, `θ`, `√(…)` in plain text                                                                     | `\pi`, `\theta`, `\sqrt{…}`         |
| Plain `a/b` with integers a and b in plain text                                                    | `\frac{a}{b}`                       |
| Overline on decimal digits, as in `0.\overline{3}`                                                 | Exact fraction, as in `\frac{1}{3}` |
| Absolute value bars `\|…\|`                                                                        | `\left\|…\right\|`                  |
| One trailing `,` `.` `;` or `:` inside the delimiters                                              | Removed                             |
| Mixed numbers                                                                                      | TR-28                               |

### 4.2 Grammar and exclusions

- **TR-8** A segment may contain only the forms in table 4.2; any other token or command means no control. (Phase 1; verified by unit test)
- **TR-9** A segment containing any token in the "excluded" column of table 4.2 gets no control. (Phase 1; verified by unit test)
- **TR-10** In question-stem segments, lone symbols get no control: a lone number (signed integer, decimal, `\frac` of two integers or mixed number), a lone identifier with optional subscript, a lone identifier with a numeric power such as `x^{2}`, and a lone function reference with a bare-identifier argument such as `f(x)`; the rule does not apply to a whole answer choice. (Phase 1; verified by unit test)

Table 4.2, allowed and excluded forms:

| Allowed                                                                                                           | Excluded                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Numbers; Latin and Greek identifiers, optionally subscripted (`x_{1}`, `a_{n}`)                                   | The identifier `i`; primes (`'`, `\prime`); a run of three or more letters that is not an allowed command                                                          |
| `+ - \cdot \div /`, `^{…}`, `\frac`, `\sqrt` with optional index, parentheses, absolute value                     | Brackets `[ ]`; matrix environments; `?`; ellipses (`\ldots`, `\cdots`, `\dots`, `...`)                                                                            |
| `=`; `<`, `>`, `\le`, `\ge` (classified by TR-11)                                                                 | `\approx \sim \cong \equiv \ne \neq \pm \mp \infty`; `\in \notin \subset \cup \cap \to \Rightarrow \iff`                                                           |
| `\sin \cos \tan \csc \sec \cot \arcsin \arccos \arctan \sinh \cosh \tanh \ln \log \exp`, trig `^{-1}`, `\log_{b}` | Non-space `\text`, `\mathrm`, `\textrm`, `\mbox`; degree marks `^\circ`, `°`; currency; `\%`                                                                       |
| Commas inside function arguments and coordinate pairs                                                             | Geometry: `\angle \measuredangle \triangle \overleftrightarrow \overrightarrow \widehat \parallel \perp \square \odot \circ`; `\overline` except on decimal digits |
| System environments (TR-12)                                                                                       | Units cm, mm, km, ft, yd, mi, in, hr, kg, lb, oz, mL directly after a digit                                                                                        |

### 4.3 Types

- **TR-11** A segment with no relation symbol is an expression; one with exactly one `=` and no other relation is an equation; one whose relations are only `<`, `>`, `\le` and `\ge`, all pointing the same way as PR-29 allows (such as `y>2x+1` or `0\le x<10`), is an inequality and transfers like an equation, as one row; an inequality in x, y or both graphs with shading (RC-14, G-17), and one whose only free names are not coordinates, such as `3p+4>19`, follows RC-13; a chain that mixes directions, mixes `=` with another relation or contains more than one `=` gets no control (owner confirmation 1). (Phase 1; verified by unit test)
- **TR-12** A system is a segment whose top level is a `cases`, `aligned`, `gathered` or one-column `array` environment, optionally wrapped in `\left\{ … \right.`; it is one item whose lines become one row each with `&` removed, it gets a control only if every line is an equation or an inequality passing every rule (systems of inequalities and mixed systems included, owner confirmation 1), and a `cases` block on the right of a definition (a piecewise function) gets no control. (Phase 1; verified by unit test)
- **TR-13** Equation subtypes all transfer as single rows: function definitions `name(v) = expr` with a one-letter name (optionally subscripted) and one identifier argument, variable definitions as RC- defines them, graphable relations, and other single equations such as `3p+4=19`; how each row then behaves follows RC- rules. (Phase 1; verified by unit test)
- **TR-14** Circle equations such as `(x-2)^2+(y+1)^2=9` are equations and get a control; "circles" in the owner's blocked list means circle figures (owner confirmation 2). (Phase 1; verified by unit test)
- **TR-15** A coordinate pair is `(a,b)` with numeric constants a and b, or two or more such pairs in one segment separated only by commas or semicolons; a capital letter directly before a pair (`A(2,3)`) is a point label and is not transferred, and pairs containing any name, such as `(h,k)` or `(2a,0)`, get no control. (Phase 3; verified by unit test)
- **TR-16** An interval is not a pair: `(a,b)` gets no control when the prose of the same sentence before it contains "interval", "domain" or "range". (Phase 3; verified by unit test)
- **TR-17** A function coordinate is `name(a) = b` where name is a question function name and a and b are numeric constants. (Phase 3; verified by unit test)
- **TR-18** In a segment, `name(…)` is a function call only when name is a question function name; otherwise it is implicit multiplication, such as `a(x+3)`, and transfers unchanged. (Phase 1; verified by unit test)
- **TR-19** A name is a question function name if a stem segment defines it as a function, or if the prose of the stem or answer choice places it directly after "function" or "functions" (for example "the function $f$" or "functions $f$ and $g$"). (Phase 1; verified by unit test)
- **TR-20** A segment that calls a question function name gets a control only when exactly one stem segment exportably defines that name (transferred with it under TR-37) or when the call is the left side of a function coordinate, so `y=f(x)` with f undefined gets no control instead of becoming f times x. (Phase 1; verified by unit test)
- **TR-21** Every output the classifier accepts must analyse in the calculator core with no row error, and where a fixture shows disagreement the classifier is narrowed, never the core loosened. (Phase 1; verified by unit test)

### 4.4 Examples

| Stem segment                                               | Outcome                                              |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| `y=2x+3`                                                   | Equation, one row                                    |
| `P(t)=500(1.03)^{t}`                                       | Function, one row                                    |
| `3p+4=19`                                                  | Equation, one row (RC- decides the display)          |
| `x`, `5`, `x^{2}`, `f(x)`, `\frac{3}{4}`                   | No control (lone symbol)                             |
| `2x`, `\sqrt{50}`, `2^{10}`                                | Expression, one row                                  |
| `\triangle ABC`, `\angle B=90^\circ`, `\overline{AB}=5`    | No control (geometry, degree mark)                   |
| `\$12.50`, `15\%`, `x\ne3`, `12\text{ cm}`, `\approx 3.14` | No control                                           |
| `f'(x)`, `(3+2i)(1-i)`, `[2,5]`                            | No control (prime, `i`, brackets)                    |
| `y>2x+1`                                                   | Inequality, one shaded row (owner confirmation 1)    |
| `-2<x\le5`                                                 | Compound inequality, one shaded row                  |
| `0<x>2`, `x=y<3`                                           | No control (mixed chain)                             |
| `(x-2)^2+(y+1)^2=9`                                        | Equation (owner confirmation 2)                      |
| `\begin{cases}y=2x\\y=x+1\end{cases}`                      | System, two rows                                     |
| `\begin{cases}y\ge x^{2}\\y<4\end{cases}`                  | System of inequalities, two shaded rows              |
| `(2,5)`                                                    | Coordinate pair                                      |
| `(2,5)` after "on the interval"                            | No control                                           |
| `(1,2),(3,4)`                                              | Coordinate pair, two points                          |
| `f(2)=5` after "the linear function $f$"                   | Function coordinate                                  |
| `g(x)=f(x)+3` with `f(x)=x^2` in the stem                  | Function; `f` is transferred first when it is unused |
| `y=f(x)` after "the function $f$", with no definition of f | No control                                           |

## 5. Tables

- **TR-22** A table is eligible only in one of the two shapes in table 5.1, where a label is a non-empty cell that is not a numeric constant after normalisation; categorical, two-way, frequency-with-total, mixed-shape and non-numeric tables get no control. (Phase 3; verified by unit test)
- **TR-23** The first variable (first column of a vertical table, first row of a horizontal one) is the input; a table has 1 to 8 variables and 1 to 200 data points, and a one-variable table transfers as a single `x_{n}` column. (Phase 3; verified by unit test)
- **TR-24** Cells must be numeric constants after TR-7 normalisation; thousands separators in cells such as `30,000` are removed, fractions stay fractions and decimals stay decimals with no rounding or conversion, and a cell holding a unit, currency, percent, text, a blank, a dash or a stand-in letter such as `k` makes the whole table ineligible. (Phase 3; verified by unit test)
- **TR-25** The input column is `x_{n}` and the k output columns are `y_{n}` … `y_{n+k-1}`, where n is the lowest positive integer for which all those names are unused (so a two-column table in an empty calculator becomes `x_{1}`, `y_{1}`); header labels are not put into the calculator (CB-1 disables notes) and the status message reports the mapping (TR-67). (Phase 3; verified by unit test)

Table 5.1, accepted shapes:

| Shape      | Rule                                                                                                                                 | Variables |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| Vertical   | Every header cell is a label (or there is no header row) and every body cell is numeric                                              | Columns   |
| Horizontal | In every row, header row included, the first cell is a label and the rest are numeric; only the header row's first cell may be empty | Rows      |

| `header_row`                | `rows`              | Result                                           |
| --------------------------- | ------------------- | ------------------------------------------------ |
| `x`, `y`                    | `1,3` / `2,5`       | `x_{1}`, `y_{1}`                                 |
| `t`, `h(t)`                 | numeric             | `x_{1}` (t), `y_{1}` (h(t))                      |
| `x`, `f(x)`, `g(x)`         | numeric             | `x_{1}`, `y_{1}`, `y_{2}`                        |
| `x`, `0`, `1`, `2`          | `y,3,5,7`           | Horizontal: `x_{1}` = 0, 1, 2; `y_{1}` = 3, 5, 7 |
| none                        | `x,0,1` / `y,3,5`   | Horizontal                                       |
| empty, `2019`, `2020`       | `Sales,5,7`         | Horizontal: `x_{1}` = years                      |
| `Year`, `Population`        | `1990,30,000`       | `x_{1}`, `y_{1}`; the cell becomes `30000`       |
| `Score`                     | `85` / `90`         | `x_{1}` only                                     |
| empty, `Yes`, `No`, `Total` | `Male,12,8,20`      | No control (categorical)                         |
| `x`, `y`                    | a cell `$12` or `?` | No control                                       |

## 6. What a transfer inserts

- **TR-26** An expression, equation, inequality or function becomes one row with the normalised LaTeX, rendered in 2D by MathQuill; an inequality row in x, y or both graphs as a shaded region under RC-14 and G-17, one whose only free names are not coordinates follows RC-13, and one with no free names follows RC-14. (Phase 1; verified by unit test)
- **TR-27** A system becomes one row per line, inserted as consecutive rows in source order. (Phase 1; verified by unit test)
- **TR-28** A mixed number is recognised by the PR-6 rule (an integer literal directly followed by `\frac{p}{q}` with integers 0 < p < q, when the integer starts the math or follows an operator, relation, comma or opening bracket), applied after TR-7 has turned plain-text `2 1/2` into `2\frac{1}{2}`; it becomes an improper fraction in table cells and point coordinates (`\frac{5}{2}`) and a parenthesised sum elsewhere (`\left(2+\frac{1}{2}\right)`, negative `-\left(2+\frac{1}{2}\right)`); typed input follows PR- rules unchanged. (Phase 1; verified by unit test)
- **TR-29** A coordinate pair transferred as Point becomes one row `(a,b)` per pair in order, and as Table row each pair is appended as one row of the coordinate point table (TR-34). (Phase 3; verified by unit test)
- **TR-30** A function coordinate `f(a)=b` transferred as Point becomes the row `(a,b)`, as Table row appends `(a, b)` to f's point table (TR-34), and as Evaluate inserts the row `f(a)` under TR-31. (Phase 3; verified by unit test)
- **TR-31** Evaluate is enabled only when the calculator already defines f and `f(a)` analyses to a number with no error or slider prompt (only `f(a)` is inserted), or when the calculator does not define f and the stem has exactly one exportable definition of f whose other free names each have a value in the calculator or an exportable stem definition that TR-37 inserts in the same transfer (that definition is inserted first, then `f(a)`); otherwise it is disabled with its reason (TR-62), so it never inserts a row that errors or creates slider prompts. (Phase 3; verified by unit test)
- **TR-32** A transfer writes its first row into the last row of the expression list when that row is empty (as after a reset, R-10) and appends the rest after it, expands a collapsed list, and leaves settings and existing rows untouched apart from TR-33. (Phase 1; verified by component test)
- **TR-33** A transfer always targets the Graphing calculator; if Scientific is showing, the calculator switches to Graphing and keeps the Scientific state under SC- rules. (Phase 2; verified by component test)
- **TR-34** Table-row transfers go to a point table keyed by source (one for plain coordinate pairs, one per function name), created on first use with two columns named by TR-25 and appended to while it exists with exactly two columns, otherwise replaced by a new point table; a question table never receives points and a point never goes into a question table. (Phase 3; verified by unit test)
- **TR-35** Repeat transfers never duplicate: a row whose canonical LaTeX equals an existing row, a table from a source item already transferred with unchanged columns and values, and a pair equal to an existing row of the target point table are not inserted again; the existing content is focused and the status reports it (TR-67). (Phase 1; verified by unit test)
- **TR-36** When a transferred function or variable definition (RC-) would redefine a name the calculator already defines differently, that definition and every reference to it in the same transfer are renamed to `b_{n}` (b the base letter, n the lowest integer ≥ 2 with `b_{n}` unused), existing rows are never modified, and the status reports the rename. (Phase 1; verified by unit test)
- **TR-37** When a segment references a name defined by exactly one exportable stem segment, that definition is inserted first in the same transfer if the name is unused, and the calculator's own definition is used (nothing inserted) if it already defines the name; answer choices are never a dependency source. (Phase 1; verified by unit test)
- **TR-38** Each transfer is a single undo step that removes everything it added (dependencies, renamed definitions and appended table rows included) without closing the calculator or changing the view. (Phase 1; verified by component test)
- **TR-39** After a table, coordinate-pair or function-coordinate transfer, if none of the transferred points lies inside the current graph bounds, the view fits them using the D- zoom-fit rule; expression, equation, inequality and function transfers never change the view. (Phase 3; verified by browser test)

## 7. Answer choices

- **TR-40** A whole answer choice is one item, eligible when every math segment in it passes (TR-10 excepted) and its text outside math is only whitespace, commas, semicolons or "and"; a choice with no delimiters is one segment when its whole text is plain math (digits, Latin letters, `+ - − × · ÷ / ^ = < > ≤ ≥ ( ) . ,`, `π`, `√`, `²`, `³`); several pairs make a coordinate-pair item, anything else transfers as rows in order, and table choices follow section 5. (Phase 1; verified by unit test)
- **TR-41** A transfer never selects, changes, submits, crosses out or restores an answer: the control is a sibling of the answer button, label or radio, never inside one, and its pointer and key events never reach answer handlers; this matters because in the diagnostic the first selection locks the answer and shows the explanation (`src/components/diagnostic/_hooks/useDiagnosticState.ts:84,191-197`). (Phase 1; verified by browser test)
- **TR-42** In every mode (practice, catalog skill practice, daily questions and the diagnostic) each answer choice's control sits in the choice's tool cluster: beside cross-out in practice, catalog skill practice and the diagnostic (for a table choice, the header row holding its cross-out button, `src/components/learn/quiz/TableChoiceOption.tsx:68-77`), and in daily questions, which have no cross-out (`src/components/learn/DailyChallenge.tsx:147-180`), in the cluster AR-11 adds after the choice's label. On touch screens, meaning whenever the `(any-pointer: coarse)` media query matches, that control is always visible at the TR-43 coarse size, as the `(hover: none)` rule already keeps the practice and catalog cross-out cluster visible (`src/components/learn/quiz/workspace.module.css:141-145`); otherwise it shows while the pointer is over the choice or focus is within its tool cluster. A tap on the choice itself only selects the answer exactly as today: it never selects the choice as a transfer item, shows no TR-55 outline and puts no control on top of the choice. Tapping the control transfers or opens the chooser under TR-56 (owner confirmation 3). (Phase 1; verified by browser test)

## 8. The control

- **TR-43** The glyph is Karman's own icon, a calculator outline with an arrow pointing up and to the right, built from the lucide-react `Calculator` and `ArrowUpRight` glyphs the site already uses, at 16 px for fine reveal and 20 px for coarse reveal, with no visible text on the button; the owner's 'labeled "Transfer to Calculator"' is met by the TR-50 accessible name and the TR-51 tooltip, which both begin with that text, so the button itself stays small (owner confirmation 7). (Phase 1; verified by visual test)
- **TR-44** The hit area is at least 24×24 CSS px for fine reveal and at least 44×44 CSS px for coarse reveal and in every answer-choice tool cluster. (Phase 1; verified by browser test)
- **TR-45** Each item has exactly one real `<button type="button">`, placed in DOM order right after the item, or for an answer choice inside its tool cluster (TR-42); the math is never made focusable, and while hidden, a stem or question-table control is visually clipped and an answer-choice control is at opacity 0 in its tool cluster (AR-11); either way the button stays in the accessibility tree and tab order (never `display:none`, `visibility:hidden` or `aria-hidden`). (Phase 1; verified by component test)
- **TR-46** The control is an overlay that never shifts layout or changes how the math wraps: for an inline segment it sits above the end of the segment's last line, overlapping the math box by at least 4 px so no gap separates them, and for display math and tables it sits inside the top-right corner of the block or figure frame; answer-choice controls sit in the tool cluster (TR-42). (Phase 1; verified by visual test)
- **TR-47** With a mouse or hovering pen a stem or question-table control appears at once when the pointer enters the item or the control, stays while the pointer is over either with no timer, and hides at once when the pointer leaves both unless the control has focus or its chooser is open; answer-choice controls follow TR-42 and AR-11: always visible while (any-pointer: coarse) matches, otherwise shown only while the pointer is over the choice or focus is within its tool cluster, even when the host keeps the cluster itself visible (for example a crossed-out diagnostic choice). (Phase 1; verified by browser test)
- **TR-48** The control is visible whenever it has keyboard focus (`:focus-visible`), with a 2 px focus ring, and while it has focus or its chooser is open the item shows the selected outline (TR-55). (Phase 1; verified by browser test)
- **TR-49** Escape hides a hover- or tap-revealed control and its tooltip without moving focus or the pointer (unless a chooser is open), the control stays hidden until the pointer leaves and re-enters the item or the item is tapped again, and Escape is consumed only when it hid something; Escape never hides an answer-choice control that TR-42 keeps always visible. (Phase 1; verified by browser test)
- **TR-50** The accessible name is "Transfer to Calculator: " plus the description in table 8.1, unique within the question (repeats get ", occurrence 2" and so on) and starting with the visible tooltip text as WCAG 2.5.3 requires. (Phase 1; verified by component test)
- **TR-51** A tooltip reading "Transfer to Calculator" appears after 300 ms of hover on the control or at once on keyboard focus, sits next to the control with no gap, stays while the pointer is on the control or the tooltip, hides on Escape, and is not shown on touch (owner confirmation 7). (Phase 1; verified by browser test)
- **TR-52** The control, tooltip, selected outline and chooser appear and disappear with no animation, because question text and answer choices are Hold territory (`docs/brand.md:232-234`); calculator motion after a transfer follows AN- rules. (Phase 1; verified by browser test)
- **TR-53** In all 12 skins, using TH- tokens, the glyph is at least 4.5:1 against the button background, the button boundary, focus ring and selected outline are at least 3:1 against the adjacent page colour, and chooser text is at least 7:1. (Phase 1; verified by contrast test)

Table 8.1, descriptions in accessible names:

| Item                                       | Description                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Expression, equation, inequality, function | Plain-text form of the math, up to 60 characters, then "…"                                                          |
| System                                     | "system of n equations", "system of n inequalities", or "system of n equations and inequalities" when it mixes both |
| Coordinate pair                            | "point (a, b)", or "n points"                                                                                       |
| Function coordinate                        | "f(a) = b"                                                                                                          |
| Table                                      | "table, n rows", with the caption when there is one                                                                 |
| Answer choice                              | "choice B"                                                                                                          |

## 9. Touch

- **TR-54** The pointer type of the triggering event sets the interaction mode (mouse or hovering pen: hover reveal; touch or pen tap: tap-select; keyboard: focus reveal), and neither device class nor viewport width ever does, with one exception: the always-visible answer-choice control follows the `(any-pointer: coarse)` media query (TR-42); docking uses viewport size only (TR-64). (Phase 1; verified by component test)
- **TR-55** A tap (touch or pen contact moving at most 10 px and lifting in less than 500 ms) on an eligible stem item or question table selects it: the item gets a 2 px solid outline offset by 2 px as a non-colour indicator, the control appears on top of it at 44×44, and only one item is selected at a time (owner confirmation 5); answer choices are never tap-selected as transfer items (TR-42). (Phase 1; verified by browser test)
- **TR-56** Tapping the control transfers a single-result item at once and opens the chooser only for coordinate pairs and function coordinates, where there is a format to pick, and tapping the selected item again deselects it (owner confirmation 5). (Phase 1; verified by browser test)
- **TR-57** Selection clears on a tap outside the item and control, Escape, the calculator opening, a transfer or a question change, never times out, and survives scrolling, with the control moving with the item. (Phase 1; verified by browser test)
- **TR-58** A long press (500 ms or more), a drag, or any gesture ending with a non-collapsed text selection never selects an item; native selection, copy and the Highlight tool work as today, and taps select nothing while Highlight mode is active. (Phase 1; verified by browser test)
- **TR-59** While visually hidden, the control stays in the accessibility tree with its TR-50 name and no `aria-hidden` (TR-45), and a `click` with no preceding `pointerdown` (the event VoiceOver and TalkBack dispatch on double-tap) transfers or opens the chooser at once, with no TR-55 selection step. (Phase 1; verified by component test)

## 10. Format chooser

- **TR-60** The control for a coordinate pair or function coordinate is a menu button (`aria-haspopup="menu"`, `aria-expanded`) that opens a `role="menu"` on click, tap, Enter, Space or ArrowDown, with the keyboard model in table 10.1. (Phase 3; verified by component test)
- **TR-61** Options, in order, are "Point" and "Table row" for coordinate pairs, and "Point", "Table row" and "Evaluate f(a)" (with the item's real name and argument) for function coordinates; initial focus goes to the format last used in this question, or to "Point". (Phase 3; verified by component test)
- **TR-62** A disabled Evaluate option is focusable but cannot be activated (`aria-disabled="true"`) and shows one reason as visible secondary text referenced by `aria-describedby`: "f isn't defined in the calculator or this question", "f uses a, which has no value", "f has more than one definition in this question", or "f(a) has no value in the calculator", the last used when the calculator defines f and `f(a)` is an error or undefined for any reason other than a name with no value; the option is never hidden, including when f is defined nowhere (owner confirmation 4). (Phase 3; verified by component test)
- **TR-63** The chooser is anchored to the control, opens above the item when there is room and below otherwise, never covers the control, has items at least 44 px tall for coarse reveal and 32 px for fine reveal, and stays inside the viewport with a 16 px margin. (Phase 3; verified by browser test)

Table 10.1, chooser keyboard model:

| Key or action        | Result                                   |
| -------------------- | ---------------------------------------- |
| ArrowDown, ArrowUp   | Move between items, wrapping at the ends |
| Home, End            | First or last item                       |
| A letter             | First item whose label starts with it    |
| Enter, Space         | Activate the focused item                |
| Escape               | Close and return focus to the control    |
| Tab                  | Close and move focus on                  |
| Click or tap outside | Close                                    |

## 11. After a transfer

- **TR-64** A transfer opens the calculator if it is closed or minimized, using the AR- docked layout on the left of the quiz workspace with the workspace shifted right when the viewport is at least 1024 px wide and more than 500 px tall (owner confirmation 6), and the AR- full-screen layout otherwise (AR-21), for touch and mouse alike. (Phase 1; verified by browser test)
- **TR-65** If the calculator is already open, a floating or maximized window becomes docked when the viewport meets the TR-64 size rule (AR-21) and keeps its rows, a docked or full-screen calculator stays as it is, and every transfer in a question adds to the same calculator. (Phase 1; verified by browser test)
- **TR-66** After a mouse or keyboard transfer, focus moves into the math field of the new row (or the row TR-35 matched) with the caret at the end; after a touch transfer that row becomes the active row and scrolls into view, the system keyboard does not open, and the keypad keeps its state (K-2). (Phase 1; verified by browser test)
- **TR-67** One polite `role="status"` region, rendered by `CalculatorScope` as a sibling of the quiz workspace and the calculator window (outside the calculator's shadow root and never inside an inert or `aria-hidden` subtree, including in full screen), announces each result in plain text using table 11.1. (Phase 1; verified by component test)
- **TR-68** Closing the calculator returns focus as L-10 and AR-27 state: to the control that opened it (the Transfer control whose transfer opened it, the toolbar Calculator button or the side button) if it is still in the document, and otherwise to the toolbar Calculator button; a later transfer into an already open calculator does not change that target. (Phase 1; verified by browser test)
- **TR-69** Pressing Transfer starts the lazy calculator load (AR-), the payload is held and applied exactly once when the calculator is ready, a load failure is announced after a mount failure the held payload is applied exactly once after a successful Retry, and after a load failure held payloads are discarded, and a question change discards it. (Phase 1; verified by browser test)
- **TR-70** Every payload carries the question key and the bridge drops any payload whose key does not match the current question; the selection, point tables, last-used format and held payloads reset with the rest of the per-question calculator state when the calculator remounts and calls `setBlank()` (R10, AR-58); display size and reverse contrast, which persist for the page session (S-9), are not transfer state, and a transfer never changes them. (Phase 1; verified by browser test)

Table 11.1, status messages:

| Result                    | Message                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rows added                | "Added to calculator: {description}."                                                                                                                  |
| Table added               | "Added table to calculator: {input name} is {header 1}, {output name} is {header 2}, …, {k} rows." (header parts omitted when absent)                  |
| Pair appended             | "Added to table {input name}, {output name}, row {r}."                                                                                                 |
| Already present           | "Already in the calculator, row {n}."                                                                                                                  |
| Renamed                   | "Added as {new name} because {name} is already defined."                                                                                               |
| Core check failed (TR-73) | "This can't be added to the calculator."                                                                                                               |
| Calculator failed to load | "Calculator unavailable. Use Retry in the calculator panel."; after a load failure the message is "Calculator unavailable. Reload the page to use it." |
| Too many waiting (AR-17)  | "Too many transfers are waiting. Try again when the calculator has opened."                                                                            |

## 12. Data contract and code layout

- **TR-71** The bridge (`transfer()`, AR-10) carries the `TransferPayload` below, declared in `src/lib/calculator-transfer/payload.ts` (AR-16), and the lazy `transfer/apply.ts` validates it with Zod and applies it through public API methods only; no API transfer method exists. (Phase 1; verified by unit test)
- **TR-72** Names (TR-25, TR-36), duplicate checks (TR-35), dependency insertion (TR-37) and point-table choice (TR-34) are decided when the calculator applies the payload, never in the classifier. (Phase 1; verified by unit test)
- **TR-73** Before inserting anything the calculator analyses the payload; if any row would error, or the transfer would take the list past the NM-42 row limit or a row past its character limit, nothing is inserted, the status reads "This can't be added to the calculator.", and the existing error reporter receives only the question id and the classifier rule ID. (Phase 1; verified by unit test)
- **TR-74** The classifier and payload builders live in framework-free `src/lib/calculator-transfer/` and the control in `src/components/calculator/TransferControl.tsx`, rendered in the quiz page DOM rather than the calculator's shadow root. Neither imports MathQuill, the calculator React UI, plot, render, worker or `src/lib/calculator/` (AR-1, AR-3). The apply step `src/components/calculator/transfer/apply.ts` is imported only by the lazy calculator chunk, and the eager quiz-route cost stays inside AR-33's 10 KB gzip budget for all eager calculator code. (Phase 1; verified by perf test)
- **TR-75** Classification takes at most 10 ms per question under 4× CPU throttle, and press-to-visible-row takes at most 400 ms under the same throttle, measured from a press with the calculator chunk cached and the calculator not yet mounted in this question, so the budget includes mounting. (Phase 1; verified by perf test)

```ts
interface TransferPayload {
  version: 1;
  questionKey: string; // attempt id + question id
  sourceId: string; // "stem:3", "table", "choice:B", …
  description: string; // plain text, as in table 8.1
  format: "rows" | "point" | "tableRow" | "evaluate" | "table";
  dependencies: string[]; // stem definitions to insert first when unused (TR-37)
  rows?: string[]; // rows, point rows, or the evaluate row
  table?: { headers: (string | null)[]; columns: string[][] }; // first column is the input
  pairs?: [string, string][]; // tableRow format
  pointTableKey?: string; // "points" or the function name (TR-34)
}
```

The first draft's `transferTarget` constructor option is dropped: the quiz host decides docking
(TR-64), and transfers enter only through the bridge and `transfer/apply.ts`. The paste path
(T-12) reuses the TR-7 normalisation functions for KaTeX plain-text copies and Unicode operators.

## 13. Release

- **TR-77** Phase 1 enables expressions, equations, inequalities (compound ones included), functions, systems of equations, inequalities or both, and answer choices of those types; segments using `\sinh`, `\cosh` or `\tanh` are enabled from Phase 2, when FN-68 ships; Phase 3 enables tables (table answer choices included), coordinate pairs, function coordinates, the chooser, point tables, Evaluate and the view fit; a type not yet enabled gets no control. Until RC-16 and RC-18 ship in Phase 2, a segment gets no control if its rows would use θ, use r outside an RC-6 definition (`A=\pi r^{2}` stays enabled), or contain a point whose parts depend on a t that no row defines. RC-2 makes such rows `unsupported` errors in Phase 1, and TR-21 forbids a control the core would reject. From Phase 2 these segments follow TR-21 against RC-16 to RC-18 and RC-17. The TR-79 corpus has a Phase 1 blocked fixture for each. (Phase 1; verified by unit test)

## 14. Tests

- **TR-79** The committed synthetic fixtures in `src/lib/calculator-transfer/__fixtures__/`, one file per required corpus category below and each under 700 lines, have at least one fixture per rule outcome, allowed and blocked, in every category below, and each fixture runs classifier → payload → apply on a headless calculator, asserting control presence, chooser options, the inserted TR-7 normalised LaTeX and the PR-44 tree it parses to (or the table columns), and zero analysis errors. (Phase 1; verified by unit test)
- **TR-80** `npm run check:transfer-bank` runs the TR-79 assertions over every live math question with read-only database credentials and reports counts per type; its assertions are unit-tested on the TR-79 fixtures, and a run with zero classifier–core disagreements and zero exceptions is recorded in the Phase 3 plan. (Phase 3; verified by unit test)

Required corpus categories (Phase 3 categories are added when TR-77 enables them):

- Every TR-9 exclusion and every TR-10 lone-symbol form, each also as a whole answer choice.
- Common SAT forms: slope-intercept, standard form, vertex form, `P(t)=500(1.03)^{t}`, `C=8h+15`,
  `3p+4=19`, circle equations and systems.
- Inequalities (`y>2x+1`, `y\le-x+4`, `3p+4>19`), same-direction compound inequalities, mixed
  chains, systems of inequalities and mixed systems, each also as a whole answer choice.
- Phase 1 polar and parametric blocks (TR-77): `2\pi r`, `\sin\theta=\frac{3}{5}` and
  `(\cos t,\sin t)` get no control, while `A=\pi r^{2}` keeps its control.
- Pairs, several pairs, intervals, symbolic pairs and labelled points.
- `f(2)=5` with and without a rule for f, with an undefined parameter, with two definitions of f,
  with a parameter defined by a second stem definition, and with a calculator definition of f for
  which `f(2)` is undefined or an error.
- Every row of the section 5 example table, plus `30,000`, `\frac{1}{3}`, `0.\overline{3}`,
  `-2 1/2`, a blank cell and a nine-column table.
- Collisions: an existing `x_{1}`, a regression that references `y_{1}`, a second definition of `f`,
  repeat transfers and point-table appends.

Component and browser cases:

| Layer                                                        | Cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component (RTL, jsdom)                                       | `$x$` in prose and `$\angle B$` render no control, while `$x$` as a whole choice does; unique names and one tab stop per item; tap-select of a stem item with `pointerType: "touch"`; a touch tap on an answer choice selects the answer and no transfer item; activating the control never calls `onSelect` or `onAnswer`; chooser keyboard model and disabled-Evaluate reason; status messages                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Browser (Playwright: desktop Chromium, iPhone WebKit, Pixel) | Hover persists along a pointer path from item to control; Escape dismissal; 24 px and 44 px targets; answer-choice controls visible with no hover on iPhone and Pixel in practice, catalog skill practice, daily questions and the diagnostic, and tapping one transfers while the answer stays unselected and the diagnostic stays unlocked; an inequality transfer produces a shaded row; docking at 1023×800, 1024×800 and 1280×800, including floating to docked; 1024×500 and 1280×480 open full screen while 1024×501 docks; phone full screen; focus in the new row with no system keyboard on touch; per-question reset with display size and reverse contrast kept; blocked chunk shows the failure status and Retry applies the transfer once; a transferred table's points are within `graphpaperBounds` |
| Visual                                                       | Control at rest, hover, focus, touch-selected and chooser open, and the always-visible answer-choice control on touch, in representative light and dark skins                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Contrast                                                     | TR-53 targets in all 12 skins                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Perf                                                         | TR-74 bundle cost and TR-75 timings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## 15. Findings resolved

| Finding                             | Resolved by                                                                |
| ----------------------------------- | -------------------------------------------------------------------------- |
| F3 output undefined                 | TR-22 to TR-39, TR-71, TR-72, TR-79, TR-80; `transferTarget` dropped (§12) |
| F4 touch flow and chooser           | TR-41, TR-42, TR-54 to TR-63, TR-66, TR-77                                 |
| F5 WCAG 1.4.13, 2.5.8 and names     | TR-44 to TR-51, TR-59, TR-60                                               |
| C4 which inline math gets a control | TR-1 to TR-21, examples in §4.4, owner confirmations 1 and 2               |

## 17. Owner confirmations

The owner confirmed these readings of the section 1 text on 2026-10-16. They are fixed rules, and
the overview records them as owner-confirmed in its owner-interpretations list.

1. **Inequalities.** Inequalities, same-direction compound inequalities, systems of inequalities
   and systems mixing equations and inequalities are transferable like equations: they get the
   control and land as rows that graph with shading (TR-11, TR-12, TR-26). (overview 10.3 item 1)
2. **Circle equations.** Circle equations are exportable as equations; only circle figures are
   blocked (TR-14). (item 2)
3. **Answer choices on touch.** On touch screens every answer choice, in every mode, has a small
   always-visible Transfer icon in its tool cluster beside cross-out, and a tap on the choice only
   selects the answer; all other content keeps the tap-the-item, then tap-the-control flow (TR-42,
   TR-55). (item 3)
4. **Evaluate without a definition.** When f is defined neither in the calculator nor in the
   question, "Evaluate f(a)" is shown disabled with a short reason (TR-31, TR-62). (item 4)
5. **Mobile wording.** "Click the thing, then export, then click the button on top of it" means tap
   the item, tap the control that appears on top of it, then pick a format only when there is a
   choice (TR-55, TR-56). (item 5)
6. **Docking size.** Docking applies when the viewport is at least 1024 px wide and more than 500 px
   tall; otherwise the calculator opens full screen, including on phones in landscape and in desktop
   windows 500 px tall or less such as 1280×480 (TR-64, AR-21). (item 7)
7. **Button label.** 'labeled "Transfer to Calculator"' means an icon-only button, a small
   calculator with an up-right arrow, whose tooltip on hover and keyboard focus reads "Transfer to
   Calculator" and whose accessible name starts with that text (TR-43, TR-50, TR-51). (item 8)
