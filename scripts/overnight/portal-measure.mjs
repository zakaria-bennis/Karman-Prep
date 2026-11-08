// Measures the student Today page: first paint, interactive, painting finished, layout shift.
// Usage: node scripts/overnight/portal-measure.mjs [baseUrl] [path]
import { chromium } from "playwright";
const base = process.argv[2] ?? "http://localhost:3130";
const path = process.argv[3] ?? "/dashboard/student";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__cls = 0;
  window.__long = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__long.push(Math.round(e.duration));
  }).observe({ type: "longtask", buffered: true });
});
async function run(label, url) {
  const t = Date.now();
  await page.goto(base + url, { waitUntil: "load" });
  const loaded = Date.now() - t;
  await page.waitForFunction(() => document.querySelector(".kp-backdrop[data-painted]"), null, {
    timeout: 20000,
  }).catch(() => {});
  const painted = Date.now() - t;
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const m = (n) => performance.getEntriesByName(n).map((e) => Math.round(e.duration));
    return {
      ttfb: Math.round(nav.responseStart),
      fcp: Math.round(fcp?.startTime ?? -1),
      domInteractive: Math.round(nav.domInteractive),
      cls: +window.__cls.toFixed(3),
      longTasks: window.__long,
      scene: m("karman-paint-scene"),
      plan: m("karman-paint-plan"),
      draw: m("karman-paint-draw"),
      finish: m("karman-paint-finish"),
    };
  });
  console.log(JSON.stringify({ label, loadEvent: loaded, paintedAt: painted, ...r }));
}
await run("first open (opening plays)", path + "?warm=1");
await run("second page (same session)", path);
await run("third page (same session)", path.replace(/\/?$/, "") + "/library");
await browser.close();
