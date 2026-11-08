# Figure engine: one standard for every figure (design)

Status: sections 1 and 2 approved by the founder on 2026-10-27. Section 3 (rollout and testing) was written for the 2026-10-31 first pass, which the founder asked to run without stopping. He reviews the whole document in the first-pass summary.

## Why

Of the figures waiting for the founder, about 510 are hand-written SVG with hard-coded colors. That is why their spacing, centering and colors are inconsistent and ignore the theme. About 145 geometry figures use `src/lib/figures/geometry-svg.ts`, which only knows points, segments and polygons. It has no rays, full lines, arrowheads, angle arcs or tick marks, so rays come out as segments. About 140 charts use `ChartFigure.tsx`. Function graphs, coordinate planes and 3D solids have no tool at all.

Goal: every figure in the bank, and every figure answer choice, is drawn by one in-house engine from a short description. The output looks like the Digital SAT (Bluebook) and takes its colors from the student's theme.

## Founder decisions

| Topic                  | Decision                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Look                   | Exactly like Bluebook: thin lines, plain labels, light grid. All colors come from the theme and are never typed into a figure.                                                                                                                                                                                         |
| Where shapes come from | Option C. Graphs, coordinate planes and charts are computed from their data or equation. 2D geometry and 3D solids are traced from the original and then cleaned up.                                                                                                                                                   |
| Future tutoring tools  | Design for them now and build them later. Parts are named, and solids are stored as real 3D shapes, so shading, rotating, unfolding into nets and highlighting can be added without redrawing.                                                                                                                         |
| Existing figures       | Redraw everything in stages: first the ~650 waiting for approval, then the live figures in batches. Each batch is checked and shown to the founder before it replaces the old one.                                                                                                                                     |
| Approach               | Option 1: our own engine (no JSXGraph, Mafs, D3 or three.js). Graph curves use the calculator's formula reader and plot math (`src/lib/calculator/core`, `src/lib/calculator/plot`) read-only, at authoring time only. The site never loads the calculator to draw a figure, and the calculator itself is not changed. |
| Tables                 | Same engine, same theme and the same rules.                                                                                                                                                                                                                                                                            |
| Figure answer choices  | Each choice is its own drawn figure. Text placeholders like "Graph A" are never allowed. The four choices share one scale, axes and size.                                                                                                                                                                              |
| Devices                | Readable and accessible on phone, tablet and laptop (Section 2).                                                                                                                                                                                                                                                       |

## Section 1: Figure format and engine

**One format, `FigureSpec` (JSON, versioned `figure-spec/1`).** It has:

