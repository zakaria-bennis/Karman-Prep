// Phone versions of the product screens (chapters 2, 3, 5, 6 and 7) for phones held upright.
// They are our own app screens (screens/app2.html) laid out at the width they are shown at on a phone,
// so every line and card is whole and the smallest labels stay near their real size (11px or more),
// instead of a crop of the 440-point phone screen or the 1440-point laptop screen scaled down.
// Needs the preview server on :8765. Run: node .impeccable/mocks/decision/film/screens-phone.mjs
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("img/", import.meta.url));
const W = 380; // points: about the width of a phone screen minus its margins
const N = 360; // points: the width the phone screens are shown at on a 390-point phone (its width minus 16-point margins)
const JOBS = [
  // the Daily 10: the skill, the question and its four answers in two columns, short enough to sit in the band under the film
  // (no progress row, tools or Check button)
  {
    s: "daily10",
    el: ".ph",
    css: `.ph { width: ${N}px; padding: 14px 16px 18px; gap: 14px; } .ph > .topbar, .ph > :nth-child(2), .ph > .tools, .ph > .q2, .ph > .btn { display: none !important; } .q { font-size: 19px; } .choices { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } .choices .ch { min-height: 48px; padding: 10px 12px; gap: 10px; font-size: 17px; white-space: nowrap; }`,
    out: "daily10-p",
  },
  // the weekly update: its title, the dates and the four cards, ending whole
  {
    s: "parent-update",
    el: ".ph",
    css: `.ph { width: ${N}px; padding: 4px 16px 18px; } .ph > :nth-child(n+4) { display: none !important; }`,
    out: "parent-update-p",
  },
  // the schedule: Tuesday and Thursday, the two live-class days the caption names
  {
    s: "schedule",
    el: ".cal",
    css: `.cal { width: ${N}px; flex: none; grid-template-columns: 1fr 1fr; padding: 4px; } .cal > .dc:not(:nth-child(2)):not(:nth-child(4)) { display: none; } .ev { font-size: 14px; } .ev small { font-size: 12.5px; } .dc .dh { font-size: 14px; }`,
    out: "schedule-p",
  },
  // the review: the wrong answer and the right one (the question, the two other answers and David's note left out, so it fits the band
  // under the film; on the phone the film of David explaining stands for his note)
  {
    s: "review",
    el: ".qs",
    css: `.rv { align-items: start; } .qs { width: ${W}px; padding: 16px; } .qs > p, .qs .ch.dim, .qs .tnote { display: none; }`,
    out: "review-p",
  },
  // the night's question: the question and its four answers in two columns, no Check button
  {
    s: "quiz",
    el: ".qwrap",
    css: `.qwrap { width: ${W}px !important; padding: 16px 16px 20px !important; margin: 0 !important; gap: 18px !important; } .qbig { font-size: 23px !important; } .choices { display: grid !important; grid-template-columns: 1fr 1fr; gap: 10px !important; } .choices .ch { font-size: 18px !important; min-height: 52px !important; padding: 12px 14px !important; } .qfoot { display: none !important; }`,
    out: "quiz-p",
  },
];
const b = await chromium.launch();
const p = await b.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
for (const j of JOBS) {
  await p.goto(`http://localhost:8765/screens/app2.html?s=${j.s}&t=dark&still=1`);
  await p.addStyleTag({ content: j.css });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  const png = `${OUT}${j.out}.png`;
  await p.locator(j.el).first().screenshot({ path: png });
  execFileSync("cwebp", ["-quiet", "-q", "88", png, "-o", `${OUT}${j.out}.webp`]);
  execFileSync("rm", [png]);
  const box = await p.locator(j.el).first().boundingBox();
  console.log(`${j.out}.webp: ${Math.round(box.width)} x ${Math.round(box.height)} points`);
}
await b.close();
