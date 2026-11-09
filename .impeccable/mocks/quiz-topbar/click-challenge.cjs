// The Challenge question: painting ready and still, tools work, Exit closes it.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w === 390, hasTouch: w !== 1440 });
    await ctx.addCookies([{ name: "karman_replay_consent", value: "no", url: "http://localhost:3124" }]);
    const p = await ctx.newPage();
    p.setDefaultTimeout(10000);
    await p.goto("http://localhost:3124/learn/daily", { waitUntil: "domcontentloaded", timeout: 180000 });
    await p.waitForTimeout(6000);
    await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const log = [];
    const step = async (n, fn) => { try { await fn(); log.push(`${n}:ok`); } catch (e) { log.push(`${n}:FAIL(${e.message.split("\n")[0].slice(0, 80)})`); } };
    await p.getByRole("button", { name: /(Answer|Review) the Math challenge/ }).click();
    await p.waitForSelector("[data-quiz-shell]:not([aria-busy])");
    const bar = p.locator('[data-quiz-bar="top"]');
    await step("painting", () => p.waitForSelector("[data-quiz-shell] canvas[data-ready]", { timeout: 15000 }));
    await step("still", async () => { const px = () => p.locator("[data-quiz-shell] canvas[data-ready]").evaluate((c) => c.toDataURL()); await p.waitForTimeout(1500); const a = await px(); await p.waitForTimeout(3000); if (a !== (await px())) throw new Error("painting moved"); });
    await step("hue", async () => { const v = await p.locator("[data-quiz-shell]").evaluate((e) => e.style.getPropertyValue("--hue")); if (!v) throw new Error("no hue"); log.push(`(hue ${v})`); });
    await step("calculator", async () => { await bar.locator("[data-calculator-trigger]").click(); await p.getByRole("button", { name: "Close calculator" }).first().click(); });
    await step("pencil", async () => { await bar.getByRole("button", { name: "Pencil" }).click(); await bar.getByRole("button", { name: "Pencil" }).click(); });
    await step("reference", async () => { await bar.getByRole("button", { name: "Reference" }).click(); await p.getByRole("dialog", { name: "Reference" }).getByRole("button", { name: "Close" }).click(); });
    await step("exit", async () => { await bar.getByRole("button", { name: "Exit" }).click(); await p.waitForSelector("[data-quiz-shell]", { state: "detached" }); });
    console.log(w, log.join(" "));
    await ctx.close();
  }
  await b.close();
})();
