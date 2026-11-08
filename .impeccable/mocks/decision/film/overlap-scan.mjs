// Scroll a page in steps and report visible text or cards that overlap each other, any fixed element (header,
// dock, toast) that sits over text being read, and any moment with more than one highlighted (marigold)
// button on screen (design rules 34 and 35). Headings scrolling under the fixed header are reported only
// when they are more than a third covered, since every page scrolls under its header.
// Needs the preview server. Usage: node overlap-scan.mjs [width] [height] [steps] [page] [port]   (page may carry a query: index?home=b)
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/@playwright/test/index.mjs";
const [w = 1440, h = 900, n = 120] = process.argv.slice(2, 5).map(Number);
const page = process.argv[5] || "index";
const port = process.argv[6] || "8766";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: w, height: h } });
// a page name may carry its query ("index?home=b")
const [pname, pquery] = page.split("?");
await p.goto(`http://127.0.0.1:${port}/film/${pname}.html?${pquery ? pquery + "&" : ""}rec=1`);
await p.waitForTimeout(2000);
const max = await p.evaluate(() => window.__max());
const problems = [];
for (let i = 0; i <= n; i++) {
  const y = Math.round((max * i) / n);
  await p.evaluate((y) => window.__go(y), y);
  const r = await p.evaluate(() => {
    // the text and cards of every page of the mock, by class, as they are today
    const SEL =
      "h1, h2, h3, .lede, .act, .proof, .skipfilm, .note, .tools-list > div, .outcomes > div, .side-list li, .covers, .claim, .g-foot .lk, .clip figcaption, .cline, .kline p, .obj, .vq, " +
      ".i-facts > div, .i-grid > div, .i-steps li, .i-time li, .i-card, .i-list li, .i-pack, .i-big, .i-proof, .i-refuse article, .i-ex > div, .i-faq details, .i-formcard, .datecard, .i-obj, " +
      ".freeline, .rung, .rung6, .plan, .band-words, .cmp-table, .cmp-plan, .honest p, .covered, .maptext, " +
      ".b-stand, .b-try, .b-gline, .b-sent, .b-stage .note, .b-table tr, .b-pane figcaption, .b-caps3 > div, .b-cband .cline, .layout-switch, .b-live";
    const FIXED = ".hd:not(.away), .dock.on, .k-toast.on, .sheet:not([hidden])"; // the header hides while reading down
    const vis = (el) => {
      let e = el,
        o = 1;
      while (e && e !== document) {
        const cs = getComputedStyle(e);
        if (cs.visibility === "hidden" || cs.display === "none") return 0;
        if (e.tagName === "DETAILS" && !e.open && !el.closest("summary")) return 0; // folded content is not on screen
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
    // fixed elements over text: the header covers only what scrolls under it; more than a third hidden counts
    const fixed = [...document.querySelectorAll(FIXED)].filter((el) => vis(el) > 0.5);
    for (const f of fixed) {
      const fr = f.getBoundingClientRect();
      for (const { el, r } of boxes) {
        if (f.contains(el)) continue;
        const ox = Math.max(0, Math.min(fr.right, r.right) - Math.max(fr.left, r.left));
        const oy = Math.max(0, Math.min(fr.bottom, r.bottom) - Math.max(fr.top, r.top));
        const share = (ox * oy) / Math.max(1, r.width * r.height);
        if (share > 0.34) out.push(`${name(f)} over ${name(el)} (${Math.round(share * 100)}%)`);
      }
    }
    const btns = [...document.querySelectorAll("main .btn, .dock .btn")].filter((el) => {
      const q = el.getBoundingClientRect();
      return vis(el) > 0.5 && q.bottom > 0 && q.top < innerHeight;
    });
    if (btns.length > 1) out.push(`${btns.length} buttons`);
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth)
      out.push(
        `sideways scroll ${document.documentElement.scrollWidth}/${document.documentElement.clientWidth}`
      );
    return out;
  });
  if (r.length) problems.push(`step ${i} (y=${y}): ${[...new Set(r)].join("; ")}`);
}
console.log(
  problems.length
    ? `${page} at ${w}x${h}:\n${problems.join("\n")}`
    : `${page}: clean at ${w}x${h}, ${n + 1} positions`
);
await b.close();
