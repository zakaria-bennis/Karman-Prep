// One-off probes for the fix round: header facts on a seat with no target, the 120 seat cells, the lapsed banner link, the tab focus ring.  node src/portals/school/checks/probe.mjs
import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const base = "http://127.0.0.1:5174/#/screen/school/";
const q = "portal=school&role=teacher&device=desktop&mode=light&state=long-time&bare=1";
const out = {};
for (const id of ["eli", "theo", "bo"]) {
  await p.goto(`${base}student?${q}&screen=student&id=${id}`); await p.waitForTimeout(900);
  out[id] = await p.evaluate(() => { const h = document.querySelector("h1"); const f = h?.parentElement?.parentElement?.parentElement?.nextElementSibling; return (document.body.innerText.match(/SAT [A-Z][a-z]+ \d+[^\n]*|target [\d,]+|Karman predicted score[^\n]*|No score yet[^\n]*/g) || []); });
}
// seats: 120 cells drawn on locked overview
await p.goto(`${base}overview?portal=school&role=admin&device=desktop&mode=light&state=locked&bare=1&screen=overview`); await p.waitForTimeout(900);
out.cells = await p.evaluate(() => { const cells=[...document.querySelectorAll('[role=img] > span')]; const drawn=cells.filter(c=>{const s=getComputedStyle(c); return s.backgroundColor!=='rgba(0, 0, 0, 0)'||s.borderStyle!=='none';}); const sw=[...document.querySelectorAll('[role=img] + p span[aria-hidden]')].map(e=>getComputedStyle(e).backgroundColor); return {total:cells.length, drawn:drawn.length, swatches: sw}; });
// banner link target
await p.click("text=Renew 120 seats"); await p.waitForTimeout(400); out.bannerGoes = location => null; out.bannerHash = await p.evaluate(() => location.hash.split("?")[0] + " screen=" + new URLSearchParams(location.hash.split("?")[1]).get("screen"));
// tab focus ring
await p.goto(`${base}students?portal=school&role=admin&device=desktop&mode=light&state=long-time&bare=1&screen=students`); await p.waitForTimeout(900);
await p.focus('[role=tab]:nth-child(2)'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
out.tabFocus = await p.evaluate(() => { const e=document.activeElement; const s=getComputedStyle(e); return {role:e.getAttribute('role'), outline:`${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`}; });
console.log(JSON.stringify(out, null, 1)); await b.close();
