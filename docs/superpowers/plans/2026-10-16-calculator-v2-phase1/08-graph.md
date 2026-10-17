# 08 graph: canvas renderer and graph panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

This is package `graph` of `00-index.md`: increment 1A, wave 3. It depends on 03, 04, 05, 06 and 07, and starts only after all five have merged. The plan header, Global Constraints and Review Focus are in `00-index.md`. The contracts are `01-interfaces.md` sections 0 and 5, `01-interfaces-runtime.md` sections 6, 7, 8, 8.1, 9 and 10, and `01-interfaces-integration.md` section 16.

**Goal:** Draw the graph the student sees, and let them move it. The package builds a layered HiDPI canvas renderer for shading, the grid with tick labels, curves and points. It also builds `GraphPanel`, which adds drag, wheel and pinch, Zoom in and Zoom out, a fading Home button, the graph keys, and a role `img` name that follows the view.

**IDs:** G-5, KB-8, AN-8 and A11Y-1. **Contributions (00-index section 5.3):** the G-1, G-7, G-17 and TH-8 canvas cases in `graph.spec.ts` (Task 9), and G-8's "span the whole view" clause, `it("G-8 a line set strokes the full view height or width at its position")` in `render/draw-geometry.test.ts` (Task 5), which 06 hands to 08 because `LineSetGeometry` carries positions only. The other renderer unit tests (Tasks 4 and 5) check this package's drawing, so they are titled G-5 and are not contributions. **Open items:** none.

**Owns:** `src/lib/calculator-v2/render/`, `src/components/calculator-v2/ui/graph/`, `src/components/calculator-v2/styles/graph.css`, `tests/calculator/fixture/v2/graph.html` and `graph.tsx`, and `tests/calculator/v2/graph.spec.ts` and `graph-pixels.ts`. Nothing else is edited.

**Working rules.**

- **Commands** run from the worktree root under Node 22. On the lead's machine that is `n exec 22 <command>` (00-index section 1).
- **jsdom test files** start with `// @vitest-environment jsdom` and call `installDomStubs()`.
- **Test titles** start with an ID. Renderer tests (layers, theme reading, grid plan, render rows, shading rectangles, strokes and points) use G-5, this package's view ID, because they check that what is drawn is the view the student pans and zooms. A renderer test that checks part of another ID's rule names that ID later in its statement, never first. The one exception is Task 5's G-8 contribution, whose title 06 fixes.
- **Test notation.** `vp(l, r, b, t)` is `{ left: l, right: r, bottom: b, top: t }`. `DEFAULT = vp(-10, 10, -7.5, 7.5)` and `P = vp(-8, 12, -7.5, 7.5)`. `SIZE = { width: 800, height: 600 }`, and `view(v = DEFAULT, size = SIZE)` is `{ viewport: v, size, dpr: 1 }`. "Is `vp(…)`" means all four bounds match with `toBeCloseTo(…, 9)`. Each test file declares the helpers it uses.

## Decisions

- **Layer order, bottom to top:** `shading`; `grid` (gridlines, axes, arrows, tick labels); `curves` (curves, bands, line sets, region boundaries); `points`. Shading pixels are opaque `compositeShading` colours, so they sit under the gridlines and axes. The paper is the CSS background of `.kc-graph`, so any pixel without shading stays transparent.
- **The engine holds the viewport.** Size changes call `engine.setView`; pan, zoom and Home call `engine.setMathBounds`. Buttons, Home and keys apply synchronously; they are instant in Phase 1, and AN-7 animates them from Phase 2. Pointer and wheel changes apply once per animation frame. Until that frame runs, the input hook keeps the viewport it will apply (the pending viewport), and every change reads `pending ?? engine.getSnapshot().viewport`: each wheel event zooms from the pending view, so several wheel events in one frame accumulate; a pinch, or a drag re-anchored after a pinch, starts from it; and a synchronous change cancels the frame and builds on it. A drag or pinch is computed from the view at its start, so rounding errors never accumulate.
- **Resizes.** A view that is the default for the size it was shown at (`INITIAL_GRAPH_SIZE` from 07 before the first report) becomes the default for the new size, so collapsing the list never makes Home appear. Any other view keeps its centre and its units per px (`resizeViewport`). Nothing else ever replaces a viewport: bounds set by the student, by S-7 or by `setMathBounds` stay as set, and `setBlank` gets the default from 07's own reset. A 0×0 size is ignored and never becomes the previous size (00-index Review Focus 3).
- **Region spans** are CSS px for the view they were computed in (06), and 07 drops region geometry from the snapshot on every `view` send (07 Decision 4), so during a pan the snapshot has none. GraphPanel keeps a region cache by row id: the row's last region geometry, the view it was computed in, and a key of the row's kind, hidden flag and latex. A new region geometry replaces the entry; a deleted row, a changed key or a row error drops it. While the snapshot has no geometry for a cached row, the cached geometry is drawn through `alignRegionSpans`: after a pan the spans shift by the pan offset; after a zoom or resize they are withheld (the boundaries, in world units, still draw) until fresh geometry arrives. Shading therefore stays under the pointer through a drag, and the name's plot count does not change during it.
- **The accessible name** updates once the view has held for 250 ms (`NAME_DEBOUNCE_MS`), and at the latest 400 ms after the first change it has not yet shown (`NAME_MAX_WAIT_MS`). A continuous drag or wheel therefore renames the graph within A11Y-1's 500 ms, with 100 ms left for timer lateness and the React commit.
- **Grid.** The polar grid ships in Phase 1 (V1-40). A custom axis step (S-1, S-7) applies only when it gives at most one major line per 8 px; otherwise the automatic step is used.
- **REA capture (00-index section 8).** The G-5 zoom factor of 2 and the AN-8 fade of 100 ms ship as the spec states them. If a capture changes either value, one commit changes it together with these tests: `ZOOM_BUTTON_FACTOR` (06, through the lead) or the Home transition here.
- **Names other packages read:** `GRAPH_CONTROL_LABELS` (Task 7) and the DOM contract below. The Home control is named "Home", as in G-5, L-1 and AN-8. 01 section 10 carries both, for 10 (L-1, TH-14, KB-13) and 15 (parity and visual tests).

### DOM contract

```text
div.kc-graph[data-graph-panel]                       pointer + wheel listeners; background var(--kc-paper)
  div.kc-graph-layers[data-graph-layers][aria-hidden=true][data-rendered-revision]  ResizeObserver target
    canvas.kc-graph-canvas[data-layer=shading|grid|curves|points][aria-hidden=true]  (no tabindex)
  div.kc-graph-surface[role=img][aria-label][tabindex=0]   the graph's one tab stop; keydown handler
  div.kc-graph-controls[role=group][aria-label="Graph controls"]
    button "Graph settings" (aria-haspopup=dialog, aria-expanded) | "Zoom in" | "Zoom out"
    button "Home"[data-graph-home][data-phase]   only off the default view, plus its fade-out
```

### Constants

`src/lib/calculator-v2/render/constants.ts`. Values with no named source are package decisions.

- **Line widths (px):** `CURVE_LINE_PX` 2.5, `GRID_LINE_PX` 1, `AXIS_LINE_PX` 2.
- **Marks:** `DASH_PX` `readonly [10, 6]` and `POINT_RADIUS_PX` 4, both package decisions: G-1 fixes no dash pattern, and G-7 fixes only the 0.5 px position tolerance.
- **Labels:** `AXIS_FONT` `"13px Arial, sans-serif"` (TH-17); `LABEL_GAP_PX` 4; `LABEL_HALO_PX` 3 (the TH-9 halo technique).
- **Grid decorations:** `ARROW_LENGTH_PX` 8; `ARROW_HALF_WIDTH_PX` 4; `POLAR_SPOKE_DEG` 15 (package decision; v1 drew 12 spokes every 30°, which stay the major spokes).
- **Wheel:** `WHEEL_ZOOM_RATE` 0.002 and `WHEEL_DELTA_LIMIT` 100 are v1's (`karman-calculator/lib/ui.js:102`, which clamps the raw `deltaY`). `WHEEL_LINE_PX` 16 and the `deltaMode` conversion (lines ×16 px, pages × the graph height) are package decisions; v1 has neither.
- **Tolerances and timing:** `CUSTOM_STEP_MIN_PX` 8, `JOIN_TOLERANCE_PX` 0.5, `NAME_DEBOUNCE_MS` 250, `NAME_MAX_WAIT_MS` 400.

## Notes for the lead

None: the 01, 00-index and 15 edits this package needed are applied.

---

### Task 1: View input math (G-5, KB-8)

**Files:** Create `src/lib/calculator-v2/render/constants.ts` and `render/view-input.ts`. Test: `render/view-input.test.ts` (node).

**Interfaces.** Consumes, from 06 (`@/lib/calculator-v2/plot/viewport`): `Viewport`, `PixelSize`, `ViewSpec`, `ZOOM_KEY_FACTOR`, `KEY_PAN_FRACTION`, `defaultViewport`, `isDefaultViewport`, `zoomViewport`, `panViewport`, `resizeViewport`, `pxToWorld`; from 07 (`@/lib/calculator-v2/core/api/document`): `INITIAL_GRAPH_SIZE`. Produces `constants.ts` (the constants above) and:

```ts
// render/view-input.ts
export type GraphKeyField = "key" | "ctrlKey" | "metaKey" | "altKey" | "isComposing";
export type GraphKeyInput = Pick<KeyboardEvent, GraphKeyField>; // a native KeyboardEvent fits
export type Point = [number, number]; // CSS px in the layers' frame
export type PinchState = { mid: Point; distance: number };
// null when the key is not a graph key
export function viewportForKey(input: GraphKeyInput, view: ViewSpec): Viewport | null;
export function dragViewport(start: ViewSpec, dxPx: number, dyPx: number): Viewport;
export function pinchViewport(start: ViewSpec, from: PinchState, to: PinchState): Viewport;
export function wheelViewport(view: ViewSpec, dy: number, mode: number, at: Point): Viewport;
export function nextViewportForSize(v: Viewport, from: PixelSize | null, to: PixelSize): Viewport;
```

