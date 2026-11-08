import { useEffect, useRef, useState } from "react";
import { easeOut, reducedMotionNow } from "../motion";

/*
 * CountUp: a number that counts up to its value, in tabular figures, with the
 * end screen's 900 ms expo-out. The API follows Count Up (21st.dev 20068,
 * unlumen: to, from, duration, separator, onEnd); its spring and odometer
 * digit effects were not ported, since a figure that rolls per digit read as
 * a slot machine on a dashboard. Reduced motion shows the final value at once.
 */
export interface CountUpProps {
  to: number;
  from?: number;
  /** ms; the end screen uses 900. */
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  onEnd?: () => void;
}

export function CountUp({
  to,
  from = 0,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  onEnd,
}: CountUpProps) {
  const [v, setV] = useState(from);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (reducedMotionNow() || duration <= 0) {
      setV(to);
      end.current?.();
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      setV(from + (to - from) * easeOut(k));
      if (k < 1) raf = requestAnimationFrame(tick);
      else end.current?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, from, duration]);
  const text = v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
