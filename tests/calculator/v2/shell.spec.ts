// Calculator v2 shell browser tests (10 R5): layouts L-1, L-2, L-8 and L-14 and the AR-60 worker
// gate on the harness page /v2/calculator.html; later shell tasks add AR-40, TH-17, KB-4 and the
// contributions here.

import { expect, test } from "@playwright/test";
import { EDITOR_MESSAGES } from "@/components/calculator-v2/ui/list/messages";
import { contrastRatio } from "@/lib/calculator-v2/theme/contrast";
import { SKIN_IDS } from "@/lib/calculator-v2/theme/skins";
import {
  announced,
  api,
  box,
  cs,
  enc,
  tap,
  expectOrder,
  focusedRow,
  frames,
  keypadOpen,
  names,
  onBackground,
  openShell,
  platformFonts,
  PROJECTS,
  rowField,
  rows,
  textPairs,
  toHex,
  useConsoleGuard,
} from "./shell-helpers";
import {
  katexMathLoaded,
  measureL14,
  popoverCoversRow1,
  recordCanvasFonts,
  shadowHasFontFace,
} from "./shell-probes";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const TOOLBAR = [/^add item/i, /^undo/i, /^redo/i, /^edit list/i, /^collapse list/i],
  GRAPH = [/^graph settings$/i, /^zoom in$/i, /^zoom out$/i];
