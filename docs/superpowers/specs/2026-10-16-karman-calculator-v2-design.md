# Karman calculator v2 design spec

Date: 2026-10-16 · Status: revised draft (revision 3, with the owner decisions of 2026-10-16 in
section 10.3) · Owner: Zakaria Bennis

This overview replaces the first draft of this file. It records the approved decisions, the
boundaries, the scope, the test-day configuration (CB-), the inventory of everything the current
calculator does (V1-), the phase map for every checklist ID, the switch-over rules, the testing
strategy and the decisions. The behaviour itself is specified in five appendices (section 11).

**How to read the checklist.** Every checklist line has the form
`**ID** statement. (Phase N; verified by <layer> test)`. The layers are unit (Vitest, node),
component (Vitest with React Testing Library, jsdom), browser (Playwright), visual, contrast and
perf. IDs are unique across the six files, and only the owning file defines IDs with its prefixes.
"Confirm by REA behaviour capture in Phase N" marks a concrete default written from general
mathematical and UI knowledge, which the lead checks with owner-authorised capture (section 10.4).
"Karman addition" marks owner-requested behaviour that is not part of test-day parity.

| File                                               | Owns                                          |
| -------------------------------------------------- | --------------------------------------------- |
| This overview                                      | CB-, V1-                                      |
| `calculator-v2/a-math-semantics.md`                | PR-, RC-, NM-, G-, POI-                       |
| `calculator-v2/b-functions-and-data.md`            | FN-, D-                                       |
| `calculator-v2/c-transfer.md`                      | TR-                                           |
| `calculator-v2/d-architecture-integration.md`      | AR-, API-                                     |
| `calculator-v2/e-ux-keypad-accessibility-theme.md` | L-, R-, T-, K-, S-, KB-, SC-, AN-, A11Y-, TH- |

## 1. Purpose and success

Students should practise on a calculator that behaves like the one they will use on test day. For
the SAT, Bluebook provides the Desmos Graphing and Scientific calculators in their testing
configuration. Karman calculator v2 is an original, full rewrite designed to match the test-day
layout, interactions, animations and functionality listed in this spec and its appendices,
presented in Karman's quiz-engine skins with high contrast between the background and every line
and piece of text. Parity is claimed only for checklist items with passing tests. No complete
numerical or visual parity is claimed, and the documented limits in `a-math-semantics.md`
section 5.6 stay published.

Success means:

1. A student who knows the test-day calculator can complete every SAT-relevant workflow in v2 on
   desktop and on phones: typing and graphing equations and inequalities, reading intercepts,
   extrema and intersections, working with tables and regressions, and using the Scientific
   calculator.
2. Every capability of the current calculator is kept (section 6). The only retirement is the
   "Export to Karman" and "Copy for Desmos" labels, which Transfer to Calculator replaces.
3. Every checklist ID scheduled in Phases 1 to 3 passes its stated test and the switch-over gate
   (section 8.2) passes, after which every student gets v2.
4. Phase 4 completes the remaining functions, display size, reverse contrast and audio.

| Owner requirement                                                                | Where it is met                                                                                                                                                       |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test-day graphing calculator for mobile and desktop, with the API in the website | D2, D6; appendices A, B and E; API- in appendix D                                                                                                                     |
| Same UI/UX, animations and functionality as Bluebook, in the quiz theme          | CB-1 to CB-3; L-1, L-2 (captures c1, c4); K-1 (b1); K-4 (f1); S-1 (d1); S-2 (e1); R-6 (a2); PR-36, T-5 (a1, a4); SC-1 to SC-15; AN-1 to AN-14; quiz theme TH-2, TH-15 |
| High contrast between background, lines and text                                 | D9; TH-1 to TH-18 (E)                                                                                                                                                 |
| Transfer to Calculator (owner digest item 3)                                     | D7; appendix C; owner interpretations in section 10.3 items 1 to 5 and 7 to 9                                                                                         |
| Pop-up or toggle calculator in Math only, hidden in Reading and Writing          | L-4, AR-20, TR-4                                                                                                                                                      |
| Keyboard-first desktop input, Clear all, Backspace                               | KB-1 to KB-14 (Clear all is KB-5); K-1, K-11                                                                                                                          |
| Per-question reset; display size and reverse contrast kept for the page session  | AR-58, RC-21, S-9, SC-13, TR-70; section 10.3 item 6                                                                                                                  |
| Reliable graphing, tables, regressions and all exam functions                    | G-, POI- (A); FN-, D- (B); CB-2                                                                                                                                       |
| Easier mobile regression; double-tap `=` for `~`                                 | D-3, K-8; K-7                                                                                                                                                         |
| Functions categories in the owner's order, Complex before Advanced               | K-4, FN-84; the shipped order is gated at switch-over (section 8.2 item 1)                                                                                            |
| Open-source libraries with notices kept; no Desmos API dependency                | D3, D6; section 3                                                                                                                                                     |
| No claim of complete numerical or visual parity without evidence                 | Section 1                                                                                                                                                             |
| Make it live, staged behind the flag, students switched after Phase 3 parity     | D8; section 8                                                                                                                                                         |

## 2. Approved decisions

| #   | Decision           | Choice                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Approach           | Full rewrite (new architecture), built alongside the current calculator, which keeps serving students until the switch-over                                                                                                                                                                                                                                                                                                     |
| D2  | Behaviour target   | SAT testing configuration, College Board sheet SY2026-2027: images, folders and notes disabled; automatic log mode for applicable exponential, logarithmic and power regressions; Scientific and Graphing calculators with a toggle (CB-1 to CB-3)                                                                                                                                                                              |
| D3  | Math editor        | MathQuill (github.com/mathquill/mathquill), vendored at jQuery-free master commit `1cbc1c4128` behind a `MathField` adapter and styled with KaTeX fonts                                                                                                                                                                                                                                                                         |
| D4  | UI stack           | Framework-free TypeScript core plus React UI rendered in a shadow root                                                                                                                                                                                                                                                                                                                                                          |
| D5  | Default angle unit | Radians; degrees in settings; reset per question                                                                                                                                                                                                                                                                                                                                                                                |
| D6  | API                | Desmos-style programmatic API implemented by Karman's own engine, not Desmos's hosted API                                                                                                                                                                                                                                                                                                                                       |
| D7  | Transfer           | Transfer to Calculator exactly as the owner specified (owner digest item 3, quoted in `c-transfer.md` section 1), with the confirmed details: the third option puts `f(2)` in a row so the calculator evaluates it; desktop docking applies when the viewport is at least 1024 px wide and more than 500 px tall, and otherwise the calculator opens full screen; and the owner-confirmed interpretations in section 10.3 apply |
| D8  | Release            | `calculatorV2` feature flag; admins first; default switch only after Phase 3 parity; old engine removed two weeks after a stable switch                                                                                                                                                                                                                                                                                         |
| D9  | Contrast           | UI text, axis numbers and point labels at least 7:1; axes at least 7:1; curves at least 4.5:1 in every skin, with each skin's six curve colours generated to meet that while staying distinguishable, including for colour-blind students; major gridlines at least 3:1 and minor gridlines lighter; inequality shading never drops a curve below 4.5:1; Reverse contrast raises everything to at least 7:1                     |

Notes on the decisions:

- **D3.** When MathQuill is vendored, the short hash `1cbc1c4128` is resolved to the full
  40-character SHA, which `vendor/mathquill/README.md` records with the upstream URL, the build
  command and the sha256 of each output file; AR-5's Phase 1 test checks the commit and the hashes.
  Vendoring any other commit is a change to D3 and goes back to the owner.
