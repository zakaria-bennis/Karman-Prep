# Figure Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One in-house engine draws every question figure and figure answer choice from a `FigureSpec`, in the Bluebook look, with colors taken only from the theme.

**Architecture:** `FigureSpec` (versioned JSON, validated with Zod) goes to a pure `buildScene(spec, box)`, which returns a `Scene` (role-colored primitives, no DOM). `<FigureView>` renders the `Scene` as one SVG. Graph curves come from the calculator's parser and plotting code, used read-only at authoring time by `scripts/figures/sample-functions.ts`, which stores them in each function part's `samples`. The runtime engine never imports the calculator. `figure_spec` and `choice_figure_spec` columns hold the specs. `FigureFrame` prefers them over the old figure fields.

**Tech Stack:** TypeScript, React (Next.js 16), Zod, Vitest, Playwright, Supabase migrations, Python kimport CLI for the reviewer and submit path.

**Spec:** `docs/superpowers/specs/2026-10-31-figure-engine-design.md`

## Global Constraints

- **No outside drawing libraries:** no JSXGraph, Mafs, D3 or three.js. Never load or copy anything from Desmos.
- **The calculator is read-only:** only `scripts/figures/sample-functions.ts` imports it (from `src/lib/calculator/core` and `src/lib/calculator/plot`). Nothing under `src/` outside the calculator may import calculator modules (seam test AR-1), and nobody edits `src/lib/calculator/` or `src/components/calculator/`. `src/app/globals.css` and `src/lib/themes/palettes.ts` stay unchanged (test TH-2).
- **Colors** come only from the theme roles `ink`, `ink-muted`, `grid`, `fill-faint`, `fill-shade` and `highlight`, mapped to CSS variables `--figure-ink`, `--figure-ink-muted`, `--figure-grid`, `--figure-fill-faint`, `--figure-fill-shade` and `--figure-highlight`. Specs cannot carry colors or pixel sizes.
- **House sizes:**
  - line 1.5, grid 1, dashed 1.25 with dash `4 3`;
  - font 15 px, scaled with the figure, never below 12 px on screen;
  - label offset 6 px, arrowhead length 8 px and width 6 px, tick length 6 px;
  - margin 16 px.
- **Snapping tolerance** is 2% of the figure's larger side.
- **Solid view:** oblique at 30° with depth scale 0.5 by default, or isometric.
- **Replace, don't accumulate:** each task that replaces an old renderer deletes it once nothing calls it. No `v2` names.
- **Code limits:** no file over about 700 lines. `@typescript-eslint/no-unused-vars` is an error.
- **Gates before review:** `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run check:sizes`, `npm run cf:build`.

## Review Focus

1. **A function with an asymptote or a gap**, such as `1/(x-2)` or `\sqrt{x}`, must not draw a vertical line across the asymptote or a curve outside its domain. Test it in Task 3.
2. **A ray whose direction point lies outside the frame, or a line through two points very close together**, must still be clipped to the frame with its arrowheads. Test it in Task 3.
3. **A label that would land on another label or a line in a crowded figure**, such as a triangle with 6 labels and a 25° angle, must move to the nearest free spot. If no spot exists, the scene reports a `label_collision` issue instead of drawing an overlap. Test it in Task 4.
4. **A long table on a 390 px phone** must scroll inside its frame with no page-wide scroll, and the text must stay at least 12 px. Test it in Task 10.
5. **A spec with an unknown part type, a reference to a missing point, or a value that isn't a number** must fail validation with a readable message naming the part. It must never render a half-built figure. Test it in Task 1.

---

### Task 1: FigureSpec types and validation

**Files:**

- Create: `src/lib/figures/engine/spec.ts`
- Test: `tests/unit/figures/engine/spec.test.ts`

**Interfaces:**