- [ ] **Step 1: Write the failing tests.** `key(k, mods = {})` builds a `GraphKeyInput` with every modifier false.
  - `it("KB-8 arrow keys pan by 10% of the visible range")`: `viewportForKey(key(k), view())` is `vp(-8, 12, -7.5, 7.5)` for ArrowRight, `vp(-12, 8, -7.5, 7.5)` for ArrowLeft, `vp(-10, 10, -6, 9)` for ArrowUp and `vp(-10, 10, -9, 6)` for ArrowDown.
  - `it("KB-8 + and = zoom in (range × 0.8) and - zooms out (range × 1.25) about the centre")`: `"+"` and `"="` both give `vp(-8, 8, -6, 6)`; `"-"` gives `vp(-12.5, 12.5, -9.375, 9.375)`; `"+"` on `view(P)` gives `vp(-6, 10, -6, 6)`.
  - `it("KB-8 Home restores the default view; modified and other keys are not graph keys")`: `"Home"` on `view(vp(-3, 7, -1, 2))` gives `DEFAULT`. `key("=", m)` is `null` for each `m` in `{ ctrlKey: true }`, `{ metaKey: true }`, `{ altKey: true }` and `{ isComposing: true }`. `"a"`, `"Enter"`, `"Escape"` and `"Tab"` are each `null`.
  - `it("G-5 a drag moves the paper with the pointer")`: `dragViewport(view(), 80, -60)` is `vp(-12, 8, -9, 6)`.
  - `it("G-5 the wheel zooms about the pointer with v1's rate and clamp")`, with `at = [600, 150]`: `wheelViewport(view(), -100, 0, at)` has span `20 / Math.exp(0.2)`, and `pxToWorld` at `at` is unchanged to 9 digits. `deltaY` 1000 gives span `20 * Math.exp(0.2)`. `deltaY` −3 with `deltaMode` 1 gives span `20 / Math.exp(0.096)`.
  - `it("G-5 a pinch zooms by the distance ratio about the midpoint and pans with it")`: `pinchViewport(view(), { mid: [400, 300], distance: 100 }, { mid: [400, 300], distance: 200 })` is `vp(-5, 5, -3.75, 3.75)`. With equal distances and `to.mid = [440, 270]`, the result equals `dragViewport(view(), 40, -30)`. A ratio of 2 at `mid = [600, 150]` leaves `pxToWorld(…, 600, 150)` unchanged. Degenerate contacts keep the view: `pinchViewport(view(), { mid: [400, 300], distance: 0 }, { mid: [400, 300], distance: 50 })` is `DEFAULT`, and so is `pinchViewport(view(), { mid: [400, 300], distance: 100 }, { mid: [400, 300], distance: NaN })`.
  - `it("G-5 resizes keep the default view default and keep units per pixel otherwise")`:
    - `nextViewportForSize(DEFAULT, SIZE, { width: 400, height: 600 })` is `vp(-10, 10, -15, 15)`.
    - For `v` = `P` and `v` = `vp(-10, 10, -1, 1)`, `nextViewportForSize(v, SIZE, { width: 400, height: 600 })` equals `resizeViewport(v, SIZE, { width: 400, height: 600 })`.
    - With `from` `null`: `DEFAULT` towards `{ width: 1000, height: 500 }` is `vp(-10, 10, -5, 5)`, because `DEFAULT` is the default for `INITIAL_GRAPH_SIZE`; `P` and `vp(-10, 10, -1, 1)` towards `SIZE` are returned unchanged.
- [ ] **Step 2: Run the tests and watch them fail.** Run `npx vitest run src/lib/calculator-v2/render/view-input.test.ts`. Expected: FAIL with `Failed to resolve import "./view-input"`.
- [ ] **Step 3: Implement `constants.ts` and `view-input.ts`.**
  - 06's `pxToWorld` returns `[number, number]` and `zoomViewport` takes an `{ x, y }` anchor. A view's centre is `centre = { x: (left + right) / 2, y: (bottom + top) / 2 }`.
  - `viewportForKey` returns `null` when `ctrlKey`, `metaKey`, `altKey` or `isComposing` is set. The arrow keys call `panViewport` by `KEY_PAN_FRACTION` of the visible width or height; ArrowRight and ArrowUp move the view right and up, as v1 does. `"+"` and `"="` call `zoomViewport(v, ZOOM_KEY_FACTOR, centre)`, `"-"` uses `1 / ZOOM_KEY_FACTOR`, and `"Home"` returns `defaultViewport(view.size)`.
  - `dragViewport` returns `panViewport(start.viewport, -dx·(right-left)/width, dy·(top-bottom)/height)`.
  - `pinchViewport`: `const ratio = from.distance < 1 ? 1 : to.distance / from.distance` (contacts closer than 1 CSS px give no zoom); when `ratio` is not finite it returns `start.viewport` unchanged. Otherwise `const [x, y] = pxToWorld(start, ...from.mid)`; `const zoomed = zoomViewport(start.viewport, ratio, { x, y })`; it returns `dragViewport({ ...start, viewport: zoomed }, to.mid[0] - from.mid[0], to.mid[1] - from.mid[1])`.
  - `wheelViewport` converts the delta to px (×`WHEEL_LINE_PX` when `deltaMode` is 1, ×`view.size.height` when it is 2), clamps it to ±`WHEEL_DELTA_LIMIT`, then `const [x, y] = pxToWorld(view, ...at)` and returns `zoomViewport(view.viewport, Math.exp(-px·WHEEL_ZOOM_RATE), { x, y })`.
  - `nextViewportForSize` returns `defaultViewport(to)` when `isDefaultViewport(v, from ?? INITIAL_GRAPH_SIZE)`. Otherwise it returns `v` when `from` is `null`, and `resizeViewport(v, from, to)` when it is not.
- [ ] **Step 4: Run the tests and watch them pass.** Rerun the Step 2 command. Expected: PASS, 7 tests.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/render && git commit -m "Add calculator v2 graph view input math (G-5, KB-8)"`

### Task 2: The graph's accessible name (A11Y-1)

**Files:** Create `src/components/calculator-v2/ui/graph/accessible-name.ts`. Test: `ui/graph/accessible-name.test.ts` (node).

**Interfaces.** Consumes `Viewport` and `Geometry` (06), `RowView` (07, `core/api/engine`) and `RowKind` (02, `core/corpus/types`). Produces the following; `GraphPanel.tsx` re-exports `graphAccessibleName` as 01 section 10 requires.

```ts
// curve-y, curve-x, implicit, vertical-lines, horizontal-lines, region; countPlots adds
// point, constant-relation and function-definition by rule
export const PLOT_KINDS: ReadonlySet<RowKind>;
export function formatBound(v: number): string;
export function countPlots(rows: readonly RowView[], geo: ReadonlyMap<string, Geometry>): number;
export function graphAccessibleName(viewport: Viewport, plots: number): string;
```

- [ ] **Step 1: Write the failing tests.** `row(id, kind, extra)` builds a complete `RowView` from `{ id, kind, latex: "", hidden: false, color: "c1", error: null, chips: [], complexHint: false, value: null, valueText: null, overrun: false, ...extra }`. `REGION_STUB` is `{ kind: "region", rowId: "9", evaluations: 0, spans: new Float32Array([0, 1, 0, 1]), boundaries: [] }`, `EMPTY_REGION` is `{ ...REGION_STUB, rowId: "15", spans: new Float32Array(0) }`, and `CURVE_STUB` is `{ kind: "curve", rowId: "16", evaluations: 0, polylines: new Float64Array([0, 0, 1, 1]), bands: new Float64Array(0), dashed: false }`.
  - `it("A11Y-1 the name states the bounds and the plot count")`:
    - `graphAccessibleName(DEFAULT, 2)` is `"Graph from x=-10 to 10, y=-7.5 to 7.5, 2 plots"`.
    - `graphAccessibleName(vp(-10, 10, -8.60887, 8.60887), 1)` is `"Graph from x=-10 to 10, y=-8.609 to 8.609, 1 plot"`.
    - `graphAccessibleName(vp(-5, 5, -3.75, 3.75), 0)` is `"Graph from x=-5 to 5, y=-3.75 to 3.75, 0 plots"`.
  - `it("A11Y-1 bounds keep at most 4 significant digits")`: `formatBound` maps `-6.4000000000000004` → `"-6.4"`, `12.345678` → `"12.35"`, `0.00012347` → `"0.0001235"`, `1234567.8` → `"1.235×10^6"`, `-2.5e-7` → `"-2.5×10^-7"`, `1e15` → `"1×10^15"` and `-0` → `"0"`.
  - `it("A11Y-1 only visible, error-free, chip-free graphed rows count as plots")`: with `geometry = new Map([["9", REGION_STUB], ["15", EMPTY_REGION], ["16", CURVE_STUB]])`, `countPlots` over the rows below is 8.
    - **Counted:** 1 curve-y; 6 point with the value point `[2, 3]`; 9 constant-relation whose region has spans; 11 region; 12 vertical-lines; 13 curve-x; 14 horizontal-lines; 16 function-definition with curve geometry (`f(x)=2x+1` draws a curve, 01-interfaces.md section 3).
    - **Not counted:** 2 hidden curve-y; 3 value; 4 implicit with a `syntax` error; 5 curve-y with `chips: ["a"]`; 7 point with value `null`; 8 point with the value point `[NaN, 3]`; 10 constant-relation without geometry; 15 constant-relation whose region has no spans (`3<2` draws nothing); 17 function-definition without geometry (`g(a,b)=a+b` draws nothing).
- [ ] **Step 2: Run the tests and watch them fail.** Run `npx vitest run src/components/calculator-v2/ui/graph/accessible-name.test.ts`. Expected: FAIL with `Failed to resolve import "./accessible-name"`.
- [ ] **Step 3: Implement `accessible-name.ts`.**
  - `formatBound` lets `r = Number(v.toPrecision(4))` and returns `"0"` when `r` is 0 or −0, and `String(r)` when `1e-4 ≤ |r| < 1e6`. Otherwise it splits `r.toExponential(3)` at `e` into the mantissa and `expPart`, trims the trailing zeros, and any trailing `.`, from the mantissa, lets `exponent = String(Number(expPart))` (so `+6` becomes `6` and `-7` stays `-7`), and returns `${mantissa}×10^${exponent}`. That follows the NM display style: U+00D7 and hyphen-minus.
  - `countPlots` counts rows that are not hidden, have `error === null` and `chips.length === 0`, and meet one of four conditions: the kind is in `PLOT_KINDS`; the kind is `"point"` and the value is a point with two finite coordinates; the kind is `"constant-relation"` and `geo.get(row.id)` is a region with `spans.length > 0` (only a true inequality draws); or the kind is `"function-definition"` and `geo.has(row.id)`. `RowView` carries no parameter count, and only a one-parameter definition ever gets geometry (01-interfaces.md section 3), so geometry presence is the test. GraphPanel passes `displayedGeometry` (Task 6), so the count holds while a pan has dropped region geometry.
  - `graphAccessibleName` returns `` `Graph from x=${b(left)} to ${b(right)}, y=${b(bottom)} to ${b(top)}, ${n} plot${n === 1 ? "" : "s"}` ``, where `b` is `formatBound`.
- [ ] **Step 4: Run the tests and watch them pass.** Rerun the Step 2 command. Expected: PASS, 3 tests.
- [ ] **Step 5: Commit.** `git add src/components/calculator-v2/ui/graph && git commit -m "Add the calculator v2 graph accessible name (A11Y-1)"`

### Task 3: Render types and the grid plan (G-5)

**Files:** Create `src/lib/calculator-v2/render/types.ts` and `render/grid-plan.ts`. Test: `render/grid-plan.test.ts` (node).

**Interfaces.** Consumes:

- 06: `axisTicks` (`plot/ticks`), `worldToPx`, `ViewSpec`, `Geometry`.
- 04: `formatAxisLabel` (`core/eval/format`).
- 07: `CalculatorSettings`, `DEFAULT_SETTINGS` (`core/api/types`).
- 03: `CurveSlot`.
- Task 1: the constants.

Produces `types.ts`, with `RenderTheme`, `RenderRow`, `GridSettings` and `RenderFrame` exactly as 01 section 10 declares them, and `grid-plan.ts` (all values in CSS px):

```ts
export type PxSegment = { x0: number; y0: number; x1: number; y1: number };
export type PxEllipse = { cx: number; cy: number; rx: number; ry: number };
export type Align = "left" | "center" | "right";
export type Baseline = "top" | "middle" | "bottom";
export type PxLabel = { text: string; x: number; y: number; align: Align; baseline: Baseline };
export type PxArrow = { x: number; y: number; direction: "right" | "up" }; // x, y is the tip
// polar: minorLines and majorLines hold the spokes, which are stroked; otherwise they are filled rects
export type GridPlan = Record<"minorLines" | "majorLines" | "axes", PxSegment[]> &
  Record<"minorEllipses" | "majorEllipses", PxEllipse[]> & {
    polar: boolean;
    arrows: PxArrow[];
    labels: PxLabel[];
  };