- **D7.** Section 10.3 items 1 to 5 and 7 to 9 apply D7 where the owner's text is silent or
  conflicts with answer selection; items 1 to 5, 7 and 8 are owner-confirmed, and item 9 is the
  default in force. Two places differ from the verbatim mobile flow. First, on touch screens every
  answer choice, in every mode, has a small always-visible Transfer icon in its tool cluster beside
  cross-out, so a tap on a choice only selects the answer as today (TR-42, item 3). Second,
  screen-reader users reach the visually hidden control by swiping and activate it directly, with
  no selection step (TR-59). All other content follows the owner's flow: tap the item, tap the
  control on top of it, then pick a format only when there is a choice (TR-55, TR-56, item 5).
- **D8.** The flag is the runtime Worker variable `CALCULATOR_V2_ROLLOUT` with the values `off`,
  `admins` and `everyone` (AR-6, AR-7). Section 8 defines the stages, the gate and "stable switch".
- **D9.** The wording above is the approved wording. TH-1 measures every target in all 12 skins
  with no large-text exception and defines "lighter" minor gridlines as 1.4:1 to 1.6:1; TH-6 and
  TH-7 make "distinguishable, including for colour-blind students" measurable (minimum pairwise
  ΔE_OK 0.08 under normal vision and Machado 2009 protan, deutan and tritan simulation); TH-8
  covers shading; TH-10 to TH-12 cover colour slots, explicit colours and swatch names. In reverse
  contrast every target reaches at least 7:1 except minor gridlines, which reach at least 3:1 and
  stay lighter than the major gridlines (section 10.3 item 10; TH-1, TH-13). Animation timing is
  not part of D9; it follows owner requirement 2 through AN-1 to AN-14.

## 3. Boundaries and constraints

- **CLAUDE.md:** the calculator is implemented locally. No hosted calculator API, proprietary SDK or
  license key. Open-source dependencies keep their licenses and notices in
  `public/calculator-notices.txt`. Files stay under ~700 lines. Server actions validate with Zod.
  Physical-phone review is optional; automated mobile, keyboard, theme and integration checks remain
  required.
- **Research boundary (owner decision):** research is limited to observable behaviour: accessibility
  labels and screenshots captured with REA on 2026-10-16, and owner-authorised REA behaviour capture
  of timing and screenshots during the phases (section 10.4). Desmos code, scripts, DOM, assets,
  icons, fonts, logo and exact visual design are never copied. Observation artifacts stay outside
  the repository.
- **Brand (`docs/brand.md`, `docs/enhanced-quiz-engine.md`):** colours come from the active site
  theme (12 skins). Calculator UI uses system Arial; math uses KaTeX fonts. Motion respects
  `prefers-reduced-motion`.
- **Existing contracts kept:** math-only availability, hidden in Reading and Writing, fresh state per
  question, question export entry points, scoring and persistence untouched. Display size and
  reverse contrast, two settings v1 lacks, persist for the page session across questions (section
  10.3 item 6); everything else is fresh per question.

The existing contracts are Phase 1 entry conditions, because admins use v2 in real quizzes from
the Phase 1 deploy: math-only availability is TR-4 and L-4, fresh state per question is AR-58 and
RC-21, the export entry points are AR-11 and TR-76, and an unchanged v1 with the flag off is AR-8.
No phase changes scoring, persistence or question data.

## 4. Scope

### 4.1 In scope

| Appendix                                                                                   | Scope                                                                                                                                                          |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [A, math semantics](calculator-v2/a-math-semantics.md)                                     | Parsing grammar and dialects, golden corpus, row classification, number display, domains, complex and angle mode, lists, graph correctness, points of interest |
| [B, functions and data](calculator-v2/b-functions-and-data.md)                             | Every function in the 15 panel categories with tolerances, tables, regressions with log mode, v1 table and regression parity                                   |
| [C, transfer](calculator-v2/c-transfer.md)                                                 | Transfer to Calculator: sources, classification, default deny, output, control, touch flow, chooser, after-transfer behaviour                                  |
| [D, architecture and integration](calculator-v2/d-architecture-integration.md)             | Module layout, flag, quiz seam, window modes, lazy loading and budgets, shadow root, worker, containment, reset, API, standalone                               |
| [E, UX, keypad, accessibility and theme](calculator-v2/e-ux-keypad-accessibility-theme.md) | Layouts, rows, typing, keypads, settings, keyboard, Scientific mode, animation, screen readers and audio, theme and contrast                                   |

Audio is in scope for Phase 4: audio trace (A11Y-13) and `tone` playback (FN-88, A11Y-14). Until
then the keypad audio key is present and disabled (K-9).

### 4.2 Out of scope

- Notes, folders and images (CB-1).
- Saving graphs, accounts and sharing.
- The 3D, geometry and matrix calculators as separate tools; matrix and geometry functions inside
  the graphing calculator are in scope (FN-69 to FN-71, FN-80 to FN-83).
- Desmos's hosted API or SDK, and any Desmos code, scripts, DOM, assets, icons, fonts, logo or exact
  visual design.
- Pixel-identical copies of test-day visuals, and any claim of complete numerical or visual parity.
- Braille mode (A11Y-15): no Braille setting; braille display users get the row speech text.
- Transfer of figures, graphs, histograms, bar charts, box plots, volumetric figures and circle
  figures, which never get a control (TR-3).
- Physical-phone review as a release gate.
- Changes to scoring, persistence, question data or the scratchpad.

## 5. Test-day configuration (CB-)

- **CB-1** Notes, folders and images are never available: `setExpression` rejects the types `note`, `folder`, `image` and `text` (API-2), Add item never offers them (S-2), pasted or dropped images are refused (AR-14), and the check runs in Phase 1 and again when S-2's menu lands in Phase 3. (Phase 1; verified by component test)
- **CB-2** Log mode applies automatically to applicable exponential, logarithmic and power regressions, with the forms, data conditions, statistics and original-unit fallback of D-27 to D-30. (Phase 3; verified by unit test)
- **CB-3** Scientific and Graphing calculators are both available in every math question through the Calculator mode control, each mode keeping its work for the question, as SC-1 to SC-15 define; the default switch to v2 requires CB-3. (Phase 2; verified by browser test)

## 6. v1 parity inventory (V1-)

### 6.1 Method

The inventory lists every capability of the deployed calculator, taken from
`tests/calculator/*.spec.ts`, `tests/unit/calculator/standalone.test.ts`,
`karman-calculator/README.md` and `docs/karman-calculator-verification.md`, with a few controls
read from the shipped page and shell. Each line names the appendix IDs that preserve it and the
phase in which v2 delivers it. A V1 item passes when its mapped IDs pass and its v1 case, ported to
v2 in `tests/calculator/v2/parity.spec.ts`, passes. V1-35 is owned by this overview; its line is
the acceptance item, with POI-12 giving the coordinate format.

Deliberate behaviour changes keep each capability and change only its details. The ported cases
assert the v2 rule:

- Radians replace v1's degrees default (D5, NM-24); degrees stay one setting away (V1-38).
- In graphing rows `2e3` is 2·e·3 (PR-10); scientific notation is entered with the ×10ⁿ key and
  `\times10^{3}` (SC-9) (V1-22).
- Raw API input `a^b^c` is a parse error (PR-19); typed nesting still gives `2^{3^{2}}` = 512 (V1-21).
- Undefined names get add-slider chips instead of a "Define" error (RC-10) (V1-25).
- Row errors are announced through a polite status region, not `role="alert"` (A11Y-2) (V1-27).
- v1's typed names `asin`, `acos`, `atan` and `abs` are not v2 built-in names: inverse trig is
  typed `arcsin`, `arccos`, `arctan` or `\sin^{-1}` (FN-20, PR-26) and absolute value uses bars
  (PR-21, T-8), so typed `asin(1)` is a·sin(1) with a chip for a (PR-13) (V1-28).
