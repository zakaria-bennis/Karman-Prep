import { expect, test, type Locator } from "@playwright/test";
import {
  BLOCK_SYSTEM,
  T1_STEM_CONTROLS,
  T1_STEM_DENIED,
} from "./fixture/harness/transfer-questions";
import { compositeShading, contrastRatio } from "../../src/lib/calculator/theme/contrast";
import { resolveRowColor } from "../../src/lib/calculator/theme/roles";
import { SKIN_COLORS } from "../../src/lib/calculator/theme/skin-colors.generated";
import { SITE_SKIN_IDS, SKIN_IDS, type SkinId } from "../../src/lib/calculator/theme/skins";
import {
  DESKTOP,
  allControls,
  anchor,
  anchors,
  annotations,
  applySkin,
  blurActive,
  box,
  choiceAnchor,
  choiceContainer,
  choiceControl,
  chromeOnly,
  control,
  hex,
  hoverAt,
  item,
  kcPaper,
  layoutMarked,
  markLayout,
  must,
  nextFrame,
  opacity,
  open,
  outline,
  paint,
  press,
  recordStrokes,
  rowItem,
  rows,
  setRows,
  settled,
  shadingLayer,
  snapshot,
  strokes,
  tapItem,
  tooltip,
  transferByMouse,
  url,
} from "./transfer-helpers";

test("TR-4 controls render only where useCalculator() returns a bridge: Math questions, never Reading and Writing", async ({
  page,
}) => {
  await page.goto(url());
  await expect(page.getByText("Lines", { exact: false }).first()).toBeVisible();
  for (const latex of new Set(T1_STEM_CONTROLS))
    await expect(anchors(page, latex), latex).toHaveCount(
      T1_STEM_CONTROLS.filter((l) => l === latex).length
    );
  for (const latex of T1_STEM_DENIED) {
    await expect(annotations(page, latex).first()).toBeAttached();
    await expect(anchors(page, latex), latex).toHaveCount(0);
  }
  await expect(page.locator("[data-transfer-control]")).toHaveCount(T1_STEM_CONTROLS.length + 3);
  await expect(choiceControl(page, "D")).toHaveCount(0);
  await page.goto(url("practice", "&subject=reading"));
  await expect(page.getByText(/^Question 1:/).first()).toBeVisible();
  await expect(allControls(page)).toHaveCount(0);
  await page.goto(url());
  await press(page, "Skip this question");
  await press(page, "Skip this question");
  await expect(page.getByText("is quoted", { exact: false })).toBeVisible();
  await expect(allControls(page)).toHaveCount(0);
});

const OFF = { x: 5, y: 790 }; // a page point clear of every item and control at 1280×800

test("TR-43, TR-44 the icon-only control is a Calculator with an ArrowUpRight at 16 px on a 24 px target when hovered, and 20 px on a 44 px target when tap-selected or in a choice cluster on touch", async ({
  page,
}, info) => {
  const touch = /ios|android/.test(info.project.name);
  test.skip(!touch && info.project.name !== "calculator-chrome", "pointer-specific sizes");
  const check = async (button: Locator, glyph: number, target: number) => {
    await expect(button.locator("svg.lucide-calculator")).toHaveCount(1);
    await expect(button.locator("svg.lucide-arrow-up-right")).toHaveCount(1);
    expect((await button.textContent())?.trim()).toBe("");
    const g = await box(button.locator("[data-transfer-glyph]"));
    expect([g.width, g.height]).toEqual([glyph, glyph]);
    const b = await box(button);
    expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(target);
  };
  if (touch) {
    await page.goto(url());
    await tapItem(page, "y>2x+1");
    await check(control(page, "y>2x+1"), 20, 44);
    await check(choiceControl(page, "A"), 20, 44);
    return;
  }
  await open(page);
  await hoverAt(item(page, "y>2x+1"));
  await check(control(page, "y>2x+1"), 16, 24);
  await choiceContainer(page, "A").hover();
  await check(choiceControl(page, "A"), 16, 44);
});

