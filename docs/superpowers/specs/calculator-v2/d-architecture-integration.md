# Karman calculator v2: architecture and integration

Part of the [Karman calculator v2 design](../2026-10-16-karman-calculator-v2-design.md). Date: 2026-10-16.

This file fixes how calculator v2 is built and how it plugs into the quiz engine without putting
the quiz at risk. It covers the module layout and import boundaries, how the `calculatorV2` flag is
resolved, the seam with `CalculatorScope`, `useCalculator()`, `CalculatorShell`,
`CalculatorSurface` and the paste/export bridge, the entry points and window modes (floating and
docked on viewports at least 1024 px wide and more than 500 px tall, full screen otherwise), lazy
loading and bundle budgets, shadow-root mounting with styles and fonts, the compute worker and its
job protocol, failure containment, per-question reset, the public `KarmanCalculator` API, and the
standalone build that replaces `public/karman-calculator/`. Behaviour inside the calculator (rows, keypad, internal layout,
keyboard, theme) is in `e-ux-keypad-accessibility-theme.md`; transfer formatting and
classification are in `c-transfer.md`; math semantics and numeric caps are in
`a-math-semantics.md`; the test-day configuration (CB-) and the v1 inventory (V1-) are in the
main overview.

**IDs defined in this file**

- AR-1 to AR-5: module layout, import boundaries, vendored MathQuill.
- AR-6 to AR-8: the `calculatorV2` flag.
- AR-9 to AR-18: integration seam (scope, bridge, call sites, v1 chrome, paste, keyboard isolation).
- AR-19 to AR-29: entry points, window modes, docking and breakpoints.
- AR-30 to AR-34: lazy loading, bundle boundary, bundle and open-latency budgets.
- AR-35 to AR-42: shadow-root mounting, styles, theme, motion, fonts, MathField adapter.
- AR-43 to AR-51: compute worker, job protocol, cancellation, budgets, fallback.
- AR-52 to AR-57: failure containment.
- AR-58 to AR-61: per-question reset, page-session accessibility settings and teardown.
- AR-62 to AR-64: standalone build and the switch-over of `public/karman-calculator/`.
- AR-65 to AR-66: checks against Next development and production bundles.
- API-1 to API-15: the public `KarmanCalculator` API.

## 1. Today's integration (ground truth)

All paths are relative to the repository root. Line numbers refer to commit `08c8c76`, the
deployed `calculator-regression-release` lineage this branch starts from.

| Piece                                                  | In v2                                                                                                            |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `src/components/calculator/CalculatorScope.tsx`        | Kept for both versions; switches by version                                                                      |
| `src/components/calculator/CalculatorShell.tsx`        | v1 only; never wraps v2                                                                                          |
| `src/components/calculator/CalculatorSurface.tsx`      | v1 only                                                                                                          |
| `src/components/calculator/CalculatorSourceAction.tsx` | Exported wrappers switch by version                                                                              |
| `src/lib/calculator/paste.ts`                          | Unchanged; v2 imports nothing from it                                                                            |
| `src/lib/calculator/types.ts`                          | Kept; v2 imports nothing from it, and the legacy engine (`plot.ts`, `scene.ts` and their tests) still imports it |
| `karman-calculator/build.mjs` and its output           | Replaced at switch-over (AR-64)                                                                                  |

- `CalculatorScope.tsx`: bridge `paste`, `toggle`, `open` (10-16); phone query and
  `innerWidth >= 1100` dock (42-45); inert and scroll lock (70-84); `paste` docks and opens
  (89-93); 48vw/52vw workspace shift (98-114); side button (117-128); shell rendered once
  activated (129-139).
- `CalculatorShell.tsx`: `subscribe` (54); bounds clamp (72-91); capture-phase paste and drop
  rejection (134-168); drag (169-189); Ctrl/Alt+K (201-210); Tab trap (211-226); Escape and key
  isolation (228-237); mode select (241-251); paste button (252-259); maximize, minimize and close
  (260-276); manual paste form (283-306); keypad button and "Paste points as" (329-352).
- `CalculatorSurface.tsx`: fetches the `/karman-calculator/` files (22-54) into an open shadow root
  (82), injects CSS as text (97-99), shows Loading and Retry (134-151).
- `CalculatorSourceAction.tsx`: `PasteAction` with "Export to Karman" (44) and "Copy for Desmos"
  (101); wrappers `CalculatorSourceAction`, `CalculatorChoiceAction`, `CalculatorTableAction`
  (109-153).
- `paste.ts`: `PastePayload` kinds math, points, table (3-6); fixed `IMPORTED_TABLE` (8); parsers
  `parseText`, `parseTransfer`, `readClipboard` (156-244); replace-only `insertPayload` (246-287).
- `types.ts`: `CalculatorInstance` with `subscribe` (14-18).
- `karman-calculator/build.mjs`: writes `public/karman-calculator/{index.html,style.css,calculator.js}`
  and the version hash in `src/components/calculator/standalone-build.ts`.

Scope hosts, each keyed per question: `src/components/learn/QuizEngine.tsx:148-156` (key at 149),
`src/components/diagnostic/DiagnosticClient.tsx:75-80`,
`src/components/learn/catalog-practice/CatalogPractice.tsx:152-157`,
`src/components/learn/DailyChallenge.tsx:118-122` (inside `DailyQuestion`, keyed at 67) and
`src/components/learn/ExternalCalculatorLink.tsx:24`. Toolbar triggers:
`quiz/PracticeToolbar.tsx:22`, `diagnostic/parts/DiagnosticHeader.tsx:64`,
`CatalogPractice.tsx:188`, `DailyChallenge.tsx:185`. Export call sites: `MathText.tsx:235` and
`245`, `QuestionTable.tsx:124`, `quiz/TableChoiceOption.tsx:92`, `quiz/ActiveQuizScreen.tsx:258`,
`catalog-practice/CatalogQuestion.tsx:186`, `diagnostic/parts/AnswerChoiceButton.tsx:174`.
`DailyChallenge.tsx:147-178` renders answer choices with no export or cross-out today (v2 adds the
AR-11 cluster).

## 2. Module layout and import boundaries

```
src/lib/calculator-transfer/      eager, server-safe: TransferPayload, classifier, payload builders
  clipboard.ts                    v2 clipboard reader and paste extractor; lazy chunk only (AR-14)
src/components/calculator/        eager quiz seam (existing folder)
  CalculatorScope.tsx             version switch, bridge, docking, inert, focus return
  CalculatorVersion.tsx           CalculatorVersionProvider and useCalculatorVersion()
  CalculatorWindow.tsx            v2 window frame: floating, docked, maximized, full screen
  calculator-window-store.ts      page session: window mode, geometry, display size, reverse contrast
  calculator-chrome.generated.css light-DOM chrome colours for the 12 skins (TH-2, TH-5)
  CalculatorLoader.tsx            import() state, loading and Retry panel, error boundary
  TransferControl.tsx             v2 icon-only Transfer control (TR-43)
  breakpoints.ts                  width and media-query constants
src/lib/calculator-version.ts     server-only flag resolver
src/lib/calculator-v2/            lazy only
  core/latex, core/analysis, core/eval, core/lib, core/regression    pure TS, shared with worker
  core/api/                       headless CalculatorEngine: state, history, observers, job dispatch
  plot/                           sampling, implicit curves, regions, points of interest (pure TS)
  render/                         layered HiDPI canvas renderer and hit testing
  theme/                          skin-colors.generated.ts and role resolution (TH-5)
  worker/                         compute.worker.ts, executor.ts, protocol.ts, create.ts
src/components/calculator-v2/     lazy only
  KarmanCalculator.ts             D6 facade: shadow root plus its own React root
  math-field/MathField.ts         the only importer of vendor/mathquill
  styles/*.css                    compiled into styles/generated.ts
  host/quiz-host.ts               mountQuizCalculator(), the module CalculatorLoader imports
  transfer/apply.ts               TransferPayload to API calls (rules in c-transfer.md)
  standalone/main.tsx             standalone page entry
vendor/mathquill/                 pinned build, LICENSE, README.md, PATCHES.md, mathquill.d.ts
scripts/build/calculator-v2.mjs   style generation and standalone bundle
```

