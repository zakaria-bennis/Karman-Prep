import { useEffect, useRef, useState } from "react";
import { bakeSpring, EASE } from "@/design-system/motion";
import { useReducedMotion } from "@/design-system/motion";

/*
 * Rolling Digits, ported from 21st.dev 19158 through the end screen's kit.js
 * (End.setNum): each digit that changes rolls out (240 ms) while the new one
 * springs in (response 0.42, damping 0.68), masked top and bottom; the roll's
 * direction follows the numeric change. Cells align from the right, so a
 * thousands separator keeps its place. Reduced motion prints the value.
 */
interface Cell {
  id: number;
  ch: string;
  gen: number;
  out?: { ch: string; up: boolean };
  up: boolean;
}
let nextId = 1;

function diff(prev: Cell[], text: string, up: boolean): Cell[] {
  const chars = [...text];
  const out: Cell[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[chars.length - 1 - i];
    const old = prev[prev.length - 1 - i];
    if (!old) out.unshift({ id: nextId++, ch, gen: 1, up, out: undefined });
    else if (old.ch !== ch)
      out.unshift({ ...old, ch, gen: old.gen + 1, up, out: { ch: old.ch, up } });
    else out.unshift({ ...old, out: undefined });
  }
  return out;
}
const num = (s: string) => parseFloat(s.replace(/[^\d.-]/g, "")) || 0;

export function RollingNumber({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  const text = typeof value === "number" ? value.toLocaleString("en-US") : value;
  const reduced = useReducedMotion();
  const [cells, setCells] = useState<Cell[]>(() => diff([], text, true));
  const last = useRef(text);
  const spring = bakeSpring(0.42, 0.68);

  useEffect(() => {
    if (text === last.current) return;
    const up = num(text) >= num(last.current);
    last.current = text;
    setCells((prev) => diff(prev, text, up));
  }, [text]);

  if (reduced)
    return (
      <span className={`tabular ${className ?? ""}`} aria-label={text}>
        {text}
      </span>
    );
  return (
    <span className={`rd tabular ${className ?? ""}`} aria-label={text} role="text">
      {cells.map((c) => (
        <span key={c.id} className="rd-c" aria-hidden="true">
          {c.out ? (
            <span
              key={`o${c.gen}`}
              className="rd-g rd-out"
              style={{ "--rd-to": c.out.up ? "-0.62em" : "0.62em" } as React.CSSProperties}
            >
              {c.out.ch}
            </span>
          ) : null}
          <span
            key={`i${c.gen}`}
            className={c.gen > 1 ? "rd-g rd-in" : "rd-g"}
            style={
              {
                "--rd-from": c.up ? "0.66em" : "-0.66em",
                "--rd-ms": `${spring.duration}ms`,
                "--rd-ease": spring.easing || EASE,
              } as React.CSSProperties
            }
          >
            {c.ch}
          </span>
        </span>
      ))}
    </span>
  );
}
