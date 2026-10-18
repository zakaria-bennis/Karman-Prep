# Karman calculator v2: UX, keypad, accessibility and theme

This part of the [Karman calculator v2 design](../2026-10-16-karman-calculator-v2-design.md)
defines what a student sees, touches and hears in Karman calculator v2: the calculator
window and its layouts, expression rows, typing behaviour and MathQuill configuration, the desktop
and mobile keypads and the functions panel, settings, keyboard-first operation, the Scientific
calculator, animation, screen-reader and audio support, and how every colour is derived from the
12 site skins so that the approved contrast targets hold. Each checklist line is a testable
acceptance item with its phase and test layer. Math meaning (parsing, evaluation, number display,
graphing, points of interest) lives in `a-math-semantics.md`; function definitions and data in
`b-functions-and-data.md`; Transfer to Calculator in `c-transfer.md`; architecture, the MathField
adapter and the public API in `d-architecture-integration.md`.

IDs defined here:

- Layout and window: L-1 to L-15
- Rows: R-1 to R-10
- Typing: T-1 to T-13
- Keypad: K-1 to K-12
- Settings: S-1 to S-9
- Keyboard: KB-1 to KB-14
- Scientific mode: SC-1 to SC-15
- Animation: AN-1 to AN-14
- Screen readers and audio: A11Y-1 to A11Y-15
- Theme and contrast: TH-1 to TH-18

## Conventions

- Line format: `**ID** statement. (Phase N; verified by <layer> test)`. Layers: unit, component
  (Vitest + RTL), browser (Playwright, `playwright.calculator.config.ts` projects), visual,
  contrast, perf.
- "Confirm by REA behaviour capture in Phase N" marks a default written from general mathematical
  and UI knowledge. The lead confirms or adjusts it with owner-authorised REA capture (timing and
  screenshots only) and records the result in that phase's plan. No Desmos code, scripts, DOM,
  assets, icons, fonts, logo or exact visual design is copied.
- "Karman addition" marks behaviour the owner asked for that is not part of test-day parity.
- "Owner-confirmed" marks a decision or recommended default the owner confirmed on 2026-10-16;
  the overview's owner-interpretations list records each one.
- Switch-over gate: every ID in Phases 1 to 3 below, including every A11Y- essential and every
  SC- item, must pass before the `calculatorV2` default switch.

### Evidence used

- REA accessibility captures from 2026-10-16 (kept outside the repository): desktop keypad (b1),
  functions panel (f1), graph settings (d1), add-item menu (e1), typing `y=x^2+3/4`,
  `y=ax+b` and `y=\sqrt{x}+\pi` (a1, a2, a4), and the mobile toolbar with and without a curve
  (c1, c4). The mobile keypad itself, timings and the Scientific calculator were not captured.
- Current calculator: `src/components/calculator/CalculatorShell.tsx` (floating window, paste,
  Ctrl/Alt+K at 201-210, Escape and isolation at 228-237), `CalculatorScope.tsx` (breakpoints at
  42-45, focus return and inert background at 58-84, 48vw dock at 103-111),
  `calculator.module.css` (z-index 72, docked width at 248, focus colour `#2f72dc` at 279),
  `karman-calculator/lib/ui.js` (theme observer at 23-27, `announce()` at 38, keyboard at
  395-451), `karman-calculator/src/index.html` (toolbar and shortcuts at 36-71),
  `tests/calculator/layout.spec.ts` (graph summary, keyboard zoom and Home, Clear all).
- Quiz host: `src/components/learn/QuizEngine.tsx:148-149` (scope keyed per question),
  `src/components/diagnostic/_hooks/useDiagnosticState.ts:240-270` (window-level Enter and
  Escape shortcuts), `src/components/learn/quiz/QuizTools.tsx:37` (`useQuizAnimations`, the
  persisted Question animations setting).
- Brand: `docs/brand.md:186-206` (motion tokens, no overshoot, reduced motion) and `:232` (no
  motion in question text or answer choices); `docs/enhanced-quiz-engine.md:66-68` (calculator
  integration) and `:118` (44 px touch targets).
- Skins: `src/lib/themes/palettes.ts` (12 skins: 4 dark, 8 light).

## 1. Layouts and the calculator window

Breakpoint terms used below: **wide** means viewport width at least 1024 px and viewport height
greater than 500 px, whatever the input device (touch tablets included, with coarse-pointer key
sizes); **narrow** means anything else. Docking and the floating window apply only on wide
viewports, and narrow viewports open full screen (owner-confirmed).

- **L-1** Desktop layout (calculator container at least 560 px wide): expression list on the left (default 40% of the container, minimum 260 px), graph on the right; list toolbar in this order: Add item, Undo, Redo, Edit list, Collapse list; graph controls at the top right: Settings, Zoom in, Zoom out, and Home only while the view differs from the default. (Phase 1; verified by browser test)
- **L-2** Stacked layout (calculator container narrower than 560 px): graph on top, then a toolbar with Add item, Keypad toggle, Undo, Redo, Edit list, Collapse list, then the expression list, then the keypad when open; graph controls at the top right of the graph; with the keypad closed the graph gets at least 40% of the height. (Phase 1; verified by browser test)
- **L-3** Rows are numbered from 1 in a left gutter; the focused row shows a filled left bar in the focused-row colour and a 2 px outline (colours from TH-3). (Phase 1; verified by visual test)
- **L-4** Opening outside a transfer: the quiz toolbar Calculator button and the mobile side button open the floating window (L-6) on wide viewports and full screen (L-11) on narrow viewports; both stay available only in Math questions, as today. (Phase 1; verified by browser test)
- **L-5** v2 uses `CALCULATOR_DOCK_MIN_WIDTH = 1024` and `FULL_SCREEN_QUERY` (width 1023 px or less, or height 500 px or less) from `src/components/calculator/breakpoints.ts` (AR-19) in place of the deployed 1100 px threshold (`CalculatorScope.tsx:45`), so docking and the floating window need a viewport at least 1024 px wide and more than 500 px tall, and every other viewport opens full screen. (Phase 1; verified by browser test)
- **L-6** The floating window keeps every v1 behaviour, re-skinned: drag by the title bar, resize from a corner handle (minimum 360 x 280 px), Maximize and Restore, Minimize (hides the window and keeps its work), default size `min(880px, 100vw - 32px)` by `min(600px, 100dvh - 80px)` at (16, 64), and position clamped inside the viewport on every resize; in the quiz the window sits at z-index 72 in every mode, below the scratchpad at 74, as in v1. (Phase 1; verified by browser test)
- **L-7** On a wide viewport a transfer docks the calculator as a left column of the quiz workspace, default width `clamp(400px, 45vw, 720px)`, resizable with a separator (role `separator`, pointer drag, Left/Right arrow keys in 16 px steps, Home and End) between 400 px and `min(900px, 100vw - 480px)` (AR-23), with the question column forced to a single column while docked. (Phase 1; verified by browser test)
- **L-8** The calculator picks L-1 or L-2 from its own container width (ResizeObserver on the host), not from the viewport, so a narrow dock or floating window uses the stacked layout. (Phase 1; verified by browser test)
- **L-9** A transfer while the floating window is open converts it to the dock and keeps all rows; dock state lives in the page-session window store `calculator-window-store.ts` (AR-25), so docking persists across Previous and Next while the calculator contents still reset per question; from Phase 4 the same store holds Display size and Reverse contrast for the page session (S-9). (Phase 1; verified by browser test)
- **L-10** Closing the dock or floating window restores the full question width in the same frame and returns focus to the opener (the Transfer control or toolbar button); if the opener is gone, focus goes to the toolbar Calculator button. (Phase 1; verified by browser test)
- **L-11** Full screen (narrow viewports, including phone landscape at height 500 px or less): a modal dialog covering the viewport, with the quiz workspace inert and its scroll locked, Tab contained in the calculator, and focus returned to the opener on close. (Phase 1; verified by browser test)
- **L-12** The window title bar (light DOM, outside the test-day UI) holds, in order: the label "Karman calculator", the Graphing/Scientific mode control (SC-1), the Paste button (L-13), Keyboard shortcuts (KB-1), the window controls of the current mode from the AR- mode table (floating: Maximize, Minimize; docked: Undock, Maximize, Minimize; maximized: Restore, Minimize; full screen: none), and Close; its colours come from the TH-5 eager chrome sheet (TH-2). (Phase 1; verified by component test)
- **L-13** The Paste button reads the clipboard (plain text, LaTeX, CSV, TSV or a single HTML table), inserts math as a row or a table as an x₁/y₁ table using the paste rules shared with Transfer (`c-transfer.md`), falls back to a labelled "Math to paste" text box with Insert and Cancel when clipboard reading is denied, and rejects image and drop input with a status message. (Phase 1; verified by browser test)
- **L-14** At every supported size from 320 x 568 to 1920 x 1080 the calculator has no horizontal scroll (WCAG 1.4.10), and the focused row is never covered by the keypad, toolbar or a popover (WCAG 2.4.11): the list scrolls the focused row into view with bottom scroll padding equal to the keypad height. (Phase 1; verified by browser test)
- **L-15** The standalone page served by the v2 standalone build uses the same L-1 and L-2 layouts at full viewport with the mode control, Paste button and Keyboard shortcuts in its header and no floating, dock or Close controls; z-order in the quiz is unchanged (calculator 72, scratchpad 74). (Phase 3; verified by browser test)

