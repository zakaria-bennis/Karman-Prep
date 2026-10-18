# 06 plot: viewport, explicit and implicit sampling, regions, lines, points and axis ticks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/lib/calculator-v2/plot/` turns a `PlotInput` and a `ViewSpec` into transferable `Geometry` meeting G-1,
G-7 to G-13, G-15 to G-17 and G-23, plus the viewport arithmetic and axis ticks that 07-engine-worker and 08-graph use.

**Architecture:** Pure TypeScript, no DOM, run unchanged in the worker and the main-thread executor (AR-44). Explicit curves and lines sample
the independent axis every half pixel, bisect at poles, domain edges and extrema, and fall back to per-column bands for unresolvable oscillation
or an exhausted budget. Implicit curves and regions share a pixel-centre lattice: a coarse pass, a quadtree halving cells to 1 px only where a
relation changes sign or nears zero, marching squares for curves and per-pixel truth for shading.

**Package:** key `plot`, increment 1A, wave 1, after 02-parser. Global Constraints and Review Focus: `00-index.md`; contracts: `01-interfaces.md`
section 5; spec: `a-math-semantics.md` sections 1 and 5. **IDs:** G-1, G-7 to G-13, G-15 to G-17, G-23 (by task: 1 G-7, G-15, G-23; 2 G-9 to
G-13; 3 G-12, G-15; 4 G-7, G-8; 5 G-15, G-16; 6 G-1, G-17; 7 G-1, G-11, G-15, G-23). **Open items:** none. **Owns:**
`src/lib/calculator-v2/plot/` (written `plot/` below) except `from-analysis.ts`, `from-analysis.test.ts` and `golden.test.ts` (07).

## Package rules

- Wave 1 has no evaluator: tests use plain closures. Imports are relative; no `window`, `document`, React, `eval`, `new Function` or string
  timers (AR-44). World means math units; px means CSS px of `view.size`, origin top-left; sampling ignores `view.dpr`. Tests use 800×600 px,
  dpr 1 and the default view (40 px per unit) unless named.
- An evaluation is one call of an input closure (`f`, `F` or one region term), counted in `Geometry.evaluations`; explicit curves and lines
  spend `EXPLICIT_BUDGET`, implicit curves and regions `IMPLICIT_BUDGET`. Typed arrays come from `Float64Array.from`/`Float32Array.from`.
  `geometry.ts` exports `type RealFn1 = (t: number) => number` and `type RealFn2 = (x: number, y: number) => number`; signatures absent from
  `01-interfaces.md` are package-internal.
- Test snippets omit imports: vitest's `describe`/`it`/`expect`/`vi`; `NO_DEADLINE`, `DeadlineExceeded` from `../core/deadline`; `InequalityOp`
  from `../core/latex/ast`; fixtures from `./__fixtures__/measure`; other names from the module whose Interfaces declare them. Commands run from
  the worktree root under Node 22 and carry the `n exec 22` prefix; Step 4 reruns Step 2's command unless it names another. A missing module
  fails with `Failed to resolve import "./<module>"`; where a test imports two missing modules, its Step 2 states which it imports first.
- Contributions (`00-index.md` 5.3): Task 1's G-5, NM-8 and AR-45 tests are this package's contributions to 08, to 04 and to 07. 08-graph
  contributes the G-1, G-7, G-8 and G-17 drawing cases; G-8's "span the whole view" clause is 08's
  `it("G-8 a line set strokes the full view height or width at its position")` in `render/draw-geometry.test.ts` (a vertical `LineSetGeometry`
  at x = 3 in the 800×600 default view strokes (520, 0) to (520, 600)), as `LineSetGeometry` carries positions only. Review Focus item 4 is
  Task 7 ("Viewport limits").

<!-- prettier-ignore-start -->
### Task 1: Viewport, axis ticks, geometry and evaluation budget

