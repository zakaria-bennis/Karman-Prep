// Functions the calculator v2 shell specs run inside the harness page (10 R5), through
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
