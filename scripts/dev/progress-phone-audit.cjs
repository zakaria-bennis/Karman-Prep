// Walks every Progress screen in /dev/shell on three phone sizes and reports text that spills out of
// its pane, is cut off, overlaps other text, or makes the page scroll. Run with the dev server up:
//   NODE_PATH=$PWD/node_modules node scripts/dev/progress-phone-audit.cjs <folder for screenshots>

const { chromium } = require("playwright");
const out = process.argv[2];
const STATS = ["Time invested", "Questions answered", "Skills Proficient", "Pacing", "Days practiced", "Exams taken"];
const audit = () => {
  const main = document.querySelector("main");
  const issues = [];
  const say = (el) => (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28) || el.tagName;
  if (document.documentElement.scrollWidth > innerWidth) issues.push("PAGE SCROLLS SIDEWAYS");
  if (document.documentElement.scrollHeight > innerHeight + 1) issues.push(`scrolls down ${document.documentElement.scrollHeight - innerHeight}px`);
  for (const sec of main.querySelectorAll("section")) {
    const S = sec.getBoundingClientRect();
    const leaves = [];
    for (const el of sec.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      if (el.closest("[role=listbox]")) continue;
      // spills out of its pane (the countdown badge is meant to lie over the top edge)
      if ((r.left < S.left - 1 || r.right > S.right + 1 || r.bottom > S.bottom + 1) && !/countdown/.test(el.className + el.parentElement.className)) issues.push(`SPILLS: "${say(el)}"`);
      // cut off inside its own box
      if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== "visible") issues.push(`CUT OFF: "${say(el)}"`);
      // the text itself, not its box
      const range = document.createRange(); range.selectNodeContents(el);
      // where the words are across, but no taller than the element's own box: a big serif number has
      // a line box taller than its box, which brushes its neighbors without any ink touching
      const w = el instanceof SVGElement ? r : range.getBoundingClientRect();
      leaves.push({ el, r: { left: w.left, right: w.right, top: Math.max(w.top, r.top), bottom: Math.min(w.bottom, r.bottom) } });
    }
    for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], b = leaves[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 2 && h > 3) issues.push(`OVERLAP: "${say(a.el)}" on "${say(b.el)}"`);
    }
  }
  return [...new Set(issues)];
};
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
  let screens = 0, bad = 0;
  for (const vp of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    for (const who of ["9 weeks", "7 months"]) {
      const c = await b.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
      const p = await c.newPage();
      p.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 200)));
      await p.goto("http://localhost:3000/dev/shell?plan=practice", { waitUntil: "networkidle" });
      await p.addStyleTag({ content: "nextjs-portal,.kc{display:none!important}" });
      await p.waitForTimeout(2200);
      await p.getByRole("navigation").getByRole("button", { name: "Progress" }).click(); await p.waitForTimeout(1000);
      await p.getByRole("button", { name: who, exact: true }).click(); await p.waitForTimeout(700);
      await p.addStyleTag({ content: "[aria-label='Demo switches']{display:none!important}" });
      const main = p.locator("main");
      const tag = `${vp.width}-${who.replace(" ", "")}`;
      const check = async (label) => {
        await p.waitForTimeout(450);
        const found = await p.evaluate(audit);
        screens++;
        if (found.length) { bad++; console.log(`${tag} ${label}: ${found.slice(0, 4).join(" ; ")}${found.length > 4 ? ` (+${found.length - 4} more)` : ""}`); await p.screenshot({ path: `${out}/BAD-${tag}-${label.replace(/\W+/g, "_")}.png` }); }
        else if (vp.width === 390 && who === "7 months") await p.screenshot({ path: `${out}/ok-${label.replace(/\W+/g, "_")}.png` });
      };
      for (const pg of ["Score", "Activity", "Calendar"]) {
        await main.locator("[aria-label=Page]").getByRole("button", { name: pg, exact: true }).click();
        await check(`main ${pg}`);
        if (pg === "Score") {
          for (const sp of ["Today", "7 days", "All time"]) { await main.getByRole("button", { name: sp, exact: true }).click(); await check(`main Score ${sp}`); }
          await main.getByRole("button", { name: /^Reading and Writing/ }).click(); await check("main Score RW");
          const g = await main.getByRole("slider").boundingBox();
          await p.touchscreen.tap(g.x + g.width * 0.5, g.y + g.height * 0.5); await check("main Score pointing");
          await main.getByRole("button", { name: /^Total/ }).click();
        }
        if (pg === "Calendar") { await main.getByRole("button", { name: /November 2026/ }).click(); await check("main Calendar months open"); await p.keyboard.press("Escape"); await main.getByRole("button", { name: "Month before" }).click(); await check("main Calendar October"); }
      }
      for (const st of STATS) {
        await main.locator("[aria-label=Page]").getByRole("button", { name: "Activity", exact: true }).click(); await p.waitForTimeout(300);
        await main.getByRole("button", { name: new RegExp("^" + st) }).click(); await p.waitForTimeout(900);
        const tabs = await main.locator("[aria-label=Page] button").allTextContents();
        for (const t of tabs.length ? tabs : [""]) {
          if (t) await main.locator("[aria-label=Page]").getByRole("button", { name: t, exact: true }).click();
          await check(`${st} / ${t || "list"}`);
          if (t === "Trend" && st === "Pacing") { await main.getByRole("button", { name: /^Math/ }).click(); await check("Pacing / Trend Math"); }
          if (t === "Trend" && st === "Questions answered") { await main.getByRole("button", { name: /^Accuracy/ }).click(); await check("Questions / Trend accuracy"); }
        }
        await main.getByRole("button", { name: "Progress", exact: true }).click(); await p.waitForTimeout(600);
      }
      await c.close();
    }
  }
  console.log(`\n${screens} phone screens checked, ${bad} with something wrong`);
  await b.close();
})();
