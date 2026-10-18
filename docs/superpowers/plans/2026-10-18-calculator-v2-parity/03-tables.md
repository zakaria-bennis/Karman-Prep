# 03 tables: table rows in the core (model, analysis, evaluation, plotting)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A table row with an x₁ column and y columns is stored, undone, sent to the worker,
analysed (its column names become list values every row can use), evaluated (cells, computed
columns) and plotted as point series, with no UI yet (03-tables-ui adds it).

**IDs:** D-1, D-4, D-6, D-10, D-11, D-20; API-2 (table type).

**Owns:** `src/lib/calculator-v2/core/data/`; the table fields of `document.ts`, `state.ts`,
`validate.ts`, `protocol.ts`, `inbox.ts`, `results.ts`; `plot/table.ts`.

## Decisions

- **Synthetic definitions** (`01-interfaces.md` section 3): each variable or data column defines
  its header name as a list. Resolution, duplicates, cycles and the dependency order therefore come
  from the existing analysis, untouched in its rules.
- **Header roles (D-10 amended):** the first header must be a bare name (variable column). A later
  header that is a bare name is a data column, unless an expression row or a regression defines that
  name, in which case it is a computed column showing that list (how the residual column of D-33
  appears). Any other later header is a computed column evaluated row by row with the first column's
  variable, and every list it names, bound to that row's element. An empty header is not plotted
  and keeps its data (D-11).
- **Cells (D-6):** each cell is parsed as a row is; a cell that uses its own table's columns, an
  undefined name or a relation is a cell error with Desmos's text ("Too many variables. Try defining
  'a'." for an undefined name; "Points are written like this: (1, 2)." for a comma). Blank and
  invalid cells are undefined elements; trailing blank rows are not part of the list.
- **Plotting (D-11):** each later visible, non-blank column is a series of (x, y) pairs over the
  rows where both are finite, sent as one `TableGeometry`.
- **History (D-20):** a cell or header edit by typing joins the table's typing group (the KB-2 rule
  keyed by row id); every other table change is one step.

---

### Task 1: Stored tables, state and validation (D-1, D-4, D-20, API-2)

**Files:** Modify `core/api/document.ts`, `state.ts`, `validate.ts`, `types.ts`; create
`core/data/naming.ts`; tests `core/api/engine.tables.test.ts`, `core/data/naming.test.ts`. Spec
edit: API-2 in D accepts `type: "table"` with `columns`; D-1's phase tag.

- [ ] **Step 1: failing tests.**
  - `it("D-4 a new table takes the lowest n whose x_n and y_n are unused by rows, headers and references")`: empty → x₁, y₁; with `x_{1}=3` → x₂, y₂; with a reference to `y_{2}` → x₃, y₃.
  - `it("API-2 setExpression accepts a table with columns and getExpressions returns it")`.
  - `it("D-20 table creation, a cell edit and a header edit are one undo step each, typing coalesces per table")`.
- [ ] **Step 2:** fails. **Step 3:** implement `StoredColumn`, `sameRow` over columns, wire rows with `type`, `columns` and `logMode`, `toExpressionState` for tables, and the engine methods `insertTableAfter`, `replaceWithTable`, `editCell`, `editHeader`, `deleteTableRow`, `setColumnStyle` of `01-interfaces.md` section 5.
- [ ] **Step 4:** PASS. **Step 5: commit** `Store calculator v2 tables with undo and API state (D-1, D-4, D-20, API-2)`.

### Task 2: Table analysis (D-6, D-10, D-11)

**Files:** Create `core/data/table-analysis.ts`, `core/data/synthetic.ts`; modify
`core/analysis/index.ts` (`RowSource.columns`, the `table` kind, synthetic rows), `core/corpus/types.ts`,
`plot/from-analysis.ts` (`buildCompileScope` over `byId`); tests `core/data/table-analysis.test.ts`.

- [ ] **Step 1: failing tests.**
  - `it("D-10 the first header must be a name; a later name header is a data column and an expression header computed")`.
  - `it("D-10 a later header naming a list another row defines is a computed column")`.
  - `it("D-10 a header name another table also defines warns on both headers")`.
  - `it("D-11 column names are defined for every other row, so y_1 alone is a value row with no chip")`.
  - `it("D-6 a cell using its own table's columns or an undefined name has a cell error with Desmos's text")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Analyse calculator v2 table columns as list definitions (D-6, D-10, D-11)`.

### Task 3: Table evaluation and results (D-6, D-11)

**Files:** Create `core/data/evaluate.ts`; modify `core/eval/compile.ts` (`evaluateRows` sink and
synthetic definitions), `worker/pass.ts`, `worker/protocol.ts` (`table`), `core/api/inbox.ts`,
`core/api/results.ts` (`RowView.table`); tests `core/data/evaluate.test.ts`,
`worker/pass.tables.test.ts`, `core/api/engine.tables.test.ts`.

- [ ] **Step 1: failing tests.**
  - `it("D-11 a column is a list with trailing blanks dropped and interior blanks undefined")`.
  - `it("D-6 cells accept 1/3, -2.5, sqrt 2, pi/4 and a variable defined in another row")`.
  - `it("D-10 a computed column x_1^2 shows each row's value and follows edits to the x cells")`.
  - `it("D-11 a row y_1 shows the column's list as its value")`.
  - `it("D-11 the worker posts a table result the snapshot exposes on the row view")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Evaluate calculator v2 table cells and computed columns in the values pass (D-6, D-10, D-11)`.

### Task 4: Table plotting (D-11)

**Files:** Create `plot/table.ts`; modify `plot/geometry.ts` (`TableGeometry`, transferables),
`plot/index.ts`, `worker/pass.ts` (`runPlot` for tables), `ui/graph/render-rows.ts`,
`render/draw-geometry.ts`; tests `plot/table.test.ts`, `render/draw-geometry.test.ts`.

- [ ] **Step 1: failing tests.**
  - `it("D-11 every later visible column plots against the first, skipping pairs with an undefined value")`.
  - `it("D-11 a hidden or empty-header column is not plotted and keeps its data")`.
  - `it("D-11 each series draws in its column's colour, joined in row order only when lines are on")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Plot calculator v2 table columns as point series (D-11)`.

**Package gate:** section 3 of `00-index.md`, `check-spec-ids --ids D-1,D-4,D-6,D-10,D-11,D-20,API-2`.
