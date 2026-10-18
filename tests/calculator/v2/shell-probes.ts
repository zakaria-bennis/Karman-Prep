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
