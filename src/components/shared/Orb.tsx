"use client";

// The loader for one action: the Thinking Orb, from the thinking-orbs library (MIT, by Jakub Antalik,
// github.com/Jakubantalik/Libraries.dev), in its small "working" form (founder, 2026-11-25: use the real
// one, not an imitation of it). It is drawn in one ink, pale or dark, and picks the one that matches the
// words beside it: pale words mean a dark button, so pale dots. It stands still for reduced motion and
// pauses off screen by itself.
import { useEffect, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";

/** True when a CSS colour ("rgb(13, 36, 28)") is a pale one. */
function pale(color: string): boolean {
  const [r, g, b] = (color.match(/[\d.]+/g) ?? []).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}

export function Orb({
  label,
  size = 20,
}: {
  /** What is happening, for a screen reader: "Saving". Leave out when the words beside it say so. */
  label?: string;
  size?: 20 | 64;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const [ground, setGround] = useState<"dark" | "light" | null>(null);
  useEffect(() => {
    if (box.current) setGround(pale(getComputedStyle(box.current).color) ? "dark" : "light");
  }, []);
  return (
    <span
      ref={box}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: "inline-grid", width: size, height: size, flex: "none" }}
    >
      {ground && <ThinkingOrb state="working" size={size} theme={ground} aria-hidden="true" />}
    </span>
  );
}
