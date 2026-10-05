# Released-exam figures and practice calculator transfers

User decisions, October 5, 2026: recreate source figures with crisp native text,
balanced label spacing and explicit angle arcs. Keep Box read-only. Perform all
editing and review in the staging workspace outside Box. Do not call paid model
APIs for these imports. Exact copied questions must not create bank rows; a shared
passage with a different actual question remains a separate question.

## Geometry recreation

Reviewed `figure_geometry_data` can opt into `layout_version: "balanced-v1"`.
Points may have an internal `id` that is never printed as a vertex name. Preserve
source coordinates, printed lengths, visible labels, right-angle markings and
not-to-scale notes. Length labels have equal perpendicular center offsets from
their segments. An angle requires `at_vertex` and `between_vertices` identifying
both rays; the renderer draws an arc and places the text on the bisector.

This version supports explicit points, line segments, triangles, quadrilaterals
and polygons. It rejects missing coordinates, conflicting references, unresolved
markings, unsupported shapes and falsely claimed right angles. Circles and curves
need their own source-verified representation; do not convert them to polygons.
An invalid recreation falls back to the attached source image in the quiz.
Legacy geometry retains its existing layout.

Source comparison and phone/desktop visual review remain required per figure.
Renderable SVG alone does not establish source fidelity, absence of collisions,
correct categorization or a correct answer. Keep the original figure, source
identity, page/region and recreation review record with the import evidence.
Never infer mathematical values from a not-to-scale drawing.

## Desmos transfers

The setting lives in the math quiz **Menu**, on by default during practice. A
student can turn it off; the browser remembers the preference when storage is
available. The calculator displays transfer buttons, not a second settings toggle.
Students explicitly click to add an item. Stable expression IDs prevent repeated
clicks from creating additional copies, and existing manual work is retained when
minimizing or switching calculator modes.

Transfers read the student question givens only: explicitly delimited equations,
numeric native x–y tables, and numeric coordinate pairs described as points.
No answer choices, answer keys, explanations, geometry pixel coordinates or
inferred chart series are used. Unsupported or ambiguous expressions are omitted;
there is no automatic solving, curve fitting or interpolation. Fractions in tables
retain their exact values. Scientific mode requires switching to Graphing to
transfer. Desmos's supported `invertedColors` option supplies its dark appearance;
Karman controls the surrounding responsive window.

`QuizEngine` accepts `sessionMode="realistic"`, which locks the menu switch off
and omits transfer actions regardless of the practice preference. Current callers
are adaptive practice; a future realistic timed-exam caller must explicitly pass
this mode. This change does not implement a complete timed-exam runner.

The existing public demo API key shows a **Desmos Trial Key** banner. A registered
`NEXT_PUBLIC_DESMOS_API_KEY` and appropriate production license are still needed
before shipping the embed as a polished production feature. Do not hide licensing
UI or purchase a plan automatically. API reference:
[Desmos v1.10 documentation](https://www.desmos.com/api/v1.10/docs/index.html).

## Duplicate review

Keep repeated source occurrences in an external provenance ledger rather than
inserting duplicate question-bank rows. Compare the entire passage, actual ask,
choices, numeric values and source figures. Text identity alone cannot establish
duplicate identity when either question depends on a figure. Case is meaningful
for mathematical variables. Shared subject matter and shared passages are not
duplicate grounds. Verify alternate choice order and answer mapping before merging
occurrences. Never publish structural extraction output as verified content.
