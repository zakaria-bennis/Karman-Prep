"use client";

// A number that rolls to its value: from 0 when it first shows, then from the old value to the new
// one when it changes (a card moved stages). Still under reduced motion and "Reduce motion".
import { useEffect, useRef, useState } from "react";
import { Num } from "@/components/portal";
import { prefersStill } from "@/lib/painting/motion";
import { formatCents } from "@/lib/admin/crm/format";

const FORMAT = {
  count: (n: number) => n.toLocaleString("en-US"),
  cents: (n: number) => formatCents(n),
} as const;

export default function CountUp({
  value,
  kind = "count",
  ms = 900,
}: {
  value: number;
  /** count: 1,234; cents: $1,234 from a value in cents. */
  kind?: keyof typeof FORMAT;
  ms?: number;
}) {
  const format = FORMAT[kind];
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value || prefersStill()) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);

  return (
    <Num>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="crm-sr">{format(value)}</span>
    </Num>
  );
}
