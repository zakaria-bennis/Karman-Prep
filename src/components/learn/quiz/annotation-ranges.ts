/** Offsets refer to rendered text only. Source text, MathText and question payloads stay intact. */
export interface TextRange {
  start: number;
  end: number;
  quote: string;
}

export function selectionRange(root: HTMLElement, selection: Selection | null): TextRange | null {
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const quote = range.toString();
  return quote.trim() ? { start, end: start + quote.length, quote } : null;
}

export function restoreRange(root: HTMLElement, mark: TextRange): Range | null {
  if (root.textContent?.slice(mark.start, mark.end) !== mark.quote) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (!started && mark.start < offset + length) {
      range.setStart(node, mark.start - offset);
      started = true;
    }
    if (started && mark.end <= offset + length) {
      range.setEnd(node, mark.end - offset);
      return range;
    }
    offset += length;
  }
  return null;
}