## 2. Expression rows

- **R-1** Each row's gutter tab shows its curve colour and line or point style; activating it hides or shows the graph of that row, with `aria-pressed` reflecting visibility. (Phase 1; verified by component test)
- **R-2** A row with an error shows a warning marker in the gutter and a plain-language message below the math (wording from `a-math-semantics.md`), sets `aria-invalid`, and does not plot. (Phase 1; verified by component test)
- **R-3** Each row has a Delete control; Enter creates a new row below and focuses it; Up and Down move between rows when the caret cannot move further up or down inside the math. (Phase 1; verified by browser test)
- **R-4** Rows can be reordered by drag, duplicated, and given a colour (the six slots of TH-10) and a line style (solid, dashed, dotted) or point style (filled, open, cross) from a style picker opened from the gutter tab by long-press, right-click or the Edit list menu. (Phase 2; verified by browser test)
- **R-5** A row that evaluates to a number or list shows its value right-aligned below the math, formatted by the number-display rules of `a-math-semantics.md`, with a fraction/decimal toggle when the value is an exact fraction. (Phase 1; verified by component test)
- **R-6** A row with undefined variables shows an `add slider:` group with one button per variable plus `all`, and a note naming them ("Too many variables. Try defining a or b." when more than one is undefined). (Phase 2; verified by component test)
- **R-7** Sliders show min, max and step fields, the value, and a Play/Pause control; play options are speed (0.25x, 0.5x, 1x, 2x, 4x) and loop mode (back and forth, forward loop, play once), defaulting to 1x and back and forth (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by browser test)
- **R-8** Edit list mode shows, for every row, Delete, Duplicate, Move up, Move down and the style picker, plus a Clear all button at the top of the list (KB-5) and a Done button that leaves the mode. (Phase 2; verified by component test)
- **R-9** Backspace in an empty row deletes it and focuses the end of the previous row; Delete in an empty row deletes it and focuses the start of the next row; the last remaining row is never deleted, only emptied. (Phase 1; verified by browser test)
- **R-10** A new question, Clear all and `setBlank()` all leave exactly one empty row, numbered 1; after Clear all that row has focus (KB-5), and after a new question or `setBlank()` it receives focus when the calculator is next opened (KB-4). (Phase 1; verified by component test)

## 3. Typing and MathQuill configuration

Each rule is a behaviour of the MathField adapter (`d-architecture-integration.md`). It is
configured through options of the pinned MathQuill commit `1cbc1c4128` where that commit offers
them (for example `autoSubscriptNumerals`, `charsThatBreakOutOfSupSub`, `autoCommands`,
`autoOperatorNames`, `restrictMismatchedBrackets`, `sumStartsWithNEquals`,
`supSubsRequireOperand`, `substituteTextarea`), and in the adapter otherwise.

