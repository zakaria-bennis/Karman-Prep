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
      if (e.key === "ArrowLeft") return run(h.back);
      if (e.key === "ArrowRight") return run(h.next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