- Results show 12 significant digits instead of 10 (NM-1); up to 100 rows instead of 32 (NM-42).
- Paste and transfer create a new table instead of replacing one imported table, and name
  collisions are renamed instead of refused (D-15, TR-25, TR-34, TR-36) (V1-50).
- r is shown only for linear and log-mode fits (D-31) (V1-56).
- Docking starts at 1024 px wide instead of 1100 px and also needs a viewport more than 500 px
  tall (AR-19, AR-21, TR-64) (V1-3).
- Opening from the toolbar at 768 to 1023 px wide gives full screen instead of v1's floating
  window; the floating window starts at 1024 px (AR-20, L-4) (V1-2).
- Home (v1 "Recenter graph", always shown) appears only while the view differs from the default
  (L-1, AN-8) (V1-32).
- "Hide expressions" and "Show expressions" become the Collapse list control (L-1) (V1-18).
- The labels "Export to Karman" and "Copy for Desmos" become Transfer to Calculator (TR-76) (V1-47).
- The "Add expression" button becomes Add item, which adds an expression row until S-2 (L-1) (V1-15).
- Table cells are named "x₁, row n" instead of "x1 row n", and "Add data row" becomes "Add row to
  table n" (D-8, D-19) (V1-52).
- Clear all moves into Edit list mode and keeps the viewport, where v1 also reset the view (KB-5)
  (V1-17).

Evidence keys: `int` integration.spec.ts, `lay` layout.spec.ts, `life` lifecycle.spec.ts, `sa`
standalone.spec.ts and `cat` catalog.spec.ts in `tests/calculator/`; `unit`
`tests/unit/calculator/standalone.test.ts`; `smoke` `karman-calculator/tests/smoke.mjs`; `readme`
`karman-calculator/README.md`; `verif` `docs/karman-calculator-verification.md`; `html`
`karman-calculator/src/index.html`; `shell` and `surface` `src/components/calculator/CalculatorShell.tsx`
and `CalculatorSurface.tsx`; `extras`, `graph` and `ui` `karman-calculator/lib/`.

### 6.2 Inventory

