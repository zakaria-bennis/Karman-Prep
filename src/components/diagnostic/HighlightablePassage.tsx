"use client";

// Controlled, per-question highlights, underlines and notes for diagnostic prose.
// Native text selection and the keyboard phrase path use the same exact offsets.
// No source text or answer content is rewritten.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { MessageSquarePlus, Trash2, Save, X, GripHorizontal } from "lucide-react";
import { PassageMarkTools, type PassageMarkKind } from "./parts/PassageMarkTools";

export interface PassageHighlight {
  id: string;
  kind?: PassageMarkKind;
  /** Character offset within the passage where this highlight
   *  starts (inclusive). */
  start: number;
  /** Character offset within the passage where this highlight
   *  ends (exclusive). */
  end: number;
  /** Optional saved note. */
  annotation?: string;
  /** Index into HIGHLIGHT_PALETTE — new highlights cycle through
   *  the palette so neighbours are visually distinguishable. */
  colorIdx?: number;
}

interface Props {
  /** The full passage text. */
  passage: string;
  /** Italic source-attribution line shown above the passage. */
  passageIntro?: string;
  /** Highlights for this question — controlled. */
  highlights: PassageHighlight[];
  onChange: (next: PassageHighlight[]) => void;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Splits the passage into a flat list of segments interleaving
 *  plain text and highlights, ordered by offset. Overlapping
 *  highlights are merged (union) for safe rendering. */
type Seg =
  | { kind: "text"; text: string; offset: number }
  | {
      kind: "hl";
      text: string;
      offset: number;
      hl: PassageHighlight;
      highlighted: boolean;
      underlined: boolean;
    };

function segmentPassage(passage: string, highlights: PassageHighlight[]): Seg[] {
  const boundaries = [
    ...new Set([
      0,
      passage.length,
      ...highlights.flatMap((h) => [Math.max(0, h.start), Math.min(passage.length, h.end)]),
    ]),
  ].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((start, i) => {
    const end = boundaries[i + 1];
    const active = highlights.filter((h) => h.start <= start && h.end >= end);
    const text = passage.slice(start, end);
    return active.length
      ? {
          kind: "hl",
          text,
          offset: start,
          hl: active[0],
          highlighted: active.some((h) => h.kind !== "underline"),
          underlined: active.some((h) => h.kind === "underline"),
        }
      : { kind: "text", text, offset: start };
  });
}

/** Given a Selection within the passage container, walk the
 *  text node tree to compute the start/end character offsets
 *  relative to the original passage string. Returns null if the
 *  selection isn't fully inside the container. */
function selectionToOffsets(
  container: HTMLElement,
  sel: Selection
): { start: number; end: number } | null {
  if (sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }

  // Walk text nodes in document order, summing lengths until we
  // hit each endpoint container.
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let start = -1;
  let end = -1;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? "";
    if (node === range.startContainer) start = offset + range.startOffset;
    if (node === range.endContainer) end = offset + range.endOffset;
    offset += text.length;
    if (start !== -1 && end !== -1) break;
  }
  if (start === -1 || end === -1) return null;
  if (start === end) return null; // empty selection
  if (start > end) [start, end] = [end, start];
  return { start, end };
}

/** Smart placement (VIEWPORT-RELATIVE) for the annotation editor.
 *  The editor is mounted at top-level via `position: fixed` so
 *  it can't get clipped by the scrollable passage card. We also
 *  prefer placing it OUTSIDE the passage column so it never
 *  hovers over the text the student is highlighting.
 *
 *  Strategy:
 *    1. If there is room to the RIGHT of the passage card (the
 *       answer-choices column normally lives there at lg+ breakpoints
 *       — we don't push into it; we land in the gap if any, otherwise
 *       fall back), place there.
 *    2. Otherwise place to the LEFT.
 *    3. Otherwise place ABOVE the highlight (still in viewport).
 *    4. Otherwise place BELOW.
 *    5. Final fallback: pin to a comfortable spot in the viewport.
 *  All branches clamp so the popover always fits without scrolling
 *  and the Save button is reachable. */