- Produces: `FigureSpec` and `Part` (a discriminated union on `kind`), `parseFigureSpec(input: unknown): { ok: true; spec: FigureSpec } | { ok: false; errors: string[] }`, and `FIGURE_SPEC_VERSION = "figure-spec/1"`.
- `FigureSpec` is `{ version, type: "table"|"bar"|"line"|"scatter"|"dot_plot"|"histogram"|"box_plot"|"plane"|"geometry2d"|"solid3d", parts: Part[], labels: Label[], marks: Mark[], frame?: PlaneFrame, notToScale?: boolean, title?: string }`.
- `Part` kinds:
  - `point {id,x,y}`;
  - `segment|ray|line {id,from,to}` (point ids; a ray starts at `from`);
  - `circle {id,center,radius|through}`;
  - `arc {id,center,from,to}`;
  - `angle {id,vertex,from,to}`;
  - `polygon {id,points[]}`;
  - `function {id,latex,domain?}`;
  - `region {id,latex}` (an inequality);
  - `solid {id,shape:"prism"|"cylinder"|"cone"|"pyramid"|"sphere",dims,view?}`;
  - `table {id,header?,rows,blankCorner?}`;
  - `series {id,kind,values}`.
- `Label` is `{ text, on: partId, at?: "start"|"end"|"mid"|"inside" }`.
- `Mark` is `{ kind: "right_angle"|"equal_ticks"|"equal_arcs"|"parallel"|"hidden_dashed", on: partId[], count?: 1|2|3 }`.
- `PlaneFrame` is `{ x:[min,max], y:[min,max], step?, xLabel?, yLabel? }`.

- [ ] **Step 1: Write failing tests:**
  - `accepts a triangle spec` (3 points, a polygon, a right_angle mark → ok);
  - `rejects unknown part kind` (the error mentions the part id);
  - `rejects a segment referencing a missing point`;
  - `rejects a color or pixel field` (`{stroke:"#000"}` → error "colors and sizes come from the theme");
  - `rejects a non-numeric coordinate`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/figures/engine/spec.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement with Zod schemas (`.strict()` objects, so extra fields such as colors are rejected). Do a reference check after parsing.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat(figures): FigureSpec format and validation`.

### Task 2: Scene model, theme roles and FigureView

**Files:**

- Create: `src/lib/figures/engine/scene.ts`, `src/lib/figures/engine/house.ts`, `src/components/learn/figures/FigureView.tsx`
- Create: `src/components/learn/figures/figure-roles.css` (the six `--figure-*` variables under `:root:root`, from the theme ink token; imported by `FigureView`). `src/app/globals.css` is not changed (remediation, 2026-10-31).
- Test: `tests/unit/figures/engine/scene.test.tsx`

**Interfaces:**

- Produces: `Scene = { width: number; height: number; items: SceneItem[]; issues: SceneIssue[]; description: string }`.
- `SceneItem` is one of:
  - `{t:"path", d, role, weight:"line"|"grid"|"dashed", fill?: Role, arrows?: "start"|"end"|"both", partId?}`;
  - `{t:"text", x, y, text, role, anchor, partId?}`;
  - `{t:"rect"...}`.
- `Role = "ink"|"ink-muted"|"grid"|"fill-faint"|"fill-shade"|"highlight"`.
- `SceneIssue = { code: "label_collision"|"clipped"|"off_line"|"missing_label"|"arrow_rule"|"unsampled_function", partId?: string, detail: string }`.
- `house.ts` exports `HOUSE` with the Global Constraints sizes.
- `FigureView({ scene, className, title? })` renders an `<svg viewBox>` with `role="img"` and `aria-label={scene.description}`, and maps each role to `var(--figure-<role>)`.

- [ ] **Step 1: Write failing tests:**
  - `FigureView renders paths with stroke var(--figure-ink)`;
  - `arrows end adds a marker-end`;
  - `aria-label equals scene.description`;
  - `no hex color appears in the rendered markup`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. The arrowhead marker is defined once per SVG and uses `context-stroke`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(figures): scene model and themed FigureView`.

### Task 3: Coordinate plane, functions, rays and lines

**Files:**

- Create: `src/lib/figures/engine/plane.ts`, `src/lib/figures/engine/ticks.ts`, `scripts/figures/sample-functions.ts` and `scripts/figures/sample-spec.ts` (remediation, 2026-10-31: the adapter first written as `src/lib/figures/engine/calc-adapter.ts` moved out of `src/`)
- Test: `tests/unit/figures/engine/plane.test.ts`, `tests/unit/figures/engine/ticks.test.ts`, `tests/unit/figures/authoring/sample-functions.test.ts`

**Interfaces:**

