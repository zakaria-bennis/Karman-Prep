import { expect, test, type Page } from "@playwright/test";

const open = (page: Page, rows: string[], query = "") =>
  page.goto(`/v2/editor.html?rows=${encodeURIComponent(JSON.stringify(rows))}${query}`);
const field = (page: Page, n: number) =>
  page.getByRole("textbox", { name: `Expression ${n}`, exact: true });
const latexes = (page: Page) =>
  page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.getSnapshot().rows.map((r) => r.latex)
  );
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
};

test("R-3 each row has Delete; Enter inserts a row below and focuses it; Up and Down leave a row only at its edge", async ({
  page,
}) => {
  await open(page, ["a", "\\frac{1}{2}", "b"]);
  await expect(
    page.getByRole("button", { name: "Delete expression 3", exact: true })
  ).toBeVisible();
  await field(page, 1).focus();
  await page.keyboard.press("Enter");
  await expect(field(page, 2)).toBeFocused();
  await expect.poll(() => latexes(page)).toEqual(["a", "", "\\frac{1}{2}", "b"]);
  await page.keyboard.press("ArrowDown");
  await expect(field(page, 3)).toBeFocused();
  await page.keyboard.press("ArrowRight"); // into the numerator
  await page.keyboard.press("ArrowDown"); // numerator to denominator: same row
  await expect(field(page, 3)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(field(page, 4)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(field(page, 3)).toBeFocused();
});

test("R-9 Backspace and Delete in an empty row delete it and move to the neighbour's edge; the last row only empties", async ({
  page,
}) => {
  await open(page, ["y=x", "", "y=2"]);
  await field(page, 2).focus();
  await page.keyboard.press("Backspace");
  await expect.poll(() => latexes(page)).toEqual(["y=x", "y=2"]);
  await expect(field(page, 1)).toBeFocused();
  await page.keyboard.type("+1");
  await expect.poll(() => latexes(page)).toEqual(["y=x+1", "y=2"]);
  await open(page, ["a", "", "b"]);
  await field(page, 2).focus();
  await page.keyboard.press("Delete");
  await expect.poll(() => latexes(page)).toEqual(["a", "b"]);
  await page.keyboard.type("c");
  await expect.poll(() => latexes(page)).toEqual(["a", "cb"]);
  await open(page, ["y"]);
  await field(page, 1).focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await expect.poll(() => latexes(page)).toEqual([""]);
  await expect(field(page, 1)).toBeFocused();
});

test("KB-2 MathQuill's own undo never runs, and the toolbar Undo removes a burst of typing in one step", async ({
  page,
}) => {
  await open(page, [""]);
  await field(page, 1).focus();
  await page.keyboard.type("abc");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => latexes(page)).toEqual(["abc"]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => latexes(page)).toEqual([""]);
});

test("KB-5 Clear all removes every row in one undo step, keeps settings and viewport, focuses the empty row and announces", async ({
  page,
}) => {
  await open(page, ["y=x", "a=2", "y=ax"]);
  await page.evaluate(() => {
    const engine = globalThis.__calculatorHarness!.engine;
    engine.updateSettings({ angleMode: "degrees" });
    engine.setMathBounds({ left: -5, right: 5, bottom: -3, top: 3 });
  });
  await page.getByRole("button", { name: "Edit list", exact: true }).click();
  await page.getByRole("button", { name: "Clear all expressions", exact: true }).click();
  await expect(page.getByRole("list", { name: "Expressions" }).getByRole("listitem")).toHaveCount(
    1
  );
  await expect(field(page, 1)).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("All expressions cleared. Undo is available.");
  const after = await page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot());
  expect(after).toMatchObject({
    rows: [{ latex: "" }],
    settings: { angleMode: "degrees" },
    viewport: { left: -5, right: 5, bottom: -3, top: 3 },
  });
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => latexes(page)).toEqual(["y=x", "a=2", "y=ax"]);
});

test("L-3 the focused row draws the focus-bar number and a 2 px focus-ring outline", async ({
  page,
}) => {
  await open(page, ["y=x", "2+3"]);
  await field(page, 2).focus();
  const row = page.locator('li[data-row-id="2"]');
  const role = (name: string) =>
    row.evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
  await expect(row).toHaveCSS("outline-style", "solid");
  await expect(row).toHaveCSS("outline-width", "2px");
  await expect(row).toHaveCSS("outline-color", rgb(await role("--kc-focus-ring")));
  await expect(row.locator(".kc-row-number")).toHaveCSS(
    "background-color",
    rgb(await role("--kc-focus-bar"))
  );
  await expect(page.locator('li[data-row-id="1"]')).toHaveCSS("outline-style", "none");
});

test("R-5 the value sits below the math, right-aligned", async ({ page }) => {
  await open(page, ["2+3"]);
  const value = page.locator('li[data-row-id="1"] .kc-row-value');
  await expect(value).toContainText("= 5");
  await expect(value).toHaveCSS("text-align", /^(end|right)$/);
  const math = (await page.locator('li[data-row-id="1"] .kc-row-field').boundingBox())!;
  expect((await value.boundingBox())!.y).toBeGreaterThanOrEqual(math.y + math.height - 1);
});

test("K-5 Functions templates land in the row with the caret inside", async ({ page }) => {
  await open(page, [""], "&keypad=open");
  await field(page, 1).focus();
  const keypad = page.getByRole("region", { name: "Keypad" });
  await keypad.getByRole("button", { name: "Functions", exact: true }).click();
  await keypad.getByRole("group", { name: "Trig" }).getByRole("button").first().click();
  await expect(field(page, 1)).toBeFocused();
  await page.keyboard.type("x");
  await expect.poll(() => latexes(page)).toEqual(["\\sin\\left(x\\right)"]);
  await keypad.getByRole("button", { name: "Functions", exact: true }).click();
  await keypad.getByRole("group", { name: "Calculus" }).getByRole("button").nth(3).click();
  await page.keyboard.type("2");
  await expect.poll(async () => (await latexes(page))[0]).toContain("\\log_{2}");
});
