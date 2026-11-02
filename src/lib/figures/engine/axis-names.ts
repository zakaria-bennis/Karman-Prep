/**
 * Text around the axes that is not a tick number: category names under their
 * bands, and the axis letters and titles (plane-axes.ts places the numbers).
 */
import { HOUSE } from "./house";
import { textWidth } from "./labels";
import type { Mapper } from "./plane-axes";
import type { SceneItem } from "./scene";
import type { PlaneFrame } from "./spec";

type TextItem = Extract<SceneItem, { t: "text" }>;

/** Line height for wrapped text. */
export const LINE_HEIGHT = Math.round(HOUSE.font * 1.2);

/** Words of `text` packed into lines no wider than `maxWidth`; a long word keeps its own line. */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && textWidth(`${last} ${word}`) <= maxWidth) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else lines.push(word);
  }
  return lines;
}

/**
 * wrapText into as few lines as `maxWidth` allows, with the lines as even as they
 * can be ("Concentration of bacteria / (millions of cells per mL)", not a lone "mL)").
 */
export function balancedWrap(text: string, maxWidth: number): string[] {
  const lines = wrapText(text, maxWidth);
  if (lines.length < 2) return lines;
  const total = textWidth(text);
  for (let w = total / lines.length; w < maxWidth; w += 2) {
    const even = wrapText(text, w);
    if (even.length === lines.length) return even;
  }
  return lines;
}

/** A short axis name (x, y, t, f(x)) sits at the axis end; a longer one is a title beside the plot. */
const isShortName = (name: string) => name.length <= 4 && !/\s/.test(name);
/** A single-letter name is a variable and prints in italic. */
const isVariable = (name: string) => /^[A-Za-z]$/.test(name);

/** Category names under their bands: wrapped, or turned 45° when one does not fit. */
export function categoryLabels(frame: PlaneFrame, m: Mapper, axisY: number): TextItem[] {
  const names = frame.categories ?? [];
  const off = HOUSE.labelOffset;
  const font = HOUSE.font;
  const band = m.w / Math.max(1, names.length);
  const tooWide = names.some((n) => n.split(/\s+/).some((word) => textWidth(word) > band - off));
  const turn = frame.rotateCategories ?? tooWide;
  const out: TextItem[] = [];
  names.forEach((name, i) => {
    const cx = m.px(i + 0.5);
    if (turn) {
      // The text's end sits just under its band, so it reads up to the right toward it.
      const text = name.trim().replace(/\s+/g, " ");
      if (!text) return;
      out.push({
        t: "text",
        x: cx + 0.35 * font,
        y: axisY + off + 0.7 * font,
        text,
        role: "ink",
        anchor: "end",
        rotate: -45,
      });
      return;
    }
    wrapText(name, band - off).forEach((line, k) => {
      out.push({
        t: "text",
        x: cx,
        y: axisY + off + font + k * LINE_HEIGHT,
        text: line,
        role: "ink",
        anchor: "middle",
      });
    });
  });
  return out;
}

/**
 * Axis letters and titles. A letter (a short name) sits at the positive end of
 * its axis, at the arrow's tip when the axis has one; a title goes under the x
 * tick labels or, for y, above the plot (a long yLabel) or turned upright left
 * of the y tick labels (yTitle).
 */
export function axisNames(
  frame: PlaneFrame,
  m: Mapper,
  at: {
    ax: number;
    ay: number;
    yAxis: boolean;
    below: number;
    yLabelWidth: number;
    run: number;
  }
): SceneItem[] {
  const { w, h, px, py } = m;
  const off = HOUSE.labelOffset;
  const font = HOUSE.font;
  const items: SceneItem[] = [];
  // With a title, the letter is only the one the spec names; else the name may be either.
  const xTitle = frame.xTitle?.trim() ?? "";
  const yTitle = at.yAxis ? (frame.yTitle?.trim() ?? "") : "";
  // Category bands (a bar chart) have no x variable to name.
  const xName = xTitle
    ? (frame.xLabel ?? "").trim()
    : (frame.xLabel ?? (frame.categories ? "" : "x")).trim();
  const yName = !at.yAxis
    ? ""
    : yTitle
      ? (frame.yLabel ?? "").trim()
      : (frame.yLabel ?? "y").trim();
  const xLetter = xName && (xTitle || isShortName(xName)) ? xName : "";
  const yLetter = yName && (yTitle || isShortName(yName)) ? yName : "";
  if (xLetter) {
    const item: TextItem = at.run
      ? {
          t: "text",
          x: px(frame.x[1]) + at.run + off / 2,
          y: py(at.ax) + font / 3,
          text: xLetter,
          role: "ink",
          anchor: "start",
        }
      : {
          t: "text",
          x: px(frame.x[1]) - off,
          y: py(at.ax) - off,
          text: xLetter,
          role: "ink",
          anchor: "end",
        };
    if (isVariable(xLetter)) item.italic = true;
    items.push(item);
  }
  const xLong = xTitle || (xLetter ? "" : xName);
  if (xLong) {
    const mid = (px(frame.x[0]) + px(frame.x[1])) / 2;
    wrapText(xLong, w).forEach((line, k) => {
      items.push({
        t: "text",
        x: mid,
        y: at.below + font + off + k * LINE_HEIGHT,
        text: line,
        role: "ink",
        anchor: "middle",
      });
    });
  }
  if (yLetter) {
    const item: TextItem = at.run
      ? {
          t: "text",
          x: px(at.ay),
          y: py(frame.y[1]) - at.run - off / 2,
          text: yLetter,
          role: "ink",
          anchor: "middle",
        }
      : {
          t: "text",
          x: px(at.ay) + off,
          y: py(frame.y[1]) + font,
          text: yLetter,
          role: "ink",
          anchor: "start",
        };
    if (isVariable(yLetter)) item.italic = true;
    items.push(item);
  }
  if (yTitle) {
    // Turned to read upward, centered on the plot, its last line nearest the tick labels.
    const lines = balancedWrap(yTitle, h);
    const right = px(at.ay) - at.yLabelWidth - off - 0.25 * font;
    lines.forEach((line, k) => {
      items.push({
        t: "text",
        x: right - (lines.length - 1 - k) * LINE_HEIGHT,
        y: (py(frame.y[0]) + py(frame.y[1])) / 2,
        text: line,
        role: "ink",
        anchor: "middle",
        rotate: -90,
      });
    });
  } else if (yName && !yLetter) {
    // Above the plot, left-aligned with the y tick labels.
    const left = px(at.ay) - at.yLabelWidth;
    const lines = wrapText(yName, px(frame.x[1]) - left);
    const top = py(frame.y[1]) - font - off - (lines.length - 1) * LINE_HEIGHT;
    lines.forEach((line, k) => {
      items.push({
        t: "text",
        x: left,
        y: top + k * LINE_HEIGHT,
        text: line,
        role: "ink",
        anchor: "start",
      });
    });
  }
  return items;
}
