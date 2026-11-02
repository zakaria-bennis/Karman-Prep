// Captures the portals prototype's real screens for the motion clips and the site.
// The prototype must already be running on 127.0.0.1:5174 (this script never starts it).
//   node .impeccable/mocks/motion/scripts/capture-screens.mjs [filter]
// Writes lossless PNGs to ../shots/ and geometry to ../shots/geometry.json.
// Phone: 440x956 at 3x. Desktop: 1440x900 at 2x. Light and dark.
// Page-side changes (never to the prototype's files), all listed in shots/README.md:
//   - the gallery's bare route (#/screen/...&bare=1) shows the screen with no gallery chrome;
//   - student and parent phone screens get a 54 pt top inset in the screen's own canvas colour,
//     so the iPhone's Dynamic Island sits above the top bar (the tutor shell draws its own);
//   - every phone screen gets iOS's 34 pt home-indicator inset where the prototype asks for
//     env(safe-area-inset-bottom), which Chromium reports as 0;
//   - panels that carry a score result or predicted score are hidden (rule 47).
import { chromium } from "/Users/zakariabennis/Karman-Prep/node_modules/@playwright/test/index.mjs";
import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../shots/", import.meta.url));
const BASE = "http://127.0.0.1:5174";
const filter = process.argv[2] ?? "";
const INSET = 54;

const T = [
  { name: "student-home-cohort", portal: "student", id: "home", q: "plan=cohort", inset: true, hide: ["Karman predicted score", "Cohort average"], long: true },
  { name: "student-classes-cohort", portal: "student", id: "classes", q: "plan=cohort", inset: true, hide: ["Full-length tests"], long: true },
  { name: "student-classes-private", portal: "student", id: "classes", q: "plan=private20", inset: true, hide: ["Full-length tests"], long: true },
  { name: "student-booking-open", portal: "student", id: "classes", q: "plan=private20", inset: true, hide: ["Full-length tests"],
    act: async (p) => { await p.getByRole("button", { name: /Book your next session/ }).first().click(); await p.waitForTimeout(1200); } },
  { name: "student-booking-slot", portal: "student", id: "classes", q: "plan=private20", inset: true, hide: ["Full-length tests"],
    act: async (p) => {
      await p.getByRole("button", { name: /Book your next session/ }).first().click(); await p.waitForTimeout(1200);
      const slots = p.locator('[role="dialog"] [role="radiogroup"]:not([aria-label="Day"]) [role="radio"]:not([disabled]):not([aria-disabled="true"])');
      await slots.last().click(); await p.waitForTimeout(700);
    } },
  { name: "student-practice-cohort", portal: "student", id: "practice", q: "plan=cohort", inset: true, long: true },
  { name: "student-progress-cohort", portal: "student", id: "progress", q: "plan=cohort", inset: true, hide: ["Karman predicted score"], long: true },
  { name: "student-rewards-cohort", portal: "student", id: "rewards", q: "plan=cohort", inset: true, long: true },
  { name: "student-testreview-cohort", portal: "student", id: "test-review", q: "plan=cohort", inset: true, hide: ["Karman predicted score"], long: true },
  { name: "student-trials-cohort", portal: "student", id: "trials", q: "plan=cohort", inset: true },
  { name: "daily10-boxready-longtime", portal: "daily10", id: "box", q: "", wait: 6500 },
  { name: "daily10-box-longtime", portal: "daily10", id: "box", q: "", wait: 6500,
    act: async (p) => { await p.getByRole("button", { name: /^Open/ }).first().click(); await p.waitForTimeout(2500); } },
  { name: "daily10-burst-longtime", portal: "daily10", id: "box", q: "", wait: 6500,
    act: async (p) => { await p.getByRole("button", { name: /^Open/ }).first().click(); await p.waitForTimeout(2500);
      await p.getByRole("button", { name: /Open the mystery box/ }).click(); await p.waitForTimeout(450); } },
  { name: "daily10-found-longtime", portal: "daily10", id: "box", q: "", wait: 6500,
    act: async (p) => { await p.getByRole("button", { name: /^Open/ }).first().click(); await p.waitForTimeout(2500);
      await p.getByRole("button", { name: /Open the mystery box/ }).click(); await p.waitForTimeout(2300); } },
  { name: "daily10-prize-longtime", portal: "daily10", id: "box", q: "", wait: 6500,
    act: async (p) => { await p.getByRole("button", { name: /^Open/ }).first().click(); await p.waitForTimeout(2500);
      await p.getByRole("button", { name: /Open the mystery box/ }).click(); await p.waitForTimeout(6000); } },
  { name: "daily10-results-longtime", portal: "daily10", id: "results", q: "", wait: 9500 },
  { name: "parent-home-cohort", portal: "parent", id: "home", q: "role=parent&plan=cohort", inset: true, hide: ["Karman predicted score"], cell: true, long: true },
  { name: "parent-update-cohort", portal: "parent", id: "update", q: "role=parent&plan=cohort", inset: true, long: true },
  { name: "parent-schedule-cohort", portal: "parent", id: "schedule", q: "role=parent&plan=cohort", inset: true, long: true },
  { name: "tutor-class-cohort", portal: "tutor", id: "class", q: "role=tutor", hide: ["Predicted"], long: true },
].filter((t) => t.name.includes(filter));