export const GRID_KEYS: readonly (keyof GridSettings)[];
export function pickGrid(settings: CalculatorSettings): GridSettings;
export type AxisSteps = { step: number; major: number[]; minor: number[] };
export function axisSteps(min: number, max: number, px: number, custom: number | null): AxisSteps;
export type Measure = (text: string) => number;
export function planGrid(view: ViewSpec, grid: GridSettings, measure: Measure): GridPlan;
```

- [ ] **Step 1: Write the failing tests.** The tests use `measure = (t) => 7 * t.length`, `GRID = pickGrid(DEFAULT_SETTINGS)`, `vertical = (s) => s.x0 === s.x1` and `fx = (v) => formatAxisLabel(v, 2)`.
  - `it("G-5 the default 800×600 view: majors every 2, minors every 0.5, axes through the centre")`, on `planGrid(view(), GRID, measure)`:
    - The vertical major `x0` values contain 80, 160, 240, 320, 480, 560, 640 and 720, but not 400.
    - The horizontal major `y0` values are `[540, 460, 380, 220, 140, 60]`.
    - Every vertical minor `x0` is a multiple of 20 and not a multiple of 80.
    - `axes` is `[{ x0: 0, y0: 300, x1: 800, y1: 300 }, { x0: 400, y0: 0, x1: 400, y1: 600 }]`.
    - The label texts are `[-8, -6, -4, -2, 2, 4, 6, 8].map(fx)`, then `[-6, -4, -2, 2, 4, 6].map(fx)`, then `"0"`.
    - `labels[0]` is `{ text: fx(-8), x: 80, y: 304, align: "center", baseline: "top" }`.
    - `labels[8]` is `{ text: fx(-6), x: 396, y: 540, align: "right", baseline: "middle" }`.
    - `arrows` is `[]`.
  - `it("G-5 the grid follows a panned view and labels pin to the edge when an axis leaves it")`:
    - For `view(P)`, `axes` contains `{ x0: 320, y0: 0, x1: 320, y1: 600 }`, and the last label is `{ text: "0", x: 316, y: 304, align: "right", baseline: "top" }`.
    - For `view(vp(2, 22, 3, 18))`, `axes` is `[]`.
    - In that view, the centred labels are non-empty and all have baseline `bottom` and `y === 596`.
    - In that view, the `middle` labels are non-empty and all have align `left` and `x === 4`.
  - `it("G-5 the grid plan honours every GridSettings field")`, each case changing `GRID` as follows:
    - `showGrid: false` gives no lines or ellipses.
    - `minorGridlines: false` gives `minorLines: []`.
    - `axisNumbers: false` gives `labels: []`.
    - `xAxis: { show: false, label: "t", step: null }` leaves `axes` as `[{ x0: 400, y0: 0, x1: 400, y1: 600 }]`, and the label texts are exactly `[-6, -4, -2, 2, 4, 6].map(fx)`: no x labels, no `"t"` title and no `"0"`.
    - `arrows: true` gives `[{ x: 800, y: 300, direction: "right" }, { x: 400, y: 0, direction: "up" }]`.
    - `polarGrid: true` gives `polar: true`; major ellipses with `rx` `[80, 160, 240, 320, 400, 480]`, each with `cx` 400, `cy` 300 and `ry === rx`; and `majorLines` and `minorLines` of 12 spokes each, every one with `x0` 400 and `y0` 300. The default plan has `polar: false`.
    - `xAxis: { show: true, label: "t", step: 5 }` gives vertical major `x0` values `[0, 200, 600, 800]` and a label `{ text: "t", align: "right", baseline: "bottom" }`.
    - An x step of `0.001` gives at most 100 vertical majors.
- [ ] **Step 2: Run the tests and watch them fail.** Run `npx vitest run src/lib/calculator-v2/render/grid-plan.test.ts`. Expected: FAIL with `Failed to resolve import "./grid-plan"`.
- [ ] **Step 3: Implement `types.ts` and `grid-plan.ts`.**
  1. **`axisSteps`** returns `axisTicks(min, max, px)`. The exception is a `custom` step that is finite, positive and gives at most `px / CUSTOM_STEP_MIN_PX` majors. Then the majors are `k·custom` for k from `ceil(min/custom)` to `floor(max/custom)`, the minors are steps of `custom/5`, and minors within `1e-9·step` of a major are dropped.
  2. **Lines.** `showGrid` off gives no lines or ellipses. Cartesian lines are full height at the x ticks and full width at the y ticks, in ascending order. x = 0 is skipped while the y-axis is drawn, and y = 0 while the x-axis is drawn.
  3. **Polar grid (`polarGrid`).**
     - Ellipses are centred at `worldToPx(0, 0)`, with `rx = r·width/(right-left)` and `ry = r·height/(top-bottom)`.
     - The radii r > 0 are the x major steps (major ellipses) and the x minor steps (minor ellipses). They run from the origin's distance to the view rectangle up to its farthest corner.
     - Spokes run every `POLAR_SPOKE_DEG` from the origin pixel to `2·(width+height)` px away, as `PxSegment`s: multiples of 30° go in `majorLines` and the rest in `minorLines`. The plan sets `polar: true`, and every spoke is stroked, the 0°, 90°, 180° and 270° ones included.
     - No Cartesian lines are drawn. `minorGridlines` off drops the minor spokes and minor ellipses.
  4. **Axes.** The x-axis spans the width at y = 0 when `xAxis.show` is on and `bottom ≤ 0 ≤ top`; the y-axis follows the same rule. With `arrows` on, each drawn axis gets a tip: `(width, axisY)` pointing right, or `(axisX, 0)` pointing up.
  5. **Labels (`axisNumbers`).** The text is `formatAxisLabel(v, step)`. The order is x ascending, then y ascending, then `"0"`. An axis whose `show` is false gets no tick labels and no title.
     - **x labels** are centred, baseline `top`, at `axisY + LABEL_GAP_PX`. If the axis is above the view, they sit at `LABEL_GAP_PX` with baseline `top`. If it is below, they sit at `height - LABEL_GAP_PX` with baseline `bottom`.
     - **y labels** have baseline `middle` and align `right` at `axisX - LABEL_GAP_PX`. If the axis is left of the view, they align `left` at `LABEL_GAP_PX`. If it is right of the view, they align `right` at `width - LABEL_GAP_PX`.
     - **Zero.** 0 is skipped on both axes. A single `"0"` goes at `(axisX - gap, axisY + gap)`, align `right`, baseline `top`, when the origin is in view and both axes show.
     - **Dropping.** A label is dropped when its box (the `measure` width by 13 px) leaves the canvas or overlaps the last label kept on its axis.
     - **Axis titles.** A non-empty `xAxis.label` goes at `(width - gap, axisY - gap)`, align `right`, baseline `bottom`. A non-empty `yAxis.label` goes at `(axisX + gap, gap)`, align `left`, baseline `top`. Both are clamped into view like the tick labels.
- [ ] **Step 4: Run the tests and watch them pass.** Rerun the Step 2 command. Expected: PASS, 3 tests.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/render && git commit -m "Add the calculator v2 grid plan (G-5)"`

### Task 4: Shading rectangles and region alignment (G-5)

**Files:** Create `src/lib/calculator-v2/render/shading.ts`. Test: `render/shading.test.ts` (node).

**Interfaces.** Consumes `compositeShading` and `contrastRatio` (03, `theme/contrast`), and `RegionGeometry`, `ViewSpec`, `PixelSize` and `worldToPx` (06). Produces:

```ts
// spans: CSS px [yTop, yBottom, x0, x1, …]
export type ShadingRegion = { spans: Float32Array; color: string; fillAlpha: number };
export type ShadingRect = { x: number; y: number; width: number; height: number; color: string }; // device px
export function buildShadingRects(
  regions: readonly ShadingRegion[],
  paper: string,
  size: PixelSize,
  dpr: number
): ShadingRect[];
export function alignRegionSpans(g: RegionGeometry, from: ViewSpec, to: ViewSpec): RegionGeometry;
```

- [ ] **Step 1: Write the failing tests.** Fixtures:
  - `PAPER = "#fbf8f1"`.
  - `A = { spans: [0, 10, 0, 10], color: "#1f5fbf", fillAlpha: 0.1 }` and `B = { spans: [5, 15, 5, 15], color: "#b8322a", fillAlpha: 0.12 }`, with spans as `Float32Array`.
  - `f(r) = { color: r.color, alpha: r.fillAlpha }`.
  - `a`, `b` and `ab` are `compositeShading(PAPER, …)` of `[f(A)]`, `[f(B)]` and `[f(A), f(B)]`.

  The tests:
  - `it("G-5 overlapping region spans paint the compositeShading colour of every covering fill (G-17), rows merged")`: `buildShadingRects([A, B], PAPER, { width: 20, height: 20 }, 1)` is exactly these five rects, in order:
    1. `{ x: 0, y: 0, width: 10, height: 5, color: a }`
    2. `{ x: 0, y: 5, width: 5, height: 5, color: a }`
    3. `{ x: 5, y: 5, width: 5, height: 5, color: ab }`
    4. `{ x: 10, y: 5, width: 5, height: 5, color: b }`
    5. `{ x: 5, y: 10, width: 10, height: 5, color: b }`
  - `it("G-5 a device pixel is shaded exactly when its centre lies inside a region span")`: a region `r` with spans `[0.3, 1.2, 0.3, 1.2]`, at `dpr` 2 on a 2×2 size, gives exactly `[{ x: 1, y: 1, width: 1, height: 1, color: compositeShading(PAPER, [f(r)]) }]`.
  - `it("G-5 stacked region fills never paint the paper and stay within TH-8's 1.3:1")`: four regions with spans `[0, 4, 0, 4]` and `fillAlpha` 0.12, in colours `#1f5fbf`, `#b8322a`, `#2c7a3f` and `#7a3fa0`, on a 4×4 size at `dpr` 1, give one rect. Its colour is not `PAPER`, and `contrastRatio(color, PAPER) ≤ 1.3 + 1e-9`.
  - `it("G-5 region spans follow a pan and are withheld after a zoom until fresh geometry arrives")`, where `g` has spans `[0, 300, 0, 800]` and `boundaries: []`:
    - `alignRegionSpans(g, view(), view())` is `g` itself.
    - Towards `view(vp(-8, 12, -6, 9))`, the spans are `[60, 360, -80, 720]`.
    - Towards `view(vp(-5, 5, -3.75, 3.75))`, the spans are empty and `boundaries` is `g.boundaries`.
    - Towards `view(DEFAULT, { width: 400, height: 300 })`, the spans are empty.

