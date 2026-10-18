# Karman calculator v2, Desmos-parity increment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps the owner found when testing Phase 1 increment 1A, in the order and with the
decisions of `docs/superpowers/specs/calculator-v2/f-desmos-parity.md` (appendix F, owner decisions
of 2026-10-18): (a) points of interest and coordinate labels, (b) the Add item menu and tables, (c)
regression, (d) the visual retune, (e) docking on open, then (f) Transfer to Calculator including
tables. Every feature stays behind `CALCULATOR_V2_ROLLOUT`; v1 is untouched with the flag off (AR-8).

**Architecture:** The framework-free core (`src/lib/calculator-v2/`) gains three pure modules:
`poi/` (points of interest on compiled closures), `core/data/` (tables, lists of cells and
regression rows folded into the existing analysis and evaluation as synthetic definitions) and
`regression/` (least squares by one-sided Jacobi SVD and Levenberg–Marquardt, log mode and
statistics). They run in the compute worker exactly where values and plots run today (AR-44,
AR-50), and the protocol gains `select` (main to worker) and filled-in `poi`, `regression` and
`table` messages (worker to main). The React UI gains an Add item menu, a `TableItem`, a
`RegressionPanel`, and a DOM overlay on the graph for point-of-interest dots' labels and the trace.
The seam opens the window docked on wide viewports. Transfer to Calculator follows the Phase 1
packages 12 and 14, extended to tables.

**Tech Stack:** as Phase 1 (`../2026-10-16-calculator-v2-phase1/00-index.md`): TypeScript, React 19
in a shadow root, vendored MathQuill `1cbc1c4128`, KaTeX fonts, Vitest 4.1.11, Playwright on the
Vite fixture (`playwright.calculator.config.ts`), Node 22.

**Spec:** the overview `docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md`, its
appendices A to E, `open-items.md`, and appendix F, whose owner decisions override the other files
where they conflict. Contracts for new modules: `01-interfaces.md`.

## Global Constraints

Every Phase 1 global constraint (Phase 1 `00-index.md`, "Global Constraints") applies unchanged.
In addition:

- **Owner decisions of 2026-10-18 (appendix F, verbatim summary):** priority (a) to (f) before the
  remaining Phase 1 polish; "Behaviour wins" (match Desmos's observable behaviour; keep only
  Karman's accessibility additions — spoken point kinds, named table cells and headers,
  live-region announcements — and the D9 contrast rules); no inference item (the + menu offers
  Expression and Table only); Desmos-strength shading within the 4.5:1 curve rule; Karman's own
  palette with Desmos's feel (red, blue, green, purple, then a neutral; chroma at most 0.17 on light
  and 0.14 on dark skins); dock on open at desktop widths (at least 1024 px); the sans UI font
  (Arial) for all calculator UI text including the window title.
- **Research boundary:** plan executors never visit desmos.com. Appendix F already records the
  observed behaviour. No Desmos code, DOM, icons, fonts, logo or exact visual design is copied, and
  no hosted calculator API, SDK or licence key is used (CLAUDE.md).
- **Never deploy:** no `npm run cf:deploy`, `wrangler deploy` or `wrangler secret`. No push to
  `main` or `zakaria/calculator-regression-release`. No `.env*` file or secret is committed.
- **Spec edits:** where appendix F changes an existing ID, or adds a requirement with no ID, the
  task that ships the behaviour applies the replacement text of section 4 to the spec file in the
  same commit as its code and tests (the open-item rule of Phase 1 section 4).

## 1. Branch, pull requests and environment

- All work is on `zakaria/calculator-v2-parity`, cut from `origin/zakaria/calculator-v2` at
  `7258c39` ("Add calculator v2 appendix F …"). Every completed task is committed; the branch is
  pushed after each task (`git push -u origin zakaria/calculator-v2-parity`).
- **PR 1** (packages 02 to 06, features a to e) targets `zakaria/calculator-v2`. **PR 2**
  (package 07, feature f) targets `zakaria/calculator-v2` after PR 1, from the same branch or a
  branch cut from it. Neither targets `main` or `zakaria/calculator-regression-release`.
- Node 22 (`.nvmrc`). Install with `npm install --no-audit --no-fund` (the lockfile on this branch
  lacks `esbuild@0.28.2`, so `npm ci` refuses it), then `git checkout -- package-lock.json`.
