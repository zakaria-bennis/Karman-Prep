"use client";
// Highlights and notes (spec: Bluebook tools). Highlights are painted behind the text, so the
// question's own DOM is never changed and every browser shows them.
// Founder, 2026-11-08: with the highlighter on, a selection is highlighted at once in the next
// colour (each highlight takes a different one). Clicking a highlight offers only Delete and Add
// a note; resting the pointer on a highlight with a note shows the note.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { domRange, rangesFromSelection } from "@/lib/quiz/annotations/ranges";
import type { HighlightColor } from "@/lib/quiz/workspace";
import shell from "./quiz-shell.module.css";
import styles from "./annotate.module.css";
import { useAnnotations } from "./annotation-context";
import { SPRING, useShellMotion } from "./motion";

type Box = { left: number; top: number; width: number; height: number };
type Menu = { kind: "edit"; id: number; at: Box; editing: boolean };

function rectsOf(pane: HTMLElement, range: Range): Box[] {
  const o = pane.getBoundingClientRect();
  return Array.from(range.getClientRects())
    .filter((r) => r.width > 0.5)
    .map((r) => ({ left: r.left - o.left, top: r.top - o.top, width: r.width, height: r.height }));
}
function union(boxes: Box[]): Box {
  const left = Math.min(...boxes.map((b) => b.left));
  const top = Math.min(...boxes.map((b) => b.top));
  const right = Math.max(...boxes.map((b) => b.left + b.width));
  const bottom = Math.max(...boxes.map((b) => b.top + b.height));
  return { left, top, width: right - left, height: bottom - top };
}

