"use client";
import { useEffect, useRef } from "react";

export type ShortcutHandlers = {
  pick?(letter: "A" | "B" | "C" | "D"): void;
  mark?(): void;
  bookmark?(): void;
  pencil?(): void;
  eraser?(): void;
  undo?(): void;
  redo?(): void;
  back?(): void;
  next?(): void;
  highlight?(): void;
  calculator?(): void;
  reference?(): void;
  eliminator?(): void;
  /** Enter: Submit, or Next once the answer is checked. */
  submit?(): void;
  textSize?(step: 1 | -1): void;
  help?(): void;
};

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

/** Keyboard shortcuts for laptops and iPads with keyboards (spec: Keyboard shortcuts). */
export function useShortcuts(handlers: ShortcutHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || typing(e.target)) return;
      const h = ref.current;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        (e.shiftKey ? h.redo : h.undo)?.();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        h.redo?.();
        return;
      }
      if (mod || e.altKey) return;
      const run = (fn?: () => void) => {
        if (!fn) return;
        e.preventDefault();
        fn();
      };
      if (/^[abcd]$/.test(key)) return run(h.pick && (() => h.pick!(key.toUpperCase() as "A")));
      if (key === "m") return run(h.mark);
      if (key === "s") return run(h.bookmark);
      if (key === "p") return run(h.pencil);
      if (key === "e") return run(h.eraser);
      if (key === "h") return run(h.highlight);
      if (key === "c") return run(h.calculator);
      if (key === "r") return run(h.reference);
      if (key === "x") return run(h.eliminator);
      if (e.key === "?") return run(h.help);
      if (e.key === "+" || e.key === "=") return run(h.textSize && (() => h.textSize!(1)));
      if (e.key === "-") return run(h.textSize && (() => h.textSize!(-1)));
      // Enter only when nothing else has focus, so a focused button still does its own job.
      if (e.key === "Enter") {
        const el = document.activeElement;
        if (el && el !== document.body && !(el as HTMLElement).hasAttribute?.("data-quiz-shell"))
          return;
        return run(h.submit);
      }
      if (e.key === "ArrowLeft") return run(h.back);
      if (e.key === "ArrowRight") return run(h.next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
