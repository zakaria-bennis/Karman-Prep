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

### Task 16: Applying tables and point rows (TR-34, D-17, D-18, TR-39)

**Files:** `src/components/calculator-v2/transfer/apply.ts`, `plan.ts`; tests
`it("TR-34 Table row appends to the source's point table and creates it on first use")`,
`it("TR-39, D-17 a table transfer fits the view only when no point is visible")`,
`it("D-18 a transferred table is editable and removed by the per-question reset")`.
**Commit** `Apply calculator v2 table and point-row transfers (TR-34, TR-39, D-17, D-18)`.

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
