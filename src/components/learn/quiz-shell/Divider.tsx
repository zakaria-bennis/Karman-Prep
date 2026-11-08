"use client";
import { motion, useMotionValue, animate } from "framer-motion";
import { useRef } from "react";
import styles from "./quiz-shell.module.css";
import { SPRING } from "./motion";

/** Clamp a split so each pane keeps at least `minPx`. */
export function clampSplit(fraction: number, sizePx: number, minPx: number): number {
  if (sizePx <= 2 * minPx) return 0.5;
  return Math.min(1 - minPx / sizePx, Math.max(minPx / sizePx, fraction));
}

/** The draggable line between passage and question; rubber-bands at its limits. */
export function Divider({
  orientation,
  fraction,
  minPx,
  frame,
  onChange,
}: {
  orientation: "vertical" | "horizontal";
  fraction: number;
  minPx: number;
  frame: React.RefObject<HTMLDivElement | null>;
  onChange(next: number): void;
}) {
  const stretch = useMotionValue(0);
  const dragging = useRef(false);
  const vertical = orientation === "vertical";

  function size() {
    const r = frame.current?.getBoundingClientRect();
    return r ? (vertical ? r.width : r.height) : 1;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const total = vertical ? r.width : r.height;
    const raw = ((vertical ? e.clientX - r.left : e.clientY - r.top) / total) as number;
    const clamped = clampSplit(raw, total, minPx);
    stretch.set((raw - clamped) * total * 0.2);
    onChange(clamped);
  }
  function end() {
    dragging.current = false;
    animate(stretch, 0, SPRING);
  }
  return (
    <div
      role="separator"
      aria-label="Resize passage and question"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(fraction * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      className={styles.divider}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={(e) => {
        const step = 0.04;
        const back = vertical ? "ArrowLeft" : "ArrowUp";
        const forward = vertical ? "ArrowRight" : "ArrowDown";
        if (e.key !== back && e.key !== forward) return;
        e.preventDefault();
        onChange(clampSplit(fraction + (e.key === forward ? step : -step), size(), minPx));
      }}
    >
      <motion.span
        className={styles.dividerGrip}
        style={vertical ? { x: stretch } : { y: stretch }}
      />
    </div>
  );
}
