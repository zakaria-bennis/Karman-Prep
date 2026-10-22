// Scroll the landing page in steps and report any visible text that overlaps
// other text or the header, and any moment with more than one button on screen.
// Needs the preview server on :8765. Usage: node overlap-scan.mjs [width] [height] [steps]
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/playwright/index.mjs";
const [w = 1440, h = 900, n = 120] = process.argv.slice(2).map(Number);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.goto("http://localhost:8765/film/index.html?rec=1");
await p.waitForTimeout(2000);
const max = await p.evaluate(() => window.__max());
const problems = [];
for (let i = 0; i <= n; i++) {
  const y = Math.round((max * i) / n);
  await p.evaluate((y) => window.__go(y), y);
  const r = await p.evaluate(() => {
    const SEL = ".lede, .act, figcaption, .note, .card, .time, .stamp, .nightnote, .kline";
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
    // headlines and results animate word by word: measure only the words that are showing
    document.querySelectorAll(".kin, .res").forEach((el) => {
      const parts = [
        ...el.querySelectorAll(el.matches(".kin") ? ".w > span, .w .l" : ":scope > *"),
      ].filter((q) => vis(q) > 0.5);
      if (!parts.length) return;
      const rs = parts.map((q) => q.getBoundingClientRect());
      const r = {
        left: Math.min(...rs.map((q) => q.left)),
        right: Math.max(...rs.map((q) => q.right)),
        top: Math.min(...rs.map((q) => q.top)),
        bottom: Math.max(...rs.map((q) => q.bottom)),
      };
      r.width = r.right - r.left;
      if (r.bottom > 0 && r.top < innerHeight) boxes.push({ el, r });
    });
    const hit = (a, c) =>
      a.left < c.right - 2 && c.left < a.right - 2 && a.top < c.bottom - 2 && c.top < a.bottom - 2;
    const out = [];
    const name = (el) => el.className.split(" ")[0] || el.tagName;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i],
          B = boxes[j];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        if (hit(A.r, B.r)) out.push(`${name(A.el)} x ${name(B.el)}`);
      }
    const hd = document.querySelector(".hd");
    if (!hd.classList.contains("away")) {
      const H = hd.getBoundingClientRect();
      boxes.forEach(({ el, r }) => {
        if (r.top < H.bottom - 4 && r.bottom > 0) out.push(`${name(el)} under header`);
      });
    }
    const btns = [...document.querySelectorAll(".btn")].filter((el) => {
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
