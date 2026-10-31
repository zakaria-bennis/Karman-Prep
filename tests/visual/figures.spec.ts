// ============================================================
// Figure answer choices on real devices (figure engine spec §2).
//
// Renders the dev-only fixture page /dev/figure-choices (graph, chart and
// shape choices through the real CatalogQuestion) at phone, tablet and
// laptop sizes in a light and a dark theme, and checks geometry rather than
// pixels:
//   - phone: the four choices stack one per row, letter beside each figure;
//   - tablet and laptop: a 2×2 grid when the four fit;
//   - the page never scrolls sideways;
//   - the smallest text on screen is at least 12px;
//   - the figure ink meets WCAG AA contrast on its choice.
// ============================================================

import { expect, test, type Page } from "@playwright/test";

const DEVICES = [
  { name: "phone", width: 390, height: 844, columns: 1 },
  { name: "tablet", width: 820, height: 1180, columns: 2 },
  { name: "laptop", width: 1280, height: 800, columns: 2 },
] as const;

// Site theme ids (src/lib/themes/palettes.ts): ivory is the light default, observatory the dark.
const THEMES = [
  { name: "light", id: "ivory" },
  { name: "dark", id: "observatory" },
] as const;

const MIN_TEXT_PX = 12;

async function open(page: Page, themeId: string) {
  await page.addInitScript((id) => {
    try {
      localStorage.setItem("karman-theme:visitor", id);
      localStorage.setItem("karman-theme:active", id);
    } catch {
      /* the bootstrap falls back to the default theme */
    }
  }, themeId);
  await page.goto("/dev/figure-choices");
  await page.locator("[data-figure-choices]").first().waitFor();
  await expect(page.locator("html")).toHaveAttribute("data-theme", themeId);
}

type Rect = { x: number; y: number; width: number; height: number };

const distinct = (values: number[]) =>
  values.filter((v, i) => values.findIndex((w) => Math.abs(w - v) < 2) === i).length;

for (const theme of THEMES) {
  for (const device of DEVICES) {
    test(`figure choices at ${device.name} (${device.width}×${device.height}), ${theme.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      await open(page, theme.id);

      const groups = page.locator("[data-figure-choices]");
      const count = await groups.count();
      expect(count).toBeGreaterThanOrEqual(3);

      for (let g = 0; g < count; g++) {
        const group = groups.nth(g);
        const choices = group.locator("[data-figure-choice]");
        await expect(choices).toHaveCount(4);
        const rects: Rect[] = [];
        for (let i = 0; i < 4; i++) rects.push((await choices.nth(i).boundingBox())!);

        // Every choice draws its own figure, all at one size.
        const svgs = group.locator("[data-figure-choice] svg[role=img]");
        await expect(svgs).toHaveCount(4);
        const boxes = await svgs.evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return `${el.getAttribute("viewBox")}|${Math.round(r.width)}x${Math.round(r.height)}`;
          })
        );
        expect(new Set(boxes).size).toBe(1);

        const lefts = rects.map((r) => r.x);
        const tops = rects.map((r) => r.y);
        if (device.columns === 1) {
          // One per row, in letter order.
          expect(distinct(lefts)).toBe(1);
          for (let i = 1; i < 4; i++)
            expect(tops[i]).toBeGreaterThanOrEqual(tops[i - 1] + rects[i - 1].height - 1);
          // The letter sits beside its figure, not above it.
          const beside = await group.locator("[data-figure-choice]").evaluateAll((els) =>
            els.map((el) => {
              const letter = el.querySelector("[data-choice-letter]")!.getBoundingClientRect();
              const svg = el.querySelector("svg[role=img]")!.getBoundingClientRect();
              return letter.right <= svg.left && letter.top < svg.bottom && letter.bottom > svg.top;
            })
          );
          expect(beside).toEqual([true, true, true, true]);
        } else {
          // A 2×2 grid: A B on the first row, C D on the second.
          expect(distinct(lefts)).toBe(2);
          expect(distinct(tops)).toBe(2);
          expect(Math.abs(tops[0] - tops[1])).toBeLessThan(2);
          expect(Math.abs(tops[2] - tops[3])).toBeLessThan(2);
          expect(lefts[0]).toBeLessThan(lefts[1]);
        }
      }

      // The page itself never scrolls sideways.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);

      // The smallest text inside the choices, as rendered: SVG text scaled by its CTM.
      const smallest = await page.evaluate(() => {
        let min = Infinity;
        let where = "";
        for (const root of document.querySelectorAll("[data-figure-choices]")) {
          for (const t of root.querySelectorAll<SVGTextElement>("svg text")) {
            if (!t.textContent?.trim()) continue;
            const ctm = t.getScreenCTM();
            const px =
              parseFloat(getComputedStyle(t).fontSize) * (ctm ? Math.hypot(ctm.a, ctm.b) : 1);
            if (px < min) [min, where] = [px, `svg "${t.textContent}"`];
          }
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const el = n.parentElement;
            if (!n.textContent?.trim() || !el || el.closest("svg")) continue;
            const style = getComputedStyle(el);
            // Visually hidden status text (sr-only) is not on screen.
            if (el.getBoundingClientRect().width <= 1 || style.visibility === "hidden") continue;
            const px = parseFloat(style.fontSize);
            if (px < min) [min, where] = [px, `"${n.textContent.trim()}"`];
          }
        }
        return { min, where };
      });
      expect(smallest.min, `smallest text ${smallest.where}`).toBeGreaterThanOrEqual(MIN_TEXT_PX);

      // Figure ink against its choice's background meets WCAG AA (4.5:1) in this theme.
      const contrast = await page.evaluate(() => {
        const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
        const lum = ([r, g, b]: number[]) => {
          const ch = [r, g, b].map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
        };
        const button = document.querySelector("[data-figure-choice] button")!;
        let el: Element | null = button;
        let bg = [0, 0, 0, 0];
        while (el) {
          const c = parse(getComputedStyle(el).backgroundColor);
          if (c.length >= 3 && (c[3] ?? 1) > 0.99) {
            bg = c;
            break;
          }
          el = el.parentElement;
        }
        const ink = document.querySelector("[data-figure-choice] svg text")!;
        const fg = parse(getComputedStyle(ink).fill);
        const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
        return (a + 0.05) / (b + 0.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  }
}