- [ ] **Step 2: Run the tests and watch them fail.** Run `npx vitest run src/lib/calculator-v2/render/shading.test.ts`. Expected: FAIL with `Failed to resolve import "./shading"`.
- [ ] **Step 3: Implement `shading.ts`.** `buildShadingRects` works on a device grid `W = round(width·dpr)` by `H = round(height·dpr)`:

```text
span (yTop,yBottom,x0,x1) covers device rows ceil(yTop·dpr−0.5) … ceil(yBottom·dpr−0.5)−1 and columns
  ceil(x0·dpr−0.5) … ceil(x1·dpr−0.5)−1, clipped to [0,W)×[0,H)   (the pixel centre lies inside the span)
per device row: sweep every region's covered intervals; each maximal run with one non-empty region set is a
  rect coloured compositeShading(paper, that set's fills in row order), memoised per set
a row whose runs equal the previous row's extends those rects by 1 in height; output sorted by y, then x
```

`alignRegionSpans` has three cases:

- **Same view:** the same size and every viewport bound equal within 1e-12 relative. It returns `g` itself.
- **Pan:** the same size and the same units per px within 1e-9 relative. It returns a copy shifted by `worldToPx(to, c) − worldToPx(from, c)`, where `c` is the centre of `from`.
- **Otherwise:** it returns a copy with `spans: new Float32Array(0)` and the same `boundaries`.
- [ ] **Step 4: Run the tests and watch them pass.** Rerun the Step 2 command. Expected: PASS, 4 tests.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/render && git commit -m "Add calculator v2 shading rectangles and region alignment (G-5)"`

### Task 5: Draw functions and `GraphRenderer` (G-5, G-8 contribution)

**Files:** Create `src/lib/calculator-v2/render/__fixtures__/recording-context.ts`, `render/draw-grid.ts`, `render/draw-geometry.ts` and `render/renderer.ts`. Tests: `render/draw-geometry.test.ts` (node) and `render/renderer.test.ts` (jsdom).

**Interfaces.** Consumes Tasks 1, 3 and 4; `CurveGeometry`, `LineSetGeometry` and `defaultViewport` (06); `ROLE_VARS`, `CURVE_VARS` and `FILL_ALPHA_VARS` (03, `theme/roles`); `SKIN_COLORS` (03, `theme/skin-colors.generated`, test only); and `installDomStubs` and `DEFAULT_SETTINGS` (07). Produces the following; `GraphRenderer` and `readRenderTheme` match 01 section 10 exactly.

```ts
// __fixtures__/recording-context.ts; `state` is copied at each call
export type RecordedState = { fillStyle: unknown; strokeStyle: unknown; lineWidth: number };
export type DashState = { lineDash: number[]; lineDashOffset: number };
export type RecordedCall = { name: string; args: unknown[]; state: RecordedState & DashState };
export function createRecordingContext(): { ctx: CanvasRenderingContext2D; calls: RecordedCall[] };
// draw-grid.ts holds only drawGridLayer; draw-geometry.ts holds the rest. Both declare Ctx.
type Ctx = CanvasRenderingContext2D;
export function drawGridLayer(ctx: Ctx, plan: GridPlan, theme: RenderTheme, view: ViewSpec): void;
// draw-geometry.ts
export type ClipRect = { left: number; top: number; right: number; bottom: number };
export function clipSegment(a: Point, b: Point, r: ClipRect): [Point, Point] | null; // Liang–Barsky
export function drawShadingLayer(ctx: Ctx, rects: readonly ShadingRect[]): void;
export function drawCurveLayer(ctx: Ctx, view: ViewSpec, rows: readonly RenderRow[]): void;
export function drawPointLayer(ctx: Ctx, view: ViewSpec, rows: readonly RenderRow[]): void;
// renderer.ts
export const LAYER_ORDER: readonly ["shading", "grid", "curves", "points"];
export class GraphRenderer {
  constructor(container: HTMLElement);
  render(frame: RenderFrame): void;
  destroy(): void;
}
export function readRenderTheme(host: Element): RenderTheme;
```

- [ ] **Step 1: Create the recorder, then write the failing tests.** `__fixtures__/recording-context.ts` is test support, created here so Step 2 fails only on the modules under test. `ctx` is a plain object implementing only the members the draw modules call; each call appends `{ name, args, state }` with the state copied at that moment, and `measureText(t)` returns `{ width: 7·t.length }`.

  **`draw-geometry.test.ts`.** `curve(polylines, dashed)` is a `CurveGeometry` with no bands. `curveRow(polylines, dashed)` wraps it in a `RenderRow` with colour `"#1f5fbf"`. `lineRow(orientation, positions)` wraps the `LineSetGeometry` `{ kind: "lines", rowId: "1", evaluations: 0, orientation, positions: new Float64Array(positions), dashed: false }` the same way. `strokes(calls)` keeps only the `stroke` calls.
  - `it("G-5 strict region boundaries stroke with the dash pattern and non-strict ones solid (G-1)")`: run `drawCurveLayer(ctx, view(), …)` on a region row with no spans and boundaries `[curve([-5, 1, 5, 1], true), curve([-5, 2, 5, 2], false)]`. The strokes' `lineDash` values are `[[10, 6], []]`, and every stroke has `strokeStyle` `"#1f5fbf"` and `lineWidth` 2.5.
  - `it("G-5 the dash phase continues across runs that meet")`: `curveRow([-5, 1, 0, 1, NaN, NaN, 0, 1, 5, 1, NaN, NaN, -5, 2, 5, 2], true)` gives stroke `lineDashOffset` values `[0, 200, 0]`.
  - `it("G-5 a point is a filled circle of radius 4 px at its view position (G-7)")`: points `[2, 3, NaN, 1]` give one `arc` call, with args `[480, 180, 4, 0, 2 * Math.PI]`, and a `fill` with `fillStyle` `"#1f5fbf"`.
  - `it("G-5 curves map through the current view and far vertices are clipped")`: `curveRow([0, 0, 1e12, 1e12], false)` gives `moveTo(400, 300)`, then a `lineTo` at about `(705, -5)` (6 digits). That point is on the view's edge expanded by `2·CURVE_LINE_PX`.
  - `it("G-8 a line set strokes the full view height or width at its position")`: `drawCurveLayer(ctx, view(), [lineRow("vertical", [3])])` records `moveTo(520, 0)`, then `lineTo(520, 600)`, then one `stroke`. `lineRow("horizontal", [2])` records `moveTo(0, 220)`, then `lineTo(800, 220)`, then one `stroke`. Each coordinate matches with `toBeCloseTo(…, 9)`.

  **`renderer.test.ts`.** `p = SKIN_COLORS.ivory.normal`, and `THEME: RenderTheme` is `{ paper: p.roles.paper, text: p.roles.text, axis: p.roles.axis, gridMajor: p.roles.gridMajor, gridMinor: p.roles.gridMinor, focusRing: p.roles.focusRing, curves: p.curves, fillAlpha: p.fillAlpha }`. `frame(size, dpr)` is the `RenderFrame` `{ view: { viewport: defaultViewport(size), size, dpr }, grid: pickGrid(DEFAULT_SETTINGS), rows: [], theme: THEME }`.
  - `it("G-5 GraphRenderer stacks four hidden canvases, skips frames it cannot draw and releases them")`, after `installDomStubs()`:
    1. The canvases' `data-layer` values are `["shading", "grid", "curves", "points"]`, each with `aria-hidden="true"` and no `tabindex`.
    2. `render(frame(800×600, 2))` does not throw while the 2D context is `null`.
    3. With `HTMLCanvasElement.prototype.getContext` mocked to return a recording context, `render(frame(0×600, 1))` records no calls.
    4. `render(frame(800×600, 2))` sets the backing stores to 1600×1200 and records `setTransform` with args `2,0,0,2,0,0`.
    5. After `destroy()` is called twice, every canvas is 0×0 and `!isConnected`.
  - `it("G-5 readRenderTheme reads every role from the host's computed custom properties")`: mock `getComputedStyle` so that `getPropertyValue` maps `ROLE_VARS.paper` to `" #fbf8f1"`, `ROLE_VARS.text` to `"#222222"`, `ROLE_VARS.axis` to `"#1d1d1f"`, `ROLE_VARS.gridMajor` to `"#bdb5a6"`, `ROLE_VARS.gridMinor` to `"#d9d3c7"`, `ROLE_VARS.focusRing` to `"#0b57d0"`, `CURVE_VARS.c1` to `"#1f5fbf"` and `FILL_ALPHA_VARS.c1` to `"0.12"`. The theme's `paper`, `text`, `axis`, `gridMajor`, `gridMinor`, `focusRing`, `curves.c1` and `fillAlpha.c1` are then `"#fbf8f1"`, `"#222222"`, `"#1d1d1f"`, `"#bdb5a6"`, `"#d9d3c7"`, `"#0b57d0"`, `"#1f5fbf"` and `0.12`.

- [ ] **Step 2: Run the tests and watch them fail.** Run `npx vitest run src/lib/calculator-v2/render/draw-geometry.test.ts src/lib/calculator-v2/render/renderer.test.ts`. Expected: FAIL with `Failed to resolve import` for `"./draw-geometry"` and `"./renderer"`.
- [ ] **Step 3: Implement the draw modules and `renderer.ts`.**
  - **Every layer** starts with `setTransform(1,0,0,1,0,0)` and a full `clearRect`. The shading layer then fills its rects in device px. The other layers then set `setTransform(dpr,0,0,dpr,0,0)`.
  - **Grid layer.**
    - Axes, and the lines of a Cartesian plan (`plan.polar` false), are device-px `fillRect`s, `max(1, round(px·dpr))` thick and placed at `round(pos·dpr) − floor(thickness/2)`. Lines use `GRID_LINE_PX`; axes use `AXIS_LINE_PX`.
    - In a polar plan, every line is a spoke; spokes and ellipses are stroked at `GRID_LINE_PX`.
    - The draw order is minor lines (`gridMinor`), major lines (`gridMajor`), axes (`axis`), arrows (filled triangles in `axis`), then labels.
    - Labels use `AXIS_FONT`: a `strokeText` halo of `LABEL_HALO_PX` with round joins in `paper`, then `fillText` in `text`.
  - **Curves layer.**
    - Strokes use the row colour and `CURVE_LINE_PX`, with round joins and caps.
    - Vertices go through `worldToPx`. Each segment goes through `clipSegment` against the view expanded by `2·CURVE_LINE_PX`.
    - A NaN pair ends a run, and each run gets its own `beginPath` and `stroke`.
    - Dashed geometry uses `setLineDash(DASH_PX)`. Its `lineDashOffset` is the length accumulated while each run starts within `JOIN_TOLERANCE_PX` of the previous run's end; otherwise it resets to 0. Solid geometry uses `setLineDash([])`.
    - `bands` are drawn with `fillRect`. A line set strokes each position as its own run across the whole view, with no clip: a vertical line from `(px, 0)` to `(px, height)` and a horizontal one from `(0, py)` to `(width, py)`, with `px` and `py` from `worldToPx`. It follows its own dashed flag. Region boundaries are drawn the same way.
  - **Points layer.** A filled `arc` of `POINT_RADIUS_PX` at each finite coordinate pair.
  - **`GraphRenderer`.**
    - The constructor appends one canvas per `LAYER_ORDER` entry, as the DOM contract specifies.
    - `render` returns at once if either side of the size is ≤ 0 or `theme.paper` is not `#rrggbb`. Otherwise it sets the backing stores to `round(size·dpr)` when that changes.
    - A `null` 2D context skips the frame.
    - Otherwise it draws, in order: shading (`buildShadingRects` over the region rows, on `theme.paper`); the grid (`planGrid`, measured on the grid context with `font = AXIS_FONT`); curves; points.
    - `destroy` is idempotent. It sets each canvas to 0×0 before removing it, which frees iOS Safari canvas memory across AR-61's question changes.
  - **`readRenderTheme`** reads `getComputedStyle(host).getPropertyValue(var).trim()` for each variable, and parses fill alphas with `parseFloat`.
