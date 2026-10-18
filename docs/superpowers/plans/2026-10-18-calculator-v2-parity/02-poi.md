# 02 poi: points of interest, selection, coordinate labels and tracing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selecting a curve shows its points of interest as grey dots; clicking a dot opens its
`(x, y)` label (several may be open); pressing on a curve and dragging traces it with snapping;
circles get top and bottom points; intersections with every visible curve count; Alt+T starts a
keyboard trace that steps with Page Up/Down, Home and End and speaks each point.

**IDs:** POI-1, POI-2, POI-4 to POI-14, POI-16 to POI-20; A11Y-9; KB-14; K-9.

**Owns:** `src/lib/calculator-v2/poi/`; the `select` and `poi` protocol messages; `poi` in the inbox
and snapshot; `render/draw-poi.ts`; `ui/graph/hit-test.ts`, `poi-labels.ts`, `trace.ts`,
`keyboard-trace.ts`, `PoiOverlay.tsx`; `tests/calculator/v2/poi.spec.ts`.

## Decisions

- **Selection is not focus.** `selectedRowId` is set when a row is focused or activated and when a
  curve is clicked; it is cleared by a click on empty paper, by deleting the row and by
  `setBlank`. Focus leaving the list (a graph control click) keeps it, as appendix F requirement 9
  says zoom and pan keep the row selected.
- **POIs are computed in the executor** (worker or main thread) for the selected row only, after
  each iteration's plots and on `select`, so the dots follow the settled view (POI-9).
- **Label rule (POI-12 amended):** d = clamp(max(5, ceil(−log10 u) + 3), 0, 12) decimals with
  trailing zeros trimmed, u the axis's units per px; at the default 800 px view u = 0.025 gives 5
  (`1.41421`), 8× zoom in gives 6 and 8× zoom out still 5 (appendix F requirement 15).
- **Trace rule (POI-14 amended):** x rounds to clamp(ceil(−log10 u) + 1, 0, 12) decimals, y is
  f(rounded x) shown to at most 5 decimals; the dot snaps to a POI within 3 px on a fine pointer
  (appendix F observed about 1.5 px; 8 px was larger than Desmos) and never on touch.
- **Hit areas:** a POI is hit within 12 px (fine) or 14 px (coarse), a curve within 8 px (fine) or
  16 px (coarse); 16 px from a dot is always a miss on a fine pointer (POI-18).
- **Escape** closes open labels as one KB-3 layer (Karman improvement recorded in POI-13).
- **Kind words** (A11Y-9 amended): "Zero", "Y-intercept", "X-intercept", "Maximum", "Minimum",
  "Top", "Bottom", "Intersection with Expression n"; combined kinds join with " and "
  ("Y-intercept and Minimum").

---

### Task 1: Label and trace formatting (POI-12, POI-14)

**Files:** Create `src/lib/calculator-v2/poi/types.ts`, `poi/format.ts`; test `poi/format.test.ts`
(node). Spec edit: amend POI-12 and POI-14 in `a-math-semantics.md`; add appendix F's "Parity
increment scope" section listing section 2's IDs.

- [ ] **Step 1: failing tests.**
  - `it("POI-12 labels show 5 decimals at the default view, 6 at 8x zoom in and still 5 at 8x zoom out")`: `poiDecimals(0.025)` 5, `poiDecimals(0.003125)` 6, `poiDecimals(0.2)` 5; `formatPoiCoordinate(Math.SQRT2, 5)` `"1.41421"`, `formatPoiCoordinate(1/3, 6)` `"0.333333"`.
  - `it("POI-12 terminating values print exactly with a true minus and a leading zero")`: `formatPoiCoordinate(-0.5, 5)` `"−0.5"`, `(0.8, 5)` `"0.8"`, `(2, 5)` `"2"`, `(-0, 5)` `"0"`; `formatPoiLabel({x: 2, y: -2}, view())` `"(2, −2)"`.
  - `it("POI-12 values outside the plain range use the ×10^n form")`: `formatPoiCoordinate(1.5e13, 5)` `"1.5×10^13"`.
  - `it("POI-14 trace x rounds to the view's pixel precision and y shows at most 5 decimals")`: at the default view `roundTraceX(1.23456, view())` is `1.235`; `traceDecimals(0.025)` 3.
