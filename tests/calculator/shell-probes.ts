// Functions the calculator shell specs run inside the harness page (10 R5), through
// page.evaluate, locator.evaluate or addInitScript. Each is self-contained: it closes over nothing
// from this module, because Playwright serializes it into the page.

export interface L14Measure {
  pageOverflow: number; // scrollWidth − innerWidth, at least 0
  wide: string[]; // shadow elements that scroll sideways or pass the host's right edge
  row: { top: number; bottom: number }; // row 15
  toolbarBottom: number; // the Add item button's bottom
  keypadTop: number; // the Keypad region's top
}

/** L-14: page and shadow overflow, and where row 15 sits between the toolbar and the keypad. */
export function measureL14(): L14Measure {
  const host = document.querySelector("#calc")!;
  const root = host.shadowRoot!;
  const hostRight = host.getBoundingClientRect().right;
  const describe = (el: Element) =>
    `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).join(".")}` : ""}`;
  const wide: string[] = [];
  for (const el of root.querySelectorAll("*")) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const scrolls =
      (style.overflowX === "auto" || style.overflowX === "scroll") &&
      el.scrollWidth > el.clientWidth + 1;
    if (scrolls) wide.push(`${describe(el)} scrolls ${el.scrollWidth}>${el.clientWidth}`);
    else if (rect.right > hostRight + 0.5)
      wide.push(`${describe(el)} right ${Math.round(rect.right)}>${Math.round(hostRight)}`);
  }
  const row = root.querySelector('[data-row-id="15"]')!.getBoundingClientRect();
  const add = [...root.querySelectorAll("button")].find((b) =>
    /^add item/i.test(b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "")
  )!;
  const keypad = root.querySelector('[role="region"][aria-label="Keypad"]')!;
  return {
    pageOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    wide,
    row: { top: row.top, bottom: row.bottom },
    toolbarBottom: add.getBoundingClientRect().bottom,
    keypadTop: keypad.getBoundingClientRect().top,
  };
}

/** L-14: whether an open settings popover overlaps row 1. */
export function popoverCoversRow1(): boolean {
  const root = document.querySelector("#calc")!.shadowRoot!;
  const popover = root.querySelector('.kc-settings[role="dialog"]');
  const row = root.querySelector('[data-row-id="1"]');
  if (!popover || !row) return false;
  const a = popover.getBoundingClientRect();
  const b = row.getBoundingClientRect();
  if (a.width === 0 || a.height === 0) return false;
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** TH-17 init script: records the canvas font of every fillText in globalThis.__fonts. */
export function recordCanvasFonts(): void {
  const store = globalThis as unknown as { __fonts: string[] };
  store.__fonts = [];
  const fillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (
    this: CanvasRenderingContext2D,
    ...args: Parameters<CanvasRenderingContext2D["fillText"]>
  ) {
    store.__fonts.push(this.font);
    return fillText.apply(this, args);
  };
}

/** AR-40: a KaTeX_Math face exists in document.fonts and has loaded (check() is true with none). */
export function katexMathLoaded(): boolean {
  for (const face of document.fonts) {
    if (face.family.replace(/^["']|["']$/g, "") === "KaTeX_Math" && face.status === "loaded") {
      return true;
    }
  }
  return false;
}

/** AR-40: whether any stylesheet of the shadow root holds an @font-face rule. */
export function shadowHasFontFace(): boolean {
  const root = document.querySelector("#calc")!.shadowRoot!;
  const sheets = [...root.adoptedStyleSheets, ...root.styleSheets];
  const hasFace = (rules: CSSRuleList): boolean =>
    [...rules].some(
      (rule) =>
        rule instanceof CSSFontFaceRule ||
        ("cssRules" in rule && hasFace((rule as CSSGroupingRule).cssRules))
    );
  return sheets.some((sheet) => hasFace(sheet.cssRules));
}

export interface Motion {
  durations: string[]; // computed transition durations, plus animation durations when one runs
  easing: string[]; // computed transition and animation timing functions
}

/** AN-14, AN-13, AR-38: the computed motion of every shadow element and its ::before and ::after. */
export function readMotion(): Motion[] {
  const root = document.querySelector("#calc")!.shadowRoot!;
  const split = (list: string) => list.split(/,(?![^(]*\))/).map((part) => part.trim());
  const out: Motion[] = [];
  for (const el of root.querySelectorAll("*")) {
    for (const pseudo of [null, "::before", "::after"]) {
      const style = getComputedStyle(el, pseudo);
      const durations = split(style.transitionDuration);
      const easing = split(style.transitionTimingFunction);
      if (style.animationName !== "none") {
        durations.push(...split(style.animationDuration));
        easing.push(...split(style.animationTimingFunction));
      }
      out.push({ durations, easing });
    }
  }
  return out;
}

/** AN-13: over the next 10 animation frames, how many show AN-8's Home control leaving. */
export async function countLeavingFrames(): Promise<number> {
  const host = document.querySelector("#calc")!;
  let count = 0;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    if (host.shadowRoot!.querySelector('[data-graph-home][data-phase="leaving"]')) count++;
  }
  return count;
}

/**
 * TH-15 init script: records in globalThis.__strokes the strokeStyle of every canvas stroke() and,
 * because 08's renderer draws the axes and grid lines as filled rectangles (draw-grid.ts), the
 * fillStyle of every fill() and fillRect().
 */
export function recordStrokes(): void {
  const store = globalThis as unknown as { __strokes: string[] };
  store.__strokes = [];
  const proto = CanvasRenderingContext2D.prototype as unknown as Record<
    string,
    (...args: unknown[]) => unknown
  >;
  for (const [method, style] of [
    ["stroke", "strokeStyle"],
    ["fill", "fillStyle"],
    ["fillRect", "fillStyle"],
  ] as const) {
    const original = proto[method];
    proto[method] = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
      store.__strokes.push(String(this[style]));
      return original.apply(this, args);
    };
  }
}

/** TH-15: the strokes recorded so far. */
export function readStrokes(): string[] {
  return [...((globalThis as unknown as { __strokes?: string[] }).__strokes ?? [])];
}

/**
 * TH-15: sets html[data-theme], waits one animation frame and a task, and returns the strokes
 * painted since the change and --kc-paper on #calc.
 */
export async function setThemeAndWait(
  theme: string
): Promise<{ strokes: string[]; paper: string }> {
  const store = globalThis as unknown as { __strokes?: string[] };
  const start = store.__strokes?.length ?? 0;
  document.documentElement.dataset.theme = theme;
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 0));
  const paper = getComputedStyle(document.querySelector("#calc")!).getPropertyValue("--kc-paper");
  return { strokes: (store.__strokes ?? []).slice(start), paper: paper.trim().toLowerCase() };
}

/** TH-15: marks [data-kc-layout] with a property that a remount would lose. */
export function markLayoutNode(): void {
  const node = document.querySelector("#calc")!.shadowRoot!.querySelector("[data-kc-layout]");
  (node as unknown as { kcMark?: number }).kcMark = 1;
}

/** TH-15: whether the marked [data-kc-layout] node is still the mounted one. */
export function layoutNodeMarked(): boolean {
  const node = document.querySelector("#calc")!.shadowRoot!.querySelector("[data-kc-layout]");
  return (node as unknown as { kcMark?: number } | null)?.kcMark === 1;
}

export interface Ring {
  name: string;
  style: string;
  width: string;
  offset: string;
  color: string;
  background: string; // the first opaque background behind the ring
  inset: boolean; // measured on the row (L-3, OI-31) for MathQuill's textarea
}

/** TH-14: the outline of the focused shadow element (a row for MathQuill's textarea), or null. */
export function readRing(): Ring | null {
  const host = document.querySelector("#calc")!;
  const active = host.shadowRoot!.activeElement;
  if (active === null) return null;
  const row = active.closest(".mq-textarea") ? active.closest("li[data-row-id]") : null;
  const el = row ?? active;
  const inset = row !== null;
  const opaque = (c: string) => {
    const m = /^rgba?\(([^)]*)\)$/.exec(c);
    if (m === null) return false;
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    return parts.length < 4 || Number(parts[3]) === 1;
  };
  const parent = (n: Element): Element | null => {
    if (n.parentElement) return n.parentElement;
    const root = n.getRootNode();
    return root instanceof ShadowRoot ? root.host : null;
  };
  let background = "rgb(255, 255, 255)";
  for (let n: Element | null = inset ? el : parent(el); n !== null; n = parent(n)) {
    const bg = getComputedStyle(n).backgroundColor;
    if (opaque(bg)) {
      background = bg;
      break;
    }
  }
  const style = getComputedStyle(el);
  return {
    name: `${active.getAttribute("aria-label") ?? active.textContent?.trim() ?? ""} <${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).join(".")}>`,
    style: style.outlineStyle,
    width: style.outlineWidth,
    offset: style.outlineOffset,
    color: style.outlineColor,
    background,
    inset,
  };
}

export interface TextPair {
  kind: "text" | "boundary";
  name: string;
  fg: string;
  alpha: number; // the colour's alpha times the opacity of the element and its ancestors
  bg: string;
}

/**
 * TH-1: every visible shadow element with its own text (not .kc-sr-only or MathQuill's textarea)
 * against its background, and every bordered input or .mq-editable-field's border against the
 * background behind it.
 */
export function readTextPairs(): TextPair[] {
  const root = document.querySelector("#calc")!.shadowRoot!;
  const parent = (n: Element): Element | null => {
    if (n.parentElement) return n.parentElement;
    const r = n.getRootNode();
    return r instanceof ShadowRoot ? r.host : null;
  };
  const alphaOf = (c: string) => {
    const m = /^rgba?\(([^)]*)\)$/.exec(c);
    if (m === null) return 1;
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    return parts.length < 4 ? 1 : Number(parts[3]);
  };
  const backgroundFrom = (start: Element | null) => {
    for (let n = start; n !== null; n = parent(n)) {
      const bg = getComputedStyle(n).backgroundColor;
      if (alphaOf(bg) === 1) return bg;
    }
    return "rgb(255, 255, 255)";
  };
  const opacity = (el: Element) => {
    let product = 1;
    for (let n: Element | null = el; n !== null; n = parent(n)) {
      product *= Number(getComputedStyle(n).opacity);
    }
    return product;
  };
  const describe = (el: Element) =>
    `${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).join(".")} "${(el.textContent ?? "").trim().slice(0, 24)}"`;
  const out: TextPair[] = [];
  for (const el of root.querySelectorAll("*")) {
    if (el.closest(".kc-sr-only, .mq-textarea")) continue;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (style.visibility === "hidden" || rect.width === 0 || rect.height === 0) continue;
    const own = [...el.childNodes].some(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").replace(/[\s​]/g, "") !== ""
    );
    const opacityProduct = opacity(el);
    if (opacityProduct === 0) continue;
    if (own) {
      out.push({
        kind: "text",
        name: describe(el),
        fg: style.color,
        alpha: alphaOf(style.color) * opacityProduct,
        bg: backgroundFrom(el),
      });
    }
    const bordered =
      (el.matches("input") || el.matches(".mq-editable-field")) &&
      style.borderTopStyle !== "none" &&
      parseFloat(style.borderTopWidth) > 0;
    if (bordered) {
      out.push({
        kind: "boundary",
        name: describe(el),
        fg: style.borderTopColor,
        alpha: alphaOf(style.borderTopColor) * opacityProduct,
        bg: backgroundFrom(parent(el)),
      });
    }
  }
  return out;
}

/** NM-29 init script: records the type of every message posted to a Worker in globalThis.__posted. */
export function postedLog(): void {
  const store = globalThis as unknown as { __posted: { type: unknown }[] };
  store.__posted = [];
  const postMessage = Worker.prototype.postMessage as (...args: unknown[]) => void;
  Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
    const message = args[0] as { type?: unknown } | null;
    store.__posted.push({ type: message?.type });
    return postMessage.apply(this, args);
  } as Worker["postMessage"];
}

export interface CurveStats {
  bands: number; // bands.length / 4 (G-12)
  maxAbsY: number; // over the finite polyline vertices
  maxY: number;
}

export interface SwitchTiming {
  sameTask: boolean; // a state message was posted before click() returned
  ms: number; // click to rows 1–17 equal to `expected` and rows 18–20 each replotted; Infinity if never
  stale: number[]; // indexes of value rows that showed their new value and later changed
  changes: number[]; // rows 18–20: how many times the geometry object changed
  curves: CurveStats[]; // rows 18–20: the first geometry after the click
}

/**
 * NM-29 (runs on the control `el`): waits for rows 18–20 to have geometry, clicks `el`, then for
 * 1 s records every engine snapshot's row 1–17 valueText and row 18–20 geometry object.
 */
export async function switchAndTime(el: Element, expected: string[]): Promise<SwitchTiming> {
  const engine = globalThis.__calculatorHarness!.engine;
  const valueIds = expected.map((_, i) => String(i + 1));
  const curveIds = ["18", "19", "20"];
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  const geometryOf = (id: string) => engine.getSnapshot().geometry.get(id);
  const waitStart = performance.now();
  while (curveIds.some((id) => geometryOf(id) === undefined)) {
    if (performance.now() - waitStart > 2000) break;
    await frame();
  }
  const before = curveIds.map(geometryOf);
  const last = [...before];
  const changes = curveIds.map(() => 0);
  const first: unknown[] = curveIds.map(() => undefined);
  const shown = valueIds.map(() => false);
  const stale = new Set<number>();
  let ms = Number.POSITIVE_INFINITY;
  let start = 0;
  const record = () => {
    const snapshot = engine.getSnapshot();
    const texts = valueIds.map((id) => snapshot.rows.find((r) => r.id === id)?.valueText ?? null);
    texts.forEach((text, i) => {
      if (text === expected[i]) shown[i] = true;
      else if (shown[i]) stale.add(i);
    });
    curveIds.forEach((id, i) => {
      const g = snapshot.geometry.get(id);
      if (g === last[i]) return;
      changes[i]++;
      last[i] = g;
      if (first[i] === undefined) first[i] = g;
    });
    const done =
      texts.every((text, i) => text === expected[i]) &&
      curveIds.every((id, i) => {
        const g = snapshot.geometry.get(id);
        return g !== undefined && g !== before[i];
      });
    if (done && ms === Number.POSITIVE_INFINITY) ms = performance.now() - start;
  };
  const unsubscribe = engine.subscribe(record);
  const store = globalThis as unknown as { __posted?: { type: unknown }[] };
  const postedBefore = store.__posted?.length ?? 0;
  start = performance.now();
  (el as HTMLElement).click();
  const sameTask = (store.__posted ?? []).slice(postedBefore).some((m) => m.type === "state");
  while (performance.now() - start < 1000) {
    await frame();
    record();
  }
  unsubscribe();
  const curves = first.map((g) => {
    const curve = g as { polylines?: Float64Array; bands?: Float64Array } | undefined;
    const ys: number[] = [];
    const p = curve?.polylines ?? new Float64Array();
    for (let i = 0; i + 1 < p.length; i += 2) {
      if (Number.isFinite(p[i]) && Number.isFinite(p[i + 1])) ys.push(p[i + 1]);
    }
    return {
      bands: (curve?.bands?.length ?? 0) / 4,
      maxAbsY: Math.max(...ys.map(Math.abs)),
      maxY: Math.max(...ys),
    };
  });
  return { sameTask, ms, stale: [...stale], changes, curves };
}
