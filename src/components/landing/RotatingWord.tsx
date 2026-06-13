"use client";

// ============================================================
// RotatingWord — cycles through the brand promise words.
//
// Observatory treatment: every word speaks in the same voice —
// star-gold italic serif. Gold marks the promise (an earned
// moment, per docs/brand.md); the old five-color pastel cycle is
// retired with the cloud palette. Width animates so the
// surrounding sentence never jumps.
//
// Accessibility: the entire rotation is announced once via an
// sr-only static string ("Built to inspire, to dream, to achieve…").
// The animated layer is aria-hidden so AT users don't hear
// every swap.
// ============================================================

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { easeStandard } from "@/lib/motion";

export const KARMAN_PROMISES = ["inspire", "dream", "achieve", "excel", "wonder"] as const;

interface Props {
  words?: readonly string[];
  /** ms per word */
  interval?: number;
}

export default function RotatingWord({ words = KARMAN_PROMISES, interval = 3200 }: Props) {
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
    return <span className="italic text-gold-bright">{current}</span>;
  }

  return (
    <>
      {/* Screen reader gets the full idea — read once */}
      <span className="sr-only">Built to {words.join(", to ")}.</span>

      <motion.span
        className="relative inline-flex items-baseline align-baseline"
        layout
        transition={{ layout: { duration: 0.5, ease: easeStandard } }}
        aria-hidden="true"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={current}
            layout
            initial={{ y: "0.5em", opacity: 0, filter: "blur(8px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: "-0.5em", opacity: 0, filter: "blur(8px)" }}
            transition={{
              y: { duration: 0.65, ease: easeStandard },
              opacity: { duration: 0.5 },
              filter: { duration: 0.55 },
            }}
            className="inline-block font-medium italic text-gold-bright will-change-transform"
          >
            {current}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
}
