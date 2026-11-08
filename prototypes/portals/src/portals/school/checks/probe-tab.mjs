// Keyboard onto the Students tabs and read the focus ring.  node src/portals/school/checks/probe-tab.mjs
import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://127.0.0.1:5174/#/screen/school/students?portal=school&role=admin&device=desktop&mode=light&state=long-time&bare=1&screen=students"); await p.waitForTimeout(900);
let got = null;
for (let i = 0; i < 40 && !got; i++) { await p.keyboard.press("Tab"); got = await p.evaluate(() => { const e = document.activeElement; if (e?.getAttribute("role") !== "tab") return null; const s = getComputedStyle(e); return { text: e.textContent, outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, offset: s.outlineOffset }; }); }
await p.keyboard.press("ArrowRight");
const next = await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { text: e.textContent, outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}` }; });
console.log(JSON.stringify({ got, next })); await b.close();
