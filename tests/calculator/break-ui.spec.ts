// Break-the-interface regressions (break-ui, 2026-10-20): input spam, junk pastes, clipboard,
// table and list keys, popovers and window abuse, and the phone keypad, each compared with the
// reference live while it was fixed. Every test fails on a page error or a stuck fallback panel.

import { expect, test, type Page } from "@playwright/test";
import { enc, openShell, rowField, rows } from "./shell-helpers";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on("pageerror", (error) => list.push(`pageerror: ${error.message}`));
  page.on("console", (m) => {
    // A full Chrome asks for /favicon.ico, which the harness does not serve.
    if (m.type() !== "error" || m.location().url.endsWith("/favicon.ico")) return;
    list.push(`console: ${m.text()}`);
  });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page) ?? []).toEqual([]);
  await expect(page.locator("#calc .kc-error")).toHaveCount(0); // "The calculator hit a problem."
});

const latexes = async (page: Page) => (await rows(page)).map((r) => r.latex);
const focusedRow = (page: Page) =>
  page.evaluate(() => {
    const active = document.querySelector("#calc")?.shadowRoot?.activeElement ?? null;
    return active?.closest("[data-row-id]")?.getAttribute("data-row-id") ?? null;
  });
const api = <T>(page: Page, fn: string) =>
  page.evaluate(
    (source) => new Function("c", source)(globalThis.__shell!.handle.calculator),
    fn
  ) as Promise<T>;

/** Dispatches a clipboard event on the focused element inside the calculator. */
function clipboard(page: Page, type: "paste" | "copy" | "cut", text = "") {
  return page.evaluate(
    ([kind, value]) => {
      const active = document.querySelector("#calc")!.shadowRoot!.activeElement!;
      const data = new DataTransfer();
      if (value !== "") data.setData("text/plain", value);
      const event = new ClipboardEvent(kind, {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      active.dispatchEvent(event);
      return data.getData("text/plain");
    },
    [type, text] as const
  );
}

test.describe("keyboard spam", () => {
  test.skip(({ isMobile }) => isMobile, "hardware keyboard");

  test("Enter x120 stops at the 100-row limit with focus kept, and Backspace x150 empties it back to one row", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc([""])}`);
    await rowField(page, "1").click();
    for (let i = 0; i < 120; i++) await page.keyboard.press("Enter");
    await expect.poll(async () => (await rows(page)).length).toBe(100);
    await expect.poll(() => focusedRow(page)).not.toBeNull();
    for (let i = 0; i < 150; i++) await page.keyboard.press("Backspace");
    await expect.poll(() => latexes(page)).toEqual([""]);
    await expect.poll(() => focusedRow(page)).not.toBeNull();
  });

  test("Enter x30 then Undo x40 from the keyboard undoes every row, keeping focus in the list", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc(["1"])}`);
    await api(page, "c.clearHistory();");
    await rowField(page, "1").click();
    for (let i = 0; i < 30; i++) await page.keyboard.press("Enter");
    await expect.poll(async () => (await rows(page)).length).toBe(31);
    for (let i = 0; i < 40; i++) await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(() => latexes(page)).toEqual(["1"]);
    await expect.poll(() => focusedRow(page)).toBe("1");
  });

  test("Undo and Redo alternated 150 times and Cmd or Ctrl+Y keep the rows intact", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc(["1"])}`);
    await rowField(page, "1").click();
    await page.keyboard.press("End");
    await page.keyboard.type("23");
    await page.keyboard.press("Enter");
    await page.keyboard.type("45");
    for (let i = 0; i < 150; i++) {
      await page.keyboard.press("ControlOrMeta+z");
      await page.keyboard.press("ControlOrMeta+Shift+z");
    }
    await expect.poll(() => latexes(page)).toEqual(["123", "45"]);
    await page.keyboard.press("ControlOrMeta+z");
    await page.keyboard.press("Meta+y");
    await expect.poll(() => latexes(page)).toEqual(["123", "45"]);
  });

  test("ArrowDown on the last row adds a row, Delete in an empty row does nothing, and arrows enter a table", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc(["y=x"])}`);
    await rowField(page, "1").click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => latexes(page)).toEqual(["y=x", "", ""]);
    await page.keyboard.press("Delete");
    await expect.poll(() => latexes(page)).toEqual(["y=x", "", ""]);
    await api(
      page,
      `c.removeExpressions([{ id: "2" }, { id: "3" }]); c.setExpression({ id: "t", type: "table", columns: [{ latex: "x_1", values: ["1", "2"] }, { latex: "y_1", values: ["3", "4"] }] }); c.setExpression({ id: "z", latex: "z" });`
    );
    await rowField(page, "1").click();
    await page.keyboard.press("ArrowDown");
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.querySelector("#calc")!.shadowRoot!.activeElement?.getAttribute("aria-label")
        )
      )
      .toBe("Column 1 header");
    await rowField(page, "z").click();
    await page.keyboard.press("ArrowUp");
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.querySelector("#calc")!.shadowRoot!.activeElement?.getAttribute("aria-label")
        )
      )
      .toMatch(/^x₁, row 2/);
  });

  test("Backspace in empty headers deletes the columns and then the table; Undo restores it", async ({
    page,
  }) => {
    await openShell(page);
    await api(
      page,
      `c.setExpressions([{ id: "1", type: "table", columns: [{ latex: "x_1", values: ["1", "2"] }, { latex: "y_1", values: ["3", "4"] }, { latex: "z_1", values: ["5", "6"] }] }]);`
    );
    await page.getByRole("textbox", { name: "Column 3 header" }).focus();
    await page.keyboard.press("End");
    for (let i = 0; i < 30; i++) await page.keyboard.press("Backspace");
    await expect.poll(async () => (await rows(page)).length).toBe(1);
    const kinds = () =>
      page.evaluate(() =>
        globalThis.__calculatorHarness!.engine.getSnapshot().rows.map((r) => r.type)
      );
    await expect.poll(kinds).toEqual(["expression"]);
    for (let i = 0; i < 6; i++) await page.keyboard.press("ControlOrMeta+z");
    await expect.poll(kinds).toEqual(["table"]);
  });
});