test("TR-46 the control overlays without moving text: above the end of an inline item's last line overlapping it by 4 px, inside the top-right corner of display math", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  for (const size of [DESKTOP, { width: 390, height: 844 }]) {
    await open(page, size);
    const layout = () =>
      page.locator("h2, h2 .katex").evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return [r.left + scrollX, r.top + scrollY, r.width, r.height];
        })
      );
    const before = await layout();
    await hoverAt(item(page, "y>2x+1"));
    await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "true");
    expect(await layout()).toEqual(before);
    const [last, b] = await item(page, "y>2x+1").evaluate((el) => {
      const rs = el.getClientRects();
      const r = rs[rs.length - 1];
      const c = el.nextElementSibling?.querySelector("button")?.getBoundingClientRect();
      if (c === undefined) throw new Error("no control");
      return [
        { top: r.top, right: r.right },
        { top: c.top, bottom: c.bottom, right: c.right },
      ];
    });
    expect(b.top).toBeLessThan(last.top);
    expect(b.bottom - last.top).toBeGreaterThanOrEqual(4);
    expect(Math.abs(b.right - last.right)).toBeLessThanOrEqual(1);
    await hoverAt(item(page, BLOCK_SYSTEM));
    expect(await layout()).toEqual(before);
    const [blockBox, c] = [
      await box(item(page, BLOCK_SYSTEM)),
      await box(control(page, BLOCK_SYSTEM)),
    ];
    expect(Math.abs(c.x + c.width - (blockBox.x + blockBox.width))).toBeLessThanOrEqual(1);
    expect(Math.abs(c.y - blockBox.y)).toBeLessThanOrEqual(1);
  }
});

test("TR-47 hover shows the control at once along the path to it, keeps it with no timer and hides it at once; choice controls follow AR-11 even when the cluster stays visible (OI-2)", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await open(page);
  const visible = () => anchor(page, "y=2x+3").getAttribute("data-visible");
  const it = await box(item(page, "y=2x+3"));
  const from = { x: it.x + it.width / 2, y: it.y + it.height / 2 };
  await page.mouse.move(from.x, from.y);
  expect(await visible()).toBe("true");
  const c = await box(control(page, "y=2x+3"));
  const to = { x: c.x + c.width / 2, y: c.y + c.height / 2 };
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 10, from.y + ((to.y - from.y) * i) / 10);
    expect(await visible(), `step ${i}`).toBe("true");
  }
  await page.waitForTimeout(2000);
  expect(await visible()).toBe("true");
  await page.mouse.move(OFF.x, OFF.y);
  expect(await visible()).toBe("false");
  await page.keyboard.press("Shift");
  await control(page, "y=2x+3").focus();
  await page.mouse.move(from.x, from.y);
  await page.mouse.move(OFF.x, OFF.y);
  expect(await visible()).toBe("true");
  await page.getByRole("button", { name: "Cross out choice A", exact: true }).click();
  await blurActive(page); // the click focused the cross-out button inside the cluster
  await page.mouse.move(OFF.x, OFF.y);
  expect(await opacity(page.locator("[data-calculator-cluster]").first())).toBe("1");
  expect(await opacity(choiceAnchor(page, "A"))).toBe("0");
  await choiceContainer(page, "A").hover();
  expect(await opacity(choiceAnchor(page, "A"))).toBe("1");
  await page.mouse.move(OFF.x, OFF.y);
  expect(await opacity(choiceAnchor(page, "A"))).toBe("0");
  await page.getByRole("button", { name: "Restore choice A", exact: true }).focus();
  expect(await opacity(choiceAnchor(page, "A"))).toBe("1");
});