- [ ] **Step 4: Run the tests and watch them pass.** Rerun the Step 2 command. Expected: PASS, 7 tests (5 in `draw-geometry.test.ts`, 2 in `renderer.test.ts`).
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/render && git commit -m "Add the calculator v2 layered canvas renderer (G-5, G-8 line span)"`

### Task 6: GraphPanel sizing, render loop and name (G-5, A11Y-1)

**Files:** Create `src/components/calculator-v2/ui/graph/render-rows.ts`, `use-graph-size.ts`, `use-debounced.ts` and `GraphPanel.tsx`, and `src/components/calculator-v2/styles/graph.css`. Tests: `ui/graph/render-rows.test.ts` (node) and `ui/graph/GraphPanel.test.tsx` (jsdom).

**Interfaces.** Consumes:

- Tasks 1 to 5.
- 07: `EngineContext`, `useEngine` and `useEngineSnapshot` (`ui/hooks/use-engine`); `SkinContext` and `useSkin` (`ui/hooks/skin`); `CalculatorEngine`, `EngineSnapshot`, `RowView`, `DEFAULT_SETTINGS` and `createEngine`; `ComputeBackend` and `createMainThreadBackend` (`worker/backend`); `MainToWorker` (`worker/protocol`); `installDomStubs` and `triggerResize`.
- 03: `resolveRowColor`, `SkinId`.
- 06: `Geometry`, `RegionGeometry`, `isDefaultViewport` and `resizeViewport`.

Produces the following; `GraphPanelProps`, `GraphPanel` and the `graphAccessibleName` re-export match 01 section 10 exactly.

```ts
// render-rows.ts
export type RegionEntry = { key: string; geometry: RegionGeometry; source: ViewSpec };
export type RegionCache = ReadonlyMap<string, RegionEntry>; // by row id
export function regionKey(row: RowView): string;
export function updateRegionCache(prev: RegionCache, s: EngineSnapshot): RegionCache;
export function displayedGeometry(s: EngineSnapshot, c: RegionCache): ReadonlyMap<string, Geometry>;
export function buildRenderRows(
  s: EngineSnapshot,
  skin: SkinId,
  current: ViewSpec,
  cache: RegionCache
): RenderRow[];
// use-graph-size.ts
export type GraphSize = { size: PixelSize; dpr: number };
type Target = React.RefObject<HTMLElement | null>;
export function useGraphSize(target: Target, engine: CalculatorEngine): GraphSize | null;
// use-debounced.ts
export type DebounceOptions = { maxWaitMs?: number };
export function useDebounced<T>(value: T, ms: number, options?: DebounceOptions): T;
```

- [ ] **Step 1: Write the failing tests.**

  **`render-rows.test.ts` fixtures.** `row()` is Task 2's. `curveG(id)` is `{ kind: "curve", rowId: id, evaluations: 0, polylines: new Float64Array([0, 0, 1, 1]), bands: new Float64Array(0), dashed: false }`, and `REGION` is `{ kind: "region", rowId: "4", evaluations: 0, spans: new Float32Array([0, 300, 0, 800]), boundaries: [] }`.
  - `snap` is the complete `EngineSnapshot` `{ revision: 1, rows, settings: DEFAULT_SETTINGS, viewport: DEFAULT, view: view(), geometry: new Map([["1", curveG("1")], ["2", curveG("2")], ["4", REGION]]), focusedRowId: null, activeRowId: null, canUndo: false, canRedo: false, backendKind: "main-thread" }`.
  - Its `rows` are `row("1", "curve-y", { latex: "y=x" })`, `row("2", "curve-y", { latex: "y=2x", hidden: true })`, `row("3", "value", { latex: "2+3" })` and `row("4", "region", { latex: "y<1", color: "c2" })`.
  - `panned` is `snap` as 07 leaves it after `setMathBounds(vp(-8, 12, -6, 9))`: `revision: 2`, that viewport in `viewport` and `view`, and `geometry` without `"4"`.
  - `c0 = updateRegionCache(new Map(), snap)` and `c1 = updateRegionCache(c0, panned)`.

  **`render-rows.test.ts` tests.**
  - `it("G-5 render rows follow list order with skin colours")`:
    1. `buildRenderRows(snap, "ivory", view(), c0)` gives row ids `["1", "4"]`.
    2. Row 1's `color` is `resolveRowColor("c1", "ivory").hex`.
    3. Row 4's `fillAlpha` is `resolveRowColor("c2", "ivory").fillAlpha`, and its `geometry` is `REGION` (`toBe`).
  - `it("G-5 the region cache keeps a row's shading through a pan and drops it when the row changes")`:
    1. `c1.get("4")` has `geometry` `REGION` (`toBe`) and `source` equal to `view()`, and `updateRegionCache(c1, panned)` is `c1`.
    2. `buildRenderRows(panned, "ivory", panned.view!, c1)` gives row ids `["1", "4"]`, and row 4's spans are `[60, 360, -80, 720]`.
    3. `buildRenderRows(panned, "ivory", view(vp(-5, 5, -3.75, 3.75)), c1)` still has row 4, with no spans.
    4. `displayedGeometry(panned, c1).get("4")` is `REGION`, and `displayedGeometry(snap, c0)` is `snap.geometry`.
    5. `updateRegionCache(c1, changed)` has no `"4"` when `changed` is `panned` with row 4 given latex `"y<2"`, `hidden: true`, kind `"implicit"` or `error: { code: "timeout", message: "", names: [], span: null }`.

  **`GraphPanel.test.tsx` setup.**
  - Fake timers cover `setTimeout`, `clearTimeout`, `requestAnimationFrame` and `cancelAnimationFrame`.
  - `gate = gatedBackend()` wraps `createMainThreadBackend()`. `kind`, `onMessage` and `dispose` delegate. `post` forwards each `MainToWorker`, except after `gate.hold()`, when it queues it; `gate.release()` forwards the queue in order and stops holding.
  - The engine is `createEngine(undefined, { backend: gate.backend, scheduleFrame: (cb) => queueMicrotask(cb) })`.
  - `mount(props = {})` renders `GraphPanel` inside `EngineContext` and `SkinContext` `"ivory"`, with `host={document.body}`, `themeRevision={0}`, `reducedMotion={false}`, `settingsOpen={false}` and `onOpenSettings={vi.fn()}`, each overridden by `props`. It returns RTL's `render` result.
  - `size(w, h)` triggers a resize on `[data-graph-layers]` and advances one frame.
  - `mountSized(props = {})` calls `mount(props)`, then `size(800, 600)`, and returns the same result. Every test below that needs a known size starts with it: until the first non-zero size, the panel renders nothing and its controls and keys do nothing (Task 7).
  - `GraphRenderer.prototype.render` is spied. `lastFrame()` is the `RenderFrame` of its latest call, and `rowOf(id)` is that frame's row with that id.
  - `settle(id, kind)` awaits `vi.waitFor` (which advances the fake timers) until `getSnapshot().geometry.get(id)?.kind` is `kind` and `[data-graph-layers]` has `data-rendered-revision` equal to `getSnapshot().revision`.
  - Tests are `async` and use `await act(async () => …)`, so the engine's microtask notifications flush. Task 7's tests do the same.

  **`GraphPanel.test.tsx` tests.**
  - `it("G-5 a zero-size container keeps a finite viewport and skips rendering")` (00-index Review Focus 3's title; the steps also check that rows changed while hidden redraw):
    1. Call `mountSized()`, then `size(0, 0)`. `getSnapshot().view.size` stays 800×600.
    2. Call `setExpressions([{ id: "1", latex: "y=x" }])`, then `size(800, 600)` and `settle("1", "curve")`. Every viewport bound is finite, and the viewport equals `DEFAULT`. `lastFrame().rows` is one row, with id `"1"`.
    3. `render` has been called, and every call had width > 0 and height > 0.
  - `it("G-5 resizes keep the default view default and other views' units per pixel")`:
    1. `mountSized()` then `size(400, 600)` gives `vp(-10, 10, -15, 15)`.
    2. `setMathBounds(P)` then `size(800, 600)` gives `resizeViewport(P, { width: 400, height: 600 }, SIZE)`.
    3. After `engine.setBlank()`, `isDefaultViewport(viewport, SIZE)` is true.
    4. `setMathBounds(vp(-10, 10, -2, 2))` is still `vp(-10, 10, -2, 2)` after one frame. `size(400, 600)` then gives `vp(-5, 5, -2, 2)`, which keeps its units per pixel.
  - `it("G-5 inequality shading follows a pan while the region is re-plotted")`:
    1. `mountSized()`, `setExpressions([{ id: "1", latex: "y<1" }, { id: "2", latex: "3>2" }])`, `settle("2", "region")` and `settle("1", "region")`. `before` is `Array.from` of `rowOf("1")`'s region spans; it is non-empty.
    2. `gate.hold()`, then `setMathBounds(P)`. `getSnapshot().geometry.has("1")` is false (07 Decision 4).
    3. Advance one frame. `rowOf("1")` is a region whose spans equal `before` with every `x0` and `x1` (indices 2 and 3 of each four) reduced by 80, to 3 digits. After another 250 ms the name ends `", 2 plots"`.
    4. `gate.release()` and `settle("1", "region")`. `rowOf("1").geometry` is `getSnapshot().geometry.get("1")` (`toBe`).
  - `it("A11Y-1 the graph is one role img named from the view and plotted rows, renamed after 250 ms")`:
    1. `mountSized()` and advance 250 ms. `getByRole("img")` is named `"Graph from x=-10 to 10, y=-7.5 to 7.5, 0 plots"`.
    2. `setExpressions([{ id: "1", latex: "y=x" }, { id: "2", latex: "y=x^{2}" }, { id: "3", latex: "2+3" }])`, then advance 250 ms. The name ends `", 2 plots"`.
    3. `setMathBounds(P)`. After 100 ms the name has not changed; after another 150 ms it is `"Graph from x=-8 to 12, y=-7.5 to 7.5, 2 plots"`.
  - `it("A11Y-1 a continuous pan renames the graph within 500 ms, before the pan stops")`:
    1. `mountSized()` and advance 250 ms. The name is the default name of the previous test, with `0 plots`.
    2. For `i` from 1 to 20: `setMathBounds(vp(-10 + i / 10, 10 + i / 10, -7.5, 7.5))`, then advance 50 ms. Once `i` is 10 (500 ms after the first pan), the name is no longer the default name.
    3. After `i` = 20 and another 250 ms, the name is `"Graph from x=-8 to 12, y=-7.5 to 7.5, 0 plots"`.

- [ ] **Step 2: Run the tests and watch them fail.** Run `npx vitest run src/components/calculator-v2/ui/graph/render-rows.test.ts src/components/calculator-v2/ui/graph/GraphPanel.test.tsx`. Expected: FAIL with `Failed to resolve import` for `"./render-rows"` and `"./GraphPanel"`.
- [ ] **Step 3: Implement the hooks, `render-rows.ts`, `GraphPanel` and `graph.css`.** This task renders the DOM contract without the control buttons, which Task 7 adds.
  - **`useGraphSize`.**
    - `GraphPanel` passes the layers element as the target. A `ResizeObserver` on it reads `entry.contentRect`. `dpr` is `devicePixelRatio || 1`, re-read when `matchMedia("(resolution: <dpr>dppx)")` changes.
    - A size with a 0 side is ignored: the hook keeps returning the last non-zero size, and frames keep rendering at it.
    - Any other change of size or `dpr` calls `engine.setView({ viewport: nextViewportForSize(viewport, previous?.size ?? null, size), size, dpr })`, where `previous` is the last size the hook reported (`null` before the first). That is the hook's only `setView`; it never replaces a viewport otherwise.
    - Cleanup disconnects the observer and the listener.
  - **`render-rows.ts`.**
    - `regionKey(row)` is `JSON.stringify([row.kind, row.hidden, row.latex])`.
    - `updateRegionCache` keeps each entry whose row is still in `s.rows` with an equal `regionKey` and `error === null`.
    - Then, when `s.view` is not null, each region geometry `g` in `s.geometry` whose entry does not hold `g` gets `{ key: regionKey(row), geometry: g, source: { viewport: s.viewport, size: s.view.size, dpr: s.view.dpr } }`. 07 accepts plots only for its latest view, so that is the view `g` was computed in.
    - It returns `prev` itself when no entry changed.
    - `displayedGeometry` returns `s.geometry` plus each cached geometry whose row has none in it, or `s.geometry` itself when there is nothing to add.
    - `buildRenderRows` walks `s.rows` in list order and skips hidden rows. A row's geometry is `s.geometry.get(id)`, else its cached geometry; a row with neither is skipped. A region goes through `alignRegionSpans(g, cache.get(id)?.source ?? current, current)`. `color` and `fillAlpha` come from `resolveRowColor(row.color, skin)`.
  - **Region cache.** A `GraphPanel` ref holds `{ snapshot, cache }`. During render, when `snapshot` is not the ref's, the ref becomes `{ snapshot, cache: updateRegionCache(ref.cache, snapshot) }`. That is pure, so a repeated render gives the same cache.
  - **Render loop.**
    - A layout effect creates `new GraphRenderer(layers)`. Unmounting destroys it and cancels any pending frame.
    - While the size is known, a change of snapshot, skin, `themeRevision` or size schedules one coalesced `requestAnimationFrame`.
    - That frame renders `{ view, grid: pickGrid(settings), rows: buildRenderRows(snapshot, skin, view, cache), theme: readRenderTheme(host) }`, with `view = { viewport, size, dpr }`, then writes `data-rendered-revision = snapshot.revision`.
  - **Name.** The surface's `aria-label` is `useDebounced(graphAccessibleName(viewport, countPlots(rows, displayedGeometry(snapshot, cache))), NAME_DEBOUNCE_MS, { maxWaitMs: NAME_MAX_WAIT_MS })`.
  - **`useDebounced`** returns the first value at once. A later value (compared with `Object.is`) is returned once it has held for `ms`, or `maxWaitMs` after the first change not yet returned, whichever comes first. Without `maxWaitMs` only the first rule applies. Unmounting clears its timers.
  - **CSS.**
    - `.kc-graph`: `position: relative`, full size, `min-block-size: 0`, `overflow: hidden`, `background: var(--kc-paper)`, `touch-action: none`, `user-select: none`.
    - `.kc-graph-layers` and `.kc-graph-canvas`: absolute, `inset: 0`, full size, `pointer-events: none`.
    - `.kc-graph-surface`: absolute, `inset: 4px`, `cursor: grab`. Its `:focus-visible` style is `outline: 2px solid var(--kc-focus-ring)` with `outline-offset: 2px` (TH-14). The 4 px inset keeps that outline inside the clipped panel.
- [ ] **Step 4: Run the tests and watch them pass.** Rerun the Step 2 command. Expected: PASS, 7 tests (2 in `render-rows.test.ts`, 5 in `GraphPanel.test.tsx`).
- [ ] **Step 5: Commit.** `git add src/components/calculator-v2/ui/graph src/components/calculator-v2/styles/graph.css && git commit -m "Add calculator v2 GraphPanel sizing, render loop and name (G-5, A11Y-1)"`

### Task 7: Controls, Home fade, graph keys and pointer input (G-5, AN-8, KB-8)

**Files:** Create `src/components/calculator-v2/ui/graph/labels.ts`, `home-presence.ts` and `use-graph-input.ts`. Modify `GraphPanel.tsx` and `styles/graph.css`. Tests: `ui/graph/home-presence.test.ts` (jsdom), plus new tests in `GraphPanel.test.tsx`.

**Interfaces.** Consumes:

- Tasks 1 and 6.
- 06: `Viewport`, `ViewSpec`, `ZOOM_BUTTON_FACTOR`, `zoomViewport`, `defaultViewport`, `isDefaultViewport`.
- `lucide-react` (TH-18): `Settings`, `Plus`, `Minus`, `House`.
- 05 (`styles/tokens.css`): `--kc-duration-instant`, `--kc-ease-standard`.

Produces:

```ts
// labels.ts
export const GRAPH_CONTROL_LABELS = {
  group: "Graph controls",
  settings: "Graph settings",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  home: "Home",
} as const;
// home-presence.ts
export type HomePhase = "absent" | "entering" | "present" | "leaving";
export function useHomePresence(show: boolean, fadeMs: () => number): HomePhase;
export function homeFadeMs(reducedMotion: boolean, element: Element | null): number;
// use-graph-input.ts
type Ref = React.RefObject<HTMLElement | null>;
export type GraphInputOptions = {
  panel: Ref;
  surface: Ref;
  engine: CalculatorEngine;
  size: GraphSize | null;
};
export type ApplyNow = (next: (view: ViewSpec) => Viewport | null) => boolean; // Step 3
export type GraphInput = { onKeyDown(e: React.KeyboardEvent): void; applyNow: ApplyNow };
export function useGraphInput(o: GraphInputOptions): GraphInput;
// GraphPanel.tsx, not exported
type HomeButtonProps = { phase: HomePhase; homeRef: Ref; surface: Ref; onActivate(): void };
```

- [ ] **Step 1: Write the failing tests.**

  **`home-presence.test.ts`** uses Task 6's fake timers. `frames(n)` advances `n` animation frames inside `act`.
  - `it("AN-8 Home enters, fades in over two frames, fades out for the fade time and leaves")`: `renderHook` of `useHomePresence(show, () => 100)` gives these phases, in order:
    1. Mounted with `show` false: `"absent"`.
    2. `show` true: `"entering"`.
    3. After `frames(2)`: `"present"`.
    4. `show` false: `"leaving"`.
    5. After 99 ms: still `"leaving"`.
    6. After 1 more ms: `"absent"`.
    7. `show` true, then `frames(2)`, then false, then true: `"present"`.
  - `it("AN-8 with no fade time Home appears and disappears at once")`: with `() => 0`, `show` true gives `"present"` at once and `show` false gives `"absent"` at once.
  - `it("AN-8 homeFadeMs reads the opacity transition and is 0 under reduced motion")`, with `getComputedStyle` mocked:
    - `"background-color, opacity"` with `"0.1s, 0.1s"`: 100 for `homeFadeMs(false, el)` and 0 for `homeFadeMs(true, el)`.
    - `"opacity"` with `"250ms"`: 250.
    - `"opacity"` with `"0s"`: 0.
    - `homeFadeMs(false, null)`: 0.

  **Additions to `GraphPanel.test.tsx`.**
  - `it("G-5 graph controls: Zoom in and out by 2 about the centre, Home restores the default")`, with `mountSized({ settingsOpen: true, onOpenSettings })`:
    1. The "Graph controls" group's button `aria-label`s are `["Graph settings", "Zoom in", "Zoom out"]`.
    2. "Graph settings" has `aria-expanded="true"`, and clicking it calls `onOpenSettings` with that button.
    3. Zoom in gives exactly `vp(-5, 5, -3.75, 3.75)`.
    4. Zoom out twice gives `vp(-20, 20, -15, 15)`.
    5. After `setMathBounds(P)`, Zoom in gives `vp(-3, 7, -3.75, 3.75)`.
    6. "Home" gives `DEFAULT`.
  - `it("AN-8 Home shows only off the default view and hands focus to the graph as it leaves")`, with `mountSized({ reducedMotion: true })`:
    1. There is no "Home" button.
    2. `keyDown` ArrowRight on the graph makes it appear.
    3. Focusing and clicking it removes it, and `document.activeElement` is then `getByRole("img")`.
    4. After another ArrowRight, focus "Home" and call `engine.setMathBounds(DEFAULT)` inside `act`. The button is gone, and `document.activeElement` is `getByRole("img")`.
  - `it("KB-8 the graph surface is the panel's one focusable graph element and handles the graph keys")`, with `mountSized()`:
    1. The graph has `tabindex="0"`, and `[data-graph-panel] [tabindex]:not(button)` has length 1.
    2. A `createEvent.keyDown` ArrowRight is `defaultPrevented` and gives `P`.
    3. `{ key: "=", ctrlKey: true }` is not prevented, and `left` stays −8.
    4. `"Home"` is prevented and gives `DEFAULT`.
  - `it("G-5 unmounting GraphPanel destroys the renderer and leaves no timer or frame")`:
    1. `mountSized()`, `setMathBounds(P)`, then `unmount()`.
    2. `GraphRenderer.prototype.destroy` was called once.
    3. After `engine.destroy()`, `vi.getTimerCount()` is 0.
  - `it("G-5 wheel events within one frame accumulate")`, with `mountSized()`, `panel` the `[data-graph-panel]` element and `WHEEL = { deltaY: -100, deltaMode: 0, clientX: 400, clientY: 300 }` (jsdom's `getBoundingClientRect` is all zeros, so that is the view centre): inside one `act`, with no frame advanced between them, `fireEvent.wheel(panel, WHEEL)` twice returns `false` (prevented) both times and the viewport is still `DEFAULT`. After one frame, with `k = Math.exp(0.4)`, the viewport is `vp(-10 / k, 10 / k, -7.5 / k, 7.5 / k)`, so its span is `20 / Math.exp(0.4)`.
  - `it("G-5 a graph key while a wheel frame is pending keeps both changes")`, with `mountSized()` and the same `panel` and `WHEEL`: `fireEvent.wheel(panel, WHEEL)` once, with no frame advanced, then `keyDown` ArrowRight on the graph. With `k = Math.exp(0.2)`, the viewport is at once `vp(-8 / k, 12 / k, -7.5 / k, 7.5 / k)`: the wheel zoom, then a pan by 10% of the zoomed width. After one more frame it is unchanged, because the key cancelled the pending frame.

- [ ] **Step 2: Run the tests and watch them fail.** Run `npx vitest run src/components/calculator-v2/ui/graph/home-presence.test.ts src/components/calculator-v2/ui/graph/GraphPanel.test.tsx`. Expected: FAIL with `Failed to resolve import "./home-presence"` and `Unable to find an accessible element with the role "group"`.
- [ ] **Step 3: Implement `labels.ts`, `home-presence.ts`, `use-graph-input.ts`, the controls and the CSS.**
  - **`useHomePresence`.**
    - It starts at `"present"` or `"absent"`, with no fade on mount.
    - When `show` turns true it is `"entering"` for two animation frames (the first lets opacity 0 resolve), then `"present"`.
    - When `show` turns false it is `"leaving"` for a `setTimeout` of `fadeMs()`, then `"absent"`. If `fadeMs()` is 0 it jumps straight to the end state.
    - `show` turning true while `"leaving"` cancels the timer and returns straight to `"present"`: the element is still mounted, so the CSS opacity transition reverses. `show` turning false while `"entering"` cancels the frames and goes to `"leaving"`, or to `"absent"` when `fadeMs()` is 0.
  - **`homeFadeMs`.** It returns 0 when `reducedMotion` is true or there is no element. Otherwise it returns the duration, in s or ms, at the index of `opacity` (or `all`) in the computed `transitionProperty`. Anything it cannot parse gives 0.
  - **Controls.** A `div.kc-graph-controls` with `role="group"` and the `aria-label` `GRAPH_CONTROL_LABELS.group` holds `type="button"` buttons. Each button has an `aria-label` and `title` from `GRAPH_CONTROL_LABELS` and a lucide icon (`size={18}`, `aria-hidden`).
    - **Settings:** `aria-haspopup="dialog"` and `aria-expanded={settingsOpen}`. A click calls `onOpenSettings(e.currentTarget)`.
    - **Zoom in and Zoom out:** `input.applyNow((v) => zoomViewport(v.viewport, ZOOM_BUTTON_FACTOR or 1 / ZOOM_BUTTON_FACTOR, centre))`, where `input` is `useGraphInput`'s result and `centre` is Task 1's `{ x: (left + right) / 2, y: (bottom + top) / 2 }` of `v.viewport`. While the size is unknown `applyNow` returns `false` without acting, so the buttons do nothing.
    - **Home.** `GraphPanel` calls `const phase = useHomePresence(!isDefaultViewport(v, size), () => homeFadeMs(reducedMotion, homeRef.current))` and, while `phase` is not `"absent"`, renders `HomeButton` (`HomeButtonProps` above), a component of its own in `GraphPanel.tsx`. The button has `data-graph-home` and `data-phase={phase}`; while `"leaving"` it has `tabIndex={-1}` and `aria-hidden="true"`. Its click handler calls `onActivate()`, which `GraphPanel` supplies: `surface.current?.focus({ preventScroll: true })` first, then `input.applyNow((v) => defaultViewport(v.size))`, which calls `setMathBounds(defaultViewport(size))`.
    - `handOff(el)` calls `surface.focus({ preventScroll: true })` when `(el.getRootNode() as Document | ShadowRoot).activeElement === el`. One `useLayoutEffect` on the phase calls `handOff(homeRef.current)` when the phase becomes `"leaving"`. A second, with no dependencies, captures `homeRef.current` and calls `handOff` with it in its cleanup. React runs a deleted component's layout cleanups before it removes the node, so that check still sees the button focused when the API returns the view to the default.
  - **`useGraphInput`.**
    - It adds native listeners on `panel`: `pointerdown`, `pointermove`, `pointerup`, `pointercancel` and `lostpointercapture`, and `wheel` with `passive: false`. While `o.size` is `null`, every handler returns without acting or calling `preventDefault`.
    - **Pending viewport.** Refs hold `pending: Viewport | null`, the viewport the scheduled frame will apply, and that frame's id. `base()` is `pending ?? engine.getSnapshot().viewport`, and the current view is `{ viewport: base(), ...o.size }`. `schedule(v)` sets `pending = v` and requests one `requestAnimationFrame` if none is pending; the frame calls `engine.setMathBounds(pending)` and clears both refs.
    - `pointerdown` ignores targets inside `.kc-graph-controls` and mouse buttons other than 0. It calls `surface.focus({ preventScroll: true })` and `setPointerCapture` inside `try` (synthetic pointers throw), and sets `surface.dataset.dragging = ""`. `pointerup`, `pointercancel` and `lostpointercapture` delete `dataset.dragging` once no pointer remains. Positions are relative to `panel.getBoundingClientRect()`, and the hook keeps each active pointer's last position.
    - **Drag and pinch.** One pointer stores the current view and its position at `pointerdown`; each `pointermove` schedules `dragViewport(start, dx, dy)` from them. A second pointer stores the current view (so a pending drag frame is included) and the `PinchState` of both pointers; each move schedules `pinchViewport(start, from, now)`. When one pointer remains, a new drag starts from the current view (so the pinch's pending frame is included) at that pointer.
    - **Wheel.** `wheel` calls `preventDefault`, then schedules `wheelViewport(current view, deltaY, deltaMode, position)`. Each event reads the pending viewport, so several wheel events in one frame accumulate.
    - **`applyNow(next)`** returns `false` while the size is unknown or when `next(current view)` is `null`. Otherwise it cancels the pending frame, clears `pending`, calls `engine.setMathBounds` with the result synchronously, re-anchors an active drag or pinch on the new view at the pointers' last positions (so the next move continues from it instead of overwriting it), and returns `true`. `onKeyDown` calls `applyNow((v) => viewportForKey(e.nativeEvent, v))`, and calls `preventDefault()` only when that returns `true`.
    - Cleanup removes the listeners and cancels the frame.
  - **CSS.**
    - `.kc-graph-controls` is absolute, 8 px from the top and the inline end, with a column flex and a 4 px gap.
    - Buttons are 32×32 px (44×44 under `@media (pointer: coarse)`): a centring grid, no padding, `1px solid var(--kc-boundary)`, a 6 px radius, `var(--kc-chrome)` background and `var(--kc-text)` colour.
    - Buttons transition `background-color` over `var(--kc-duration-instant)` with `var(--kc-ease-standard)`. `:active` uses `var(--kc-key-operator)` (AN-11). `:focus-visible` gets a 2 px solid `var(--kc-focus-ring)` outline at a 2 px offset.
    - `[data-graph-home]` also transitions `opacity` with the same duration and easing.
    - `[data-phase="entering"]` and `[data-phase="leaving"]` set `opacity: 0`; the leaving phase also sets `pointer-events: none`.
    - `.kc-graph-surface[data-dragging]` sets `cursor: grabbing`.
- [ ] **Step 4: Run the tests and watch them pass.** Rerun the Step 2 command. Expected: PASS for the 9 new tests (3 in `home-presence.test.ts`, 6 in `GraphPanel.test.tsx`) and Task 6's 5 `GraphPanel.test.tsx` tests.
- [ ] **Step 5: Commit.** `git add src/components/calculator-v2/ui/graph src/components/calculator-v2/styles/graph.css && git commit -m "Add calculator v2 graph controls, Home fade, keys and pointer input (G-5, AN-8, KB-8)"`

### Task 8: Graph harness page and browser tests (G-5, KB-8, AN-8, A11Y-1)

**Files:** Create `tests/calculator/fixture/v2/graph.html` and `graph.tsx`. Test: `tests/calculator/v2/graph.spec.ts`.

**Interfaces.** Consumes:

- 07: `mountHarness` (`./harness-kit`), `EngineContext`, `globalThis.__calculatorHarness`.
- `GraphPanel` (Task 6).
- 03: `SKIN_IDS`, `SkinId`.
- 06: `pxToWorld`, `Viewport`.
- `@/components/calculator-v2/styles/tokens.css?inline` (05) and `graph.css?inline`. The Vite fixture server's `@` alias (`tests/calculator/fixture/server.mjs`, `@` to `src`) resolves the harness imports; Playwright resolves `@/` in `graph.spec.ts` through tsconfig `paths`.

Produces `/v2/graph.html?skin=<SkinId>&rows=<url-encoded JSON string[]>&w=<px>&h=<px>`. The `w` and `h` parameters (default 800×600) are part of 01 section 10's query.

- [ ] **Step 1: Write the failing browser tests.**

  **Helpers in `graph.spec.ts`.**
  - `test.beforeEach` collects console errors and `pageerror`s, and `test.afterEach` expects none.
  - `sizeFor(isMobile)` is 360×270 on mobile and 800×600 otherwise. Both are 4:3, so every viewport and name below holds on all five projects; `s = w / 800`.
  - `openGraph(page, isMobile, { rows, skin, plots })` opens `/v2/graph.html` with that skin, rows and `sizeFor(isMobile)`, and returns `{ w, h }` once `data-rendered-revision` equals the snapshot revision, `geometry.size === plots`, and every row has a value or an error. Its `expect.poll` reads `globalThis.__calculatorHarness?.engine` and `document.getElementById("root")?.shadowRoot?.querySelector("[data-graph-layers]")` with optional chaining, so before the harness exists it keeps polling instead of throwing. Page code that runs after `openGraph` reaches the panel through `document.getElementById("root")!.shadowRoot!`, because `mountHarness` renders into a shadow root on `#root` (01-interfaces-integration.md section 16); a plain `document.querySelector` finds nothing inside it.
  - `viewport(page)` reads the snapshot viewport, which each check below compares with `vp(…)` to 9 digits. `graph(page)` is `page.getByRole("img", { name: /^Graph from/ })`. `layersBox(page)` is the layers' client rect, with centre `(cx, cy)`.
  - `touch(page, type, id, x, y)` dispatches `{ pointerId: id, pointerType: "touch", isPrimary: id === 1, clientX: x, clientY: y, button: 0 }` on `graph(page)`.
  - `drag(page, isMobile, dx, dy)` drags from `(cx, cy)` to `(cx + dx, cy + dy)`. On desktop it uses `page.mouse`: move to the start, down, a 5-step move, up. On mobile it uses `touch` with id 1: `pointerdown` at the start, one `pointermove` to the end, `pointerup` there.

  The tests run on all five projects unless noted:
  - `test("G-5 the default view is x -10 to 10, y centred on 0 with equal units")`: the viewport is `DEFAULT`, `|(r−l)/w − (t−b)/h| < 1e-12`, and there is no "Home" button.
  - `test("G-5 Zoom in and Zoom out zoom about the view centre by 2 per press, instantly")`. Read each viewport straight after its click, with no polling:
    1. Zoom in gives `vp(-5, 5, -3.75, 3.75)`.
    2. Zoom out twice gives `vp(-20, 20, -15, 15)`.
    3. Focus the graph and press ArrowRight; Zoom in then gives `vp(-6, 14, -7.5, 7.5)`.
  - `test("G-5 Home restores the default view by button and by key")`:
    1. Focus the graph, press ArrowUp, click Zoom in, then click the "Home" button: the viewport is `DEFAULT`.
    2. Press ArrowRight, then the Home key on the graph: the viewport is `DEFAULT`, with equal units.
  - `test("G-5 dragging pans the view with the pointer")`: `drag(page, isMobile, 80 * s, -60 * s)`. `expect.poll` gives `vp(-12, 8, -9, 6)`.
  - `test("G-5 the wheel zooms about the pointer")`, with `test.skip(isMobile, "wheel input needs a mouse")`:
    1. Move the mouse to `(left + 0.75w, top + 0.25h)` and record the world point under it.
    2. Call `page.mouse.wheel(0, -100)`.
    3. Poll until the span is below 20 and at least `20/Math.exp(0.2) − 1e-9`, and the recorded point is still under the pointer within `1e-9·span`.
  - `test("G-5 a two-finger pinch zooms about the midpoint")`: touch ids 1 and 2 go down at `(cx ∓ 50s, cy)`, move one at a time to `(cx ∓ 100s, cy)`, then lift. Poll for `vp(-5, 5, -3.75, 3.75)`.
  - `test("KB-8 the graph is one tab stop and its keys pan, zoom and reset while its name follows")`, with rows `["y=x", "y=x^{2}"]` and `plots: 2`:
    1. `page.evaluate` registers `document.addEventListener("keydown", fn)` (bubble phase, not capture: in capture phase `defaultPrevented` is always false), and `fn` records `e.defaultPrevented` for the eight graph keys: ArrowRight, ArrowUp, ArrowLeft, ArrowDown, `+`, `=`, `-` and Home.
    2. Focus the graph, then send each key below (`keyboard.press` for named keys, `keyboard.type` for characters). Within `{ timeout: 500 }`, the `aria-label` becomes `"Graph from <bounds>, 2 plots"`:
       - ArrowRight: `x=-8 to 12, y=-7.5 to 7.5`
       - ArrowUp: `x=-8 to 12, y=-6 to 9`
       - ArrowLeft: `x=-10 to 10, y=-6 to 9`
       - ArrowDown: `x=-10 to 10, y=-7.5 to 7.5`
       - `+`: `x=-8 to 8, y=-6 to 6`
       - `=`: `x=-6.4 to 6.4, y=-4.8 to 4.8`
       - `-`: `x=-8 to 8, y=-6 to 6`
       - Home: `x=-10 to 10, y=-7.5 to 7.5`
    3. All eight recorded values are `true`.
    4. `Control+Equal` leaves the viewport at `DEFAULT`.
    5. After Tab, the shadow root's `activeElement` is not the `role="img"` surface; after Shift+Tab it is.
    6. `[data-graph-panel] [tabindex]:not(button)` has count 1.
  - `test("AN-8 the Home button fades in over 100 ms and out over 100 ms")`:
    1. Start an in-page `requestAnimationFrame` sampler that records `{ t, opacity | null }` for 800 ms, reading the button on every frame as `document.getElementById("root")!.shadowRoot!.querySelector("[data-graph-home]")` (`null` gives `opacity: null`), then focus the graph and press ArrowRight.
    2. Once the button exists, its computed transition lists `opacity` with `0.1s` and `cubic-bezier(0.22, 1, 0.36, 1)`.
    3. The first present sample has opacity below 1; at least one sample is strictly between 0 and 1; opacity reaches `"1"` within 400 ms of the first present sample.
    4. Restart the sampler and press the Home key: at least one sample is strictly between 0 and 1; the button is gone within 400 ms; the "Home" button count is 0.
  - `test("A11Y-1 the graph's name gives the bounds and plot count and follows pan, zoom, Home and row changes within 500 ms")`, with rows `["y=x", "y=x^{2}"]` and `plots: 2`. There is exactly one `role="img"`, named `"Graph from x=-10 to 10, y=-7.5 to 7.5, 2 plots"`. Each step below reaches its name within `{ timeout: 500 }`:
    1. Zoom in: `"Graph from x=-5 to 5, y=-3.75 to 3.75, 2 plots"`.
    2. The "Home" button, then `drag(page, isMobile, 80 * s, -60 * s)`: `"Graph from x=-12 to 8, y=-9 to 6, 2 plots"`.
    3. The "Home" button: the default name.
    4. `engine.setExpression({ id: "3", latex: "x=3" })`: the name ends `", 3 plots"`.
    5. `engine.setExpression({ id: "4", latex: "(2,3)" })`: it ends `", 4 plots"`.
    6. `engine.setExpression({ id: "5", latex: "f(x)=x^{2}" })`: it ends `", 5 plots"` (a one-parameter definition draws its curve).
    7. `engine.setExpression({ id: "6", latex: "2+3" })`: it still ends `", 5 plots"`.
    8. `engine.setRowHidden("1", true)`: it ends `", 4 plots"`.

