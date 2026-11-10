// Captures the student portal's phone screens for the marketing site (public/site/portal/), from the app
// itself, in light and dark. The capture leaves room at the top for the phone frame's Dynamic Island, the
// way iOS insets a real app, and leaves out the dock's brand mark and the developer badge.
// Usage: node scripts/dev/portal-phone-shots.mjs <outDir> [baseUrl]   (then convert the PNGs to WebP)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const out = process.argv[2] ?? "tmp/portal-shots";
const base = process.argv[3] ?? "http://localhost:3320";
mkdirSync(out, { recursive: true });
const SCREENS = { today: "/dashboard/student", progress: "/dashboard/student/progress" };
const INSET = 50;
const CSS = `
  nextjs-portal { display: none !important; }
  .kp-brand, .kp-brand-m { display: none !important; }
  .kp-appbar, .kp-main { transform: translateY(${INSET}px) !important; }
  [role="dialog"][aria-labelledby="replay-consent-title"] { display: none !important; }
`;
const browser = await chromium.launch(process.env.PW_BUNDLED ? {} : { channel: "chrome" });
for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
    isMobile: true,
    hasTouch: true,
  });
  for (const [name, path] of Object.entries(SCREENS)) {
    const page = await ctx.newPage();
    await page.goto(`${base}${path}?paint-time=day&paint-scene=3`, { waitUntil: "load" });
    await page.addStyleTag({ content: CSS });
    await page.waitForTimeout(7000);
    await page.screenshot({ path: `${out}/${name}-phone-${scheme}.png` });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
