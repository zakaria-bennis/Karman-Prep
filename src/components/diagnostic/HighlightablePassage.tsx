"use client";

// ============================================================
// HighlightablePassage — select-to-highlight + annotate UI for
// the diagnostic's R&W passages.
//
// How it works:
//   1. The passage is rendered as a sequence of plain-text
//      segments, split by the current set of highlight ranges.
//   2. User selects text → on mouseup we read the selection,
//      compute its character offsets within the passage, and
//      surface a small "Highlight" floating action button next
//      to the selection.
//   3. Click "Highlight" → range is added to local state and
//      the passage re-renders with that span wrapped in a
//      <mark> element using a Karman Prep-themed semi-transparent
//      blue (readable, low-saturation, dark-mode safe).
//   4. Click an existing highlight → opens a popover with
//      "Annotate", "Remove" and (if annotated) the saved note.
//      Hover an annotated highlight → tooltip with the note.
//   5. All popovers (action button, edit popover, hover
//      tooltip) auto-flip to the side that doesn't cover the
//      passage or the answer-choices column.
//
// State is owned by the parent (DiagnosticClient) so it
// persists across re-renders within a question. Highlights
// reset when the question changes — the parent passes a fresh
// value/onChange pair per question.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { MessageSquarePlus, Trash2, Save, X, GripHorizontal } from "lucide-react";

export interface PassageHighlight {
  id: string;
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

// Karman Prep-friendly highlight palette — saturated enough to pop on
// the dark surface but transparent enough to keep the prose
// underneath legible. Each entry pairs a fill (rgba) with a
// hover variant (slightly punchier).
const HIGHLIGHT_PALETTE: { fill: string; hover: string; label: string }[] = [
  { fill: "rgba(96, 165, 250, 0.55)",  hover: "rgba(96, 165, 250, 0.70)",  label: "Blue"    }, // sky-400
  { fill: "rgba(251, 191, 36, 0.55)",  hover: "rgba(251, 191, 36, 0.70)",  label: "Amber"   }, // amber-400
  { fill: "rgba(52, 211, 153, 0.55)",  hover: "rgba(52, 211, 153, 0.70)",  label: "Emerald" }, // emerald-400
  { fill: "rgba(244, 114, 182, 0.55)", hover: "rgba(244, 114, 182, 0.70)", label: "Pink"    }, // pink-400
  { fill: "rgba(168, 85, 247, 0.55)",  hover: "rgba(168, 85, 247, 0.70)",  label: "Violet"  }, // purple-500
  { fill: "rgba(34, 211, 238, 0.55)",  hover: "rgba(34, 211, 238, 0.70)",  label: "Cyan"    }, // cyan-400
  { fill: "rgba(251, 113, 133, 0.55)", hover: "rgba(251, 113, 133, 0.70)", label: "Rose"    }, // rose-400
  { fill: "rgba(163, 230, 53, 0.55)",  hover: "rgba(163, 230, 53, 0.70)",  label: "Lime"    }, // lime-400
];

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
  | { kind: "hl"; text: string; offset: number; hl: PassageHighlight };

function segmentPassage(passage: string, highlights: PassageHighlight[]): Seg[] {
  if (highlights.length === 0) {
    return [{ kind: "text", text: passage, offset: 0 }];
  }
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const segs: Seg[] = [];
  let cursor = 0;
  for (const h of sorted) {
    const start = Math.max(cursor, h.start);
    const end = Math.min(passage.length, h.end);
    if (start > cursor) {
      segs.push({ kind: "text", text: passage.slice(cursor, start), offset: cursor });
    }
    if (end > start) {
      segs.push({ kind: "hl", text: passage.slice(start, end), offset: start, hl: h });
      cursor = end;
    }
  }
  if (cursor < passage.length) {
    segs.push({ kind: "text", text: passage.slice(cursor), offset: cursor });
  }
  return segs;
}

/** Given a Selection within the passage container, walk the
 *  text node tree to compute the start/end character offsets
 *  relative to the original passage string. Returns null if the
 *  selection isn't fully inside the container. */
function selectionToOffsets(container: HTMLElement, sel: Selection): { start: number; end: number } | null {
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
    if (node === range.endContainer)   end   = offset + range.endOffset;
    offset += text.length;
    if (start !== -1 && end !== -1) break;
  }
  if (start === -1 || end === -1) return null;
  if (start === end) return null; // empty selection
  if (start > end) [start, end] = [end, start];
  return { start, end };
}

/** Smart placement (CONTAINER-RELATIVE) — used for the small
 *  hover tooltip + the "Highlight" floating action button. Both
 *  of those should stay inside the passage card so they read as
 *  attached to it. */