- **T-1** `^` opens an exponent; Right arrow at the end of the exponent leaves it; `-` typed as the first character of an empty exponent stays inside (`x^{-1}`). (Phase 1; verified by component test)
- **T-2** `/` turns the preceding term into the numerator of a stacked fraction and puts the caret in the denominator; typing `y=x^2+3/4` yields `y=x^{2}+\frac{3}{4}`. (Phase 1; verified by component test)
- **T-3** `sqrt` becomes a square root, `cbrt` a cube root, `nthroot` an n-th root, `pi` π, `theta` θ, `tau` τ, `phi` φ, `infinity` and `infty` ∞, `sum` Σ with lower and upper limits, `prod` Π, `int` ∫; every non-member name in the PR-12 allowlist module (PR-12's member names are excluded) `src/lib/calculator-v2/core/latex/operator-names.ts` (the `b-functions-and-data.md` function names plus `with`, `for`, `and`, `or`, `of`) is configured as a MathQuill operator name, and the auto-commands listed above come from the same module. (Phase 1; verified by component test)
- **T-4** `<=` and `>=` become ≤ and ≥; `_` opens a subscript; a digit typed directly after a letter becomes a subscript (`x1` gives `x_{1}`), matching the x₁/y₁ table names. (Phase 1; verified by component test)
- **T-5** LaTeX copy and paste round-trips inside and between rows, and each row exposes MathSpeak-style speech text, for example "y equals x squared plus 3 fourths" and "y equals Start Root, x, End Root plus pi". (Phase 1; verified by component test)
- **T-6** `+`, `-`, `=`, `<`, `>`, `~` and `,` typed inside a non-empty exponent or subscript leave it before inserting the character, so typing `x^2-1` gives `x^{2}-1` (confirm the exact character set by REA behaviour capture in Phase 1). (Phase 1; verified by component test)
- **T-7** `*` displays as a centred dot (`\cdot`), `~` displays as `\sim`, three dots `...` display as an ellipsis inside lists and ranges, and `%` displays as a percent sign. (Phase 1; verified by component test)
- **T-8** Typing `(`, `[`, `{` or `|` inserts a matching pair with the caret inside; typing the closing character steps over it; mismatched brackets are not allowed. (Phase 1; verified by component test)
- **T-9** Typing a function name does not insert parentheses automatically; the keypad and functions-panel buttons insert the name with an empty parenthesis pair and the caret inside (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by component test)
- **T-10** The integer part of a number renders with thin-space groups of three in rows and results (confirm by REA behaviour capture in Phase 1); grouping is rendering only and never appears in the stored LaTeX, the NM- display strings used by the corpus and the API, or speech text. (Phase 1; verified by component test)
- **T-11** The MathField's hidden textarea has `autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`, and an `inputmode` set by the adapter: `none` while the on-screen keypad is open, `text` otherwise, so the phone keyboard never appears over the keypad. (Phase 1; verified by browser test)
- **T-12** Pasting plain text into a row normalises calculator notation (`sqrt(x)`, `x^2`, `pi`, `<=`, `x1`) into the same LaTeX that typing it would produce; pasting a table into a row goes through L-13 instead; pasting a selection of rendered question math inserts the math once, taken from the `application/x-tex` annotation in the `text/html` clipboard when present and otherwise from the plain text with KaTeX's repeated MathML text removed, and Unicode operators (² ³ − × · ÷ ≤ ≥ π √) are normalised by PR-4 and TR-7; corpus cases cover a copied inline segment, a copied display segment and a Unicode-only string. (Phase 1; verified by unit test)
- **T-13** A row accepts up to 2,048 characters of LaTeX; a longer paste or insertion is refused with a status message and leaves the row unchanged. (Phase 1; verified by component test)

## 4. Keypad

### 4.1 Desktop tray

The tray observed on the public graphing calculator on 2026-10-16 (capture b1) is three groups of keys:

| Group  | Row 1        | Row 2      | Row 3              | Row 4               |
| ------ | ------------ | ---------- | ------------------ | ------------------- |
| Left   | x, y, a², aᵇ | (, ), <, > | \|a\|, comma, ≤, ≥ | ABC, audio, √, π    |
| Centre | 7, 8, 9, ÷   | 4, 5, 6, × | 1, 2, 3, −         | 0, ., =, +          |
| Right  | Functions    | ←, →       | Backspace          | Enter (accent fill) |

- **K-1** On fine pointers the desktop tray has exactly the keys and positions in the table above (coarse pointers use the K-6 right group), Karman's own glyphs and icons, and a Hide keypad control; keys are at least 44 x 44 CSS px on coarse pointers and at least 32 x 32 CSS px otherwise. (Phase 1; verified by component test)
- **K-2** On fine-pointer devices the keypad starts hidden and a Show keypad control sits at the bottom left of the calculator; on coarse-pointer devices the keypad starts closed and opens when a row is focused by touch, and if the student closes it with the Hide keypad control (K-1) or the L-2 toolbar Keypad toggle, later touches on rows use the phone keyboard until the student opens it again with Show keypad or that toggle; both defaults re-apply on every question (confirm by REA behaviour capture on a touch-emulated profile in Phase 1). (Phase 1; verified by browser test)
- **K-3** The ABC key switches the left and centre groups to a letters page and back (desktop, 10 columns): `q w e r t y u i o p` / `a s d f g h j k l θ` / `Shift z x c v b n m ′ ~` / `123` (4 wide), subscript, `!`, `%`, `[`, `{`, `:`; Shift capitalises the next letter only (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by component test)

### 4.2 Functions panel

The panel lists these categories in this order (owner order, with Complex between Matrices and
Advanced):

1. Trig: sin, cos, tan, csc, sec, cot
2. Inverse trig: sin⁻¹, cos⁻¹, tan⁻¹, csc⁻¹, sec⁻¹, cot⁻¹
3. Statistics: mean, median, min, max, quartile, quantile, stdev, stdevp, var, varp, cov, covp, mad, corr, spearman, stats, count, total
4. List operations: repeat, join, sort, shuffle, unique, for
5. Visualizations: histogram, dotplot, boxplot
6. Probability distributions: normaldist, tdist, chisqdist, uniformdist, binomialdist, poissondist, geodist, discretedist, pdf, cdf, inversecdf, random
7. Inference: ztest, ttest, zproptest, chisqtest, chisqgof, null, p, pleft, pright, score, dof, stderr, conf, lower, upper, estimate
8. Calculus: exp, ln, log, logₐ, d/dx, f′, ∫, Σ, Π
9. Hyperbolic trig: sinh, cosh, tanh, csch, sech, coth
10. Geometry: polygon, distance, midpoint
11. Custom colors: rgb, hsv, okhsv, oklab, oklch
12. Number theory: lcm, gcd, mod, ceil, floor, round, sign, ⁿ√, nPr, nCr
13. Matrices: det, trace, rref, rank, rows, columns, transpose, matrix template, ; (row separator)
14. Complex: real, imag, conj, arg
15. Advanced: tone, with, and, or

- **K-4** The Functions key opens a scrollable panel above the keypad (desktop) or covering the keypad area (stacked layout) with the categories above in that order, each under a heading; categories appear as their functions ship (Phase 1: categories 1 and 2, and category 8 with exp, ln, log and logₐ only; Phase 2: category 3 with FN-23 to FN-29, and categories 9 and 12; Phase 3: the rest of category 3, and categories 4 to 7; Phase 4: the rest of category 8, and categories 10, 11, 13, 14 and 15), the order test checks the shipped subset in every phase, and the full list is complete in Phase 4; a typed function name works as soon as `b-functions-and-data.md` implements it, whatever the panel shows. (Phase 4; verified by component test)
- **K-5** Activating a panel button inserts its template at the caret (`\sin\left(\right)` with the caret inside, `\log_{}` with the caret in the subscript, `\frac{d}{dx}`, an integral or sum with the caret in the lower limit), closes the panel and returns focus to the row; Escape closes the panel and returns focus to the Functions key (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by component test)

### 4.3 Mobile keypad

Default layout for calculator containers narrower than 600 px: 7 columns by 6 rows, keys at
least 44 x 44 CSS px at 320 px width (7 x 44 = 308 px plus 4 px side padding), all 37 desktop
keys plus a `~` key (Karman addition):

| Row | Keys, left to right                             |
| --- | ----------------------------------------------- |
| 1   | Functions (2 wide), ←, →, ~, Backspace (2 wide) |
| 2   | x, y, a², 7, 8, 9, ÷                            |
| 3   | (, ), aᵇ, 4, 5, 6, ×                            |
| 4   | <, >, √, 1, 2, 3, −                             |
| 5   | ≤, ≥, π, 0, ., =, +                             |
| 6   | ABC, \|a\|, comma, audio, Enter (3 wide)        |

Phone letters page (7 columns, alphabetical so every key keeps 44 px; owner-confirmed): `a-g` /
`h-n` / `o-u` / `v w x y z θ Shift` / subscript, `!`, `%`, `[`, `{`, `~`, `:` / `123`, `′`,
`←`, `→`, Backspace, Enter (2 wide).

- **K-6** Calculator containers narrower than 600 px use the 7 x 6 keypad and phone letters page above, with keys at least 44 x 44 CSS px at every width from 320 to 599 px; wider containers, including phone landscape at 844 x 390, use the K-1 tray, whose right group on coarse pointers becomes two columns (Functions 2 wide; ←, →; ~, Backspace; Enter 2 wide) to add the `~` key (confirm the main-page layout by REA behaviour capture on a touch-emulated profile in Phase 1; the phone letters page is owner-confirmed). (Phase 1; verified by browser test)
- **K-7** Double-tap equals (Karman addition): a second activation of the on-screen `=` key in a Graphing-mode expression row (K-7 does not apply in Scientific mode, where each `=` press inserts `=` as typed) within 300 ms of the first, with no other input between them, replaces the `=` just inserted with `~`; the result is one `~`, one undo step returns to `=`, the live region announces "tilde", hardware typing `==` is never converted, and keypad keys use `touch-action: manipulation` so the double-tap never zooms the page. (Phase 1; verified by browser test)
- **K-8** Easier mobile regression (Karman addition, and the v1 Add regression capability): every table shows a Regression button (in the table header on stacked layouts and on coarse pointers in every layout; on L-1 with a fine pointer, as the item "Add regression for table n" in the first column header's menu (D-9), opening the same D-3 model menu) that opens a model menu (linear, quadratic, exponential, logarithmic, power, constant) and inserts the chosen model as a new row below the table using the table's own column names (`y_1\sim mx_1+b` for linear, model forms from `b-functions-and-data.md`), graphed and focused; from a transferred x₁/y₁ table on a phone at 390 x 844 or 844 x 390 a linear regression takes at most 2 taps (D-3). (Phase 3; verified by browser test)
- **K-9** The audio key is present on the main page of the Graphing keypads (the K-1 tray and the K-6 phone keypad); the ABC letters pages and the Scientific keypads (SC-3, SC-4) have no audio key; it is named "Audio trace", shows `aria-pressed` while the keyboard trace runs, and starts or stops the keyboard trace of the keypad's row (POI-20) exactly as Alt/Option+T does; A11Y-13's tones join it in Phase 4. (Parity; verified by component test)
- **K-10** Each key inserts through one adapter call: characters with `typedText`, structures with `cmd` (`a²` writes `^2`, `aᵇ` opens `^`, `√` writes `\sqrt`, `|a|` writes `|`), arrows and Backspace with `keystroke`, Enter with the row's Enter action; a key press never moves focus out of the row. (Phase 1; verified by component test)
- **K-11** Keypad keys give press feedback by background tone only (AN-11), never by scale, and repeat Backspace and arrow keys while held (first repeat after 400 ms, then every 80 ms). (Phase 1; verified by component test)
- **K-12** Opening the keypad, the ABC page or the Functions panel never changes which row is focused or the caret position. (Phase 1; verified by browser test)

## 5. Settings and add menu

- **S-1** The Settings control opens a popover anchored to it, listing in order: Display size (default, large), Reverse contrast, Grid, Cartesian or Polar grid, Arrows, Axis numbers, Minor gridlines, then for each axis a show checkbox, a label field, bounds edited as inline math `a ≤ x ≤ b`, and a step field, then More options, Complex mode and Angle (Radians, Degrees); there is no Braille mode control. (Phase 1; verified by component test)
- **S-2** Add item is a toolbar button named "Add item" with `aria-haspopup="menu"` and `aria-expanded`; it opens a `role="menu"` named "Add item" with exactly two `menuitem`s, "Add expression" then "Add table", each an icon with the one-word visible label Expression or Table (owner decision 3 of 2026-10-18: no inference item; Note, Folder and Image never appear, CB-1). (Parity; verified by component test)
- **S-3** Display size large scales UI text, math and axis numbers by 1.25 (UI 14 to 17.5 px, math 18 to 22.5 px, axis numbers 13 to 16.25 px) without horizontal scroll, the 7:1 text target still applies (no large-text exception), and the choice persists for the page session per S-9. (Phase 4; verified by visual test)
- **S-4** The Reverse contrast checkbox switches the calculator to the reverse-contrast colours of TH-13 within one frame; its page-session value (S-9) starts checked when the operating system reports `prefers-contrast: more` at the first calculator creation of the page session and unchecked otherwise, and after that changes only when the student toggles it. (Phase 4; verified by browser test)
- **S-5** The Complex mode checkbox ships in Phase 1 with the complex-mode rules NM-17 to NM-22 (owner-confirmed), keeping v1's complex toggle, off by default and reset per question (S-9). (Phase 1; verified by component test)
- **S-6** Angle defaults to Radians on every question (D5); changing it updates every dependent row and is announced (A11Y-2). (Phase 1; verified by browser test)
- **S-7** Axis bounds fields accept any expression that evaluates to a finite number, apply on Enter or blur, keep min below max (an invalid pair shows an inline error and leaves the view unchanged), and the step field accepts a positive number or blank for automatic. (Phase 1; verified by component test)
- **S-8** More options reveals Lock viewport (disables pan and zoom by pointer, wheel, keys and buttons) and Show axis labels in multiples of π; both default off (confirm by REA behaviour capture in Phase 1). (Phase 2; verified by component test)
- **S-9** Every per-question setting resets to its default on each new question (D5; per-question reset, AR-58): Graphing mode, Radians, grid on and Cartesian, axis numbers and minor gridlines on, arrows off, default bounds, Lock viewport and multiples-of-π labels off, complex mode off, keypad per K-2; Display size (S-3) and Reverse contrast (S-4) are the only settings that do not reset (owner-confirmed): each is one value for Graphing and Scientific mode, held in `calculator-window-store.ts` (AR-25) for the page session, so a new question's calculator starts with the stored values while all math, rows, sliders, tables, viewport and other settings start fresh. (Phase 1; verified by browser test)
- **S-10** The Add item menu opens on click, Enter, Space or ArrowDown with focus on its first item (the ring only for keyboard opens); ArrowDown and ArrowUp move with wrapping, Home and End go to the first and last item (a Karman addition: Desmos ignores Home); Enter or Space activates the focused item and closes the menu; Escape closes it and returns focus to Add item, consuming that Escape (KB-3); Tab closes it and leaves focus on Add item; activating Add item again closes it; a pointer press outside closes it and still reaches its target, and a press in the empty list area adds no row (appendix F requirements 4 to 13). (Parity; verified by component test)
- **S-11** The menu is a popover inside the calculator container, anchored below Add item on the L-1 layout and to its right on the L-2 stacked layout (never a bottom sheet), and does not dim the graph (appendix F requirements 14 to 16). (Parity; verified by component test)
- **S-12** Every Add item insertion goes immediately after the last active row (kept after focus leaves the list) or at the end when no row has been active; Add expression always inserts a new empty row and focuses it; Add table replaces the active row in place when it is an empty expression row and otherwise inserts after it; each insertion, an in-place replacement included, is one undo step (appendix F requirements 17 to 20 and 23). (Parity; verified by component test)
- **S-13** Each insertion is announced in the live region with the item's number, for example "Table 2 added" or "Expression 3 added" (Karman addition for A11Y-2). (Parity; verified by component test)

## 6. Keyboard-first operation

| Keys                     | Where                            | Action                                                       |
| ------------------------ | -------------------------------- | ------------------------------------------------------------ |
| Enter                    | expression row                   | new row below (Scientific: evaluate, then new row)           |
| Alt+Enter                | anywhere in the calculator       | new expression row at the end, focused                       |
| Up, Down                 | row, caret at top or bottom edge | previous or next row                                         |
| Ctrl/Cmd+Z               | anywhere in the calculator       | undo                                                         |
| Ctrl/Cmd+Shift+Z, Ctrl+Y | anywhere in the calculator       | redo                                                         |
| Ctrl+K or Alt/Option+K   | graphing calculator              | show or hide the keypad                                      |
| Escape                   | anywhere in the calculator       | close the top layer (KB-3)                                   |
| Arrow keys               | graph focused                    | pan by 10% of the visible range                              |
| + or =, −                | graph focused                    | zoom in (range x 0.8) or out (range x 1.25) about the centre |
| Home                     | graph focused                    | default view                                                 |
| Alt/Option+Shift+C       | docked or floating calculator    | move focus between calculator and question                   |
| Alt/Option+T             | row or graph focused             | start or stop audio trace (Phase 4)                          |

- **KB-1** Every shortcut in the table above works in Chromium, Firefox and WebKit from the phase of the item that defines it (Alt/Option+Shift+C in Phase 2 per KB-11, Alt/Option+T in Phase 4 per A11Y-13, all others in Phase 1), and is listed in a "Keyboard shortcuts and help" popover opened from the title bar, which also shows short usage text: example rows (y=x^2, f(x)=2x+1, x=3, (2,3)), how to add a table and a regression, the Paste button, and the documented limits of `a-math-semantics.md` section 5.6. (Phase 1; verified by browser test)
- **KB-2** Undo and redo use one history stack owned by the calculator: MathQuill's own undo is never used, typing in one row coalesces into one step until 1,000 ms without edits or a focus change, and Undo and Redo are disabled at the ends of the stack. (Phase 1; verified by component test)
- **KB-3** Escape closes exactly one layer per press in this order: an open menu, popover or picker; the Functions panel; the ABC page (back to the main keypad); the keypad; then the calculator itself; each handled press calls `preventDefault()`. (Phase 1; verified by browser test)
- **KB-4** On an open by mouse or keyboard, focus goes to the first row's MathField; on an open by a touch or pen tap (toolbar button or side button), the first row becomes the active row as API-12 activateExpression defines and DOM focus goes to the calculator window frame, so neither the keypad nor the system keyboard opens until the student taps a row (K-2); after a mouse or keyboard transfer it goes to the transferred row; after a touch transfer the transferred row becomes the active row (focused-row styling of L-3, scrolled into view, target of keypad input) without DOM focus entering its MathField, so the system keyboard does not open (TR-66); on close, focus returns per L-10; reopening within the same question restores the last focused row. (Phase 1; verified by browser test)
- **KB-5** Clear all (button "Clear all expressions" in Edit list mode, and in the Scientific toolbar) removes every row in one undoable step, keeps settings and viewport, leaves one empty focused row, and announces "All expressions cleared. Undo is available." (Phase 1; verified by browser test)
- **KB-6** Keyboard isolation follows AR-18: native `keydown`, `keyup` and `keypress` listeners on the CalculatorWindow frame, which contains the light-DOM title bar and the shadow host, stop propagation after the calculator's own handling, so window- and document-level quiz shortcuts (Enter to advance, Escape, Alt+H) never see calculator keys. (Phase 1; verified by browser test)
- **KB-7** Shortcuts match on `event.code` (`KeyK`, `KeyC`, `KeyT`, `KeyZ`, `KeyY`) so Option-modified keys on macOS work, and ignore events with `isComposing`. (Phase 1; verified by browser test)
- **KB-8** The graph is one tab stop with the keys in the table above; panning and zooming by keyboard update the graph's accessible name (A11Y-1). (Phase 1; verified by browser test)
- **KB-9** Drag alternatives (WCAG 2.5.7): rows reorder with Move up and Move down (R-8); sliders are native range inputs moved by arrow keys (one step), Page Up and Page Down (ten steps), Home and End; a movable point selected by Enter on its row moves by arrow keys one minor-grid step (Shift: one major step) and Escape deselects it. (Phase 2; verified by browser test)
- **KB-10** The floating window moves with arrow keys on its focused title-bar handle (16 px per press) and resizes with arrow keys on its focused corner handle, clamped like L-6. (Phase 1; verified by browser test)
- **KB-11** Alt/Option+Shift+C moves focus from the docked or floating calculator to the question's first focusable element and back to the calculator's last focused row; it does nothing in full screen. (Phase 2; verified by browser test)
- **KB-12** Full screen keeps Tab inside the calculator window with the AR-28 focus sentinels at both ends of the frame, so the light-DOM title bar and the shadow content form one Tab cycle (the background is already inert per L-11); internal focus is tracked with `shadowRoot.activeElement`. (Phase 1; verified by browser test)
- **KB-13** Undo and Redo toolbar buttons, Clear all, Add item and every keypad key are reachable by Tab in visual order, with focus never moving into a hidden keypad or collapsed list. (Phase 1; verified by browser test)
- **KB-14** With the graph focused, `]` and `[` step through the selected row's points of interest, showing one label at a time and announcing it (A11Y-9); inside the keyboard trace (POI-20) Page Down and Page Up do the same, as Desmos does. (Parity; verified by component test)

## 7. Scientific mode

The Scientific calculator is a separate calculator state inside the same window, reached through
the mode control. Rules below are written from general calculator conventions; items marked for
confirmation are checked by REA behaviour capture in Phase 2.

Desktop scientific tray (right group as in K-1):

| Group  | Row 1         | Row 2          | Row 3            | Row 4                 |
| ------ | ------------- | -------------- | ---------------- | --------------------- |
| Left   | a², aᵇ, √, ⁿ√ | (, ), \|a\|, π | sin, cos, tan, % | ABC, comma, ans, ×10ⁿ |
| Centre | 7, 8, 9, ÷    | 4, 5, 6, ×     | 1, 2, 3, −       | 0, ., =, +            |

Phone portrait scientific keypad (7 x 6, 44 px keys): row 1 Functions (2 wide), ←, →, ans,
Backspace (2 wide); row 2 a², aᵇ, √, 7, 8, 9, ÷; row 3 (, ), ⁿ√, 4, 5, 6, ×; row 4 sin, cos,
tan, 1, 2, 3, −; row 5 |a|, π, %, 0, ., =, +; row 6 ABC, comma, ×10ⁿ, Enter (4 wide).

- **SC-1** The mode control is a two-option radio group labelled "Calculator mode" (Graphing, Scientific) in the title bar; switching keeps each mode's rows and settings for the rest of the question, and a transfer always switches to Graphing (`c-transfer.md`). (Phase 2; verified by browser test)
- **SC-2** Scientific layout: a full-width expression list above an always-visible scientific keypad, no graph, no Add item menu; toolbar with Undo, Redo, Clear all and Settings (Angle, plus Display size once S-3 ships in Phase 4) (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by browser test)
- **SC-3** The desktop scientific tray has exactly the keys in the table above plus the K-1 right group; Ctrl/Alt+K does nothing in Scientific mode because the keypad is always shown (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by component test)
- **SC-4** Calculator containers narrower than 600 px use the phone scientific keypad above, keys at least 44 x 44 CSS px from 320 px width, and the K-6 landscape rule (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by browser test)
- **SC-5** Entry and history: each row evaluates as the student types and shows its value right-aligned below it; Enter keeps the row and opens a new empty row below; earlier rows stay editable and editing one recomputes every later row (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by browser test)
- **SC-6** `ans` in a row means the value of the nearest earlier row that has a numeric value (an error if none exists); starting an empty row with `+`, `−`, `×`, `÷`, `^`, `²` or `!` while the row above has a value inserts `ans` before the operator; in Scientific mode `ans` is a reserved name matched before PR-13 splitting, and in Graphing mode the letters split by PR-13; `ans` is not in the PR-12 allowlist; Scientific-mode MathFields add it to their own `autoOperatorNames`, so Graphing fields (T-3) never render or parse `ans` as a name (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **SC-7** Results display as decimals by default; a result that is an exact fraction shows a fraction/decimal toggle button ("Show as fraction", "Show as decimal") using the number-display rules of `a-math-semantics.md`; the toggle is per row and resets per question (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by component test)
- **SC-8** `n%` evaluates to n/100 and `n% of x` to n/100 x; `50+10%` is 50.1 (no percent-add shortcut); typing `of` after `%` is recognised as an operator (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **SC-9** The ×10ⁿ key inserts `\times10^{}` with the caret in the exponent; results too large or small for plain display use the a × 10ⁿ form of `a-math-semantics.md`; a lowercase `e` is always Euler's number (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **SC-10** Angle defaults to Radians on every question, Degrees is a settings toggle, and the Scientific and Graphing angle settings are independent (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by browser test)
- **SC-11** The Scientific functions panel lists, in order: Trig, Inverse trig, Statistics (mean, median, min, max, stdev, stdevp, var, count, total), Logarithms (exp, ln, log, logₐ), Number theory (lcm, gcd, mod, ceil, floor, round, sign, ⁿ√, nPr, nCr, !), Hyperbolic trig (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by component test)
- **SC-12** Variables and functions can be defined (`a=5`, `f(x)=x^2`) and used in later or earlier rows; `x` and `y` have no graph meaning; a row that is an equation but not a definition (`2x=4`) shows "Use the graphing calculator to solve or graph equations." (confirm by REA behaviour capture in Phase 2). (Phase 2; verified by unit test)
- **SC-13** Scientific state is created on first use within a question, survives mode switches and close/reopen within that question, and is destroyed with the question (remount per question key plus `setBlank()`, AR-58), apart from the page-session Display size and Reverse contrast of S-9. (Phase 2; verified by browser test)
- **SC-14** Keyboard input follows T-1 to T-12 and the KB- table; Up and Down move through history rows; Enter evaluates and opens a new row. (Phase 2; verified by browser test)
- **SC-15** The Scientific calculator meets the same A11Y- essentials as Graphing: rows named "Expression n", values linked by `aria-describedby`, values and errors announced through the live region. (Phase 2; verified by component test)

## 8. Animation and motion

Defaults use the brand motion tokens (`docs/brand.md:186-201`): `duration-instant` 100 ms,
`duration-fast` 200 ms, `duration-normal` 400 ms, `ease-standard` =
`cubic-bezier(0.22, 1, 0.36, 1)`, never overshoot. The 2026-10-16 captures contain no timings.
During Phase 1 the lead measures test-day durations with owner-authorised REA behaviour capture
(timing and screenshots only); a measured value replaces the default below when it stays at or
under 400 ms with no overshoot, and the Phase 1 plan records both.

- **AN-1** Keypad show and hide: the tray moves on `transform: translateY` between 100% and 0 over 200 ms with `ease-standard`, then gets `visibility: hidden` when hidden (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by browser test)
- **AN-2** Functions panel: opens with opacity 0 to 1 and `translateY(8px)` to 0 over 200 ms, closes with opacity only over 100 ms, both `ease-standard` (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by browser test)
- **AN-3** Collapse and expand list: the list moves on `transform` over 200 ms with `ease-standard`; the graph canvas resizes once when the transition ends, never per frame (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by browser test)
- **AN-4** Settings popover, Add item menu, style picker and slider settings: opacity 0 to 1 and `translateY(-4px)` to 0 over 100 ms on open, opacity only over 100 ms on close (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by browser test)
- **AN-5** Row insertion expands the new row's height from 0 over 200 ms; row deletion collapses over 100 ms; neither moves the caret (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by browser test)
- **AN-6** Point-of-interest labels and point coordinate labels fade in and out over 100 ms (confirm by REA behaviour capture in Phase 1). (Phase 2; verified by browser test)
- **AN-7** Zoom in, Zoom out and Home buttons animate the view over 400 ms with `ease-standard`, interpolating scale logarithmically and the centre linearly; wheel, pinch, pan and keyboard zoom apply immediately with no easing (confirm by REA behaviour capture in Phase 1). (Phase 2; verified by browser test)
- **AN-8** The Home button fades in over 100 ms when the view leaves the default and fades out when it returns (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by browser test)
- **AN-9** Slider play advances the value at a constant rate: one pass from min to max takes 4 s at 1x speed, scaled by the R-7 speed; it runs on `requestAnimationFrame` and stops on question change (confirm by REA behaviour capture in Phase 1). (Phase 2; verified by browser test)
- **AN-10** The floating window and full-screen calculator open with opacity 0 to 1 and `translateY(6px)` to 0 over 200 ms; docking and undocking change the question width instantly so question text never moves under animation (brand Hold territory) (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by browser test)
- **AN-11** Key and button press feedback is a background tone change over 100 ms (brand Respond); no scale, shadow or bounce (confirm by REA behaviour capture in Phase 1). (Phase 1; verified by browser test)
- **AN-12** The icon-only Transfer to Calculator control (TR-43) and its "Transfer to Calculator" tooltip (TR-51), including the always-visible answer-choice icon on touch screens (TR-42), appear and disappear without motion, because they sit on question text and answer choices. (Phase 1; verified by browser test)
- **AN-13** Reduced motion applies when the operating system reports `prefers-reduced-motion: reduce` or the quiz's persisted Question animations setting is off (the host passes it in; the standalone page uses the media query only): AN-1 to AN-6, AN-8, AN-10 and AN-11 become instant, AN-7 jumps straight to the new view, and AN-9 slider play stays available and steps values per frame without easing. (Phase 1; verified by browser test)
- **AN-14** No calculator transition or UI animation exceeds 400 ms (AN-9 slider play, a student-started value animation, is excluded), none uses an easing that overshoots, and durations are read from custom properties declared inside the shadow root so the browser test can read computed `transition-duration` through `shadowRoot` with and without `emulateMedia({ reducedMotion: "reduce" })`. (Phase 1; verified by browser test)

## 9. Screen readers and audio

A11Y-1 to A11Y-11 are the screen-reader essentials; they land with their features in Phases 1 to
3 and gate the switch-over. A11Y-12 to A11Y-14 are Phase 4 refinements and audio; A11Y-15 records
in Phase 1 that Braille mode is out of scope.

- **A11Y-1** The graph has role `img` and the accessible name "Graph from x=-10 to 10, y=-7.5 to 7.5, 2 plots" (bounds to at most 4 significant digits, plotted visible rows counted), updated within 500 ms after any pan, zoom, Home or row change. (Phase 1; verified by browser test)
- **A11Y-2** One polite live region (role `status`) inside the shadow root announces: the focused row's value 750 ms after the last edit ("Expression 2 equals 9"), a row's error once when it appears or changes, angle and mode changes, Clear all, undo and redo, any typing, keypad or paste row or size limit refusal (T-13 and the NM-42 limits in `a-math-semantics.md`; transfer refusals are announced only by the TR-67 region, A11Y-11), and the double-tap tilde (K-7); the calculator never uses `role="alert"` for these; when the window was open at the question change (the lifted open state carried into the new question, AR-25), the new question's calculator announces "Calculator cleared for this question." once, 500 ms after mount; a calculator first mounted within a question by the toolbar, the side button or a transfer announces nothing (A11Y-11), and nothing is announced while the window is closed. (Phase 1; verified by component test)
- **A11Y-3** Rows are list items; each MathField is a textbox named "Expression n"; its controls are "Delete expression n" and "Hide expression n" or "Show expression n" (`aria-pressed`); the value element is linked by `aria-describedby`; an error sets `aria-invalid` and is linked by `aria-describedby`. (Phase 1; verified by component test)
- **A11Y-4** Each row's textbox exposes the T-5 speech text as its accessible description, so a screen reader reads "y equals x squared plus 3 fourths" rather than raw LaTeX. (Phase 1; verified by component test)
- **A11Y-5** The keypad is a region named "Keypad"; every key is a button named in words (for example "Squared", "Power", "Square root", "Pi", "Less than or equal to", "Absolute value", "Left arrow", "Tilde", "Row separator"); ABC uses `aria-pressed`, Functions uses `aria-expanded`, and the panel is a labelled group "Functions" with one heading per category. (Phase 1; verified by component test)
- **A11Y-6** Window semantics: floating is a non-modal dialog named "Karman calculator"; full screen is a modal dialog with the same name; docked is a `complementary` landmark with the same name; the calculator surface inside is a region named "Graphing calculator" or "Scientific calculator". (Phase 1; verified by browser test)
- **A11Y-7** Shadow-root rule: every ID-based ARIA relationship (`aria-describedby`, `aria-labelledby`, `aria-controls`, `aria-activedescendant`) stays inside the shadow root; triggers outside it use `aria-expanded` and `aria-controls` pointing at the host element; element reflection across the boundary is not used. (Phase 1; verified by component test)
- **A11Y-8** Sliders are native range inputs named "Slider a" with `aria-valuetext` "a equals 2"; Play is "Play slider a" or "Pause slider a"; slider and point drags announce the final value or coordinates once on release, never per step. (Phase 2; verified by browser test)
- **A11Y-9** Every point of interest a student reaches by keyboard (KB-14, POI-20) is announced with its kind words and the coordinates of its visible label: "Zero", "X-intercept", "Y-intercept", "Maximum", "Minimum", "Top", "Bottom" and "Intersection with Expression n", combined kinds joined with "and" ("Y-intercept and Minimum at x 0, y negative 2"); open labels are notes reading the coordinates (POI-19). (Parity; verified by component test)
- **A11Y-10** Regression rows announce their D-37 screen-reader text (for example "Regression: m equals 2.01, b equals negative 0.5, R squared equals 0.998, r equals 0.999, RMSE equals 0.12") 750 ms after they change; table cells are named by column and row ("x₁, row 3"). (Phase 3; verified by component test)
- **A11Y-11** Each transfer result is announced once, by the quiz-side status region of TR-67 (table 11.1); the calculator's own live region (A11Y-2) stays silent for every transfer kind, including inequalities and systems of inequalities (owner-confirmed transferable) and the table, coordinate-pair and function-coordinate transfers added in Phase 3. (Phase 1; verified by browser test)
- **A11Y-12** Refined graph description: the graph's `aria-describedby` text lists each visible row with its number, kind (line, curve, point, region) and its intercepts when known, updated within 500 ms of changes. (Phase 4; verified by browser test)
- **A11Y-13** Audio trace: Alt/Option+T on a focused row or the graph starts tracing that row's curve; Left and Right move by 1/50 of the visible width (Shift: 1/10); pitch maps y across the visible range to 220-880 Hz on a logarithmic scale, stereo pan maps x, a short click marks points of interest, each step announces "x 2, y 4", and Escape or Alt/Option+T stops; sound starts only after that user action and the K-9 key becomes enabled; once enabled, activating the K-9 key does exactly what Alt/Option+T does for the focused row (or for the first graphed row when no row is focused), its accessible name becomes "Audio trace", and `aria-pressed` shows whether tracing is on. (Phase 4; verified by browser test)
- **A11Y-14** `tone` rows: a row whose value is a tone shows a Play/Stop toggle, plays only after activation, clamps gain to 0-1, and stops on Stop, question change or destroy. (Phase 4; verified by browser test)
- **A11Y-15** Braille mode stays out of scope: no Braille setting is offered, and braille display users get the A11Y-4 speech text through their screen reader. (Phase 1; verified by component test)

## 10. Theme and contrast

### 10.1 Approved targets (D9, verbatim)

UI text, axis numbers and point labels at least 7:1; axes at least 7:1; curves at least 4.5:1
in every skin, with each skin's six curve colours generated to meet that while staying
distinguishable, including for colour-blind students; major gridlines at least 3:1 and minor
gridlines lighter; inequality shading never drops a curve below 4.5:1; Reverse contrast raises
everything to at least 7:1.

Owner-confirmed reading for gridlines in reverse contrast: minor gridlines reach at least 3:1
and stay lighter (lower contrast against the paper) than major gridlines; every other
reverse-contrast target is at least 7:1 (TH-13).

### 10.2 Where the site tokens fall short

WCAG contrast ratios computed from `src/lib/themes/palettes.ts`. Light skins: Warm ivory, Clean
paper, Sand, Sage, Lavender, Peach, Rose, Blush. Dark skins: Observatory, Charcoal, Forest, Plum.

| Token used as                                  | Light skins                                          | Dark skins                                       |
| ---------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `text` on any calculator background            | 9.27 to 14.92, passes                                | 10.53 to 16.57, passes                           |
| `muted` as secondary text on surface / raised  | 6.20-7.15 (fails 7:1 in 6 skins) / 5.22-5.81 (fails) | 8.36+ / 6.90-7.57, fails in Observatory and Plum |
| `reading` (theme error) on surface             | 6.56-7.09, fails 7:1 in 6 skins                      | 7.68+, passes                                    |
| `gold` Enter fill with a surface label         | 6.20-6.84, fails 7:1                                 | 9.48+ with a canvas label, passes                |
| `math` as focused-row bar with a surface label | 6.62-7.21, fails in 6 skins                          | 10.04+, passes                                   |
| `border` as major gridline on graph paper      | 2.97-3.36, fails 3:1 in Sage and Blush               | 3.90-4.60, passes                                |
| `border` as field edge on raised               | 2.38-2.81, fails 3:1                                 | 2.83-3.23, fails in Observatory and Charcoal     |
| `math` as focus ring on any background         | 5.14+, passes 3:1                                    | 6.76+, passes 3:1                                |

### 10.3 Role mapping

Background roles:

| Role                                                 | Light skins      | Dark skins |
| ---------------------------------------------------- | ---------------- | ---------- |
| Graph paper                                          | `surface`        | `canvas`   |
| Expression list                                      | `surface`        | `surface`  |
| Chrome: title bar, toolbars, row gutter, keypad tray | `raised`         | `canvas`   |
| Digit and letter keys, popovers, menus               | `surface`        | `raised`   |
| Operator, function and navigation keys               | `canvas`         | `surface`  |
| Accent: Enter key, primary buttons                   | `gold`, adjusted | `gold`     |

Foreground roles:

| Role                                                                             | Source                             | Target and background                                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Primary text: math, values, key and menu labels                                  | `text`                             | 7:1 on every background role except the accent, whose labels use the Enter key label role |
| Secondary text: row numbers, hints, placeholders, slider bounds, disabled labels | `muted`, adjusted                  | 7:1 on the background it sits on                                                          |
| Error message and marker                                                         | `reading`, adjusted                | 7:1 on the list                                                                           |
| Axes, axis numbers, point labels                                                 | `text`                             | 7:1 on graph paper                                                                        |
| Major gridlines                                                                  | `border`, adjusted                 | 3:1 on graph paper (reverse: 7:1, TH-13)                                                  |
| Minor gridlines                                                                  | `border` mixed toward paper        | 1.4:1 to 1.6:1, always below major (reverse: 3:1 to 3.5:1, TH-13)                         |
| Curves c1 to c6                                                                  | generated (TH-6)                   | 5.85:1 on paper, so 4.5:1 over any shading                                                |
| Focus ring, focused-row outline                                                  | `math`                             | 3:1 on the adjacent background                                                            |
| Focused-row bar (holds the row number)                                           | `math`, adjusted                   | row number 7:1 on the bar                                                                 |
| Enter key label                                                                  | `surface` (light), `canvas` (dark) | 7:1 on the accent                                                                         |
| Text-field and table-cell boundaries                                             | `border`, adjusted                 | 3:1 on the background it sits on                                                          |

### 10.4 Checklist

- **TH-1** Every 10.1 target and every target in the 10.3 foreground-role table (including 3:1 for text-field and table-cell boundaries and 7:1 for the focused-row number and the Enter key label) holds in all 12 skins in normal contrast, on the shadow-root surfaces and on the light-DOM surfaces of TH-2 (the TR-51 tooltip text counts as UI text at 7:1), measured as WCAG 2.x contrast between resolved sRGB colours of the element and the background role it is drawn on (10.3), with no large-text exception; "minor gridlines lighter" is measured as 1.4:1 to 1.6:1 against the paper and always below that skin's major gridlines; reverse-contrast targets are TH-13's. (Phase 1; verified by contrast test)
- **TH-2** Colours resolve inside the shadow root as custom properties on `:host`, and the canvas renderer reads resolved values with `getComputedStyle(host)` because canvas cannot resolve `var()`; the exception is the light-DOM calculator surfaces (CalculatorWindow title bar and window controls, dock splitter, resize grip, CalculatorLoader loading and Retry panel, TransferControl with its tooltip, selected outline and chooser), which take their colours only from the eager sheet of TH-5; `palettes.ts` and the site tokens are never modified. (Phase 1; verified by component test)
- **TH-3** The calculator uses only the role mapping in 10.3: every colour in calculator CSS and canvas drawing comes from a named role, and the stylesheets contain no raw hex colours outside the two generated files of TH-5 and the vendored vendor/mathquill/mathquill.css (AR-5), every one of whose colour declarations is overridden by a later calculator stylesheet rule that takes its colour from a role, except declarations every supported engine ignores (IE progid filters, -moz-box-shadow) (the v1 focus colour `#2f72dc` is not carried over). (Phase 1; verified by unit test)
- **TH-4** Adjustment rule: a role that misses its target moves in OKLCH lightness only, in 0.005 steps away from its background, until it reaches the target plus 0.05; hue is kept and chroma is reduced only as needed to stay inside sRGB (for example Warm ivory secondary text `#536457` becomes `#495a4d` on surface; Clean paper Enter fill `#735925` becomes `#6d531f`). (Phase 1; verified by unit test)
- **TH-5** All derived colours for the 12 skins, in normal and reverse contrast, are produced by a deterministic generator script and checked in as `src/lib/calculator-v2/theme/skin-colors.generated.ts`; a unit test regenerates them from `palettes.ts` and fails on any difference; an unknown theme id falls back to Warm ivory (light) or Observatory (dark) by `prefers-color-scheme`; the generator also writes `src/components/calculator/calculator-chrome.generated.css`, plain CSS keyed by `html[data-theme]` (with the same fallback when the id is missing or unknown) that holds only the chrome, primary-text, secondary-text, boundary, focus-ring, accent and accent-label roles for the 12 skins, counts toward AR-33's 10 KB eager budget and is drift-tested with the `.ts` table; TH-1 and TR-53 measure these surfaces in all 12 skins. (Phase 1; verified by unit test)
- **TH-6** Curve palettes: candidates are in-gamut OKLCH colours (L step 0.01, C 0.07 to 0.26 step 0.015, hue step 4 degrees) at least 5.95:1 against the graph paper (the 5.85:1 target plus a 0.1 rounding margin; 8.15:1 in reverse contrast); slot c1 is the highest-chroma candidate with hue 240 to 270 degrees, and each next slot is the candidate that maximises the minimum pairwise OKLab distance (ΔE_OK) over normal vision and Machado 2009 protan, deutan and tritan simulation at severity 1.0. (Phase 1; verified by unit test)
- **TH-7** Colour-blind target: the six curve colours of every skin have a minimum pairwise ΔE_OK of at least 0.08 under normal vision and each of the three simulations, in normal contrast from Phase 1 and in reverse contrast from Phase 4 (a prototype of TH-6 on 2026-10-16 reached 0.104 to 0.123 normal and 0.107 to 0.115 reverse). (Phase 1; verified by contrast test)
- **TH-8** Shading: each inequality fill uses its row colour at the opacity that gives 1.15:1 against the paper (1.08:1 in reverse contrast); the renderer limits combined shading so that at no pixel does it exceed 1.3:1 against the paper (1.15:1 in reverse), two overlapping fills stay at least 1.04:1 apart from one fill, and therefore every curve stays at least 4.5:1 (7:1 in reverse) over any shading; rows created by transferring an inequality or a system of inequalities (owner-confirmed transferable) shade under the same rule; the same fill opacity, the 1.3:1 (reverse 1.15:1) combined cap and the 1.04:1 overlap step apply to every filled region: histogram bars (FN-41), polygon fills (FN-69), cumulative-probability areas (FN-52) and inference tail shading (FN-59). (Phase 1; verified by contrast test)
- **TH-9** Point labels and point-of-interest labels draw a 3 px halo in the paper colour behind their glyphs, so the 7:1 label target holds over curves, grid and shading. (Phase 2; verified by contrast test)
- **TH-10** Rows store palette colours as slot ids `c1` to `c6` in state and in the API; slots resolve from the active skin and re-map immediately when the skin or reverse contrast changes; new rows take slots in order c1 to c6 and repeat; the R-4 picker offers the six slots and, from Phase 4, the colour variables defined in the calculator (FN-74), which TH-11 adjusts. (Phase 1; verified by unit test)
- **TH-11** Explicit colours (from `rgb`, `hsv`, `okhsv`, `oklab`, `oklch`, or a hex colour passed through the API) keep their hue and chroma; when one is below 5.85:1 (8.05:1 in reverse contrast) against the paper, the curve targets of the 10.3 role table and TH-13, its OKLCH lightness is adjusted by the TH-4 rule until it meets that target, so it stays at least 4.5:1 (7:1) over any shading (TH-8, D9), the contrast suite includes them, and the row shows the note "Colour adjusted for contrast on this theme" (Karman addition). (Phase 1; verified by contrast test)
- **TH-12** Colour swatches have accessible names "Colour n, hue, style", where hue is computed from the resolved colour's OKLCH hue (grey when OKLCH C < 0.03; otherwise by h: red [0°, 45°) and [345°, 360°), orange [45°, 80°), yellow [80°, 120°), green [120°, 175°), teal [175°, 220°), blue [220°, 285°), purple [285°, 320°), pink [320°, 345°); an orange or yellow hue with L < 0.55 is brown), for example "Colour 1, blue, solid line". (Phase 2; verified by component test)
- **TH-13** Reverse contrast swaps polarity and raises every target to 7:1 except minor gridlines (10.1): the graph paper becomes the skin's `text` hue at OKLCH lightness 0.17 (light skins) or 0.97 (dark skins) with chroma at most 0.02; the other background roles step from it (light skins reversed: list 0.21, chrome 0.17, keys 0.27, operator keys 0.23; dark skins reversed: list 0.97, chrome 0.92, keys 0.99, operator keys 0.95); primary text, axes and point labels use the skin's `surface` (light skins) or `canvas` (dark skins); then text, secondary text, errors, axes, point labels, focus indicators and control boundaries reach 7:1, curves 8.05:1 on the paper (7:1 over shading per TH-8), major gridlines reach at least 7:1 and minor gridlines 3:1 to 3.5:1, so minor stays lighter than major (owner-confirmed); the CalculatorWindow's light-DOM surfaces of TH-2 switch with it through a `data-contrast="reverse"` attribute on the window frame, using reverse values the TH-5 chrome sheet holds for that attribute, while the TransferControl keeps normal contrast because it sits on the question page. (Phase 4; verified by contrast test)
- **TH-14** Focus indicators are a 2 px solid outline in the focus-ring role with a 2 px offset (an expression row's L-3 outline is drawn 2 px inside the row's edge, outline-offset -2px, so the list's scroll box never clips it; its contrast is measured against the row's background), at least 3:1 against the adjacent background (7:1 in reverse contrast), on every focusable element including keypad keys and the graph. (Phase 1; verified by contrast test)
- **TH-15** Live theme changes: a MutationObserver on `<html>` (`data-theme`, `class`) and `matchMedia` listeners for `prefers-color-scheme`, `prefers-contrast` and `forced-colors` re-resolve roles and repaint the canvas within one animation frame, with no remount and no loss of rows (the v1 pattern in `karman-calculator/lib/ui.js:23-27`); a `prefers-contrast` change never toggles Reverse contrast, whose value follows S-4. (Phase 1; verified by browser test)
- **TH-16** Under `forced-colors: active` the DOM uses system colours (Canvas, CanvasText, ButtonFace, ButtonText, Highlight, GrayText) and the canvas renderer draws paper in Canvas, axes and labels in CanvasText, the focus ring in Highlight, and curves from the precomputed light or dark curve set chosen by the luminance of Canvas. (Phase 4; verified by browser test)
- **TH-17** Typography: UI text and axis numbers use Arial (system), math in rows, keys and point labels uses KaTeX_Main and KaTeX_Math (loaded per `d-architecture-integration.md`); default sizes UI 14 px, math 18 px, axis numbers 13 px, scaled by S-3. (Phase 1; verified by browser test)
- **TH-18** Icons come from Karman's existing icon set (`lucide-react`) or Karman-drawn SVG; keypad glyphs are text or KaTeX; the icon-only Transfer control uses the TR-43 glyph built from `lucide-react` icons; no Desmos icon, logo, font or asset is present, checked by a unit test that lists every font, image and SVG file and every inline SVG in the lazy chunk, the worker, the standalone output and `src/components/calculator/TransferControl.tsx`, and fails on any font other than the KaTeX woff2 files, any icon not imported from `lucide-react` or `src/components/calculator-v2/icons/`, and any asset URL or file name containing "desmos". (Phase 1; verified by unit test)

## 11. Finding resolution map

| Finding                                                                                                            | Resolved by                                                                                      |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| F7 window, docking, breakpoints                                                                                    | L-4 to L-11, L-14, KB-4, KB-12                                                                   |
| F8 mobile keypad, `~`, easier regression                                                                           | K-2, K-6 to K-9, T-11, L-14                                                                      |
| F9 Clear all and keyboard-first                                                                                    | KB-1 to KB-14, R-8, R-9, L-6                                                                     |
| F10 animation targets                                                                                              | AN-1 to AN-14, K-2                                                                               |
| F22 contrast wording and measurability                                                                             | 10.1, TH-1, TH-6, TH-7, TH-10 to TH-12                                                           |
| F25 screen-reader essentials                                                                                       | A11Y-1 to A11Y-11 (Phases 1-3), A11Y-7; per-question reset announcement in A11Y-2                |
| F31 audio key and `tone`                                                                                           | K-9, A11Y-13 (what the enabled key does), A11Y-14, A11Y-15                                       |
| C4 manual paste of question math                                                                                   | T-12, L-13                                                                                       |
| C5 tokens, role mapping, adjustment                                                                                | 10.2, 10.3, TH-2 to TH-5 (including the eager chrome sheet for light-DOM surfaces), TH-14, TH-16 |
| Owner-confirmed: inequalities transfer                                                                             | A11Y-11, TH-8                                                                                    |
| Owner-confirmed: icon-only Transfer control, touch answer-choice icon                                              | AN-12, TH-1, TH-2, TH-18                                                                         |
| Owner-confirmed: Display size and Reverse contrast kept for the page session                                       | L-9, S-3, S-4, S-9, SC-13                                                                        |
| Owner-confirmed defaults: docking breakpoint, phone letters page, complex mode in Phase 1, reverse minor gridlines | Section 1 breakpoints, 4.3, S-5, 10.1, TH-13                                                     |
| Testability fixes                                                                                                  | R-10, K-7, TH-18                                                                                 |
