# 04 regress: `~` regressions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A row `y_1\sim mx_1+b` fits live on every keystroke and cell edit, shows Desmos's
results (Log mode checkbox when it applies, then "Regression parameters", then "Statistics" and
"Residuals" side by side), defines its parameters and its residual list for other rows, draws its
curve over the full width, and a table reaches a fitted linear regression in one tap.

**IDs:** PR-30; D-2, D-3, D-22, D-24 to D-34, D-36, D-37, D-39, D-44 to D-46; POI-3; K-8; A11Y-10.

**Owns:** `src/lib/calculator-v2/regression/`; `core/data/regression-analysis.ts`; the `sim` AST
node and its printer; `ui/list/RegressionPanel.tsx`, `styles/regression.css`;
`tests/calculator/v2/regression.spec.ts`.

## Decisions (appendix F, "Behaviour wins")

- **Parameters (D-22 amended):** every free name of the row that no expression row or table
  defines, other than x and y, is a parameter (1 to 8); a row with no parameter is valid and shows
  R² of the given model. `x` or `y` as the predictor keeps the D-22 error. A scalar L keeps
  "Regression needs a list of data.". A name another row defines is a constant (appendix F 18).
- **Clash (D-44 added):** two regressions fitting the same name both fit; a row that references it
  shows "You've defined 'm' in more than one place. Try deleting some of the definitions of 'm'.".
- **Data (D-24 amended):** pairs run over the shortest list; any blank or non-numeric element in a
  used list fails the fit with "We couldn't find any region where this model is defined.", as does a
  model undefined for the data; fewer points than parameters is not an error.
- **Solver:** affine models (numeric test, 00-index section 5) solve by one-sided Jacobi SVD of the
  column-scaled design matrix, giving the minimum-norm solution for rank-deficient data with no
  error (D-26 amended); other models by Levenberg–Marquardt from {1, 0.1, −1, 0, 10} per parameter
  and from the log-mode solution for a log form (D-25), "Approximate fit" when no start converged.
- **Log mode (D-27 to D-30 amended):** offered for the exponential, power and logarithmic forms,
  unchecked by default; when checked the fit and R² use the transformed data and r appears;
  residuals stay in original units; the heading stays "Statistics"; when a needed value is not
  positive the checkbox is not shown and the original-unit fit is shown with no note.
- **Statistics (D-31, D-32 amended):** R² always (negative shown as computed); r only for a
  linear model with a free intercept and for log-mode fits; RMSE only when R² is undefined
  (n ≤ p or SST = 0), shown in its place.
- **Formats (D-45 added):** parameters at 6 significant digits, R² and r at 4 decimals, both trimmed;
  a parameter in another row is its full value (12 significant digits by NM-1).
- **Residuals (D-33 amended):** each regression defines e_k (lowest free k in row order) before
  any plotting; its "plot" button adds a read-only computed e_k column to the source table, drawn
  in the next palette colour after the curve's.
- **Panel (D-37 amended):** Log mode first, then parameters, then Statistics and Residuals side by
  side (stacked below 360 px), each value a focusable read-only field named "name equals value";
  the row's accessible name ends "Has graph and regression. To access statistics, press Tab.";
  A11Y-10's summary is announced 750 ms after a change. D-35's sliders are removed (not Desmos).
- **One tap (D-3, K-8 amended):** each table shows "Add regression" (in its footer, and in the
  column style menu) that inserts `y_{n}\sim mx_{n}+b` with free parameter names below the table,
  already fitted and focused.

---

### Task 1: Parse `\sim` (PR-30)

**Files:** Modify `core/latex/ast.ts`, `parser.ts`, `atoms.ts`, `printer.ts`, `analysis/names.ts`,
`analysis/classify.ts`; corpus `cases/parse-relations.ts`, `cases/parse-errors.ts`,
`cases/classify-rows.ts`; tests in the corpus suite. Spec edit: PR-30's phase tag.

- [ ] **Step 1: failing cases.** `y_{1}\sim mx_{1}+b` parses to `(sim (id y_{1}) (add …))`; `y\sim x` and `~` both parse; a second `\sim` or one inside parentheses is a `syntax` error; the printer round-trips.
- [ ] **Step 2–4:** fail, implement, pass (the old `unsupported` cases change to the new outcome).
      **Step 5: commit** `Parse calculator v2 regression rows with \sim (PR-30)`.

### Task 2: Regression analysis (D-2, D-22, D-44)

**Files:** Create `core/data/regression-analysis.ts`; modify `core/analysis/index.ts`, `classify.ts`,
`messages.ts`; test `regression-analysis.test.ts`. Spec edit: amend D-22, add D-44.

