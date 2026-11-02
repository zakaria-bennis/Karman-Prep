// The table button on every Math table (c-transfer TR-91 to TR-97, founder 2026-11-01): a daily
// question whose figure is two tables, plus two table answer choices. Each table's button is
// always visible, covers no data, transfers that table in one click or tap, morphs its glyph into
// an arrow for about 2 s, and follows the theme; on touch screens its target is 44 px.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { TWO_TABLE_ROWS } from "./fixture/harness/transfer-questions";
import { applySkin, box, frame, hex, settled, statusRegion } from "./transfer-helpers";

const URL = "/?flow=daily&questions=transfer-two-tables";
const NAMES = [
  "Copy table to calculator: Function f",
  "Copy table to calculator: Function g",
  "Copy table to calculator: choice C",
  "Copy table to calculator: choice D",
];
const tableButton = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const anchorOf = (button: Locator) => button.locator("xpath=..");

async function openTwoTables(page: Page) {
  await page.goto(URL);
  await expect(page.getByText("The tables show", { exact: false })).toBeVisible();
  for (const name of NAMES) await expect(tableButton(page, name)).toBeVisible();
  await settled(page);
}
/** The calculator's tables as their columns' "name v1 v2 …" strings. */
const calculatorTables = (page: Page) =>
  page.evaluate(() =>
    (globalThis.__calculatorHarness?.engine.getExpressions() ?? [])
      .filter((r) => r.type === "table")
      .map((r) => (r.columns ?? []).map((c) => [c.latex, ...c.values].join(" ")))
  );
const columns = (rows: string[][], n: number) => [
  `x_{${n}} ${rows.map((r) => r[0]).join(" ")}`,
  `y_{${n}} ${rows.map((r) => r[1]).join(" ")}`,
];

/** TR-93: the button's box meets no text of its table (every cell's text, title included). */
async function coversNoText(button: Locator) {
  const hits = await button.evaluate((el: HTMLElement) => {
    const b = el.getBoundingClientRect();
    const figure = el.closest("figure");
    if (!figure) return ["no figure"];
    const out: string[] = [];
    const walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (el.parentElement?.contains(n) || !n.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects())
        if (r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top)
          out.push(n.textContent);
    }
    return out;
  });
  expect(hits).toEqual([]);
}

test("TR-91 to TR-93 every Math table has its own visible table button in its top-right corner, covering no data", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "fixed desktop viewport");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openTwoTables(page);
  await expect(page.locator('[data-transfer-control][data-kind="table"]')).toHaveCount(4);
  for (const name of NAMES.slice(0, 2)) {
    const button = tableButton(page, name);
    const b = await box(button);
    const f = await box(button.locator("xpath=ancestor::figure[1]"));
    expect(b.width).toBe(26);
    expect(Math.round(f.x + f.width - (b.x + b.width))).toBe(7); // 6 px in, plus the 1 px border
    expect(Math.round(b.y - f.y)).toBe(7);
    await coversNoText(button);
    await expect(button).toHaveText("");
  }
});

test("TR-94 one click transfers that table; the glyph morphs into the arrow and back; the status says it in words", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "fixed desktop viewport");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openTwoTables(page);
  const second = tableButton(page, NAMES[1]);
  await second.click();
  await expect.poll(() => calculatorTables(page)).toEqual([columns(TWO_TABLE_ROWS.second, 1)]);
  await expect(frame(page)).toHaveAttribute("data-mode", "docked"); // TR-64 at 1280×800
  await expect(anchorOf(second)).toHaveAttribute("data-sent", "true");
  await expect(statusRegion(page)).toHaveText(/^Added table to calculator: x₁ is x, y₁ is y/);
  const arrow = second.locator('[data-transfer-morph="arrow"]');
  await expect.poll(() => arrow.evaluate((g) => getComputedStyle(g).opacity)).toBe("1");
  await expect(anchorOf(second)).toHaveAttribute("data-sent", "false", { timeout: 3000 });
  await expect.poll(() => arrow.evaluate((g) => getComputedStyle(g).opacity)).toBe("0");
  // The other table is its own item: x₂, y₂ beside the first.
  await tableButton(page, NAMES[0]).click();
  await expect
    .poll(() => calculatorTables(page))
    .toEqual([columns(TWO_TABLE_ROWS.second, 1), columns(TWO_TABLE_ROWS.first, 2)]);
});

test("TR-92, TR-48 keyboard: Tab reaches each table button with a visible ring and its tooltip, and Enter transfers", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "fixed desktop viewport");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openTwoTables(page);
  const first = tableButton(page, NAMES[0]);
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab"); // a keyboard focus, so :focus-visible
  await expect(first).toBeFocused();
  const ring = await first.evaluate((el) => {
    const s = getComputedStyle(el);
    return [s.outlineStyle, s.outlineWidth];
  });
  expect(ring).toEqual(["solid", "2px"]);
  const tip = anchorOf(first).locator("[data-transfer-tooltip]");
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText("Copy table to calculator");
  // The tooltip sits to the button's left, inside the viewport.
  const t = await box(tip);
  expect(t.x + t.width).toBeLessThanOrEqual((await box(first)).x + 1);
  await page.keyboard.press("Escape");
  await expect(tip).toBeHidden();
  await page.keyboard.press("Enter");
  await expect.poll(() => calculatorTables(page)).toEqual([columns(TWO_TABLE_ROWS.first, 1)]);
});