test("L-1 desktop: list on the left at max(260px, 40%); toolbar and graph controls in order; Home only off the default view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openShell(page, "?w=800&h=600");
  const [list, graph] = [await box(page, "kc-list-region"), await box(page, "kc-graph-region")];
  expect(Math.abs(list.width - 320)).toBeLessThanOrEqual(1);
  expect(list.x + list.width).toBeLessThanOrEqual(graph.x + 1);
  expectOrder(await names(page, "kc-list-region"), TOOLBAR);
  expectOrder(await names(page, "kc-graph-region"), GRAPH);
  for (const p of GRAPH) {
    const b = (await page
      .locator("#calc .kc-graph-region")
      .getByRole("button", { name: p })
      .boundingBox())!;
    expect([b.x >= graph.x + graph.width / 2, b.y <= graph.y + graph.height / 2]).toEqual([
      true,
      true,
    ]);
  }
  expect((await names(page, "kc-graph-region")).some((n) => /^home$/i.test(n))).toBe(false); // 08's Home control
  await page.getByRole("img", { name: /^Graph from/ }).press("ArrowRight");
  await expect(page.getByRole("button", { name: /^home$/i })).toBeVisible();
  await page.evaluate(() => globalThis.__shell!.resizeFrame(600, 600));
  await expect.poll(async () => Math.round((await box(page, "kc-list-region")).width)).toBe(260);
});
test("L-2 stacked: graph, toolbar, list, then keypad; the graph keeps 40% of the height with the keypad closed", async ({
  page,
}) => {
  await openShell(page, "?w=400&h=700");
  const host = (await page.locator("#calc").boundingBox())!; // clamped on phones (R5)
  const [graph, list] = [await box(page, "kc-graph-region"), await box(page, "kc-list-region")];
  expect(graph.y + graph.height).toBeLessThanOrEqual(list.y + 1);
  expect(graph.height).toBeGreaterThanOrEqual(0.4 * host.height - 1);
  expectOrder(await names(page, "kc-list-region"), [TOOLBAR[0], /keypad/i, ...TOOLBAR.slice(1)]);
  expectOrder(await names(page, "kc-graph-region"), GRAPH);
  await api(page, "c.updateSettings({ keypad: true })");
  const keypad = (await page.getByRole("region", { name: "Keypad" }).boundingBox())!;
  const listNow = await box(page, "kc-list-region");
  expect(keypad.y).toBeGreaterThanOrEqual(listNow.y + listNow.height - 1);
});
test("L-8 the layout follows the container width, not the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openShell(page, `?w=800&h=600&rows=${enc(["y=x", "1+1"])}`);
  const layout = page.locator("#calc [data-kc-layout]");
  for (const [w, l] of [
    [461, "stacked"],
    [560, "desktop"],
  ] as const) {
    await page.evaluate((x) => globalThis.__shell!.resizeFrame(x, 600), w);
    await expect(layout).toHaveAttribute("data-kc-layout", l);
    const [list, graph] = [await box(page, "kc-list-region"), await box(page, "kc-graph-region")];
    expect(
      l === "stacked" ? graph.y + graph.height <= list.y + 1 : list.x + list.width <= graph.x + 1,
      `${w}`
    ).toBe(true);
  } // stacked: graph above the list; desktop: list left of it
  expect((await rows(page)).map((r) => r.latex)).toEqual(["y=x", "1+1"]);
});
test("AR-60 destroying the quiz handle terminates the calculator's worker", async ({ page }) => {
  await openShell(page);
  const workers = () => page.evaluate(() => globalThis.__karmanCalculatorCounters?.workers ?? 0);
  await expect.poll(workers).toBeGreaterThan(0);
  const before = await workers();
  await api(page, "globalThis.__shell.handle.destroy()");
  await expect.poll(workers).toBe(before - 1);
}); // 07 bumps "workers" down on terminate
test("L-14 no horizontal scroll from 320×568 to 1920×1080; keypad and toolbar never cover the focused row in either order; a popover never does", async ({
  page,
}) => {
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [390, 844],
    [844, 390],
    [768, 1024],
    [1024, 768],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    for (const steps of [
      ['c.updateSettings({ keypad: true }); c.focusExpression("15")'],
      ['c.focusExpression("15")', "c.updateSettings({ keypad: true })"],
    ]) {
      await openShell(page, `?rows=${enc(Array.from({ length: 15 }, (_, i) => `y=${i + 1}x`))}`); // keypad then focus in one tick; focus, then keypad
      for (const script of steps) {
        await api(page, script);
        await frames(page, 3);
      }
      const m = await page.evaluate(measureL14),
        at = `${width}x${height} ${steps.length}`;
      // measureL14 → { pageOverflow: scrollWidth − innerWidth (min 0); wide: shadow elements that scroll sideways or pass the host's right edge;
      //               row: rect of row 15; toolbarBottom: Add item button bottom; keypadTop: Keypad region top }
      expect([m.pageOverflow, m.wide], at).toEqual([0, []]);
      expect([m.row.top >= m.toolbarBottom - 0.5, m.row.bottom <= m.keypadTop + 0.5], at).toEqual([
        true,
        true,
      ]);
    }
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await openShell(page, `?rows=${enc(["y=x", "1"])}`); // stacked: the popover can reach the list
  await page.getByRole("button", { name: "Graph settings" }).click();
  await expect(page.locator(".kc-settings[role=dialog]")).toBeVisible();
  await api(page, 'c.focusExpression("1")');
  await expect.poll(() => page.evaluate(popoverCoversRow1)).toBe(false);
}); // .kc-settings[role=dialog] rect vs row 1
test("AR-40 KaTeX fonts reach the shadow root: KaTeX_Math loads, check() is true, no font request fails, no @font-face inside", async ({
  page,
}) => {
  const failed: string[] = [];
  page.on("requestfailed", (r) => {
    if (/\.(woff2?|ttf)\b/.test(r.url())) failed.push(r.url());
  });
  await openShell(page);
  await rowField(page, "1").click();
  await page.keyboard.type("y=x");
  await page.waitForFunction(katexMathLoaded, undefined, { timeout: 5000 });
  expect(await page.evaluate(() => document.fonts.check("16px KaTeX_Math"))).toBe(true);
  expect(await page.evaluate(shadowHasFontFace)).toBe(false);
  expect(failed).toEqual([]);
});
test("AR-40 CDP reports KaTeX_Math as the platform font of a MathQuill variable", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "CDP is Chromium-only");
  await openShell(page);
  await rowField(page, "1").click();
  await page.keyboard.type("y=x");
  await expect.poll(() => platformFonts(page, ".mq-root-block var")).toContain("KaTeX_Math");
});
test("TH-17 UI text Arial 14px, math KaTeX 18px, keys in KaTeX, axis numbers 13px Arial", async ({
  page,
}) => {
  await page.addInitScript(recordCanvasFonts);
  await openShell(page, `?w=800&h=600&rows=${enc(["y=x"])}`);
  await api(page, "c.updateSettings({ keypad: true })");
  expect(await cs(page, ".kc-list-region button")).toEqual([
    expect.stringMatching(/^Arial\b/),
    "14px",
  ]);
  expect(await cs(page, ".mq-root-block")).toEqual([
    expect.stringMatching(/^"?KaTeX_Main/),
    "18px",
  ]);
  expect((await cs(page, ".mq-root-block var"))[0]).toMatch(/^"?KaTeX_Math/);
  expect((await cs(page, '[aria-label="Keypad"] button', "7"))[0]).toMatch(/^"?KaTeX_Main/);
  const fonts = () => page.evaluate(() => (globalThis as unknown as { __fonts: string[] }).__fonts);
  await expect.poll(fonts).toContainEqual(expect.stringMatching(/^13px Arial/));
  expect((await fonts()).filter((f) => !f.startsWith("13px"))).toEqual([]);
});
test("KB-4 opens by mouse, keyboard and touch (OI-7) and reopen restores the last row", async ({
  page,
}) => {
  await openShell(page, `?rows=${enc(["1", "2"])}`);
  const open = (t: string) => api(page, `globalThis.__shell.handle.focusOnOpen("${t}")`);
  await open("mouse");
  await expect.poll(() => focusedRow(page)).toBe("1");
  await api(page, 'c.focusExpression("2")');
  await page.locator("#outside").focus();
  await open("keyboard");
  await expect.poll(() => focusedRow(page)).toBe("2");
  await page.locator("#outside").focus();
  await open("touch");
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("frame");
  await expect(page.locator('#calc [data-row-id="2"]')).toHaveAttribute("data-active", "true");
  expect([await keypadOpen(page), await focusedRow(page)]).toEqual([false, null]);
});
test("R-10 after setBlank() a keyboard reopen focuses Expression 1", async ({ page }) => {
  await openShell(page, `?rows=${enc(["1", "2"])}`);
  await api(page, 'c.focusExpression("2")');
  await api(page, "c.setBlank()");
  await page.locator("#outside").focus();
  await api(page, 'globalThis.__shell.handle.focusOnOpen("keyboard")');
  await expect.poll(() => focusedRow(page)).toBe("1");
});
test("A11Y-2 the reset announcement plays once, 500 ms after mount, only when the window stayed open (OI-3)", async ({
  page,
}) => {
  const log = () => page.evaluate(() => globalThis.__shell!.log);
  const count = async () => (await log()).announcements.length;
  await openShell(page, "?announceReset=1");
  await expect.poll(count, { timeout: 3000 }).toBe(1);
  const {
    announcements: [first],
    mountedAt,
  } = await log();
  expect(first.text).toBe("Calculator cleared for this question.");
  expect([first.t - mountedAt >= 450, first.t - mountedAt < 1500]).toEqual([true, true]);
  await page.evaluate(() => globalThis.__shell!.remount({ announceReset: false }));
  await page.waitForTimeout(1500);
  expect(await count()).toBe(1);
  await page.evaluate(() => globalThis.__shell!.remount({ announceReset: true }));
  await expect.poll(count, { timeout: 3000 }).toBe(2);
});
test("A11Y-2 Ctrl or Cmd+Z and the redo shortcut announce Undone. and Redone. like the toolbar", async ({
  page,
}) => {
  await openShell(page);
  await rowField(page, "1").click();
  await page.keyboard.type("1");
  await page.keyboard.press("ControlOrMeta+KeyZ");
  await expect.poll(() => announced(page)).toContain(EDITOR_MESSAGES.undone);
  await page.keyboard.press("ControlOrMeta+Shift+KeyZ");
  await expect.poll(() => announced(page)).toContain(EDITOR_MESSAGES.redone);
});
test("NM-42 an Alt+Enter row-limit refusal announces the row-limit message and adds no row", async ({
  page,
}) => {
  await openShell(page, `?rows=${enc(Array.from({ length: 100 }, (_, i) => String(i)))}`);
  await rowField(page, "1").click();
  await page.keyboard.press("Alt+Enter");
  await expect.poll(() => announced(page)).toContain(EDITOR_MESSAGES.rowLimit);
  expect(await rows(page)).toHaveLength(100);
});

for (const skin of SKIN_IDS)
  test(`TH-1 rendered shadow text meets 7:1 and field boundaries 3:1 on their backgrounds in ${skin}`, async ({
    page,
  }, info) => {
    test.skip(!PROJECTS.includes(info.project.name), "computed colours are engine-independent");
    await openShell(page, `?skin=${skin}&w=800&h=600&rows=${enc(["y=x", "\\frac{", "2+3"])}`);
    await rowField(page, "3").click();
    await api(page, "c.updateSettings({ keypad: true })");
    await page.getByRole("button", { name: "Graph settings" }).click();
    // Rows draw no field box (L-3), so the boundaries measured are the settings fields: wait for
    // the popover to be up and its AN-4 fade to end before reading colours.
    const settings = page.locator("#calc .kc-settings");
    await expect(settings).toBeVisible();
    await expect
      .poll(() => settings.evaluate((el) => el.getAnimations({ subtree: true }).length))
      .toBe(0);
    const pairs = await textPairs(page);
    expect([
      pairs.some((p) => p.kind === "text"),
      pairs.some((p) => p.kind === "boundary"),
    ]).toEqual([true, true]);
    for (const p of pairs)
      expect(
        contrastRatio(onBackground(p.fg, p.alpha, p.bg), toHex(p.bg).hex),
        `${p.kind} ${p.name}`
      ).toBeGreaterThanOrEqual(p.kind === "text" ? 7 : 3);
  });
test("R-1 clicking a row body focuses its field", async ({ page, isMobile }) => {
  test.skip(isMobile, "fine-pointer click; touch focus is K-2");
  await page.setViewportSize({ width: 1280, height: 760 });
  await openShell(page, `?rows=${enc(["y=x", "y=2x", ""])}`);
  const rowBody = (id: string) => page.locator(`#calc [data-row-id="${id}"] .kc-row-inner`);
  for (const [id, at] of [
    ["2", "number"],
    ["3", "right"],
  ] as const) {
    const b = (await rowBody(id).boundingBox())!;
    // the gutter number, or the row's own space between the (empty) field and Delete
    const point =
      at === "number"
        ? { x: b.x + 12, y: b.y + b.height / 2 }
        : { x: b.x + b.width - 48, y: b.y + b.height - 3 };
    await page.mouse.click(point.x, point.y);
    await expect.poll(() => focusedRow(page)).toBe(id);
  }
  await page.mouse.click(
    (await rowBody("2").boundingBox())!.x + 12,
    (await rowBody("2").boundingBox())!.y + 12
  );
  await expect.poll(() => focusedRow(page)).toBe("2");
  await page.keyboard.type("+1"); // the caret is at the end
  await expect.poll(async () => (await rows(page))[1].latex).toBe("y=2x+1");
  await page.getByRole("button", { name: "Delete expression 3" }).click();
  await expect.poll(async () => (await rows(page)).length).toBe(2);
});
test("L-3 a row's math field draws no box, focused or not; the row's L-3 outline marks focus", async ({
  page,
  isMobile,
}) => {
  await openShell(page, `?rows=${enc(["y=x", "y=2x"])}`);
  await tap(isMobile, rowField(page, "2"));
  await expect.poll(() => focusedRow(page)).toBe("2");
  const look = (id: string) =>
    page.locator(`#calc [data-row-id="${id}"]`).evaluate((row) => {
      const field = getComputedStyle(row.querySelector(".mq-editable-field")!);
      const li = getComputedStyle(row);
      const visible = (style: string, width: string, color: string) =>
        style !== "none" &&
        style !== "hidden" &&
        parseFloat(width) > 0 &&
        !/rgba\(.*,\s*0\)$|transparent/.test(color);
      return {
        fieldBox: ["Top", "Right", "Bottom", "Left"].some((s) =>
          visible(
            field.getPropertyValue(`border-${s.toLowerCase()}-style`),
            field.getPropertyValue(`border-${s.toLowerCase()}-width`),
            field.getPropertyValue(`border-${s.toLowerCase()}-color`)
          )
        ),
        fieldOutline: visible(field.outlineStyle, field.outlineWidth, field.outlineColor),
        fieldShadow: field.boxShadow !== "none",
        rowOutline: li.outlineStyle === "none" ? "none" : `${li.outlineStyle} ${li.outlineWidth}`,
      };
    });
  expect(await look("1")).toEqual({
    fieldBox: false,
    fieldOutline: false,
    fieldShadow: false,
    rowOutline: "none",
  });
  expect(await look("2")).toEqual({
    fieldBox: false,
    fieldOutline: false,
    fieldShadow: false,
    rowOutline: "solid 2px",
  });
});
test("L-2 phone: after typing six rows the list shows them, scrolls, and keeps the active row in view", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "phone layout");
  await openShell(page);
  await rowField(page, "1").click(); // a click keeps the touch keypad closed, as the owner preview did
  for (let i = 1; i <= 6; i++) {
    await page.keyboard.type(`y=${i}x`);
    if (i < 6) await page.keyboard.press("Enter");
  }
  await expect
    .poll(async () => (await rows(page)).map((r) => r.id))
    .toEqual(["1", "2", "3", "4", "5", "6"]);
  const measure = () =>
    page.locator("#calc .kc-list-body").evaluate((body) => {
      const view = body.getBoundingClientRect();
      const within = (r: DOMRect) => r.top >= view.top - 0.5 && r.bottom <= view.bottom + 0.5;
      const all = [...body.querySelectorAll<HTMLElement>("[data-row-id]")];
      const active = body.querySelector<HTMLElement>('[data-active="true"]');
      return {
        activeId: active?.getAttribute("data-row-id") ?? null,
        activeInView: active !== null && within(active.getBoundingClientRect()),
        enoughRowsInView: all.filter((r) => within(r.getBoundingClientRect())).length >= 3,
        scrollable: ["auto", "scroll"].includes(getComputedStyle(body).overflowY),
      };
    });
  // polled: the new row grows in over 200 ms (AN-5) before it can be fully in view
  await expect
    .poll(measure)
    .toEqual({ activeId: "6", activeInView: true, enoughRowsInView: true, scrollable: true });
});
test("L-1 the graph and list fill the calculator's height while the keypad is closed and stop at the keypad when it opens", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop layout");
  await page.setViewportSize({ width: 1280, height: 760 });
  await openShell(page);
  const host = (await page.locator("#calc").boundingBox())!;
  for (const cls of ["kc-graph-region", "kc-list-region"]) {
    const b = await box(page, cls);
    expect(Math.abs(b.y + b.height - (host.y + host.height)), cls).toBeLessThanOrEqual(1);
  }
  await api(page, "c.updateSettings({ keypad: true })");
  // once the AN-1 slide has ended, the graph stops at the keypad's top edge
  await expect
    .poll(async () => {
      const keypad = (await page.getByRole("region", { name: "Keypad" }).boundingBox())!;
      const graph = await box(page, "kc-graph-region");
      return [
        Math.abs(graph.y + graph.height - keypad.y) <= 1,
        keypad.y + keypad.height <= host.y + host.height + 1,
      ];
    })
    .toEqual([true, true]);
});

