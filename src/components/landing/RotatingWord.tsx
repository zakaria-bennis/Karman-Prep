"use client";

// ============================================================
// RotatingWord — cycles through the brand promise words, each
// colored from Karman's subject palette. Width animates so the
// surrounding sentence never jumps.
//
// Accessibility: the entire rotation is announced once via an
// sr-only static string ("Built to inspire, to dream, to achieve…").
// The animated layer is aria-hidden so AT users don't hear
// every swap.
// ============================================================

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export interface Word {
  text: string;
  color: string; // any CSS color
}

// Pulls from the 5 subject colors — the teaching palette IS
// the promise palette. One system, two jobs.
export const STRATA_PROMISES: Word[] = [
  { text: "inspire", color: "#C4A7FF" }, // violet (advanced-math, lifted)
  { text: "dream",   color: "#7FB3FF" }, // blue (algebra, lifted)
  { text: "achieve", color: "#5EE4C6" }, // teal (geometry, lifted)
  { text: "excel",   color: "#FFC574" }, // amber (data-analysis, lifted)
  { text: "wonder",  color: "#FF9AA8" }, // rose (reading-writing, lifted)
];

interface Props {
  words?: Word[];
  /** ms per word */
  interval?: number;
}

export default function RotatingWord({ words = STRATA_PROMISES, interval = 2600 }: Props) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setI((n) => (n + 1) % words.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [words.length, interval, reduce]);

  const current = words[i];

  // Static fallback under reduced motion — show first word only.
  if (reduce) {
    return (
      <span style={{ color: current.color }} className="italic">
        {current.text}
      </span>
    );
  }

  return (
    <>
      {/* Screen reader gets the full idea — read once */}
      <span className="sr-only">
        Built to {words.map((w) => w.text).join(", to ")}.
      </span>

      <motion.span
        className="relative inline-flex items-baseline align-baseline"
        layout
        transition={{ layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
        aria-hidden="true"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={current.text}
            layout
            initial={{ y: "0.6em", opacity: 0, filter: "blur(10px)" }}
            animate={{ y: 0,       opacity: 1, filter: "blur(0px)" }}
            exit={{    y: "-0.6em", opacity: 0, filter: "blur(10px)" }}
            transition={{
              y: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.4 },
              filter: { duration: 0.45 },
            }}
            style={{
              color: current.color,
              textShadow: `0 0 40px ${current.color}55, 0 0 80px ${current.color}22`,
            }}
            className="inline-block italic font-[650] will-change-transform"
          >
            {current.text}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
}