- [ ] **Step 2:** `npx vitest run src/lib/calculator-v2/poi/format.test.ts` fails: cannot resolve `./format`.
- [ ] **Step 3:** implement; reuse `formatNumber` (`core/eval/format`) for the ×10^n branch.
- [ ] **Step 4:** PASS, 4 tests. **Step 5: commit** `Add calculator v2 POI label and trace formatting (POI-12, POI-14)`.

### Task 2: One-dimensional search (POI-5, POI-6, POI-8, POI-11)

**Files:** Create `poi/roots.ts`; test `poi/roots.test.ts`.

- [ ] **Step 1: failing tests.**
  - `it("POI-5 roots come from sign changes with no absolute threshold, so 1e-8(x-3) has one root")`.
  - `it("POI-5 touching roots are found by minimising |f| relative to its local scale")`: `(x-2)^2` → one root at 2 within `10·ε^(1/2)·2`.
  - `it("POI-6 poles and removable holes are not roots")`: `tan x` over [−10, 10] gives the 7 multiples of π only; `(x²−1)/(x−1)` gives −1 only.
  - `it("POI-8 corner extrema come from a sign change in slope")`: `|x−1|` minimum at 1.
  - `it("POI-11 simple roots meet 1e-10 relative and extrema 1e-7 in x and 1e-12 in y")`: `x²−2` root, `sin` extremum at π/2.
- [ ] **Step 2:** fails (no module). **Step 3:** implement: sample `samples` points, bracket sign changes and refine with Brent (Illinois fallback); reject a bracket whose refined |f| is not below the bracket ends' local scale (poles); touching roots by golden-section on |f| where |f| has an interior minimum below 1e-6 of its neighbours' scale and a parabola fit predicts 0; extrema where the forward difference changes sign, refined by golden section (corners keep the sample argmin).
- [ ] **Step 4:** PASS, 5 tests. **Step 5: commit** `Add calculator v2 POI root and extremum search (POI-5, POI-6, POI-8, POI-11)`.

### Task 3: POIs per curve kind, intersections, merging and the golden cases (POI-2, POI-4, POI-7, POI-9, POI-10, POI-16)

**Files:** Create `poi/find.ts`, `poi/implicit.ts`, `poi/index.ts`; test `poi/find.test.ts`,
`poi/golden.test.ts` (rows through `analyzeRows`, `evaluateRows`, `plotInputFor`, `poiCurvesOf`).
Spec edit: amend POI-2's coverage table (implicit: both axes, top and bottom) and POI-7.

- [ ] **Step 1: failing tests.**
  - `it("POI-2 y=f(x) gets zeros, the y-intercept and extrema; x=g(y) the mirror; lines their axis crossing")`.
  - `it("POI-2 a circle gets its axis intercepts and its top and bottom points, never leftmost or rightmost")`: `x²+y²=25` → (±5, 0), (0, ±5) with kinds x-intercept+top etc.
  - `it("POI-4 intersections with every other visible curve, including vertical lines and inequality boundaries")`.
  - `it("POI-7 coincident points merge into one dot listing every kind")`: `y=x²−2` → (0, −2) kinds y-intercept and minimum.
  - `it("POI-9 the search covers the view widened by 10% and only points inside the view are returned")`.
  - `it("POI-10 a kind with more than 100 points in the search region is dropped")`: `sin(50x)` zeros.
  - `it("POI-16 the golden cases pass at the default view")`: the ten rows of A's POI-16 table.
