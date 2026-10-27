import { expect, test, type CDPSession, type Page } from "@playwright/test";

type Pt = { x: number; y: number };
const shell = (page: Page) => page.locator("[data-quiz-shell]");
const CURRENT = "[data-quiz-frame]:not([data-exiting])";
const layer = (page: Page, pane: "passage" | "question") =>
  page.locator(`${CURRENT} [data-ink-layer="${pane}"]`);
const stemBox = async (page: Page) =>
  (await page.locator(`${CURRENT} [data-ink-block="stem"]`).boundingBox())!;
const strokes = async (page: Page, pane: "passage" | "question") =>
  Number(await layer(page, pane).getAttribute("data-strokes"));

async function open(page: Page, query: string) {
  await page.goto(`/?${query}`);
  await expect(page.getByRole("radiogroup").or(page.getByLabel("Your answer"))).toBeVisible();
}

/** The client rect of a word inside a passage or stem block. */
async function wordRect(page: Page, block: string, word: string) {
  return page.evaluate(
    ([block, word]) => {
      const el = document.querySelector(
        `[data-quiz-frame]:not([data-exiting]) [data-ink-block="${block}"]`
      )!;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode() as Text | null; t; t = walker.nextNode() as Text | null) {
        const i = t.data.indexOf(word);
        if (i < 0) continue;
        const r = document.createRange();
        r.setStart(t, i);
        r.setEnd(t, i + word.length);
        const b = r.getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      }
      throw new Error(`no ${word}`);
    },
    [block, word] as const
  );
}

async function firstPoint(page: Page, pane: "passage" | "question"): Promise<Pt> {
  const raw = (await layer(page, pane).getAttribute("data-first"))!;
  const [x, y] = raw.split(",").map(Number);
  return { x, y };
}

async function mouseStroke(page: Page, points: Pt[]) {
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 3 });
  await page.mouse.up();
}

async function cdp(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  return client;
}
async function penStroke(client: CDPSession, points: Pt[], force = 0.5) {
  const ev = (type: "mouseMoved" | "mousePressed" | "mouseReleased", p: Pt, buttons: number) =>
    client.send("Input.dispatchMouseEvent", {
      type,
      x: p.x,
      y: p.y,
      button: "left",
      buttons,
      clickCount: 1,
      pointerType: "pen",
      force,
    });
  await ev("mouseMoved", points[0], 0);
  await ev("mousePressed", points[0], 1);
  for (const p of points.slice(1)) await ev("mouseMoved", p, 1);
  await ev("mouseReleased", points.at(-1)!, 0);
}
async function touchStroke(client: CDPSession, points: Pt[][]) {
  const toTouch = (ps: Pt[]) => ps.map((p, id) => ({ x: p.x, y: p.y, id, radiusX: 4, radiusY: 4 }));
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: toTouch(points[0]),
  });
  for (const ps of points.slice(1))
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: toTouch(ps) });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
const line = (a: Pt, b: Pt, n = 8) =>
  Array.from({ length: n + 1 }, (_, i) => ({
    x: a.x + ((b.x - a.x) * i) / n,
    y: a.y + ((b.y - a.y) * i) / n,
  }));
const circle = (c: Pt, r: number) =>
  Array.from({ length: 25 }, (_, i) => ({
    x: c.x + r * Math.cos((i / 24) * 2 * Math.PI),
    y: c.y + r * Math.sin((i / 24) * 2 * Math.PI),
  }));

