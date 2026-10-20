import { expect, test, type Locator, type Page } from "@playwright/test";

const open = (page: Page, rows: string[], query = "") =>
  page.goto(`/harness/editor.html?rows=${encodeURIComponent(JSON.stringify(rows))}${query}`);
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
const transitions = (target: Locator) =>
  target.evaluate((el) =>
    el.getAnimations().map((a) => ({
      property: (a as CSSTransition).transitionProperty,
      duration: a.effect!.getTiming().duration,
    }))
  );

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
  await page.getByRole("button", { name: "Delete All", exact: true }).click();
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

test("L-3 the focused row fills its gutter in the focus-bar colour and draws a 2 px focus-ring outline", async ({
  page,
}) => {
  await open(page, ["y=x", "2+3"]);
  await field(page, 1).focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowDown"); // L-3: the outline is for a row reached from the keyboard
  await expect(field(page, 2)).toBeFocused();
  const row = page.locator('li[data-row-id="2"]');
  const role = (name: string) =>
    row.evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
  await expect(row).toHaveCSS("outline-style", "solid");
  await expect(row).toHaveCSS("outline-width", "2px");
  await expect(row).toHaveCSS("outline-color", rgb(await role("--kc-focus-ring")));
  await expect(row.locator(".kc-row-gutter")).toHaveCSS(
    "background-color",
    rgb(await role("--kc-focus-bar"))
  );
  await expect(row.locator(".kc-row-number")).toHaveCSS(
    "color",
    rgb(await role("--kc-focus-bar-label"))
  );
  await expect(page.locator('li[data-row-id="1"]')).toHaveCSS("outline-style", "none");
});