- `type`: `table | bar | line | scatter | dot_plot | histogram | box_plot | plane | geometry2d | solid3d`.
- `parts`: named elements, each with an `id` you could point at later. Examples: `point A`, `segment AB`, `ray AB` (a start point and a direction point, with an arrowhead), `line AB` (arrowheads at both ends), `circle O`, `arc`, `angle ABC`, `polygon`, `function f` (with an expression), `region` (shaded inequality or area), `axis`, `grid`, and the solids `prism`, `cylinder`, `cone`, `pyramid` and `sphere`.
- `labels`: exam wording (`x°`, `12`, `Figure 1`), each attached to the part it describes.
- `marks`: the SAT's conventions, namely right-angle box, equal-length ticks, equal-angle arcs, parallel arrows, dashed hidden edges, and the line "Note: Figure not drawn to scale." (`notToScale: "figures"` prints "Note: Figures not drawn to scale." once under the last of several figures; a singular note once under the last is accepted when the original prints it so; the checks refuse a note on each) Equal-length ticks are 1.3 times the axis tick (`HOUSE.equalTickLength`, 7.8 against `tickLength` 6), spaced 1.3 times `markGap` (`HOUSE.equalTickGap`), so they read clearly on a side (founder, 2026-11-01). Axis ticks and parallel chevrons keep `tickLength`.
- `frame`: for planes and charts, the axis ranges, grid step and axis labels. For geometry, nothing: the engine fits and centers the drawing. Optional frame fields (`PlaneFrame` in `src/lib/figures/engine/spec.ts`, added with the charts):
  - `step` and `yStep`: the grid and tick step on x (and on y too unless `yStep` is set) and on y. Without them the engine picks a 1, 2 or 5 × 10^k step.
  - `labelStep` and `yLabelStep`: label every `labelStep` on x (and y, unless `yLabelStep` is set, and only while the axes share one step), instead of every tick.
  - `categories`: names along x, one band each (bar charts). The x range becomes 0 to the number of categories, with no vertical grid lines.
  - `grid`: `false` draws no grid lines.
  - `originLabel`: `false` leaves off the "0" where the axes meet, as printed SAT figures often do; `"O"` prints the SAT's italic "O"; `"both"` prints a 0 on each axis, the y one beside the base and the x one under the corner, as SAT histograms do. The single label sits below and left of the origin, or at the next free corner when tick labels are in the way; with no free corner the figure fails with a `label_collision`. It is never dropped silently. A transcription with a second "0" that is not drawn gets a hint to set `"both"`.
  - `minorStep` and `yMinorStep`: unlabelled tick marks every `minorStep` on x (and y, unless `yMinorStep` is set), 4 units long against 6 for a labelled tick (`HOUSE.minorTickLength`), between the labelled ones.
  - `xBreak` and `yBreak`: an axis break. The axis starts at a corner that stands for 0, then a zig-zag skips 2/3 of a step to the range's start, as Bluebook prints "0 ⌇ 9 10 11" under a histogram. The range must start above 0. The corner reads "0" (with `originLabel: "both"`, on each axis), and bars and bins rise from the range's start when the y-axis is broken.
  - Where the axes meet away from the origin (a histogram from 15), the y-axis "0" and the x label at the corner are both printed: two numbers are compared by their digits' measured size (0.5em wide, 0.7em tall, no descender, kept 1px apart), not the generous text box, so the corner keeps both.
  - `xLabel` and `yLabel`: the axis names. A short one (x, y, t) is the letter at the axis end; a longer one is a title.
  - `xTitle` and `yTitle`: a title beside the letter. The x title sits under the tick labels; the y title is turned to read upward, left of the y tick labels, as in Bluebook. With a title, `xLabel` and `yLabel` are only the letters, drawn when given.
  - `thousands`: `true`, `"x"` or `"y"` groups tick numbers with commas ("1,200"). Years are left alone unless asked.
  - `arrows`: `true` puts arrowheads on the axes' positive ends, `"both"` on both ends. The axes run just past the grid, and the letters sit at the arrow tips.
  - `rotateCategories`: category names turned 45°. Unset, they turn only when one does not fit its band.
  - `xDecimals` and `yDecimals`: tick numbers printed with that many decimals ("1.0, 2.0", "0.10", "15.0"), as the SAT prints a fixed-decimal axis; 0 still prints "0".
  - `xTickOrigin` and `yTickOrigin`: ticks, grid lines and tick labels count from this value instead of 0 ("3, 7, 11, 15" every 4 from 3; histogram bins from 51 every 4; a dot plot's "2, 5, 8, 11, 14").
  - `equalUnits`: one unit is as long on x as on y (the plot shrinks along the longer side and stays centered), so a circle stays a circle.
- Tick labels are never dropped silently. An explicit `labelStep` or `yLabelStep` is kept whenever its labels do not overlap. When they would, every other one is drawn and a `crowded_ticks` issue says which step to set. Without one, labels thin to every other step while closer than 28px (rulings, T3), and the scene records it, so a missing tick number of the original is reported with the step to set.
- A chart with one named series draws its legend when the spec sets `legend: true`, as its original does ("Fuel" under one bar series). A y label step the spec sets is kept: a chart whose labels would sit closer than a label's height grows taller until they fit, as it does for a title or legend (labels every 1 from 0 to 14).
- A line series may set its own `style`: `line` (solid, dashed, dotted, dashdot), `marker` (triangle, square, circle, diamond, star, a plain `dot`, or `none`), the marker's `fill` (solid, open, or shaded in the muted role) and `muted` (the line in the muted role, the SAT's gray line). The legend swatch shows the same.
- Line charts with three or more series give each series its own line pattern (solid, dashed, dotted, dash-dot) and marker (triangle, square, circle, diamond; open ones filled with `paper`), shown in the legend swatch too. One or two series keep solid and dashed with filled dots. Legend names wider than the figure wrap.

**Where coordinates come from (option C).**

