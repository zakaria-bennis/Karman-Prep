// Clicks through every option in the lab at phone and desktop size. Lab server must be running.
// node .impeccable/mocks/quiz-topbar/lab/click-check.cjs
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  for (const opt of ["a", "b", "c"]) for (const w of [390, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, isMobile: w === 390, hasTouch: w === 390 });
    const p = await ctx.newPage();
    p.setDefaultTimeout(8000);
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    const load = async () => { await p.goto(`http://127.0.0.1:4324/?option=${opt}&q=math`, { waitUntil: "networkidle" }); await p.waitForSelector("[data-quiz-shell]:not([aria-busy])"); };
    await load();
    const log = [];
    const step = async (name, fn) => { try { await fn(); log.push(`${name}:ok`); } catch (e) { log.push(`${name}:FAIL ${e.message.split("\n")[0]}`); } };
    await step("calculator", async () => { await p.locator("[data-quiz-bar='top'] [data-calculator-trigger]").click(); await p.waitForTimeout(1200); if ((await p.locator("[data-quiz-bar='top'] [data-calculator-trigger]").getAttribute("aria-pressed")) !== "true") throw new Error("not open"); await load(); });
    await step("answer", () => p.getByRole("radio").nth(1).click());
    await step("submit", () => p.getByRole("button", { name: "Submit" }).click());
    await step("next", () => p.getByRole("button", { name: /^Next/ }).click());
    await p.waitForTimeout(500);
    await step("pencil", async () => { await p.getByRole("button", { name: "Pencil" }).click(); await p.waitForTimeout(300); if (!(await p.locator("[data-pencil]").count())) throw new Error("pencil not on"); await p.getByRole("button", { name: "Pencil" }).click(); });
    await step("hide", async () => { await p.getByRole("button", { name: "Hide" }).click(); await p.getByRole("button", { name: "Show" }).click(); });
    await step("more", async () => { await p.getByRole("button", { name: "More" }).first().click(); await p.waitForTimeout(300); await p.keyboard.press("Escape"); });
    if (opt === "c") await step("square1", async () => { await p.locator(".lab-nav button").first().click(); await p.waitForTimeout(400); if ((await p.locator('.lab-nav [aria-current="step"]').innerText()) !== "1") throw new Error("not on 1"); });
    await step("exit", async () => { await p.locator(".lab-exit").click(); await p.waitForSelector(".lab-left", { timeout: 3000 }); });
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    console.log(opt, w, log.join(" "), over ? "OVERFLOW" : "", errs.join(" | "));
    await ctx.close();
  }
  await b.close();
})();