- Playwright: `npx playwright install --with-deps chromium webkit firefox`. Where the network
  policy blocks the browser CDN, only Chromium runs, so the browser gate runs calculator-chrome and
  calculator-android and the PR records that calculator-firefox, calculator-safari and
  calculator-ios were not run.
- Tests that need Supabase or Clerk secrets (`npm run test:e2e`, the visual regression suite, the
  `next dev` smoke) are skipped and the PR says so.

## 2. Packages

| File               | Key       | Title                                                                     | PR  | Depends on |
| ------------------ | --------- | ------------------------------------------------------------------------- | --- | ---------- |
| `02-poi.md`        | poi       | Points of interest, selection, coordinate labels, tracing, keyboard trace | 1   | none       |
| `03-tables.md`     | tables    | Table rows: model, analysis, evaluation, plotting (core half)             | 1   | 02         |
| `03-tables-ui.md`  | tables-ui | Add item menu, TableItem, cell keyboard, style menu, Create table, phone  | 1   | 03         |
| `04-regression.md` | regress   | `~` rows, fitting, log mode, residuals, results panel                     | 1   | 03         |
| `05-visual.md`     | visual    | Curve palette, shading strength, strokes, points, grid, axes, rows, fonts | 1   | 02, 03     |
| `06-dock.md`       | dock      | Toolbar and side button open docked on wide viewports                     | 1   | none       |
| `07-transfer.md`   | transfer  | Transfer to Calculator: Phase 1 packages 12 and 14, plus tables and pairs | 2   | 03, 06     |

Packages run in table order in one worktree (one executor). Within a package, tasks run in file
order and each ends in a commit.

### IDs by package

- **02 poi:** POI-1, POI-2, POI-4 to POI-14, POI-16 to POI-20; A11Y-9; KB-14; K-9.
- **03 tables:** D-1, D-4, D-6, D-10, D-11, D-20; API-3.
- **03 tables-ui:** S-2, S-10 to S-13; D-5, D-7, D-8, D-9, D-12, D-13, D-16, D-19, D-41, D-42.
- **04 regress:** PR-30; D-2, D-3, D-22, D-24 to D-34, D-36, D-37, D-39, D-44 to D-46; POI-3; K-8; A11Y-10.
- **05 visual:** TH-6, TH-7, TH-8, TH-17, TH-19; G-25; L-3, L-16.
- **06 dock:** L-4.
- **07 transfer:** the IDs of Phase 1 `12-transfer-core.md` and `14-transfer-ui.md`, plus TR-22 to
  TR-25, TR-34, TR-39, TR-60, TR-61, TR-63, D-17, D-18.

`npx tsx scripts/calculator-v2/check-spec-ids.mjs --ids <list>` checks each package's list at its
gate (the `--packages` mode reads only the Phase 1 index).

## 3. Working rules

- **TDD, strictly.** Each task: write the failing tests with the titles given, run them and see
  them fail for the stated reason, write the minimal code, see them pass, commit. Test titles start
  with spec IDs (Phase 1 `01-interfaces.md` section 0).
- **After each task:** the touched tests, `npx tsc --noEmit`, `npx eslint <changed files>` and
  `npx prettier --check <changed files>`.
- **After each package:** `npx vitest run` (full), `npm run lint`, `npm run format:check`,
  `node scripts/check-file-sizes.mjs`, `node scripts/build/calculator-v2.mjs --styles --check`
  (after a CSS change, regenerate first), and `npm run test:calculator -- <specs touched>` on
  calculator-chrome, calculator-firefox, calculator-safari, calculator-android and calculator-ios
  (those that can run, section 1).
- **v1 stays untouched (AR-8):** no file under `karman-calculator/`, `src/lib/calculator/` or the
  v1 branches of `src/components/calculator/` changes; the existing v1 browser specs stay green.
- **Files under 700 lines**, tests included (the size check scans only `src/`; plan files and specs
  under `tests/` keep the same limit by hand).
- **Generated files** (`skin-colors.generated.ts`, `calculator-chrome.generated.css`,
  `styles/generated.ts`) are written only by their scripts, in the same commit as their source.
- **Commit messages** end with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## 4. Spec text applied with the code

