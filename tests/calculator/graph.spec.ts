// G-5, KB-8, AN-8 and A11Y-1 on the graph harness page (/harness/graph.html). openGraph waits
// for the canvases to draw the engine's latest revision; page code reaches the panel through the
// shadow root that mountHarness attaches to #root, and the engine through
// globalThis.__calculatorHarness.
import { expect, test, type Page } from "@playwright/test";
import { pxToWorld, type Viewport } from "@/lib/calculator/plot/viewport";
import { compositeShading, contrastRatio } from "@/lib/calculator/theme/contrast";
import { nextSlot, resolveRowColor } from "@/lib/calculator/theme/roles";
import { SKIN_COLORS } from "@/lib/calculator/theme/skin-colors.generated";
import { SKIN_IDS, type SkinId } from "@/lib/calculator/theme/skins";
import { inkCentroid, inkRow, layerColors, pixel, px } from "./graph-pixels";

const vp = (l: number, r: number, b: number, t: number): Viewport => ({
  left: l,
  right: r,
  bottom: b,
  top: t,
});
const DEFAULT = vp(-10, 10, -7.5, 7.5);
/** Matches a viewport whose four bounds equal `v`'s to 9 digits. */
const near = (v: Viewport) => ({
  left: expect.closeTo(v.left, 9),
  right: expect.closeTo(v.right, 9),
  bottom: expect.closeTo(v.bottom, 9),
  top: expect.closeTo(v.top, 9),
});
const DEFAULT_NAME = "Graph from x=-10 to 10, y=-7.5 to 7.5, 2 plots";
const ROWS = ["y=x", "y=x^{2}"];

