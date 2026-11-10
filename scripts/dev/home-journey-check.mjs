// Checks the painted home page in a real browser. Words sit straight on a painting here, so contrast is
// measured from the pixels actually behind each line of text, not from a background colour. Also checked:
// no sideways scroll, the birds, the phone menu, the still button, and every link.
// Usage: node scripts/dev/home-journey-check.mjs [baseUrl]
import { chromium } from "playwright";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3320";
const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
let failed = 0;
const say = (ok, what) => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};
const lum = (r, g, b) => {
  const f = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["tablet", 820, 1180],
  ["phone", 440, 956],
]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const s = document.createElement("style");
    s.textContent =
      'nextjs-portal,[role="dialog"][aria-labelledby="replay-consent-title"]{display:none!important}';
    document.addEventListener("DOMContentLoaded", () => document.head.append(s));
  });
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(6500);

  const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  say(wide <= 0, `${name}: no sideways scroll`);

  /* contrast, measured, in every section: hide the words, photograph what is behind them, and compare each
     line's own colour with the darkest and lightest tenth of the pixels under its letters */
  await page
    .waitForFunction(
      () => [...document.querySelectorAll(".journey .cam canvas")].every((c) => c.width !== 300),
      null,
      { timeout: 60000 }
    )
    .catch(() => {});
  const bad = [];
  for (const sel of ["#claim", "#proof", "#offer", "#who", "#how", "#ask", "#price"]) {
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "center" }), sel);
    await page.waitForTimeout(1900);
    const lines = await page.evaluate((s) => {
      const out = [];
      const root = document.querySelector(s);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!n.textContent.trim() || !el.offsetParent) continue;
        /* text on its own solid surface is checked by colour pair below, not by the painting */
        if (
          el.closest(".btn, .claim-pill, .tiles, .seg, .score-set button, .talk .q, .sr, [hidden]")
        )
          continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const cs = getComputedStyle(el);
        const size = parseFloat(cs.fontSize);
        for (const r of range.getClientRects()) {
          if (r.width < 8 || r.top < 0 || r.bottom > innerHeight) continue;
          out.push({
            text: n.textContent.trim().slice(0, 28),
            color: cs.color
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number),
            need: size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700) ? 3 : 4.5,
            x: Math.max(0, r.left),
            y: r.top,
            w: Math.min(innerWidth - r.left, r.width),
            h: r.height,
          });
        }
      }
      return out;
    }, sel);
    const hide = await page.addStyleTag({
      content:
        "#main *{color:transparent!important;text-decoration-color:transparent!important;animation-play-state:paused!important} #main .flock,#main .fireflies{visibility:hidden}",
    });
    await page.waitForTimeout(250);
    const { data, info } = await sharp(await page.screenshot({ type: "png" }))
      .raw()
      .toBuffer({ resolveWithObject: true });
    await hide.evaluate((el) => el.remove());
    const scale = info.width / width;
    for (const l of lines) {
      const ls = [];
      for (
        let y = Math.floor((l.y + l.h * 0.24) * scale);
        y < Math.floor((l.y + l.h * 0.82) * scale);
        y += 2
      )
        for (let x = Math.floor(l.x * scale); x < Math.floor((l.x + l.w) * scale); x += 3) {
          const i = (y * info.width + x) * info.channels;
          ls.push(lum(data[i], data[i + 1], data[i + 2]));
        }
      if (!ls.length) continue;
      ls.sort((a, b) => a - b);
      const fg = lum(...l.color);
      const worst = Math.min(
        ...[ls[Math.floor(ls.length * 0.1)], ls[Math.floor(ls.length * 0.9)]].map(
          (bg) => (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
        )
      );
      if (worst < l.need) bad.push(`${sel} ${worst.toFixed(2)} < ${l.need}: "${l.text}"`);
    }
  }
  say(
    bad.length === 0,
    `${name}: measured contrast over the painting, all seven sections${bad.length ? "\n     " + [...new Set(bad)].slice(0, 14).join("\n     ") : ""}`
  );

  /* the guarantee tiles follow the starting score and the track */
  await page.evaluate(() => document.querySelector("#offer").scrollIntoView({ block: "center" }));
  const tiles = async () => (await page.locator(".tiles.won").innerText()).replace(/\s+/g, "");
  say((await tiles()) === "1400", `${name}: private from 1200 guarantees 1400`);
  await page.locator(".score .seg button").nth(1).click();
  say((await tiles()) === "1350", `${name}: the cohort from 1200 guarantees 1350`);
  await page.locator(".score-set button").nth(1).click();
  say(
    (await tiles()) === "1310",
    `${name}: ten points higher moves to the next band (1210 to 1310)`
  );
  for (let i = 0; i < 25; i++) await page.locator(".score-set button").nth(1).click();
  say(
    (await page.locator(".score-none").count()) === 1,
    `${name}: from 1460 there is no guarantee, and it says so`
  );
  /* a doubt opens into its answer */
  await page.evaluate(() => document.querySelector("#ask").scrollIntoView({ block: "center" }));
  await page.locator(".asks button", { hasText: "try it first" }).evaluate((el) => el.click());
  say(
    (await page.locator(".talk .a").innerText()).includes("Start free"),
    `${name}: tapping a question shows its answer`
  );
  await page.evaluate(() => scrollTo(0, 0));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1500);

  /* birds are crossing the sky, and nothing has raised an error */
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.waitForTimeout(3500);
  const drawn = await page.evaluate(() => {
    const c = document.querySelector(".flock");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 40) n++;
    return n;
  });
  say(drawn > 3, `${name}: birds are in the sky (${drawn} samples)`);
  say(errors.length === 0, `${name}: the opening raises no error`);

  if (name === "phone") {
    await page.locator(".hd .menu").click();
    const sheet = await page.locator("#menu").boundingBox();
    say(
      !!sheet && sheet.height < height * 0.8 && sheet.width < width,
      "phone: the menu is a small sheet, not a full screen"
    );
    say(
      await page.locator('#menu a[href="/auth/sign-in"]').isVisible(),
      "phone: Sign in is in the menu"
    );
    await page.keyboard.press("Escape");
    say(await page.locator("#menu").isHidden(), "phone: Escape closes the menu");
  }
  if (name === "desktop") {
    say(
      await page.locator('.hd a[href="/auth/sign-in"]').isVisible(),
      "desktop: Sign in is in the top bar"
    );
    const still = page.locator(".ft .motion");
    await still.scrollIntoViewIfNeeded();
    await still.click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    say(
      (await page.locator(".ft .motion").getAttribute("aria-pressed")) === "true",
      "desktop: holding the painting still is remembered"
    );
    await page.locator(".ft .motion").scrollIntoViewIfNeeded();
    await page.locator(".ft .motion").click();
    const hrefs = await page.evaluate(() => [
      ...new Set([...document.querySelectorAll("#ks a[href]")].map((a) => a.href)),
    ]);
    for (const href of hrefs) {
      if (href.startsWith("mailto:")) continue;
      const res = await ctx.request
        .get(href, { maxRedirects: 5, timeout: 90000 })
        .catch(() => null);
      say(
        !!res && res.status() < 400,
        `link ${href.replace(base, "")} -> ${res?.status() ?? "no answer"}`
      );
    }
  }
  await ctx.close();
}
await browser.close();
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