- **plane, charts and tables:** exact data or equations. A `function` part keeps its expression (`latex`, optional `domain`) and stores its graph as `samples`: world-unit polylines, already broken at gaps and asymptotes. The samples are computed at authoring time by `scripts/figures/sample-functions.ts` (CLI: `npx tsx scripts/figures/sample-spec.ts spec.json`), which uses the calculator's own formula reader and plotting math, read-only, for domains, gaps, asymptotes and adaptive sampling. The runtime engine never loads the calculator: it only clips the stored samples to the frame, and a function part without samples draws nothing and raises an `unsampled_function` issue. Old `figure_chart_data` functions (linear, quadratic, absolute value, exponential) are sampled directly when they are converted. Automatic tick steps come from the engine's own `ticks.ts`. A ray or line on a plane is clipped to the frame and gets arrowheads; a line marked `arrows: false` is drawn without them (segments and rays have no such switch). A function written as a constant (`y=-5`, or a bare `-5`) or a vertical line (`x=3`) is sampled as one straight run across the frame (the calculator draws these as line sets, not curves), and plain bars `|x|` are read as absolute value.
  - A `region` part keeps its inequality (`latex`: one inequality, a chain such as `-1 < y \le 3`, or a system of up to 4 separated by commas, semicolons or `\\`). Like a function, it carries `samples` computed at authoring time by the same `sample-spec.ts`: closed world-unit rings, already clipped to the frame, with holes as separate rings filled even-odd. A linear inequality or system (`a x + b y ⋚ c`, which covers `y ⋚ mx + b`, `x ⋚ k` and `y ⋚ k`) is exact: the frame is clipped against each half-plane (Sutherland–Hodgman), so every vertex is on the frame edge or on a boundary line. Any other inequality is traced from the calculator's own shading at the default 640×480 box, and every vertex that touches the boundary is moved onto the calculator's boundary curve (`scripts/figures/sample-regions.ts`). The engine fills the rings with role `fill-faint` under every line. A region without samples draws nothing and raises an `unsampled_region` issue.
  - A region's optional `boundary` lists the line or curve parts that draw its edge. Those parts keep their own styling, so a strict inequality's edge is dashed only when that part is marked `hidden_dashed`, and nothing is read from the LaTeX. The engine never shades by color alone: a region with no boundary part and no label raises `region_unmarked`. A region label sits inside the shading.
  - Circles (center plus `radius` or `through`), arcs (the minor arc from `from` to `to` around `center`) and polygons are drawn on a plane in world units, clipped to the frame, in role `ink`, and dashed when marked `hidden_dashed`. On a plane whose x and y scales differ, a circle is drawn as the ellipse it really is, and the `on` check measures against the true circle in world units.
- **Shading, dimensions and free text (planes and shapes):** a `polygon` or `circle` with `shade` (`"shade"`: role `fill-shade`; `"faint"`: `fill-faint`) and a `sector` (the wedge from `center` between `from` and `to`) fill their inside under every line, with no outline of their own. On a plane a fill must lie inside the frame. A `dimension` is a line between two points with an arrowhead at each end, labelled like a side. A `text` part is a spot in the figure's units: a label on it is centered there, not searched for ("pool", "concrete path", the quadrant names I to IV, a point's "(8, 0)" where the original prints it). A plane prints `notToScale` under it like a shape, and any figure but a chart or table may carry a `caption` printed at its foot above the note ("Cylinder A"). When a label finds no free spot around its anchor, it tries the four corners next to it, which clears two lines crossing there.
- **geometry2d:** traced points, in any unit. The engine snaps near-collinear points onto their line and near-concyclic points onto their circle (tolerance 2% of the figure size). It also snaps near-90° angles to 90° when the spec marks them as right angles, normalizes the figure to its box, centers it, and places labels outside the shape at the bisector of the free angle, stepping clear of every line and other label.
- **solid3d:** dimensions plus an optional camera. Every solid is drawn the way Bluebook draws it, measured from the real exam figures in the review pipeline (`src/lib/figures/engine/solid-camera.ts` and `solid-draw.ts` name the image behind each rule). Hidden edges are dashed. The solid is stored as a 3D model (vertices, edges and faces), so rotating it and unfolding it into a net are later extensions.
  - The view is orthographic, never oblique: a circle prints as a level ellipse centered under the apex. The default camera is each shape's Bluebook view: cylinders, cones and spheres look down at asin(1/3), so circles flatten to 1/3 (every Bluebook cylinder measures 0.33 to 0.34); the pyramid is Bluebook's own (turn 29°, tilt 50°, lean -21°: front corner down, length up to the left, width up to the right), seen lower when it is squat so the apex stays clear above the back corner. A spec sets `view: { turn, tilt, lean }` (degrees) to match a particular figure; Bluebook's cones range from a 0.10 to a 0.56 flattening. No prism appears in the real figures checked; its default (turn 29°, tilt 24°) awaits one.
  - A cone's sides and a cylinder's sides are the exact silhouette lines, tangent to each ellipse at the true points, and each circle is split there: the dashed back of a cone's base runs between the two points its sides touch.
  - Dimensions use the SAT's words (`SOLID_DIMS` in `spec.ts`): prism `length`, `width`, `height`; cylinder and cone `radius`, `height`; pyramid `baseLength`, `baseWidth`, `height`; sphere `radius`. Each is required and positive, and no others are accepted.
  - A label names one dimension as `on: "<solid id>.<dimension>"` (`"can.radius"`), or a named point as `"<solid id>.<point id>"`. Points (`points: [{ id, at, angle?, dot? }]`) sit at the `apex`, the base `center`, a cylinder's `top`, or on the base or top circle (`rim`, `topRim`) at `angle` degrees (0 right, 90 back, 180 left, 270 front); each is a dot unless `dot: false`.
  - Inner lines are drawn when labeled or listed in `show`: a height dashed from the apex to the base center, a radius solid from a dot at its center to the rim at `radiusAngle` (default: 65° across a cylinder's top, 180° on a cone's base, 0° in a sphere). `right_angle` on `"<solid id>.height"` squares a cone's or pyramid's height against the base.
  - Labels sit as Bluebook places them: an edge's centered off the edge outside the solid, a height's beside its line, a cylinder's height beside its right side, a radius's on the front side of its line, a point's away from the solid. A solid is drawn at most 14 em wide and 15 em tall against the label font, with the not-to-scale note just under it.
  - Not drawn yet: hollow solids (the steel pipe), outside dimension lines with arrows on solids, trirectangular tetrahedra and their cube corner mark, several solids in one figure, and hemispheres.