- **AR-1** Modules under `src/lib/calculator-v2/`, `src/components/calculator-v2/` and `vendor/mathquill/` are imported only by each other, by the `import()` expressions in `src/components/calculator/CalculatorLoader.tsx` and by the standalone entry (type-only imports excepted), and `src/lib/calculator-transfer/clipboard.ts` is imported only from `src/components/calculator-v2/`; a Vitest import-graph scan of `src/` fails on any other importer. Test files (`*.test.ts`, `*.test.tsx`) and `__fixtures__/` folders are exempt from this scan, so the TR-79 and PR-44 transfer tests and fixtures may import the PR-39 corpus, the headless `CalculatorEngine` and `transfer/apply.ts`; AR-2, AR-3 and TR-74 still apply to every non-test module in `src/lib/calculator-transfer/` and `src/components/calculator/`. (Phase 1; verified by unit test)
- **AR-2** Eager modules (`src/lib/calculator-transfer/`, `src/lib/calculator-version.ts` and the eager files in `src/components/calculator/`) touch no `window`, `document`, `navigator` or `Worker` at module scope, and each loads under Vitest's node environment without a DOM. (Phase 1; verified by unit test)
- **AR-3** Transfer classification and payload building in `src/lib/calculator-transfer/` use only the question's structured fields (figure kind, table data, math segments) and plain string formatting, never the v2 parser, `MathField`, `render/` or `worker/`, because `MathText`, the table components and the answer-choice components load them on every quiz page. (Phase 1; verified by unit test)
- **AR-4** Only `math-field/MathField.ts` imports `vendor/mathquill`, and the import graph of `worker/compute.worker.ts` contains no React, react-dom, MathQuill or `src/components/` module. (Phase 1; verified by unit test)
- **AR-5** `vendor/mathquill/` holds `mathquill.js` and `mathquill.css` built from upstream commit `1cbc1c4128` (jQuery-free master), its MPL-2.0 `LICENSE`, a `README.md` giving the upstream URL github.com/mathquill/mathquill, the full 40-character SHA that `1cbc1c4128` resolves to, the exact build command and the sha256 of every output file, a `PATCHES.md` listing every local change, and a `mathquill.d.ts` covering only the methods the adapter uses; the folder is excluded from ESLint and Prettier, and a test asserts that the recorded SHA starts with `1cbc1c4128` and that every vendored file's sha256 matches the README; the same Phase 1 PR adds to `public/calculator-notices.txt` an entry for MathQuill (upstream URL, commit `1cbc1c4128`, upstream licence text) and for KaTeX and each KaTeX font file the calculator serves (upstream licence texts), and the AR-5 test fails when any of these entries is missing. (Phase 1; verified by unit test)

## 3. The `calculatorV2` flag

The repository has no feature-flag system. The flag is a server-resolved value handed to the client
through a provider, so every calculator host follows it without new props.

- **AR-6** `resolveCalculatorVersion()` in `src/lib/calculator-version.ts` reads `CALCULATOR_V2_ROLLOUT` at request time: `off` (also missing or unknown values) gives v1 to everyone; `admins` gives v2 when the signed-in user's own role from `fetchUserRole()` (`src/lib/supabase/queries/admin.ts:34`) is `admin`, including while impersonating, and v1 otherwise; `everyone` gives v2 to all; the role query runs only in the `admins` stage. (Phase 1; verified by unit test)
- **AR-7** `src/app/learn/layout.tsx` and `src/app/diagnostic/page.tsx` wrap their content in `<CalculatorVersionProvider version={…}>`; `CalculatorScope` reads `useCalculatorVersion()`; a scope with no provider (tests, admin previews) uses v1; the version is fixed for the life of the page and never changes mid-question. (Phase 1; verified by component test)
- **AR-8** With version v1, `PastePayload`, `insertPayload`, `CalculatorShell` and `CalculatorSurface` behave exactly as today: the existing `tests/calculator/` suite passes unmodified and no v2 code is requested. (Phase 1; verified by browser test)

| Stage    | `CALCULATOR_V2_ROLLOUT` | When                                                        |
| -------- | ----------------------- | ----------------------------------------------------------- |
| Build-up | `admins`                | From the Phase 1 deploy until the switch-over gate passes   |
| Switch   | `everyone`              | After the switch-over gate in the main overview             |
| Rollback | `admins` or `off`       | Any time; a Worker variable change, no rebuild              |
| Removal  | not applicable          | v1 code and folders removed two weeks after a stable switch |

The variable is a runtime Worker variable, not a `NEXT_PUBLIC_` build input, so OpenNext reads it
per request. In production it is a Worker secret (`wrangler secret put CALCULATOR_V2_ROLLOUT`), read only from the Worker binding; locally it is set in the shell or a Playwright `webServer.env`, never in a `.env*` file, and the release build fails when a `.env*` file defines it; the e2e suite already runs as `dev_seed_admin`
(`playwright.config.ts`), so `admins` exercises v2 there. The calculator fixture
(`tests/calculator/fixture/main.tsx`) wraps its flows in the provider and picks v2 with `?calc=v2`.

## 4. Integration seam

`CalculatorScope` stays the single owner of eligibility, the host's per-question key, the lifted
open state, focus return, the side button, inert and scroll lock, and docking. v1's shell is never
rendered around v2; each v1 shell job moves to a named v2 owner.

| v1 shell job                                             | v2 owner                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| Graphing/Scientific select                               | CB-3 mode control in the window title bar (L-12, SC-1; Phase 2) |
| Ctrl/Alt+K keypad toggle                                 | KB- shortcut handled inside the calculator                      |
| Paste button, manual paste box, paste and drop listeners | AR-14 and AR-15                                                 |
| Global "Paste points as" select                          | Per-item choice in `c-transfer.md`                              |
| Drag, resize, maximize, minimize, close                  | `CalculatorWindow` (AR-22, AR-27)                               |
| Tab trap and Escape                                      | AR-18 and AR-28                                                 |

