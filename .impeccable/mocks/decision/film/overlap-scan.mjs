// Scroll the landing page in steps and report any visible text that overlaps
// other text or the header, and any moment with more than one button on screen. On phones (film above, words below)
// it also checks the face: the eye line of the film on screen (each clip's eye, film.js) must sit below the header row
// and above the film's soft bottom edge, so no face is covered by the header or cut by the band.
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
    const SEL =
      ".lede, .act, figcaption, .note, .pnote, .card, .shot, .time, .mproof, .kline, .tip, .dock";
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
    // (a result's own headline is a .kin, measured by its words; its other lines are measured here)
    document.querySelectorAll(".kin, .res").forEach((el) => {
      const parts = [
        ...el.querySelectorAll(el.matches(".kin") ? ".w > span, .w .l" : ":scope > :not(.kin)"),
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
    const hd = document.querySelector(".hd"),
      H_BOTTOM = hd.getBoundingClientRect().bottom;
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
    const films = document.querySelector(".films").getBoundingClientRect();
    if (films.height < innerHeight - 1) {
      const clips = window.__clips();
      document.querySelectorAll(".films .frame").forEach((f, i) => {
        const c = clips[i],
          v = f.querySelector("video");
        if (
          c.eye == null ||
          getComputedStyle(f).visibility === "hidden" ||
          +getComputedStyle(f).opacity < 0.5 ||
          !v.videoHeight
        )
          return;
        const r = v.getBoundingClientRect(),
          sc = Math.max(r.width / v.videoWidth, r.height / v.videoHeight);
        const py = parseFloat(getComputedStyle(v).objectPosition.split(" ")[1]) / 100;
        const eyeY = r.top + (r.height - v.videoHeight * sc) * py + c.eye * v.videoHeight * sc;
        if (eyeY < H_BOTTOM + 8) out.push(`${c.film} eyes under header (${Math.round(eyeY)}px)`);
        if (eyeY > films.bottom - 64)
          out.push(`${c.film} eyes in the band fade (${Math.round(eyeY)}px)`);
      });
    }
    return out;
  });
  if (r.length) problems.push(`step ${i} (y=${y}): ${[...new Set(r)].join("; ")}`);
}
console.log(problems.length ? problems.join("\n") : `clean at ${w}x${h}, ${n + 1} positions`);
await b.close();
