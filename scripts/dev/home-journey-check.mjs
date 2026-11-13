// Checks the home page in a real browser, in light mode and in dark mode. Words sit straight on a live
// landscape here (lib/flight), so contrast is
// measured from the pixels actually behind each line of text, not from a background colour. Also checked:
// no sideways scroll, the birds, the phone menu, the still button, and every link.
// Usage: node scripts/dev/home-journey-check.mjs [baseUrl]
import { chromium } from "playwright";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3320";
const gpu = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"];
const browser = await chromium.launch(
  process.env.PW_BUNDLED ? { args: gpu } : { channel: "chrome", args: gpu }
);
let failed = 0;
const say = (ok, what) => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};
const lum = (r, g, b) => {
  const f = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

for (const [size, width, height, mode] of [
  ["desktop", 1440, 900, "light"],
  ["desktop", 1440, 900, "dark"],
  ["tablet", 820, 1180, "light"],
  ["phone", 440, 956, "light"],
  ["phone", 390, 844, "dark"],
]) {
  const name = `${size} ${mode}`;
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.addInitScript((m) => {
    localStorage.setItem("karman-site-theme", m);
  }, mode);
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
  const painted = await page
    .waitForSelector(".flight[data-painted]", { timeout: 30000 })
    .catch(() => null);
  say(!!painted, `${name}: the landscape is drawn`);
  const bad = [];
  for (const sel of ["#claim", "#proof", "#offer", "#who", "#how", "#receipts", "#ask"]) {
    if (!(await page.locator(sel).count())) continue;
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: "center" }), sel);
    await page.waitForTimeout(1900);
    const lines = await page.evaluate((s) => {
      const out = [];
      const root = document.querySelector(s);
      const under = document.querySelector(".hd").getBoundingClientRect().bottom + 54;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!n.textContent.trim() || !el.offsetParent) continue;
        /* text on its own solid surface is checked by colour pair below, not by the painting */
        /* the phone's screen is a picture of Messages in Apple's own colours, and it pans */
        if (el.closest(".btn, .claim-pill, .chat-q, .txt, .sr, [hidden]")) continue;
        /* a cloud fading in at the bottom of its sky, or out at the top, is not yet meant to be read */
        const cloud = el.closest(".cloud");
        if (cloud) {
          const sky = cloud.closest(".sky").getBoundingClientRect();
          const c = cloud.getBoundingClientRect();
          const at = (c.top + c.height / 2 - sky.top) / sky.height;
          if (at < 0.24 || at > 0.76) continue;
        }
        const range = document.createRange();
        range.selectNodeContents(n);
        const cs = getComputedStyle(el);
        const size = parseFloat(cs.fontSize);
        for (const r of range.getClientRects()) {
          /* words passing under the travelling top bar and its veil are on their way out */
          if (r.width < 8 || r.top < under || r.bottom > innerHeight) continue;
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
    `${name}: measured contrast over the landscape, every section${bad.length ? "\n     " + [...new Set(bad)].slice(0, 14).join("\n     ") : ""}`
  );

  /* the guarantee: the stamp comes down and the three cards arrive */
  await page.evaluate(() => document.querySelector("#offer").scrollIntoView({ block: "center" }));
  await page.waitForTimeout(3200);
  const gua = await page.evaluate(() => ({
    stamp: +getComputedStyle(document.querySelector(".gua-stamp")).opacity,
    cards: [...document.querySelectorAll(".gua-cards li")].filter(
      (l) => +getComputedStyle(l).opacity > 0.9
    ).length,
    sig: document.querySelector(".gua-sig").getBoundingClientRect().width,
  }));
  say(gua.stamp === 1, `${name}: the guarantee's stamp is on the page`);
  say(gua.cards === 3, `${name}: the three outcomes have arrived (${gua.cards})`);
  say(gua.sig > 150, `${name}: the signature is drawn (${Math.round(gua.sig)} px wide)`);
  /* a doubt opens into its answer */
  await page.evaluate(() => document.querySelector("#ask").scrollIntoView({ block: "center" }));
  await page.locator(".cloud", { hasText: "try it first" }).evaluate((el) => el.click());
  await page.waitForTimeout(6500);
  say(
    (await page.locator(".chat-view").innerText()).includes("Start free"),
    `${name}: picking a cloud sends its question and Karman answers`
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

  if (size === "phone") {
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
    await page.locator(".hd .menu").click();
    await page.locator(".hd .menu").click();
    say(await page.locator("#menu").isHidden(), "phone: the menu button closes the menu it opened");
    await page.locator(".hd .menu").click();
    await page.mouse.click(4, Math.round(height * 0.6));
    say(await page.locator("#menu").isHidden(), "phone: a tap outside closes the menu");
    const bar = await page.evaluate(() =>
      [".hd .cta", ".hd .menu"].map((sel) => {
        const b = document.querySelector(sel).getBoundingClientRect();
        return [Math.round(b.left), Math.round(b.height)];
      })
    );
    say(
      bar.every(([, h]) => h > 30 && h < 52) && bar[0][0] < bar[1][0],
      "phone: Start free (one line) and the menu sit in the bar in that order"
    );
  }
  if (size === "desktop") {
    /* the switch travels with the page; flipping it changes the mode and leaves the reader where they are */
    await page.evaluate(() =>
      document.querySelector("#how").scrollIntoView({ behavior: "instant" })
    );
    await page.waitForTimeout(1500);
    const before = await page.evaluate(() => scrollY);
    await page.locator("#ks > .theme").click();
    await page.waitForTimeout(1900);
    const after = await page.evaluate(() => ({
      y: scrollY,
      mode: document.getElementById("ks").dataset.mode,
    }));
    say(
      after.mode !== mode && Math.abs(after.y - before) < 2 && before > 500,
      `${name}: the switch flips the mode and the page stays put (${before} to ${after.y})`
    );
    await page.locator("#ks > .theme").click();
    await page.waitForTimeout(400);
  }
  if (size === "desktop" && mode === "light") {
    say(
      await page.locator('.hd a[href="/auth/sign-in"]').isVisible(),
      `${name}: Sign in is in the top bar`
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
      /* Karman's own pages only: the social links belong to other sites */
      if (href.startsWith("mailto:") || !href.startsWith(base)) continue;
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
