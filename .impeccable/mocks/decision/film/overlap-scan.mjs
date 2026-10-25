// Scroll the landing page in steps and report visible text or cards that overlap each other, and any
// moment with more than one highlighted (marigold) button on screen. The header is fixed and the page
// scrolls under it, so only overlaps inside the page count.
// Needs the preview server on :8765. Usage: node overlap-scan.mjs [width] [height] [steps]
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/playwright/index.mjs";
const [w = 1440, h = 900, n = 120] = process.argv.slice(2).map(Number);
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto("http://127.0.0.1:8765/film/index.html?rec=1");
await p.waitForTimeout(2000);
const max = await p.evaluate(() => window.__max());
const problems = [];
for (let i = 0; i <= n; i++) {
  const y = Math.round((max * i) / n);
  await p.evaluate((y) => window.__go(y), y);
  const r = await p.evaluate(() => {
    const SEL =
      "h1, h2, h3, .lede, .act, .proof, .eyebrow, .tag, .moment p, .shot, .fig, .datecard, .res figcaption, .label, .kline p, .clock .t, .clock .ap, .clock .who, .hours";
    const vis = (el) => {
      let e = el,
        o = 1;
      while (e && e !== document) {
        const cs = getComputedStyle(e);
        if (cs.visibility === "hidden" || cs.display === "none") return 0;
        o *= +cs.opacity;
        e = e.parentElement;
      }
      return o;
    };
    const boxes = [...document.querySelectorAll(SEL)]
      .filter((el) => vis(el) > 0.5)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width && r.bottom > 0 && r.top < innerHeight);
    const hit = (a, c) =>
      a.left < c.right - 2 && c.left < a.right - 2 && a.top < c.bottom - 2 && c.top < a.bottom - 2;
    const name = (el) =>
      (el.className && String(el.className).split(" ")[0]) || el.tagName.toLowerCase();
    const out = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i],
          B = boxes[j];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        if (hit(A.r, B.r)) out.push(`${name(A.el)} x ${name(B.el)}`);
      }
    const btns = [...document.querySelectorAll("main .btn")].filter((el) => {
      const q = el.getBoundingClientRect();
      return vis(el) > 0.5 && q.bottom > 0 && q.top < innerHeight;
    });
    if (btns.length > 1) out.push(`${btns.length} buttons`);
    return out;
  });
  if (r.length) problems.push(`step ${i} (y=${y}): ${[...new Set(r)].join("; ")}`);
}
console.log(problems.length ? problems.join("\n") : `clean at ${w}x${h}, ${n + 1} positions`);
await b.close();