function placePopover(
  containerRect: DOMRect,
  targetRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number,
): { top: number; left: number } {
  const margin = 8;
  // Vertical: prefer above, fall back to below.
  let top = targetRect.top - containerRect.top - popoverHeight - margin;
  if (top < margin) top = targetRect.bottom - containerRect.top + margin;

  // Horizontal: center over target, then clamp.
  let left = targetRect.left - containerRect.left + targetRect.width / 2 - popoverWidth / 2;
  const maxLeft = containerRect.width - popoverWidth - margin;
  if (left < margin) left = margin;
  if (left > maxLeft) left = maxLeft;

  return { top, left };
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
  popoverHeight: number,
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

  // Active highlight (for the edit popover).
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editorPos, setEditorPos] = useState<{ top: number; left: number } | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState("");

  // Hovered highlight (for tooltip).
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null);

  const segments = useMemo(() => segmentPassage(passage, highlights), [passage, highlights]);

  // ─── Auto-commit highlight on mouseup ─────────────────────
  // No floating "Highlight" button — releasing a selection inside
  // the passage immediately wraps it in a highlight using the
  // next palette color (cycling through HIGHLIGHT_PALETTE so each
  // new highlight is visually distinct from its neighbours).
  const handleMouseUp = useCallback(() => {
    const passageEl = passageRef.current;
    if (!passageEl) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const offsets = selectionToOffsets(passageEl, sel);
    if (!offsets) return;
    const id = `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const colorIdx = highlights.length % HIGHLIGHT_PALETTE.length;
    onChange([...highlights, { id, ...offsets, colorIdx }]);
    sel.removeAllRanges();
  }, [highlights, onChange]);

  // ─── Highlight click → edit popover ───────────────────────
  // Width/height tuned so the whole panel (including Save) sits
  // on screen without scrolling on every viewport >=320px tall.
  const EDITOR_W = 300;
  const EDITOR_H = 210;

  function openEditor(hl: PassageHighlight, target: HTMLElement) {
    const passage = containerRef.current;
    if (!passage) return;
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
      className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto"
    >
      {passageIntro && (
        <p className="text-sm italic text-slate-500 dark:text-slate-400 mb-4 font-serif leading-relaxed">
          {passageIntro}
        </p>
      )}

      <div
        ref={passageRef}
        onMouseUp={handleMouseUp}
        className="font-serif text-[17px] leading-[1.7] text-slate-800 dark:text-slate-100 whitespace-pre-line select-text"
      >
        {segments.map((seg, idx) =>
          seg.kind === "text" ? (
            <span key={`t-${idx}-${seg.offset}`}>{seg.text}</span>
          ) : (
            (() => {
              // Per-highlight color from the palette — fall back to
              // the first entry if colorIdx is missing (older state
              // before this feature shipped).
              const palette = HIGHLIGHT_PALETTE[seg.hl.colorIdx ?? 0] ?? HIGHLIGHT_PALETTE[0];
              return (
                <mark
                  key={`h-${seg.hl.id}-${seg.offset}`}
                  data-highlight-id={seg.hl.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditor(seg.hl, e.currentTarget);
                  }}
                  onMouseEnter={(e) => onHighlightEnter(seg.hl, e.currentTarget)}
                  onMouseLeave={onHighlightLeave}
                  className={[
                    "rounded-sm px-0.5 cursor-pointer transition-colors",
                    "text-slate-900 dark:text-white",
                    seg.hl.annotation
                      ? "underline decoration-white/70 decoration-dotted underline-offset-4"
                      : "",
                  ].join(" ")}
                  style={{ backgroundColor: palette.fill }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = palette.hover)}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = palette.fill)}
                >
                  {seg.text}
                </mark>
              );
            })()
          )
        )}
      </div>

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
      className="z-[80] rounded-xl border border-white/10 bg-[#0B1026]/95 backdrop-blur-xl shadow-2xl"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Title bar — drag handle. */}
      <div
        onPointerDown={(e) => controls.start(e)}
        className="flex items-center justify-between px-3 py-2 border-b border-white/10 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <div className="flex items-center gap-1.5 pointer-events-none">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
            Annotation
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-5 h-5 rounded hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white"
          aria-label="Close annotation"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="p-3 space-y-2">
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
          className="w-full resize-none rounded-md bg-white/[0.06] border border-white/10 px-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400/60"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:text-rose-200"
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] font-semibold"
          >
            <Save className="w-3 h-3" />
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
      className="z-[70] rounded-xl border border-white/15 bg-[#0B1026]/70 backdrop-blur-md shadow-xl"
      onMouseLeave={onClose}
    >
      <div
        onPointerDown={(e) => controls.start(e)}
        className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <div className="flex items-center gap-1.5 pointer-events-none">
          <GripHorizontal className="w-3 h-3 text-slate-400/80" />
          <MessageSquarePlus className="w-3 h-3 text-blue-300" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
            Annotation
          </span>
        </div>
      </div>
      <p className="px-3 py-2 text-xs text-slate-100 leading-relaxed">
        {annotation}
      </p>
    </motion.div>
  );
}
