// Opens each question in the real quiz screen (local dev server) and saves two pictures:
// render_qa/<qid>_full.png (the page as a student sees it) and clean/<qid>.png (question only).
// Usage: node capture.mjs <questions.json> [qid ...]
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "/Users/zakariabennis/Karman-Prep/.claude/worktrees/sat-eval-pipeline-18ad5e/node_modules/playwright/index.mjs";
const E = "/Users/zakariabennis/Documents/Karman-SAT-eval";
const BASE = process.env.EVAL_BASE ?? "http://localhost:3017";
const list = JSON.parse(readFileSync(process.argv[2], "utf8"));
const only = new Set(process.argv.slice(3));
const RQ = process.env.OUT_FULL ?? `${E}/render_qa`,
  CL = process.env.OUT_CLEAN ?? `${E}/clean`;
mkdirSync(RQ, { recursive: true });
mkdirSync(CL, { recursive: true });
function document_has_left_but_cut(left, box) {
  return left > 0 && box.x > 200;
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: Number(process.env.VW ?? 1280), height: Number(process.env.VH ?? 1000) },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
  colorScheme: process.env.EVAL_SCHEME === "light" ? "light" : "dark",
});
// A returning student has already answered the cookie banner ("Essentials only").
await ctx.addCookies([{ name: "karman_replay_consent", value: "no", url: BASE }]);
for (const q of list) {
  if (only.size && !only.has(q.qid)) continue;
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/dev/eval-question?id=${q.id}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.waitForSelector("[data-quiz-column]", { timeout: 30000 });
    // Let fonts, math and figures settle.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    // The Next.js dev badge and the public site's light/dark switch are not part of the portal quiz.
    await page.addStyleTag({
      content:
        "nextjs-portal{display:none!important} button[aria-label='Toggle light and dark mode']{display:none!important}",
    });
    // Grow the window to the content so nothing is hidden behind a scroll.
    const h = await page.evaluate(() =>
      Math.max(...[...document.querySelectorAll("[data-quiz-scroll]")].map((e) => e.scrollHeight))
    );
    const W = Number(process.env.VW ?? 1280),
      H = Number(process.env.VH ?? 1000);
    // Grow the window to the content (a tall shot shows what scrolling would reveal).
    if (process.env.TALL || (!process.env.VW && h > 900)) {
      if (h + 200 > H) await page.setViewportSize({ width: W, height: Math.min(h + 220, 6000) });
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${RQ}/${q.qid}_full.png` });
    // Clean: hide the per-question tool row (number, bookmark, cross-out), then crop to the columns.
    await page.evaluate(() => {
      for (const b of document.querySelectorAll("[data-quiz-column] button[aria-label]")) {
        const l = b.getAttribute("aria-label") || "";
        if (/bookmark|cross|mark|eliminat/i.test(l)) {
          const row = b.closest("[data-quiz-column] > *");
          if (row) row.style.display = "none";
        }
      }
    });
    // The faint background trace carries the attempt key, which holds the question id.
    await page.addStyleTag({ content: "[class*='__trace']{display:none!important}" });
    await page.waitForTimeout(300);
    const box = await page.evaluate(() => {
      const r = [
        ...document.querySelectorAll(
          "[data-quiz-column], [data-quiz-pane='passage'] > div:first-child"
        ),
      ]
        .map((e) => e.getBoundingClientRect())
        .filter((b) => b.width && b.height);
      const x = Math.min(...r.map((b) => b.left)),
        y = Math.min(...r.map((b) => b.top));
      return {
        x,
        y,
        width: Math.max(...r.map((b) => b.right)) - x,
        height: Math.max(...r.map((b) => b.bottom)) - y,
      };
    });
    const pad = 16;
    await page.screenshot({
      path: `${CL}/${q.qid}.png`,
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: box.width + 2 * pad,
        height: box.height + 2 * pad,
      },
    });
    const left = await page.evaluate(() => {
      const el = document.querySelector("[data-quiz-pane='passage'] > div:first-child");
      return el
        ? (el.textContent || "").trim().length + (el.querySelector("svg,img,table") ? 1 : 0)
        : 0;
    });
    if (document_has_left_but_cut(left, box)) throw new Error("left pane left out of the crop");
    console.log("ok", q.qid, left ? "two-panes" : "one-pane");
  } catch (e) {
    console.log("FAIL", q.qid, e.message.split("\n")[0]);
  }
  await page.close();
}
await browser.close();