test("L-16 unfocused rows have no border, fill or box around the math and are separated by one 1 px rule", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=x", "y=2"])}`);
  const look = await page.locator('#calc [data-row-id="2"]').evaluate((li) => {
    const field = li.querySelector(".mq-editable-field")!;
    const f = getComputedStyle(field);
    const row = getComputedStyle(li);
    return {
      field: [f.borderTopStyle, f.backgroundColor, f.boxShadow],
      rule: [row.borderBottomStyle, row.borderBottomWidth, row.borderTopStyle],
    };
  });
  expect(look.field).toEqual(["none", "rgba(0, 0, 0, 0)", "none"]);
  expect(look.rule).toEqual(["solid", "1px", "none"]);
});

test("L-3 the focused row fills its whole gutter in the focused-row colour", async ({ page }) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=x", "y=2"])}`);
  await rowField(page, "1").click();
  const colours = await page.locator("#calc").evaluate((host) => {
    const root = host.shadowRoot!;
    const bar = getComputedStyle(root.querySelector(".kc-list-panel")!).getPropertyValue(
      "--kc-focus-bar"
    );
    const probe = document.createElement("span");
    probe.style.color = bar;
    root.append(probe);
    const want = getComputedStyle(probe).color;
    probe.remove();
    const gutter = (id: string) =>
      getComputedStyle(root.querySelector(`[data-row-id="${id}"] .kc-row-gutter`)!).backgroundColor;
    return { want, focused: gutter("1"), other: gutter("2") };
  });
  expect(colours.focused).toBe(colours.want);
  expect(colours.other).toBe("rgba(0, 0, 0, 0)");
});
