# Released-exam figures

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

PDF annotations can cover original questions and relabel their numbers while the
text layer and original answer key remain unchanged. Preserve both the original
base rendering (for example, `pdftoppm -hide-annotations`) and the default annotated
rendering when they disagree. Record the rendering mode in source review and
reconcile original module/question identities with the key before import. A text
match or a default screenshot alone cannot resolve this difference. Keep useful
editorial annotations as evidence; do not change annotations in Box.

## Calculator transfers

Practice calculator transfer rules are in
`docs/superpowers/specs/calculator/c-transfer.md`.

## Duplicate review

Keep repeated source occurrences in an external provenance ledger rather than
inserting duplicate question-bank rows. Compare the entire passage, actual ask,
choices, numeric values and source figures. Text identity alone cannot establish
duplicate identity when either question depends on a figure. Case is meaningful
for mathematical variables. Shared subject matter and shared passages are not
duplicate grounds. Verify alternate choice order and answer mapping before merging
occurrences. Never publish structural extraction output as verified content.
