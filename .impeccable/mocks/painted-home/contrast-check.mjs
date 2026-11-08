// AA contrast for the painted home mock, by calculation (design rule 33).
// Run: node contrast-check.mjs
//
// Every word sits on a tinted panel laid over the painting. The panel's tint follows the painting's hue,
// and the painting can put any color behind it, so each pair is checked over every hue the picker can
// choose (painterly.js: one hue, saturation 38% to 72%) and over the worst pixel behind the panel: pure
// black or pure white. Composite luminance only rises or falls with the pixel behind, so those two are
// the extremes. Product screens and calendar cells are opaque, so they need no backdrop.
// The main button's shade is the one painterly.js picks for white text.

const hsl = (h, s, l) => {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)].map((v) => v * 255);
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const over = (top, a, under) => top.map((v, i) => v * a + under[i] * (1 - a));
const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/* painterly.js, buttonLightness: the darkest step at which white passes. */
function buttonL(h, s) {
  const l = (L) => { const a = (s / 100) * Math.min(L / 100, 1 - L / 100), f = (n) => { const k = (n + h / 30) % 12, v = L / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(0) + 0.7152 * f(8) + 0.0722 * f(4); };
  for (let L = 46; L > 15; L--) if (1.05 / (l(L) + 0.05) >= 4.6) return L;
  return 16;
}
const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
const THEMES = {
  dark: { ink: "#eef0f4", mute: "#b4bbc8", panel: (h) => hsl(h, 24, 9), pa: 0.86, card: [WHITE, 0.045], screen: (h) => hsl(h, 22, 7),
    l1: (h, s) => hsl(h, s * 0.6, 30), l2: (h, s) => hsl(h, s * 0.85, 46), l3: (h, s) => hsl(h, s, 64), l4: (h, s) => hsl(h, s, 84) },
  light: { ink: "#15171c", mute: "#464950", panel: (h) => hsl(h, 28, 95), pa: 0.88, card: [WHITE, 0.55], screen: (h) => hsl(h, 26, 96),
    l1: (h, s) => hsl(h, s, 86), l2: (h, s) => hsl(h, s, 68), l3: (h, s) => hsl(h, s * 0.9, 46), l4: (h, s) => hsl(h, s * 0.8, 28) },
};
const results = [];
const check = (name, need, fn) => {
  let worst = Infinity, at = "";
  for (let h = 0; h < 360; h += 5) for (let s = 38; s <= 72; s += 2) for (const behind of [BLACK, WHITE]) {
    const r = fn(h, s, behind);
    if (r < worst) { worst = r; at = `hue ${h}, saturation ${s}%, ${behind === WHITE ? "white" : "black"} behind`; }
  }
  results.push({ name, need, worst: Math.round(worst * 100) / 100, pass: worst >= need, at });
};
for (const [t, T] of Object.entries(THEMES)) {
  const ink = hex(T.ink), mute = hex(T.mute);
  const panel = (h, b) => over(T.panel(h), T.pa, b);
  const card = (h, b) => over(T.card[0], T.card[1], panel(h, b));
  check(`${t}: words on a panel`, 4.5, (h, s, b) => ratio(ink, panel(h, b)));
  check(`${t}: quiet words on a panel`, 4.5, (h, s, b) => ratio(mute, panel(h, b)));
  check(`${t}: words on a card`, 4.5, (h, s, b) => ratio(ink, card(h, b)));
  check(`${t}: quiet words on a card`, 4.5, (h, s, b) => ratio(mute, card(h, b)));
  check(`${t}: words on a product screen`, 4.5, (h) => ratio(ink, T.screen(h)));
  check(`${t}: quiet words on a product screen`, 4.5, (h) => ratio(mute, T.screen(h)));
  check(`${t}: Daily 10 done line`, 4.5, (h) => ratio(ink, over(ink, 0.07, T.screen(h))));
  check(`${t}: "Last time: missed" tag`, 4.5, (h, s) => ratio(ink, over(T.l3(h, s), 0.22, T.screen(h))));
  check(`${t}: next session card`, 4.5, (h, s) => ratio(ink, over(T.l3(h, s), 0.16, T.screen(h))));
  check(`${t}: next session, quiet line`, 4.5, (h, s) => ratio(mute, over(T.l3(h, s), 0.16, T.screen(h))));
  check(`${t}: Check button (not yet active)`, 4.5, (h) => ratio(mute, over(ink, 0.1, T.screen(h))));
  check(`${t}: Word Lab highlight`, 4.5, (h, s) => ratio(ink, over(T.l3(h, s), 0.3, T.screen(h))));
  check(`${t}: today on the calendar`, 4.5, (h) => ratio(T.screen(h), ink));
  check(`${t}: Wordline right letter`, 4.5, (h, s) => ratio(T.screen(h), T.l4(h, s)));
  check(`${t}: Wordline letter in the word`, 4.5, (h, s) => ratio(ink, t === "dark" ? T.l1(h, s) : T.l2(h, s)));
  check(`${t}: skip link`, 4.5, (h) => ratio(T.screen(h), ink));
}
check("both: white on the main button (painting's shade)", 4.5, (h, s) => ratio(WHITE, hsl(h, s, buttonL(h, s))));
results.push({ name: "both: white on the main button before the painting loads", need: 4.5, worst: Math.round(ratio(WHITE, hsl(208, 55, 38)) * 100) / 100, pass: ratio(WHITE, hsl(208, 55, 38)) >= 4.5, at: "hsl(208 55% 38%)" });
let failed = 0;
for (const r of results) { if (!r.pass) failed++; console.log(`${r.pass ? "pass" : "FAIL"}  ${r.worst.toFixed(2)} (needs ${r.need})  ${r.name}  [worst: ${r.at}]`); }
console.log(failed ? `\n${failed} pair(s) fail.` : `\nAll ${results.length} pairs pass AA in both themes, over every hue and the worst pixel behind.`);
process.exit(failed ? 1 : 0);