**Files:** Create `src/lib/calculator-v2/plot/{viewport,ticks,geometry,budget}.ts`; Test `plot/{viewport,ticks,geometry,budget}.test.ts`.
**Interfaces:** Consumes `Deadline` (02). Produces the `viewport.ts`, `ticks.ts` and `geometry.ts` blocks of `01-interfaces.md`
section 5 verbatim, plus `type RealFn1` and `type RealFn2` in `geometry.ts`, and in `budget.ts` `EXPLICIT_BUDGET = 20_000`,
`IMPLICIT_BUDGET = 250_000` (section 5's `budget.ts` block, re-exported by `index.ts`, Task 7),
`DEADLINE_CHECK_EVERY = 1024` and `class EvaluationBudget { constructor(limit: number, deadline: Deadline); readonly limit: number; get used(): number; get remaining(): number; take(n?: number): boolean }`. 08 labels each major tick with `formatAxisLabel(value, step)` (04).

- [ ] **Step 1: Write the failing tests**

```ts
// viewport.test.ts
const SIZE = { width: 800, height: 600 };
const V = defaultViewport(SIZE);
const box = ([left, right, bottom, top]: number[]) => ({ left, right, bottom, top });
const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
const span = (v: Viewport) => [v.right - v.left, v.top - v.bottom];
it("G-7 worldToPx maps (2, 3) to (480, 180) in the default 800×600 view and pxToWorld inverts it", () => {
  const view = { viewport: V, size: SIZE, dpr: 2 };
  expect([...worldToPx(view, 2, 3), ...pxToWorld(view, 480, 180)]).toEqual([480, 180, 2, 3]);
});
it("G-5 the default view is x -10..10 with equal units and a resize keeps units per px", () => {
  expect(V).toEqual(box([-10, 10, -7.5, 7.5]));
  expect(defaultViewport({ width: 0, height: 0 })).toEqual(box([-10, 10, -10, 10]));
  expect(resizeViewport(V, SIZE, { width: 400, height: 600 })).toEqual(box([-5, 5, -7.5, 7.5]));
  expect(resizeViewport(V, SIZE, { width: 0, height: 0 })).toEqual(V);
  expect(isDefaultViewport({ ...V, left: -10 + 1e-12 }, SIZE)).toBe(true);
  expect(isDefaultViewport(panViewport(V, 0.001, 0), SIZE)).toBe(false);
});
it("G-23 zoom scales spans about the anchor, stops at 1e-9·max(1, |centre|) and 1e15, within ±1e15", () => {
  expect(zoomViewport(V, 2, { x: 2, y: 3 })).toEqual(box([-4, 6, -2.25, 5.25]));
  expect(zoomViewport(V, 0, { x: 0, y: 0 })).toEqual(V);
  expect(zoomViewport(V, 2, { x: NaN, y: 0 })).toEqual(V);
  expect(minSpan(0.5)).toBe(1e-9);
  expect(rel(minSpan(-1e14), 1e5)).toBeLessThan(1e-12);
  const v = zoomViewport(V, 1e12, { x: 1, y: 1 });
  const [sx, sy] = span(v);
  expect(rel(sy, minSpan((v.top + v.bottom) / 2)) + rel(sx / sy, 20 / 15)).toBeLessThan(1e-6);
  const [ax, ay] = span(zoomViewport(v, 2, { x: 1, y: 1 }));
  expect(rel(ax, sx) + rel(ay, sy)).toBeLessThan(1e-6);
  const bv = zoomViewport(V, 1e20, { x: 1e6, y: 1e6 }); // |centre| > 1: the limit uses the zoomed centre, about 999,933.34
  expect(rel(span(bv)[1], minSpan((bv.top + bv.bottom) / 2))).toBeLessThan(1e-6);
  const [ox, oy] = span(zoomViewport(V, 1e-20, { x: 0, y: 0 }));
  expect(rel(ox, MAX_SPAN) + rel(oy, 7.5e14)).toBeLessThan(1e-9);
  const edge = panViewport(V, 1e16, -1e16);
  expect([edge.right, edge.bottom]).toEqual([MAX_ABS_BOUND, -MAX_ABS_BOUND]);
  expect(rel(span(edge)[0], 1e6)).toBeLessThan(1e-6);
  const far = zoomViewport(edge, 1e-20, { x: edge.right, y: edge.bottom });
  expect(Math.max(...Object.values(far).map(Math.abs))).toBeLessThanOrEqual(MAX_ABS_BOUND);
  expect(panViewport(V, 3, -2)).toEqual(box([-7, 13, -9.5, 5.5]));
  expect(clampViewport(box([1, 1, 0, 1])).right).toBeGreaterThan(1);
});
// ticks.test.ts
it("NM-8 axisTicks spaces ticks at 1, 2 or 5 × 10^k, at least 80 px apart, from integer indices", () => {
  const x = axisTicks(-10, 10, 800);
  expect(x.major.join()).toBe("-10,-8,-6,-4,-2,0,2,4,6,8,10");
  expect([x.step, x.minor.length, x.minor[0]]).toEqual([2, 30, -9.5]);
  const y = axisTicks(-7.5, 7.5, 600);
  expect(y.major.join()).toBe("-6,-4,-2,0,2,4,6");
  expect([y.step, y.minor.length, y.minor[0]]).toEqual([2, 24, -7.5]);
  const fifth = axisTicks(-1, 1, 800);
  expect([fifth.step, fifth.minor[0]]).toEqual([0.2, -0.95]);
  expect(fifth.major.join()).toBe("-1,-0.8,-0.6,-0.4,-0.2,0,0.2,0.4,0.6,0.8,1");
  const big = axisTicks(0, 50000, 800);
  expect([big.step, big.major[10], big.minor[0]]).toEqual([5000, 50000, 1000]);
  expect(axisTicks(-10, 10.00000000000001, 800).step).toBe(2);
  const bad = [1, 1, 800, 0, 1, 0, NaN, 1, 800];
  for (let k = 0; k < bad.length; k += 3) {
    expect(axisTicks(bad[k], bad[k + 1], bad[k + 2])).toEqual({ step: 0, major: [], minor: [] });
  }
});
// budget.test.ts
it("G-15 EvaluationBudget grants calls up to its limit and checks the deadline every 1,024", () => {
  expect([EXPLICIT_BUDGET, IMPLICIT_BUDGET, DEADLINE_CHECK_EVERY]).toEqual([20_000, 250_000, 1024]);
  const b = new EvaluationBudget(10, NO_DEADLINE);
  expect([b.take(4), b.take(6), b.take(1), b.take()]).toEqual([true, true, false, false]);
  expect([b.used, b.remaining]).toEqual([10, 0]);
  let checks = 0;
  const expire = (): void => {
    if (++checks > 2) throw new DeadlineExceeded("row-1");
  };
  const c = new EvaluationBudget(5000, { check: expire });
  expect(() => Array.from({ length: 5000 }, () => c.take())).toThrow(DeadlineExceeded);
  expect([checks, c.used]).toEqual([3, 3072]);
});
// geometry.test.ts
it("AR-45 geometryTransferables lists each geometry's own buffers once", () => {
  const f64 = (...n: number[]) => Float64Array.from(n);
  const curve = { kind: "curve", polylines: f64(0, 0, 1, 1), bands: f64() } as CurveGeometry;
  const spans = Float32Array.from([0, 1, 0, 800]);
  const region = { kind: "region", spans, boundaries: [curve, curve] } as RegionGeometry;
  const lines = { kind: "lines", positions: f64(2) } as LineSetGeometry;
  const points = { kind: "points", coords: f64(2, 3) } as PointGeometry;
  const same = (g: Geometry, ...want: ArrayBufferLike[]) => {
    const got = geometryTransferables(g);
    expect(got.length === want.length && got.every((b, k) => b === want[k])).toBe(true);
  };
  same(curve, curve.polylines.buffer, curve.bands.buffer);
  same(lines, lines.positions.buffer);
  same(points, points.coords.buffer);
  same(region, spans.buffer, curve.polylines.buffer, curve.bands.buffer);
});
```

- [ ] **Step 2: Run them and see them fail.** `n exec 22 npx vitest run src/lib/calculator-v2/plot/{viewport,ticks,budget,geometry}.test.ts` → FAIL, `Failed to resolve import` for each module.
- [ ] **Step 3: Implement the four modules.**
  - `defaultViewport`: for a positive finite size x −10..10, `top = 10·height/width`, `bottom = −top`; otherwise `box([−10, 10, −10, 10])`. `minSpan(c) = MIN_SPAN_FACTOR·max(1, |c|)`.
  - `clampViewport`, per axis: an axis meeting every limit is returned unchanged; otherwise `s1 = min(hi − lo, MAX_SPAN)`, `c1` = centre clamped
    to `±(MAX_ABS_BOUND − s1/2)`, `s2 = max(s1, minSpan(c1))`, `c2` = `c1` clamped with `s2`, bounds `c2 ± s2/2`; a bound past `±MAX_ABS_BOUND`
    is set to it exactly and the other moved to keep `s2`.
  - `zoomViewport`: a non-finite or non-positive factor or non-finite anchor returns `{ ...v }`. One `f'` serves both axes: a bound b on an
    axis whose anchor coordinate is a moves once to `a + (b − a)/f'`, then the result is clamped. With `sx`, `sy` the current spans, zooming out
    (`factor < 1`) uses `f' = min(1, max(factor, sx/MAX_SPAN, sy/MAX_SPAN))`. Zooming in, `f'` is the largest `f ≤ factor` whose view meets G-23
    at its own post-zoom centre `cx(f) = ax + (Cx − ax)/f` (`(Cx, Cy)` the current centre, `(ax, ay)` the anchor), never at the anchor:
    `sx/f ≥ minSpan(cx(f))` holds exactly when `f ≤ Kx` and `|ax·f + Cx − ax| ≤ Kx` (`Kx = sx/MIN_SPAN_FACTOR`), so `fx = Kx` for `ax = 0`, else
    `fx = min(Kx, 1 + (Kx − sign(ax)·Cx)/|ax|)`; `fy` likewise; `f' = max(1, min(factor, fx, fy))`. This is the fixed point of
    `f ← max(1, min(factor, sx/minSpan(cx(f)), sy/minSpan(cy(f))))` (for 1e20 about (1e6, 1e6) from the default view that iteration goes
    15,000 → 15,001.0, and `fy = 15,001`), computed directly because the iteration oscillates for an anchor far outside the view.
    `panViewport` shifts then clamps; `resizeViewport` keeps centres and scales spans by `to/from` per axis, then clamps; both copy `v` for
    non-finite or non-positive input. `worldToPx` is `[(x − left)/(right − left)·width, (top − y)/(top − bottom)·height]`; `pxToWorld` inverts it. `isDefaultViewport`: each bound within `1e-9 ×` its axis's default span.
  - `axisTicks`: non-finite input, `max ≤ min` or `lengthPx ≤ 0` gives empty ticks with step 0. With `raw = (max − min)·MIN_MAJOR_TICK_PX/lengthPx`
    and `e = floor(log10(raw))`, the step is the smallest `m·10^k` (`m ∈ {1, 2, 5}`, `k ∈ {e−1, e, e+1}`) `≥ raw·(1 − 1e-9)`, written `m·10^k`
    for `k ≥ 0` and `m/10^−k` for `k < 0`. Major `n` runs over `ceil(min/step − 1e-9)` to `floor(max/step + 1e-9)` with value `(n·m)·10^k` or
    `(n·m)/10^−k`, never a running sum. Minor step is `step/5` for `m` 1 and 5, `step/4` for 2, formed the same way, skipping majors.
  - `EvaluationBudget.take(n = 1)` returns false and counts nothing when `used + n > limit`; otherwise it counts and calls `deadline.check()`
    once if `used` crossed a multiple of `DEADLINE_CHECK_EVERY`. `geometryTransferables` returns the buffers of `polylines` then `bands`,
    `positions`, `coords`, or `spans` then each boundary's, deduplicated by identity and cast `as ArrayBuffer` (no `SharedArrayBuffer` exists, AR-45).
- [ ] **Step 4: Run them and see them pass.** PASS, 6 tests.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/plot/{viewport,ticks,geometry,budget}{,.test}.ts && git commit -m "Add calculator v2 plot viewport, axis ticks, geometry and evaluation budget (G-7, G-15, G-23)"`

### Task 2: Explicit sampler: half-pixel grid, poles, domain edges and guard band

**Files:** Create `plot/explicit.ts`, `plot/__fixtures__/measure.ts`; Test `plot/explicit.test.ts`. **Interfaces:** Consumes Task 1. Produces,
in `explicit.ts`: `type ExplicitFrame = Record<"t0" | "t1" | "tPx" | "v0" | "v1" | "vPx", number>` (t runs `t0..t1` over `tPx` px, v runs
`v0..v1` over `vPx` px); `type ExplicitSamples = { polyline: number[]; bands: number[] }` in frame coordinates (`[t, v, …]` with `NaN, NaN`
between runs; bands `[tStart, tEnd, vMin, vMax, …]`); `MAX_COLUMNS = 4096`, `POLE_BISECTIONS = 30`, `EDGE_BISECTIONS = 12`, `GUARD_FRACTION = 0.5`;
`explicitFrame(view: ViewSpec, independent: "x" | "y"): ExplicitFrame`; `sampleExplicit(f: RealFn1, frame: ExplicitFrame, budget: EvaluationBudget): ExplicitSamples`;
`plotExplicit(rowId: string, independent: "x" | "y", f: RealFn1, view: ViewSpec, deadline: Deadline): CurveGeometry`.
In `__fixtures__/measure.ts` (tests only): `type Pt = [number, number]`; `type Skip = (x0: number, x1: number) => boolean`;
`VIEW_800: ViewSpec` (default viewport, 800×600, dpr 1); `SHIFTED: ViewSpec` (`viewOf({ left: -10.003, right: 9.997, bottom: -7.5, top: 7.5 })`, 800×600, dpr 1);
`viewOf(viewport: Viewport, size?: PixelSize): ViewSpec` (dpr 1, 800×600 by default); `at(size: PixelSize): ViewSpec`
(`viewOf(defaultViewport(size), size)`); `UP_TO_1080: ViewSpec[]` (`VIEW_800`, then `at` 1440×900 and 1920×1080);
`runsOf(polylines: Float64Array): Pt[][]` (split at NaN pairs); `segmentsOf(polylines: Float64Array): [Pt, Pt][]`;
`mid(a: Pt, b: Pt): Pt`; `pxDistance(view: ViewSpec, a: Pt, b: Pt): number`; `pointToSegmentPx(view: ViewSpec, p: Pt, a: Pt, b: Pt): number`;
`distanceToGraphPx(view: ViewSpec, f: RealFn1, p: Pt): number` (least px distance from `p` to the polyline through
`(x, f(x))` at 1/256 px steps of x within ±0.75 px of `p`); `expectG11(view: ViewSpec, f: RealFn1, segments: [Pt, Pt][]): void`
(`expect`s each segment's endpoints and midpoint at `distanceToGraphPx ≤ 0.5`); `columnCoverage(view: ViewSpec, g: CurveGeometry, f: RealFn1, skip: Skip): number[]`
(per pixel column `[x0, x1]`: NaN when `skip(x0, x1)`, when a reference sample at `x0 + (k + 0.5)·w/64`, `k < 64`, is
not finite, or when their `[min, max] ∩ [bottom, top]` is empty or a point; else `|hull ∩ ref| / |ref|`, hull being the
y-extent of every polyline segment clipped to `[x0, x1]` and every band overlapping `(x0, x1)`, clipped to the view);
and `counted<A extends unknown[]>(fn: (...a: A) => number): { fn: (...a: A) => number; calls(): number }`.

- [ ] **Step 1: Write the failing test** (write `measure.ts` first, as specified)

```ts
const plot = (f: RealFn1, view = VIEW_800) => plotExplicit("r", "x", f, view, NO_DEADLINE);
// Exact binary samples -8 - 1/128 + j/64; the first pole bisection lands exactly on x = 0 for 1/x and x = 2 for (x^2-1)/(x-2)
const POLE_HIT = viewOf({ left: -8 - 1 / 128, right: 8 - 1 / 128, bottom: -6, top: 6 }, { width: 512, height: 384 });
it("G-9 no segment crosses a pole of tan x, 1/x or (x^2-1)/(x-2), also when a bisection lands on the pole", () => {
  const cases: [RealFn1, RealFn1][] = [
    [Math.tan, (x) => Math.floor((x - Math.PI / 2) / Math.PI)],
    [(x) => 1 / x, Math.sign],
    [(x) => (x * x - 1) / (x - 2), (x) => (x < 2 ? 0 : 1)],
  ];
  for (const view of [VIEW_800, POLE_HIT]) {
    for (const [f, piece] of cases) {
      const segments = segmentsOf(plot(f, view).polylines);
      expect(segments.length).toBeGreaterThan(100);
      for (const [a, b] of segments) expect(piece(a[0])).toBe(piece(b[0]));
    }
  }
});
it("G-10 curves reach their domain endpoints", () => {
  for (const view of [VIEW_800, SHIFTED]) {
    const runs = (f: RealFn1) => runsOf(plot(f, view).polylines);
    const circle = runs((x) => Math.sqrt(1 - x * x));
    expect(circle).toHaveLength(1);
    expect(pxDistance(view, circle[0][0], [-1, 0])).toBeLessThanOrEqual(0.5);
    expect(pxDistance(view, circle[0].at(-1)!, [1, 0])).toBeLessThanOrEqual(0.5);
    expect(pxDistance(view, runs(Math.sqrt)[0][0], [0, 0])).toBeLessThanOrEqual(0.5);
    const moved = runs((x) => Math.sqrt(x - 3) + 2);
    expect(pxDistance(view, moved[0][0], [3, 2])).toBeLessThanOrEqual(0.5);
    const ln = runs(Math.log);
    expect(ln).toHaveLength(1);
    expect(ln[0][0][1]).toBeLessThanOrEqual(view.viewport.bottom);
    expect(ln[0].at(-1)![0]).toBeGreaterThanOrEqual(9.99);
  }
});
it("G-11 vertices and segment midpoints lie within 0.5 px, also after a 1e6 zoom about (1, f(1))", () => {
  const fs: RealFn1[] = [(x) => x * x, (x) => x ** 10, Math.exp, Math.sin, (x) => 1 / x, Math.tan];
  for (const f of fs) {
    const zoomed = viewOf(zoomViewport(VIEW_800.viewport, 1e6, { x: 1, y: f(1) }));
    for (const view of [VIEW_800, zoomed]) expectG11(view, f, segmentsOf(plot(f, view).polylines));
  }
});
it("G-11, G-12 at 1440×900 x^10 and 0.5^x zoomed out ×10 draw their visible parts as curves, not bands", () => {
  const size = { width: 1440, height: 900 };
  const out = viewOf(zoomViewport(defaultViewport(size), 0.1, { x: 0, y: 0 }), size);
  const cases: [RealFn1, ViewSpec, number, number][] = [
    [(x) => x ** 10, at(size), -1.2, 1.2],
    [(x) => 0.5 ** x, out, -5.9, 100],
  ];
  for (const [f, view, lo, hi] of cases) {
    const { bands, polylines } = plot(f, view);
    for (let k = 0; k < bands.length; k += 4) expect(bands[k + 1] < lo || bands[k] > hi).toBe(true);
    const inside = segmentsOf(polylines).filter(([a, b]) => a[0] >= lo && b[0] <= hi);
    expect(inside.length).toBeGreaterThan(100);
    expectG11(view, f, inside);
  }
});
it("G-13 removable holes leave no break wider than 1 px and no marker", () => {
  const fs: RealFn1[] = [(x) => (x * x - 1) / (x - 1), (x) => Math.sin(x) / x, (x) => x / x];
  for (const f of fs) {
    for (const view of [VIEW_800, SHIFTED]) {
      const g = plot(f, view);
      expect([g.kind, g.bands.length]).toEqual(["curve", 0]);
      const runs = runsOf(g.polylines);
      const gap = (k: number) => pxDistance(view, runs[k - 1].at(-1)!, runs[k][0]);
      for (let k = 1; k < runs.length; k++) expect(gap(k)).toBeLessThanOrEqual(1);
    }
  }
});
```

- [ ] **Step 2: Run it and see it fail.** `n exec 22 npx vitest run src/lib/calculator-v2/plot/explicit.test.ts` → FAIL, `Failed to resolve import "./explicit"`.
- [ ] **Step 3: Implement `plot/explicit.ts`.** `explicitFrame`: `"x"` gives `{ t0: left, t1: right, tPx: width, v0: bottom, v1: top, vPx: height }`,
      `"y"` gives `{ t0: bottom, t1: top, tPx: height, v0: left, v1: right, vPx: width }`. Keep samples `{ t, v }` (v NaN when `f(t)` is not finite)
      in one t-sorted list, a band flag per column and a set of pole breaks. A pair (samples k and k + 1) belongs to the column containing its open
      interval `(t_k, t_{k+1})`, whose band flag decides it; a sample on a column boundary is a vertex of the pairs on both sides. With
      `vScale = vPx/(v1 − v0)` and `g = GUARD_FRACTION·(v1 − v0)`, a pair is off-view when both values exceed `v1 + g` or both are below `v0 − g`;
      phase 5 never draws one, so no phase evaluates for one. `sampleExplicit` runs:
  1. Grid: `C = max(1, min(ceil(tPx), MAX_COLUMNS, floor((budget.remaining − 1)/2)))` columns of width `w = (t1 − t0)/C`.
     Base: sample `t0 + j·w/2`, `j = 0 … 2C` (`j = 2C` is exactly `t1`).
  2. Poles: in t order, a finite pair that is not off-view is a candidate when `|Δv|·vScale > vPx`, or when `va·vb < 0` and `|Δv|·vScale > 1`.
     Bisect up to `POLE_BISECTIONS` times keeping the half with the larger `|Δv|`. Every bisection midpoint is inserted into the t-sorted sample
     list, so the half not kept stays an ordinary pair. The bisection stops as continuous once the kept pair has `|Δv|·vScale ≤ 1`. A NaN midpoint
     ends the bisection and splits the pair there, and phase 3 treats both mixed pairs as edges. After `POLE_BISECTIONS` bisections without a
     stop, the kept pair is a pole break (never joined) when `|Δv|·vScale > vPx`; otherwise its column becomes a band.
  3. Edges: each adjacent pair with exactly one NaN, in a non-band column, is bisected `EDGE_BISECTIONS` times, keeping the pair still mixed.
  4. Budget: when `budget.take()` refuses, the columns of the item in progress and of that phase's unprocessed items (candidates in phase 2,
     mixed pairs in phase 3, turns in Task 3) become bands and the phase ends; no other changes.
  5. Assembly: a band column with finite samples emits `[tStart, tEnd, max(vMin, v0 − g), min(vMax, v1 + g)]` over its pairs' vertices unless
     that range is empty, and ends any run at its boundaries. Every pair of a non-band column, including one ending on a boundary sample shared
     with a band column, is a segment unless a value is NaN, it is a pole break, or both values are above `v1` or both below `v0`; an endpoint
     beyond the guard moves along its segment to exactly `v0 − g` or `v1 + g`. Segments sharing an unmoved vertex continue a run; otherwise `NaN, NaN` separates runs.
  6. `plotExplicit` uses `new EvaluationBudget(EXPLICIT_BUDGET, deadline)` and maps `(t, v)` to world `(t, v)` for `"x"` and `(v, t)` for `"y"`
     (bands `[t0, t1, vMin, vMax]` or `[vMin, vMax, t0, t1]`); `evaluations = budget.used`; `dashed: false`.
- [ ] **Step 4: Run it and see it pass.** PASS, 5 tests.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/plot/explicit{,.test}.ts src/lib/calculator-v2/plot/__fixtures__/measure.ts && git commit -m "Add the calculator v2 explicit sampler with poles, domain edges and guard band (G-9 to G-13)"`

### Task 3: Oscillation bands, extrema and budget fallback

**Files:** Modify `plot/explicit.ts`; Test `plot/explicit-oscillation.test.ts`. **Interfaces:** Consumes Task 2; adds
`BAND_EXTREMA_PX = 2`, `EXTREMUM_ROUNDS = 5` and `BAND_SAMPLES_PER_COLUMN = 64` to `explicit.ts`; signatures unchanged.

- [ ] **Step 1: Write the failing test**

```ts
const plot = (f: RealFn1) => plotExplicit("r", "x", f, VIEW_800, NO_DEADLINE);
const atZero: Skip = (x0, x1) => x0 <= 0 && 0 <= x1;
const never: Skip = () => false;
const tanPole: Skip = (x0, x1) => Math.floor(x0 / Math.PI - 0.5) !== Math.floor(x1 / Math.PI - 0.5);
const bandsOf = (b: Float64Array) => Array.from({ length: b.length / 4 }, (_, k) => [b[4 * k], b[4 * k + 1]]);
it("G-12 every defined column's drawn extent covers at least 90% of its 64-sample range", () => {
  const cases: [RealFn1, Skip][] = [
    [(x) => Math.sin(100 * x), never],
    [(x) => Math.sin(1 / x), atZero],
    [Math.exp, never],
    [(x) => x ** 10, never],
    [(x) => (x - 0.01) ** 2, never],
    [Math.tan, tanPole],
    [(x) => 1 / x, atZero],
    [(x) => Math.sqrt(1 - x * x), never],
  ];
  for (const [f, skip] of cases) {
    const ratios = columnCoverage(VIEW_800, plot(f), f, skip).filter((r) => !Number.isNaN(r));
    expect(ratios.length).toBeGreaterThan(0);
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(0.9);
  }
});
it("G-12 sin(100x) and sin(1/x) near 0 draw as filled bands, never as a curve", () => {
  const fast = plot((x) => Math.sin(100 * x));
  expect(fast.bands.length / 4).toBeGreaterThanOrEqual(790);
  const slow = plot((x) => Math.sin(1 / x));
  for (const i of [396, 397, 398, 401, 402, 403]) {
    const x0 = -10 + i * 0.025; // the columns with 0.025 <= |x| <= 0.1
    const covers = ([a, b]: number[]) => a <= x0 + 1e-9 && b >= x0 + 0.025 - 1e-9;
    expect(bandsOf(slow.bands).some(covers)).toBe(true);
  }
  for (const g of [fast, slow]) {
    for (const [a, b] of segmentsOf(g.polylines)) {
      const [lo, hi] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
      expect(bandsOf(g.bands).some(([c0, c1]) => lo < c1 && hi > c0)).toBe(false);
    }
  }
});
it("G-15 an exhausted explicit budget falls back to bands built from real samples", () => {
  const f = (x: number) => Math.tan(200 * x);
  const budget = new EvaluationBudget(3000, NO_DEADLINE);
  const out = sampleExplicit(f, explicitFrame(VIEW_800, "x"), budget);
  expect(budget.used).toBeLessThanOrEqual(3000);
  expect(out.bands.length).toBeGreaterThan(0);
  const vertices = runsOf(Float64Array.from(out.polyline)).flat(); // guard lines: v = ±15
  for (const [t, v] of vertices) expect(v === f(t) || Math.abs(v) === 15).toBe(true);
});
```

- [ ] **Step 2: Run it and see it fail.** `n exec 22 npx vitest run src/lib/calculator-v2/plot/explicit-oscillation.test.ts` → FAIL in the two G-12 tests (the coverage test with a `sin(100x)` minimum below 0.9, and the band test with `expected 0 to be greater than or equal to 790`); the G-15 test already passes through Task 2's phase 4.
- [ ] **Step 3: Add three phases to `sampleExplicit`.** A turn is a sample k inside a finite run (no NaN or pole break between neighbours) with `v_k − v_{k−1} > 0` and `v_{k+1} − v_k ≤ 0` (max) or `< 0` and `≥ 0` (min).
  - After phase 2: for consecutive turns p, q of one run with `(t_q − t_p)·tPx/(t1 − t0) < BAND_EXTREMA_PX`, every column meeting `[t_p, t_q]` is a band.
  - After phase 3: each turn in a non-band column whose two pairs are not both off-view gets `EXTREMUM_ROUNDS` rounds; a round samples the midpoints between the turn and its neighbours and moves the turn to the most extreme of the three. Phase 4 applies.
  - Before assembly: with B band columns holding a pair that is not off-view, `n = min(BAND_SAMPLES_PER_COLUMN, floor(remaining/B))`, and each such column i samples `tStart_i + (k + 0.5)·w/n` for `k = 0 … n−1`.
- [ ] **Step 4: Run it and see it pass.** `n exec 22 npx vitest run src/lib/calculator-v2/plot/explicit{,-oscillation}.test.ts` → PASS, 8 tests.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/plot/explicit.ts src/lib/calculator-v2/plot/explicit-oscillation.test.ts && git commit -m "Add calculator v2 oscillation bands, extremum refinement and budget fallback (G-12, G-15)"`

### Task 4: Lines and points

**Files:** Create `plot/lines.ts`, `plot/points.ts`; Test `plot/lines.test.ts`. **Interfaces:** Consumes Task 1 and
`MAX_COLUMNS`. Produces `ROOT_BISECTIONS = 10`, `TOUCH_ROUNDS = 16`, `TOUCH_TOLERANCE = 1e-9` and
`plotLines(rowId: string, orientation: "vertical" | "horizontal", f: RealFn1, view: ViewSpec, deadline: Deadline): LineSetGeometry`
in `lines.ts`, and `plotPoints(rowId: string, points: readonly (readonly number[])[]): PointGeometry` in `points.ts` (`PlotInput`'s `[number, number][]` is assignable to it).

- [ ] **Step 1: Write the failing test**

```ts
const near = (g: Float64Array, want: number[]) =>
  expect(Array.from(g, (p, k) => Math.abs(p - want[k]) * 40 <= 0.5)).toEqual(want.map(() => true));
const v = (f: RealFn1, w = VIEW_800) => plotLines("v", "vertical", f, w, NO_DEADLINE).positions;
const h = (f: RealFn1) => plotLines("h", "horizontal", f, VIEW_800, NO_DEADLINE);
it("G-8 x=c, y=c and one-variable equations give lines within 0.5 px of each root", () => {
  const vertical: [RealFn1, number[]][] = [
    [(x) => x - 3, [3]],
    [(x) => x * x - 4, [-2, 2]],
    [(x) => 2 * x + 3 - 7, [2]],
    [(x) => x - 20, []],
    [Math.tan, [-3, -2, -1, 0, 1, 2, 3].map((k) => k * Math.PI)], // no lines at the poles
  ];
  for (const [f, roots] of vertical) near(v(f), roots);
  near(h((y) => y + 2).positions, [-2]);
  near(h((y) => y * y - 9).positions, [-3, 3]);
  const g = h((y) => y - 5);
  expect([g.kind, g.orientation, g.dashed]).toEqual(["lines", "horizontal", false]);
});
it("G-8 a touching root such as (x-3)^2=0 keeps its line when it falls between samples", () => {
  const touching: [RealFn1, number[]][] = [
    [(x) => (x - 3) ** 2, [3]],
    [(x) => x * x, [0]],
    [(x) => x * x - 6 * x + 9, [3]],
    [(x) => x * x + 1e-6, []], // no real root
  ];
  for (const [f, roots] of touching) near(v(f, SHIFTED), roots); // SHIFTED samples neither 0 nor 3
  near(h((y) => (y - 1 / 3) ** 2).positions, [1 / 3]);
});
it("G-7 a numeric point draws within 0.5 px; a point with an undefined coordinate is not drawn", () => {
  const xy = [2, 3, NaN, 1, 1, Infinity, -4.5, 0.25];
  const pairs = [0, 2, 4, 6].map((k) => xy.slice(k, k + 2));
  const g = plotPoints("p", pairs);
  expect([g.kind, g.evaluations, Array.from(g.coords)]).toEqual(["points", 0, [2, 3, -4.5, 0.25]]);
  const [px, py] = worldToPx(VIEW_800, g.coords[0], g.coords[1]);
  expect(Math.hypot(px - 480, py - 180)).toBeLessThanOrEqual(0.5);
});
```

- [ ] **Step 2: Run it and see it fail.** `n exec 22 npx vitest run src/lib/calculator-v2/plot/lines.test.ts` → FAIL, `Failed to resolve import "./lines"` (the test imports `./lines` before `./points`).
- [ ] **Step 3: Implement.** `plotLines`: t runs `left → right` over the width (vertical) or `bottom → top` over the height (horizontal);
      `C = min(ceil(px), MAX_COLUMNS)`; sample `t0 + j·(t1 − t0)/(2C)`, `j = 0 … 2C`, through `new EvaluationBudget(EXPLICIT_BUDGET, deadline)`.
      Roots: each sample with `v === 0`; each adjacent finite pair with strictly opposite signs, bisected `ROOT_BISECTIONS` times keeping the
      sign change (an exact zero ends it), then one more evaluation at the final midpoint m: the root is m unless `|f(m)| > min(|v_a|, |v_b|)`
      of the original pair (a pole, rejected); and each touching candidate, a sample k whose finite neighbours share its strict sign σ with
      `|v_k| < |v_{k−1}|` and `|v_k| ≤ |v_{k+1}|`. A candidate starts at `p = t_k` with h the sample spacing; each of up to `TOUCH_ROUNDS`
      rounds halves h, evaluates `p − h` and `p + h`, and moves p to the least `σ·f` of the three. Its root is the first evaluated point with
      `σ·f ≤ 0` (a zero or a sign change), else p after the last round when `σ·f(p) ≤ TOUCH_TOLERANCE·max(|v_{k−1}|, |v_{k+1}|)`. A refused
      evaluation skips that bracket or candidate. Positions ascending, `dashed: false`, `evaluations = budget.used`. `plotPoints` keeps, in order, the pairs with both coordinates finite; `evaluations: 0`.
- [ ] **Step 4: Run it and see it pass.** PASS, 3 tests.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/plot/{lines,points,lines.test}.ts && git commit -m "Add calculator v2 one-variable lines with touching roots and points (G-7, G-8)"`

### Task 5: Field sampling and implicit curves

**Files:** Create `plot/field.ts`, `plot/contour.ts`, `plot/implicit.ts`; Test `plot/implicit.test.ts`.
**Interfaces:** Consumes Tasks 1 and 4. Produces:

```ts
// src/lib/calculator-v2/plot/field.ts
export const COARSE_CELL_PX = 4;
export const COARSE_SHARE = 4; // the coarse pass spends at most limit / COARSE_SHARE
export const NEAR_ZERO_FACTOR = 1;
export type NodeEvaluator = (x: number, y: number, out: Float64Array) => void;
export type Square = { readonly i: number; readonly j: number; readonly edge: number }; // top-left node
export interface SampledField {
  readonly width: number; // W = ceil(view.size.width)
  readonly height: number; // H = ceil(view.size.height)
  readonly cell: number; // coarse cell edge in px: COARSE_CELL_PX, doubled as needed
  readonly cellsX: number; // max(1, ceil((W - 1) / cell)); cellsY likewise with H
  readonly cellsY: number;
  readonly count: number; // relations per node
  readonly leaves: readonly Square[]; // active squares of edge 1, all four corners evaluated
  readonly unresolved: readonly Square[]; // active squares the budget left unsplit
  value(i: number, j: number, k: number): number; // NaN if undefined or not evaluated
  pixelValue(i: number, j: number, k: number): number; // the value pixel (i, j) is judged by
}
export type ContourResult = { polylines: number[]; bands: number[] }; // contour.ts, world coords
```

plus, in `field.ts`, `nodeToWorld(view: ViewSpec, i: number, j: number): [number, number]` (pixel centre `(i + 0.5, j + 0.5)`) and
`sampleField(view: ViewSpec, count: number, callsPerNode: number, evaluate: NodeEvaluator, budget: EvaluationBudget): SampledField`;
`contourField(field: SampledField, k: number, view: ViewSpec): ContourResult` in `contour.ts`; and `plotImplicit(rowId: string, F: RealFn2, view: ViewSpec, deadline: Deadline): CurveGeometry` in `implicit.ts`.

- [ ] **Step 1: Write the failing test**

```ts
const circle: RealFn2 = (x, y) => x * x + y * y - 25;
const curve = (F: RealFn2, view = VIEW_800) => plotImplicit("c", F, view, NO_DEADLINE);
const off = (w: ViewSpec, p: Pt) => Math.abs(Math.hypot(p[0], p[1]) - 5) * (w.size.width / 20);
it("G-16 x^2+y^2=25 lies within 0.5 px of the circle and closes, with no band, up to 1920×1080", () => {
  for (const view of UP_TO_1080) {
    const g = curve(circle, view);
    expect(g.bands).toHaveLength(0);
    for (const [a, b] of segmentsOf(g.polylines)) {
      expect(Math.max(off(view, a), off(view, b), off(view, mid(a, b)))).toBeLessThanOrEqual(0.5);
      expect(pxDistance(view, a, b)).toBeLessThanOrEqual(1.5);
    }
    const runs = runsOf(g.polylines);
    expect(runs).toHaveLength(1);
    expect(pxDistance(view, runs[0][0], runs[0].at(-1)!)).toBeLessThanOrEqual(1);
  }
}, 30_000);
it("G-16 xy=6 draws both branches with no connector", () => {
  const segments = segmentsOf(curve((x, y) => x * y - 6).polylines);
  expect(segments.some(([a]) => a[0] > 0) && segments.some(([a]) => a[0] < 0)).toBe(true);
  for (const [a, b] of segments) {
    expect(a[0] * b[0]).toBeGreaterThan(0);
    expect(distanceToGraphPx(VIEW_800, (x) => 6 / x, a)).toBeLessThanOrEqual(0.5);
  }
});
it("G-16 with y=5 the circle and its tangent line both draw and (0, 5) lies on both within 0.5 px", () => {
  const segments = segmentsOf(curve(circle).polylines);
  const gaps = segments.map(([a, b]) => pointToSegmentPx(VIEW_800, [0, 5], a, b));
  expect(Math.min(...gaps)).toBeLessThanOrEqual(0.5);
  const line = plotLines("l", "horizontal", (y) => y - 5, VIEW_800, NO_DEADLINE).positions;
  expect(line).toHaveLength(1);
  expect(Math.abs(line[0] - 5) * 40).toBeLessThanOrEqual(0.5);
});
it("G-15 the coarse pass fits a quarter of the budget and work beyond it falls back to bands", () => {
  const fill: NodeEvaluator = (x, y, out) => void (out[0] = circle(x, y));
  const budget = new EvaluationBudget(IMPLICIT_BUDGET, NO_DEADLINE);
  expect(sampleField(at({ width: 3840, height: 2160 }), 1, 1, fill, budget).cell).toBe(16);
  const dense = curve((x, y) => Math.sin(300 * x) * Math.sin(300 * y));
  expect(dense.evaluations).toBeLessThanOrEqual(IMPLICIT_BUDGET);
  expect(dense.bands.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run it and see it fail.** `n exec 22 npx vitest run src/lib/calculator-v2/plot/implicit.test.ts` → FAIL, `Failed to resolve import "./field"` (the test imports `./field` first, then `./implicit`).
- [ ] **Step 3: Implement.** `sampleField`:
  1. `cell = COARSE_CELL_PX`, doubled while `(cellsX + 1)(cellsY + 1)·callsPerNode` exceeds `limit/COARSE_SHARE` (4 px at 800×600, 8 at
     1920×1080, 16 at 3840×2160). Nodes map with `view.size`, so nodes past the last pixel lie just outside the view. Evaluate every coarse
     node (`i`, `j` multiples of `cell`), each `budget.take(callsPerNode)`.
  2. A square (edge a power of 2 up to `cell`, corners `(i, j)` to `(i + edge, j + edge)`) is active when, for any relation, its evaluated
     boundary nodes (corners and any evaluated node on its edges) mix finite and non-finite values or are finite and not all of one strict
     sign (a zero counts as mixed), or its corners are finite with `min|v| ≤ NEAR_ZERO_FACTOR·max|Δv|` along its four edges.
  3. Quadtree, first in first out, from the active coarse cells in row-major order: an active square of edge 1 is a leaf; any other is
     split by evaluating those of its top, left, centre, right and bottom midpoints not yet evaluated, each `budget.take(callsPerNode)`, then
     queuing its active children (top-left, top-right, bottom-left, bottom-right). After a split, each unsplit inactive square with a newly
     evaluated midpoint on its boundary is re-tested and queued if now active, so a crossing on a shared edge reaches the neighbour. When
     the budget refuses, that square and every queued square are unresolved. Nodes are stored sparsely (key `j·(cellsX·cell + 1) + i`). Cost
     follows the zero set (simulated, nothing unresolved: `x²+y²=25` about 92,000 evaluations at 3840×2160, `1<y<3` 138,000 at 1440×900).
  4. `pixelValue(i, j, k)`: the node's own value when evaluated; otherwise, from the unsplit square whose half-open extent
     `[i0, i0 + edge) × [j0, j0 + edge)` holds it (a node on the lattice's last row or column uses the square it bounds), its top-left
     corner's value, or its nearest corner's (ties to top-left) when it is unresolved.
  5. `contourField(field, k, view)`: each leaf with four finite relation-k corners runs marching squares with inside = `v < 0`; crossings
     lie on their lattice edges by linear interpolation; the two saddle cases join the inside corners when the corner mean is `< 0`.
     Crossings are keyed by lattice edge and segments sharing a key chain into runs: open chains first (from keys used once, in
     first-appearance order), then closed loops, which repeat their first vertex. An unresolved square whose relation-k boundary nodes mix
     signs or finiteness adds the band `[x0, x1, yMin, yMax]` of its corner nodes. `plotImplicit`: `sampleField(view, 1, 1, …)` with
     `new EvaluationBudget(IMPLICIT_BUDGET, deadline)`, then `contourField(field, 0, view)`; `evaluations = budget.used`, `dashed: false`.
- [ ] **Step 4: Run it and see it pass.** PASS, 4 tests.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/plot/{field,contour,implicit,implicit.test}.ts && git commit -m "Add calculator v2 pixel-centre field sampling and implicit contours (G-15, G-16)"`

### Task 6: Regions

**Files:** Create `plot/region.ts`; Modify `plot/__fixtures__/measure.ts`; Test `plot/region.test.ts`. **Interfaces:** Consumes Task 5 and
`InequalityOp` (02). Produces, in `region.ts`, `relationHolds(op: InequalityOp, difference: number): boolean` (NaN is false),
`plotRegion(rowId: string, terms: readonly RealFn2[], ops: readonly InequalityOp[], view: ViewSpec, deadline: Deadline): RegionGeometry` and
`plotConstantRegion(rowId: string, holds: boolean, view: ViewSpec): RegionGeometry`; in `measure.ts`, `shadedMask(g: RegionGeometry, size: PixelSize): Uint8Array` (1 where the pixel centre `(i + 0.5, j + 0.5)` lies in a span).

- [ ] **Step 1: Write the failing test** (add `shadedMask` to `measure.ts` first, as specified)

```ts
const LINE: RealFn2[] = [(x, y) => y, (x) => 2 * x + 1];
const BAND: RealFn2[] = [() => 1, (x, y) => y, () => 3];
const DISC: RealFn2[] = [(x, y) => x * x + y * y, () => 25];
// [terms, ops, holds, distance to the boundary in world units]
const CASES: [RealFn2[], InequalityOp[], (x: number, y: number) => boolean, RealFn2][] = [
  [LINE, ["<="], (x, y) => y <= 2 * x + 1, (x, y) => Math.abs(y - 2 * x - 1) / Math.sqrt(5)],
  [BAND, ["<", "<"], (x, y) => 1 < y && y < 3, (x, y) => Math.abs(Math.abs(y - 2) - 1)],
  [DISC, ["<"], (x, y) => x * x + y * y < 25, (x, y) => Math.abs(Math.hypot(x, y) - 5)],
];
const region = (terms: RealFn2[], ops: InequalityOp[], view = VIEW_800) => plotRegion("r", terms, ops, view, NO_DEADLINE);
it("G-17 every pixel centre more than 1 px from the boundary is shaded exactly when it holds, up to 1920×1080", () => {
  for (const view of UP_TO_1080) {
    const { width, height } = view.size;
    const px = (d: number) => d * (width / 20);
    for (const [terms, ops, holds, dist] of CASES) {
      const g = region(terms, ops, view);
      const mask = shadedMask(g, view.size);
      let wrong = 0;
      for (let n = 0; n < width * height; n++) {
        const [x, y] = pxToWorld(view, (n % width) + 0.5, Math.floor(n / width) + 0.5);
        if (px(dist(x, y)) > 1 && (mask[n] === 1) !== holds(x, y)) wrong++;
      }
      expect(wrong).toBe(0);
      const curves = g.boundaries.filter((b): b is CurveGeometry => b.kind === "curve");
      const vertices = curves.flatMap((b) => runsOf(b.polylines).flat());
      expect(vertices.length).toBeGreaterThan(0);
      for (const [x, y] of vertices) expect(px(dist(x, y))).toBeLessThanOrEqual(1);
      for (const [a, b] of curves.flatMap((c) => segmentsOf(c.polylines))) expect(px(dist(...mid(a, b)))).toBeLessThanOrEqual(1);
    }
  }
  expect(Array.from(plotConstantRegion("k", true, VIEW_800).spans)).toEqual([0, 600, 0, 800]);
  expect(plotConstantRegion("k", false, VIEW_800).spans).toHaveLength(0);
}, 30_000);
it("G-1 a strict inequality's boundary is dashed and a non-strict one solid", () => {
  const dashes = (t: RealFn2[], ops: InequalityOp[]) => region(t, ops).boundaries.map((b) => b.dashed);
  expect(dashes(LINE, ["<"])).toEqual([true]);
  expect(dashes(LINE, ["<="])).toEqual([false]);
  expect(dashes(BAND, ["<", "<="])).toEqual([true, false]);
});
```

- [ ] **Step 2: Run it and see it fail.** `n exec 22 npx vitest run src/lib/calculator-v2/plot/region.test.ts` → FAIL, `Failed to resolve import "./region"`.
- [ ] **Step 3: Implement.** `relationHolds`: `<` is `d < 0`, `<=` is `d ≤ 0`, `>` is `d > 0`, `>=` is `d ≥ 0`. `plotRegion`:
      `sampleField(view, ops.length, terms.length, …)` with `new EvaluationBudget(IMPLICIT_BUDGET, deadline)`; the evaluator calls each term
      once and writes `out[k] = terms[k] − terms[k + 1]`. Pixel `(i, j)` (`i < W`, `j < H`) is true when `relationHolds(ops[k], field.pixelValue(i, j, k))`
      for every k. Spans (`Float32Array`): per row j, each maximal run `[i0, i1)` of true pixels gives `[j, min(j + 1, height), i0, min(i1, width)]`.
      Boundaries: per k, `contourField(field, k, view)` as a `CurveGeometry` with the region's `rowId`, `evaluations: 0` and
      `dashed: ops[k] === "<" || ops[k] === ">"`; `evaluations = budget.used`. `plotConstantRegion` (RC-14's constant inequality): spans
      `[0, height, 0, width]` when `holds`, else none; no boundaries.
- [ ] **Step 4: Run it and see it pass.** PASS, 2 tests.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/plot/region{,.test}.ts src/lib/calculator-v2/plot/__fixtures__/measure.ts && git commit -m "Add calculator v2 inequality regions with exact shading and dashed strict boundaries (G-1, G-17)"`

### Task 7: Viewport limits: `plotRow`, the G-15 budgets and the limit views

**Files:** Create `plot/index.ts`; Modify `plot/__fixtures__/measure.ts`; Test `plot/index.test.ts`, `plot/limits.test.ts`, `plot/budget.perf.test.ts`.
**Interfaces:** Consumes Tasks 1 to 6. Produces the `plot/index.ts` block of `01-interfaces.md` section 5 verbatim (`PlotInput`, the
`EXPLICIT_BUDGET`/`IMPLICIT_BUDGET` re-export from `./budget`, and `plotRow(input: PlotInput, view: ViewSpec, deadline: Deadline): Geometry`, which 07 calls).
`measure.ts` adds `EXPLICIT_ROW = { rowId: "e", kind: "explicit", independent: "x" } as const`, `SIZES: PixelSize[]` (800×600, 1920×1080, 3840×2160) and:
`STRESS_1: RealFn1[] = [(x) => x * x, (x) => Math.sin(100 * x), (x) => Math.sin(1 / x), Math.tan, (x) => Math.tan(200 * x), (x) => 1 / x, (x) => Math.sqrt(Math.sin(1000 * x)), Math.exp, (x) => x ** 10]`;
`STRESS_2: RealFn2[] = [(x, y) => x * x + y * y - 25, (x, y) => x * y - 6, (x, y) => Math.sin(300 * x) * Math.sin(300 * y), (x, y) => { let s = 0; for (let k = 1; k <= 40; k++) s += Math.sin(k * x) * Math.cos(k * y); return s; }]`;
`STRESS_REGIONS: RealFn2[][] = [[(x, y) => y, (x) => 2 * x + 1], [() => 1, (x, y) => y, () => 3], [(x) => Math.sin(300 * x), (x, y) => Math.sin(300 * y)]]`.

- [ ] **Step 1: Write the failing tests** (add the `measure.ts` helpers above first, as specified)

```ts
// index.test.ts
it("G-1 y=f(x), x=g(y), implicit equations and inequalities all graph", () => {
  const inputs: PlotInput[] = [
    { rowId: "a", kind: "explicit", independent: "x", f: (x) => 2 * x + 3 },
    { rowId: "b", kind: "explicit", independent: "y", f: (y) => y * y },
    { rowId: "c", kind: "implicit", F: (x, y) => x * x + y * y - 25 },
    { rowId: "d", kind: "region", terms: [(x, y) => y, (x) => 2 * x + 1], ops: ["<="] },
    { rowId: "e", kind: "lines", orientation: "vertical", f: (x) => x * x - 4 },
    { rowId: "f", kind: "points", points: [[2, 3]] },
    { rowId: "g", kind: "constant-region", holds: true },
  ];
  const out = inputs.map((input) => plotRow(input, VIEW_800, NO_DEADLINE));
  const kinds = ["curve", "curve", "curve", "region", "lines", "points", "region"];
  expect(out.map((g) => g.kind)).toEqual(kinds);
  expect(out.map((g) => g.rowId).join("")).toBe("abcdefg");
  for (const g of out.slice(0, 3)) expect((g as CurveGeometry).polylines.length).toBeGreaterThan(0);
  expect((out[3] as RegionGeometry).spans.length).toBeGreaterThan(0);
  const roots = Array.from((out[4] as LineSetGeometry).positions, (p, k) => Math.abs(p - [-2, 2][k]) * 40);
  expect(roots).toHaveLength(2);
  for (const d of roots) expect(d).toBeLessThanOrEqual(0.5);
  expect(Array.from((out[5] as PointGeometry).coords)).toEqual([2, 3]);
  expect(Array.from((out[6] as RegionGeometry).spans)).toEqual([0, 600, 0, 800]);
  const xOfY = runsOf((out[1] as CurveGeometry).polylines).flat();
  for (const [x, y] of xOfY) expect(x === y * y || x === 20).toBe(true); // 20: the guard line
  const f = counted((x: number) => x);
  const zero = viewOf(VIEW_800.viewport, { width: 0, height: 0 }); // a hidden graph
  const empty = plotRow({ ...EXPLICIT_ROW, f: f.fn }, zero, NO_DEADLINE);
  expect([empty.kind, empty.evaluations, f.calls()]).toEqual(["curve", 0, 0]);
});
// limits.test.ts (Review Focus item 4)
const V0 = VIEW_800.viewport;
const LIMITS = [
  zoomViewport(V0, 1e15, { x: 0, y: 0 }),
  zoomViewport(V0, 1e15, { x: 1, y: 1 }),
  zoomViewport(V0, 1e-20, { x: 0, y: 0 }),
  zoomViewport(panViewport(V0, 1e16, 1e16), 1e15, { x: 1e15, y: 1e15 }),
  zoomViewport(panViewport(V0, -1e16, -1e16), 1e15, { x: -1e15, y: -1e15 }),
].map((v) => viewOf(v));
const CURVES: RealFn1[] = [(x) => x, Math.sin, Math.exp, (x) => x * x];
const G11: RealFn1[] = [(x) => x * x, (x) => x ** 10, Math.exp, Math.sin, (x) => 1 / x, Math.tan];
const circle: PlotInput = { rowId: "c", kind: "implicit", F: (x, y) => x * x + y * y - 25 };
it("G-23 sampling and ticks at the limits stay finite and in budget", () => {
  for (const view of LIMITS) {
    for (const input of [...CURVES.map((f) => ({ ...EXPLICIT_ROW, f })), circle]) {
      const g = plotRow(input, view, NO_DEADLINE) as CurveGeometry;
      const cap = input.kind === "implicit" ? IMPLICIT_BUDGET : EXPLICIT_BUDGET;
      expect(g.evaluations).toBeLessThanOrEqual(cap);
      const p = g.polylines;
      for (let k = 0; k < p.length; k += 2) expect(Number.isNaN(p[k])).toBe(Number.isNaN(p[k + 1]));
      expect(p.every((n) => Number.isNaN(n) || Number.isFinite(n))).toBe(true);
      expect(g.bands.every((n) => Number.isFinite(n))).toBe(true);
      if (input.kind === "explicit") expectG11(view, input.f, segmentsOf(p)); // G-11 at the limits
    }
    const { left, right, bottom, top } = view.viewport;
    const ranges = [left, right, 800, bottom, top, 600];
    for (let k = 0; k < 6; k += 3) {
      const [lo, hi, px] = ranges.slice(k, k + 3);
      const t = axisTicks(lo, hi, px);
      expect(t.step > 0 && Number.isFinite(t.step) && t.major.length >= 2).toBe(true);
      expect((t.step / (hi - lo)) * px).toBeGreaterThanOrEqual(80 * (1 - 1e-9)); // never underflows
      expect(t.major.every((m, i) => i === 0 || m > t.major[i - 1])).toBe(true);
      expect(t.minor.every((m) => Number.isFinite(m) && !t.major.includes(m))).toBe(true);
    }
  }
}, 60_000);
it("G-23, G-11 holds at both zoom limits for each G-11 function", () => {
  const segmentsAt = (f: RealFn1, view: ViewSpec) =>
    segmentsOf((plotRow({ ...EXPLICIT_ROW, f }, view, NO_DEADLINE) as CurveGeometry).polylines);
  for (const f of G11) {
    const zoomIn = viewOf(zoomViewport(V0, 1e15, { x: 1, y: f(1) }));
    const inner = segmentsAt(f, zoomIn);
    expect(inner.length).toBeGreaterThan(0);
    expectG11(zoomIn, f, inner);
    // zoom-out limit (LIMITS[2]); a spike narrower than a pixel, such as x^10 at 0, may draw only as a band
    expectG11(LIMITS[2], f, segmentsAt(f, LIMITS[2]));
  }
}, 60_000);
// budget.perf.test.ts: deterministic evaluation counts, one test per size
vi.setConfig({ testTimeout: 60_000 }); // 3840×2160 runs 250,000-call fields and 8.3 M-pixel spans
describe("G-15 explicit and implicit evaluation budgets per view", () => {
  it.each(SIZES)("G-15 evaluations stay within 20,000 and 250,000 at $width×$height", (size) => {
    for (const fn of STRESS_1) {
      const c = counted(fn);
      const g = plotRow({ ...EXPLICIT_ROW, f: c.fn }, at(size), NO_DEADLINE);
      expect([g.evaluations, c.calls() <= EXPLICIT_BUDGET]).toEqual([c.calls(), true]);
    }
    for (const fns of [...STRESS_2.map((F) => [F]), ...STRESS_REGIONS]) {
      const cs = fns.map((fn) => counted(fn));
      const [F, ...rest] = cs.map((c) => c.fn);
      const input: PlotInput = rest.length
        ? { rowId: "r", kind: "region", terms: [F, ...rest], ops: rest.map(() => "<" as const) }
        : { rowId: "i", kind: "implicit", F };
      const g = plotRow(input, at(size), NO_DEADLINE);
      const calls = cs.reduce((n, c) => n + c.calls(), 0);
      expect([g.evaluations, calls <= IMPLICIT_BUDGET]).toEqual([calls, true]);
    }
  });
});
```

- [ ] **Step 2: Run them and see them fail.** `n exec 22 npx vitest run src/lib/calculator-v2/plot/{index,limits,budget.perf}.test.ts` → FAIL, `Failed to resolve import "./index"`.
- [ ] **Step 3: Implement `plot/index.ts`.** `plotRow` sends each kind to `plotExplicit`, `plotImplicit`, `plotLines`, `plotPoints`, `plotRegion`
      or `plotConstantRegion`. A view whose width or height is below 1 px or not finite returns, without evaluating, an empty geometry of the
      input's kind (`curve`: empty arrays, `dashed: false`; `lines`: its orientation, no positions; `points`: `plotPoints`; `region`: no spans
      or boundaries), `evaluations: 0`. `DeadlineExceeded` propagates (07 turns it into `overrun`).
- [ ] **Step 4: Run the package and see it pass.** `n exec 22 npx vitest run src/lib/calculator-v2/plot` → PASS, 29 tests in 12 files.
- [ ] **Step 5: Commit.** `git add src/lib/calculator-v2/plot/{index,index.test,limits.test,budget.perf.test}.ts src/lib/calculator-v2/plot/__fixtures__/measure.ts && git commit -m "Add calculator v2 plotRow with G-15 budgets and G-23 limit views"`

<!-- prettier-ignore-end -->