test("TR-95 on a phone the buttons show with no hover, a tap transfers at once and opens the calculator full screen, and the target is 44 px", async ({
  page,
}, info) => {
  test.skip(!/ios|android/.test(info.project.name), "touch projects only");
  await openTwoTables(page);
  const first = tableButton(page, NAMES[0]);
  await first.scrollIntoViewIfNeeded();
  const b = await box(first);
  expect(b.width).toBe(26);
  // The 44 px hit area, anchored at the frame's corner: points 44 px down-left of it hit the button.
  const hit = await first.evaluate((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const right = r.right + 7;
    const top = r.top - 7;
    return [
      [right - 2, top + 2],
      [right - 42, top + 42],
      [right - 42, top + 2],
      [right - 2, top + 42],
    ].map(([x, y]) => el.contains(document.elementFromPoint(x, y)));
  });
  expect(hit).toEqual([true, true, true, true]);
  await coversNoText(first);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await expect.poll(() => calculatorTables(page)).toEqual([columns(TWO_TABLE_ROWS.first, 1)]);
  await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen");
});

test("TR-97, TR-53 the button takes the calculator tokens in light and dark themes, with a 4.5:1 glyph", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "fixed desktop viewport");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openTwoTables(page);
  const button = tableButton(page, NAMES[0]);
  const lum = (h: string) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  for (const theme of ["ivory", "observatory"]) {
    await applySkin(page, theme);
    const c = await button.evaluate((el) => {
      const s = getComputedStyle(el);
      const root = getComputedStyle(document.documentElement);
      return {
        color: s.color,
        background: s.backgroundColor,
        chrome: root.getPropertyValue("--kcc-chrome").trim(),
        secondary: root.getPropertyValue("--kcc-text-secondary").trim(),
      };
    });
    expect(hex(c.background), theme).toBe(c.chrome);
    expect(hex(c.color), theme).toBe(c.secondary);
    expect(ratio(hex(c.color), hex(c.background)), theme).toBeGreaterThanOrEqual(4.5);
  }
});

test("TR-96 with reduced motion the glyph switches with no transition", async ({ page }, info) => {
  test.skip(info.project.name !== "calculator-chrome", "fixed desktop viewport");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await openTwoTables(page);
  const button = tableButton(page, NAMES[0]);
  const durations = await button
    .locator("[data-transfer-morph]")
    .evaluateAll((gs) => gs.map((g) => getComputedStyle(g).transitionDuration));
  // Our sheet sets none; the site's own reduced-motion rule leaves a 0.001 ms duration.
  for (const d of durations.flatMap((v) => v.split(","))) expect(parseFloat(d)).toBeLessThan(0.001);
  await button.click();
  await expect(anchorOf(button)).toHaveAttribute("data-sent", "true");
  const arrow = button.locator('[data-transfer-morph="arrow"]');
  expect(await arrow.evaluate((g) => getComputedStyle(g).opacity)).toBe("1");
});

test("TR-93 a narrow two-column table titled Function f keeps its title on one line with the button beside it; a title wraps only at the container's full width", async ({
  page,
}, info) => {
  test.skip(!/chrome|ios/.test(info.project.name), "one desktop and one phone engine");
  if (info.project.name === "calculator-chrome")
    await page.setViewportSize({ width: 1280, height: 800 });
  await openTwoTables(page);
  const button = tableButton(page, NAMES[0]);
  const figure = button.locator("xpath=ancestor::figure[1]");
  const title = figure.locator("[data-table-title]");
  await expect(title).toHaveText("Function f");
  const lines = () =>
    title.evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return new Set([...r.getClientRects()].map((rect) => Math.round(rect.top))).size;
    });
  expect(await lines()).toBe(1);
  const t = await box(title);
  const b = await box(button);
  expect(t.x + t.width).toBeLessThanOrEqual(b.x); // beside, not under
  expect(b.y).toBeLessThan(t.y + t.height); // on the title's row
  expect(b.y + b.height).toBeGreaterThan(t.y);
  // Squeeze the figure's container just below title + button (frame border 2 px, title padding
  // 16 + 40 px): the table fills the container and only then does the title wrap, still clear of
  // the button and never wider than the container.
  const squeezed = Math.floor(t.width) + 2 + 56 - 4;
  const container = figure.locator("xpath=..");
  await container.evaluate((el: HTMLElement, w) => (el.style.width = `${w}px`), squeezed);
  await expect.poll(lines).toBe(2);
  expect((await box(figure)).width).toBeLessThanOrEqual(squeezed + 0.5);
  await coversNoText(button);
});