test.describe("on every browser", () => {
  test.use({ viewport: { width: 1180, height: 820 } });

  test("a mouse draws only with the pencil on", async ({ page }) => {
    await open(page, "set=instant&q=rw");
    const w = await wordRect(page, "passage", "astronomy");
    await mouseStroke(page, line({ x: w.x, y: w.y + 4 }, { x: w.x + 60, y: w.y + 4 }));
    expect(await strokes(page, "passage")).toBe(0);
    await page.getByRole("button", { name: "Pencil" }).click();
    await mouseStroke(page, line({ x: w.x, y: w.y + 4 }, { x: w.x + 60, y: w.y + 4 }));
    expect(await strokes(page, "passage")).toBe(1);
  });

  test("ink stays on its word after rotating and enlarging the text", async ({ page }) => {
    await open(page, "set=instant&q=rw");
    await page.getByRole("button", { name: "Pencil" }).click();
    const w = await wordRect(page, "passage", "astronomy");
    await mouseStroke(
      page,
      line({ x: w.x + 2, y: w.y + w.height - 2 }, { x: w.x + w.width, y: w.y + w.height - 2 })
    );
    await page.setViewportSize({ width: 820, height: 1180 });
    await shell(page).evaluate((el: HTMLElement) =>
      el.style.setProperty("--quiz-text-scale", "1.5")
    );
    await page.waitForTimeout(300);
    const after = await wordRect(page, "passage", "astronomy");
    const p = await firstPoint(page, "passage");
    expect(p.x).toBeGreaterThan(after.x - 4);
    expect(p.x).toBeLessThan(after.x + after.width + 4);
    expect(p.y).toBeGreaterThan(after.y - 4);
    expect(p.y).toBeLessThan(after.y + after.height + 4);
  });

  test("ink hides on the next question and returns on the way back", async ({ page }) => {
    await open(page, "set=end&q=math");
    await page.getByRole("button", { name: "Pencil" }).click();
    const stem = await stemBox(page);
    await mouseStroke(
      page,
      line({ x: stem.x + 10, y: stem.y + 8 }, { x: stem.x + 120, y: stem.y + 8 })
    );
    expect(await strokes(page, "question")).toBe(1);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("button", { name: /Question 2 of/ })).toBeVisible();
    await expect(layer(page, "question")).toHaveAttribute("data-strokes", "0");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.locator("[data-exiting]")).toHaveCount(0);
    await expect(layer(page, "question")).toHaveAttribute("data-strokes", "1");
  });

  test("eraser, undo, redo and clear", async ({ page }) => {
    await open(page, "set=instant&q=math");
    await page.getByRole("button", { name: "Pencil" }).click();
    const stem = await stemBox(page);
    const a = line({ x: stem.x + 10, y: stem.y + 8 }, { x: stem.x + 160, y: stem.y + 8 });
    await mouseStroke(page, a);
    await mouseStroke(
      page,
      line({ x: stem.x + 10, y: stem.y + 24 }, { x: stem.x + 160, y: stem.y + 24 })
    );
    expect(await strokes(page, "question")).toBe(2);
    await page.getByRole("button", { name: "Eraser" }).click();
    await mouseStroke(
      page,
      line({ x: stem.x + 80, y: stem.y + 4 }, { x: stem.x + 80, y: stem.y + 10 })
    );
    expect(await strokes(page, "question")).toBe(1);
    await page.getByRole("button", { name: "Undo" }).click();
    expect(await strokes(page, "question")).toBe(2);
    await page.getByRole("button", { name: "Redo" }).click();
    expect(await strokes(page, "question")).toBe(1);
    await page.getByRole("button", { name: "Clear" }).click();
    expect(await strokes(page, "question")).toBe(0);
    await page.getByRole("button", { name: "Undo" }).click();
    expect(await strokes(page, "question")).toBe(1);
  });

  test("five pen colours; the choice carries to the next question", async ({ page }) => {
    await open(page, "set=end&q=math");
    await page.getByRole("button", { name: "Pencil" }).click();
    await page.getByRole("button", { name: /^Pen colour/ }).click();
    const swatches = page.getByRole("radio", { name: /^Colour \d$/ });
    await expect(swatches).toHaveCount(5);
    await swatches.nth(3).click();
    const stem = await stemBox(page);
    await mouseStroke(
      page,
      line({ x: stem.x + 10, y: stem.y + 8 }, { x: stem.x + 120, y: stem.y + 8 })
    );
    await expect(layer(page, "question")).toHaveAttribute("data-last-pen", "4");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.locator("[data-exiting]")).toHaveCount(0);
    const stem2 = await stemBox(page);
    await mouseStroke(
      page,
      line({ x: stem2.x + 10, y: stem2.y + 8 }, { x: stem2.x + 120, y: stem2.y + 8 })
    );
    await expect(layer(page, "question")).toHaveAttribute("data-last-pen", "4");
  });
});