export function AnnotationLayer() {
  const ctx = useAnnotations();
  const holder = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [painted, setPainted] = useState<
    { id: number; color: HighlightColor; note: boolean; boxes: Box[] }[]
  >([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [draft, setDraft] = useState("");
  const [fresh, setFresh] = useState<number | null>(null);
  const [peek, setPeek] = useState<{ id: number; at: Box } | null>(null);
  const { reduced } = useShellMotion();
  const pane = () => holder.current?.parentElement as HTMLElement | null;
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

  useLayoutEffect(() => {
    const el = pane();
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = pane();
    if (!el || !ctx) return;
    setPainted(
      ctx.highlights.flatMap((h) => {
        const r = domRange(el, h.range);
        return r ? [{ id: h.id, color: h.color, note: !!h.note, boxes: rectsOf(el, r) }] : [];
      })
    );
  }, [ctx?.highlights, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // With the highlighter on, a finished selection inside this pane is highlighted at once.
  useEffect(() => {
    const el = pane();
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pressed = false;
    const settle = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const c = ctxRef.current;
        if (!c?.enabled || !c.highlighting || pressed) return;
        const sel = window.getSelection();
        const ranges = rangesFromSelection(el, sel);
        if (!ranges.length) return;
        const color = c.nextColor();
        let last = 0;
        for (const r of ranges) last = c.add(r, color);
        setFresh(last);
        sel?.removeAllRanges();
      }, 60);
    };
    const onDown = () => {
      pressed = true;
    };
    // Tapping a highlight opens it: Delete or Add a note.
    const onUp = (e: PointerEvent) => {
      pressed = false;
      const c = ctxRef.current;
      if (!c?.enabled) return;
      if (!window.getSelection()?.isCollapsed) return settle();
      const hit = hitAt(e);
      if (hit) {
        setPeek(null);
        setDraft(c.highlights.find((h) => h.id === hit.id)?.note ?? "");
        setMenu({ kind: "edit", id: hit.id, at: union(hit.boxes), editing: false });
      }
    };
    // Resting on a highlight with a note shows the note.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || pressed) return;
      const hit = hitAt(e);
      const noted = hit && ctxRef.current?.highlights.find((h) => h.id === hit.id)?.note;
      setPeek((p) =>
        noted && hit ? (p?.id === hit.id ? p : { id: hit.id, at: union(hit.boxes) }) : null
      );
    };
    const onLeave = () => setPeek(null);
    const hitAt = (e: PointerEvent) => {
      const o = el.getBoundingClientRect();
      const x = e.clientX - o.left;
      const y = e.clientY - o.top;
      return paintedRef.current.find((p) =>
        p.boxes.some(
          (b) => x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height
        )
      );
    };
    // Keyboard selections (Shift and the arrows) settle on selectionchange.
    const onChange = () => !pressed && settle();
    document.addEventListener("selectionchange", onChange);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Escape closes the menu first (the shell's own Escape then puts the tool away); a page that
  // changes size closes it too, so it never floats away from its highlight.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      setMenu(null);
      setDraft("");
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [menu]);
  useEffect(() => setMenu(null), [tick]);

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const paintedRef = useRef(painted);
  paintedRef.current = painted;
  if (!ctx) return null;

  const close = () => {
    setMenu(null);
    setDraft("");
  };
  const addNote = () => menu && setMenu({ ...menu, editing: true });
  // Phones: the system's own edit menu sits above a selection, so ours goes below it.
  const menuTop = menu ? (coarse ? menu.at.top + menu.at.height + 10 : menu.at.top - 10) : 0;

  return (
    <>
      <div
        ref={holder}
        className={styles.layer}
        data-highlights={painted.length}
        aria-hidden="true"
      >
        {painted.map((p) =>
          p.boxes.map((b, i) => (
            <motion.span
              key={`${p.id}-${i}`}
              className={`${styles.mark} ${p.note ? styles.noted : ""}`}
              style={{
                left: b.left - 1,
                top: b.top,
                width: b.width + 2,
                height: b.height,
                background: `var(--quiz-highlight-${p.color})`,
              }}
              initial={fresh === p.id && !reduced ? { scaleX: 0 } : false}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.28, delay: i * 0.08, ease: [0.3, 0.7, 0.2, 1] }}
              onAnimationComplete={() => fresh === p.id && setFresh(null)}
            />
          ))
        )}
      </div>
      <AnimatePresence mode="wait">
        {menu && (
          <motion.div
            key={`e${menu.id}`}
            role="toolbar"
            aria-label="Highlight and note"
            className={`${styles.menu} ${shell.glass}`}
            style={{ left: Math.max(4, menu.at.left), top: menuTop }}
            data-placement={coarse ? "below" : "above"}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: coarse ? -6 : 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? { duration: 0.15 } : SPRING}
            onKeyDown={(e) => e.key === "Escape" && close()}
            onPointerDown={(e) => e.preventDefault()}
          >
            {menu.editing ? (
              <form
                className={styles.noteForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  ctx.note(menu.id, draft.trim());
                  close();
                }}
              >
                <label className={styles.noteLabel} htmlFor="quiz-note">
                  Note
                </label>
                <textarea
                  id="quiz-note"
                  className={styles.note}
                  rows={3}
                  maxLength={500}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  autoFocus
                />
                <div className={styles.row}>
                  <button type="button" className={shell.tool} onClick={close}>
                    Cancel
                  </button>
                  <button type="submit" className={shell.tool}>
                    Save note
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.row}>
                <button
                  type="button"
                  className={shell.tool}
                  onClick={() => {
                    ctx.remove(menu.id);
                    close();
                  }}
                >
                  Delete
                </button>
                <button type="button" className={shell.tool} onClick={addNote}>
                  {ctx.highlights.find((h) => h.id === menu.id)?.note ? "Edit note" : "Add a note"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {peek && !menu && (
          <motion.div
            key={`p${peek.id}`}
            role="tooltip"
            className={`${styles.peek} ${shell.glass}`}
            style={{ left: Math.max(4, peek.at.left), top: peek.at.top + peek.at.height + 8 }}
            initial={{ opacity: 0, y: reduced ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {ctx.highlights.find((h) => h.id === peek.id)?.note}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