const DEV = {
  phone: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
};

async function prepare(page, t, device) {
  await page.evaluate(({ hide, cell, inset, phone }) => {
    const canvas = document.querySelector(".bg-canvas");
    const bg = canvas ? getComputedStyle(canvas).backgroundColor : "";
    const st = document.createElement("style");
    st.textContent = `html,body{background:${bg}} ${inset ? `.h-dvh{height:calc(100dvh - ${54}px)!important;margin-top:${54}px}` : ""}`;
    document.head.append(st);
    const root = document.querySelector("main") ?? document.body;
    for (const text of hide ?? []) {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const hits = [];
      let n;
      while ((n = w.nextNode())) if (n.textContent.trim().startsWith(text)) hits.push(n.parentElement);
      for (const el of hits) {
        let box = el.closest("section");
        if (cell || !box) { box = el; while (box.parentElement && getComputedStyle(box.parentElement).display !== "grid") box = box.parentElement; }
        if (box && box !== document.body) box.style.display = "none";
      }
    }
    // iOS keeps 34 pt clear at the bottom for the home indicator; Chromium reports env(safe-area-inset-bottom) as 0.
    if (phone) for (const el of document.querySelectorAll('[class*="safe-area-inset-bottom"]'))
      el.style.paddingBottom = `${parseFloat(getComputedStyle(el).paddingBottom) + 34}px`;
  }, { hide: t.hide, cell: t.cell, inset: t.inset && device === "phone", phone: device === "phone" });
  await page.waitForTimeout(300);
}

const geometry = JSON.parse(await readFile(OUT + "geometry.json", "utf8").catch(() => "{}"));
const browser = await chromium.launch();
const DEVS = (process.env.DEVICES ?? "phone,desktop").split(",");
for (const t of T) for (const device of DEVS) for (const mode of ["light", "dark"]) {
  const page = await browser.newPage({ ...DEV[device], colorScheme: mode });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/#/screen/${t.portal}/${t.id}?portal=${t.portal}&screen=${t.id}&bare=1&device=${device}&mode=${mode}${t.q ? "&" + t.q : ""}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(t.wait ?? 1500);
  await prepare(page, t, device);
  if (t.act) await t.act(page);
  const file = `${t.name}-${device}-${mode}`;
  await page.screenshot({ path: `${OUT}${file}.png` });
  const g = await page.evaluate(() => {
    const m = document.querySelector("main"); const nav = document.querySelector("nav.z-rail, nav");
    const r = m?.getBoundingClientRect(); const nr = nav?.getBoundingClientRect();
    return { mainTop: r?.top ?? null, mainBottom: r?.bottom ?? null, scrollH: m?.scrollHeight ?? null, clientH: m?.clientHeight ?? null, navTop: nr && nr.height < 120 ? nr.top : null,
      text: document.body.innerText };
  });
  const nums = (g.text.match(/\b1,[0-6]\d0\b|\b[2-8][0-9]0\b(?= (?:if|Reading|Math))/g) ?? []);
  delete g.text;
  geometry[file] = { ...g, w: DEV[device].viewport.width, h: DEV[device].viewport.height, scale: DEV[device].deviceScaleFactor, scoreLike: [...new Set(nums)] };
  if (t.long && device === "phone" && g.scrollH > g.clientH) {
    const extra = g.scrollH - g.clientH;
    await page.setViewportSize({ width: 440, height: 956 + extra });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}${t.name}-scroll-${device}-${mode}.png` });
    const gl = await page.evaluate(() => { const m = document.querySelector("main"); const r = m.getBoundingClientRect(); return { mainTop: r.top, mainBottom: r.bottom, scrollH: m.scrollHeight, clientH: m.clientHeight }; });
    geometry[`${t.name}-scroll-${device}-${mode}`] = { ...gl, w: 440, h: 956 + extra, scale: 3, extra, viewport: file };
  }
  console.log(file, errors.length ? `errors: ${errors.join(" | ").slice(0, 200)}` : "ok", geometry[file].scoreLike.join(","));
  await page.close();
}
await browser.close();
await writeFile(OUT + "geometry.json", JSON.stringify(geometry, null, 1));