- Consumes (in `scripts/figures/sample-functions.ts` only): `plotRow` and `PlotInput` from `src/lib/calculator/plot/index.ts`, and `parseLatex` from `src/lib/calculator/core/latex/index.ts`. Build the row's `PlotInput` the way `src/lib/calculator/worker/pass.ts:214-219` does through `plotInputFor`, and give `plotRow` a generous deadline (`limitMs: null`).
- Produces: `curveFor(latex: string, frame: PlaneFrame, box: {width:number;height:number}): number[][]` (polylines in world units, broken at gaps and asymptotes) and `sampleSpec(spec, box = 640×480): FigureSpec` (fills every function part's `samples`), both in `scripts/figures/sample-functions.ts`; `niceStep`, `tickValues` and `axisTicks` in `src/lib/figures/engine/ticks.ts`; and `buildPlane(spec: FigureSpec, box): Scene`, which draws only stored `samples` and reports `unsampled_function` for a function part without them.

- [ ] **Step 1: Write failing tests:**
  - `y=2x^2-3 passes through (1,-1) and (2,5)` (the nearest polyline vertex is within 1% of the frame span);
  - `1/(x-2) has no segment crossing x=2`;
  - `\\sqrt{x} draws nothing left of 0`;
  - `ray AB clipped to frame ends in exactly one arrowhead at the frame edge`;
  - `line AB has arrows both`;
  - `segment AB has no arrows`;
  - `ray whose direction point is outside the frame still draws from A to the edge`;
  - `grid lines use role grid and axes role ink`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Clip rays and lines to the frame with Liang–Barsky. Ticks come from the engine's `axisTicks` (1, 2 or 5 × 10^k). Axis labels sit at the positive ends.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(figures): coordinate planes, function graphs, rays and lines`.

### Task 4: Label placement and overlap checks

**Files:**

- Create: `src/lib/figures/engine/labels.ts`
- Test: `tests/unit/figures/engine/labels.test.ts`

**Interfaces:**

- Produces: `placeLabels(items: SceneItem[], labels: PendingLabel[], box): { items: SceneItem[]; issues: SceneIssue[] }`, where `PendingLabel = { text; anchor: {x;y}; preferred: {dx;dy}; partId }`.

- [ ] **Step 1: Write failing tests:**
  - `vertex label sits outside the polygon on the bisector of the outside angle at HOUSE.labelOffset`;
  - `two labels that would overlap end up with disjoint boxes`;
  - `crowded figure with no free spot reports label_collision instead of overlapping`;
  - `no label box leaves the figure box`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Text width is estimated at 0.6×font per character, and 0.35× for a narrow glyph. Candidates are tried at 8 angles and 3 distances from the preferred side, and the first spot with no overlap wins.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(figures): label placement with overlap checks`.

### Task 5: 2D geometry (traced, snapped, marked)

**Files:**

- Create: `src/lib/figures/engine/geometry2d.ts`, `src/lib/figures/engine/marks.ts`
- Delete when unused: `src/lib/figures/geometry-svg.ts`, `src/lib/figures/geometry-layout.ts` and their tests, plus `src/components/learn/GeometryFigure.tsx` (after Task 11 routes geometry to the engine)
- Test: `tests/unit/figures/engine/geometry2d.test.ts`

**Interfaces:**

- Produces: `buildGeometry2d(spec, box): Scene`, `snap(spec): FigureSpec`, and `drawMark(mark, scene): SceneItem[]`.

- [ ] **Step 1: Write failing tests:**
  - `a point 1.5% off line AB snaps onto it` and `one 3% off does not`;
  - `angle marked right_angle at C is exactly 90° after snapping`;
  - `figure is centered: left/right and top/bottom margins differ by at most 1px`;
  - `right_angle mark is a square of side 10 at the vertex inside the angle`;
  - `equal_ticks count 2 draws two ticks perpendicular at each segment midpoint`;
  - `notToScale adds the exact text "Note: Figure not drawn to scale."` below the figure;
  - `hidden_dashed segment uses weight dashed`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Snapping is a projection onto the line or circle within tolerance. The figure is normalized to fit the box minus the margin, then centered. Labels go through `placeLabels`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(figures): traced 2D geometry with SAT marks`.

### Task 6: Charts

**Files:**

- Create: `src/lib/figures/engine/charts.ts`, `src/lib/figures/engine/from-chart-data.ts`
- Modify: `src/components/learn/ChartFigure.tsx` (it becomes a thin wrapper: convert, build the scene, render `FigureView`; delete its drawing code and the now-unused exports `BAR_BAND_SHARE`, `GROUP_BAND_SHARE` and `MAX_BAR_SHARE` once nothing imports them)
- Test: `tests/unit/figures/engine/charts.test.ts`

**Interfaces:**

- Produces: `buildChart(spec, box): Scene` for `bar|line|scatter|dot_plot|histogram|box_plot`, and `chartDataToSpec(figure_chart_data: unknown): FigureSpec`.

- [ ] **Step 1: Write failing tests:**
  - `bar heights are proportional to values on a zero-based axis`;
  - `dot plot stacks equal values upward from the axis`;
  - `box plot whiskers at min/max and box at Q1–Q3 with the median line`;
  - `chartDataToSpec round-trips every fixture in tests/fixtures/charts`.
  - The existing `ChartFigure.test.tsx` assertions still pass, or are updated only where they asserted the old drawing internals.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement on top of `plane.ts` axes and ticks.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(figures): charts on the engine; remove old chart drawing`.

### Task 7: Tables

**Files:**

- Create: `src/lib/figures/engine/table.ts`, `src/lib/figures/engine/from-table-data.ts`
- Modify: `src/components/learn/QuestionTable.tsx` (renders from the table spec: an HTML `<table>` for accessibility and text selection, styled by the house table rules)
- Test: `tests/unit/figures/engine/table.test.tsx`

**Interfaces:**

- Produces: `tableDataToSpec(figure_table_data | choice_table_data): FigureSpec`, and `TableView({ spec })`.

- [ ] **Step 1: Write failing tests:**
  - `numbers align on the decimal point` (cells get `data-align="decimal"` and the decimal is at the same x);
  - `text cells are left-aligned`;
  - `blankCorner leaves the top-left header cell empty`;
  - `math in cells is typeset like question text` (uses the existing math renderer);
  - `wrapper has overflow-x:auto and the table never sets a width wider than its container`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(figures): standard tables`.

### Task 8: 3D solids

**Files:**

- Create: `src/lib/figures/engine/solid3d.ts`
- Test: `tests/unit/figures/engine/solid3d.test.ts`

**Interfaces:**

- Produces: `solidModel(part): { vertices: [x,y,z][]; edges: [i,j][]; faces: number[][] }`, `project(model, view): Scene` (hidden edges dashed by face-normal visibility), and `buildSolid3d(spec, box): Scene`.

- [ ] **Step 1: Write failing tests:**
  - `rectangular prism has 12 edges and exactly 3 dashed in oblique view`;
  - `cylinder draws two ellipses, with the back half of the bottom ellipse dashed`;
  - `cone apex above the base center`;
  - `labels for dims attach to the matching edge`;
  - `isometric view keeps the three axes at 120°`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Curved solids sample 64 points around each circle.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(figures): 3D solids as stored models`.

### Task 9: Database columns and renderer routing

**Files:**

- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_figure_spec.sql` (adds `quiz_questions.figure_spec jsonb` and `answer_choices.choice_figure_spec jsonb`, both nullable), and `supabase/rollbacks/<same>_figure_spec.down.sql`
- Create: `src/lib/figures/engine/index.ts` (`buildScene(spec, box): Scene` dispatches on `spec.type`)
- Modify: `src/components/learn/FigureFrame.tsx` (when `figure_spec` is present, render `FigureView(buildScene(...))`; otherwise keep the existing path), and the question and choice data types and queries that select figure fields (`src/types/supabase.ts` is regenerated, not hand-edited)
- Test: `tests/unit/figures/engine/routing.test.tsx`

**Interfaces:**

- Produces: `buildScene`. The `figure_spec` and `choice_figure_spec` fields appear on the question and choice types.

- [ ] **Step 1: Write failing tests:**
  - `FigureFrame prefers figure_spec over figure_svg`;
  - `invalid figure_spec renders nothing and logs one error, never a partial figure`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Test the migration against production inside a rolled-back transaction (up, then down, then compare the column count), the way `20261031040000_question_calibration_fields` was tested.
- [ ] **Step 4:** Run the tests. Expected: PASS. Also run `npm run cf:build`. Expected: success.
- [ ] **Step 5:** Commit `feat(figures): figure_spec columns and engine routing`.

### Task 10: Figure answer choices and device layout

**Files:**

- Create: `src/components/learn/figures/FigureChoices.tsx`
- Modify: the answer-choice rendering component under `src/components/learn/` that lists choices (it uses `FigureChoices` when any choice has `choice_figure_spec`)
- Test: `tests/unit/figures/engine/choices.test.tsx`, `tests/visual/figures.spec.ts`

**Interfaces:**

- Consumes: `buildScene`.
- Produces: `sharedFrame(specs: FigureSpec[]): PlaneFrame` (the union of ranges, applied to all four).

- [ ] **Step 1: Write failing tests:**
  - `four graph choices share one frame and one size`;
  - `each choice is one button whose accessible name is "Choice A" plus the figure description`;
  - Playwright at 390×844: choices stack one per column, there is no horizontal page scroll, and the smallest rendered text is at least 12 px;
  - at 820×1180 and 1280×800: a 2×2 grid when the four fit;
  - all of the above in light and dark.
- [ ] **Step 2:** Run `npx vitest run tests/unit/figures/engine/choices.test.tsx` and `npx playwright test tests/visual/figures.spec.ts --project=visual`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run both. Expected: PASS.
- [ ] **Step 5:** Commit `feat(figures): figure answer choices and device layout`.

### Task 11: Checks, reviewer submit path and certify

**Files:**

- Create: `src/lib/figures/engine/checks.ts`, `scripts/figures/check-spec.ts` (CLI: reads `figure.json`, prints `{ok, issues[], svg}`)
- Modify, on the import branch `claude/import-dedup-spec`: `scripts/import-tools/kimport/figures.py` (`figures submit` first runs `npx tsx scripts/figures/sample-spec.ts figure.json` and stores the filled spec, so every function part carries `samples`, then runs `npx tsx scripts/figures/check-spec.ts` on the filled spec and refuses on issues, including `unsampled_function`, or on a `figure_svg` field), `scripts/import-tools/kimport/qa_bank_checks.py` (adds a `figure_choice_placeholder` fail check: choice text matching `^(Graph|Table|Figure|Chart)\s+[A-D]\.?$` with no `choice_figure_spec`), and `src/app/dev/figure-review/` (renders the engine output beside the inverted original)
- Test: `tests/unit/figures/engine/checks.test.ts`, plus kimport tests in `scripts/import-tools/tests/`

**Interfaces:**

- Produces: `checkSpec(spec, transcribedLabels: string[]): SceneIssue[]`, which covers missing or invented labels, `off_line`, `label_collision`, `clipped`, `arrow_rule`, `unsampled_function`, and curve-through-point (checked against the stored `samples`).

- [ ] **Step 1: Write failing tests:**
  - `missing label from transcription → missing_label`;
  - `invented label → missing_label with detail "not in original"`;
  - `point declared on circle but off it → off_line`;
  - `segment drawn with arrows → arrow_rule`;
  - `function part without samples → unsampled_function`.
  - kimport: `submit fills samples before checking`, `submit refuses figure_svg`, `submit refuses a spec with issues`, and `certify flags "Graph A" choices with no figure`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/figures/engine/checks.test.ts` and `cd scripts/import-tools && python3 -m unittest discover -s tests -q`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run both. Expected: PASS.
- [ ] **Step 5:** Commit on each branch `feat(figures): spec checks in submit, review and certify`.

### Task 12: Golden figures and full-bank verification

**Files:**

- Create: `tests/fixtures/figures/golden/*.json` (about 30 specs covering every part kind and mark, at least 3 per type) and `tests/unit/figures/engine/golden.test.ts`
- Create: `scripts/figures/render-all.ts` (renders every live `figure_spec` at 390, 820 and 1280 widths in light and dark, and writes `issues.json`)

- [ ] **Step 1:** Write `golden.test.ts`. Each fixture's SVG must match its stored snapshot, contain no hex color, and have no scene issues.
- [ ] **Step 2:** Run it. Expected: FAIL (no snapshots yet). Then review each snapshot visually, accept it, and run again. Expected: PASS.
- [ ] **Step 3:** Run the full gates (Global Constraints). Expected: all pass.
- [ ] **Step 4:** Commit `test(figures): golden figures and render-all`.

After Task 12, the redraw itself follows the spec's Section 3. Reviewers redraw the waiting figures as specs, and live figures are converted in batches (tables and charts mechanically through Tasks 6–7, the rest by reviewers), with founder review. That is pipeline work, not code tasks.
