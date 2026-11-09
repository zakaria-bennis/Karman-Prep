"use client";

/*
 * The page heading types itself in, like someone writing to you. On the opening it starts with
 * the first stroke and finishes with the last; otherwise it types at a natural pace. Screen
 * readers get the whole line at once. Reduced motion shows it whole.
 */
import { useEffect, useRef, useState } from "react";
import { prefersStill } from "@/lib/painting/motion";

const weight = (ch: string) => (/[.,?!:]/.test(ch) ? 5 : ch === " " ? 1.4 : 1);

export default function Greeting({
  text,
  /** When set, the typing is paced to take exactly this long, pauses included. */
  totalMs,
  id,
}: {
  text: string | null;
  totalMs?: number | null;
  id?: string;
}) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    const me = ++run.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, Math.max(0, ms)));
    setDone(false);
    if (!text) {
      setShown("");
      return;
    }
    if (prefersStill()) {
      setShown(text);
      setDone(true);
      return;
    }
    setShown("");
    const chars = [...text];
    const lead = totalMs ? 250 : 380;
    const unit = totalMs ? (totalMs - lead) / chars.reduce((n, ch) => n + weight(ch), 0) : 0;
    const start = performance.now();
    let i = 0;
    let due = lead;
    const next = () => {
      if (me !== run.current) return;
      if (i >= chars.length) {
        later(() => me === run.current && setDone(true), 900);
        return;
      }
      const ch = chars[i++];
      setShown(chars.slice(0, i).join(""));
      if (totalMs) {
        due += weight(ch) * unit;
        later(next, start + due - performance.now());
      } else {
        later(next, /[.,?!:]/.test(ch) ? 260 : ch === " " ? 70 : 34 + Math.random() * 38);
      }
    };
    later(next, lead);
    return () => timers.forEach(clearTimeout);
  }, [text, totalMs]);

  return (
    <h1 className="kp-greet" id={id} aria-label={text ?? undefined}>
      <span aria-hidden="true">{shown}</span>
      {text && <span className="kp-caret" data-done={done ? "" : undefined} aria-hidden="true" />}
    </h1>
  );
}