test("TR-48 keyboard focus shows the control with a 2 px focus ring and gives the item a 2 px selected outline", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await open(page);
  const onControl = () =>
    page.evaluate(() =>
      Boolean(
        document.activeElement?.getAttribute("aria-label")?.startsWith("Transfer to Calculator: ")
      )
    );
  for (let i = 0; i < 80 && !(await onControl()); i++) await page.keyboard.press("Tab");
  // `:focus` re-resolves after the next Tab, so the anchor is pinned by its source id.
  const focused = page.locator(":focus");
  const id = must(await focused.locator("xpath=..").getAttribute("data-source-id"), "source id");
  const a = page.locator(`[data-transfer-control][data-source-id="${id}"]`);
  const it = a.locator("xpath=preceding-sibling::*[1]");
  await expect(a).toHaveAttribute("data-visible", "true");
  expect(await outline(focused)).toEqual(["solid", "2px", "2px"]);
  await expect(it).toHaveAttribute("data-transfer-selected", "true");
  expect(await outline(it)).toEqual(["solid", "2px", "2px"]);
  await page.keyboard.press("Tab");
  await expect(it).not.toHaveAttribute("data-transfer-selected", "true");
});

test("TR-49 Escape hides a hover-revealed control and its tooltip without moving focus, keeps it hidden until the pointer leaves and re-enters the item, and is consumed only when it hid something", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await open(page);
  await page.evaluate(() => {
    const w = window as unknown as { esc: boolean[] };
    w.esc = [];
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") w.esc.push(e.defaultPrevented);
    });
  });
  const escapes = () =>
    page.evaluate(() => (window as unknown as { esc: boolean[] }).esc.splice(0));
  const focusNow = () => page.evaluate(() => document.activeElement?.outerHTML.slice(0, 60));
  const focusBefore = await focusNow();
  await hoverAt(item(page, "y>2x+1"));
  await control(page, "y>2x+1").hover();
  await expect(tooltip(page, "y>2x+1")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "false");
  await expect(tooltip(page, "y>2x+1")).toBeHidden();
  expect(await escapes()).toEqual([]);
  expect(await focusNow()).toBe(focusBefore);
  const it = await box(item(page, "y>2x+1"));
  await page.mouse.move(it.x + 2, it.y + it.height / 2);
  await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "false");
  await page.keyboard.press("Escape");
  expect(await escapes()).toEqual([false]);
  await page.mouse.move(OFF.x, OFF.y);
  await hoverAt(item(page, "y>2x+1"));
  await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "true");
});

test("TR-51 the tooltip reads Transfer to Calculator after 300 ms of hover or at once on keyboard focus, adjoins the control, persists over itself and never shows on touch", async ({
  page,
}, info) => {
  const touch = /ios|android/.test(info.project.name);
  test.skip(!touch && info.project.name !== "calculator-chrome", "hover and touch projects");
  if (touch) {
    await page.goto(url());
    await tapItem(page, "y>2x+1");
    await page.waitForTimeout(600);
    await expect(tooltip(page, "y>2x+1")).toBeHidden();
    return;
  }
  await open(page);
  await anchor(page, "y>2x+1").evaluate((a) => {
    const b = a.querySelector("button");
    const t = a.querySelector("[data-transfer-tooltip]");
    if (b === null || t === null) throw new Error("no control");
    const w = window as unknown as { tip?: number };
    let t0 = 0;
    b.addEventListener("pointerenter", () => (t0 = performance.now()));
    new MutationObserver(() => {
      if (!t.hasAttribute("hidden") && w.tip === undefined) w.tip = performance.now() - t0;
    }).observe(t, { attributes: true });
  });
  await hoverAt(item(page, "y>2x+1"));
  await control(page, "y>2x+1").hover();
  await page.waitForTimeout(600);
  const delay = must(
    await page.evaluate(() => (window as unknown as { tip?: number }).tip),
    "tooltip delay"
  );
  expect(delay).toBeGreaterThanOrEqual(295);
  expect(delay).toBeLessThan(450);
  await expect(tooltip(page, "y>2x+1")).toHaveText("Transfer to Calculator");
  const [b, t] = [await box(control(page, "y>2x+1")), await box(tooltip(page, "y>2x+1"))];
  expect(
    Math.min(Math.abs(t.x - (b.x + b.width)), Math.abs(b.x - (t.x + t.width)))
  ).toBeLessThanOrEqual(0.5);
  expect(t.y < b.y + b.height && t.y + t.height > b.y).toBe(true);
  await tooltip(page, "y>2x+1").hover();
  await page.waitForTimeout(400);
  await expect(tooltip(page, "y>2x+1")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip(page, "y>2x+1")).toBeHidden();
  await page.mouse.move(OFF.x, OFF.y);
  await page.keyboard.press("Shift");
  await control(page, "y=2x+3").focus();
  expect(await tooltip(page, "y=2x+3").isVisible()).toBe(true);
});

