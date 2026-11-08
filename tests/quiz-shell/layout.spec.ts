import { expect, test, type Page } from "@playwright/test";

const SIZES = [
  { w: 390, h: 844, layout: "compact" },
  { w: 700, h: 900, layout: "medium" },
  { w: 820, h: 1180, layout: "medium" },
  { w: 1180, h: 820, layout: "wide" },
  { w: 1440, h: 900, layout: "wide" },
] as const;

async function open(page: Page, q: string) {
  await page.goto(`/?set=instant&q=${q}`);
  await expect(page.locator("[data-quiz-shell]")).toBeVisible();
}

for (const size of SIZES) {
  test.describe(`${size.w}x${size.h}`, () => {
    test.use({ viewport: { width: size.w, height: size.h } });

    test("no horizontal page overflow and the expected layout", async ({ page }) => {
      await open(page, "rw");
      const root = page.locator("[data-quiz-shell]");
      await expect(root).toHaveAttribute("data-layout", size.layout);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
    });

    test("reading questions: one column, stacked, or side by side", async ({ page }) => {
      await open(page, "rw");
      const passage = await page.locator('[data-quiz-pane="passage"]').boundingBox();
      const question = await page.locator('[data-quiz-pane="question"]').boundingBox();
      if (size.layout === "wide") {
        expect(question!.x).toBeGreaterThan(passage!.x + passage!.width - 2);
      } else {
        expect(question!.y).toBeGreaterThan(passage!.y + passage!.height - 2);
      }
    });

    test("math is one centred column", async ({ page }) => {
      await open(page, "math");
      await expect(page.locator('[data-quiz-pane="passage"]')).toHaveCount(0);
      const q = (await page
        .locator('[data-quiz-pane="question"] [data-quiz-column]')
        .boundingBox())!;
      const centre = q.x + q.width / 2;
      expect(Math.abs(centre - size.w / 2)).toBeLessThan(24);
    });

    test("the bars never cover text while scrolling", async ({ page }) => {
      await open(page, "rw");
      const [top, bottom] = await page.$$eval("[data-quiz-bar]", (els) =>
        els.map((e) => e.getBoundingClientRect()).map((r) => ({ top: r.top, bottom: r.bottom }))
      );
      for (let step = 0; step < 10; step++) {
        for (const pane of await page.locator("[data-quiz-scroll]").all()) {
          await pane.evaluate((el) => el.scrollBy(0, 80));
          const box = (await pane.boundingBox())!;
          // Each scrolling pane sits between the bars and clips its own text.
          expect(box.y).toBeGreaterThanOrEqual(top.bottom - 1);
          expect(box.y + box.height).toBeLessThanOrEqual(bottom.top + 1);
          expect(await pane.evaluate((el) => getComputedStyle(el).overflowY)).toMatch(
            /auto|scroll/
          );
        }
      }
    });
  });
}

test.describe("divider", () => {
  test.use({ viewport: { width: 1180, height: 820 } });
  test("keeps both panes at least 360 px wide", async ({ page }) => {
    await open(page, "rw");
    const divider = page.getByRole("separator", { name: "Resize passage and question" });
    const box = (await divider.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(100, box.y + 50, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const passage = (await page.locator('[data-quiz-pane="passage"]').boundingBox())!;
    expect(passage.width).toBeGreaterThanOrEqual(359);
    await divider.focus();
    await page.keyboard.press("ArrowRight");
    const after = (await page.locator('[data-quiz-pane="passage"]').boundingBox())!;
    expect(after.width).toBeGreaterThan(passage.width);
  });
});