Each row names the task that applies it. "Amend" replaces the ID's statement with the text given in
that task's "Spec edit" step; "add" appends a new ID after the named one. Phase tags of amended and
added IDs read "(Parity; verified by …)": appendix F decision 1 pulls them ahead of their phases.
Appendix F gains a section "Parity increment scope" listing these IDs (02 Task 1).

| ID(s)                            | File | Change                                                                       | Task           |
| -------------------------------- | ---- | ---------------------------------------------------------------------------- | -------------- |
| POI-1, POI-2, POI-7              | A    | selected row (not focused), circle top/bottom, combined kind wording         | 02 T1, T3      |
| POI-9, POI-12, POI-13, POI-14    | A    | labels close on pan/zoom; 5-decimal floor; click rules; trace rounding       | 02 T2, T6, T7  |
| POI-17 to POI-20                 | A    | add: selection, hit area, label placement, keyboard trace                    | 02 T4 to T8    |
| A11Y-9, KB-14, K-9               | E    | Desmos kind words; Page Up/Down in trace and `[` `]` kept; keypad trace key  | 02 T8          |
| D-1, D-4, D-6, D-10, D-11, API-3 | B, D | tables ship; defined list names make computed columns; empty header          | 03 T1 to T4    |
| S-2, S-10 to S-13                | E    | Expression and Table only; menu keyboard, placement, insertion, announcement | 03-ui T1       |
| D-5, D-7, D-8, D-9, D-12, D-13   | B    | Desmos keyboard, no row/column buttons, style menu, toast                    | 03-ui T2 to T8 |
| D-16, D-19, D-41, D-42           | B    | Zoom Fit; empty-cell names; add phone keypad and overflow rules              | 03-ui T7, T9   |
| PR-30                            | A    | `\sim` parses once at top level (pulled forward)                             | 04 T1          |
| D-22, D-24, D-26, D-28 to D-34   | B    | Desmos fit, error, log-mode, statistics and residual behaviour               | 04 T2 to T6    |
| D-3, D-37, K-8, D-44 to D-46     | B, E | one-tap linear regression; Desmos layout; clash; formats; live refit         | 04 T6, T7      |
| D-35                             | B    | moved to "Out of scope after appendix F" (no parameter sliders)              | 04 T6          |
| TH-6, TH-7, TH-8                 | E    | palette rule; per-skin shading cap                                           | 05 T1, T2      |
| G-25, TH-19                      | A, E | add: stroke, point, dash and axis sizes; neutral grid                        | 05 T3          |
| L-3, L-16, TH-17                 | E    | whole-gutter fill; add row look; sans title                                  | 05 T4          |
| L-4                              | E    | toolbar and side button dock on wide viewports                               | 06 T1          |

A = `a-math-semantics.md`, B = `b-functions-and-data.md`, D = `d-architecture-integration.md`,
E = `e-ux-keypad-accessibility-theme.md`.

## 5. Deliberate deviations and limits

- **Lists are internal.** Table columns, regression residuals and their names are list values, a
  row naming one (`y_1`) shows the list, and computed columns evaluate element by element. List
  literals `[1,2,3]`, list arithmetic in rows and statistics functions stay in their phases (NM-30
  to NM-41, FN-23 onward); a row such as `y=x_1` draws nothing.
- **Residual numbering** is by regression row order (lowest free k), not by creation time, so
  deleting an earlier regression renumbers later residuals. Appendix F observed creation order.
- **Affine detection** for the direct least-squares path is numeric (the model evaluated at
  random parameter vectors must be affine to 1e-9 relative), not symbolic as D-25 says; both give
  the same path for every SAT model form.
- **Table size:** no virtualisation; D-21's 1,000-row perf budget and D-38's regression budget stay
  open, as do D-14 and D-15 (paste into tables, package 13) and D-12's drag mode.
- **Audio trace** (POI-20) ships its keyboard navigation and announcements; A11Y-13's tones,
  pitch and stereo pan stay in Phase 4.
- **Inference** (FN-59 menu item) is out of scope by owner decision 3.

## 6. Done

PR 1: the plan committed; packages 02 to 06 built with passing unit, component and browser tests
on every calculator project that can run; the full Vitest suite, lint, format, file sizes and
style drift green; `check-spec-ids --ids` passing for the IDs of section 2's packages 02 to 06.
PR 2: package 07 with the same gates.
