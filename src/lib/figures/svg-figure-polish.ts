// ============================================================
// svg-figure-polish — display-only fixes applied by the quiz sanitizer
// (inline-svg.ts) to a reviewed, hand-drawn figure SVG after it is parsed.
// The stored bytes never change (svg-figure-check.ts refuses rewrites);
// only the copy painted on screen does. Founder review, 2026-10-22:
//   · gridlines sit behind bars: grid lines move to the back, and a
//     see-through bar gets an opaque backing so no line shows through it
//   · a degree sign drawn as its own <text> joins the label beside it, so
//     it can never drift onto a line or a letter
//   · single-letter angle and line labels (italic variables) print a
//     little smaller, keeping their centre
//   · the drawing always keeps its proportions (never stretched)
// Pure DOM work without layout, so it runs in vitest's jsdom.
// ============================================================

const GRID_PAINTS = new Set(["#3b3426", "var(--figure-grid)", "var(--figure-cf-grid)"]);
const BACKDROP = "var(--figure-background, #070605)";
/** How much smaller single-letter variable labels print. */
export const LABEL_SCALE = 0.88;

function paintOf(element: Element, name: "fill" | "stroke"): string {
  return (element.getAttribute(name) ?? "").toLowerCase().replace(/,\s*#[\da-f]+\)$/, ")");
}

function isGridLine(element: Element): boolean {
  if (!["line", "polyline", "path"].includes(element.localName)) return false;
  if (element.getAttribute("data-figure-role") === "grid") return true;
  const stroke = paintOf(element, "stroke");
  return GRID_PAINTS.has(stroke) || stroke.startsWith("var(--figure-grid") || stroke === "#3b3426";
}

/** Draw every grid line before anything else in its group (after a full-size backdrop rect). */
function gridToBack(root: Element) {
  for (const group of [root, ...root.querySelectorAll("g")]) {
    const children = [...group.children];
    const grid = children.filter(isGridLine);
    if (!grid.length) continue;
    // Keep leading non-drawing elements and plain backdrop rects (no stroke) first.
    const anchor = children.find(
      (child) =>
        !["title", "desc", "metadata"].includes(child.localName) &&
        !isGridLine(child) &&
        !(child.localName === "rect" && !child.getAttribute("stroke") && isBackdropRect(child))
    );
    for (const line of grid) group.insertBefore(line, anchor ?? null);
  }
}

function isBackdropRect(rect: Element): boolean {
  const svg = rect.closest("svg");
  const box = (svg?.getAttribute("viewBox") ?? "").trim().split(/[ ,]+/).map(Number);
  const width = Number(rect.getAttribute("width"));
  const height = Number(rect.getAttribute("height"));
  return box.length === 4 && width >= box[2] * 0.95 && height >= box[3] * 0.95;
}

function translucent(element: Element): boolean {
  const fill = element.getAttribute("fill");
  if (!fill || fill === "none") return false;
  for (const name of ["fill-opacity", "opacity"]) {
    const value = Number(element.getAttribute(name) ?? "1");
    if (Number.isFinite(value) && value < 1) return true;
  }
  return false;
}

/** An opaque backing under every see-through filled bar, so lines behind it stay hidden. */
function backBars(root: Element) {
  for (const shape of root.querySelectorAll("rect, polygon, path")) {
    if (!translucent(shape) || (shape.localName === "rect" && isBackdropRect(shape))) continue;
    const backing = shape.cloneNode(false) as Element;
    for (const name of ["fill-opacity", "opacity", "stroke", "stroke-width", "stroke-opacity"])
      backing.removeAttribute(name);
    backing.setAttribute("fill", BACKDROP);
    backing.setAttribute("data-figure-backing", "");
    shape.parentNode?.insertBefore(backing, shape);
  }
}

const DEGREE = /^\s*°\s*$/;

function textNumber(element: Element, name: string, fallback = 0): number {
  const value = Number(element.getAttribute(name));
  return Number.isFinite(value) ? value : fallback;
}

/** A lone "°" <text> beside a label becomes part of that label ("v" + "°" -> "v°"). */
function joinDegreeSigns(root: Element) {
  const texts = [...root.querySelectorAll("text")];
  for (const degree of texts) {
    if (!DEGREE.test(degree.textContent ?? "") || degree.children.length) continue;
    const dx = textNumber(degree, "x");
    const dy = textNumber(degree, "y");
    let best: Element | null = null;
    let bestDistance = Infinity;
    for (const label of texts) {
      if (label === degree || DEGREE.test(label.textContent ?? "") || !label.isConnected) continue;
      const size = textNumber(label, "font-size", 16);
      const distance = Math.hypot(textNumber(label, "x") - dx, textNumber(label, "y") - dy);
      if (distance <= size * 1.2 && distance < bestDistance && textNumber(label, "x") < dx) {
        best = label;
        bestDistance = distance;
      }
    }
    if (!best) continue;
    const size = textNumber(best, "font-size", 16);
    const sign = best.ownerDocument.createElementNS(best.namespaceURI, "tspan");
    sign.setAttribute("font-style", "normal");
    sign.textContent = "°";
    best.appendChild(sign);
    // A centred label grows by the sign's width; shift it so the letter stays put.
    if ((best.getAttribute("text-anchor") ?? "start") === "middle")
      best.setAttribute("x", String(textNumber(best, "x") + size * 0.2));
    else if (best.getAttribute("text-anchor") === "end")
      best.setAttribute("x", String(textNumber(best, "x") + size * 0.4));
    degree.remove();
  }
}

/** Italic single-letter labels (with an optional degree sign) print slightly smaller. */
function shrinkLetterLabels(root: Element) {
  for (const text of root.querySelectorAll("text")) {
    if (text.getAttribute("font-style") !== "italic") continue;
    if (!/^\s*[A-Za-z][′']?°?\s*$/.test(text.textContent ?? "")) continue;
    const size = Number(text.getAttribute("font-size"));
    if (Number.isFinite(size) && size > 0)
      text.setAttribute("font-size", String(Math.round(size * LABEL_SCALE * 100) / 100));
  }
}

/** Applies every display fix to a parsed, reviewed figure SVG root, in place. */
export function polishFigureSvg(root: Element) {
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");
  gridToBack(root);
  backBars(root);
  joinDegreeSigns(root);
  shrinkLetterLabels(root);
}

/**
 * Grows a rendered figure's viewBox to take in everything drawn, so a label that runs
 * past the authored box (e.g. an axis title on the bottom edge) is never cut off.
 * Needs layout (getBBox), so it runs in the browser after the SVG is on the page.
 * Idempotent: always measured against the authored viewBox. Never shrinks the box.
 */
export function fitViewBoxToContent(svg: SVGSVGElement, margin = 4) {
  const authored = svg.dataset.authoredViewBox ?? svg.getAttribute("viewBox") ?? "";
  const box = authored.trim().split(/[ ,]+/).map(Number);
  if (box.length !== 4 || !box.every(Number.isFinite) || typeof svg.getBBox !== "function") return;
  svg.dataset.authoredViewBox = authored;
  let drawn: DOMRect;
  try {
    drawn = svg.getBBox();
  } catch {
    return;
  }
  if (!drawn.width && !drawn.height) return;
  const [x, y, w, h] = box;
  const left = Math.min(x, drawn.x - margin);
  const top = Math.min(y, drawn.y - margin);
  const right = Math.max(x + w, drawn.x + drawn.width + margin);
  const bottom = Math.max(y + h, drawn.y + drawn.height + margin);
  // Only grow when something actually spills past the authored box.
  const spills =
    drawn.x < x || drawn.y < y || drawn.x + drawn.width > x + w || drawn.y + drawn.height > y + h;
  const next = spills
    ? [left, top, right - left, bottom - top].map((n) => Math.round(n * 100) / 100).join(" ")
    : authored;
  if (svg.getAttribute("viewBox") !== next) svg.setAttribute("viewBox", next);
}