const errors: string[] = [];
test.beforeEach(({ page }) => {
  errors.length = 0;
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(() => {
  expect(errors).toEqual([]);
});

/** The harness size: 360×270 on mobile, 800×600 otherwise (both 4:3). */
const sizeFor = (isMobile: boolean) => (isMobile ? { w: 360, h: 270 } : { w: 800, h: 600 });

/**
 * Opens the harness at `sizeFor(isMobile)` and resolves once the canvases show the snapshot's
 * revision, `plots` rows have geometry and every row has a value or an error, plus two animation
 * frames so the frame drawing the last plot has run.
 */
async function openGraph(
  page: Page,
  isMobile: boolean,
  options: { rows?: string[]; skin?: SkinId; plots?: number } = {}
): Promise<{ w: number; h: number }> {
  const { rows = [], skin = "ivory", plots = 0 } = options;
  const { w, h } = sizeFor(isMobile);
  const query = `skin=${skin}&rows=${encodeURIComponent(JSON.stringify(rows))}&w=${w}&h=${h}`;
  await page.goto(`/harness/graph.html?${query}`);
  await expect
    .poll(
      () =>
        page.evaluate((plotCount) => {
          const engine = globalThis.__calculatorHarness?.engine;
          const layers = document
            .getElementById("root")
            ?.shadowRoot?.querySelector<HTMLElement>("[data-graph-layers]");
          if (!engine || !layers) return false;
          const s = engine.getSnapshot();
          return (
            layers.dataset.renderedRevision === String(s.revision) &&
            s.geometry.size === plotCount &&
            s.rows.every((r) => r.value !== null || r.error !== null)
          );
        }, plots),
      { timeout: 15_000 }
    )
    .toBe(true);
  // Plots arrive without a new revision, so the frame that draws the last one may still be
  // pending: two animation frames let it run before any canvas is read.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
  return { w, h };
}

const viewport = (page: Page) =>
  page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().viewport);
const graph = (page: Page) => page.getByRole("img", { name: /^Graph from/ });
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function layersBox(page: Page) {
  const r = await page.evaluate(() => {
    const el = document.getElementById("root")!.shadowRoot!.querySelector("[data-graph-layers]")!;
    const { left, top, width, height } = el.getBoundingClientRect();
    return { left, top, width, height };
  });
  return { ...r, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

/** Dispatches a touch pointer event on the graph. */
const touch = (page: Page, type: string, id: number, x: number, y: number) =>
  graph(page).dispatchEvent(type, {
    pointerId: id,
    pointerType: "touch",
    isPrimary: id === 1,
    clientX: x,
    clientY: y,
    button: 0,
  });

/** Drags from the graph's centre by (dx, dy): the mouse on desktop, touch pointer 1 on mobile. */
async function drag(page: Page, isMobile: boolean, dx: number, dy: number): Promise<void> {
  // Start on empty paper (world (−6, 4.5) in the default view): a press on a curve traces (POI-14).
  const box = await layersBox(page);
  const cx = box.cx - 0.3 * box.width,
    cy = box.cy - 0.3 * box.height;
  if (isMobile) {
    await touch(page, "pointerdown", 1, cx, cy);
    await touch(page, "pointermove", 1, cx + dx, cy + dy);
    await touch(page, "pointerup", 1, cx + dx, cy + dy);
    return;
  }
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + dx, cy + dy, { steps: 5 });
  await page.mouse.up();
}

test("G-5 the default view is x -10 to 10, y centred on 0 with equal units", async ({
  page,
  isMobile,
}) => {
  const { w, h } = await openGraph(page, isMobile);
  const v = await viewport(page);
  expect(v).toEqual(near(DEFAULT));
  expect(Math.abs((v.right - v.left) / w - (v.top - v.bottom) / h)).toBeLessThan(1e-12);
  await expect(button(page, "Home")).toHaveCount(0);
});

test("G-5 Zoom in and Zoom out zoom about the view centre by 2 per press, instantly", async ({
  page,
  isMobile,
}) => {
  await openGraph(page, isMobile);
  await button(page, "Zoom in").click();
  expect(await viewport(page)).toEqual(near(vp(-5, 5, -3.75, 3.75)));
  await button(page, "Zoom out").click();
  await button(page, "Zoom out").click();
  expect(await viewport(page)).toEqual(near(vp(-20, 20, -15, 15)));
  await graph(page).focus();
  await page.keyboard.press("ArrowRight");
  await button(page, "Zoom in").click();
  expect(await viewport(page)).toEqual(near(vp(-6, 14, -7.5, 7.5)));
});

test("G-5 Home restores the default view by button and by key", async ({ page, isMobile }) => {
  const { w, h } = await openGraph(page, isMobile);
  await graph(page).focus();
  await page.keyboard.press("ArrowUp");
  await button(page, "Zoom in").click();
  await button(page, "Home").click();
  expect(await viewport(page)).toEqual(near(DEFAULT));
  await graph(page).focus();
  await page.keyboard.press("ArrowRight");
  await graph(page).press("Home");
  const v = await viewport(page);
  expect(v).toEqual(near(DEFAULT));
  expect(Math.abs((v.right - v.left) / w - (v.top - v.bottom) / h)).toBeLessThan(1e-12);
});

test("G-5 dragging pans the view with the pointer", async ({ page, isMobile }) => {
  const { w } = await openGraph(page, isMobile);
  const s = w / 800;
  await drag(page, isMobile, 80 * s, -60 * s);
  await expect.poll(() => viewport(page)).toEqual(near(vp(-12, 8, -9, 6)));
});

test("G-5 the wheel zooms about the pointer", async ({ page, isMobile }) => {
  test.skip(isMobile, "wheel input needs a mouse");
  const { w, h } = await openGraph(page, isMobile);
  const box = await layersBox(page);
  const at = { x: 0.75 * w, y: 0.25 * h };
  await page.mouse.move(box.left + at.x, box.top + at.y);
  const size = { width: w, height: h };
  const before = pxToWorld({ viewport: await viewport(page), size, dpr: 1 }, at.x, at.y);
  await page.mouse.wheel(0, -100);
  await expect
    .poll(async () => {
      const v = await viewport(page);
      const span = v.right - v.left;
      const under = pxToWorld({ viewport: v, size, dpr: 1 }, at.x, at.y);
      return (
        span < 20 &&
        span >= 20 / Math.exp(0.2) - 1e-9 &&
        Math.abs(under[0] - before[0]) <= 1e-9 * span &&
        Math.abs(under[1] - before[1]) <= 1e-9 * span
      );
    })
    .toBe(true);
});

test("G-5 a two-finger pinch zooms about the midpoint", async ({ page, isMobile }) => {
  const { w } = await openGraph(page, isMobile);
  const s = w / 800;
  const { cx, cy } = await layersBox(page);
  await touch(page, "pointerdown", 1, cx - 50 * s, cy);
  await touch(page, "pointerdown", 2, cx + 50 * s, cy);
  await touch(page, "pointermove", 1, cx - 100 * s, cy);
  await touch(page, "pointermove", 2, cx + 100 * s, cy);
  await touch(page, "pointerup", 1, cx - 100 * s, cy);
  await touch(page, "pointerup", 2, cx + 100 * s, cy);
  await expect.poll(() => viewport(page)).toEqual(near(vp(-5, 5, -3.75, 3.75)));
});

test("KB-8 the graph is one tab stop and its keys pan, zoom and reset while its name follows", async ({
  page,
  isMobile,
}) => {
  await openGraph(page, isMobile, { rows: ROWS, plots: 2 });
  await page.evaluate(() => {
    const keys = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown", "+", "=", "-", "Home"];
    const record: boolean[] = [];
    (globalThis as { __graphKeys?: boolean[] }).__graphKeys = record;
    // Bubble phase: in the capture phase defaultPrevented is always still false.
    document.addEventListener("keydown", (e) => {
      if (keys.includes(e.key)) record.push(e.defaultPrevented);
    });
  });
  await graph(page).focus();
  const steps: [string, "press" | "type", string][] = [
    ["ArrowRight", "press", "x=-8 to 12, y=-7.5 to 7.5"],
    ["ArrowUp", "press", "x=-8 to 12, y=-6 to 9"],
    ["ArrowLeft", "press", "x=-10 to 10, y=-6 to 9"],
    ["ArrowDown", "press", "x=-10 to 10, y=-7.5 to 7.5"],
    ["+", "type", "x=-8 to 8, y=-6 to 6"],
    ["=", "type", "x=-6.4 to 6.4, y=-4.8 to 4.8"],
    ["-", "type", "x=-8 to 8, y=-6 to 6"],
    ["Home", "press", "x=-10 to 10, y=-7.5 to 7.5"],
  ];
  for (const [key, how, bounds] of steps) {
    if (how === "press") await page.keyboard.press(key);
    else await page.keyboard.type(key);
    await expect(graph(page)).toHaveAttribute("aria-label", `Graph from ${bounds}, 2 plots`, {
      timeout: 500,
    });
  }
  const recorded = await page.evaluate(
    () => (globalThis as { __graphKeys?: boolean[] }).__graphKeys
  );
  expect(recorded).toEqual([true, true, true, true, true, true, true, true]);

  await page.keyboard.press("Control+Equal");
  expect(await viewport(page)).toEqual(near(DEFAULT));

  const surfaceFocused = () =>
    page.evaluate(() => {
      const shadow = document.getElementById("root")!.shadowRoot!;
      return shadow.activeElement?.getAttribute("role") === "img";
    });
  await page.keyboard.press("Tab");
  expect(await surfaceFocused()).toBe(false);
  await page.keyboard.press("Shift+Tab");
  expect(await surfaceFocused()).toBe(true);
  await expect(page.locator("[data-graph-panel] [tabindex]:not(button)")).toHaveCount(1);
});

type Sample = { t: number; opacity: string | null };

/** Records the Home button's computed opacity on every animation frame for 800 ms. */
async function startSampler(page: Page): Promise<void> {
  await page.evaluate(() => {
    const samples: { t: number; opacity: string | null }[] = [];
    const g = globalThis as { __homeSamples?: Promise<typeof samples> };
    g.__homeSamples = new Promise((resolve) => {
      const start = performance.now();
      const tick = (): void => {
        const t = performance.now();
        const home = document
          .getElementById("root")!
          .shadowRoot!.querySelector("[data-graph-home]");
        samples.push({ t, opacity: home === null ? null : getComputedStyle(home).opacity });
        if (t - start < 800) requestAnimationFrame(tick);
        else resolve(samples);
      };
      requestAnimationFrame(tick);
    });
  });
}

const samples = (page: Page): Promise<Sample[]> =>
  page.evaluate(() => (globalThis as { __homeSamples?: Promise<Sample[]> }).__homeSamples!);

const between = (list: Sample[]) =>
  list.filter((x) => x.opacity !== null && Number(x.opacity) > 0 && Number(x.opacity) < 1);

test("AN-8 the Home button fades in over 250 ms and out over 250 ms", async ({
  page,
  isMobile,
}) => {
  await openGraph(page, isMobile);
  await startSampler(page);
  await graph(page).focus();
  await page.keyboard.press("ArrowRight");

  await expect(button(page, "Home")).toHaveCount(1);
  const transition = await page.evaluate(() => {
    const home = document.getElementById("root")!.shadowRoot!.querySelector("[data-graph-home]")!;
    const style = getComputedStyle(home);
    const properties = style.transitionProperty.split(",").map((p) => p.trim());
    const durations = style.transitionDuration.split(",").map((d) => d.trim());
    const timings = style.transitionTimingFunction.match(/cubic-bezier\([^)]*\)|[a-z-]+/g) ?? [];
    const i = properties.indexOf("opacity");
    return { index: i, duration: durations[i], timing: timings[i] };
  });
  expect(transition.index).toBeGreaterThanOrEqual(0);
  expect(transition.duration).toBe("0.25s");
  expect(transition.timing).toBe("ease-out");

  const fadeIn = await samples(page);
  const firstPresent = fadeIn.find((x) => x.opacity !== null)!;
  expect(firstPresent).toBeDefined();
  expect(Number(firstPresent.opacity)).toBeLessThan(1);
  expect(between(fadeIn).length).toBeGreaterThan(0);
  const opaque = fadeIn.find((x) => x.opacity === "1");
  expect(opaque).toBeDefined();
  expect(opaque!.t - firstPresent.t).toBeLessThanOrEqual(400);

  await startSampler(page);
  await page.keyboard.press("Home");
  const fadeOut = await samples(page);
  expect(between(fadeOut).length).toBeGreaterThan(0);
  const gone = fadeOut.find((x) => x.opacity === null);
  expect(gone).toBeDefined();
  expect(gone!.t - fadeOut[0].t).toBeLessThanOrEqual(400);
  await expect(button(page, "Home")).toHaveCount(0);
});

test("A11Y-1 the graph's name gives the bounds and plot count and follows pan, zoom, Home and row changes within 500 ms", async ({
  page,
  isMobile,
}) => {
  const { w } = await openGraph(page, isMobile, { rows: ROWS, plots: 2 });
  const s = w / 800;
  const within = { timeout: 500 };
  await expect(page.getByRole("img")).toHaveCount(1);
  await expect(graph(page)).toHaveAttribute("aria-label", DEFAULT_NAME);

  await button(page, "Zoom in").click();
  await expect(graph(page)).toHaveAttribute(
    "aria-label",
    "Graph from x=-5 to 5, y=-3.75 to 3.75, 2 plots",
    within
  );
  await button(page, "Home").click();
  await drag(page, isMobile, 80 * s, -60 * s);
  await expect(graph(page)).toHaveAttribute(
    "aria-label",
    "Graph from x=-12 to 8, y=-9 to 6, 2 plots",
    within
  );
  await button(page, "Home").click();
  await expect(graph(page)).toHaveAttribute("aria-label", DEFAULT_NAME, within);

  const set = (id: string, latex: string) =>
    page.evaluate(
      ([i, l]) => globalThis.__calculatorHarness!.engine.setExpression({ id: i, latex: l }),
      [id, latex] as const
    );
  await set("3", "x=3");
  await expect(graph(page)).toHaveAttribute("aria-label", /, 3 plots$/, within);
  await set("4", "(2,3)");
  await expect(graph(page)).toHaveAttribute("aria-label", /, 4 plots$/, within);
  await set("5", "f(x)=x^{2}");
  await expect(graph(page)).toHaveAttribute("aria-label", /, 5 plots$/, within);
  await set("6", "2+3");
  await expect(graph(page)).toHaveAttribute("aria-label", /, 5 plots$/, within);
  await page.evaluate(() => globalThis.__calculatorHarness!.engine.setRowHidden("1", true));
  await expect(graph(page)).toHaveAttribute("aria-label", /, 4 plots$/, within);
});

// G-1, G-7, G-17 and F-A1 fill contributions: canvas pixels in all 12 skins.

/** The RGB distance between two `#rrggbb` colours. */
const rgbDistance = (a: string, b: string) => {
  const ch = (hex: string) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  const [p, q] = [ch(a), ch(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

/** Columns 8 to w − 8 of `inkRow` at y = 1, in the row's c1. */
async function boundaryRow(page: Page, w: number, h: number, c1: string): Promise<boolean[]> {
  return (await inkRow(page, px(0, 1, w, h)[1], c1, 48)).slice(8, w - 8);
}

test("G-1 strict inequality boundary is dashed and non-strict solid on canvas", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(180_000);
  for (const skin of SKIN_IDS) {
    const c1 = resolveRowColor("c1", skin).hex;
    const { w, h } = await openGraph(page, isMobile, { rows: ["y<1"], skin, plots: 1 });
    const dashed = await boundaryRow(page, w, h, c1);
    const share = dashed.filter(Boolean).length / dashed.length;
    const edges = dashed.filter((ink, i) => i > 0 && ink !== dashed[i - 1]).length;
    expect(share, skin).toBeGreaterThanOrEqual(0.45);
    expect(share, skin).toBeLessThanOrEqual(0.85);
    expect(edges, skin).toBeGreaterThanOrEqual(w / 40);

    await openGraph(page, isMobile, { rows: ["y\\le1"], skin, plots: 1 });
    const solid = await boundaryRow(page, w, h, c1);
    expect(solid.filter(Boolean).length / solid.length, skin).toBeGreaterThanOrEqual(0.97);
  }
});

test("G-7 a point paints within 0.5 px", async ({ page, isMobile }) => {
  test.setTimeout(180_000);
  for (const skin of SKIN_IDS) {
    const c1 = resolveRowColor("c1", skin).hex;
    const { w, h } = await openGraph(page, isMobile, { rows: ["(2,3)"], skin, plots: 1 });
    const at = px(2, 3, w, h);
    const centroid = await inkCentroid(page, at, 8, c1, 60);
    expect(centroid, skin).not.toBeNull();
    expect(Math.hypot(centroid![0] - at[0], centroid![1] - at[1]), skin).toBeLessThanOrEqual(0.5);

    await openGraph(page, isMobile, { rows: ["(2,\\sqrt{-1})"], skin, plots: 0 });
    expect((await layerColors(page, "points")).opaque, skin).toEqual([]);
  }
});

test("G-17 overlap of two regions has higher contrast than either and the curve paints over the shading", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(180_000);
  for (const skin of SKIN_IDS) {
    const rows = ["y>0", "x>0", "y=x"];
    const { w, h } = await openGraph(page, isMobile, { rows, skin, plots: 3 });
    const at = (x: number, y: number) => pixel(page, "composite", ...px(x, y, w, h));
    const a = await at(-5.75, 2.25);
    const b = await at(5.75, -2.25);
    const ab = await at(5.75, 2.25);
    const paper = await at(-5.75, -2.25);
    const cr = (p: string) => contrastRatio(p, paper);
    expect(cr(ab), skin).toBeGreaterThan(cr(a));
    expect(cr(ab), skin).toBeGreaterThan(cr(b));

    // F-A1: the harness adds rows with no colour, so row 3 takes the new-row green, not slot c3.
    const third = resolveRowColor(nextSlot(2), skin).hex;
    const [cx, cy] = px(3.25, 3.25, w, h);
    const around: string[] = [];
    for (const dy of [-1, 0, 1]) {
      for (const dx of [-1, 0, 1]) around.push(await pixel(page, "composite", cx + dx, cy + dy));
    }
    const nearest = Math.min(...around.map((p) => rgbDistance(p, third)));
    expect(nearest, skin).toBeLessThanOrEqual(8);
  }
});

test("F-A1 combined canvas shading is the uncapped stack of 40% fills in all 12 skins", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(180_000);
  for (const skin of SKIN_IDS) {
    const rows = ["y>0", "x>0", "y>x", "y>-x"];
    await openGraph(page, isMobile, { rows, skin, plots: 4 });
    const paper = SKIN_COLORS[skin].normal.roles.paper;
    // The colours the rows actually take: F-A1's new-row cycle, whose third step is #388c46.
    const fills = [0, 1, 2, 3].map((index) => {
      const { hex, fillAlpha } = resolveRowColor(nextSlot(index), skin);
      return { color: hex, alpha: fillAlpha };
    });
    const allowed = new Set<string>();
    for (let mask = 1; mask < 16; mask++) {
      allowed.add(
        compositeShading(
          paper,
          fills.filter((_, i) => (mask >> i) & 1)
        )
      );
    }
    const { opaque, partial } = await layerColors(page, "shading");
    expect(partial, skin).toBe(0);
    for (const colour of opaque) {
      expect(allowed.has(colour), `${skin} ${colour}`).toBe(true);
    }
    expect(opaque, skin).toContain(compositeShading(paper, fills));
  }
});
