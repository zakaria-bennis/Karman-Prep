# Karman marks: four options with their openings

Built 2026-11-01. Open `index.html` over a local server (ES modules do not load from `file://`),
for example `npx serve .impeccable/mocks/redesign/logo`. Nothing here is final until the
founder picks one.

| File | What it is |
| --- | --- |
| `marks.js` | The four marks as SVG strings on a 64-unit grid, one colour, no gradients; `mark(id, {size, color})`, `wordmark(id, {size, prep})`, `favicon(id)` |
| `intro.js` | `startIntro(markId, targetSelector, options)`: the opening, Web Animations API, transform and opacity only, once per session (`sessionStorage` key `karman-intro`) |
| `copy.js` | Every word the gallery shows, in the `## section / label: text` format |
| `index.html` | The gallery: each option at 16, 32, 64 and 240 px, light and dark, marigold, the lockups, a sample header with a Replay button, a Reduced motion switch and the light/dark toggle (rule 33) |
| `favicon-<id>.svg` | One favicon per option, ink in light mode and bone in dark mode; rebuilt by `node build-favicons.mjs` |

The order in `marks.js` (`ORDER`) is the recommendation order: ascent, threshold, answer, fullstop.

## The opening

First visit: the page shows the ground colour; the mark forms over 0.6 s (assembled parts), holds
0.3 s, then flies and shrinks into the header's mark slot over 0.25 s while the page fades in
beneath. Measured end in Chromium: 1146 to 1176 ms. The flying mark lands on the header slot to
0 px. A tap, key, wheel, touch or scroll skips it. Under `prefers-reduced-motion` (or the gallery
switch) it is a 0.3 s fade with no travel. The hero is already in the DOM; the overlay is added
after it, so the first paint is never delayed, and a CSS failsafe restores the page at 1.6 s if the
script never runs.

The Reduced motion switch is 21st.dev component 37311 (bysages/switch), ported to plain HTML and
recoloured with Karman's tokens.