- **AR-9** `CalculatorScope` renders `CalculatorShell` for v1 and `CalculatorWindow` with `CalculatorLoader` for v2; v1 keeps its 1100 px dock rule and phone query (`CalculatorScope.tsx:42-45`) unchanged until it is removed. (Phase 1; verified by component test)
- **AR-10** `useCalculator()` still returns `null` when the calculator is not eligible, and otherwise a bridge discriminated by `version`: v1 `{ version: "v1", open, toggle(), paste(PastePayload) }`; v2 `{ version: "v2", open, status, toggle(), transfer(payload: TransferPayload, trigger: "mouse" | "keyboard" | "touch"), prefetch() }` with `status` one of `idle`, `loading`, `ready`, `failed`, and from Phase 3 also `checkEvaluate(payload: TransferPayload): Promise<{ enabled: true } | { enabled: false; reason: string }>`. `TransferControl` passes `"touch"` when the activating tap came from a touch or pen contact (TR-55), `"mouse"` for a mouse or hovering-pen click, and `"keyboard"` for a click with no preceding `pointerdown` (TR-59); the AR-17 queue keeps each payload's trigger, and `transfer/apply.ts` calls `focusExpression(id)` for `"mouse"` and `"keyboard"` and `activateExpression(id)` for `"touch"` (API-12, TR-66, KB-4). `checkEvaluate` takes a payload whose format is `"evaluate"`, starts the lazy load as `prefetch()` does, applies the TR-31 rules to the current question's calculator state, using an empty scope when no calculator is mounted for the question, together with the payload's dependencies, inserts nothing, leaves undo history unchanged and, when Evaluate is disabled, returns the TR-62 reason text; `TransferControl` calls it when the chooser opens and shows Evaluate as `aria-disabled="true"` with no reason text until the promise settles, and a component test checks that the chooser shows each TR-62 reason from a stubbed bridge. The v2 host never calls `subscribe`. (Phase 1; verified by component test)
- **AR-11** `CalculatorSourceAction`, `CalculatorChoiceAction` and `CalculatorTableAction` keep their names and current props, gain only optional props, and branch on `bridge.version`: v1 renders today's `PasteAction` unchanged; v2 renders `TransferControl` with a payload from `src/lib/calculator-transfer/`. The seven call sites in six files change only to pass optional structured fields (table headers, row-header layout, a stable item id) that v1 ignores, and the four answer-choice call sites (`AnswerChoiceButton.tsx`, `ActiveQuizScreen.tsx`, `CatalogQuestion.tsx`, `TableChoiceOption.tsx`) add a second wrapper instance with `slot="cluster"` inside the choice's tool cluster next to cross-out: that instance renders the v2 control and renders nothing on v1, the existing instance renders nothing on v2, so v1 markup is unchanged (AR-8); daily questions (`src/components/learn/DailyChallenge.tsx`), whose choices are radio `<label>` elements with no tool cluster or cross-out, are a fifth, v2-only answer-choice call site: on v2 each choice gets a tool cluster placed as the next sibling of its `<label>` (never inside it, TR-41) that holds one instance with `slot="cluster"` and nothing else: `CalculatorTableAction` for a choice with `choice_table_data` (enabled from Phase 3, TR-77) and `CalculatorChoiceAction` otherwise, and on v1 `DailyChallenge` renders exactly as today; on v2 the control is always visible whenever `(any-pointer: coarse)` matches, in practice, catalog skill practice, daily questions and the diagnostic (TR-42), while every other item keeps the tap-the-item, then tap-the-control flow (TR-55). Because a control cannot be more visible than its cluster, on v2 each of the four existing clusters (`.choiceTools` in `ActiveQuizScreen.tsx` and `CatalogQuestion.tsx`, the hover-revealed div in `AnswerChoiceButton.tsx`, and the table-choice header in `TableChoiceOption.tsx`) gets the attribute `data-calculator="v2"`. A v2-only rule keyed on that attribute, shipped with the eager `TransferControl` styles inside AR-33's budget, sets the cluster to opacity 1 whenever `(any-pointer: coarse)` matches and sets `transition: none` on it. The always-visible control therefore shows at every width on phones, tablets and touch laptops, and every cluster shows and hides without animation (TR-42, TR-52, AN-12). When no coarse pointer is present, the control itself is opacity 0 except while the choice is hovered or focus is within its cluster, including when the diagnostic keeps the cluster visible for a crossed-out or highlighted choice. v1 renders without the attribute, so v1 markup and styles are unchanged (AR-8). The browser test covers the diagnostic at 1024×768 with touch emulation, and a profile where `(any-pointer: coarse)` and `(hover: hover)` both match. (Phase 1; verified by component test)
- **AR-12** "Export to Karman", "Export options" and "Copy for Desmos" render only on the v1 path and are deleted with it; the v2 path shows only the icon-only `TransferControl` (a small calculator with an up-right arrow, TR-43), whose tooltip "Transfer to Calculator" appears on hover and keyboard focus (TR-51) and whose accessible name starts with that text (TR-50). (Phase 1; verified by component test)
- **AR-13** No v1 shell control (mode select, paste button, "Paste points as", footer keypad button, Ctrl/Alt+K handler) is rendered or registered around a v2 calculator. (Phase 1; verified by browser test)
- **AR-14** v2 paste for math: v2 never calls v1's `parseText()`, `parseTransfer()`, `tablePayload()`, `numericCell()` or `normalizeMath()`; `src/lib/calculator-transfer/clipboard.ts`, created in Phase 1 and imported only by the lazy chunk (AR-1), holds v2's own clipboard reader and extractor, copying v1's CSV/TSV tokenizer (quoted fields, escaped quotes, embedded line breaks), v1's header-row rule generalised to 1 to 10 columns (when more rows follow, a first CSV or TSV row is dropped if every cell starts with a letter, holds only letters, digits, subscript digits, underscores and spaces, and is not `pi` or `e`), its HTML-table reading (one table, `thead`/`tfoot` and header-cell rows skipped, the KaTeX `application/x-tex` annotation read once) and its file, image and drop rejection, and returning raw math lines, coordinate pairs or a string table of 1 to 10 columns; the Paste button in the window title bar (L-12, L-13) calls its reader and, if clipboard reading fails, opens the manual "Math to paste" text box; a capture-phase `paste` listener on the shadow root passes the `DataTransfer` to its extractor; every math line, single or multi-line, is written through the PR-1 normalizer and the T-12 rules: multi-line math and coordinate pairs become new rows (pairs as point rows; from Phase 3, AR-15 offers the point or table-row choice instead), and single-line text pasted into a focused row is written at the caret with the adapter's `write`, with MathQuill's own paste handling disabled in the adapter; files, images and drops are refused with the status message "Figures, images and saved graphs can't be pasted into the calculator."; until AR-15 ships in Phase 3, a string table from the extractor inserts nothing and the A11Y-2 live region announces "This table can't be pasted into the calculator." (Phase 1; verified by browser test)
- **AR-15** v2 paste for data: a string table from `clipboard.ts` (HTML, TSV or CSV, from the Paste button, the `paste` listener or the manual box) becomes a table `TransferPayload` applied by `transfer/apply.ts` under D-14 and D-15: a new table of up to 10 columns, the D-8 1,000-row cap and D-6 validation of every cell, with an invalid cell or exceeded limit rejecting the whole paste with one status message; pasted coordinate pairs offer the same point or table-row choice as Transfer (TR-60, TR-61). (Phase 3; verified by browser test)
- **AR-16** `TransferPayload` is defined in `src/lib/calculator-transfer/payload.ts` as below; `transfer/apply.ts` validates each payload with a Zod schema inside the lazy chunk, and an invalid payload changes nothing and announces the table 11.1 "Core check failed" message ("This can't be added to the calculator.") through the TR-67 status region when the payload came from a transfer, and through the calculator's A11Y-2 live region when it came from paste (AR-15), so the standalone page also announces it. (Phase 1; verified by unit test)
- **AR-17** Transfers made while the chunk loads queue in order, each payload kept with its AR-10 trigger (at most 20; extra ones are refused with a status message), and apply once the calculator is ready, each focusing or activating its row according to that trigger; the queue belongs to the scope, so a question change discards it. (Phase 1; verified by component test)
- **AR-18** `CalculatorWindow` listens natively, in the bubble phase, for `keydown`, `keyup` and `keypress` on its frame and stops propagation after its own handling, so document- and window-level quiz shortcuts (for example `useDiagnosticState.ts:272`, `QuestionNavigator.tsx:67`) never receive calculator keystrokes; Escape closes the window only when no calculator overlay has called `preventDefault()`. (Phase 1; verified by browser test)