test("TR-52, AN-12 the control, tooltip, selected outline and choice clusters appear and disappear with no animation or transition", async ({
  page,
}, info) => {
  const touch = /ios|android/.test(info.project.name);
  test.skip(!touch && info.project.name !== "calculator-chrome", "hover and touch projects");
  const still = (l: Locator) =>
    l.evaluate((el) => [
      el.getAnimations({ subtree: true }).length,
      getComputedStyle(el).transitionDuration,
    ]);
  // The host's own cross-out and highlight buttons keep their colour transitions, so a cluster
  // is checked for its own motion and its Transfer control's subtree (choice D has none).
  const own = (l: Locator) =>
    l.evaluate((el) => [el.getAnimations().length, getComputedStyle(el).transitionDuration]);
  const clusterStill = async (c: Locator) => {
    expect(await own(c)).toEqual([0, "0s"]);
    for (const a of await c.locator("[data-transfer-control]").all())
      expect(await still(a)).toEqual([0, "0s"]);
  };
  if (touch) {
    await page.goto(url());
    await settled(page);
    for (const c of await page.locator("[data-calculator-cluster]").all()) await clusterStill(c);
    await tapItem(page, "y>2x+1");
    for (const l of [anchor(page, "y>2x+1"), item(page, "y>2x+1")])
      expect(await still(l)).toEqual([0, "0s"]);
    return;
  }
  await open(page);
  const a = anchor(page, "y>2x+1");
  const steps = [
    () => hoverAt(item(page, "y>2x+1")),
    () => control(page, "y>2x+1").hover(),
    () => page.waitForTimeout(350),
    () => page.keyboard.press("Escape"),
    () => page.mouse.move(OFF.x, OFF.y),
    () => control(page, "y>2x+1").focus(),
  ];
  for (const step of steps) {
    await step();
    for (const l of [
      a,
      a.locator("button"),
      a.locator("[data-transfer-tooltip]"),
      item(page, "y>2x+1"),
    ])
      expect(await still(l)).toEqual([0, "0s"]);
  }
  for (const c of await page.locator("[data-calculator-cluster]").all()) {
    await c.hover();
    await clusterStill(c);
  }
});

