import { expect, test, type Page } from "@playwright/test";

const CURRENT = "[data-quiz-frame]:not([data-exiting])";

/** Select a word in a block the way a reader would. */
async function selectWord(page: Page, block: string, word: string) {
  await page.evaluate(
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
        const sel = window.getSelection()!;
        sel.removeAllRanges();
        sel.addRange(r);
        return;
      }
      throw new Error(word);
    },
    [block, word] as const
  );
}
const count = (page: Page) =>
  page
    .locator(`${CURRENT} [data-quiz-pane="passage"] [data-highlights]`)
    .getAttribute("data-highlights");

test.describe("desktop", () => {
  test.use({ viewport: { width: 1180, height: 820 } });

  test("select, highlight, add a note, edit it and remove", async ({ page }) => {
    await page.goto("/?set=instant&q=rw");
    await selectWord(page, "passage", "astronomy club");
    const menu = page.getByRole("toolbar", { name: "Highlight and note" });
    await expect(menu).toBeVisible();
    await menu.getByRole("button", { name: "Highlight colour 2" }).click();
    await expect.poll(() => count(page)).toBe("1");
    const mark = (await page.locator(`${CURRENT} [data-highlights] span`).first().boundingBox())!;
    await page.mouse.click(mark.x + mark.width / 2, mark.y + mark.height / 2);
    await menu.getByRole("button", { name: "Add note" }).click();
    await page.getByLabel("Note", { exact: true }).fill("Who counted the stars");
    await page.getByRole("button", { name: "Save note" }).click();
    await page.mouse.click(mark.x + mark.width / 2, mark.y + mark.height / 2);
    await expect(menu.getByRole("button", { name: "Edit note" })).toBeVisible();
    await menu.getByRole("button", { name: "Remove" }).click();
    await expect.poll(() => count(page)).toBe("0");
  });

  test("a highlight follows its words when the layout changes", async ({ page }) => {
    await page.goto("/?set=instant&q=rw");
    await selectWord(page, "passage", "hilltop");
    await page.getByRole("button", { name: "Highlight colour 1" }).click();
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.waitForTimeout(300);
    const word = await page.evaluate(() => {
      const el = document.querySelector(
        '[data-quiz-frame]:not([data-exiting]) [data-ink-block="passage"]'
      )!;
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let t = w.nextNode() as Text | null; t; t = w.nextNode() as Text | null) {
        const i = t.data.indexOf("hilltop");
        if (i < 0) continue;
        const r = document.createRange();
        r.setStart(t, i);
        r.setEnd(t, i + 7);
        const b = r.getBoundingClientRect();
        return { x: b.x, y: b.y };
      }
      return null;
    });
    const mark = (await page.locator(`${CURRENT} [data-highlights] span`).first().boundingBox())!;
    expect(Math.abs(mark.x - word!.x)).toBeLessThan(4);
    expect(Math.abs(mark.y - word!.y)).toBeLessThan(4);
  });

  test("with the pencil on, dragging draws and never opens the menu", async ({ page }) => {
    await page.goto("/?set=instant&q=rw");
    await page.getByRole("button", { name: "Pencil" }).click();
    const box = (await page.locator(`${CURRENT} [data-ink-block="passage"]`).boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 10, { steps: 6 });
    await page.mouse.up();
    await expect(page.getByRole("toolbar", { name: "Highlight and note" })).toHaveCount(0);
  });
});

test.describe("phone", () => {
  test.skip(({ browserName }) => browserName === "firefox", "Firefox has no mobile emulation");
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("the menu sits clear of the selection", async ({ page }) => {
    await page.goto("/?set=instant&q=rw");
    await selectWord(page, "passage", "astronomy");
    const menu = (await page.getByRole("toolbar", { name: "Highlight and note" }).boundingBox())!;
    const word = await page.evaluate(() => {
      const r = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    });
    expect(menu.y >= word.bottom - 1 || menu.y + menu.height <= word.top + 1).toBe(true);
  });
});