test("R-5 the value sits below the math, right-aligned, in a small raised box after a muted =", async ({
  page,
}) => {
  await open(page, ["2+3"]);
  const value = page.locator('li[data-row-id="1"] .kc-row-value');
  const box = value.locator(".kc-row-value-box");
  await expect(box).toHaveText("5");
  await expect(value.locator(".kc-row-equals")).toHaveText("=");
  await expect(value).toHaveCSS("text-align", /^(end|right)$/);
  await expect(box).toHaveCSS("border-top-width", "1px");
  await expect(box).toHaveCSS("border-top-left-radius", "4px"); // EL-32
  await expect(box).toHaveCSS("padding-top", "3px");
  await expect(box).toHaveCSS("padding-left", "5px");
  const equals = (await value.locator(".kc-row-equals").boundingBox())!;
  const boxed = (await box.boundingBox())!;
  expect(boxed.x).toBeGreaterThan(equals.x); // the = comes first, the box follows
  const math = (await page.locator('li[data-row-id="1"] .kc-row-field').boundingBox())!;
  // EL-31: the value line tucks 4 px up under the field's bottom padding.
  expect((await value.boundingBox())!.y).toBeGreaterThanOrEqual(math.y + math.height - 5);
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

const keyBoxes = async (keypad: Locator) =>
  Promise.all((await keypad.getByRole("button").all()).map(async (b) => (await b.boundingBox())!));
const fromValue = (target: Locator, property: string) =>
  target.evaluate((el, p) => {
    const a = el.getAnimations().find((x) => (x as CSSTransition).transitionProperty === p);
    return a ? String((a.effect as KeyframeEffect).getKeyframes()[0][p]) : null;
  }, property);

test("K-1 fine-pointer tray keys and the Hide keypad control are at least 32 x 32 px", async ({
  page,
}) => {
  await open(page, [""], "&keypad=open&pointer=fine&width=900");
  const keypad = page.getByRole("region", { name: "Keypad" });
  await expect(keypad).toHaveAttribute("data-layout", "tray");
  await expect(keypad.getByRole("button", { name: "Hide keypad" })).toBeVisible();
  for (const box of await keyBoxes(keypad))
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(32);
});

test("K-6 containers under 600 px use the 7 x 6 keypad with 44 px keys whatever the pointer, and wider ones the tray, every key at least 44 px on coarse pointers", async ({
  page,
}) => {
  const cases = [
    [320, "phone", "coarse", 390, 844],
    [599, "phone", "coarse", 640, 844],
    [599, "phone", "fine", 640, 844], // a narrow floating window on a desktop
    [600, "tray", "coarse", 640, 844],
    [844, "tray", "coarse", 844, 390],
  ] as const;
  for (const [width, layout, pointer, vw, vh] of cases) {
    await page.setViewportSize({ width: vw, height: vh });
    await open(page, [""], `&keypad=open&pointer=${pointer}&width=${width}`);
    const keypad = page.getByRole("region", { name: "Keypad" });
    await expect(keypad).toHaveAttribute("data-layout", layout);
    await expect(keypad.getByRole("button", { name: "Tilde", exact: true })).toBeVisible();
    for (const box of await keyBoxes(keypad))
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    await keypad.getByRole("button", { name: "ABC", exact: true }).click();
    for (const box of await keyBoxes(keypad))
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
  }
});

test("K-4 the Functions panel scrolls directly above the keypad from 560 px and covers the keypad area below 560 px", async ({
  page,
}) => {
  const cases = [
    [900, "above", 1280, 800],
    [390, "cover", 390, 844],
  ] as const;
  for (const [width, placement, vw, vh] of cases) {
    await page.setViewportSize({ width: vw, height: vh });
    await open(page, [""], `&keypad=open&pointer=coarse&width=${width}`);
    await field(page, 1).focus();
    const keypad = page.getByRole("region", { name: "Keypad" });
    await keypad.getByRole("button", { name: "Functions", exact: true }).click();
    const panel = page.locator(".kc-functions-panel");
    await expect(panel).toHaveAttribute("data-placement", placement);
    await expect.poll(() => transitions(panel), { intervals: [16] }).toEqual([]); // AN-2 ended
    await expect(panel).toHaveCSS("overflow-y", "auto");
    const p = (await panel.boundingBox())!;
    const k = (await keypad.boundingBox())!;
    if (placement === "above") {
      await expect(panel).toHaveCSS("max-height", "240px");
      expect(Math.abs(p.y + p.height - k.y)).toBeLessThanOrEqual(1);
    } else {
      for (const d of [p.x - k.x, p.y - k.y, p.width - k.width, p.height - k.height])
        expect(Math.abs(d)).toBeLessThanOrEqual(1);
    }
  }
});

test("K-7 double-tapping the keypad = gives one ~ in one undo step, announces tilde; hardware == stays", async ({
  page,
  isMobile,
}) => {
  await open(page, [""], "&keypad=open");
  await field(page, 1).focus();
  const keypad = page.getByRole("region", { name: "Keypad" });
  const equals = keypad.getByRole("button", { name: "Equals", exact: true });
  await expect(equals).toHaveCSS("touch-action", "manipulation");
  await keypad.getByRole("button", { name: "y", exact: true }).click();
  if (isMobile) {
    await equals.tap();
    await equals.tap();
  } else await equals.dblclick();
  await expect.poll(async () => (await latexes(page))[0]).toMatch(/^y\\sim\s*$/);
  await expect(page.getByRole("status")).toHaveText("tilde");
  // PR-30: y\sim with nothing after it is a half-typed regression, named as such (sim-side).
  const marker = page.locator('li[data-row-id="1"] .kc-row-warning');
  if (isMobile) await marker.tap();
  else await marker.hover();
  await expect(page.getByRole("tooltip")).toHaveText(
    "You need something on both sides of the '∼' symbol."
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => latexes(page)).toEqual(["y="]);
  await field(page, 1).focus();
  await page.keyboard.press("End");
  await page.keyboard.type("==");
  await expect.poll(async () => (await latexes(page))[0]).not.toContain("\\sim");
});

test("R-2 the error tooltip opens on hover and focus, closes on Escape, and toggles on tap", async ({
  page,
  isMobile,
}) => {
  await open(page, ["y=2+", "y=x"]);
  const marker = page.locator('li[data-row-id="1"] .kc-row-warning');
  const tip = page.getByRole("tooltip");
  const message = "This can't be read. Check for a missing bracket or operator.";
  await expect(marker).toHaveAccessibleName("Error");
  await expect(page.locator('li[data-row-id="1"] .kc-row-tab')).toHaveCount(0);
  await expect(tip).toHaveCount(0);
  if (isMobile) {
    await marker.tap(); // a tap toggles it
    await expect(tip).toHaveText(message);
    await marker.tap();
    await expect(tip).toHaveCount(0);
    await marker.tap();
    await expect(tip).toBeVisible();
    await page.locator('li[data-row-id="2"] .kc-row-number').tap(); // a press outside closes it
    await expect(tip).toHaveCount(0);
    return;
  }
  await marker.hover(); // VIS-31: about 500 ms after the pointer rests on it
  await expect(tip).toHaveText(message, { timeout: 1500 });
  const m = (await marker.boundingBox())!;
  const t = (await tip.boundingBox())!;
  expect(t.y).toBeGreaterThanOrEqual(m.y + m.height); // directly below the marker
  // EL-35: the 200 px box stays inside the calculator; its arrow points at the marker's centre.
  const arrow = await tip.evaluate((el) =>
    parseFloat(getComputedStyle(el).getPropertyValue("--kc-tip-arrow"))
  );
  expect(Math.abs(t.x + arrow - (m.x + m.width / 2))).toBeLessThanOrEqual(2);
  await page.mouse.move(600, 400);
  await expect(tip).toHaveCount(0);
  await marker.focus();
  await expect(tip).toHaveText(message);
  await expect(marker).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(tip).toHaveCount(0);
  await expect(marker).toBeFocused();
  await field(page, 1).focus();
  await expect(tip).toHaveCount(0);
});

test("AN-1 the keypad slides on translateY over 300 ms with ease and is visibility:hidden once hidden", async ({
  page,
}) => {
  await open(page, [""], "&pointer=fine"); // the Show keypad tab is a fine-pointer control
  const tray = page.locator(".kc-keypad");
  await expect(tray).toHaveCSS("visibility", "hidden");
  await page.getByRole("button", { name: "Show keypad" }).click();
  await expect
    .poll(() => transitions(tray), { intervals: [16] })
    .toContainEqual({ property: "transform", duration: 300 });
  await expect(tray).toHaveCSS("transition-timing-function", /^ease\b/);
  await page.getByRole("button", { name: "Hide keypad" }).click();
  await expect
    .poll(() => transitions(tray), { intervals: [16] })
    .toContainEqual({ property: "transform", duration: 300 });
  await expect(tray).toHaveCSS("visibility", "hidden");
});

test("AN-2 the Functions panel fades in rising 8 px over 300 ms and closes at once", async ({
  page,
}) => {
  await open(page, [""], "&keypad=open");
  await field(page, 1).focus();
  const functions = page.getByRole("button", { name: "Functions", exact: true });
  const panel = page.locator(".kc-functions-panel");
  await functions.click();
  await expect
    .poll(() => transitions(panel), { intervals: [16] })
    .toEqual(
      expect.arrayContaining([
        { property: "opacity", duration: 300 },
        { property: "transform", duration: 300 },
      ])
    );
  expect(await fromValue(panel, "transform")).toMatch(
    /translateY\(8px\)|matrix\(1, 0, 0, 1, 0, 8\)/
  );
  await expect.poll(() => transitions(panel), { intervals: [16] }).toEqual([]);
  await functions.click();
  await expect(panel).toHaveCount(0); // the reference's popovers leave at once
});

test("AN-11 keys and toolbar buttons change background tone at once on press, with no scale or shadow", async ({
  page,
}) => {
  await open(page, [""], "&keypad=open&pointer=fine");
  const roleOf = (target: Locator, name: string) =>
    target.evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
  const cases = [
    [page.getByRole("button", { name: "7", exact: true }), "--kc-key", "--kc-key-operator"],
    [page.getByRole("button", { name: "Divide", exact: true }), "--kc-key-operator", "--kc-key"],
    [page.getByRole("button", { name: "Add item" }), null, null],
  ] as const;
  for (const [target, restRole, pressedRole] of cases) {
    await expect(target).toHaveCSS("transition-duration", "0s");
    const rest = await target.evaluate((el) => getComputedStyle(el).backgroundColor);
    if (restRole !== null) expect(rest).toBe(rgb(await roleOf(target, restRole)));
    await target.hover();
    await page.mouse.down();
    await expect(target).toHaveCSS("transform", "none");
    await expect(target).toHaveCSS("box-shadow", "none");
    await expect(target).not.toHaveCSS("background-color", rest);
    if (pressedRole !== null) {
      await expect(target).toHaveCSS("background-color", rgb(await roleOf(target, pressedRole)));
    }
    await page.mouse.up();
  }
});

test("AN-3 Collapse and Expand list resize the graph once each, at the start, then slide the list over 250 ms", async ({
  page,
}) => {
  await open(page, ["y=x"]);
  const resizes = () => page.evaluate(() => globalThis.__editorHarness!.graphResizes);
  await page.waitForTimeout(100);
  const base = await resizes();
  await page.getByRole("button", { name: "Collapse list" }).click();
  await expect
    .poll(() => transitions(page.locator(".kc-list-slide")), { intervals: [16] })
    .toContainEqual({ property: "transform", duration: 250 });
  await expect.poll(resizes).toBe(base + 1); // EL-49: during the slide, not after it
  await expect(page.getByRole("button", { name: "Expand list" })).toBeFocused();
  await page.waitForTimeout(300);
  expect(await resizes()).toBe(base + 1);
  await page.getByRole("button", { name: "Expand list" }).click();
  await expect
    .poll(() => transitions(page.locator(".kc-list-slide")), { intervals: [16] })
    .toContainEqual({ property: "transform", duration: 250 });
  await expect.poll(resizes).toBe(base + 2);
  await page.waitForTimeout(300);
  expect(await resizes()).toBe(base + 2);
  await expect(page.getByRole("button", { name: "Collapse list" })).toBeFocused();
});

test("AN-4 the settings popover appears and leaves at once", async ({ page }) => {
  await open(page, [""]);
  const settings = page.getByRole("button", { name: "Settings" });
  const popover = page.locator(".kc-settings");
  await settings.click();
  await expect(popover).toBeVisible();
  expect(await transitions(popover)).toEqual([]);
  await settings.focus(); // WebKit does not focus a clicked button, so Escape would miss the editor
  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
  await expect(settings).toBeFocused();
});

test("S-1 the settings popover opens to the left of its Settings control, top-aligned with it", async ({
  page,
}) => {
  await open(page, [""]);
  const settings = page.getByRole("button", { name: "Settings", exact: true });
  await settings.click();
  const popover = page.getByRole("dialog", { name: "Graph settings" });
  await expect(popover).toBeVisible();
  await expect.poll(() => transitions(popover), { intervals: [16] }).toEqual([]); // AN-4 ended
  const a = (await settings.boundingBox())!;
  const p = (await popover.boundingBox())!;
  // VIS-4: 290 px wide, a 12 px arrow between its right edge and the control, tops level.
  expect(Math.abs(p.width - 290)).toBeLessThanOrEqual(1);
  expect(Math.abs(p.x + p.width + 12 - a.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(p.y - a.y)).toBeLessThanOrEqual(1);
});

test("AN-5 rows appear at once and a removed row shrinks and fades out in place over 200 ms without moving another row's caret", async ({
  page,
}) => {
  await open(page, ["y=x", "a=2", "b=3"]);
  await field(page, 1).focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpression({ id: "9", latex: "y=3" })
  );
  await expect(page.locator('li[data-row-id="9"]')).toHaveCount(1);
  expect(await transitions(page.locator('li[data-row-id="9"]'))).toEqual([]);
  await page.evaluate(() => globalThis.__calculatorHarness!.engine.removeExpression({ id: "2" }));
  const ghost = page.locator('li[data-row-id="2"]');
  await expect(ghost).toHaveAttribute("data-motion", "exit");
  await expect
    .poll(() => transitions(ghost), { intervals: [16] })
    .toContainEqual({ property: "transform", duration: 200 });
  await expect(ghost).toHaveCount(0);
  await page.keyboard.type("2");
  await expect.poll(() => latexes(page)).toEqual(["y=2x", "b=3", "y=3"]);
});

test("L-14 a long row scrolls inside its column and keeps the caret in view", async ({ page }) => {
  await open(page, [""], "&width=900");
  await field(page, 1).focus();
  await page.keyboard.type("1234567890".repeat(8));
  await expect.poll(async () => (await latexes(page))[0].length).toBe(80);
  const row = page.locator('li[data-row-id="1"]');
  // MathQuill scrolls its root block to the caret over a short animation, so poll the end state.
  const caretInView = () =>
    row.evaluate((li) => {
      const root = li.querySelector(".mq-root-block")!;
      const caret = li.querySelector(".mq-cursor")!.getBoundingClientRect();
      const inner = li.querySelector(".kc-row-inner")!.getBoundingClientRect();
      return {
        overflows: root.scrollWidth > root.clientWidth,
        scrolled: root.scrollLeft > 0,
        caretInside: caret.left >= inner.left && caret.right <= inner.right,
      };
    });
  await expect.poll(caretInView).toEqual({ overflows: true, scrolled: true, caretInside: true });
});
