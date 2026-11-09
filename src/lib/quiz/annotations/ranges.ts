import type { AnnotationRange, Highlight } from "../workspace";

/** Text offset of (node, offset) inside `block`, counting rendered text only. */
function textOffset(block: Element, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(block);
  r.setEnd(node, offset);
  return r.toString().length;
}

/** One range per text block the selection touches; nothing when collapsed or outside the pane. */
export function rangesFromSelection(pane: HTMLElement, sel: Selection | null): AnnotationRange[] {
  if (!sel || !sel.rangeCount || sel.isCollapsed) return [];
  const range = sel.getRangeAt(0);
  if (!pane.contains(range.commonAncestorContainer)) return [];
  const out: AnnotationRange[] = [];
  pane.querySelectorAll("[data-ink-block]").forEach((block) => {
    if (!range.intersectsNode(block)) return;
    const total = block.textContent?.length ?? 0;
    const start = block.contains(range.startContainer)
      ? textOffset(block, range.startContainer, range.startOffset)
      : 0;
    const end = block.contains(range.endContainer)
      ? textOffset(block, range.endContainer, range.endOffset)
      : total;
    if (end > start) out.push({ blockId: block.getAttribute("data-ink-block")!, start, end });
  });
  return out;
}

/** Adds a highlight; it absorbs any highlight it overlaps in the same block (keeping a note). */
export function addHighlight(list: Highlight[], next: Highlight): Highlight[] {
  if (next.range.end <= next.range.start) return list;
  const overlapping = list.filter(
    (h) =>
      h.range.blockId === next.range.blockId &&
      h.range.start < next.range.end &&
      next.range.start < h.range.end
  );
  const merged: Highlight = {
    ...next,
    range: {
      blockId: next.range.blockId,
      start: Math.min(next.range.start, ...overlapping.map((h) => h.range.start)),
      end: Math.max(next.range.end, ...overlapping.map((h) => h.range.end)),
    },
  };
  const note = next.note ?? overlapping.find((h) => h.note)?.note;
  if (note) merged.note = note;
  return [...list.filter((h) => !overlapping.includes(h)), merged];
}

/** A DOM Range for a stored highlight, or null if the text has changed. */
export function domRange(pane: HTMLElement, r: AnnotationRange): Range | null {
  const block = pane.querySelector(`[data-ink-block="${CSS.escape(r.blockId)}"]`);
  if (!block) return null;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = node.textContent?.length ?? 0;
    if (!started && r.start < offset + len) {
      range.setStart(node, r.start - offset);
      started = true;
    }
    if (started && r.end <= offset + len) {
      range.setEnd(node, r.end - offset);
      return range;
    }
    offset += len;
  }
  return null;
}