test("TR-53, TH-1, TH-14 in all 12 skins the glyph is 4.5:1 on the button, the boundary and focus ring 3:1 on the colour beside the control, the selected outline 3:1 on the colour beside the item, the ring 2 px solid offset 2 px and the tooltip text 7:1", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await open(page);
  for (const skin of SITE_SKIN_IDS) {
    // the Transfer control is site chrome, so it follows the 12 site themes (TH-5)
    await applySkin(page, skin);
    await page.mouse.move(5, 790);
    await settled(page); // the site's colour transitions (a choice's transition-all) end first
    for (const [label, a, focus] of [
      ["stem", anchor(page, "y>2x+1"), control(page, "y>2x+1")],
      ["choice", choiceAnchor(page, "A"), choiceControl(page, "A")],
    ] as const) {
      await page.keyboard.press("Shift");
      await focus.focus();
      const c = await paint(a);
      expect(
        contrastRatio(hex(c.glyph), hex(c.button)),
        `${skin} ${label} glyph`
      ).toBeGreaterThanOrEqual(4.5);
      for (const k of ["border", "ring"] as const)
        for (const [side, bg] of c.pages.entries())
          expect(
            contrastRatio(hex(c[k]), hex(bg)),
            `${skin} ${label} ${k} side ${side}`
          ).toBeGreaterThanOrEqual(3);
      for (const [side, bg] of c.outlinePages.entries())
        expect(
          contrastRatio(hex(c.outline), hex(bg)),
          `${skin} ${label} outline side ${side}`
        ).toBeGreaterThanOrEqual(3);
      expect(c.ringStyle, `${skin} ${label}`).toEqual(["solid", "2px", "2px"]);
      if (label === "stem")
        expect(
          contrastRatio(hex(c.tipText), hex(c.tipBg)),
          `${skin} tooltip`
        ).toBeGreaterThanOrEqual(7);
    }
  }
});

test("TH-2, AR-37 the control, tooltip and selected outline take their colours from --kcc-* and repaint on a theme change", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await open(page);
  await page.keyboard.press("Shift");
  await control(page, "y>2x+1").focus();
  const seen: string[] = [];
  const v = (name: string) =>
    page.evaluate(
      (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toLowerCase(),
      name
    );
  for (const skin of ["ivory", "observatory"] as const) {
    await applySkin(page, skin);
    const c = await paint(anchor(page, "y>2x+1"));
    expect(
      [c.button, c.glyph, c.border, c.ring, c.outline, c.tipText, c.tipBg].map(hex),
      skin
    ).toEqual([
      await v("--kcc-chrome"),
      await v("--kcc-text"),
      await v("--kcc-text-secondary"), // TR-53's border fallback
      await v("--kcc-focus"),
      await v("--kcc-focus"),
      await v("--kcc-text"),
      await v("--kcc-chrome"),
    ]);
    seen.push(c.button);
  }
  expect(seen[0]).not.toBe(seen[1]);
});

test("AR-37 the open calculator's shadow CSS reads only inherited or locally declared custom properties and repaints within one frame on a theme switch, contrast and colour-scheme changes, with no remount", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await page.addInitScript(recordStrokes);
  await page.emulateMedia({
    colorScheme: "light",
    contrast: "no-preference",
    reducedMotion: "no-preference",
  });
  await open(page);
  await applySkin(page, "ivory");
  await press(page, "Toggle Karman calculator");
  await expect(rowItem(page)).toBeVisible();
  await setRows(page, ["y=x"]);
  await expect.poll(async () => (await strokes(page)).length).toBeGreaterThan(0);
  const vars = await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>("[data-calculator-host]");
    const root = host?.shadowRoot;
    if (!host || !root) return null;
    // the installStyles adopts constructed sheets in Chromium and falls back to <style> elsewhere
    const sheets = [...root.adoptedStyleSheets, ...root.styleSheets];
    const css = sheets.flatMap((s) => [...s.cssRules].map((r) => r.cssText)).join("\n"); // CSSOM text holds no comments
    const inline = [...root.querySelectorAll<HTMLElement>("[style]")].flatMap((e) => [
      ...(e.getAttribute("style") ?? "").matchAll(/(--[\w-]+)\s*:/g),
    ]);
    const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g), ...inline].map((m) => m[1]));
    const read = [...new Set([...css.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map((m) => m[1]))];
    const cs = getComputedStyle(host);
    return {
      sheets: sheets.length,
      read: read.length,
      missing: read.filter((n) => !declared.has(n) && cs.getPropertyValue(n).trim() === ""),
    };
  });
  expect(vars?.sheets).toBeGreaterThan(0);
  expect(vars?.read).toBeGreaterThan(0);
  expect(vars?.missing).toEqual([]);
  await page.evaluate(markLayout);
  // [name, change, the skin it leaves, whether the canvas repaints]
  const changes: [string, () => Promise<unknown>, SkinId | null, boolean][] = [
    [
      "skin switch (data-calculator-skin, with the site theme)",
      () => applySkin(page, "observatory"),
      "observatory",
      true,
    ],
    ["prefers-contrast", () => page.emulateMedia({ contrast: "more" }), null, true],
    [
      "calculator skin removed",
      () =>
        page.evaluate(() => {
          const r = document.documentElement;
          r.classList.toggle("dark", false);
          delete r.dataset.theme;
          delete r.dataset.calculatorSkin;
        }),
      "classic",
      true,
    ],
    // TH-15: the OS colour scheme no longer picks the calculator's skin
    ["prefers-color-scheme", () => page.emulateMedia({ colorScheme: "dark" }), "classic", false],
  ];
  for (const [name, change, skin, repaints] of changes) {
    const before = (await strokes(page)).length;
    await change();
    await page.evaluate(nextFrame);
    if (repaints) expect((await strokes(page)).length, name).toBeGreaterThan(before);
    if (skin)
      expect(await kcPaper(page), name).toBe(SKIN_COLORS[skin].normal.roles.paper.toLowerCase());
  }
  expect([await page.evaluate(layoutMarked), await rows(page)]).toEqual([true, ["y=x"]]);
});

