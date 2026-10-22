// Builds the approval board for keyframe stills: review/index.html and review/board.jpg.
// Run from the repo root: node .impeccable/mocks/decision/film/review/board.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/playwright/index.mjs";

const ROOT = resolve(".");
const DIR = join(ROOT, ".impeccable/mocks/decision/film/review");
const IMG = join(DIR, "img");
mkdirSync(IMG, { recursive: true });
const state = JSON.parse(readFileSync(join(ROOT, "assets/generation-state.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(ROOT, "assets/manifest.json"), "utf8"));

// My pick per scene and why; the founder decides.
const PICK = {
  "k1-kitchen": ["pro", "Richer kitchen, clearer reflection of the oak and stars."],
  "k2-bus": ["nb", "Cleaner light and no sticker on the window (A has one)."],
  "k3-pickup": ["nb", "Shows the whole SUV and more of the school."],
  "k4-tennis": [
    "pro",
    "Better golden light; the opponent on the far bench reads as a real changeover.",
  ],
  "k5-priya": ["pro", "Warmer room, hills and first stars in the window."],
  "k6-david": ["pro", "Calmer frame; B has a printed page on the desk."],
  "k7-test": ["nb", "Deeper frame, warm light inside, their reflections in the doors."],
  "k8-harvard": ["nb", "A has a racquet-brand logo on the bag; B shows the Yard."],
  "k9-stanford": ["pro", "The arch frames the quad; instantly Stanford."],
  "k10-berkeley": ["nb", "A added a second girl who wasn't asked for; B is Ava alone."],
};
const SCENES = [
  ["k1-kitchen", "1", "6:10 a.m.", "The kitchen, before dawn"],
  ["k2-bus", "2", "6:52 a.m.", "Ava on the shuttle"],
  ["k3-pickup", "3", "3:15 p.m.", "Pickup line, Ava's mother"],
  ["k4-tennis", "4", "4:35 p.m.", "Mateo at the changeover"],
  ["k5-priya", "5", "8:05 p.m.", "Priya speaking on Zoom"],
  ["k6-david", "6", "9:00 p.m.", "David, 1:1 review"],
  ["k7-test", "7", "7:40 a.m., March 6", "Test morning, Ava and Clara"],
  ["k8-harvard", "8a", "Next fall", "Mateo, Harvard"],
  ["k9-stanford", "8b", "Next fall", "Priya, Stanford"],
  ["k10-berkeley", "8c", "Next fall", "Ava, UC Berkeley"],
];

function jpg(src, name, width) {
  const out = join(IMG, name);
  if (!existsSync(out))
    execFileSync(
      "sips",
      ["-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", String(width), src, "--out", out],
      { stdio: "ignore" }
    );
  return `img/${name}`;
}

const castRow = ["ava", "parent1", "clara", "mateo", "priya", "david"]
  .map((k) => {
    const label = {
      ava: "Ava",
      parent1: "Ava's mother",
      clara: "Clara",
      mateo: "Mateo",
      priya: "Priya",
      david: "David",
    }[k];
    return `<figure><img src="${jpg(join(ROOT, manifest.cast[k]), `cast-${k}.jpg`, 700)}"><figcaption>${label}</figcaption></figure>`;
  })
  .join("");

const rows = SCENES.map(([id, n, time, title]) => {
  const cell = (suf, label) => {
    const f = state[`${id}-${suf}`]?.lastFile;
    const pick = PICK[id]?.[0] === suf;
    return f
      ? `<figure class="${pick ? "pick" : ""}"><img src="${jpg(f, `${id}-${suf}.jpg`, 1400)}"><figcaption>${label}${pick ? ` <b>My pick.</b> ${PICK[id][1]}` : ""}</figcaption></figure>`
      : `<figure class="missing"><figcaption>${label}: not generated</figcaption></figure>`;
  };
  return `<section><header><span class="n">${n}</span><span class="t">${time}</span><h2>${title}</h2></header><div class="pair">${cell("pro", "A, Nano Banana Pro")}${cell("nb", "B, Nano Banana 2.1")}</div></section>`;
}).join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Keyframes for approval</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,500&display=swap" rel="stylesheet">
<style>
:root{--bg:#0e161f;--ink:#f1f1ee;--ink2:#b9c2cb;--line:#24313f;--green:#7cc4a5}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--ink);font:16px/1.5 "Hanken Grotesk",sans-serif;padding:56px 48px;width:1600px}
h1{font:500 56px/1.05 "Source Serif 4",serif;letter-spacing:-.03em}p.lede{color:var(--ink2);margin:12px 0 40px;max-width:900px}
.cast{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:56px}.cast img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:14px}
figcaption{color:var(--ink2);font-size:14px;margin-top:8px}
section{border-top:1px solid var(--line);padding:28px 0 36px}header{display:flex;align-items:baseline;gap:16px;margin-bottom:16px}
.n{color:var(--green);font-weight:600}.t{color:var(--ink2)}h2{font:500 30px/1.1 "Source Serif 4",serif;letter-spacing:-.02em}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pair img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:14px}
.pick img{outline:3px solid var(--green);outline-offset:3px}b{color:var(--green);font-weight:600}.missing{aspect-ratio:16/9;border:1px dashed var(--line);border-radius:14px;display:grid;place-items:center}
</style></head><body><h1>Keyframes for approval</h1>
<p class="lede">The first frame of each scene, before any video is made. Each scene was made on two models; pick A or B, or tell me what to change. The cast portraits on the top row are the references every scene was made from.</p>
<div class="cast">${castRow}</div>${rows}</body></html>`;
writeFileSync(join(DIR, "index.html"), html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.goto(`file://${join(DIR, "index.html")}`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: join(DIR, "board.jpg"), fullPage: true, type: "jpeg", quality: 82 });
await browser.close();
console.log("board written");