```ts
// src/lib/calculator-transfer/payload.ts (eager, server-safe).
// Field meanings and formatting rules: c-transfer.md TR-71
export interface TransferPayload {
  version: 1;
  questionKey: string; // attempt id + question id
  sourceId: string; // "stem:3", "table", "choice:B", …
  description: string; // plain text, as in table 8.1
  format: "rows" | "point" | "tableRow" | "evaluate" | "table";
  dependencies: string[]; // stem definitions to insert first when unused (TR-37)
  rows?: string[]; // math rows incl. inequalities (TR-11, TR-12), point rows or the evaluate row
  table?: { headers: (string | null)[]; columns: string[][] }; // first column is the input
  pairs?: [string, string][]; // tableRow format
  pointTableKey?: string; // "points" or the function name (TR-34)
}
```

`src/lib/calculator/paste.ts`, including `PastePayload` and `insertPayload`, stays byte-identical
while v1 exists, and no v2 module imports it: v2's paste path is `clipboard.ts` (AR-14, AR-15),
which exists from Phase 1. When v1 is removed, `paste.ts` and `paste.test.ts` are deleted rather
than moved, together with `CalculatorShell`, `CalculatorSurface` and `PasteAction`;
`src/lib/calculator/types.ts` stays because the legacy engine's `plot.ts`, `scene.ts`,
`engine.test.ts` and `regression.test.ts` import it.

## 5. Entry points and window modes

Entry points: the toolbar `CalculatorTrigger` ("Toggle Karman calculator"), the side button on
phones ("Open Karman calculator") and the v2 icon-only `TransferControl` (TR-43). Docking and the
floating window need a viewport at least 1024 px wide and more than 500 px tall; any other
viewport opens full screen.

| Mode        | When                                                                    | Chrome                                                                  |
| ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Floating    | Toolbar or side button, at least 1024 px wide and more than 500 px tall | Title bar (drag), Maximize, Minimize, Close, resize grip                |
| Docked      | Any transfer at the same viewport size                                  | Title, Undock, Maximize, Minimize, Close, width splitter                |
| Maximized   | Maximize from floating or docked                                        | Restore, Minimize, Close                                                |
| Full screen | Any open below 1024 px wide or 500 px tall or less                      | Title bar (label, mode control, Paste, Keyboard shortcuts; L-12), Close |

