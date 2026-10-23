// Phone versions of the product screens (the Daily 10, the weekly update, the schedule and the review) for phones held upright.
// They are our own app screens (screens/app2.html) laid out at the width they are shown at on a phone,
// so every line and card is whole and the smallest labels stay near their real size (11px or more),
// instead of a crop of the 440-point phone screen or the 1440-point laptop screen scaled down.
// Needs the preview server on :8765. Run: node .impeccable/mocks/decision/film/screens-phone.mjs
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("img/", import.meta.url));
const N = 360; // points: the width the phone screens are shown at on a 390-point phone (its width minus 16-point margins)
const R = 400; // points: the review question, laid out wider than the band so it draws short
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
    css: `.cal { width: ${N}px; flex: none; grid-template-columns: 1fr 1fr; padding: 4px; } .cal > .dc:not(:nth-child(2)):not(:nth-child(4)) { display: none; } .ev { font-size: 16px; } .ev small { font-size: 14px; } .dc .dh { font-size: 16px; }`,
    out: "schedule-p",
  },
  // the review: the question, the wrong answer and the right one (the passage, the two other answers and David's note left out,
  // so it fits the band under the film; on the phone the film of David explaining stands for his note). Laid out wide and short
  // (each answer's label, Your answer or Correct, floats at the end of its first line), so the band can draw it large enough
  // that its smallest text stays near 11px or more even on a 320 x 700 phone
  {
    s: "review",
    el: ".qs",
    js: () =>
      document
        .querySelectorAll(".qs .lab")
        .forEach((l) =>
          l.parentElement.insertBefore(l, l.parentElement.querySelector("i").nextSibling)
        ),
    css: `.rv { align-items: start; } .qs { width: ${R}px; padding: 12px 12px 14px; gap: 8px; } .qs > p { font-size: 16px; line-height: 1.3; }
      .qs .ch { display: block; position: relative; padding: 9px 12px 10px 48px; font-size: 15px; line-height: 1.35; }
      .qs .ch i { position: absolute; left: 10px; top: 9px; width: 28px; height: 28px; } .qs .lab { float: right; margin: 0 0 0 10px; font-size: 15px; }
      .qs .ch.dim, .qs .tnote { display: none; }`,
    out: "review-p",
  },
];
const b = await chromium.launch();
const p = await b.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
// optional: only these screens (node screens-phone.mjs review)
const only = process.argv.slice(2);
for (const j of JOBS) {
  if (only.length && !only.includes(j.s)) continue;
  await p.goto(`http://localhost:8765/screens/app2.html?s=${j.s}&t=dark&still=1`);
  await p.addStyleTag({ content: j.css });
  if (j.js) await p.evaluate(j.js);
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
