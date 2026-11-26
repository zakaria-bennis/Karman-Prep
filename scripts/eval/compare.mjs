// Puts before-clean and after-clean side by side: layout/compare/<qid>.png
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "/Users/zakariabennis/Karman-Prep/.claude/worktrees/sat-eval-pipeline-18ad5e/node_modules/playwright/index.mjs";
const L = "/Users/zakariabennis/Documents/Karman-SAT-eval/layout";
mkdirSync(`${L}/compare`, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: true });
const page = await b.newPage({ viewport: { width: 2400, height: 800 } });
for (const q of process.argv.slice(2)) {
  const img = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
  await page.setContent(`<body style="margin:0;background:#12141f;font:600 34px -apple-system,sans-serif;color:#eee">
    <div id=w style="display:flex;gap:40px;padding:30px;align-items:flex-start">
    <div style="flex:1"><div style="margin-bottom:16px">Before</div><img style="width:100%" src="${img(`${L}/before-clean/${q}.png`)}"></div>
    <div style="flex:1"><div style="margin-bottom:16px">After</div><img style="width:100%" src="${img(`${L}/after-clean/${q}.png`)}"></div></div></body>`);
  await page.locator("#w").screenshot({ path: `${L}/compare/${q}.png` });
}
await b.close();
