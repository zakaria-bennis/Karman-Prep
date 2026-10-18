# 03 tables-ui: the Add item menu and table items

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add item opens a menu with Expression and Table; a table item edits like Desmos (cell
keyboard, blank row, header slot, computed columns, style menu, Zoom Fit); Create table turns
`y=x^2` into a table; on phones the keypad arrows cross cells and wide tables scroll.

**IDs:** S-2, S-10 to S-13; D-5, D-7, D-8, D-9, D-12, D-13, D-16, D-19, D-41, D-42.

**Owns:** `ui/list/AddItemMenu.tsx`, `TableItem.tsx`, `table-keys.ts`, `ColumnStyleMenu.tsx`,
`RowMenu.tsx`, `Toast.tsx`; `styles/table.css`; the cell keys of `ui/focus/focus-controller.ts`;
`tests/calculator/v2/tables.spec.ts`.

## Decisions

- **Menu (S-2 amended, S-10 to S-13 added):** two `menuitem`s, "Add expression" and "Add table",
  with Desmos's menu-button keyboard plus Home (appendix F requirements 1 to 13), anchored below
  the button on L-1 and to its right on L-2 (14 to 16), inserting after the last active row (17 to
  20), one undo step (23) and announced ("Table 2 added", 26). Typing exactly `table` in an empty
  row converts it (D-5); `"`, `note`, `folder`, `image` stay math (CB-1).
- **One blank trailing row** (D-5): Karman shows one, as D-5 says; appendix F saw a faint second.
- **No row or column buttons** (D-8, D-9 amended): rows come from the blank row and Enter; Backspace
  in an empty cell of an empty interior row deletes it; emptied rows persist; an empty header
  stays; Backspace in an empty header moves to the previous header. The table's delete × deletes it
  and leaves an empty expression row (appendix F requirement 32).
- **Style menu (D-12 amended):** opened from the column icon by long-press, right-click, or
  Shift+F10 and the ContextMenu key (Karman keyboard route); holds points on/off, point style
  (filled, open, cross), lines on/off with solid/dashed/dotted, the six colours, and Add regression
  (04 wires it). Escape returns focus to the icon. Drag mode is not offered (no point drag yet).
- **Row menu for Create table (D-13):** the same long-press, right-click or keyboard route on an
  expression row's swatch opens a menu whose one item is "Create table" for `y=E(x)` and `f(x)=E`.
  The table goes below the row with x −2…2 and the computed column; a toast "Table created." with
  an Undo button is announced; focus moves to the first x cell with its content selected.

---

### Task 1: The Add item menu (S-2, S-10 to S-13)

**Files:** Create `ui/list/AddItemMenu.tsx`; modify `ExpressionPanel.tsx`, `row-actions.ts`,
`styles/list.css`; test `AddItemMenu.test.tsx`. Spec edit: amend S-2, add S-10 to S-13 in E.

- [ ] **Step 1: failing tests.**
  - `it("S-2 Add item is a menu button whose menu holds Add expression then Add table and nothing else")`.
  - `it("S-10 Enter, Space and ArrowDown open the menu with focus on the first item; arrows wrap; Home and End; Tab and Escape close it")`.
  - `it("S-10 a pointer press outside closes the menu and reaches its target")`.
  - `it("S-11 the menu sits below the button on the desktop layout and to its right on the stacked layout, inside the calculator")`.
  - `it("S-12 Add expression inserts after the last active row and Add table replaces an empty active row, each one undo step")`.
  - `it("S-13 the inserted item is announced, for example Table 2 added")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Add the calculator v2 Add item menu with Expression and Table (S-2, S-10 to S-13)`.

### Task 2: TableItem rendering and names (D-5, D-19)

**Files:** Create `ui/list/TableItem.tsx`, `styles/table.css`; modify `ExpressionPanel.tsx`
(renders tables), `ui/focus/focus-controller.ts` (cell keys); tests `TableItem.test.tsx`.

- [ ] **Step 1: failing tests.**
  - `it("D-5 a new table shows headers x1 and y1, one blank row and focus in its first cell")`.
  - `it("D-5 typing table into an empty row converts it at once and other words stay math")`.
  - `it("D-5 a blank header slot shows right of the last column only while a cell or header has focus")`.
  - `it("D-19 the table is named Table n, k columns, m rows and each cell header, row r, including blank cells")`.
  - `it("D-19 a computed cell reads header, row r, computed, value and is read-only")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Render calculator v2 tables with named cells and the blank row (D-5, D-19)`.

### Task 3: Cell keyboard (D-7, D-8)

**Files:** Create `ui/list/table-keys.ts`; modify `TableItem.tsx`, `math-field/MathField.ts` (left
and right move-out callbacks); tests `table-keys.test.ts`, `TableItem.test.tsx`. Spec edit: amend
D-7 and D-8.