// Known gap: the open calculator does not repaint its canvas when prefers-reduced-motion changes
// (watchTheme follows colour scheme, contrast and forced colours only; KarmanCalculator stores the
// motion query without a repaint). Fixme until the shell repaints on that change.
test.fixme("AR-37 the open calculator repaints within one frame on a prefers-reduced-motion change, with no remount", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await page.addInitScript(recordStrokes);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page);
  await press(page, "Toggle Karman calculator");
  await expect(rowItem(page)).toBeVisible();
  await setRows(page, ["y=x"]);
  await expect.poll(async () => (await strokes(page)).length).toBeGreaterThan(0);
  await page.evaluate(markLayout);
  const before = (await strokes(page)).length;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(nextFrame);
  expect((await strokes(page)).length).toBeGreaterThan(before);
  expect([await page.evaluate(layoutMarked), await rows(page)]).toEqual([true, ["y=x"]]);
});

test("F-A1 a transferred inequality and system shade as the uncapped stack of their 40% fills", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await open(page);
  await transferByMouse(page, "y>2x+1");
  await transferByMouse(page, BLOCK_SYSTEM);
  // the inequality and the system's 2 inequalities
  await expect.poll(async () => (await snapshot(page))?.regions).toBe(3);
  const colors = await page.evaluate(
    () => globalThis.__calculatorHarness?.engine.getSnapshot().rows.map((r) => r.color) ?? []
  );
  for (const skin of SKIN_IDS) {
    const paper = SKIN_COLORS[skin].normal.roles.paper;
    await applySkin(page, skin);
    await expect.poll(() => kcPaper(page)).toBe(paper.toLowerCase());
    await page.evaluate(nextFrame);
    const fills = colors.map((c) => resolveRowColor(c, skin)); // each row's curve colour and fill alpha, in row order
    const allowed = Array.from({ length: 2 ** fills.length - 1 }, (_, m) =>
      compositeShading(
        paper,
        fills
          .filter((_, i) => ((m + 1) >> i) & 1)
          .map((f) => ({ color: f.hex, alpha: f.fillAlpha }))
      ).toLowerCase()
    );
    const { opaque, partial } = await shadingLayer(page);
    expect(partial, `${skin} partial shading pixels`).toBe(0);
    expect(opaque.length, `${skin} shading painted`).toBeGreaterThan(0);
    for (const c of opaque) {
      expect(allowed, `${skin} ${c} is a compositeShading result`).toContain(c);
    }
  }
});
