// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { addHighlight, rangesFromSelection } from "./ranges";
import type { Highlight } from "../workspace";

const hl = (
  id: number,
  start: number,
  end: number,
  color: 1 | 2 | 3 = 1,
  note?: string
): Highlight => ({
  id,
  range: { blockId: "p", start, end },
  color,
  ...(note ? { note } : {}),
});

describe("addHighlight", () => {
  it("adds a separate highlight", () => {
    expect(addHighlight([hl(1, 0, 5)], hl(2, 10, 15))).toHaveLength(2);
  });
  it("a new highlight absorbs the ones it overlaps, keeping their notes", () => {
    const out = addHighlight([hl(1, 0, 8, 1, "first"), hl(2, 20, 30)], hl(3, 5, 12, 2));
    expect(out).toHaveLength(2);
    const merged = out.find((h) => h.id === 3)!;
    expect(merged.range).toEqual({ blockId: "p", start: 0, end: 12 });
    expect(merged.color).toBe(2);
    expect(merged.note).toBe("first");
  });
  it("ignores empty ranges", () => {
    expect(addHighlight([], hl(1, 4, 4))).toEqual([]);
  });
});

describe("rangesFromSelection", () => {
  it("splits a selection across two blocks into one range per block", () => {
    document.body.innerHTML =
      '<div id="pane"><p data-ink-block="a">Hello world</p><p data-ink-block="b">Second line</p></div>';
    const a = document.querySelector('[data-ink-block="a"]')!.firstChild!;
    const b = document.querySelector('[data-ink-block="b"]')!.firstChild!;
    const range = document.createRange();
    range.setStart(a, 6);
    range.setEnd(b, 6);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(rangesFromSelection(document.getElementById("pane")!, sel)).toEqual([
      { blockId: "a", start: 6, end: 11 },
      { blockId: "b", start: 0, end: 6 },
    ]);
  });
  it("returns nothing for a collapsed selection or one outside the pane", () => {
    document.body.innerHTML =
      '<div id="pane"><p data-ink-block="a">Hello</p></div><p id="out">x</p>';
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    const r = document.createRange();
    r.selectNodeContents(document.getElementById("out")!);
    sel.addRange(r);
    expect(rangesFromSelection(document.getElementById("pane")!, sel)).toEqual([]);
  });
});