- [ ] **Step 1: failing tests.**
  - `it("D-7 Enter moves down the column, creating a row from the blank row, and Enter in the blank row leaves the table")`.
  - `it("D-7 Tab and Shift+Tab move across columns and wrap rows, skipping the header slot, and select the cell entered")`.
  - `it("D-7 ArrowUp from row 1 enters the header and ArrowDown from the blank row leaves for the next item")`.
  - `it("D-7 ArrowLeft and ArrowRight cross cells only at the caret's edge")`.
  - `it("D-8 Backspace in an empty cell of an empty interior row deletes the row and selects the cell above")`.
  - `it("D-8 Backspace in the blank row goes to the last data row and Backspace in an empty row below a table enters its blank row")`.
  - `it("D-8 a cleared interior row stays until deleted and the table holds at most 1,000 rows")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Add calculator v2 table cell keyboard navigation (D-7, D-8)`.

### Task 4: Headers and columns (D-9, D-10)

**Files:** modify `TableItem.tsx`, `table-keys.ts`; tests `TableItem.test.tsx`. Spec edit: amend
D-9 and D-10.

- [ ] **Step 1: failing tests.** `it("D-9 typing a name in the header slot adds a data column in the next colour, at most 10")`; `it("D-9 Backspace in an empty header moves to the previous header and never deletes data")`; `it("D-10 Enter in a header moves to its row 1 cell and an expression header shows computed values")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Add calculator v2 table headers and computed columns (D-9, D-10)`.

### Task 5: The column style menu (D-12)

**Files:** Create `ui/list/ColumnStyleMenu.tsx`; modify `TableItem.tsx`; test
`ColumnStyleMenu.test.tsx`. Spec edit: amend D-12.

- [ ] **Step 1: failing tests.** `it("D-12 activating the column icon toggles its points and the icon shows an outline when hidden")`; `it("D-12 long-press, right-click or Shift+F10 opens the style menu with points, shape, lines, line style and colours")`; `it("D-12 turning lines on joins the column's points in row order")`; `it("D-12 Escape closes the style menu and returns focus to the column icon")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Add the calculator v2 table column style menu (D-12)`.

### Task 6: Delete, undo and Zoom Fit (D-16)

**Files:** modify `TableItem.tsx`, `core/api/engine.ts` (`fitTable`); create `core/data/fit-view.ts`;
tests `fit-view.test.ts`, `TableItem.test.tsx`. Spec edit: amend D-16 (padding as measured stays
open; the control shows while the table has focus and makes Home available).

- [ ] **Step 1: failing tests.** `it("D-16 Zoom to fit table n fits every plotted point with 10% padding and a zero span widened")`; `it("D-16 the control is disabled when nothing is plotted")`; `it("D-5 deleting a table leaves an empty expression row with the caret and Undo restores it")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Add calculator v2 table delete and Zoom to fit (D-16)`.

### Task 7: Create table from an expression (D-13)

**Files:** Create `ui/list/RowMenu.tsx`, `ui/list/Toast.tsx`; modify `ExpressionRow.tsx`,
`core/api/engine.ts` (`createTableFromRow`); tests `RowMenu.test.tsx`, `engine.tables.test.ts`.
Spec edit: amend D-13.

- [ ] **Step 1: failing tests.** `it("D-13 Create table from y=x^2 inserts x1 -2 to 2 and a computed x1^2 column in the row's colour")`; `it("D-13 f(x)=E heads the computed column f(x1)")`; `it("D-13 a toast says Table created. with Undo, is announced, and focus selects the first x cell")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Add Create table for calculator v2 function rows (D-13)`.

### Task 8: Phones (D-41, D-42)

**Files:** modify `ui/keypad/apply-key.ts` (cell targets), `styles/table.css`; tests
`key-input.test.tsx`, `TableItem.test.tsx`. Spec edit: add D-41 and D-42 after D-21.

- [ ] **Step 1: failing tests.** `it("D-41 the keypad's arrows cross into the next cell at the caret's edge and its Enter moves down a column")`; `it("D-41 keypad keys always reach an editable cell, never the header slot")`; `it("D-42 columns keep their width and a wide table scrolls inside its item with the focused cell in view")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Make calculator v2 tables work with the phone keypad and narrow lists (D-41, D-42)`.

### Task 9: Browser coverage (S-2, S-10, D-5, D-7, D-13, D-16, D-42)

**Files:** Create `tests/calculator/v2/tables.spec.ts`.

- [ ] **Step 1:** tests titled `S-2 …`, `S-10 …`, `D-5 …`, `D-7 …`, `D-13 …`, `D-16 …` and
      `D-42 …` that drive a real MathQuill table: add a table from the menu, type 1,2,3 against 2,4,6
      with Enter and Tab, see three points on the canvas (`graph-pixels.ts`), zoom to fit, create a
      table from `y=x^2`, and check horizontal scroll at 390 px. **Step 2:** run on every runnable
      project; PASS expected. **Step 3: commit** `Add calculator v2 table browser tests`.

**Package gate:** section 3 of `00-index.md`, `check-spec-ids --ids` with this package's IDs.
