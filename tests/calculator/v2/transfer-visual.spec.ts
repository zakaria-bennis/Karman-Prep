// TR-43 and TR-46 say "verified by visual test": pixel baselines of the revealed Transfer control
// at fine reveal (calculator-chrome, 1280×800) and coarse reveal (calculator-ios), in ivory and
// observatory (14 decision "TR-43 and TR-46"). The geometry tests in transfer.spec.ts stay as the
// browser layer beside them.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { SKIN_COLORS } from "../../../src/lib/calculator-v2/theme/skin-colors.generated";
import { BLOCK_SYSTEM } from "../fixture/v2/transfer-questions";
import {
  DESKTOP,
  anchor,
  box,
  choiceAnchor,
  choiceContainer,
  choiceControl,
  control,
  hoverAt,
  item,
  must,
  opacity,
  open,
  settled,
  tapItem,
} from "./transfer-helpers";

const SKINS = ["ivory", "observatory"] as const;
const PAD = 8; // CSS px of page kept around the item and control in each clip

// As applyTheme does (data-theme and the dark class); task 14's applySkin does not exist yet.
const setSkin = async (page: Page, skin: (typeof SKINS)[number]) => {
  await page.evaluate(
    ([s, dark]) => {
      const r = document.documentElement;
      r.classList.toggle("dark", dark);
      r.dataset.theme = s;
    },
    [skin, SKIN_COLORS[skin].normal.dark] as const
  );
};
const glyph = (page: Page, latex: string) => control(page, latex).locator("[data-transfer-glyph]");
// On the item's lower-left corner, clear of the control, so no tooltip shows.
async function hoverCorner(l: Locator) {
  const b = await box(l);
  await hoverAt(l, 2 / b.width, (b.height - 2) / b.height);
}
async function shoot(page: Page, name: string, parts: Locator[]) {
  await parts[0].scrollIntoViewIfNeeded();
  const bs = await Promise.all(parts.map(box));
  const vp = must(page.viewportSize(), "viewport");
  const x = Math.max(0, Math.min(...bs.map((b) => b.x)) - PAD);
  const y = Math.max(0, Math.min(...bs.map((b) => b.y)) - PAD);
  const right = Math.min(vp.width, Math.max(...bs.map((b) => b.x + b.width)) + PAD);
  const bottom = Math.min(vp.height, Math.max(...bs.map((b) => b.y + b.height)) + PAD);
  await expect(page).toHaveScreenshot(`tr-43-46-${name}`, {
    clip: { x, y, width: right - x, height: bottom - y },
  });
}

test("TR-43, TR-46 the revealed Transfer control matches its baselines at fine and coarse reveal", async ({
  page,
}, info) => {
  const touch = info.project.name === "calculator-ios";
  test.skip(
    !touch && info.project.name !== "calculator-chrome",
    "one fine (calculator-chrome, 1280×800) and one coarse (calculator-ios) baseline set"
  );
  for (const s of SKINS) {
    await open(page, touch ? must(page.viewportSize(), "viewport") : DESKTOP);
    await setSkin(page, s);
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await settled(page);
    if (!touch) {
      for (const [name, latex] of [
        ["inline", "y>2x+1"],
        ["block", BLOCK_SYSTEM],
      ] as const) {
        await page.mouse.move(5, 790);
        await hoverCorner(item(page, latex));
        await expect(anchor(page, latex)).toHaveAttribute("data-visible", "true");
        await expect(anchor(page, latex)).toHaveAttribute("data-reveal", "fine");
        expect((await box(glyph(page, latex))).width).toBe(16);
        await shoot(page, `${name}-fine-${s}.png`, [item(page, latex), control(page, latex)]);
      }
    } else {
      await tapItem(page, "y>2x+1");
      await expect(item(page, "y>2x+1")).toHaveAttribute("data-transfer-selected", "true");
      await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-reveal", "coarse");
      expect((await box(glyph(page, "y>2x+1"))).width).toBe(20);
      await shoot(page, `inline-coarse-${s}.png`, [item(page, "y>2x+1"), control(page, "y>2x+1")]);
      // Note 2's fourth state: the choice A cluster at coarse reveal (task 9's coarse rule).
      await expect.poll(() => opacity(choiceAnchor(page, "A"))).toBe("1");
      expect((await box(choiceControl(page, "A").locator("[data-transfer-glyph]"))).width).toBe(20);
      await shoot(page, `choice-a-coarse-${s}.png`, [choiceContainer(page, "A")]);
    }
  }
});
