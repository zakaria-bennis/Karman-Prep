# Figure engine: one standard for every figure (design)

Status: sections 1 and 2 approved by the founder on 2026-10-27. Section 3 (rollout and testing) was written for the 2026-10-31 first pass, which the founder asked to run without stopping. He reviews the whole document in the first-pass summary.

## Why

Of the figures waiting for the founder, about 510 are hand-written SVG with hard-coded colors. That is why their spacing, centering and colors are inconsistent and ignore the theme. About 145 geometry figures use `src/lib/figures/geometry-svg.ts`, which only knows points, segments and polygons. It has no rays, full lines, arrowheads, angle arcs or tick marks, so rays come out as segments. About 140 charts use `ChartFigure.tsx`. Function graphs, coordinate planes and 3D solids have no tool at all.

Goal: every figure in the bank, and every figure answer choice, is drawn by one in-house engine from a short description. The output looks like the Digital SAT (Bluebook) and takes its colors from the student's theme.

## Founder decisions

| Topic | Decision |
|---|---|
| Look | Exactly like Bluebook: thin lines, plain labels, light grid. All colors come from the theme and are never typed into a figure. |
| Where shapes come from | Option C. Graphs, coordinate planes and charts are computed from their data or equation. 2D geometry and 3D solids are traced from the original and then cleaned up. |
| Future tutoring tools | Design for them now and build them later. Parts are named, and solids are stored as real 3D shapes, so shading, rotating, unfolding into nets and highlighting can be added without redrawing. |
| Existing figures | Redraw everything in stages: first the ~650 waiting for approval, then the live figures in batches. Each batch is checked and shown to the founder before it replaces the old one. |
| Approach | Option 1: our own engine (no JSXGraph, Mafs, D3 or three.js). Graph curves use the calculator's formula reader and plot math (`src/lib/calculator/core`, `src/lib/calculator/plot`) read-only. The calculator itself is not changed. |
| Tables | Same engine, same theme and the same rules. |
| Figure answer choices | Each choice is its own drawn figure. Text placeholders like "Graph A" are never allowed. The four choices share one scale, axes and size. |
| Devices | Readable and accessible on phone, tablet and laptop (Section 2). |

## Section 1: Figure format and engine

**One format, `FigureSpec` (JSON, versioned `figure-spec/1`).** It has:

- `type`: `table | bar | line | scatter | dot_plot | histogram | box_plot | plane | geometry2d | solid3d`.
- `parts`: named elements, each with an `id` you could point at later. Examples: `point A`, `segment AB`, `ray AB` (a start point and a direction point, with an arrowhead), `line AB` (arrowheads at both ends), `circle O`, `arc`, `angle ABC`, `polygon`, `function f` (with an expression), `region` (shaded inequality or area), `axis`, `grid`, and the solids `prism`, `cylinder`, `cone`, `pyramid` and `sphere`.
- `labels`: exam wording (`x°`, `12`, `Figure 1`), each attached to the part it describes.
- `marks`: the SAT's conventions, namely right-angle box, equal-length ticks, equal-angle arcs, parallel arrows, dashed hidden edges, and the line "Note: Figure not drawn to scale."
- `frame`: for planes, the axis ranges, grid step and axis labels. For geometry, nothing: the engine fits and centers the drawing.

**Where coordinates come from (option C).**

- **plane, charts and tables:** exact data or equations. `function` parts are parsed and sampled with the calculator's own formula reader and plotting math, which handles domains, gaps, asymptotes and adaptive sampling. A ray or line on a plane is clipped to the frame and gets arrowheads.
- **geometry2d:** traced points, in any unit. The engine snaps near-collinear points onto their line and near-concyclic points onto their circle (tolerance 2% of the figure size). It also snaps near-90° angles to 90° when the spec marks them as right angles, normalizes the figure to its box, centers it, and places labels outside the shape at the bisector of the free angle, stepping clear of every line and other label.
- **solid3d:** dimensions plus the view (`oblique`, the SAT's default, at 30° and half-depth, or `isometric`). Hidden edges are dashed. The solid is stored as a 3D model (vertices, edges and faces), so rotating it and unfolding it into a net are later extensions.

**One engine** (`src/lib/figures/engine/`) turns a `FigureSpec` into an SVG description (pure function, no DOM). A React component then renders it. Fixed house rules:

- stroke widths: 1.5 for lines, 1 for grid, 1.25 for dashed lines;
- font: the site's math font at 15px, scaled with the figure, never below 12px on screen;
- label offset of 6px;
- arrowhead size;
- tick length;
- margins.

Specs cannot set colors or pixel sizes. Colors come from theme roles: `ink`, `ink-muted`, `grid`, `fill-faint`, `fill-shade` and `highlight`. These map to CSS variables, so light, dark and future themes all work.

**Automatic checks** (in the engine, in `k figures submit`, and in certify):

- every label in the original's transcription is present, and none is invented;
- every point declared on a line or circle lies on it;
- nothing overlaps (label to label, label to line) and nothing is clipped;
- every `function` curve passes through every point the spec says it passes through;
- `ray` and `line` parts end in arrowheads, and `segment` parts don't;
- hand-written `figure_svg` is refused for new figures.

A figure that fails goes back to its reviewer and never reaches the founder.

## Section 2: Tables, figure answer choices, devices

**Tables:**

- one header style and one rule weight;
- numbers aligned on the decimal point and text left-aligned, with column widths computed by the engine;
- a blank top-left corner when the exam has one;
- merged cells and the title placed as in Bluebook;
- cell math typeset like question text.

The existing `figure_table_data` and `choice_table_data` convert to `type: table` specs mechanically.

**Figure answer choices.** When the choices are graphs, tables, charts or shapes, each choice holds its own `FigureSpec`. Choices in one question share the same frame (ranges, scale and size). A certify check refuses any question whose choices name a figure ("Graph A", "Table B") without drawing one.

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
- The renderer prefers `figure_spec` when present, and old fields stay readable until every figure is migrated. After that, `figure_svg`, `figure_geometry_data` and `figure_graph_data` are dropped in one migration with a tested rollback.

**Reviewer workflow:**

- Reviewers write `figure.json` as a `FigureSpec` instead of SVG.
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
