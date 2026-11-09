// The site's panels over the film (founder, 8 November): every text colour on a tinted panel must pass
// WCAG AA whatever frame of the film is behind it. The panel is paper at --tint opacity; the worst frame is
// pure black or pure white behind it, so each pair is checked over both. Run: node scripts/site/card-contrast.mjs
const TINT = 0.92; // film.css --tint
const MODES = {
  light: {
    paper: "#f5f5f2",
    text: { ink: "#12110f", ink2: "#57534b", "marigold-ink": "#7a4e06" },
    large: {},
  },
  dark: {
    paper: "#151412",
    text: { ink: "#f1ede4", ink2: "#b6b0a4", "marigold-ink": "#f0b545" },
    large: {},
  },
};
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const lum = (c) => {
  const [r, g, b] = c.map((v) =>
    (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const over = (fg, a, bg) => fg.map((v, i) => v * a + bg[i] * (1 - a));
let fail = 0;
for (const [mode, m] of Object.entries(MODES)) {
  const panels = [
    [0, 0, 0],
    [255, 255, 255],
  ].map((bg) => over(hex(m.paper), TINT, bg));
  for (const [kind, set, need] of [
    ["text", m.text, 4.5],
    ["large", m.large, 3],
  ])
    for (const [name, c] of Object.entries(set)) {
      const worst = Math.min(...panels.map((p) => ratio(hex(c), p)));
      const ok = worst >= need;
      if (!ok) fail++;
      console.log(
        `${ok ? "pass" : "FAIL"}  ${mode.padEnd(5)} ${kind.padEnd(5)} ${name.padEnd(26)} ${worst.toFixed(2)} : 1 (needs ${need})`
      );
    }
}
// the header and the marigold button sit on the same panel or are opaque: words on marigold
console.log(
  `pass  both  text  black on marigold          ${ratio(hex("#0b0b0b"), hex("#eba21f")).toFixed(2)} : 1 (opaque)`
);
process.exit(fail ? 1 : 0);
