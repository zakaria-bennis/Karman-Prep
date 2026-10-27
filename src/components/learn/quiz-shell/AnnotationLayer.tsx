"use client";
// Highlights and notes (spec: Bluebook tools). Highlights are painted behind the text, so the
// question's own DOM is never changed and every browser shows them.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { domRange, rangesFromSelection } from "@/lib/quiz/annotations/ranges";
import type { AnnotationRange, HighlightColor } from "@/lib/quiz/workspace";
import shell from "./quiz-shell.module.css";
import styles from "./annotate.module.css";
import { useAnnotations } from "./annotation-context";
import { SPRING, useShellMotion } from "./motion";

type Box = { left: number; top: number; width: number; height: number };
type Menu =
  | { kind: "new"; ranges: AnnotationRange[]; at: Box }
  | { kind: "edit"; id: number; at: Box; editing: boolean };

const COLORS: HighlightColor[] = [1, 2, 3];

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

  // A finished selection inside this pane opens the menu.
  useEffect(() => {
    const el = pane();
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const c = ctxRef.current;
        if (!c?.enabled) return;
        const sel = window.getSelection();
        const ranges = rangesFromSelection(el, sel);
        if (!ranges.length || !sel) return setMenu((m) => (m?.kind === "new" ? null : m));
        const boxes = rectsOf(el, sel.getRangeAt(0));
        if (boxes.length) setMenu({ kind: "new", ranges, at: union(boxes) });
      }, 120);
    };
    // Tapping a highlight opens it for a note, a new colour or removal.
    const onUp = (e: PointerEvent) => {
      const c = ctxRef.current;
      if (!c?.enabled || !window.getSelection()?.isCollapsed) return;
      const o = el.getBoundingClientRect();
      const x = e.clientX - o.left;
      const y = e.clientY - o.top;
      const hit = paintedRef.current.find((p) =>
        p.boxes.some(
          (b) => x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height
        )
      );
      if (hit) {
        setDraft(c.highlights.find((h) => h.id === hit.id)?.note ?? "");
        setMenu({ kind: "edit", id: hit.id, at: union(hit.boxes), editing: false });
      }
    };
    document.addEventListener("selectionchange", onChange);
    el.addEventListener("pointerup", onUp);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
      el.removeEventListener("pointerup", onUp);
    };
  }, []);

  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const paintedRef = useRef(painted);
  paintedRef.current = painted;
  if (!ctx) return null;

  const close = () => {
    setMenu(null);
    setDraft("");
  };
  const apply = (color: HighlightColor) => {
    if (menu?.kind === "new") {
      let last = 0;
      for (const r of menu.ranges) last = ctx.add(r, color);
      setFresh(last);
      window.getSelection()?.removeAllRanges();
      close();
    } else if (menu?.kind === "edit") {
      ctx.recolor(menu.id, color);
      close();
    }
  };
  const addNote = () => {
    if (menu?.kind === "new") {
      let last = 0;
      for (const r of menu.ranges) last = ctx.add(r, 1);
      setFresh(last);
      window.getSelection()?.removeAllRanges();
      setDraft("");
      setMenu({ kind: "edit", id: last, at: menu.at, editing: true });
    } else if (menu?.kind === "edit") setMenu({ ...menu, editing: true });
  };
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
            key={menu.kind === "edit" ? `e${menu.id}` : "new"}
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
            {menu.kind === "edit" && menu.editing ? (
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
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.colour}
                    aria-label={`Highlight colour ${c}`}
                    style={{ background: `var(--quiz-highlight-${c})` }}
                    onClick={() => apply(c)}
                  />
                ))}
                <button type="button" className={shell.tool} onClick={addNote}>
                  {menu.kind === "edit" && ctx.highlights.find((h) => h.id === menu.id)?.note
                    ? "Edit note"
                    : "Add note"}
                </button>
                {menu.kind === "edit" && (
                  <button
                    type="button"
                    className={shell.tool}
                    onClick={() => {
                      ctx.remove(menu.id);
                      close();
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