- **V1-1** Toolbar toggle and phone side button open the calculator in Math; none in Reading and Writing; v1 evidence int:34-86; preserved by L-4, AR-20, TR-4. (Phase 1; verified by browser test)
- **V1-2** Floating window: drag, resize, Maximize and Restore, Minimize, viewport clamp; v1 evidence lay:80-84, readme:68-69; preserved by L-6, AR-20, AR-22, AR-27, KB-10. (Phase 1; verified by browser test)
- **V1-3** Export opens and docks the calculator beside the question; v1 evidence int:50-53, readme:68-69; preserved by TR-64, TR-65, AR-21, AR-23. (Phase 1; verified by browser test)
- **V1-4** Phone full screen: Close and keys in view at 390×844 and 844×390, no sideways scroll, Tab contained; v1 evidence lay:56-79; preserved by L-11, L-14, AR-28, KB-12. (Phase 1; verified by browser test)
- **V1-5** Focus moves into the calculator on open and back to the opener on close; v1 evidence readme:68-69; preserved by KB-4, L-10, AR-27. (Phase 1; verified by browser test)
- **V1-6** Close and reopen within a question keeps the work; v1 evidence int:70-72, readme:70-71; preserved by AR-59. (Phase 1; verified by browser test)
- **V1-7** New question, skip and retake give a fresh calculator: rows, tables, sliders, undo, settings (display size and reverse contrast, which v1 lacks, persist for the page session from Phase 4, section 10.3 item 6); v1 evidence int:73-77, life:49-52, sa:82-93, cat:29-35; preserved by AR-58, R-10, RC-21, S-9. (Phase 1; verified by browser test)
- **V1-8** A clipboard read that finishes after a question change is discarded; v1 evidence life:15-34; preserved by AR-58, AR-60, TR-70. (Phase 1; verified by browser test)
- **V1-9** Loading message and Retry when the engine cannot load; v1 evidence surface:134-151; preserved by AR-31, AR-55. (Phase 1; verified by browser test)
- **V1-10** One calculator across practice, diagnostic, catalog skill practice and daily Math; v1 evidence verif:14-16, cat:2-35; preserved by AR-7, AR-9, AR-11, AR-65. (Phase 1; verified by browser test)
- **V1-11** Shadow-root isolation with inherited theme tokens; v1 evidence readme:65-66; preserved by AR-35, AR-37, TH-2. (Phase 1; verified by component test)
- **V1-12** No cross-origin request; no Desmos request, script or asset; v1 evidence int:38-47,78, sa:9-12,96, verif:99-101; preserved by AR-62, TH-18. (Phase 1; verified by browser test)
- **V1-13** Standalone page over http and from a file URL, under a CSP that forbids dynamic code compilation; v1 evidence smoke:7-80, unit:169-177, verif:78-92; preserved by AR-44, AR-50, AR-62, AR-64, L-15. (Phase 3; verified by browser test)
- **V1-14** Typed rows show live results (`2+3*4` shows 14); v1 evidence int:94-96; preserved by R-5, NM-1, A11Y-3. (Phase 1; verified by browser test)
- **V1-15** Enter adds a row, Up and Down move between rows, Add expression button, Alt+Enter; v1 evidence int:97, lay:18-20, html:38-43; preserved by R-3, L-1, KB-1 (Add item adds an expression row until S-2's menu joins this case in Phase 3). (Phase 1; verified by browser test)
- **V1-16** Undo and Redo buttons, Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z; v1 evidence int:100-102, html:45-55; preserved by KB-1, KB-2, API-11. (Phase 1; verified by browser test)
- **V1-17** Clear all expressions; v1 evidence lay:85, html:64-71; preserved by KB-5, R-10. (Phase 1; verified by browser test)
- **V1-18** Hide and show the expression list; v1 evidence lay:52-55; preserved by L-1, AN-3. (Phase 1; verified by browser test)
- **V1-19** Numeric suffixes become subscripts (`x1`, `a12`, `x_{1}`); v1 evidence unit:40-45, sa:25-26, readme:39-41; preserved by PR-11, PR-14, T-4. (Phase 1; verified by unit test)
- **V1-20** Plain-text and Unicode notation is normalised (`x₁`, `\frac`, `\sqrt`); v1 evidence unit:46-47; preserved by PR-3, PR-4, T-12. (Phase 1; verified by unit test)
- **V1-21** Precedence and implicit products (`-2^2`, `(-2)^2`, `2(3+4)`, typed `2^3^2`); v1 evidence unit:23-31; preserved by PR-17, PR-19, PR-23, T-1. (Phase 1; verified by unit test)
- **V1-22** Scientific-notation entry (v1 `1e3`); v1 evidence unit:30,44, readme:40-41; preserved by SC-9, PR-10. (Phase 2; verified by unit test)
- **V1-23** Code-like input never executes; it becomes a row error; v1 evidence unit:32-39, readme:45-47; preserved by PR-9, PR-38, AR-54. (Phase 1; verified by unit test)
- **V1-24** Definitions and functions resolve in any row order; v1 evidence unit:48-56; preserved by RC-9, G-6. (Phase 1; verified by unit test)
- **V1-25** Circular definitions are errors; undefined names are reported; v1 evidence unit:57-60; preserved by RC-8, RC-10, R-6. (Phase 2; verified by unit test)
- **V1-26** Row and length limits refuse input without freezing (v1: 32 rows, 2,048 characters); v1 evidence readme:50-51; preserved by NM-42, T-13. (Phase 1; verified by unit test)
- **V1-27** Errors in plain language; v1 evidence int:122-125; preserved by R-2, A11Y-2. (Phase 1; verified by component test)
- **V1-28** Built-ins: trig and inverses, sqrt, abs, log, ln, exp, floor, ceil, round, min, max; v1 evidence html:226-227; preserved by FN-18, FN-20, FN-25, FN-60, FN-77, PR-21, PR-27; the ported cases use `\arcsin`, `\arccos`, `\arctan` and `|x|`. (Phase 2; verified by unit test)
- **V1-29** Explicit curves, one-variable equations as lines (`x^2=4`), points, one-argument functions; v1 evidence int:98-99, unit:61-65, readme:28-29; preserved by RC-5, RC-11, RC-12, G-1, G-7, G-8. (Phase 1; verified by unit test)
- **V1-30** Implicit equations (circle, hyperbola); v1 evidence sa:30-39, readme:27; preserved by RC-12, G-16. (Phase 1; verified by unit test)
- **V1-31** Inequality shading; v1 evidence readme:27-28; preserved by RC-14, G-1, G-17. (Phase 1; verified by unit test)
- **V1-32** Pan, wheel and pinch zoom, Zoom in and out, Recenter with equal axis scales; v1 evidence lay:22-40, html:113-124; preserved by G-5, L-1, AN-8. (Phase 1; verified by browser test)
- **V1-33** Focusable graph: arrows pan, + and − zoom, Home recenters; v1 evidence lay:24-29; preserved by KB-8. (Phase 1; verified by browser test)
- **V1-34** Graph summary "Graph from …, n plots"; v1 evidence lay:22-29, int:99; preserved by A11Y-1. (Phase 1; verified by browser test)
- **V1-35** Pointer readout: while a mouse or pen hovers the graph, a text output below it shows the pointer's (x, y) in POI-12 format, clears when the pointer leaves, and is not a live region; v1 evidence graph:114, html:152; preserved by this line, with POI-12 for the format. (Phase 2; verified by browser test)
- **V1-36** Drag literal points; v1 evidence lay:41-50; preserved by POI-15. (Phase 2; verified by browser test)
- **V1-37** Sliders with editable min, max and step; v1 evidence lay:13-17, sa:25-29, readme:25-26; preserved by RC-10, R-6, R-7, A11Y-8, KB-9. (Phase 2; verified by browser test)
- **V1-38** Angle unit toggle with a status message; v1 evidence int:110-116, html:20,165; preserved by S-1, S-6, NM-24, A11Y-2. (Phase 1; verified by browser test)
- **V1-39** Complex mode (`sqrt(-1)` shows i); tables and plots use real values only; v1 evidence int:117-121, readme:42-43; preserved by S-5, NM-18, NM-21, FN-17. (Phase 1; verified by browser test)
- **V1-40** Grid square, radial or none; show axes; v1 evidence int:118, html:136-149; preserved by S-1. (Phase 1; verified by component test)
- **V1-41** Help popover with usage and shortcuts; v1 evidence html:212-235; preserved by KB-1. (Phase 1; verified by browser test)
- **V1-42** Keypad hidden at start, Show and Hide toggle, keys in view in phone portrait and landscape; v1 evidence int:57-60, lay:68-69, sa:23,77-78; preserved by K-1, K-2, K-6, L-14. (Phase 1; verified by browser test)
- **V1-43** Keypad keys insert and edit (7, Plus, 2 gives 9; Backspace); v1 evidence lay:86-93; preserved by K-1, K-10, A11Y-5. (Phase 1; verified by browser test)
- **V1-44** Keypad function keys sin, cos, tan, √, log, ln; v1 evidence html:174-181; preserved by K-1, K-4 (Phase 1 subset, section 7.3). (Phase 1; verified by component test)
- **V1-45** Ctrl/Alt+K keypad shortcut; v1 evidence shell:201-210; preserved by KB-1, KB-7. (Phase 1; verified by browser test)
- **V1-46** Calculator keys never reach quiz shortcuts; v1 evidence verif:52, shell:228-237; preserved by KB-6, AR-18. (Phase 1; verified by browser test)
- **V1-47** Export of question math, answer choices and tables; v1 evidence int:50-56, cat:9-10, verif:124-127; preserved by TR-1, TR-22, TR-26, TR-40, TR-76, AR-12. (Phase 3; verified by browser test)
- **V1-48** Point-or-table choice for pairs ("Export options", "Paste points as"); v1 evidence shell:340-350; preserved by TR-60, TR-61, AR-15. (Phase 3; verified by component test)
- **V1-49** Paste math button with a manual "Math to paste" fallback; v1 evidence life:29,45-48, html:56-63; preserved by AR-14, L-13. (Phase 1; verified by browser test)
- **V1-50** CSV, TSV and HTML table paste; v1 evidence int:103; preserved by AR-15, D-14, D-15, L-13. (Phase 3; verified by browser test)
- **V1-51** Figures, images, drops and saved graphs are refused; v1 evidence int:122-125, readme:47-48; preserved by AR-14, TR-3, CB-1. (Phase 1; verified by browser test)
- **V1-52** Add table with x₁ and y₁, Add data row, cells named "x1 row n", 1,000-pair cap; v1 evidence sa:40-50, extras:197-207; preserved by D-4, D-5, D-8, D-19. (Phase 3; verified by browser test)
- **V1-53** Multi-row paste into a table cell; v1 evidence extras:170-176; preserved by D-14. (Phase 3; verified by component test)
- **V1-54** Model chooser and Add regression: linear, quadratic, exponential, constant; v1 evidence int:104-107, sa:51-53, unit:88-126; preserved by D-3, K-8, D-25, D-34. (Phase 3; verified by browser test)
- **V1-55** Typed custom regressions (`y1~m*x1+b`), up to 8 parameters; v1 evidence readme:31-32,50-51; preserved by PR-30, D-22. (Phase 3; verified by unit test)
- **V1-56** R², signed r and RMSE; R² undefined for constant data; v1 evidence sa:52-53, unit:66-87,127-138; preserved by D-31, D-32, D-34. (Phase 3; verified by unit test)
- **V1-57** "Approximate fit" label and the non-identifiable model error; v1 evidence unit:139-150, extras:309; preserved by D-26. (Phase 3; verified by unit test)
- **V1-58** Fit sliders, Adjusted model, Refit data; adjustments survive unrelated work; data edits refit; v1 evidence sa:54-64, unit:151-168, verif:19-21; preserved by D-35, D-25. (Phase 3; verified by browser test)
- **V1-59** Scientific mode (`2^5` shows 32); v1 evidence int:126-131; preserved by CB-3, SC-1 to SC-15. (Phase 2; verified by browser test)
- **V1-60** Graphing work survives a switch to Scientific and back; v1 evidence int:126-135; preserved by SC-1, SC-13. (Phase 2; verified by browser test)
- **V1-61** Theme changes repaint without losing work; v1 evidence int:61-69, sa:65-76; preserved by TH-15, AR-37. (Phase 1; verified by browser test)
- **V1-62** Every skin: curves 4.5:1, grid 3:1, axes 7:1; v1 evidence sa:98-143, readme:61-62; preserved by TH-1, TH-6, TH-7. (Phase 1; verified by contrast test)
- **V1-63** Rows named "Expression n", results linked, polite status region; v1 evidence int:53-54, ui:38,165; preserved by A11Y-2, A11Y-3. (Phase 1; verified by component test)
- **V1-64** Reduced motion respected; v1 evidence verif:53; preserved by AN-13. (Phase 1; verified by browser test)
- **V1-65** Quiz tools unaffected: scratchpad above the calculator, highlights, cross-out; v1 evidence cat:12-28, verif:26-27; preserved by L-15, TR-41, TR-58. (Phase 3; verified by browser test)
- **V1-66** Programmatic API: rows and tables by id, read rows, observe changes, reset, destroy; v1 evidence readme:73-90; preserved by API-2, API-3, API-4, API-6, API-8, AR-60. (Phase 3; verified by unit test)

## 7. Phase map

### 7.1 Phases

| Phase | Name                   | Delivers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Foundations and typing | Flag, quiz seam, lazy loading, worker, containment, reset, API; parser, corpus, classification, number rules; explicit, implicit, inequality and point graphs; MathQuill rows and typing; desktop and phone keypads with `~` and the disabled audio key; settings; layouts and window modes; theme and contrast; animation defaults; screen-reader essentials for these features; transfer of expressions, equations, inequalities, functions, systems of equations or inequalities and their answer choices |
| 2     | Graph depth            | Polar, parametric, piecewise, restrictions, lists; points of interest, trace and draggable points; sliders, style picker and Edit list; Scientific mode (CB-3, SC-); statistics, number theory, hyperbolic and factorial functions; drag alternatives                                                                                                                                                                                                                                                        |
| 3     | Data                   | Tables, regressions with log mode (CB-2), easier mobile regression, list operations, visualizations, distributions, inference; transfer of tables, coordinate pairs and function coordinates with the chooser; table paste; Add item menu; G-24 and TR-80 checks; the standalone switch-over; the switch-over gate                                                                                                                                                                                           |
| 4     | Completion             | The full functions panel; calculus; geometry; custom colours; matrices; the Complex category; `with`, `and`, `or` and `tone`; display size; reverse contrast; forced colours; audio trace; refined graph description; points-of-interest traversal; removal of v1 labels and code after a stable switch                                                                                                                                                                                                      |

### 7.2 IDs by phase

Every ID in the five appendices and this overview appears exactly once below (576 appendix IDs,
3 CB- IDs, 66 V1- IDs). Phases come from the owning files.

**Phase 1**

| File     | IDs                                                                                                                                                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview | CB-1; V1-1 to V1-12, V1-14 to V1-21, V1-23, V1-24, V1-26, V1-27, V1-29 to V1-34, V1-38 to V1-46, V1-49, V1-51, V1-61 to V1-64                                                                                                                                                      |
| A        | PR-1 to PR-27, PR-29, PR-36 to PR-42, PR-44; RC-1 to RC-15, RC-17, RC-19 to RC-21; NM-1 to NM-6, NM-8 to NM-14, NM-16 to NM-22, NM-24 to NM-29, NM-42, NM-43; G-1, G-5 to G-13, G-15 to G-17, G-23                                                                                 |
| B        | FN-1, FN-4, FN-6, FN-11 to FN-22, FN-60                                                                                                                                                                                                                                            |
| C        | TR-1 to TR-14, TR-18 to TR-21, TR-26 to TR-28, TR-32, TR-35 to TR-38, TR-40 to TR-59, TR-64 to TR-77, TR-79                                                                                                                                                                        |
| D        | AR-1 to AR-14, AR-16 to AR-63, AR-65, AR-66; API-1, API-2, API-4 to API-13, API-15                                                                                                                                                                                                 |
| E        | L-1 to L-14; R-1 to R-3, R-5, R-9, R-10; T-1 to T-13; K-1 to K-3, K-5 to K-7, K-9 to K-12; S-1, S-5 to S-7, S-9; KB-1 to KB-8, KB-10, KB-12, KB-13; AN-1 to AN-5, AN-8, AN-10 to AN-14; A11Y-1 to A11Y-7, A11Y-11, A11Y-15; TH-1 to TH-8, TH-10, TH-11, TH-14, TH-15, TH-17, TH-18 |

**Phase 2**

| File     | IDs                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview | CB-3; V1-22, V1-25, V1-28, V1-35 to V1-37, V1-59, V1-60                                                                                     |
| A        | PR-31, PR-32, PR-34; RC-16, RC-18; NM-7, NM-15, NM-30 to NM-38, NM-41, NM-44; G-2 to G-4, G-14, G-18 to G-22; POI-1, POI-2, POI-4 to POI-16 |
| B        | FN-2, FN-3, FN-9, FN-10, FN-23 to FN-29, FN-68, FN-75 to FN-79                                                                              |
| C        | TR-33                                                                                                                                       |
| D        | API-14                                                                                                                                      |
| E        | R-4, R-6 to R-8; S-8; KB-9, KB-11; SC-1 to SC-15; AN-6, AN-7, AN-9; A11Y-8, A11Y-9; TH-9, TH-12                                             |

**Phase 3**

| File     | IDs                                                                                 |
| -------- | ----------------------------------------------------------------------------------- |
| Overview | CB-2; V1-13, V1-47, V1-48, V1-50, V1-52 to V1-58, V1-65, V1-66                      |
| A        | PR-30, PR-43, PR-45; NM-39, NM-40; G-24; POI-3                                      |
| B        | FN-5, FN-7, FN-8, FN-30 to FN-59; D-1 to D-40                                       |
| C        | TR-15 to TR-17, TR-22 to TR-25, TR-29 to TR-31, TR-34, TR-39, TR-60 to TR-63, TR-80 |
| D        | AR-15, AR-64; API-3                                                                 |
| E        | L-15; K-8; S-2; A11Y-10                                                             |

**Phase 4**

| File | IDs                                                                                       |
| ---- | ----------------------------------------------------------------------------------------- |
| A    | PR-28, PR-33, PR-35; NM-23                                                                |
| B    | FN-61 to FN-67, FN-69 to FN-74, FN-80 to FN-90                                            |
| C    | TR-78                                                                                     |
| E    | K-4 (staged from Phase 1, section 7.3); S-3, S-4; KB-14; A11Y-12 to A11Y-14; TH-13, TH-16 |

### 7.3 Dependency checks

Every ID was checked against the IDs it relies on. Two rules settle what the check found:

- **Shipped-part rule.** When a statement also names behaviour that another ID delivers in a later
  phase, its test covers the shipped part in its own phase, and the same test file gains the
  remaining cases when the later ID lands. An ID never passes by skipping a case that has shipped.
- **No early dependency.** No ID may pass in a phase earlier than an ID it cannot work without;
  where that happened, the ID moved or its Phase 1 behaviour is stated below.

| ID                                   | Relies on                                      | Resolution                                                                                                                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K-4 (Phase 4)                        | V1-44 needs log and ln keys before switch-over | The Calculus heading ships in Phase 1 with exp, ln, log and logₐ only (FN-60); every other category follows K-4's schedule                                                                                                                                           |
| L-1, KB-5                            | R-8 (Phase 2)                                  | In Phase 1 Edit list shows Clear all and Done only; R-8 adds Delete, Duplicate, Move up, Move down and the style picker in Phase 2                                                                                                                                   |
| L-1                                  | S-2 (Phase 3)                                  | Add item adds an expression row directly until S-2's menu lands (as S-2 states)                                                                                                                                                                                      |
| L-12                                 | SC-1 (Phase 2)                                 | The Phase 1 test checks the title bar without the mode control; the mode control joins in Phase 2                                                                                                                                                                    |
| L-13                                 | AR-15, D-14, D-15 (Phase 3)                    | Phase 1 covers math paste, the manual fallback and refusals (AR-14); table paste is verified in Phase 3                                                                                                                                                              |
| S-1                                  | S-8 (Phase 2), S-3, S-4 (Phase 4)              | The order test checks the controls shipped in each phase; the full list in Phase 4                                                                                                                                                                                   |
| R-5                                  | NM-7 (Phase 2)                                 | Value display in Phase 1; the fraction/decimal toggle in Phase 2                                                                                                                                                                                                     |
| RC-10, RC-13, NM-17, FN-16           | R-6, R-7 (Phase 2)                             | Phase 1 tests check the chip list and its order on analysis output, and render the NM-17/FN-16 complex-mode hint with its "Turn on complex mode" action, which sets the S-5 checkbox (Phase 1, section 10.3 item 12); the chip buttons and sliders render in Phase 2 |
| G-5                                  | AN-7 (Phase 2)                                 | Zoom buttons and Home change the view instantly in Phase 1 and animate from Phase 2                                                                                                                                                                                  |
| K-5                                  | K-4 categories                                 | Each template is tested when its category ships                                                                                                                                                                                                                      |
| K-7                                  | PR-30, D-2 (Phase 3)                           | Phase 1 tests the edit only; until PR-30 a row containing `\sim` shows the PR-9 `unsupported` error                                                                                                                                                                  |
| AR-56                                | PR-28, FN-65 (Phase 4)                         | Phase 1 uses a 2,000-node implicit row at the G-15 budget as the runaway row; the nested Σ row is added in Phase 4                                                                                                                                                   |
| TH-11                                | FN-72, FN-73 (Phase 4)                         | Phase 1 tests hex colours passed through the API; colour functions in Phase 4                                                                                                                                                                                        |
| TH-1, TH-5, TH-6, TH-8, TH-11, TH-14 | TH-13 (Phase 4)                                | Phase 1 tests cover normal contrast in all 12 skins; the reverse-contrast cases and the generated reverse table join when TH-13 lands in Phase 4, as TH-7 states                                                                                                     |
| FN-2                                 | D-11 (Phase 3)                                 | Table-column arguments are verified in Phase 3                                                                                                                                                                                                                       |
| FN-56                                | FN-80 (Phase 4)                                | The matrix argument form is verified in Phase 4                                                                                                                                                                                                                      |
| Shipped-part IDs (listed below)      | Features of later phases                       | Shipped-part rule: each covers the features shipped so far and grows as later IDs land                                                                                                                                                                               |

**Shipped-part IDs.** Each of these IDs also names behaviour that a later-phase ID delivers, and
each resolves by the shipped-part rule: V1-7, V1-39; PR-9, PR-12, PR-16, PR-17, PR-20, PR-26,
PR-41, PR-44; RC-2, RC-3, RC-6, RC-7, RC-17, RC-19, RC-21; NM-9, NM-18, NM-22, NM-25, NM-42; G-4,
G-15; POI-2; FN-1, FN-4, FN-6, FN-11, FN-17; TR-20, TR-28, TR-32, TR-35, TR-38, TR-40, TR-42,
TR-46, TR-47, TR-48, TR-49, TR-50, TR-52, TR-53, TR-55, TR-56, TR-59, TR-67, TR-70, TR-72, TR-73,
TR-79; AR-10, AR-14, AR-16, AR-25, AR-37, AR-45, AR-48, AR-58, AR-60; API-1, API-5, API-6, API-7,
API-8, API-9, API-10; L-9; T-3, T-12; S-9; KB-1, KB-5; SC-2, SC-13; AN-4, AN-13; A11Y-2, A11Y-5,
A11Y-6, A11Y-11; TH-2, TH-8, TH-10, TH-15, TH-17.

## 8. Release and switch-over

### 8.1 Staged rollout

Each phase has its own implementation plan, test-first development and pull request on the
`zakaria/calculator-v2` lineage. Every deploy runs `npm run cf:build && npm run cf:deploy` as one
step, never `cf:deploy` alone, after the AR-66 checks pass on the built output.

| Stage    | `CALCULATOR_V2_ROLLOUT` | When                                                                                                                         |
| -------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Build-up | `admins`                | From the Phase 1 deploy until the gate in section 8.2 passes; an admin repeats AR-65's steps on production after each deploy |
| Switch   | `everyone`              | After the gate passes and the switch-over PR is deployed                                                                     |
| Rollback | `admins` or `off`       | At any time; a Worker variable change, no rebuild; v1 stays intact until removal                                             |
| Removal  | not applicable          | Section 8.3                                                                                                                  |

The switch-over PR moves v1's standalone files to `public/karman-calculator/v1/` and serves the v2
standalone build at `/karman-calculator/` (AR-64), updates `docs/enhanced-quiz-engine.md` section 8
as section 10.5 states, and updates the documents in section 10.5. It deploys while the
rollout is still `admins`; the variable changes to `everyone` only after the production check.
From that deploy `/karman-calculator/` serves the v2 standalone page whatever
`CALCULATOR_V2_ROLLOUT` says; the standalone page follows the switch-over PR, not the variable, and
rolling it back means reverting that PR (v1 stays at `/karman-calculator/v1/` until removal).
Phase 4 continues after the switch under the same per-phase process.

### 8.2 Switch-over criteria (end of Phase 3)

v2 becomes the default only when all of the following hold on the switch-over commit:

1. Every checklist ID scheduled in Phases 1 to 3 in section 7.2 passes its stated test, including
   CB-1 to CB-3 and every SC- item (R1), and K-4's order test over the categories shipped by
   Phase 3 (categories 1 to 7, 9 and 12 complete, and category 8's exp, ln, log and logₐ; section
   7.3).
2. Every V1 item (section 6) is mapped and passes, including its ported v1 case.
3. The screen-reader essentials pass: A11Y-1 to A11Y-11, T-5, TR-50, TR-59, TR-67 and SC-15 (R5).
4. G-24 (every curve in the existing engines' suites renders correctly in v2) and TR-80 (the
   transfer bank check over every live math question) pass.
5. All checks are green: the five required CI checks (TypeScript, ESLint, Prettier, Vitest,
   Cloudflare build); the five calculator Playwright projects; AR-65; AR-32, AR-33 and AR-66 on the
   `cf:build` output; the TH-1 contrast suite in all 12 skins; the visual baselines; the perf
   budgets in section 9.
6. With the flag off, the existing `tests/calculator/` suite still passes unmodified (AR-8).
7. The REA confirmations scheduled for Phases 1 to 3 are recorded in their phase plans, and every
   rule a capture changed has updated corpus cases and tests.

The lead records the gate result in the Phase 3 plan and reports it to the owner when the
variable changes.

### 8.3 Removal of the old engine

The old engine is removed two weeks after a stable switch (R9): the removal PR merges once the
rollout has stayed at `everyone` for 14 consecutive days with no rollback, and any rollback restarts
the 14 days. It deletes the v1 engine (`karman-calculator/lib/`, `karman-calculator/src/`,
`karman-calculator/build.mjs` and `karman-calculator/tests/`; the README is replaced as section
10.5 says), `src/components/calculator/standalone-build.ts`, the v1 step of
`npm run calculator:build`, the v1 shell, surface, `PasteAction`, `src/lib/calculator/paste.ts`
and its test `src/lib/calculator/paste.test.ts`, `public/karman-calculator/v1/`, and the v1-only
specs in `tests/calculator/` outside `tests/calculator/v2/` plus
`tests/unit/calculator/standalone.test.ts` (AR-64, `d-architecture-integration.md` section 4), and
the leftover "Desmos" naming in `src/lib/desmos-transfers.ts` and `src/lib/desmos-math.ts` (TR-78).
`src/lib/calculator/paste.ts` is deleted, not moved; v2's clipboard code has lived in
`src/lib/calculator-transfer/clipboard.ts` since Phase 1 (AR-14). `src/lib/calculator/types.ts`
stays, because the legacy engine's `plot.ts`, `scene.ts`, `engine.test.ts` and
`regression.test.ts` import it.

## 9. Testing strategy

| Layer     | Runs in                                                                                                                                                                  | Main content                                                                                                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit      | Vitest, node: `npx vitest run src/lib/calculator-v2`                                                                                                                     | Golden corpus (PR-39 to PR-44) for PR-, RC-, NM-; FN- reference fixtures (FN-10, FN-11); NIST regressions (D-39); sampler and points-of-interest golden cases; transfer corpus (TR-79); API-; worker executor (AR-44 to AR-48); import-graph scans (AR-1 to AR-4) |
| Component | Vitest with React Testing Library, co-located `.test.tsx` files with `// @vitest-environment jsdom`                                                                      | Rows, keypads, functions panel order, settings, transfer control and chooser, error boundaries, ARIA names and relationships                                                                                                                                      |
| Browser   | `npm run test:calculator` (calculator-chrome, -firefox, -safari, -android, -ios) on the fixture with `?calc=v2`; `tests/e2e/calculator-v2.spec.ts` on `npm run dev:next` | Flows, window modes and docking, full screen, reset, paste, transfer, keyboard, shortcuts across engines (KB-1), the V1 ports                                                                                                                                     |
| Visual    | Playwright screenshots in representative light and dark skins                                                                                                            | MathField rendering after font load (AR-41), transfer control states, FN-15                                                                                                                                                                                       |
| Contrast  | TH-1 suite over all 12 skins, normal and reverse                                                                                                                         | D9 targets, TR-53                                                                                                                                                                                                                                                 |
| Perf      | Post-`cf:build` scripts and Playwright with 4× CPU throttling                                                                                                            | AR-32 to AR-34, AR-51, TR-74, TR-75, G-15, D-21, D-38, FN-67                                                                                                                                                                                                      |

- Every ID has at least one automated test whose title, or whose corpus `rules` field, names it.
  `scripts/calculator-v2/check-spec-ids.mjs` reads the IDs and phases from the six spec files and
  fails a phase PR when an ID scheduled for that phase or earlier has no such test. An ID marked
  "staged from Phase N" in section 7.2 (K-4) is treated as due from Phase N.
- One golden corpus (PR-39) is the only source of expected parse, classification and display
  results; the transfer tests import it (PR-44, TR-79). Reference values for statistics,
  distributions, inference, matrices, colours and regression are generated offline and committed
  as JSON (FN-10); CI never installs SciPy, NumPy or R.
- v2 browser specs and their synthetic fixtures live in `tests/calculator/v2/`, inside the
  calculator config's `testDir`. The V1 ports live in `tests/calculator/v2/parity.spec.ts`.
  Fixtures use synthetic questions only and never submit student answers.
- With the flag off, the existing suite runs unmodified (AR-8), so the v1 path stays protected
  until removal.
- Mobile coverage uses the iPhone 14 WebKit and Pixel 7 projects. Physical-phone review is optional
  and never blocks a phase (CLAUDE.md).
- Quick local passes: `npx vitest run src/lib/calculator-v2` and
  `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios`.

## 10. Technical risks and decisions

### 10.1 Risks

| Risk                                                               | Handling                                                                                                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope size                                                         | Four phases, each separately planned, tested and deployable behind the flag                                                                                                                      |
| MathQuill inside a shadow root (focus, selection, textarea)        | MathQuill pinned to master commit `1cbc1c4128` (jQuery-free) behind the `MathField` adapter; patches listed in `vendor/mathquill/PATCHES.md`; adapter tests in Chromium and WebKit (AR-5, AR-42) |
| KaTeX fonts not reaching shadow content                            | Document-scope KaTeX CSS, font checks and reflow on load (AR-39 to AR-41)                                                                                                                        |
| Turbopack and OpenNext not emitting a working lazy chunk or worker | AR-65 on `dev:next`; AR-66 on the `cf:build` output before every phase merge                                                                                                                     |
| Calculator code reaching the server handler or eager chunks        | AR-1 to AR-3 import rules; AR-32 build scan; AR-33 budgets                                                                                                                                       |
| Runaway evaluation freezing the quiz                               | Worker with generations, deadlines and a watchdog; main-thread fallback; error boundaries (AR-43 to AR-57)                                                                                       |
| Numerical accuracy                                                 | Reference tolerances (NM-43, NM-44, FN-11, D-39); documented limits (A section 5.6)                                                                                                              |
| Mobile performance                                                 | Worker plotting, cancellation and the 4× throttled budgets (AR-34, TR-75, D-21, D-38)                                                                                                            |
| REA captures that contradict a default                             | The rule, its corpus cases and its tests change in one PR; the phase plan records the capture                                                                                                    |
| Question content the classifier cannot read safely                 | Default deny (TR-5); bank check before switch-over (TR-80)                                                                                                                                       |
| Skin tokens that miss D9                                           | Lightness-only adjustment and a generated, drift-tested colour table (TH-4, TH-5)                                                                                                                |
| Stale builds reaching production                                   | `cf:build` and `cf:deploy` always paired; AR-66 before merge                                                                                                                                     |

### 10.2 Ownership precedence

Where two files touch the same topic, ownership decides: number semantics, domains, complex mode
and angle mode follow A; function definitions follow B; transfer classification, output and
payload content follow C; window geometry, code layout, budgets and the API surface follow D; UI
behaviour follows E.

### 10.3 Owner interpretations

Each item settles a point where the owner's text is silent, ambiguous or in conflict with another
requirement. Items marked owner-confirmed were decided or accepted by the owner on 2026-10-16 and
are requirements; the owning appendix states each one as a tested rule. Item 9 is the default in
force and tested (TR-10).

1. Owner-confirmed. Inequalities and systems of inequalities are transferable like equations: they
   get the Transfer control and land as rows that graph with shading (TR-11, TR-12; RC-14, G-17).
2. Owner-confirmed. Circle equations get a control as equations; only circle figures are blocked
   (TR-3, TR-14).
3. Owner-confirmed. On touch screens every answer choice, in every mode (practice, catalog skill
   practice, daily questions and the diagnostic), has a small always-visible Transfer icon in the
   choice's tool cluster beside cross-out (daily questions have no cross-out, so their cluster
   holds the icon alone; AR-11); a tap on the choice selects the answer exactly as today
   and never starts a transfer (TR-41, TR-42). All other content keeps the item 5 flow.
