// Karman marks: four options, all code (SVG on a 64-unit grid), one colour each (currentColor),
// no gradients, no raster. Each part carries data-part so intro.js can assemble it with
// transform and opacity only. Ids and masks are avoided on purpose so the same mark can appear
// many times on one page without clashes.
//
// Order is the recommendation order.

const BOX = 'viewBox="0 0 64 64"';

export const MARKS = {
  // 1. Ascent: one stroke rises from the ground and levels off at the top, the Karman line.
  //    A score going up, and the line where space begins, in one shape a parent reads at once.
  ascent: {
    name: "Ascent",
    sentence:
      "One stroke climbs and levels off at the top: a score going up until it reaches the line where space begins.",
    parts: {
      rise: '<polygon points="2,48 18,48 39,27 34,16"/>',
      level: '<polygon points="34,16 62,16 62,27 28,27"/>',
    },
    origins: { rise: "0% 100%", level: "0% 50%" },
  },

  // 2. Threshold: a solid disc split by a thin gap near the top. Below the gap, the ground; above
  //    it, space. The gap is the Karman line, 100 km up, the company's name drawn as a horizon.
  threshold: {
    name: "Threshold",
    sentence:
      "A disc cut by one thin line near the top: the ground below, space above, the Karman line between them.",
    parts: {
      ground: '<path d="M4.9 25A28 28 0 1 0 59.1 25Z"/>',
      cap: '<path d="M7.2 19A28 28 0 0 1 56.8 19Z"/>',
    },
    origins: { ground: "50% 50%", cap: "50% 50%" },
  },

  // 3. Answer: the answer bubble on test day, filled in, with a K cut out of it. The one object
  //    every student meets on the SAT, and the letter is Karman's.
  answer: {
    name: "Answer",
    sentence:
      "The filled-in answer bubble from test day, with Karman's K cut out of it: the choice a student makes on the morning that counts.",
    parts: {
      ring: '<circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" stroke-width="5"/>',
      fill: '<path fill-rule="evenodd" d="M2 32A30 30 0 1 0 62 32A30 30 0 1 0 2 32ZM19 15H27V21L33 15H44L27 32L44 49H33L27 43V49H19Z"/>',
    },
    origins: { ring: "50% 50%", fill: "50% 50%" },
    landing: "fill",
  },

  // 4. Full stop: a heavy K and a square full stop after it. The finish line: the last question
  //    answered, the sentence closed, the SAT done.
  fullstop: {
    name: "Full stop",
    sentence:
      "A heavy K and a square full stop after it: the finish line, the last question answered and the sentence closed.",
    parts: {
      k: '<polygon points="6,6 18,6 18,19 31,6 48,6 18,36 40,58 23,58 18,53 18,58 6,58"/>',
      dot: '<rect x="46" y="46" width="12" height="12"/>',
    },
    origins: { k: "50% 50%", dot: "50% 50%" },
  },
};

export const ORDER = ["ascent", "threshold", "answer", "fullstop"];

/** One mark as an inline SVG string. size is a CSS length (number = px); color is any CSS colour
 *  (default currentColor, so the mark takes the text colour of its parent). */
export function mark(id, { size = 24, color = "currentColor", cls = "", label = "" } = {}) {
  const m = MARKS[id];
  if (!m) throw new Error(`Unknown mark: ${id}`);
  const s = typeof size === "number" ? `${size}px` : size;
  const parts = Object.entries(m.parts)
    .map(
      ([name, svg]) =>
        `<g data-part="${name}" style="transform-box:fill-box;transform-origin:${m.origins[name]}">${svg}</g>`,
    )
    .join("");
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg ${BOX} width="${s}" height="${s}" fill="${color}" style="color:${color};display:block;flex:none" class="k-mark-svg ${cls}" data-mark-id="${id}" ${aria}>${parts}</svg>`;
}

/** The four marks by id, as plain SVG strings (what the brief calls "the four SVG strings by id"). */
export const SVG = Object.fromEntries(ORDER.map((id) => [id, mark(id, { size: 64 })]));

/** The header lockup: the mark in a square slot, then "Karman" in Hanken Grotesk 800 at `size` px
 *  with the mock's tracking (-0.035em). `prep` adds "Prep" after the name, lighter and smaller.
 *  Returns an HTML string; the element with data-mark is the slot intro.js lands on. */
export function wordmark(id, { size = 23, prep = false, href = "#", color = "currentColor", tag = "a" } = {}) {
  const slot = Math.round(size * 0.88);
  const t = tag === "a" ? `a href="${href}"` : tag;
  return `<${t} class="k-lockup" data-lockup="${id}" style="color:${color};font-size:${size}px">` +
    `<span class="k-slot" data-mark style="width:${slot}px;height:${slot}px">${mark(id, { size: slot })}</span>` +
    `<span class="k-word">Karman${prep ? '<span class="k-prep">Prep</span>' : ""}</span>` +
    `</${tag}>`;
}

/** Favicon file contents for one mark: the mark alone on a transparent ground, ink in light
 *  mode and bone in dark mode via the SVG's own media query. */
export function favicon(id) {
  const m = MARKS[id];
  const body = Object.values(m.parts).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" ${BOX} fill="#12110f">` +
    `<style>@media (prefers-color-scheme: dark){svg{fill:#f1ede4;color:#f1ede4}}svg{color:#12110f}</style>` +
    `${body}</svg>\n`;
}

/** The CSS the lockup needs. Inject once per page. */
export const LOCKUP_CSS = `
.k-lockup{display:inline-flex;align-items:center;gap:.36em;font-family:"Hanken Grotesk",system-ui,sans-serif;font-weight:800;letter-spacing:-0.035em;line-height:1;text-decoration:none;color:inherit;min-height:44px}
.k-lockup .k-slot{display:inline-flex;align-items:center;justify-content:center;flex:none}
.k-lockup .k-word{white-space:nowrap;display:inline-flex;align-items:baseline;gap:.26em}
.k-lockup .k-prep{font-weight:500;font-size:.72em;letter-spacing:-0.01em}
.k-lockup[data-intro-wait] .k-slot{opacity:0}
`;