- **AR-19** `src/components/calculator/breakpoints.ts` exports `CALCULATOR_DOCK_MIN_WIDTH = 1024`, `FULL_SCREEN_QUERY = "(max-width: 1023px), (max-height: 500px)"` and `PHONE_QUERY = "(max-width: 767px), (max-height: 500px)"`; v2 code uses only these. (Phase 1; verified by unit test)
- **AR-20** Opening from the toolbar or side button gives the floating window at 1024 px and wider (over 500 px tall) and full screen otherwise, which replaces v1's popup between 768 and 1023 px; the side button shows while the window is closed and `PHONE_QUERY` matches; tests cover viewports 1023, 1024, 1280 and 390 px wide and 1280×480. (Phase 1; verified by browser test)
- **AR-21** A transfer at 1024 px and wider (over 500 px tall) docks the window whether it was closed, floating or maximized, keeping its rows; below that it opens full screen; either way the transferred row is focused as `c-transfer.md` describes; tests cover viewports 1023, 1024, 1280 and 390 px wide and 1280×480. (Phase 1; verified by browser test)
- **AR-22** The floating window keeps v1's geometry (starts at 16, 64; size `min(880px, 100vw - 32px)` by `min(600px, 100dvh - 80px)`; minimum 360 by 280 px) and drags by its title bar with pointer capture, clamped to the viewport; maximized and full-screen windows fill the viewport (`inset: 0`), full screen with safe-area padding; a resize grip element with a 24 by 24 px hit area (pointer drag, or arrow keys in 16 px steps when focused) replaces CSS `resize`, so touch tablets at 1024 px and wider can resize it; the window is re-clamped on window and `visualViewport` resize. (Phase 1; verified by browser test)
- **AR-23** The dock is a fixed left column 12 px from the left edge, running from `dockTop` (AR-24) to 12 px above the bottom; its default width is `clamp(400px, 45vw, 720px)`; a splitter (role `separator`, 24 px hit area, pointer drag, arrow keys in 16 px steps, Home and End) keeps it between 400 px and `min(900px, 100vw - 480px)`; the workspace shifts right by the dock width plus 24 px (a 12 px margin on each side) and keeps v1's single-column question rule (`calculator.module.css:283-290`). (Phase 1; verified by browser test)
- **AR-24** `CalculatorScope` takes an optional `dockTop` in pixels (default 12); `CatalogPractice` and `DailyChallenge` pass `LEARN_HEADER_CLEARANCE = 72`, exported by `LearnLayout.tsx`, so the fixed learn header (`LearnLayout.tsx:31-34`) stays uncovered; at 1024 and 1440 px the dock's top edge is below the header's bottom edge and no focusable page element is hidden under the dock. (Phase 1; verified by browser test)
- **AR-25** Window mode, floating position and size, and dock width live in `calculator-window-store.ts` for the page session, so after Next or Previous the window reopens in the same mode and place while its content is fresh; from Phase 4 the same store also holds the display size and reverse contrast choices (AR-58); the stored mode applies only when the lifted open state carries an open window into the next question, while a later open from the toolbar or side button follows AR-20 and a transfer follows AR-21. A page session is the lifetime of the loaded document: the store is module state, survives client-side navigation between quiz routes and is lost on a full reload or in a new tab. (Phase 1; verified by browser test)
- **AR-26** Resizing the viewport across 1024 px wide or 500 px tall switches between floating or docked and full screen in both directions, keeping rows, undo history and the focused row. (Phase 1; verified by browser test)
- **AR-27** Close and Minimize hide the window and keep the question's calculator content; Undock returns to floating at the last floating position; hiding restores the workspace width, removes inert, `aria-hidden` and the scroll lock, and returns focus to the opener or, if it is gone, to the toolbar Calculator button (TR-68, L-10) (`CalculatorScope.tsx:58-65`). (Phase 1; verified by browser test)
- **AR-28** Full screen is an `aria-modal` dialog: the workspace is inert and `aria-hidden`, body scrolling is locked, and focus sentinels at both ends of the frame make Tab and Shift+Tab wrap (the start sentinel calls the facade's internal `focusBoundary("last")`, because a light-DOM query cannot see shadow content). (Phase 1; verified by browser test)
- **AR-29** The calculator picks its internal layout from its own container width through a `ResizeObserver`, never from viewport media queries: L-1 at 560 px and wider, L-2 below (confirm by REA behaviour capture in Phase 1); a 461 px dock at 1024 px therefore shows L-2. (Phase 1; verified by component test)

## 6. Lazy loading and bundle budgets

v1 stays out of the Next bundle by fetching its engine from `public/` on first open
(`CalculatorSurface.tsx:22-54`), which is how `docs/enhanced-quiz-engine.md:120` can promise a
lazy-loaded engine. v2 keeps that promise with a bundler-neutral `import()` that works the same
under Turbopack and under the Vite fixture (`tests/calculator/fixture/server.mjs`). `next/dynamic`
is not used.

- **AR-30** `CalculatorLoader` calls `import("@/components/calculator-v2/host/quiz-host")` only when the version is v2 and the window first opens, a transfer arrives, or `prefetch()` runs on pointer-enter or focus of `CalculatorTrigger` or a `TransferControl`, or on the touch tap that selects a transferable item (TR-55); a fresh quiz page, every Reading and Writing page and every v1 page request no v2 chunk. (Phase 1; verified by browser test)
- **AR-31** The loader keeps its own promise state (not a module-level `React.lazy`, which caches a rejection): it shows "Loading calculator…" in the window body, the module is imported once per page; when that import fails, the panel shows "The calculator could not load. Reload the page to try again." with a "Reload page" button that reloads the document; when the module loaded but mounting or a first API call throws, it shows "The calculator could not load." with a Retry button that mounts again from the loaded module; one test makes the mount throw once and passes on Retry, and one aborts the chunk request and checks the reload panel, on the Vite fixture and under `next dev`. (Phase 1; verified by browser test)
- **AR-32** After `npm run cf:build`, `scripts/build/check-calculator-v2-bundle.mjs` fails if the sentinel string exported by `KarmanCalculator.ts` or MathQuill's `mq-root-block` class name appears in the OpenNext server handler or in any chunk that the practice, daily, earlier-subject or diagnostic routes load eagerly according to the Next client reference manifests. (Phase 1; verified by perf test)
- **AR-33** Gzip budgets: JS and CSS added to quiz routes eagerly, including `calculator-chrome.generated.css` (TH-5), at most 10 KB; JS fetched on first open, excluding the worker and fonts, at most 400 KB; worker at most 250 KB (the bootstrap plus the chunks it loads); standalone JS at most 600 KB; Phase 1 records actual sizes in `docs/calculator-v2-bundle-baseline.json`, and the check fails on growth over 10 % unless the same PR updates that file. (Phase 1; verified by perf test)
- **AR-34** On the Vite fixture in desktop Chromium, first open to a focused editable row takes at most 800 ms (2,500 ms at 4x CPU throttling) and reopening within a question at most 100 ms; measured values are recorded beside the bundle baseline. (Phase 1; verified by perf test)

## 7. Shadow root: mounting, styles, theme, motion and fonts

The UI renders into a shadow root (D4), as v1's engine already does (`CalculatorSurface.tsx:82`).
The repository's CSS Modules and Tailwind output live in the document head and do not reach inside
a shadow root, and Next has no supported way to import CSS as a string.

- **AR-35** `new KarmanCalculator(element, options)` attaches an open shadow root to `element`, installs styles and renders the UI with its own `createRoot` inside that root; it is never portalled into the quiz tree, and the quiz host talks to it only through the public API plus the internal `focusBoundary()`; the headless `CalculatorEngine` in `core/api/` has no DOM or React. (Phase 1; verified by component test)
- **AR-36** Plain CSS in `src/components/calculator-v2/styles/*.css` is compiled by `scripts/build/calculator-v2.mjs` into the committed string module `styles/generated.ts` (a drift test regenerates and compares, as `karman-calculator/build.mjs` does for `standalone-build.ts`); it is applied through one shared `CSSStyleSheet` in `adoptedStyleSheets`, falling back to a `<style>` element, and contains no Tailwind classes, CSS Modules, `@font-face` rule or `url()`; the generated modules `styles/generated.ts` and `src/lib/calculator-v2/theme/skin-colors.generated.ts` are added to the `GENERATED` list in `scripts/check-file-sizes.mjs` in the PR that creates them (the script scans only `.ts`, `.tsx`, `.mjs` and `.js` files, so `calculator-chrome.generated.css` needs no entry), and every hand-written calculator-v2 file stays under 700 lines. (Phase 1; verified by unit test)
- **AR-37** Shadow CSS uses only inherited custom properties (the `html[data-theme]` tokens from `themeStyleSheet()`, `src/lib/themes/palettes.ts:281-287`) and the derived calculator tokens of the TH- IDs; the canvas renderer reads tokens with `getComputedStyle(host)` and repaints within one animation frame when `data-theme` or `class` on `<html>` changes (`applyTheme()`, `palettes.ts:295-299`) or when `prefers-color-scheme`, `prefers-contrast` or `prefers-reduced-motion` changes; the light-DOM surfaces (the `CalculatorWindow` title bar and window controls, the AR-23 splitter, the AR-22 resize grip, the AR-31 loading and Retry panel, and `TransferControl` with its tooltip, selected outline and chooser) take their colours only from `calculator-chrome.generated.css`, keyed by `html[data-theme]` and imported by `CalculatorScope.tsx` (TH-2, TH-5). (Phase 1; verified by browser test)
- **AR-38** The calculator does not use framer-motion, so it does not depend on the app's `MotionConfig reducedMotion="user"` (`src/components/shared/ThemeProvider.tsx:133`); CSS transitions and keyframes are switched off under `@media (prefers-reduced-motion: reduce)`, and JavaScript animations read a live `matchMedia` and the `reducedMotion` setting (API-7, AN-13); durations and easing come from the AN- IDs. (Phase 1; verified by browser test)
- **AR-39** `host/quiz-host.ts` imports `katex/dist/katex.min.css` at document scope (the file `MathText.tsx:17` imports), so the bundler rewrites the font URLs and the calculator never relies on `MathText` being on the page; the vendored MathQuill CSS has its Symbola `@font-face` removed and maps `.mq-math-mode` to `KaTeX_Main` and variables to `KaTeX_Math` with no Symbola fallback. (Phase 1; verified by unit test)
- **AR-40** In Chromium and iPhone WebKit: `document.fonts.check("16px KaTeX_Math")` is true after mount, no font request fails, no shadow-root stylesheet contains `@font-face`, and in Chromium the CDP call `CSS.getPlatformFontsForNode` on a MathQuill variable reports `KaTeX_Math`. (Phase 1; verified by browser test)
- **AR-41** At prefetch or activation, whichever comes first, the loader calls `document.fonts.load()` for `KaTeX_Main` and italic `KaTeX_Math` without delaying first render; when they resolve or `document.fonts` fires `loadingdone`, every mounted MathField gets `reflow()` and the canvas redraws; a transferred row with parentheses and a square root, inserted before the fonts are warm, matches its visual baseline after reflow. (Phase 1; verified by visual test)
- **AR-42** The MathField adapter exposes focus, blur, `latex()` get and set, `write`, `cmd`, `keystroke`, `typedText`, `select`, `clearSelection`, `reflow`, `setInputMode("none" | "text")` for soft-keyboard suppression, speech text, and edit, enter, arrow-out and focus events; typing, selection, focus and blur work inside the shadow root, and any MathQuill change this needs is a documented patch in `vendor/mathquill/PATCHES.md`. (Phase 1; verified by browser test)

## 8. Compute worker

The repository has no Web Worker today, and production builds go through Turbopack and OpenNext
while the calculator Playwright suite runs under Vite. The evaluator is a closure compiler, and
closures cannot cross `postMessage`, so the worker owns its own copy of the pure core and receives
row source, not compiled code.

- **AR-43** `worker/create.ts` runs `new Worker(new URL("./compute.worker.ts", import.meta.url), { type: "module", name: "karman-calculator" })` (a module worker under Vite and esbuild; Turbopack emits a classic bootstrap worker that loads the worker chunks); the worker's `ready` message carries `worker: "karman-compute-v1"`, which identifies its code in build output inside the lazy chunk; each calculator instance has one worker, terminated by `destroy()`; the standalone build swaps `create.ts` for `create.standalone.ts`, which points at its own `worker.js`. (Phase 1; verified by browser test)
- **AR-44** `core/latex`, `core/analysis`, `core/eval`, `core/lib`, `core/regression` and `plot/` have no DOM access and run unchanged in the worker and in the main-thread executor; `compute.worker.ts` only wires a message port to `executor.ts`, which unit tests drive directly; no module under `src/lib/calculator-v2/`, `src/components/calculator-v2/` or `vendor/mathquill/` calls `eval`, `new Function` or string-argument `setTimeout`/`setInterval`, checked by a unit test that runs the core corpus in a context whose `Function` and `eval` throw. (Phase 1; verified by unit test)
- **AR-45** Messages are versioned plain objects (`v: 1`). Main to worker: `hello`, `state` (generation, rows as `{ id, type, latex, columns, hidden, sliderBounds }`, settings, slider values), `view` (generation, viewport, pixel size, device pixel ratio), `evaluate` (job id, generation, LaTeX) and `dispose`. Worker to main: `ready`, `begin` (generation, row id), `analysis`, `value`, `plot` (geometry in transferable `Float64Array` or `Float32Array` buffers), `regression`, `poi`, `overrun`, `heartbeat`, `done` and `fault`. No function, closure or `SharedArrayBuffer` crosses threads, so no COOP/COEP headers are needed. (Phase 1; verified by unit test)
- **AR-46** Every state or view change increments the generation; the worker drops superseded work at its next yield, and the main thread discards any message whose generation is not current: `plot` and `done` are current only at the latest generation sent, and `analysis`, `value` and `overrun` messages are current while no later `state` was sent, because a view change does not change values. (Phase 1; verified by unit test)
- **AR-47** The executor yields to its event loop through a `MessageChannel` macrotask after each unit of work (one values pass, one helper evaluation or one row's plot) that ends 8 ms or more after its slice began and posts a `heartbeat` at least every 200 ms while a job runs. (Phase 1; verified by unit test)
- **AR-48** Loops in Σ, Π, ∫ quadrature, list comprehensions, list functions, regression iterations and implicit grids check a deadline: 250 ms for a row value, 1,000 ms for a regression fit and 500 ms per curve for points of interest; plot sampling has no total limit but is sliced (AR-47); on expiry the row shows "This is taking too long. Try a smaller range or fewer terms."; the static caps of the NM- IDs are checked before evaluation starts. (Phase 1; verified by unit test)
- **AR-49** If no message arrives for 1,500 ms while a job is active, the main thread terminates and respawns the worker, gives the row named by the last `begin` the AR-48 message, and resubmits the current state without that row until it is edited; the new worker returns its first result within 300 ms. (Phase 1; verified by browser test)
- **AR-50** If the `Worker` constructor throws, the worker errors before `ready`, or `ready` takes longer than 3,000 ms, the engine runs the same executor on the main thread in the AR-47 slices with the AR-48 deadlines and graphs still render, including when the test stubs `Worker` to throw and when the standalone page is opened from `file://`. (Phase 1; verified by browser test)
- **AR-51** The main thread only parses and analyses rows for immediate UI feedback (errors, slider chips, row kinds) and renders; it never evaluates row values, `HelperExpression` values, regressions, inference tests, Σ, Π, ∫ or comprehensions; while the Phase 1 typing corpus is entered, Chromium's long-task observer attributes no task over 50 ms to calculator code. (Phase 1; verified by perf test)

## 9. Failure containment

v1's engine is imperative and cannot unmount React; a v2 React tree could. React 19 unmounts a
root on an uncaught render error, the repository has no error boundary or `error.tsx`, and the
diagnostic timer renders in the same tree as the calculator (`DiagnosticClient.tsx:74-90`).
Containment is therefore structural.

- **AR-52** An error boundary at the top of the calculator's own React root replaces its UI with "The calculator hit a problem." plus Retry (remount the UI from the engine's last committed state) and "Reset this question's calculator" (`setBlank()`, then remount); the quiz's selected answer, timer and navigation stay mounted. (Phase 1; verified by component test)
- **AR-53** `CalculatorScope` wraps `CalculatorWindow` and `CalculatorLoader` in an error boundary whose fallback is the AR-31 Retry panel, and the loader catches synchronous throws from `mountQuizCalculator()` and API calls, so no calculator error reaches the quiz root. (Phase 1; verified by component test)
- **AR-54** Parse, analysis and evaluation errors are values shown as R-2 messages and are never thrown into React; only invalid API input throws, as `KarmanCalculatorError` (API-13). (Phase 1; verified by unit test)
- **AR-55** When loading has failed (the test blocks the chunk), a transfer opens the window on the Retry panel and the `TransferControl` announces the table 11.1 message "Calculator unavailable. Use Retry in the calculator panel." (after a load failure the message is "Calculator unavailable. Reload the page to use it.") through the TR-67 status region; a transfer never fails silently. (Phase 1; verified by browser test)
- **AR-56** In the diagnostic flow with a runaway row entered (in Phases 1 to 3 a 2,000-node implicit equation evaluated at the G-15 budget; from Phase 4 also `\sum_{n=1}^{10^5}\sum_{m=1}^{10^5}\sin(nm)`), the section timer keeps updating every second and Skip responds within 300 ms, while the row shows the NM- cap error or the AR-48 message within 2 s. (Phase 1; verified by browser test)
- **AR-57** The quiz host passes `onError`, which sends calculator exceptions to Sentry tagged `calculator=v2` with the build id and with no LaTeX, row content, question text or answer data; the standalone page reports nothing. (Phase 1; verified by unit test)

## 10. Per-question reset and teardown

The reset contract is `docs/enhanced-quiz-engine.md:66` ("Each question owns a fresh calculator
scope") plus lead resolution R10 as amended by the owner: hosts key `CalculatorScope` per
question, the calculator remounts with the scope, and the constructor calls `setBlank()`. Only the
open state the hosts already lift (for example `QuizEngine.tsx:56`), the window geometry (AR-25)
and the two accessibility settings display size and reverse contrast (AR-58) outlive a question,
and none of them holds math.

- **AR-58** Each new scope creates its own `KarmanCalculator`, whose constructor applies the `displaySize` and `reverseContrast` options and then calls `setBlank()` before first render, so nothing else from a previous question survives: rows, tables, sliders, undo history, every other setting (angle unit back to radians, complex mode off, grid, axes and bounds), mode back to graphing, viewport, keypad, pending transfers, clipboard reads and worker jobs; from Phase 4, when S-3 and S-4 ship, `CalculatorLoader` passes the display size and reverse contrast held in `calculator-window-store.ts` to `mountQuizCalculator()`, which passes them as those options and writes each change of either setting back to the store through the `settings` observer (API-8), so both persist for the page session (owner decision, overview section 10.3), and the first calculator of the page session writes the S-3 default and the S-4 starting value (from `prefers-contrast: more`, evaluated once at that creation) to the store, so every later calculator in the session uses the stored values until the student changes one, whatever the operating system reports afterwards (S-4); when the window was open at the question change (AR-25), the new calculator announces the reset once, and a calculator first mounted within a question announces nothing (A11Y-2). (Phase 1; verified by browser test)
- **AR-59** Closing and reopening within one question keeps rows, history, settings, mode and viewport. (Phase 1; verified by browser test)
- **AR-60** `destroy()` is idempotent and releases the worker, animation frames and timers (slider play, zoom), every `ResizeObserver`, `MutationObserver`, `matchMedia` and `document.fonts` listener, document and window listeners added by MathQuill or the UI, the React root and the shadow root's children; late results (worker messages, clipboard reads, font loads, imports) check a destroyed flag and do nothing. (Phase 1; verified by component test)
- **AR-61** After 20 question changes with the calculator opened each time, a development-only counter, compiled out of production builds, reports at most one live calculator instance and one live worker. (Phase 1; verified by browser test)

## 11. Public API (`KarmanCalculator`)

D6: a Desmos-style programmatic API implemented by Karman's own engine. The API is main-thread and
synchronous for state; computed values arrive asynchronously through observers. Transfers do not
go through the API surface: the quiz host converts a `TransferPayload` with `transfer/apply.ts`,
which uses only public methods. The headless `CalculatorEngine` in `core/api/` validates the API-1
options and implements every other API- method and observer; `KarmanCalculator` adds the element,
shadow root, React UI, `resize()` and `focusBoundary()` and forwards every other method to it.
`CalculatorEngine` implements `focusExpression(id)`, `focusFirstExpression()` and
`activateExpression(id)` as active-row state changes that fire the `focusedExpression` observer.
KarmanCalculator's versions also move DOM focus into the row's MathField (`focusExpression`,
`focusFirstExpression`) or keep it out of the MathField (`activateExpression`). As a result,
`transfer/apply.ts` runs unchanged on the headless engine in TR-79.
API- IDs verified by unit test run against `CalculatorEngine` in node, TR-79's apply
step uses the same engine, and one component test (jsdom) checks that each `KarmanCalculator`
method forwards to the engine. `transferTarget` from the original spec is removed.

```ts
interface CalculatorOptions {
  mode?: "graphing" | "scientific"; // default "graphing"; "scientific" from Phase 2 (API-14)
  angleMode?: "radians" | "degrees"; // default "radians" (D5)
  keypad?: boolean; // default false
  expressionsCollapsed?: boolean; // default false
  onError?: (error: Error) => void; // host reporting hook (AR-57)
  seed?: number; // tests only (FN-7); the quiz host and standalone page never pass it
  reducedMotion?: boolean; // true when the quiz Question animations setting is off (AN-13)
  displaySize?: "default" | "large"; // page-session value from the quiz host (AR-58); S-3 default
  reverseContrast?: boolean; // page-session value from the quiz host (AR-58); S-4 default
}
interface ExpressionState {
  id: string;
  type?: "expression" | "table"; // default "expression"
  latex?: string;
  color?: string; // "c1" to "c6" are skin slots (TH-10); "#rrggbb" is an explicit colour (TH-11)
  hidden?: boolean;
  lineStyle?: LineStyle; // values defined with R-4
  pointStyle?: PointStyle; // values defined with R-4
  sliderBounds?: { min: string; max: string; step: string };
  columns?: { latex: string; values: string[]; color?: string; hidden?: boolean }[];
}
```

- **API-1** `new KarmanCalculator(element, options?)` validates `options` (defaults above) and throws on invalid ones; the SAT configuration (CB-1, CB-2) is fixed and has no option; `seed`, when given, replaces the per-mount and per-reset random seed of FN-7 so every random value is deterministic. (Phase 1; verified by unit test)
- **API-2** `setExpression(state)` upserts one row by `id` and `setExpressions(list)` upserts several as one undo step; omitted fields keep their values; a new row takes the next skin colour slot; types `note`, `folder`, `image` and `text` throw KarmanCalculatorError with code `unsupported` and change nothing (CB-1, API-13). (Phase 1; verified by unit test)
- **API-3** `setExpression({ type: "table", columns })` creates or replaces a table with ordered columns of LaTeX headers and string cell values, alongside D-1. (Parity; verified by unit test)
- **API-4** `removeExpression({ id })` and `removeExpressions(list)` delete rows as one undo step; `getExpressions()` returns deep copies in list order. (Phase 1; verified by unit test)
- **API-5** `getState()` returns versioned JSON `{ version: 1, mode, settings, viewport, expressions, scientific }` (`scientific` is empty until API-14 lands) with no question content or student identity; `setState(state, { allowUndo })` validates first and either applies everything or throws and changes nothing; `getState()` after `setState(getState())` is identical. (Phase 1; verified by unit test)
- **API-6** `setBlank({ allowUndo = false })` restores the default rows, settings, mode, viewport and keypad, clears history and cancels pending jobs, and keeps the current `displaySize` and `reverseContrast`, which only the constructor options, `updateSettings` and `setState` change (API-7's phase rule applies to all three) (AR-58); the AR-52 "Reset this question's calculator" action therefore keeps them too. (Phase 1; verified by unit test)
- **API-7** `setMathBounds({ left, right, bottom, top })` requires finite `left < right` and `bottom < top`; `updateSettings(partial)` accepts only `angleMode`, `complex`, `showGrid`, `polarGrid`, `minorGridlines`, `arrows`, `axisNumbers`, `xAxis` and `yAxis` (each `{ show, label, step }`; bounds go through `setMathBounds`), `lockViewport`, `piAxisLabels`, `displaySize`, `reverseContrast`, `keypad`, `expressionsCollapsed`, `mode` and `reducedMotion`, and rejects anything else without changing state. Until the settings that give them meaning ship, `lockViewport` and `piAxisLabels` (S-8, Phase 2) and `displaySize` and `reverseContrast` (S-3, S-4, Phase 4) accept only their defaults (`false`, `false`, `"default"`, `false`) here and as API-1 constructor options; any other value throws `unsupported` and changes nothing, as API-14 does for `mode`. (Phase 1; verified by unit test)
- **API-8** `observe(name, callback)` and `unobserve(name, callback?)` cover `expressionAnalysis`, `graphpaperBounds`, `settings`, `focusedExpression` and `mode`; `observeEvent("change", callback)` and `unobserveEvent` cover any committed change; callbacks run after the change commits, at most once per animation frame per name, and `observe` returns an unsubscribe function. (Phase 1; verified by unit test)
- **API-9** `expressionAnalysis` maps each row id to `{ isGraphable, isError, errorMessage, evaluationDisplayed, evaluation }`, where `evaluation` is `{ type: "number", value }`, `{ type: "complex", value: { re, im } }`, `{ type: "list", value }` or `{ type: "point", value: [x, y] }` (RC-6, RC-15, NM-5), and a row whose value is undefined (NM-6) has `evaluationDisplayed: true` and `evaluation: { type: "undefined" }`; analyses are filled asynchronously from the worker; a row whose value is a distribution, inference test, matrix, colour or tone has evaluationDisplayed: true and evaluation: { type: "other", display } where display is the row's R-5 text. (Phase 1; verified by unit test)
- **API-10** `HelperExpression({ latex })` returns an object with `numericValue` (`NaN` until computed or when undefined), `listValue`, `observe("numericValue" | "listValue", callback)`, `unobserve` and `destroy()`; it adds no visible row and is evaluated in the worker, and `numericValue` is NaN for a non-real result. (Phase 1; verified by unit test)
- **API-11** `undo()`, `redo()`, `clearHistory()`, `canUndo()` and `canRedo()` share one history stack with the toolbar and the KB- shortcuts. (Phase 1; verified by unit test)
- **API-12** `focusExpression(id)` and `focusFirstExpression()` move focus to a row; `activateExpression(id)` makes the row the active row (L-3 focused-row styling, scrolled into view, target of keypad input) without moving DOM focus into its MathField, and fires the `focusedExpression` observer; `transfer/apply.ts` calls `focusExpression(id)` for a `"mouse"` or `"keyboard"` transfer and `activateExpression(id)` for a `"touch"` transfer (AR-10, TR-66, KB-4); and `resize()` re-measures after the host changes size. (Phase 1; verified by component test)
- **API-13** Invalid arguments throw `KarmanCalculatorError` with code `invalid-argument`, `unsupported` or `destroyed` and leave state unchanged; a `setExpression`, `setExpressions` or `setState` call that would exceed the NM-42 row or character limit throws `invalid-argument` and changes nothing; math errors never throw; after `destroy()` every method throws `destroyed`. (Phase 1; verified by unit test)
- **API-14** `mode: "scientific"`, as an option or through `updateSettings({ mode })`, switches to the SC- calculator; `getState().scientific` then holds its rows, history, `ans` and its own `angleMode` (SC-10), and `updateSettings({ angleMode })` changes the angle unit of the mode that is showing; before Phase 2 the value throws `unsupported`. (Phase 2; verified by unit test)
- **API-15** `KarmanCalculator.version` is the build id and `KarmanCalculator.apiVersion` is 1; quiz builds expose no `window` globals, while the standalone page sets `window.KarmanCalculator` (the constructor) and `window.karmanCalculator` (its instance). (Phase 1; verified by browser test)

## 12. Standalone build and the switch-over of `public/karman-calculator/`

Today `/karman-calculator/index.html` is v1's standalone page, and the same three files are the
quiz loader's source (`CalculatorSurface.tsx:25-38`). v2 cannot overwrite them while v1 serves
students, and a public v2 page before the switch would bypass the flag.

- **AR-62** `scripts/build/calculator-v2.mjs`, run by `npm run calculator:build` after the v1 build (`node karman-calculator/build.mjs && node scripts/build/calculator-v2.mjs`, so `prebuild` and `predev:calculator` run both), bundles `standalone/main.tsx` with esbuild (already in the tree through `tsx`, added as an explicit devDependency pinned to an exact version) into `index.html`, `calculator.js`, `calculator.css` (document-level KaTeX fonts and page layout), `worker.js` and the KaTeX woff2 files it uses, with content-hash query strings and the 12-skin token sheet from `themeStyleSheet()`; the page defaults to `observatory` when `prefers-color-scheme` is dark and `ivory` otherwise, offers all 12 skins, links `/calculator-notices.txt` and makes no cross-origin request; `calculator.js` is emitted as a classic script (esbuild format `"iife"`) and `index.html` loads it without `type="module"`, so the page runs from `file://` (V1-13); the worker's failure to start from `file://` falls back to the main thread under AR-50; the build writes an esbuild metafile, and a unit test fails unless `public/calculator-notices.txt` has an entry (package name, version, upstream notice text) for every third-party package in the standalone bundle and the lazy calculator chunk, including react, react-dom, scheduler, lucide-react, MathQuill and KaTeX. (Phase 1; verified by browser test)
- **AR-63** Until the switch-over the standalone output goes to `tmp/calculator-v2-standalone/` (gitignored), which the Vite fixture serves at `/karman-calculator-v2/` for tests, and nothing under `public/` contains v2 code. The Phase 1 PR changes `webServer.command` in `playwright.calculator.config.ts` from `node tests/calculator/fixture/server.mjs` to `npm run dev:calculator`, so the `predev:calculator` build (v1 and v2, AR-62) runs before every calculator Playwright run, and a unit test asserts that the config starts its server with `npm run dev:calculator`. The same PR changes `tests/calculator/fixture/server.mjs` to serve `tmp/calculator-v2-standalone/` at `/karman-calculator-v2/`, and a test fails when that path returns 404. (Phase 1; verified by unit test)
- **AR-64** The switch-over PR moves v1's three files to `public/karman-calculator/v1/`, changes `karman-calculator/build.mjs`'s output folder to `public/karman-calculator/v1/` and `CalculatorSurface`'s base path to `/karman-calculator/v1/` in the same commit, keeps `npm run calculator:build` running the v1 build before `scripts/build/calculator-v2.mjs`, and points the standalone build at `public/karman-calculator/`, gitignoring only the v2 files at the folder root while `v1/` stays tracked, so `/karman-calculator/index.html` serves v2; the `v1/` folder is deleted with the old engine two weeks after a stable switch. (Phase 3; verified by browser test)

`vendor/**`, `tmp/calculator-v2-standalone/` and, after the switch, the generated v2 files at the
root of `public/karman-calculator/` are added to the ESLint ignores in `eslint.config.mjs` and to
`.prettierignore`. AR-63 sets how the calculator Playwright runs build and serve the v2 standalone
output.

## 13. Checks outside the Vite fixture

The calculator fixture bundles with Vite, so a passing fixture suite does not prove that Turbopack
and OpenNext emit a working lazy chunk and worker.

- **AR-65** `tests/e2e/calculator-v2.spec.ts` runs against `npm run dev:next` as `dev_seed_admin` with `CALCULATOR_V2_ROLLOUT=admins`, opens the calculator in practice and diagnostic, graphs `y=x^2`, sees the worker script load from `/_next/`, docks on a transfer at 1280 px and goes full screen at 390 px. (Phase 1; verified by browser test)
- **AR-66** Before each phase PR merges: after `npm run cf:build`, the AR-32 and AR-33 checks pass, the emitted worker (the Turbopack bootstrap named by the lazy chunk's worker call and the chunks it loads, one of which contains `karman-compute-v1`) is found under `.open-next/assets/_next/static/`, and a Playwright test against `npm run cf:preview` constructs it on the preview origin the way the Turbopack runtime does (a classic worker on the bootstrap URL carrying its chunk list, named `karman-calculator`), sends `hello`, `state` and `view` for `y=x^2`, and receives a non-empty `plot` with no console errors. (Phase 1; verified by browser test)

AR-65 covers Turbopack's development bundling with real pages and seeded data; AR-66 covers the
production worker artifact, because quiz routes need a signed-in user and the dev auth bypass is
off in production builds. After each deploy with `CALCULATOR_V2_ROLLOUT=admins`, an admin signs in
on production and repeats AR-65's steps once as a release check.

## 14. Findings resolved here

| Finding                      | Resolution                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| F6 integration seam          | AR-6 to AR-18 and `TransferPayload`; v1 path byte-identical (AR-8); no `observe`-to-`subscribe` mapping |
| F7 opening, docking, layout  | AR-19 to AR-29; 1024 px replaces 1100 px for v2 (AR-19)                                                 |
| F26 lazy loading and budgets | AR-1 to AR-3 and AR-30 to AR-34                                                                         |
| F27 styles and mounting      | AR-35 to AR-38; separate root chosen over a portal for containment (AR-35, AR-52)                       |
| F28 fonts and MathQuill      | AR-5 and AR-39 to AR-42                                                                                 |
| F29 worker                   | AR-43 to AR-51 and AR-66; shared memory not used (AR-45)                                                |
| C2 containment               | AR-17, AR-31 and AR-52 to AR-57                                                                         |

## 15. Owner decisions applied

The owner-confirmed interpretations in the overview's section 10.3 apply here as follows.

| Decision                                                                                        | Where                                    |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Display size and reverse contrast persist for the page session; everything else resets          | AR-25, AR-58, API-6, `CalculatorOptions` |
| The Transfer control is icon-only; "Transfer to Calculator" is its tooltip and name start       | AR-12, module layout, section 5          |
| Answer choices on touch show an always-visible Transfer icon beside cross-out, in every mode    | AR-11                                    |
| Inequalities and systems of inequalities transfer as rows that graph with shading               | `TransferPayload.rows`                   |
| Touch flow: tap the item, tap the control on top of it, pick a format only when there is choice | AR-10, AR-11, AR-30, API-12              |
| Docking and floating need at least 1024 px wide and more than 500 px tall; else full screen     | AR-19 to AR-21, AR-26                    |