4. Owner-confirmed. When f is defined neither in the calculator nor in the question, "Evaluate
   f(a)" is shown disabled with a short reason (TR-31, TR-62).
5. Owner-confirmed. "Click the thing, then export, then click the button on top of it" means: tap
   the item, tap the control that appears on top of it, then pick a format only when there is a
   choice (TR-55, TR-56).
6. Owner-confirmed. Display size and reverse contrast persist for the page session across
   questions; all math, rows, sliders, tables, the viewport and every other setting still reset on
   each new question (AR-58, RC-21, S-9). This is lead resolution R10 as amended, and every R10
   reference in the appendices means this wording: hosts key `CalculatorScope` per question, the
   calculator remounts and calls `setBlank()`, and only the open state, the window geometry
   (AR-25), display size and reverse contrast outlive a question.
7. Owner-confirmed. Desktop docking and the floating window apply when the viewport is at least
   1024 px wide and more than 500 px tall; otherwise the calculator opens full screen, so phones in
   landscape and desktop windows 500 px tall or less (for example 1280×480) open full screen
   (AR-19 to AR-21, L-4, TR-64).
8. Owner-confirmed. The Transfer control is icon-only: Karman's own small calculator icon with an
   arrow pointing up and to the right, with no visible text. "Transfer to Calculator" appears as a
   tooltip on hover and on keyboard focus and is the start of the control's accessible name; this
   is the owner's reading of "labeled" (TR-43, TR-50, TR-51).
