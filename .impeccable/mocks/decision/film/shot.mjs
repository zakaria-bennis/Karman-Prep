// One screenshot of the landing page at a scroll position. Usage: node shot.mjs <width> <height> <scrollY> <out.png>
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/playwright/index.mjs";
const [w, h, y, out] = [+process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
await p.goto("http://localhost:8765/film/index.html?rec=1");
await p.waitForTimeout(2000);
await p.evaluate((y) => window.__go(y), y);
await p.waitForTimeout(500);
await p.screenshot({ path: out });
await b.close();