- [ ] **Step 2:** fails. **Step 3:** implement. Explicit curves use `findRoots` and `findExtrema` on
      f; the y-intercept is f(0). Implicit: roots of F(x, 0) and F(0, y); top and bottom by Newton on
      {F = 0, ∂F/∂x = 0} from the y-extreme vertices of a 400×400 contour of F in the search box.
      Intersections: explicit–explicit by roots of f − g; explicit–implicit by roots of F(t, f(t));
      line–curve by evaluating at the line; implicit–implicit by sign changes of G along F's contour
      refined by 2D Newton. Merge within 1e-9·max(1, |x|) per axis.
- [ ] **Step 4:** PASS, 7 tests. **Step 5: commit** `Add calculator v2 POI finding per curve kind with intersections (POI-2, POI-4, POI-7, POI-9, POI-10, POI-16)`.

### Task 4: Selection and POIs through the executor (POI-1, POI-17)

**Files:** Modify `worker/protocol.ts`, `worker/executor.ts`, `worker/pass.ts` (`runPoi`),
`core/api/inbox.ts`, `core/api/engine.ts`, `core/api/results.ts`; tests in
`worker/executor.poi.test.ts`, `core/api/engine.poi.test.ts`. Spec edit: amend POI-1, add POI-17.

- [ ] **Step 1: failing tests.**
  - `it("POI-1 only the selected row gets points of interest, and a hidden or error row gets none")`.
  - `it("POI-1 a select message posts poi for that row without a new values pass")`.
  - `it("POI-17 focusing or activating a row selects it; setSelectedRow(null) clears it; deleting the row clears it")`.
  - `it("POI-9 points are recomputed after a view change settles")`: a `view` message re-posts `poi` for the new view.
- [ ] **Step 2:** fails. **Step 3:** implement per `01-interfaces.md` sections 2 and 5; the inbox keeps the latest `poi` for the selected row at the latest generation.
- [ ] **Step 4:** PASS. **Step 5: commit** `Compute points of interest for the selected calculator v2 row in the executor (POI-1, POI-17)`.

### Task 5: Drawing the selected curve and its dots (POI-1, POI-17)

**Files:** Modify `render/types.ts`, `render/constants.ts`, `render/draw-geometry.ts`,
`render/renderer.ts`; create `render/draw-poi.ts`; modify `ui/graph/render-rows.ts`; tests
`render/draw-poi.test.ts`, `ui/graph/render-rows.test.ts`.

- [ ] **Step 1: failing tests.** `it("POI-17 the selected row's curve strokes at CURVE_SELECTED_LINE_PX and others at CURVE_LINE_PX")`; `it("POI-1 grey dots draw for the selected row's points inside the view and open ones draw larger and dark")`.
- [ ] **Step 2–4:** fail, implement (dots in the `points` layer after row points; grey is the `text` role at 45% over paper, the open dot the `text` role), pass. **Step 5: commit** `Draw the selected calculator v2 curve heavier with grey point-of-interest dots (POI-1, POI-17)`.

### Task 6: Hit testing and the label rules (POI-13, POI-18, POI-19)

**Files:** Create `ui/graph/hit-test.ts`, `ui/graph/poi-labels.ts`, `ui/graph/PoiOverlay.tsx`;
modify `ui/graph/use-graph-input.ts` (a press that does not move 4 px is a click), `GraphPanel.tsx`,
`styles/graph.css`; tests `hit-test.test.ts`, `poi-labels.test.ts`, `GraphPanel.poi.test.tsx`.
Spec edit: amend POI-13 and POI-9; add POI-18 and POI-19.

- [ ] **Step 1: failing tests.**
  - `it("POI-18 a dot is hit within 12 px on a fine pointer and 14 px on touch, and 16 px away is a miss")`.
  - `it("POI-13 clicking a dot of the selected curve opens its label and clicking it again closes only that label")`.
  - `it("POI-13 several labels stay open, and a click on an unselected curve's dot only selects that curve")`.
  - `it("POI-13 empty paper closes every label and deselects; focusing or editing a row, zoom buttons and panning close labels and keep the selection")`.
  - `it("POI-13 labels never persist across deselection")`.
  - `it("POI-19 an open label is text reading the coordinates, placed diagonally off its dot away from the curve without overlapping another label")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Open and close calculator v2 coordinate labels on points of interest (POI-13, POI-18, POI-19)`.

