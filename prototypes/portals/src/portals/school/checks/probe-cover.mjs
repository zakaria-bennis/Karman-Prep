// What sits over the h1 at 768 wide as the main scrolls.  node src/portals/school/checks/probe-cover.mjs
import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 768, height: 1024 } });
await p.goto("http://127.0.0.1:5174/#/screen/school/student?portal=school&screen=student&role=teacher&device=desktop&mode=light&state=long-time&bare=1"); await p.waitForTimeout(900);
const out = await p.evaluate(() => {
  const h = document.querySelector("h1"); const main = h.closest("main");
  const res = [];
  for (const top of [0, 20, 40, 60, 80, 120]) {
    main.scrollTop = top; const r = h.getBoundingClientRect(); const m = main.getBoundingClientRect();
    const pts = [[r.left + 4, r.top + 2], [r.left + 4, r.top + r.height / 2], [r.left + 4, r.bottom - 2]];
    res.push({ top, h1Top: Math.round(r.top), mainTop: Math.round(m.top), over: pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e === h || h.contains(e) ? "h1" : e.tagName + "." + (e.className || "").toString().slice(0, 40)) : "none"; }) });
  }
  return { scrollsWindow: document.scrollingElement.scrollHeight > innerHeight, mainOverflow: getComputedStyle(main).overflowY, res };
});
console.log(JSON.stringify(out, null, 1)); await b.close();