- [ ] **Step 2: Run the tests and watch them fail.** Run `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2/graph.spec.ts`. Expected: FAIL in `openGraph`, which times out waiting for `[data-rendered-revision]`: `/v2/graph.html` does not exist yet, Vite's SPA fallback serves the v1 fixture, and `openGraph`'s poll reads `globalThis.__calculatorHarness?.engine` and the shadow root with optional chaining, so it never throws and only times out.
- [ ] **Step 3: Create the harness.**
  - `graph.html` copies `tests/calculator/fixture/index.html`, with the title `Calculator v2 graph harness` and a module script for `./graph.tsx`.
  - `graph.tsx`:
    1. Reads `skin` (`"ivory"` unless it is in `SKIN_IDS`), `rows` (default `[]`), and `w` and `h` (default 800 and 600).
    2. Sets `#root` to `display: block` at `w`×`h` px.
    3. Calls `mountHarness({ root, css: [tokensCss, graphCss], skin, render })`. `render` returns `GraphPanel` inside `<EngineContext.Provider value={engine}>`, wrapped in a `w`×`h` `div`, with `host={root}`, `themeRevision={0}`, `reducedMotion={false}`, `settingsOpen={false}` and a no-op `onOpenSettings`.
    4. If `rows` is non-empty, calls `engine.setExpressions(rows.map((latex, i) => ({ id: String(i + 1), latex })))`.
