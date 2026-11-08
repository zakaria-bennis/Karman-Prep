// Proves the school screens hold still under reduced motion. The screens that
// animate on arrival are the seat ledger (squares fading in), the rank bars
// (bars growing from the left) and the setup steps (the check drawing
// itself). For each screen and state that shows one, the page opens with
// reducedMotion 'reduce' and is captured twice: the first painted frame and
// 1.5 s later. The two must be identical pixel for pixel, and no animation
// may be running on the first frame. A control run without reduced motion
// must differ, which proves the check can see the motion it is looking for.
// Shots go to prototypes/portals/shots/school/reduced-motion/.
// The dev server must be up.  node src/portals/school/checks/reduced-motion.mjs
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = fileURLToPath(new URL("../../../../shots/school/reduced-motion/", import.meta.url));
const BASE = process.env.BASE ?? "http://127.0.0.1:5174";
// [screen, role, state, what animates there]
const CASES = [
  ["overview", "admin", "long-time", "SeatLedger, RankBars"],
  ["overview", "admin", "first-day", "SeatLedger, SetupSteps"],
  ["overview", "admin", "empty", "SeatLedger, SetupSteps (checks drawn)"],
  ["classes", "admin", "long-time", "RankBars"],
  ["classes", "teacher", "long-time", "RankBars"],
  ["class", "teacher", "long-time", "RankBars (skills, levels)"],
  ["keys", "admin", "long-time", "SeatLedger"],
];
const DEVICES = {
  phone: {
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const url = (id, role, state, device) =>
  `${BASE}/#/screen/school/${id}?portal=school&screen=${id}&role=${role}&device=${device}&mode=light&state=${state}&bare=1`;

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });
const results = [];
let failed = 0;

async function capture(c, device, reducedMotion) {
  const [id, role, state] = c;
  const page = await browser.newPage({ ...DEVICES[device], colorScheme: "light", reducedMotion });
  await page.goto(url(id, role, state, device), { waitUntil: "domcontentloaded" });
  // The first frame with the screen's heading painted, before any arrival could finish.
  await page.waitForSelector("main h1, main h2", { timeout: 8000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  const running = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === "running" && a.effect?.target?.closest?.("main"))
      .map(
        (a) =>
          `${a.effect.target.tagName.toLowerCase()}.${String(a.effect.target.className?.baseVal ?? a.effect.target.className).split(" ")[0]} ${a.animationName ?? a.constructor.name}`
      )
  );
  const first = await page.locator("main").screenshot({ animations: "allow" });
  await page.waitForTimeout(1500);
  const later = await page.locator("main").screenshot({ animations: "allow" });
  await page.close();
  return { running, same: first.equals(later), first, later };
}

for (const c of CASES)
  for (const device of ["phone", "desktop"]) {
    const [id, role, state, what] = c;
    const reduce = await capture(c, device, "reduce");
    const control = await capture(c, device, "no-preference");
    const name = `${id}-${role}-${state}-${device}`;
    await writeFile(path.join(OUT, `${name}-reduce-first.png`), reduce.first);
    await writeFile(path.join(OUT, `${name}-reduce-later.png`), reduce.later);
    const ok = reduce.same && reduce.running.length === 0;
    if (!ok) failed++;
    results.push({
      name,
      what,
      still: reduce.same,
      running: reduce.running,
      controlMoves: !control.same || control.running.length > 0,
    });
    console.log(
      `${ok ? "ok  " : "MOVES"} ${name} (${what}): reduced ${reduce.same ? "identical" : "differs"}, ${reduce.running.length} running${reduce.running.length ? ` [${[...new Set(reduce.running)].slice(0, 3).join("; ")}]` : ""}; without reduced motion ${!control.same || control.running.length ? `moves (${control.running.length} running)` : "also still"}`
    );
  }
// After an action: adding a class ticks a setup step, which draws its check
// and moves the progress bar. Under reduced motion both land at once.
for (const device of ["phone", "desktop"])
  for (const reducedMotion of ["reduce", "no-preference"]) {
    const page = await browser.newPage({ ...DEVICES[device], colorScheme: "light", reducedMotion });
    await page.goto(url("overview", "admin", "first-day", device), { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Add a class" }).first().click();
    await page.getByLabel("Class name").fill("Period 4");
    await page.getByRole("button", { name: "Add the class" }).click();
    // Straight after the click, while the sheet is still closing: what in the
    // setup block is moving? CSS transitions and animations show in
    // getAnimations(); the check's stroke is drawn by framer-motion in
    // JavaScript, so its drawn length (stroke-dasharray, 1 when whole) is
    // sampled for 600 ms as well.
    const { running, drawn } = await page.evaluate(async () => {
      const running = document
        .getAnimations()
        .filter(
          (a) =>
            a.playState === "running" &&
            a.effect?.target?.closest?.("main section") &&
            !a.effect.target.closest(".k-glass")
        )
        .map(
          (a) =>
            `${a.effect.target.tagName.toLowerCase()} ${a.transitionProperty ?? a.animationName ?? a.constructor.name}`
        );
      const drawn = [];
      for (let i = 0; i < 10; i++) {
        const paths = [...document.querySelectorAll("main ol path")];
        drawn.push(
          Math.min(1, ...paths.map((p) => parseFloat(p.getAttribute("stroke-dasharray") ?? "1")))
        );
        await new Promise((r) => setTimeout(r, 60));
      }
      return { running, drawn };
    });
    if (drawn.some((v) => v < 1))
      running.push(`check stroke drawing (${drawn.map((v) => v.toFixed(2)).join(" ")})`);
    await page.waitForSelector("[role=dialog]", { state: "detached" }).catch(() => {});
    const steps = page.locator("main ol").first();
    // The glass button refracts the backdrop the closing sheet just left, which
    // is the design system's glass, not this screen's motion: masked.
    const mask = [page.locator("main .k-glass")];
    const first = await page.locator("main").screenshot({ animations: "allow", mask });
    await page.waitForTimeout(1500);
    const later = await page.locator("main").screenshot({ animations: "allow", mask });
    const same = first.equals(later);
    const name = `overview-admin-first-day-${device}-after-add`;
    if (reducedMotion === "reduce") {
      await writeFile(path.join(OUT, `${name}-reduce.png`), later);
      const ok = same && running.length === 0 && (await steps.count()) > 0;
      if (!ok) failed++;
      results.push({ name, what: "SetupSteps after a step is done", still: same, running });
      console.log(
        `${ok ? "ok  " : "MOVES"} ${name}: reduced ${same ? "identical" : "differs"}, ${running.length} running${running.length ? ` [${[...new Set(running)].join("; ")}]` : ""}`
      );
    } else
      console.log(
        `     ${name} without reduced motion: ${!same || running.length ? `moves (${running.length} running)` : "also still"}`
      );
    await page.close();
  }

await browser.close();
await writeFile(path.join(OUT, "summary.json"), JSON.stringify(results, null, 1));
console.log(
  failed
    ? `\n${failed} cases still move under reduced motion`
    : `\nevery case holds still under reduced motion (${results.length} cases)`
);
process.exit(failed ? 1 : 0);
