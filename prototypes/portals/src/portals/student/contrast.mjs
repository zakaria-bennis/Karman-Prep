// WCAG 2.1 contrast for the colour pairs the student portal adds on top of the
// design system's tokens (scripts/contrast.mjs covers every token on every
// surface). These are the compound surfaces: a selected choice row (accent at
// 10 percent over the panel), the tinted wells (raised at 40 and 60 percent
// over the panel), the highlighter (accent at 28 percent), the right and wrong
// letter discs (the status ink on its tint, a 20px icon so 3:1), the set
// strip's cells and the ladder's 11px rung labels. All 12 themes, both modes.
// Exits 1 under the floor. Run: node src/portals/student/contrast.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const data = JSON.parse(readFileSync(fileURLToPath(new URL("../../design-system/themes.json", import.meta.url)), "utf8"));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (top, under, t) => top.map((x, i) => Math.round(x * t + under[i] * (1 - t)));

let fails = 0;
const rows = [];
const check = (theme, text, surface, a, b, floor = 4.5) => {
  const r = ratio(a, b);
  if (r < floor) fails++;
  rows.push(`${r < floor ? "FAIL" : "ok  "} ${theme.padEnd(12)} ${text.padEnd(28)} on ${surface.padEnd(30)} ${r.toFixed(2)}:1 (floor ${floor})`);
};

for (const t of data.themes) {
  const s = data.status[t.dark ? "dark" : "light"];
  const canvas = rgb(t.canvas), surface = rgb(t.surface), raised = rgb(t.raised);
  const panel = mix(surface, canvas, 0.92);
  const text = rgb(t.text), muted = rgb(t.muted), accent = rgb(t.accent);
  const positive = rgb(s.positive), negative = rgb(s.negative);
  const selected = mix(accent, panel, 0.1);
  const well40 = mix(raised, panel, 0.4);
  const well60 = mix(raised, panel, 0.6);
  const hl = mix(accent, panel, 0.28);
  const sel45 = mix(accent, panel, 0.45);
  check(t.id, "text (choice, selected)", "accent 10% over panel", text, selected);
  check(t.id, "muted (crossed-out choice)", "raised 40% over panel", muted, well40);
  check(t.id, "text (choice row)", "raised 40% over panel", text, well40);
  check(t.id, "muted (taken slot, 14px)", "raised 60% over panel", muted, well60);
  check(t.id, "text (highlighted passage)", "accent 28% over panel", text, hl);
  check(t.id, "text (live selection)", "accent 45% over panel", text, sel45, 3);
  check(t.id, "positive-ink check (20px icon)", "positive-bg disc", rgb(s.positiveInk), rgb(s.positiveBg), 3);
  check(t.id, "negative-ink cross (20px icon)", "negative-bg disc", rgb(s.negativeInk), rgb(s.negativeBg), 3);
  check(t.id, "positive (disc border)", "panel", positive, panel, 3);
  check(t.id, "accent (set strip right cell)", "panel", accent, panel, 3);
  check(t.id, "negative (set strip wrong cell)", "panel", negative, panel, 3);
  check(t.id, "muted (ladder rung label 11px)", "panel", muted, panel);
  check(t.id, "accent-ink (day chip)", "accent", rgb(t.accentInk), accent);
  check(t.id, "positive (gain line, 14px)", "panel", positive, panel);
  check(t.id, "notice (timer under 10 s)", "panel", rgb(s.notice), panel);
}
console.log(rows.join("\n"));
console.log(`${rows.length} pairs, ${fails} under the floor`);
process.exit(fails ? 1 : 0);