- [ ] **Step 4: Run the tests and watch them pass.** Rerun the Step 2 command, then run `npm run test:calculator -- tests/calculator/v2/graph.spec.ts` on all five projects. Expected: PASS, with the wheel test skipped on `calculator-android` and `calculator-ios`.
- [ ] **Step 5: Commit.** `git add tests/calculator/fixture/v2/graph.html tests/calculator/fixture/v2/graph.tsx tests/calculator/v2/graph.spec.ts && git commit -m "Add the calculator v2 graph harness and browser tests (G-5, KB-8, AN-8, A11Y-1)"`

### Task 9: Canvas pixel checks in all 12 skins (G-1, G-7, G-17, TH-8 contributions)

**Files:** Create `tests/calculator/v2/graph-pixels.ts`. Test: `tests/calculator/v2/graph.spec.ts` (extend). The helpers live in `graph-pixels.ts` so `graph.spec.ts` stays under 700 lines; it is not a spec, so Playwright and the ID checker skip it.

**Interfaces.** Consumes Task 8's helpers; `SKIN_IDS`, `SKIN_COLORS`, `resolveRowColor`, `compositeShading` and `contrastRatio` (03); `worldToPx` (06); and `LAYER_ORDER` (Task 5). Produces `graph-pixels.ts`, which exports these helpers; all but `px` take the Playwright `Page` first. Each runs in the page and scales CSS coordinates by `canvas.width / layersBox.width`.