test.describe("Apple Pencil and fingers (Chrome input emulation)", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "pen and touch dispatch need Chrome DevTools"
  );
  test.use({ viewport: { width: 1180, height: 820 } });

  test("a pen draws with the pencil off and never scrolls the pane", async ({ page }) => {
    await open(page, "set=instant&q=rw");
    const client = await cdp(page);
    const scroller = page.locator("[data-quiz-scroll]").first();
    const before = await scroller.evaluate((el) => el.scrollTop);
    const w = await wordRect(page, "passage", "astronomy");
    await penStroke(client, line({ x: w.x, y: w.y + 4 }, { x: w.x + 40, y: w.y + 140 }));
    expect(await strokes(page, "passage")).toBe(1);
    expect(await scroller.evaluate((el) => el.scrollTop)).toBe(before);
  });

  test("after a pen, a resting finger never draws", async ({ page }) => {
    await open(page, "set=instant&q=rw");
    const client = await cdp(page);
    await page.getByRole("button", { name: "Pencil" }).click();
    const w = await wordRect(page, "passage", "astronomy");
    await penStroke(client, line({ x: w.x, y: w.y + 4 }, { x: w.x + 40, y: w.y + 4 }));
    await touchStroke(
      client,
      line({ x: w.x, y: w.y + 30 }, { x: w.x + 80, y: w.y + 30 }).map((p) => [p])
    );
    expect(await strokes(page, "passage")).toBe(1);
  });

  test("with the pencil on, one finger draws and two fingers scroll", async ({ page }) => {
    await open(page, "set=instant&q=rw");
    await page.setViewportSize({ width: 820, height: 600 });
    const client = await cdp(page);
    await page.getByRole("button", { name: "Pencil" }).click();
    const w = await wordRect(page, "passage", "astronomy");
    await touchStroke(
      client,
      line({ x: w.x, y: w.y + 4 }, { x: w.x + 80, y: w.y + 4 }).map((p) => [p])
    );
    expect(await strokes(page, "passage")).toBe(1);
    const scroller = page.locator("[data-quiz-scroll]").first();
    const before = await scroller.evaluate((el) => el.scrollTop);
    const two = line({ x: w.x, y: w.y + 120 }, { x: w.x, y: w.y - 40 }).map((p) => [
      p,
      { x: p.x + 60, y: p.y },
    ]);
    await touchStroke(client, two);
    expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
    expect(await strokes(page, "passage")).toBe(1);
  });

  test("a pen tap on a choice picks it and leaves no ink", async ({ page }) => {
    await open(page, "set=instant&q=math");
    const client = await cdp(page);
    await page.getByRole("button", { name: "Pencil" }).click();
    const b = (await page.getByRole("radio").nth(1).boundingBox())!;
    await penStroke(client, [
      { x: b.x + 200, y: b.y + 20 },
      { x: b.x + 203, y: b.y + 21 },
    ]);
    await expect(page.getByRole("radio").nth(1)).toHaveAttribute("aria-checked", "true");
    expect(await strokes(page, "question")).toBe(0);
  });

  test("circling a choice letter offers Pick C? but never picks it", async ({ page }) => {
    await open(page, "set=instant&q=math");
    const client = await cdp(page);
    const badge = (await page.locator('[data-ink-choice="C"] [data-choice-badge]').boundingBox())!;
    await penStroke(
      client,
      circle({ x: badge.x + badge.width / 2, y: badge.y + badge.height / 2 }, 26)
    );
    const chip = page.getByRole("button", { name: "Pick C?" });
    await expect(chip).toBeVisible();
    await expect(page.getByRole("radio").nth(2)).toHaveAttribute("aria-checked", "false");
    await chip.click();
    await expect(page.getByRole("radio").nth(2)).toHaveAttribute("aria-checked", "true");
  });
});