### Task 7: Tracing (POI-14)

**Files:** Create `ui/graph/trace.ts`; modify `use-graph-input.ts` (a press within the curve hit
area of a visible curve starts a trace instead of a pan), `PoiOverlay.tsx`; test `trace.test.ts`,
`GraphPanel.poi.test.tsx`.

- [ ] **Step 1: failing tests.**
  - `it("POI-14 the trace dot follows the nearest curve point even when the pointer leaves the curve")`.
  - `it("POI-14 a fine-pointer trace snaps to a point of interest within 3 px and shows its exact label")`.
  - `it("POI-14 releasing a trace removes the dot and label and pins nothing")`.
  - `it("POI-14 pressing on a curve and dragging traces instead of panning")`.
- [ ] **Step 2–4:** fail, implement (explicit curves compile f on the main thread through `buildCompileScope` and `plotInputFor` from the snapshot's analysis; implicit curves project onto the nearest geometry vertex), pass. **Step 5: commit** `Trace calculator v2 curves by press and drag with snapping (POI-14)`.

### Task 8: Keyboard trace and announcements (POI-20, A11Y-9, KB-14, K-9)

**Files:** Create `ui/graph/keyboard-trace.ts`; modify `ui/controller/shortcuts.ts` (Alt+T),
`ui/keypad/keys.ts` and `apply-key.ts` (the audio key starts the trace), `GraphPanel.tsx`; tests
`keyboard-trace.test.ts`, `shortcuts.test.ts`, `Keypad.test.tsx`. Spec edit: amend A11Y-9, KB-14,
K-9; add POI-20.

- [ ] **Step 1: failing tests.**
  - `it("POI-20 Alt+T starts the trace at the focused row's first point and announces Audio trace on with the key help and the point")`.
  - `it("POI-20 Page Down and Page Up step through points in x order and past the last say No more points of interest")`.
  - `it("POI-20 Home and End jump to the curve's ends in view, Ctrl or Cmd with Up and Down switch expression, Escape exits to the row")`.
  - `it("A11Y-9 announcements use the kind words, Y-intercept and Minimum, Intersection with Expression 2")`.
  - `it("KB-14 with the graph focused [ and ] step through the selected row's points")`.
  - `it("K-9 the audio key starts and stops the keyboard trace and is named Audio trace")`.
- [ ] **Step 2–4:** fail, implement, pass. **Step 5: commit** `Add the calculator v2 keyboard trace through points of interest (POI-20, A11Y-9, KB-14, K-9)`.

### Task 9: Browser coverage (POI-1, POI-9, POI-13, POI-14, POI-17)

**Files:** Create `tests/calculator/v2/poi.spec.ts` on `/v2/calculator.html`.

- [ ] **Step 1:** tests `test("POI-1 focusing y=x^2-2 shows its grey dots and none for other rows")`,
      `test("POI-13 clicking a dot opens (1.41421, 0) and empty paper closes it")`,
      `test("POI-14 dragging along y=x^2 shows a live label and releasing removes it")`,
      `test("POI-17 clicking a curve selects its row and thickens it")`,
      `test("POI-9 zooming keeps the selection, closes labels and recomputes dots")`.
- [ ] **Step 2:** run on calculator-chrome and calculator-android: expected PASS once Tasks 1 to 8
      have landed; a failure becomes a fix in the owning task's files. **Step 3: commit** `Add calculator v2 point-of-interest browser tests (POI-1, POI-9, POI-13, POI-14, POI-17)`.

**Package gate:** section 3 of `00-index.md`, plus `check-spec-ids --ids` with this package's IDs.