function placeAnnotationEditor(
  passageRect: DOMRect,
  highlightRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number
): { top: number; left: number } {
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Vertical — try to align with the highlight's vertical center,
  // then clamp so the whole popover (Save included) fits.
  let top = highlightRect.top + highlightRect.height / 2 - popoverHeight / 2;
  if (top + popoverHeight + margin > vh) top = vh - popoverHeight - margin;
  if (top < margin) top = margin;

  // 1. Right of passage card.
  const roomRight = vw - passageRect.right - margin * 2;
  if (roomRight >= popoverWidth) {
    return { top, left: passageRect.right + margin };
  }
  // 2. Left of passage card.
  const roomLeft = passageRect.left - margin * 2;
  if (roomLeft >= popoverWidth) {
    return { top, left: passageRect.left - popoverWidth - margin };
  }
  // 3. Above the highlight.
  const aboveTop = highlightRect.top - popoverHeight - margin;
  if (aboveTop >= margin) {
    let left = highlightRect.left + highlightRect.width / 2 - popoverWidth / 2;
    if (left < margin) left = margin;
    if (left + popoverWidth + margin > vw) left = vw - popoverWidth - margin;
    return { top: aboveTop, left };
  }
  // 4. Below the highlight.
  const belowTop = highlightRect.bottom + margin;
  if (belowTop + popoverHeight + margin <= vh) {
    let left = highlightRect.left + highlightRect.width / 2 - popoverWidth / 2;
    if (left < margin) left = margin;
    if (left + popoverWidth + margin > vw) left = vw - popoverWidth - margin;
    return { top: belowTop, left };
  }
  // 5. Comfortable viewport fallback.
  return {
    top: Math.max(margin, vh / 2 - popoverHeight / 2),
    left: Math.max(margin, vw / 2 - popoverWidth / 2),
  };
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function HighlightablePassage({ passage, passageIntro, highlights, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const passageRef = useRef<HTMLDivElement>(null);
  const [markKind, setMarkKind] = useState<PassageMarkKind>("highlight");
  const editorOpener = useRef<HTMLElement | null>(null);
  const selectedToolRef = useRef<HTMLButtonElement>(null);

  // Active highlight (for the edit popover).
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editorPos, setEditorPos] = useState<{ top: number; left: number } | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState("");

  // Hovered highlight (for tooltip).
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null);

  const segments = useMemo(() => segmentPassage(passage, highlights), [passage, highlights]);

  const addMark = useCallback(
    (start: number, end: number) => {
      const id = `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      onChange([
        ...highlights,
        { id, start, end, kind: markKind, colorIdx: highlights.length % 8 },
      ]);
    },
    [highlights, markKind, onChange]
  );

  const handleMouseUp = useCallback(() => {
    const passageEl = passageRef.current;
    const selection = window.getSelection();
    if (!passageEl || !selection || selection.isCollapsed) return;
    const offsets = selectionToOffsets(passageEl, selection);
    if (!offsets) return;
    addMark(offsets.start, offsets.end);
    selection.removeAllRanges();
  }, [addMark]);

  // ─── Highlight click → edit popover ───────────────────────
  // Width/height tuned so the whole panel (including Save) sits
  // on screen without scrolling on every viewport >=320px tall.
  const EDITOR_W = typeof window === "undefined" ? 300 : Math.min(300, window.innerWidth - 24);
  const EDITOR_H = 260;

  function openEditor(hl: PassageHighlight, target: HTMLElement) {
    const passage = containerRef.current;
    if (!passage) return;
    editorOpener.current = target;
    const rect = target.getBoundingClientRect();
    const passageRect = passage.getBoundingClientRect();
    const pos = placeAnnotationEditor(passageRect, rect, EDITOR_W, EDITOR_H);
    setActiveId(hl.id);
    setDraftAnnotation(hl.annotation ?? "");
    setEditorPos(pos);
  }

  function closeEditor() {
    setActiveId(null);
    setEditorPos(null);
    setDraftAnnotation("");
    editorOpener.current?.focus();
  }

  function saveAnnotation() {
    if (!activeId) return;
    onChange(
      highlights.map((h) =>
        h.id === activeId ? { ...h, annotation: draftAnnotation.trim() || undefined } : h
      )
    );
    closeEditor();
  }

  function removeHighlight() {
    if (!activeId) return;
    onChange(highlights.filter((h) => h.id !== activeId));
    // The edited mark (and its list entry) is about to disappear.
    // Return to the selected tool, which survives even when no marks remain.
    editorOpener.current = selectedToolRef.current;
    closeEditor();
  }

  // ─── Hover tooltip ────────────────────────────────────────
  // Width/height for the viewer; used both for sizing and for
  // smart placement (always above the highlight when there's room).
  const VIEWER_W = 280;
  const VIEWER_H = 110;

  function placeViewerAbove(highlightRect: DOMRect): { top: number; left: number } {
    const margin = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Always above. If there isn't enough room above, pin to viewport
    // top with margin (still above the highlight from a stacking
    // sense, just visually overlapping the top of the screen).
    let top = highlightRect.top - VIEWER_H - margin;
    if (top < margin) top = margin;
    let left = highlightRect.left + highlightRect.width / 2 - VIEWER_W / 2;
    if (left < margin) left = margin;
    if (left + VIEWER_W + margin > vw) left = vw - VIEWER_W - margin;
    if (top + VIEWER_H + margin > vh) top = vh - VIEWER_H - margin;
    return { top, left };
  }

  function onHighlightEnter(hl: PassageHighlight, target: HTMLElement) {
    if (!hl.annotation) return;
    const rect = target.getBoundingClientRect();
    const pos = placeViewerAbove(rect);
    setHoverId(hl.id);
    setHoverPos(pos);
  }

  function onHighlightLeave() {
    // Don't drop the viewer instantly — the user might be moving
    // toward it to drag it. The viewer's own onMouseLeave handles
    // dismiss when they leave its surface.
  }

  const activeHighlight = highlights.find((h) => h.id === activeId) ?? null;
  const hoverHighlight = hoverId ? highlights.find((h) => h.id === hoverId) : null;

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-bronze bg-surface p-6 dark:border-bronze dark:bg-surface/40"
    >
      <PassageMarkTools
        passage={passage}
        kind={markKind}
        onKind={setMarkKind}
        onMarkSelection={handleMouseUp}
        onMarkPhrase={addMark}
        selectedToolRef={selectedToolRef}
      />
      {passageIntro && (
        <p className="mb-4 font-serif text-sm italic leading-relaxed text-taupe dark:text-taupe">
          {passageIntro}
        </p>
      )}

      <div
        ref={passageRef}
        data-diagnostic-passage
        onMouseUp={handleMouseUp}
        className="select-text whitespace-pre-line font-serif text-[17px] leading-[1.7] text-ivory dark:text-ivory"
      >
        {segments.map((seg, idx) =>
          seg.kind === "text" ? (
            <span key={`t-${idx}-${seg.offset}`}>{seg.text}</span>
          ) : (
            (() => {
              return (
                <mark
                  key={`h-${seg.hl.id}-${seg.offset}`}
                  data-highlight-id={seg.hl.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit ${seg.hl.kind ?? "highlight"}: ${seg.text}`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openEditor(seg.hl, event.currentTarget);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditor(seg.hl, e.currentTarget);
                  }}
                  onMouseEnter={(e) => onHighlightEnter(seg.hl, e.currentTarget)}
                  onMouseLeave={onHighlightLeave}
                  className={[
                    "cursor-pointer rounded-sm px-0.5 transition-colors",
                    "text-ivory dark:text-ivory",
                    seg.underlined
                      ? "underline decoration-2 underline-offset-4"
                      : seg.hl.annotation
                        ? "underline decoration-dotted underline-offset-4"
                        : "",
                  ].join(" ")}
                  style={{
                    backgroundColor: seg.highlighted ? "rgb(var(--k-gold))" : "transparent",
                    color: seg.highlighted ? "rgb(var(--k-night))" : "inherit",
                  }}
                >
                  {seg.text}
                </mark>
              );
            })()
          )
        )}
      </div>

      {!!highlights.length && (
        <details className="mt-4 font-sans text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold text-ivory">
            Notes and markings
          </summary>
          <ul className="space-y-2">
            {highlights.map((mark) => (
              <li key={mark.id}>
                <button
                  type="button"
                  className="min-h-11 w-full rounded-lg border border-bronze p-3 text-left text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-info"
                  onClick={(event) => openEditor(mark, event.currentTarget)}
                >
                  {mark.kind === "underline" ? "Underline" : "Highlight"}:{" "}
                  {passage.slice(mark.start, mark.end)}
                  {mark.annotation && (
                    <span className="mt-1 block text-taupe">{mark.annotation}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Edit popover — `position: fixed` (top-level via Portal-
          like absolute escape) so it never gets clipped by the
          scrollable passage container. Draggable by the title bar.
          Smart-placed outside the passage column so it doesn't
          cover the text. Enter to save, Esc / X to dismiss. */}
      {activeHighlight && editorPos && (
        <AnnotationEditor
          initialPos={editorPos}
          width={EDITOR_W}
          draft={draftAnnotation}
          onDraftChange={setDraftAnnotation}
          onSave={saveAnnotation}
          onRemove={removeHighlight}
          onClose={closeEditor}
        />
      )}

      {/* Hover tooltip — translucent draggable annotation viewer
          that always pops up above the highlight. Stays open while
          the cursor is over the viewer so the user can grab it. */}
      {hoverHighlight?.annotation && hoverPos && hoverId !== activeId && (
        <AnnotationViewer
          initialPos={hoverPos}
          width={VIEWER_W}
          annotation={hoverHighlight.annotation}
          onClose={() => {
            setHoverId(null);
            setHoverPos(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Draggable annotation editor — fixed-position so it can't get
// clipped by the scrollable passage card. Enter saves, Esc closes.
// ─────────────────────────────────────────────────────────────

function AnnotationEditor({
  initialPos,
  width,
  draft,
  onDraftChange,
  onSave,
  onRemove,
  onClose,
}: {
  initialPos: { top: number; left: number };
  width: number;
  draft: string;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const controls = useDragControls();
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Autofocus on open + Esc to close.
  useEffect(() => {
    taRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      dragElastic={0.05}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{ position: "fixed", top: initialPos.top, left: initialPos.left, width }}
      className="z-[80] rounded-xl border border-bronze bg-surface-raised shadow-2xl backdrop-blur-xl"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Title bar — drag handle. */}
      <div
        onPointerDown={(e) => controls.start(e)}
        className="flex cursor-grab touch-none select-none items-center justify-between border-b border-ivory/10 px-3 py-2 active:cursor-grabbing"
      >
        <div className="pointer-events-none flex items-center gap-1.5">
          <GripHorizontal className="h-3.5 w-3.5 text-taupe" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-info">
            Annotation
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex min-h-11 min-w-11 items-center justify-center rounded text-taupe hover:bg-surface/[0.08] hover:text-ivory"
          aria-label="Close annotation"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter saves; Shift+Enter inserts a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSave();
            }
          }}
          placeholder="Write a note about this highlight…"
          rows={3}
          className="w-full resize-none rounded-md border border-ivory/10 bg-surface/[0.06] px-2.5 py-2 text-xs text-ivory placeholder:text-taupe focus:border-info/60 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-1 px-2 py-1 text-[11px] font-semibold text-error-bright hover:text-error-bright"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-1 rounded-md bg-ivory px-3 py-2 text-sm font-semibold text-night"
          >
            <Save className="h-3 w-3" />
            Save
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Draggable annotation VIEWER — read-only translucent panel
// that pops up above the highlight on hover. Stays visible
// while the cursor is over its surface so the user can drag
// it; otherwise dismisses on mouse-leave.
// ─────────────────────────────────────────────────────────────

function AnnotationViewer({
  initialPos,
  width,
  annotation,
  onClose,
}: {
  initialPos: { top: number; left: number };
  width: number;
  annotation: string;
  onClose: () => void;
}) {
  const controls = useDragControls();
  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      dragElastic={0.05}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      style={{ position: "fixed", top: initialPos.top, left: initialPos.left, width }}
      // Translucent so the passage text underneath remains visible.
      className="z-[70] rounded-xl border border-bronze bg-surface-raised shadow-xl backdrop-blur-md"
      onMouseLeave={onClose}
    >
      <div
        onPointerDown={(e) => controls.start(e)}
        className="flex cursor-grab touch-none select-none items-center justify-between border-b border-ivory/10 px-3 py-1.5 active:cursor-grabbing"
      >
        <div className="pointer-events-none flex items-center gap-1.5">
          <GripHorizontal className="h-3 w-3 text-taupe/80" />
          <MessageSquarePlus className="h-3 w-3 text-info-bright" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-info-bright">
            Annotation
          </span>
        </div>
      </div>
      <p className="px-3 py-2 text-xs leading-relaxed text-ivory">{annotation}</p>
    </motion.div>
  );
}