test.describe("clipboard", () => {
  test("pasted lines become rows, junk is cleaned, and 100,000 characters are refused without freezing", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc([""])}`);
    await rowField(page, "1").click();
    await clipboard(page, "paste", "y=x^2\r\ny=2x+1\n\n  a = 5 \n\\sin(x)");
    await expect.poll(() => latexes(page)).toEqual(["y=x^{2}", "y=2x+1", "a=5", "\\sin(x)"]);
    await rowField(page, "1").click();
    await page.keyboard.press("End");
    await clipboard(page, "paste", "\u0000+​3\u001b[31m");
    await expect.poll(async () => (await latexes(page))[0]).toBe("y=x^{2}+3");
    const t0 = Date.now();
    await clipboard(page, "paste", "x+".repeat(50000));
    expect(Date.now() - t0).toBeLessThan(3000);
    await expect.poll(async () => (await latexes(page))[0]).toBe("y=x^{2}+3");
  });

  test("copy takes the whole row with no selection, cut removes a selection, and a pasted value lands in a table cell", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc(["y=\\frac{1}{2}x^2"])}`);
    await rowField(page, "1").click();
    expect(await clipboard(page, "copy")).toBe("y=\\frac{1}{2}x^{2}");
    await page.keyboard.press("ControlOrMeta+a");
    expect(await clipboard(page, "cut")).toBe("y=\\frac{1}{2}x^{2}");
    await expect.poll(() => latexes(page)).toEqual([""]);
    await api(
      page,
      `c.setExpressions([{ id: "t", type: "table", columns: [{ latex: "x_1", values: ["1", "2"] }, { latex: "y_1", values: ["3", "4"] }] }]);`
    );
    await page.getByRole("textbox", { name: /^x₁, row 1/ }).focus();
    await page.keyboard.press("ControlOrMeta+a");
    await clipboard(page, "paste", "42");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            globalThis.__calculatorHarness!.engine.getSnapshot().rows.find((r) => r.id === "t")!
              .columns![0].values[0]
        )
      )
      .toBe("42");
  });
});

