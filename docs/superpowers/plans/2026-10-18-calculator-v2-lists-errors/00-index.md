# Calculator v2: Desmos-style errors and lists (2026-10-18)

Founder request (2026-10-18, with a Desmos screenshot): rows with errors show only an orange
warning triangle in the gutter, with the reason in a tooltip on hover; errors name their real
cause; list syntax such as `x_1=[1...10]` works and shows its value as a row of boxed elements;
`[x_1,x_1]\sim[y_1,y_1]` is the error "Cannot store a list of numbers in a list.". The founder
allowed matching Desmos's visual design and behaviour (CLAUDE.md, calculator section); Desmos's
files, code, logo and name stay off limits, and nothing is fetched from desmos.com.

Two packages, two branches from `main`, two PRs. They touch disjoint files and run in parallel.

## Package A: error marker, tooltip, value boxes (UI)

Branch `zakaria/calculator-v2-error-tooltip`. Spec items R-2, R-5, NM-38 display, appendix F
list requirements 14, 15, 17, 18, 22.

1. The warning marker (our own SVG: rounded orange triangle, white `!`) replaces the colour tab
   in the gutter of an error row.
2. The message lives in a black tooltip under the marker: hover (no delay), keyboard focus, tap
   toggles; pointer leave, blur, Escape (KB-3 layer) and outside press close it. Rendered in a
   root layer so `.kc-row-inner { overflow: hidden }` cannot clip it.
3. No inline message; `aria-invalid` and `aria-describedby` on the textbox stay (A11Y-3), the
   A11Y-2 announcer is unchanged.
4. Table cells and headers render their computed warnings the same way (nothing rendered them).
5. The evaluation line is a muted `=` and the value in a small box; a list value is one box per
   element, the first 30 then `…`.

## Package B: lists and Desmos error wording (core)

Branch `zakaria/calculator-v2-lists`. Spec items PR-34 (literals, `[]`, ranges), NM-32 to NM-36,
NM-38 (formatting), RC-6 (list definitions show their value), D-22 (lists as regression data),
G-3 subset (a point whose parts are lists plots as points). Deferred to a later package unless
cheap: indexing, slicing, filtering, comprehensions (NM-30, NM-31, NM-37), list-valued curves
(G-22), and list functions (mean, total, …).

Error wording moves to Desmos's text where appendix F recorded it: nested list
"Cannot store a list of numbers in a list."; `\sim` with an empty side "You need something on
both sides of the '∼' symbol."; duplicate definition "You've defined 'm' in more than one place.
Try deleting some of the definitions of 'm'.".

## Sequence

A and B are dispatched together (Sonnet for A, Opus for B); the orchestrator reviews each diff,
iterates, runs the browser suite once on each branch, then opens the two PRs into `main`.
