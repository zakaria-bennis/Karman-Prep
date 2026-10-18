# 07 transfer: Transfer to Calculator, including tables and coordinate pairs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 1's Transfer to Calculator exactly as `../2026-10-16-calculator-v2-phase1/`
packages 12 (`12-transfer-core*.md`) and 14 (`14-transfer-ui*.md`) plan it, then extend it to
question tables (x₁, y₁) and to coordinate pairs and function coordinates with a Point or Table
row choice, now that tables exist (package 03). This is PR 2.

**IDs:** those of Phase 1 packages 12 and 14 (Phase 1 `00-index.md` section 2), plus TR-22 to TR-25,
TR-34, TR-39, TR-60, TR-61, TR-63, D-17 and D-18.

## Order

1. **Phase 1 package 12, Tasks 1 to 14**, as written, with the Phase 1 deviations D1 to D3 of its
   `00-index.md` section 7 (the owner signs them off in the PR).
2. **Phase 1 package 14, Tasks 1 to 14**, as written, except Task 11: the docking write stays as
   planned (`transfer()` docks on wide viewports), and package 06 has already made toolbar opens dock.
3. The extension tasks below.

## Decisions for the extension

- **Tables (TR-22 to TR-25):** the classifier (`src/lib/calculator-transfer/`, eager, no v2
  imports) accepts the two shapes of C table 5.1; the payload carries `table: { columns: string[][] }`
  with normalised cell LaTeX; apply inserts one table row named by D-4 (`x_n`, `y_n…`), and the
  status reports the mapping (TR-25).
- **Pairs (TR-34, TR-60, TR-61, TR-63):** a coordinate pair or function coordinate gets a menu
  button with "Point" and "Table row" (and, for `f(a)=b`, TR-61's Evaluate, disabled with its
  TR-62 reason until TR-31 ships); Table row appends to the source's point table, creating it on
  first use with two columns by D-4.
- **View (TR-39, D-17):** after a table or pair transfer whose points are all outside the view,
  the view fits them by D-16's rule; an expression transfer never moves the view.
- **Ordinary tables (D-18):** a transferred table is an ordinary table; the per-question reset
  removes it.

### Task 15: Table classification and payload (TR-22 to TR-25)

**Files:** `src/lib/calculator-transfer/table.ts` and its test; `classify.ts`; fixture questions.
Tests `it("TR-22 only the two table 5.1 shapes are eligible")`, `it("TR-23 the first variable is the input and 1 to 8 variables with 1 to 200 points transfer")`, `it("TR-24 cells must be numeric constants after normalisation, separators removed")`, `it("TR-25 columns are named x_n and y_n with the lowest free n")`.
**Commit** `Classify question tables for calculator v2 transfer (TR-22 to TR-25)`.

**Adaptations made while executing Task 15:**

- The payload keeps the AR-16 shape `table: { headers: (string | null)[]; columns: string[][] }`
  (section 12 of `c-transfer.md`) rather than columns alone: table 11.1's "Added table" message
  names each column's header, and the AR-16 type test already fixes that shape. `apply.ts`
  validates both fields with Zod; headers are plain text used only in the status (TR-25).
- Names are chosen at apply (TR-72), so the TR-25 test lives in
  `src/components/calculator-v2/transfer/apply.tables.test.ts`, and the table branch of apply
  (`plan-table.ts`: D-4 names, the TR-73 check, the table 11.1 message) ships with this task.
- The controls render in this task too: the eager `CalculatorTableAction` gains a v2 branch that
  renders the lazy `TableTransferAction` (`transfer-items.tsx`) for `itemId="table"` (block
  placement) and for the cluster slot of a table choice. Catalog practice renders its table choices
  through `QuestionTable` with `itemId="choice:<letter>"` and no cluster, which the wrapper cannot
  tell apart from `TableChoiceOption`'s v1-only instance without a new call-site prop (eager bytes,
  AR-33), so those choices get no v2 control yet.
- The table 8.1 description is "table, n rows" without the caption: the wrappers do not receive
  the caption, and passing it would add eager bytes.
- The table fixtures live in `__fixtures__/tables.ts` and run in `table.test.ts`; the seven-file
  TR-79 runner takes stems and choices only, and its PR-44 check has no cell cases.
- A table with a table 5.1 header or first-column pattern but a non-numeric body cell reports
  TR-24 (so a frequency table with a "Total" row is TR-24); a table with no such pattern is TR-22.

### Task 16: Applying tables and point rows (TR-34, D-17, D-18, TR-39)

**Files:** `src/components/calculator-v2/transfer/apply.ts`, `plan.ts`; tests
`it("TR-34 Table row appends to the source's point table and creates it on first use")`,
`it("TR-39, D-17 a table transfer fits the view only when no point is visible")`,
`it("D-18 a transferred table is editable and removed by the per-question reset")`.
**Commit** `Apply calculator v2 table and point-row transfers (TR-34, TR-39, D-17, D-18)`.

**Adaptations made while executing Task 16:**

- The planning is split by concern so `plan.ts` and `apply.ts` stay small: `plan-table.ts`
  (tables, Task 15), `plan-points.ts` (TR-34 point tables and the per-calculator registries) and
  `fit.ts` (TR-39, D-17). A "point" payload goes through the rows plan after each row is checked
  to be a point of numeric constants; "evaluate" stays rejected until TR-31.
- A point-table append uses `engine.editRows` (the quiz host's `KarmanCalculator` reaches it as its
  internal `engine`; a bare engine is its own editor) instead of `setExpressions`, whose API-2
  column shape would drop the table's D-12 lines and point styles. Creating a table, point rows and
  rows still use `setExpressions`; the view fit uses the public `graphpaperBounds` and
  `setMathBounds`. This widens TR-71's "public API only" by that one internal channel.
- D-17's visibility test and fit need the added points' values when the transfer lands. They are
  the payload's numeric constants (no names, TR-15 and TR-24), so `fit.ts` reads them once on the
  main thread through the core's parser and compiler, at most 200 cells, rather than waiting for
  the worker's table geometry (AR-51 keeps row values in the worker; these are not row values).
- The point-table and source-table registries are keyed by the calculator object, which the quiz
  remounts per question (R10, AR-58), and a registered point table is used only while that row
  is still a two-column table with the names it was created with.
- Table 11.1's "Pair appended" message is also used when the first Table row creates the point
  table ("Added to table x₁, y₁, row 1."). A repeat transfer of a question table whose values are
  unchanged focuses the table it added (TR-35, D-18's source id).

### Task 17: The Point or Table row chooser (TR-60, TR-61, TR-63)

**Files:** `src/components/calculator/TransferChooser.tsx`, `TransferControl.tsx`; tests
`it("TR-60 a pair's control is a menu button with the menu keyboard model")`,
`it("TR-61 Point then Table row, initial focus on the last format used")`,
`test("TR-63 the chooser opens above or below the item and stays inside the viewport")`.
**Commit** `Add the Point or Table row transfer chooser (TR-60, TR-61, TR-63)`.

### Task 18: Browser coverage

`tests/calculator/v2/transfer-tables.spec.ts`: transfer the D-40 table from a fixture question,
see x₁/y₁ and every point inside the view; transfer a pair as Point and as Table row.
**Commit** `Add calculator v2 table transfer browser tests`.

**Package gate:** section 3 of `00-index.md`, the Phase 1 gates of packages 12 and 14 (their AR-33
eager budget included), `check-spec-ids --ids` with this package's IDs.
