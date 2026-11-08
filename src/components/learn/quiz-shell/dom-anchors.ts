import type { AnchorHit, AnchorLayout } from "@/lib/quiz/ink/anchor";

/** Blank space in a pane: `__pane:<pane name>`, so it resolves only in its own pane. */
export const paneBlock = (pane: HTMLElement) => `__pane:${pane.dataset.quizPane ?? ""}`;

function px(el: Element): number {
  return parseFloat(getComputedStyle(el).fontSize) || 16;
}

/** Character offset of (node, offset) inside a block, counting every text node in order. */
export function charOffsetIn(block: Element, node: Node, offset: number): number {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let total = 0;
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (t === node) return total + offset;
    total += t.textContent?.length ?? 0;
  }
  return total;
}

function locateChar(block: Element, offset: number): { node: Text; at: number } | null {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let total = 0;
  for (let t = walker.nextNode() as Text | null; t; t = walker.nextNode() as Text | null) {
    const len = t.textContent?.length ?? 0;
    if (offset < total + len) return { node: t, at: offset - total };
    total += len;
  }
  return null;
}

/** Live anchor positions in this pane's content coordinates (spec: Anchoring). */
export function createDomLayout(pane: HTMLElement): AnchorLayout {
  const origin = () => pane.getBoundingClientRect();
  const find = (selector: string) => pane.querySelector(selector);
  return {
    figure(id) {
      const svg = find(`[data-ink-figure="${CSS.escape(id)}"] svg`) as SVGSVGElement | null;
      const vb = svg?.viewBox?.baseVal;
      if (!svg || !vb || !vb.width || !vb.height) return null;
      const r = svg.getBoundingClientRect();
      const o = origin();
      const scaleX = r.width / vb.width;
      const scaleY = r.height / vb.height;
      return {
        left: r.left - o.left - vb.x * scaleX,
        top: r.top - o.top - vb.y * scaleY,
        scaleX,
        scaleY,
      };
    },
    char(blockId, offset) {
      const block = find(`[data-ink-block="${CSS.escape(blockId)}"]`);
      const hit = block && locateChar(block, offset);
      if (!hit) return null;
      const range = document.createRange();
      range.setStart(hit.node, hit.at);
      range.setEnd(hit.node, Math.min(hit.at + 1, hit.node.length));
      const r = range.getClientRects()[0] ?? range.getBoundingClientRect();
      const o = origin();
      return {
        left: r.left - o.left,
        top: r.top - o.top,
        em: px(hit.node.parentElement ?? block!),
      };
    },
    choice(letter) {
      const el = find(`[data-ink-choice="${CSS.escape(letter)}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const o = origin();
      return { left: r.left - o.left, top: r.top - o.top, em: px(el) };
    },
    block(blockId) {
      const el = blockId.startsWith("__pane:")
        ? blockId === paneBlock(pane)
          ? pane
          : null
        : find(`[data-ink-block="${CSS.escape(blockId)}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const o = origin();
      return { left: r.left - o.left, top: r.top - o.top, em: px(el) };
    },
  };
}

type CaretDoc = Document & {
  caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?(x: number, y: number): Range | null;
};

function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as CaretDoc;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    return p && { node: p.offsetNode, offset: p.offset };
  }
  const r = doc.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

/** What a stroke starting at (clientX, clientY) on `target` attaches to. */
export function hitTest(
  pane: HTMLElement,
  target: Element,
  clientX: number,
  clientY: number
): AnchorHit {
  const figure = target.closest("[data-ink-figure]");
  if (figure && pane.contains(figure) && figure.querySelector("svg")?.viewBox?.baseVal?.width)
    return { kind: "figure", figureId: figure.getAttribute("data-ink-figure")! };
  const choice = target.closest("[data-ink-choice]");
  if (choice && pane.contains(choice))
    return { kind: "choice", letter: choice.getAttribute("data-ink-choice")! };
  const block = target.closest("[data-ink-block]");
  if (block && pane.contains(block)) {
    const blockId = block.getAttribute("data-ink-block")!;
    if (target.closest(".katex")) return { kind: "block", blockId };
    const caret = caretAt(clientX, clientY);
    if (caret && caret.node.nodeType === Node.TEXT_NODE && block.contains(caret.node)) {
      if (caret.node.parentElement?.closest(".katex")) return { kind: "block", blockId };
      return { kind: "text", blockId, charOffset: charOffsetIn(block, caret.node, caret.offset) };
    }
    return { kind: "block", blockId };
  }
  return { kind: "block", blockId: paneBlock(pane) };
}
