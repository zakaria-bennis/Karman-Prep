// Captures the real quiz screens from the dev server (port 3124), signed in through the
// dev-only impersonation in .env.local. Usage: node .impeccable/mocks/quiz-topbar/capture-app.cjs <before|after> [filter]
const { chromium } = require("playwright");
const OUT = "docs/overnight/reports/quiz-topbar";
const TAG = process.argv[2] || "after";
const ONLY = process.argv[3] ? new RegExp(process.argv[3]) : null;
const sizes = { 390: [390, 844], 768: [768, 1024], 1440: [1440, 900] };
const flows = [
  { id: "set", url: "/learn/set/ma-skill-linear-equations-in-one-variable" },
  { id: "daily10", url: "/learn/daily-ten" },
  { id: "challenge", url: "/learn/daily", open: /Answer the Math challenge|Review the Math challenge/ },
];
(async () => {
  const b = await chromium.launch();
  for (const f of flows) for (const w of [390, 768, 1440]) for (const scheme of ["light", "dark"]) {
    const name = `${TAG}-${f.id}-${w}-${scheme}`;
    if (ONLY && !ONLY.test(name)) continue;
    const [width, height] = sizes[w];
    const ctx = await b.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: w === 390 ? 2 : 1, isMobile: w === 390, hasTouch: w !== 1440 });
    await ctx.addCookies([{ name: "karman_replay_consent", value: "no", url: "http://localhost:3124" }]);
    const p = await ctx.newPage();
    try {
      await p.goto("http://localhost:3124" + f.url, { waitUntil: "domcontentloaded", timeout: 180000 });
      if (f.open) { await p.waitForTimeout(6000); await p.getByRole("button", { name: f.open }).first().click({ timeout: 60000 }); }
      await p.waitForSelector("[data-quiz-shell]:not([aria-busy])", { timeout: 60000 });
      await p.waitForTimeout(2500);
      await p.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => e.remove()));
      const over = await p.evaluate(() => Math.max(...[...document.querySelectorAll("[data-quiz-shell] *")].map((e) => e.getBoundingClientRect().right)) > innerWidth + 1);
      await p.screenshot({ path: `${OUT}/${name}.png` });
      console.log("ok", name, over ? "OVERFLOW" : "");
    } catch (e) { console.log("FAIL", name, e.message.split("\n")[0]); }
    await ctx.close();
  }
  await b.close();
})();
