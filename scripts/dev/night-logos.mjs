// Makes the dark-mode versions of the school logos that have more than one colour, from the same files
// in public/site/schools (Wikimedia Commons, see SOURCES.json there). Nothing is redrawn: only colours
// change, the way each school's own "reversed" logo does it. Dark type and outlines become cream; the
// school's colour stays wherever it carries white detail (a shield, a seal) or already reads on dark.
// One-colour logos need no file: the page turns them white itself (`night: "white"` in schools.ts).
// Usage: node scripts/dev/night-logos.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const DIR = "public/site/schools";
const CREAM = "#fffaf3";
const PILL = "#1d1a22";

/** Per logo: colours that must stay, and whether white detail turns dark (pure black-and-white art). */
const LOGOS = {
  harvard: { keep: ["#a51c30"] },
  princeton: { flip: true },
  florida: {},
  illinois: {},
  unc: {},
  michigan: {},
  georgetown: {},
  notredame: { keep: ["#0279a0", "#25408f", "#e3961b", "#7b6210", "#000066", "#ae8f3f"] },
  /* the torch box stays purple; only the three letters turn cream */
  nyu: { keep: ["#4f2987"], cream: ["path22", "path24", "path26"] },
};

const hex6 = (c) => {
  const h = c.slice(1).toLowerCase();
  return "#" + (h.length === 3 ? [...h].map((x) => x + x).join("") : h);
};
const rgb = (c) => [1, 3, 5].map((i) => parseInt(hex6(c).slice(i, i + 2), 16) / 255);
const lum = (c) => {
  const [r, g, b] = rgb(c).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const sat = (c) => {
  const v = rgb(c);
  const mx = Math.max(...v);
  return mx ? (mx - Math.min(...v)) / mx : 0;
};
const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

mkdirSync(`${DIR}/night`, { recursive: true });
for (const [name, rule] of Object.entries(LOGOS)) {
  const keep = (rule.keep ?? []).map(hex6);
  let svg = readFileSync(`${DIR}/${name}.svg`, "utf8");
  svg = svg.replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, (c) => {
    const h = hex6(c);
    if (keep.includes(h)) return h;
    if (lum(h) > 0.8) return rule.flip ? PILL : h;
    if (sat(h) < 0.2) return CREAM;
    return contrast(h, PILL) >= 3.4 ? h : CREAM;
  });
  for (const id of rule.cream ?? [])
    svg = svg.replace(new RegExp(`(id="${id}"[^>]*?fill:)#[0-9a-f]{6}`), `$1${CREAM}`);
  /* shapes with no colour of their own are black by default: they are type and outlines too */
  svg = svg.replace(/<svg\b([^>]*)>/, (m, attrs) =>
    /\sfill=/.test(attrs) ? m : `<svg${attrs} fill="${CREAM}">`
  );
  writeFileSync(`${DIR}/night/${name}.svg`, svg);
  console.log("wrote", `${DIR}/night/${name}.svg`);
}
