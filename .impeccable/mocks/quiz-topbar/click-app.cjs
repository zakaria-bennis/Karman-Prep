// Clicks every bar tool in the real quiz (dev server on 3124, signed in through .env.local).
// node .impeccable/mocks/quiz-topbar/click-app.cjs
const { chromium } = require("playwright");
const sizes = { 390: [390, 844], 768: [768, 1024], 1440: [1440, 900] };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 768, 1440]) for (const scheme of ["light", "dark"]) {
    const [width, height] = sizes[w];
    const ctx = await b.newContext({ viewport: { width, height }, colorScheme: scheme, isMobile: w === 390, hasTouch: w !== 1440 });
    await ctx.addCookies([{ name: "karman_replay_consent", value: "no", url: "http://localhost:3124" }]);
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    await p.goto("http://localhost:3124/learn/set/ma-skill-linear-equations-in-one-variable?again=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 180000 });
    await p.waitForSelector("[data-quiz-shell]:not([aria-busy])", { timeout: 90000 });
    await p.waitForTimeout(1500);
    // The Next.js dev badge sits over Back in development only.
    await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const bar = p.locator('[data-quiz-bar="top"]');
    const log = [];
    const step = async (name, fn) => { try { await fn(); log.push(`${name}:ok`); } catch (e) { log.push(`${name}:FAIL(${e.message.split("\n")[0].slice(0, 90)})`); } };
    const pressed = async (loc, want) => { const v = await loc.getAttribute("aria-pressed"); if (v !== want) throw new Error(`aria-pressed ${v}`); };
    await step("calculator", async () => { const t = bar.locator("[data-calculator-trigger]"); await t.click(); await p.waitForTimeout(1500); await pressed(t, "true"); await p.getByRole("button", { name: "Close calculator" }).first().click(); await p.waitForTimeout(500); await pressed(t, "false"); });
    await step("highlight-hint", async () => { await bar.getByRole("button", { name: "Highlight" }).click(); await p.getByText("Select some words in the question").waitFor(); });
    await step("highlight", async () => {
      await p.evaluate(() => { const el = document.querySelector('[data-quiz-shell] [data-ink-block="stem"]'); const t = [...el.querySelectorAll("*")].concat(el).map((n) => [...n.childNodes].find((c) => c.nodeType === 3 && c.textContent.trim().length > 6)).find(Boolean); const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 6); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
      await bar.getByRole("button", { name: "Highlight" }).click();
      await p.waitForTimeout(400);
      const n = await p.evaluate(() => Math.max(0, ...[...document.querySelectorAll("[data-highlights]")].map((e) => +e.dataset.highlights)));
      if (n < 1) throw new Error("no highlight");
    });
    await step("pencil", async () => { const t = bar.getByRole("button", { name: "Pencil" }); await t.click(); await pressed(t, "true"); await p.getByRole("toolbar", { name: "Pencil tools" }).waitFor(); await t.click(); await pressed(t, "false"); });
    await step("reference", async () => { await bar.getByRole("button", { name: "Reference" }).click(); const d = p.getByRole("dialog", { name: "Reference" }); await d.waitFor(); await d.getByRole("button", { name: "Close" }).click(); await d.waitFor({ state: "detached" }); });
    await step("more", async () => { const t = bar.getByRole("button", { name: "More" }); await t.click(); await p.getByRole("dialog", { name: "More" }).waitFor(); await p.keyboard.press("Escape"); });
    await step("hide-show", async () => { await bar.getByRole("button", { name: "Hide" }).click(); if (await p.getByRole("timer").count()) throw new Error("timer still shown"); await bar.getByRole("button", { name: "Show" }).click(); await p.getByRole("timer").waitFor(); });
    const nav = p.locator('[data-quiz-bar="bottom"]').getByRole("button", { name: /^Question \d+ of/ });
    const at = async () => +(await nav.getAttribute("aria-label")).match(/Question (\d+)/)[1];
    const start = await at().catch(() => 0);
    await step("answer-submit", async () => { if (await p.getByRole("radio").count()) await p.getByRole("radio").first().click(); else await p.getByRole("textbox").first().fill("1"); await p.getByRole("button", { name: "Submit" }).click(); await p.getByRole("button", { name: /^(Next|Finish)/ }).waitFor({ timeout: 20000 }); });
    await step("right-wrong-dot", async () => { const s = await p.locator('[data-testid="progress-dot"]').nth(start - 1).getAttribute("data-state"); if (!["correct", "wrong"].includes(s)) throw new Error(s); log.push(`(dot ${s})`); });
    if (w === 1440 && scheme === "light") await p.screenshot({ path: "docs/overnight/reports/quiz-topbar/after-set-1440-light-answered.png" });
    if (w === 390 && scheme === "light") await p.screenshot({ path: "docs/overnight/reports/quiz-topbar/after-set-390-light-answered.png" });
    await step("navigator", async () => { await nav.click(); const d = p.getByRole("dialog").last(); await d.waitFor(); await d.getByRole("button", { name: "Close" }).click(); });
    await step("next", async () => { await p.getByRole("button", { name: /^Next/ }).click(); await p.waitForTimeout(800); if ((await at()) !== start + 1) throw new Error("not on next"); });
    await step("back", async () => { await p.getByRole("button", { name: "Back" }).click(); await p.waitForTimeout(800); if ((await at()) !== start) throw new Error("not back"); });
    await step("exit", async () => { await bar.getByRole("button", { name: "Exit" }).click(); await p.waitForURL((u) => !u.pathname.startsWith("/learn/set"), { timeout: 30000 }); log.push(`(to ${new URL(p.url()).pathname})`); });
    console.log(w, scheme, log.join(" "), errs.length ? "ERRORS " + errs.join(" | ").slice(0, 200) : "");
    await ctx.close();
  }
  await b.close();
})();
