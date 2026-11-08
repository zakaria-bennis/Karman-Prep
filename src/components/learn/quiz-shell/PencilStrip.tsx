"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { PenIndex } from "@/lib/quiz/ink/types";
import shell from "./quiz-shell.module.css";
import styles from "./ink.module.css";
import { ClearIcon, EraserIcon, PenIcon, RedoIcon, UndoIcon } from "./icons";
import { BOUNCE, useShellMotion } from "./motion";
import type { PencilTool } from "./pencil-context";

const PENS: PenIndex[] = [1, 2, 3, 4, 5];

/** Pen (with its five-colour arc), eraser, undo, redo and clear (spec: Pencil, Tools). */
export function PencilStrip({
  tool,
  pen,
  canUndo,
  canRedo,
  canClear,
  onTool,
  onPen,
  onUndo,
  onRedo,
  onClear,
}: {
  tool: PencilTool;
  pen: PenIndex;
  canUndo: boolean;
  canRedo: boolean;
  canClear: boolean;
  onTool(t: PencilTool): void;
  onPen(p: PenIndex): void;
  onUndo(): void;
  onRedo(): void;
  onClear(): void;
}) {
  const [arc, setArc] = useState(false);
  const { reduced } = useShellMotion();
  return (
    <div className={`${styles.strip} ${shell.glass}`} role="toolbar" aria-label="Pencil tools">
      <button
        type="button"
        className={shell.tool}
        aria-pressed={tool === "pen"}
        onClick={() => onTool("pen")}
      >
        <PenIcon state="on" tip={`var(--quiz-pen-${pen})`} />
        <span>Pen</span>
      </button>
      <span className={styles.arcAnchor}>
        <button
          type="button"
          className={shell.tool}
          aria-label={`Pen colour, colour ${pen}`}
          aria-expanded={arc}
          onClick={() => setArc((v) => !v)}
        >
          <span className={styles.swatch} style={{ background: `var(--quiz-pen-${pen})` }} />
        </button>
        <AnimatePresence>
          {arc && (
            <motion.div
              role="radiogroup"
              aria-label="Pen colours"
              className={styles.arc}
              onKeyDown={(e) => e.key === "Escape" && setArc(false)}
            >
              {PENS.map((n, i) => {
                const angle = (-70 + i * 35) * (Math.PI / 180);
                return (
                  <motion.button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={pen === n}
                    aria-label={`Colour ${n}`}
                    className={styles.arcSwatch}
                    style={{ background: `var(--quiz-pen-${n})` }}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: 0, y: 0, scale: 0.4 }}
                    animate={{
                      opacity: 1,
                      x: Math.sin(angle) * 92,
                      y: Math.cos(angle) * 74,
                      scale: 1,
                    }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, x: 0, y: 0, scale: 0.4 }}
                    transition={reduced ? { duration: 0.15 } : { ...BOUNCE, delay: i * 0.025 }}
                    onClick={() => {
                      onPen(n);
                      onTool("pen");
                      setArc(false);
                    }}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </span>
      <button
        type="button"
        className={shell.tool}
        aria-pressed={tool === "eraser"}
        onClick={() => onTool("eraser")}
      >
        <EraserIcon />
        <span>Eraser</span>
      </button>
      <span className={styles.gap} />
      <button
        type="button"
        className={shell.tool}
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        className={shell.tool}
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <RedoIcon />
      </button>
      <button
        type="button"
        className={shell.tool}
        aria-label="Clear"
        disabled={!canClear}
        onClick={onClear}
      >
        <ClearIcon />
      </button>
    </div>
  );
}