- [ ] **Step 1: failing tests.** `it("D-22 free names no row defines become parameters in order of appearance and become defined")`; `it("D-22 a name another row defines is a constant and the rest still fit")`; `it("D-22 no parameter is allowed, a scalar left side and x or y as predictor are errors")`; `it("D-44 a shared parameter name errors only in rows that reference it")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Analyse calculator v2 regression rows and their parameters (D-2, D-22, D-44)`.

### Task 3: The solvers (D-25, D-26, D-39)

**Files:** Create `regression/least-squares.ts`, `regression/levenberg.ts`,
`regression/__fixtures__/nist.ts`; tests `least-squares.test.ts`, `levenberg.test.ts`,
`nist.test.ts`. Spec edit: amend D-26.

- [ ] **Step 1: failing tests.** `it("D-25 an exact line is fitted exactly")`; `it("D-26 rank-deficient data fits silently with the minimum-norm solution")`; `it("D-39 NIST Norris, Pontius and Longley match the certified values through the SVD path")`; `it("D-39 NIST Misra1a, Chwirut2 and Thurber match from start 1 through Levenberg–Marquardt")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Add calculator v2 least-squares and Levenberg–Marquardt solvers (D-25, D-26, D-39)`.

### Task 4: Fitting, statistics and log mode (D-24, D-27 to D-32, D-34, D-45)

**Files:** Create `regression/fit.ts`, `regression/log-forms.ts`, `regression/format.ts`; tests
`fit.test.ts`, `log-forms.test.ts`, `format.test.ts`. Spec edit: amend D-24, D-28 to D-32, add D-45.

- [ ] **Step 1: failing tests.** One `it` per ID: D-24 (blank or text cell fails with the Desmos message; few points fit), D-27 (each log form matched structurally), D-28 (non-positive y hides the checkbox), D-29 (log mode statistics on transformed data, residuals in original units), D-30 (unchecked by default; checking refits and adds r), D-31 (R² and r rules, negative R²), D-32 (RMSE only when R² is undefined), D-34 (constant model), D-45 (formats).
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Fit calculator v2 regressions with Desmos statistics and log mode (D-24, D-27 to D-32, D-34, D-45)`.

### Task 5: Regressions in the values pass, the curve and its POIs (D-33, D-36, D-46, POI-3)

**Files:** modify `core/data/evaluate.ts`, `core/eval/compile.ts`, `worker/pass.ts`,
`worker/protocol.ts` (`regression`), `core/api/inbox.ts`, `core/api/results.ts`,
`plot/from-analysis.ts`; tests `core/data/evaluate.regression.test.ts`, `poi/golden.test.ts`.

- [ ] **Step 1: failing tests.** `it("D-46 the fit follows every cell edit with no submit step")`; `it("D-33 e_1 is a list other rows can use before any plotting")`; `it("D-36 the curve draws over the full visible x range in the regression row's colour")`; `it("POI-3 a regression curve gets the y=f(x) points of interest")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Run calculator v2 regressions in the values pass with curves and residuals (D-33, D-36, D-46, POI-3)`.

### Task 6: The results panel (D-37, A11Y-10, D-33)

**Files:** Create `ui/list/RegressionPanel.tsx`, `styles/regression.css`; modify `ExpressionRow.tsx`,
`announcements.ts`; tests `RegressionPanel.test.tsx`. Spec edit: amend D-33, D-37; move D-35.

- [ ] **Step 1: failing tests.** `it("D-37 the panel shows Log mode, Regression parameters, then Statistics and Residuals side by side")`; `it("D-37 each value is a focusable field named name equals value and Tab visits them in order")`; `it("A11Y-10 the summary is announced 750 ms after a change")`; `it("D-33 plot adds a read-only e1 column to the source table in a new colour")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Show calculator v2 regression results with residual plotting (D-33, D-37, A11Y-10)`.

### Task 7: One-tap regression from a table (D-3, K-8)

**Files:** modify `TableItem.tsx`, `ColumnStyleMenu.tsx`, `core/api/engine.ts`
(`insertRegressionBelow`); tests `TableItem.test.tsx`. Spec edit: amend D-3 and K-8.

- [ ] **Step 1: failing tests.** `it("D-3 Add regression inserts y1~mx1+b below the table, fitted and focused, in one tap")`; `it("K-8 the button is in the table footer on every layout and in the style menu")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Add one-tap linear regression from calculator v2 tables (D-3, K-8)`.

### Task 8: Browser coverage (D-2, D-40 desktop part)

**Files:** Create `tests/calculator/v2/regression.spec.ts`. Tests: type the D-40 table
(1990…2020 against 30000…48000), add `y_1\sim mx_1+b` by typing `~` and by the button, read
m = 600, b = −1164000, R² = 1, r = 1 from the panel, zoom to fit and find all four points in view.
Run on every runnable project. **Commit** `Add calculator v2 regression browser tests (D-2, D-40)`.

**Package gate:** section 3 of `00-index.md`, `check-spec-ids --ids` with this package's IDs.