**One engine** (`src/lib/figures/engine/`) turns a `FigureSpec` into an SVG description (pure function, no DOM). A React component then renders it. Fixed house rules:

- stroke widths: 1.5 for lines, 1 for grid, 1.25 for dashed lines;
- font: the site's math font at 15px, scaled with the figure, never below 12px on screen;
- label offset of 6px;
- arrowhead size;
- tick length (axis ticks), and a 30% longer tick for equal sides;
- margins;
- bars: a lone series fills 40% of its category band, a group of series 60%. Bars in a group touch, as histogram bins do, with no gap; the space between category groups stays. Every edge two bars or bins share gets a separator line in the `paper` role (the frame's own surface), drawn only where both sides are filled, so neighbours stay distinct in light and dark without relying on color; the legend swatches carry which series is which (founder, 2026-11-01). The rects keep their exact size, so values read exactly.

Specs cannot set colors or pixel sizes. Colors come from theme roles: `ink`, `ink-muted`, `grid`, `fill-faint`, `fill-shade`, `highlight` and `paper`. These map to CSS variables, so light, dark and future themes all work. The variables live in `src/components/learn/figures/figure-roles.css`, which `FigureView` imports. They are derived from the theme tokens (`--k-ivory` for ink, never the canvas `--k-night`; `paper` is the figure frame's surface, `--k-surface`, used only for the separator between touching bars) under `:root:root`, so they outrank the older figure variables in `src/app/globals.css`, which stays unchanged.

**Automatic checks** (in the engine, in `k figures submit`, and in certify):

- every label in the original's transcription is present, and none is invented;
- every point declared on a line or circle lies on it (a point's `on` lists the segments, rays, lines, circles, arcs, polygons or functions it lies on);
- nothing overlaps (label to label, label to line or curve, measured on the drawn curve) and nothing is clipped;
- an angle's label sits inside its angle (`label_drift`), and every label the spec gives is drawn;
- every `function` curve passes through every point the spec says it passes through;
- `ray` and `line` parts end in arrowheads (a line marked `arrows: false` never does), and `segment` parts don't;
- every shaded `region` has samples, and a boundary part or a label, so shading never carries meaning by color alone;
- hand-written `figure_svg` is refused for new figures.

A figure that fails goes back to its reviewer and never reaches the founder.

## Section 2: Tables, figure answer choices, devices

**Tables:**

- one header style and one rule weight;
- numbers aligned on the decimal point and text left-aligned, with column widths computed by the engine;
- a blank top-left corner when the exam has one;
- merged cells and the title placed as in Bluebook;
- cell math typeset like question text.

The existing `figure_table_data` and `choice_table_data` convert to `type: table` specs mechanically (`tableDataToSpecs`). One exception: the importer stored some questions that print two separate tables as one table, side by side, each table's name a merged heading over its columns (question 48122737: "Data Set A" and "Data Set B", each over "Value | Frequency"; the row's own `raw_question_text` shows two tables). When every column sits under a named heading, there is no caption, and each heading spans the very same column headings, the data is split back into one table per heading, titled by it, stacked like any list of figures. A real merged heading (a blank corner, then "Grade level" over the grades) never repeats its columns and stays one table.

**Figure answer choices.** When the choices are graphs, tables, charts or shapes, each choice holds its own `FigureSpec`, or a list of them, drawn stacked inside the choice (a table is drawn only as a choice's one figure, on the table-choice path). Choices in one question share the same frame (ranges, scale and size). A certify check refuses any question whose choices name a figure ("Graph A", "Table B") without drawing one.

**Devices:**

- Every figure is drawn to scale with its container (SVG `viewBox`). Labels keep a minimum readable size. On a phone, a wide figure grows taller rather than shrinking its text.
- On phones, figure choices stack one per row, with the letter beside each and the whole choice tappable. On tablets and laptops they form a 2×2 grid when they fit.
- Wide tables scroll sideways inside their own frame, and the page itself never scrolls sideways. Figures are centered with consistent spacing above and below.
- Contrast meets WCAG AA in every theme. Each figure gets an accessible description generated from its named parts, for example "Triangle ABC, right angle at C, AB = 13". Shading and highlights are never shown by color alone: a pattern or label goes with them.
- The quiz-engine refresh (branch `claude/quiz-engine`) hosts these figures, and its pencil draws over them. The engine exposes each part's position so the pencil and future tools can find them.

## Section 3: Rollout and testing

**Build order:**

1. Engine core with plane and function graphs, lines, rays and segments, and labels.
2. geometry2d, including marks and snapping.
3. Charts (replaces the drawing in `ChartFigure.tsx`).
4. Tables (replaces `QuestionTable.tsx` drawing).
5. solid3d.
6. Figure answer choices.

Each step replaces the old renderer for that type in the same change, and removes the old code once nothing uses it (replace, don't accumulate).

**Data:**

- A new `figure_spec jsonb` column on `quiz_questions`, plus `choice_figure_spec jsonb` on `answer_choices`. Both are additive.
- Either column holds one `FigureSpec`, or an ordered list of 1 to 4 of them (`MAX_FIGURES`) when the question prints more than one figure, which is normal (two tables, a graph and a table). `parseFigureSpecs` validates either form; in a list each error names its figure ("figure 2: ..."), and one invalid figure makes the whole value invalid, so a partial set is never drawn. The Zod-free `storedSpecList` and `storedSpecTypes` (`spec-types.ts`) read the shape before the engine loads. Several figures are drawn as separate figures stacked top to bottom with an even gap (`data-figure-stack`), each with its own title, note and accessible description; tables are never merged or set side by side. The calculator's table transfer control goes on the first table. The checks build and check each figure on its own and compare the labels once against every figure's texts (`checkSpecs`), and `render-all` reports any two figures of one question that share a row (`side_by_side`).
- The renderer prefers `figure_spec` when present, and old fields stay readable until every figure is migrated. After that, `figure_svg`, `figure_geometry_data` and `figure_graph_data` are dropped in one migration with a tested rollback.

**Reviewer workflow:**

- Reviewers write `figure.json` as a `FigureSpec` instead of SVG (`figure_spec`, or `choice_figure_spec` on each answer choice), with `transcribed_labels` beside each spec: every text printed in the original figure, repeats included.
- `k figures submit` runs the engine checks and renders a snapshot.
- The founder reviews at `/dev/figure-review`: original (inverted) beside the engine render.
- Approval and publishing are unchanged, under the standing OK for check-passing rows.

**Redraw order:**

1. The ~786 figures waiting for the founder.
2. Live figures, in batches of about 100 by type (tables first, since they convert mechanically, then charts, planes, geometry and solids).

Each live batch is rendered, passes every check, and is shown to the founder before the swap. The old figure fields are kept for rollback until the batch is approved.

**Testing:**

- unit tests per part type and per house rule (arrowheads, snapping, label placement);
- golden SVG tests for about 30 representative figures;
- Playwright renders of every migrated figure at phone (390×844), tablet (820×1180) and laptop (1280×800), in light and dark, checking for overlap, clipping and minimum text size;
- an accessibility check for contrast and descriptions;
- certify runs the figure checks over the whole live bank.

## Out of scope now

- The tutoring tools themselves (shading, rotation, nets, step-through).
- Calculator changes.
- Karman-original figures.