9. Default in force. In question stems, lone numbers, lone identifiers, lone powers such as `x^{2}`
   and lone function references such as `f(x)` get no control (TR-10).
10. Owner-confirmed. In reverse contrast, minor gridlines reach at least 3:1 and stay lighter than
    the major gridlines; every other D9 target reaches at least 7:1 (TH-1, TH-13).
11. Owner-confirmed. The phone letters page is an alphabetical 7-column layout, so every key keeps
    its 44 px target (K-6).
12. Owner-confirmed. The complex-mode toggle (S-5) and complex-mode arithmetic and display (NM-17
    to NM-22) ship in Phase 1.
13. Owner-confirmed. Pan, zoom and Home (G-5) and single points (G-7) ship in Phase 1.

### 10.4 REA behaviour capture schedule

The lead runs owner-authorised REA behaviour capture limited to timing and screenshots of visible
behaviour, on desktop and on a touch-emulated profile. Results go into the phase plan; artifacts
stay outside the repository; nothing is copied from Desmos code, scripts, DOM, assets, icons,
fonts, logo or exact visual design. A capture that contradicts a default changes the rule, its
corpus cases and its tests in one PR, and a measured animation value replaces an AN- default only
when it stays at or under 400 ms with no overshoot.

| Phase | Defaults to confirm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Animation timings (AN-1 to AN-11); mobile keypad layout and visibility (K-2, K-6; the phone letters page stays as section 10.3 item 11 fixes it); typing and keypad pages (T-6, T-9, T-10, K-3, K-5); More options defaults (S-8); parsing and classification (PR-7, PR-9, PR-18, PR-24, PR-26, RC-5, RC-6, RC-13, RC-14, RC-17, RC-19); number display and domains (NM-1, NM-2, NM-10, NM-13, NM-17, NM-19, NM-27, NM-28, FN-12, FN-14, FN-16, FN-17, FN-21, FN-22); zoom factor (G-5); internal layout threshold (AR-29) |
| 2     | Scientific mode (SC-2 to SC-12); NM-7, NM-30, NM-36, NM-37, NM-41; RC-18, G-19, POI-10, POI-12, POI-14; R-7; FN-26, FN-27, FN-29, FN-76 to FN-79                                                                                                                                                                                                                                                                                                                                                                           |
| 3     | Tables (D-5, D-7, D-10 to D-13, D-16), regressions (D-24, D-30, D-33), and the statistics, list, visualization, distribution and inference conventions marked in B (FN-5, FN-8, FN-33, FN-34, FN-40 to FN-43, FN-45, FN-46, FN-48, FN-50 to FN-56, FN-58, FN-59), NM-40                                                                                                                                                                                                                                                    |
| 4     | NM-23, FN-65, FN-66, FN-80, FN-87, FN-90                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### 10.5 Documents to update

