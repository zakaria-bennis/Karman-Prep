// Runs each clean picture through the outside solver in a fresh headless browser (no shared state):
// upload, Get Hint, then Full Explanation, exactly as a person would. Uses the account saved in
// .solver-account (the same one as Chrome). Saves solver_outputs/<qid>.json.
// Usage: node solve.mjs <questions.json> [--concurrency N] [qid ...]
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { chromium } from "/Users/zakariabennis/Karman-Prep/.claude/worktrees/sat-eval-pipeline-18ad5e/node_modules/playwright/index.mjs";
const E = "/Users/zakariabennis/Documents/Karman-SAT-eval";
const account = readFileSync(`${E}/.solver-account`, "utf8").trim();
const args = process.argv.slice(3);
const ci = args.indexOf("--concurrency");
const conc = ci >= 0 ? Number(args.splice(ci, 2)[1]) : 3;
const only = new Set(args);
const list = JSON.parse(readFileSync(process.argv[2], "utf8")).filter(
  (q) => (!only.size || only.has(q.qid)) && !existsSync(`${E}/solver_outputs/${q.qid}.json`)
);
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function ask(page, label, mode) {
  const res = page.waitForResponse(
    (r) => r.url().includes("/api/explain") && r.request().postDataJSON()?.mode === mode,
    { timeout: 240000 }
  );
  await page.getByRole("button", { name: label, exact: true }).click();
  const r = await res;
  const body = await r.json().catch(() => ({}));
  if (r.request().postDataJSON()?.useFreeCredit) throw new Error("trial credits used; stopping");
  if (!r.ok() || !body.explanation)
    throw new Error(`${mode}: HTTP ${r.status()} ${JSON.stringify(body).slice(0, 200)}`);
  return { text: body.explanation, serverCredits: body.serverCredits ?? null };
}

async function credits(page) {
  const t = await page
    .locator("text=/\\d+(\\.\\d+)? Credits/")
    .first()
    .textContent({ timeout: 30000 });
  return Number(t.match(/[\d.]+/)[0]);
}

async function solveOne(q) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  // Charge the account's server credits only. A fresh browser otherwise starts with 10 trial
  // credits kept in the page itself, which would not be your credits.
  await ctx.addInitScript((a) => {
    localStorage.setItem("cvtp_email", a);
    localStorage.setItem("cvtp_credits", "0");
  }, account);
  const page = await ctx.newPage();
  const t0 = Date.now();
  try {
    await page.goto("https://www.cvtpsolver.com/", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);
    const before = await credits(page);
    await page.locator('input[type="file"]').setInputFiles(`${E}/clean/${q.qid}.png`);
    await page.waitForTimeout(1500);
    const hint = await ask(page, "Get Hint", "hint");
    const full = await ask(page, "Full Explanation", "full");
    await page.waitForTimeout(1500);
    const after = full.serverCredits ?? (await credits(page));
    const out = {
      qid: q.qid,
      hint: hint.text,
      explanation: full.text,
      final_answer: null,
      credits_before: before,
      credits_after: after,
      credits_used: Math.round((before - after) * 100) / 100,
      seconds: Math.round((Date.now() - t0) / 1000),
      at: new Date().toISOString(),
    };
    writeFileSync(`${E}/solver_outputs/${q.qid}.json`, JSON.stringify(out, null, 2));
    console.log("ok", q.qid, `${out.seconds}s`, `credits ${out.credits_used}`);
  } finally {
    await ctx.close();
  }
}

const failed = [];
let i = 0;
async function worker() {
  while (i < list.length) {
    const q = list[i++];
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await solveOne(q);
        break;
      } catch (e) {
        const msg = `${q.qid} attempt ${attempt}: ${e.message.split("\n")[0]}`;
        console.log("FAIL", msg);
        appendFileSync(`${E}/solver_failures.log`, `${new Date().toISOString()} ${msg}\n`);
        if (attempt === 2) failed.push(q.qid);
      }
    }
  }
}
await Promise.all(Array.from({ length: Math.min(conc, list.length) }, worker));
await browser.close();
console.log("failed:", failed.join(" ") || "none");
