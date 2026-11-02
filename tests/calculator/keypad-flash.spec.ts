// The keypad's open and close never flash white over the expression list (owner report,
// 2026-10-22: on a dark theme on his phone a white flash showed where the keypad covers the rows).
// Every keypad transition in the shadow root is paused and stepped through its 300 ms in 25 ms
// steps, and each frame of the strip the keypad covers is read back: no frame may have a bright
// region on a dark skin. A touch focus of a row (which opens the keypad, K-2) must find the field's
// textarea already at inputmode="none", so a phone never starts to raise its own (white) keyboard.

import { expect, test, type Page } from "@playwright/test";
import { SKIN_COLORS } from "@/lib/calculator/theme/skin-colors.generated";
import { SKIN_IDS } from "@/lib/calculator/theme/skins";
import { enc, keypadOpen, openShell, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const DARK_SKINS = SKIN_IDS.filter((id) => SKIN_COLORS[id].normal.dark);
const STEP_MS = 25;
const END_MS = 325;
/** A pixel this bright (0 to 255 relative luminance) is white enough to flash on a dark skin. */
const BRIGHT = 217;

type Strip = { x: number; y: number; width: number; height: number };

/** The share of bright pixels in a PNG, decoded in the page. */
async function brightShare(page: Page, png: Buffer): Promise<number> {
  return page.evaluate(
    async ({ b64, bright }) => {
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      let hits = 0;
      for (let i = 0; i < data.length; i += 4) {
        const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        if (l > bright) hits++;
      }
      return hits / (data.length / 4);
    },
    { b64: png.toString("base64"), bright: BRIGHT }
  );
}

/** The list strip the open keypad covers: the list's width, from the tray's top to its bottom. */
function coveredStrip(page: Page): Promise<Strip> {
  return page.evaluate(() => {
    const shadow = document.querySelector("#calc")!.shadowRoot!;
    const list = shadow.querySelector(".kc-list-region")!.getBoundingClientRect();
    const app = shadow.querySelector(".kc-app")!.getBoundingClientRect();
    const tray = 169;
    return { x: list.left, y: app.bottom - tray, width: list.width, height: tray };
  });
}

/** Pauses every running transition in the calculator; returns how many there are. */
function pauseMotion(page: Page): Promise<number> {
  return page.evaluate(() => {
    const app = document.querySelector("#calc")!.shadowRoot!.querySelector(".kc-app")!;
    const list = app.getAnimations({ subtree: true });
    for (const a of list) a.pause();
    return list.length;
  });
}

async function seek(page: Page, ms: number): Promise<void> {
  await page.evaluate(async (t) => {
    const app = document.querySelector("#calc")!.shadowRoot!.querySelector(".kc-app")!;
    for (const a of app.getAnimations({ subtree: true })) a.currentTime = t;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, ms);
}

/** The bright share of each sampled frame, from the first frame after `act` to the end. */
async function sampleFrames(page: Page, strip: Strip, act: () => Promise<void>, open: boolean) {
  await act();
  await expect.poll(() => keypadOpen(page)).toBe(open);
  const running = await pauseMotion(page);
  const shares: number[] = [];
  for (let t = 0; t <= END_MS; t += STEP_MS) {
    if (running > 0) await seek(page, t);
    shares.push(await brightShare(page, await page.screenshot({ clip: strip })));
    if (running === 0) break; // reduced motion or an instant path: one frame is the whole story
  }
  await page.evaluate(() => {
    const app = document.querySelector("#calc")!.shadowRoot!.querySelector(".kc-app")!;
    for (const a of app.getAnimations({ subtree: true })) a.finish();
  });
  return shares;
}

for (const skin of DARK_SKINS) {
  test(`no frame of the keypad's open or close flashes bright over the list on ${skin}`, async ({
    page,
    isMobile,
  }) => {
    test.skip(skin !== "observatory" && !isMobile, "every dark skin runs on the phone projects");
    const rows = enc(["y=x", "", "", ""]);
    if (isMobile) {
      await openShell(page, `?theme=${skin}&rows=${rows}`);
    } else {
      await openShell(page, `?theme=${skin}&w=900&h=600&rows=${rows}`);
    }
    const strip = await coveredStrip(page);
    const field = page.locator('#calc [data-row-id="2"] .mq-editable-field');
    const opening = await sampleFrames(
      page,
      strip,
      async () => {
        if (isMobile) await field.tap();
        else await page.getByRole("button", { name: "Show keypad" }).click();
      },
      true
    );
    const closing = await sampleFrames(
      page,
      strip,
      async () => {
        if (isMobile) await page.keyboard.press("Escape");
        else await page.getByRole("button", { name: "Hide keypad" }).click();
      },
      false
    );
    // Row text and the keys' labels are light ink on a dark skin; a flash would light the strip.
    expect(Math.max(...opening), `open ${opening.join(", ")}`).toBeLessThan(0.05);
    expect(Math.max(...closing), `close ${closing.join(", ")}`).toBeLessThan(0.05);
  });
}

test("a touch focus of a row finds its textarea already at inputmode none, so no system keyboard starts to rise under the keypad", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "touch focus");
  await openShell(page, `?skin=observatory&rows=${enc(["y=x", ""])}`);
  await page.evaluate(() => {
    const shadow = document.querySelector("#calc")!.shadowRoot!;
    const seen: (string | null)[] = [];
    (globalThis as { __focusModes?: (string | null)[] }).__focusModes = seen;
    shadow.addEventListener(
      "focusin",
      (event) => {
        const target = event.target as Element;
        if (target.tagName === "TEXTAREA") seen.push(target.getAttribute("inputmode"));
      },
      true
    );
  });
  await page.locator('#calc [data-row-id="2"] .mq-editable-field').tap();
  await expect.poll(() => keypadOpen(page)).toBe(true);
  await page.locator('#calc [data-row-id="1"] .mq-editable-field').tap();
  const modes = await page.evaluate(
    () => (globalThis as { __focusModes?: (string | null)[] }).__focusModes
  );
  expect(modes).toEqual(["none", "none"]);
});
