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

### Package B as built

- Ranges are list nodes with `range: true` (items are the bounds), so every tree walker, the UI's
  `speech.ts` included, keeps compiling; `speech.ts` still reads `[1...10]` as "list 1 10" and
  could say "1 through 10" in a UI follow-up.
- Run-time list errors (a nested list a function returns, a range over 10,000 elements or with a
  zero step, numbers mixed with points) come back as an undefined value with an `error` code;
  `buildRowView` shows that code's message as the row's error. Analysis reports the same errors
  when the rows show them (list literals, list names, literal ranges).
- New row error codes: `sim-side`, `nested-list`, `list-too-long`, `range-step`, `list-mixed`.

### Deferred

Each shows the `unsupported` row error "{thing} isn't supported yet." (R-2):

- Indexing `L[i]` (NM-30): "Indexing a list isn't supported yet."
- Slicing `L[i...j]` (NM-31): "Slicing a list isn't supported yet."
- Filtering `L[c]` (NM-31): "Filtering a list isn't supported yet."
- Comprehensions `[e\operatorname{for}n=L]` (NM-37): "Building a list with 'for' isn't supported yet."
- List-valued curves, line sets and regions, including a one-parameter function whose body is a
  list (G-22): "Graphing a list of curves isn't supported yet."
- List functions (mean, total, sort, …): still the PR-9 unshipped-built-in `unsupported` message.

## Sequence

A and B are dispatched together (Sonnet for A, Opus for B); the orchestrator reviews each diff,
iterates, runs the browser suite once on each branch, then opens the two PRs into `main`.