- `pixel(page, layer | "composite", x, y)` returns `"#rrggbb"` or `"transparent"`. For `"composite"` it paints `--kc-paper`, then draws the layers in `LAYER_ORDER`.
- `inkRow(page, yCss, hex, tol)` returns one boolean per CSS column. A column is true when some composite pixel within ±1 CSS px of `yCss` is within RGB distance `tol` of `hex`.
- `inkCentroid(page, [x, y], radius, hex, tol)` returns the centroid of the matching pixels within `radius` of `(x, y)`.
- `layerColors(page, layer)` returns `{ opaque, partial }`: the layer's unique opaque colours, and how many pixels have `0 < alpha < 255`.
- `px(x, y, w, h)` is `worldToPx` for `DEFAULT` at `w`×`h`.

Every test calls `test.setTimeout(180_000)` and loops with `for (const skin of SKIN_IDS) await openGraph(page, isMobile, { rows, skin, plots })`. Inside the loop, `c1 = resolveRowColor("c1", skin).hex`. Each assertion passes `skin` as its message.

- [ ] **Step 1: Write the failing tests.**
  - `test("G-1 strict inequality boundary is dashed and non-strict solid on canvas")`. Read `inkRow(page, px(0, 1, w, h)[1], c1, 48)` over columns 8 to `w − 8`.
    - For the row `"y<1"`, the inked share is between 0.45 and 0.85, with at least `w / 40` ink edges.
    - For the row `"y\\le1"`, the inked share is at least 0.97.
  - `test("G-7 a point paints within 0.5 px")`:
    - For the row `"(2,3)"`, `inkCentroid(page, px(2, 3, w, h), 8, c1, 60)` lies within 0.5 px of `px(2, 3, w, h)`.
    - For the row `"(2,\\sqrt{-1})"` with `plots: 0`, `layerColors(page, "points").opaque` is `[]`.
  - `test("G-17 overlap of two regions has higher contrast than either and curves stay ≥4.5:1 over shading")`, with rows `["y>0", "x>0", "y=x"]` and `plots: 3`:
    1. Read the composite at A `(-5.75, 2.25)`, B `(5.75, -2.25)`, AB `(5.75, 2.25)` and the paper point `(-5.75, -2.25)`.
    2. With `cr(p) = contrastRatio(p, paper)`, check `cr(AB) > cr(A)` and `cr(AB) > cr(B)`.
    3. Let `c3 = resolveRowColor("c3", skin).hex`. Among the 3×3 composite pixels around `px(3.25, 3.25, w, h)`, the one nearest `c3` is within RGB distance 8 of it, and `contrastRatio(c3, AB) ≥ 4.5`.
  - `test("TH-8 combined canvas shading never exceeds 1.3:1 in all 12 skins")`, with rows `["y>0", "x>0", "y>x", "y>-x"]` and `plots: 4`:
    1. `paper = SKIN_COLORS[skin].normal.roles.paper`, and the fills come from `resolveRowColor` for `"c1"` to `"c4"`.
    2. `allowed` is `compositeShading(paper, fills of S in row order)` for each of the 15 non-empty subsets S.
    3. On the `shading` layer, `partial` is 0.
    4. Every opaque colour is in `allowed`, with `contrastRatio(colour, paper) ≤ 1.3 + 1e-9`.
    5. The four-fill colour is among them.
- [ ] **Step 2: Run the tests.** Run `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/graph.spec.ts -g "G-1|G-7|G-17|TH-8"`. Expected: PASS on the first run, because Tasks 4 to 7 already draw what these tests read. A failure is a defect in those tasks: fix it in the owning render file within this task, and never loosen a bound.
- [ ] **Step 3: Run this package's wave 3 checks.** Run:
  - `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2/graph.spec.ts`
  - `npx vitest run src/lib/calculator-v2/render src/components/calculator-v2/ui/graph`
  - `npx tsx scripts/calculator-v2/check-spec-ids.mjs --ids G-5,KB-8,AN-8,A11Y-1`

  Expected: all PASS, and the ID check lists no missing ID.

- [ ] **Step 4: Commit.** `git add tests/calculator/v2/graph.spec.ts tests/calculator/v2/graph-pixels.ts && git commit -m "Check calculator v2 canvas pixels in all 12 skins (G-1, G-7, G-17, TH-8)"`
