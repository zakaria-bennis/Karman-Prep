// Calculated WCAG 2.1 contrast of every visible text element on every school
// screen (long-time, first-day and locked), as the admin and the teacher,
// desktop and phone, light and dark: the text colour composited over the
// surfaces behind it. Fails under 4.5:1 (3:1 at 24px, or 18.66px bold). Glass
// controls are sampled by scripts/glass-contrast.mjs.
//   node src/portals/school/checks/contrast.mjs
import { chromium } from "playwright";
import { schoolRoutes } from "../routes.ts";

const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
const browser = await chromium.launch();
const failures = [];
let checked = 0;
let pages = 0;
for (const r of schoolRoutes.filter((x) => x.id !== "portal")) for (const role of ["admin", "teacher"].filter((x) => r.roles.includes(x))) for (const state of ["long-time", "first-day", "locked"]) for (const device of [{ w: 1440, h: 900 }, { w: 440, h: 956 }]) for (const mode of ["light", "dark"]) {
  const id = r.id;
  const page = await browser.newPage({ viewport: { width: device.w, height: device.h }, colorScheme: mode });
  await page.goto(`${BASE}/#/screen/school/${id}?portal=school&screen=${id}&role=${role}&device=${device.w > 800 ? "desktop" : "phone"}&mode=${mode}&state=${state}&bare=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  pages++;
  const res = await page.evaluate(() => {
    const parse = (s) => { const m = (s.match(/[\d.]+/g) || []).map(Number); return m.length < 3 ? { r: 0, g: 0, b: 0, a: 0 } : { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
    const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const bgOf = (el) => {
      const layers = [];
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c.a > 0) layers.push(c);
        if (c.a >= 1) break;
      }
      let bg = parse(getComputedStyle(document.documentElement).backgroundColor);
      for (const c of layers.reverse()) bg = over(c, bg);
      return bg;
    };
    const out = [];
    let n = 0;
    for (const el of document.querySelectorAll("body *")) {
      if (!el.childNodes.length) continue;
      const text = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join(" ").trim();
      if (!text) continue;
      if (el.closest("[aria-hidden='true'], .sr-only, .k-glass, canvas, [role='status'][aria-busy]")) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight * 3) continue;
      const fg = parse(cs.color);
      const bg = bgOf(el);
      const rr = ratio(fg.a < 1 ? over(fg, bg) : fg, bg);
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight) >= 700;
      const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
      n++;
      if (rr < need) out.push({ text: text.slice(0, 50), fg: cs.color, bg: `rgb(${Math.round(bg.r)} ${Math.round(bg.g)} ${Math.round(bg.b)})`, ratio: +rr.toFixed(2), need, size, cls: (el.className || "").toString().slice(0, 60) });
    }
    return { n, out };
  });
  checked += res.n;
  for (const f of res.out) failures.push({ id, role, state, mode, device: device.w, ...f });
  await page.close();
}
await browser.close();
console.log(`${checked} text elements checked across ${pages} pages (screen x role x 3 states x 2 devices x 2 modes)`);
for (const f of failures) console.log(`FAIL ${f.id} ${f.role} ${f.state} ${f.mode} ${f.device}: "${f.text}" ${f.fg} on ${f.bg} = ${f.ratio}:1 (needs ${f.need}) ${f.cls}`);
console.log(failures.length ? `${failures.length} failures` : "every text element passes AA");
process.exit(failures.length ? 1 : 0);