test.describe("list, popovers and window", () => {
  test("a row left with Escape stays selected, as on the reference", async ({ page, isMobile }) => {
    test.skip(isMobile, "hardware keyboard");
    await openShell(page, `?rows=${enc(["y=x", "y=2x"])}`);
    await rowField(page, "2").click();
    await page.keyboard.press("Escape");
    await expect(page.locator('#calc [data-row-id="2"]')).toHaveAttribute("data-selected", "true");
    await expect(page.locator('#calc [data-row-id="1"]')).not.toHaveAttribute("data-selected");
  });

  test("Add table on a lone blank row turns it into the table", async ({ page }) => {
    await openShell(page, `?rows=${enc([""])}`);
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByRole("menuitem", { name: "Add table" }).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          globalThis.__calculatorHarness!.engine.getSnapshot().rows.map((r) => r.type)
        )
      )
      .toEqual(["table"]);
  });

  test("Escape spam closes every open layer, and settings survive rapid window resizing", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "desktop window");
    await openShell(page, `?rows=${enc(["y=x"])}`);
    await page.getByRole("button", { name: "Add item" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Graph settings" }).click();
    for (const [w, h] of [
      [300, 400],
      [1500, 900],
      [375, 812],
      [120, 120],
      [1280, 800],
    ])
      await page.setViewportSize({ width: w, height: h });
    for (let i = 0; i < 10; i++) await page.keyboard.press("Escape");
    await expect(
      page.locator('#calc [role="menu"], #calc [aria-label="Graph Settings"]')
    ).toHaveCount(0);
    expect(await latexes(page)).toEqual(["y=x"]);
  });

  test("slider limits in the wrong order, step 0 and huge ranges never throw", async ({ page }) => {
    await openShell(page);
    await api(
      page,
      `c.setExpressions([{ id: "1", latex: "a=3", sliderBounds: { min: "10", max: "0", step: "0" } }, { id: "b", latex: "b=1", sliderBounds: { min: "-10^{300}", max: "10^{300}", step: "-2" } }, { id: "y", latex: "y=ax+b" }]);`
    );
    await expect.poll(async () => (await rows(page)).length).toBe(3);
  });
});

test.describe("phone keypad", () => {
  test.skip(({ isMobile }) => !isMobile, "touch projects");

  test("with the keypad up, a tap on the graph shrinks it to its bar (owner, 2026-10-21) and moves nothing; a tap on a focused row's cross moves to the next row", async ({
    page,
  }) => {
    await openShell(page, `?rows=${enc(["y=x", "y=2x", "y=3x"])}`);
    const keypad = () =>
      page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().settings.keypad);
    await rowField(page, "1").tap();
    await expect.poll(keypad).toBe(true);
    // Upright the graph grows into the bar's space at the same centre and scale (owner,
    // 2026-10-21), so "moves nothing" is the centre and the x bounds.
    const view = () =>
      api<string>(
        page,
        "const m = c.graphpaperBounds.mathCoordinates; return JSON.stringify([m.left, m.right, (m.top + m.bottom) / 2])"
      );
    const before = await view();
    const graph = (await page.locator("#calc .kc-graph-surface").boundingBox())!;
    await page.touchscreen.tap(graph.x + graph.width / 2, graph.y + graph.height / 3);
    await expect(page.locator("#calc .kc-keypad")).toHaveAttribute("data-minimized", "true");
    expect(await keypad()).toBe(true);
    await expect
      .poll(async () => (await page.locator("#calc .kc-keypad").boundingBox())!.height)
      .toBe(37);
    expect(await view()).toBe(before);
    await rowField(page, "1").tap();
    await expect(page.locator("#calc .kc-keypad")).not.toHaveAttribute("data-minimized", "true");
    await page.getByRole("button", { name: "Delete expression 1" }).tap();
    await expect.poll(() => latexes(page)).toEqual(["y=2x", "y=3x"]);
    await expect.poll(() => focusedRow(page)).toBe("2");
    await expect.poll(keypad).toBe(true);
  });
});