- `CLAUDE.md`, "Karman calculator checks": the Phase 1 PR adds the v2 commands; the switch-over PR
  describes v2 as the default; the removal PR drops v1.
- `public/calculator-notices.txt`: the Phase 1 PR adds MathQuill (commit `1cbc1c4128`), KaTeX and
  each KaTeX font file the calculator serves, and every other third-party package in the lazy
  calculator chunk and the standalone bundle (for example react, react-dom, scheduler,
  lucide-react and zod; AR-62's metafile test defines the full list), as AR-5 and AR-62 require.
- `docs/enhanced-quiz-engine.md` section 8: the switch-over PR replaces 'at least 1100 px wide'
  with 'at least 1024 px wide and more than 500 px tall' and replaces 'On smaller screens it uses
  the bounded popup or mobile overlay.' with 'Any other viewport opens the calculator full
  screen.' (AR-19 to AR-21, section 10.3 item 7); the Phase 4 PR that ships S-3 and S-4 adds that
  display size and reverse contrast persist for the page session (section 10.3 item 6).
- `karman-calculator/README.md` and `docs/karman-calculator-verification.md`: replaced by v2
  documentation in the removal PR.

### 10.6 Lead resolutions

- R1 The Scientific calculator (CB-3, SC-1 to SC-15) is required before the default switch.
- R2 Every v1 capability is kept; the only retirement is the "Export to Karman" and "Copy for
  Desmos" labels.
- R3 The Complex functions category sits between Matrices and Advanced (owner order; K-4, FN-84).
- R5 The screen-reader essentials A11Y-1 to A11Y-11, T-5, TR-50, TR-59, TR-67 and SC-15 gate the
  switch-over.
- R9 The old engine is removed two weeks after a stable switch (section 8.3).
- R10 Each new question gets a fresh calculator: hosts key `CalculatorScope` per question and the
  constructor calls `setBlank()`; as amended by the owner on 2026-10-16 (section 10.3 item 6),
  display size and reverse contrast persist for the page session, while all math, rows, sliders,
  tables, the viewport and every other setting reset (AR-58, RC-21, S-9).

## 11. Appendices

1. [A, math semantics](calculator-v2/a-math-semantics.md): PR-, RC-, NM-, G-, POI-.
2. [B, functions and data](calculator-v2/b-functions-and-data.md): FN-, D-.
3. [C, Transfer to Calculator](calculator-v2/c-transfer.md): TR-.
4. [D, architecture and integration](calculator-v2/d-architecture-integration.md): AR-, API-.
5. [E, UX, keypad, accessibility and theme](calculator-v2/e-ux-keypad-accessibility-theme.md):
   L-, R-, T-, K-, S-, KB-, SC-, AN-, A11Y-, TH-.

## 12. Review findings resolved

| Finding | Resolution in this overview                                                                                                                                                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1      | CB-3 moved to Phase 2 with SC-1 to SC-15 (R1); the V1 inventory with no retirements beyond the two labels (R2); the gate requires SC-, V1- and the screen-reader essentials (section 8.2); the standalone page served by the v2 build (V1-13, AR-62 to AR-64), with removal after it (section 8.3)                    |
| F12     | Every ID placed in section 7.2; dependency checks and resolutions in section 7.3; L-1's controls ship with G-5 in Phase 1; Add item adds expressions until S-2; CB-1 in Phase 1; existing contracts as Phase 1 entry conditions (section 3); transfer phasing including answer choices and default deny (TR-5, TR-77) |
| F22     | D9 restated in the approved wording; animation moved out of D9 to AN-; measurable colour-blind, gridline, slot, explicit-colour and swatch rules in TH-1, TH-6, TH-7 and TH-10 to TH-12                                                                                                                               |
| F31     | The audio key is present and disabled from Phase 1 (K-9); audio trace (A11Y-13) and `tone` (FN-88, A11Y-14) are Phase 4 scope; braille is out of scope (A11Y-15, section 4.2)                                                                                                                                         |
| F32     | D3 names master commit `1cbc1c4128`; the full SHA and file hashes are recorded and tested (AR-5); any other commit is a D3 change for the owner                                                                                                                                                                       |

| Other findings                         | Resolved in |
| -------------------------------------- | ----------- |
| F2, F15, F16, F17, F18, F19, F20, C6   | A           |
| F13, F14, F17, C7                      | B           |
| F3, F4, F5, C4                         | C           |
| F6, F7, F26, F27, F28, F29, C2         | D           |
| F7, F8, F9, F10, F22, F25, F31, C4, C5 | E           |
