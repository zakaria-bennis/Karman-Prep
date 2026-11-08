import { useEffect, useRef, type ReactNode } from "react";
import { bakeSpring } from "@/design-system/motion";
import { reducedMotionNow } from "@/design-system/motion";

/*
 * The score as a gauge that fills with each right answer: two arcs with a gap
 * between them, the value arc in the accent, the rest a faint track, each drawn
 * with dash lengths in percent (Animated Circular Progress Bar, 21st.dev 920,
 * with the dash arithmetic of Circular Progress 22095, using Math.PI). When the
 * count lands the gauge pops once on the bounce spring; no glow.
 */
const C = 2 * Math.PI * 45;
const PX = C / 100;

export function ScoreGauge({
  value,
  total,
  done,
  size = 176,
  children,
}: {
  value: number;
  total: number;
  done: boolean;
  size?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pct = total > 0 ? (value / total) * 100 : 0;
  const gap = pct > 0 && pct < 100 ? 5 : 0;
  useEffect(() => {
    if (!done || !ref.current || reducedMotionNow()) return;
    const sp = bakeSpring(0.36, 0.5);
    ref.current.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.07)" }, { transform: "scale(1)" }],
      { duration: Math.max(500, sp.duration), easing: "cubic-bezier(.34,1.56,.64,1)" }
    );
  }, [done]);
  return (
    <div
      ref={ref}
      className="gauge relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          style={{
            stroke: "rgb(var(--k-text) / 0.11)",
            strokeDasharray: `${Math.max(0, (100 - pct - gap * 2) * PX)} ${C}`,
            transform: `rotate(${-90 - gap * 3.6}deg) scaleY(-1)`,
            opacity: pct >= 100 ? 0 : 1,
          }}
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          style={{
            stroke: "rgb(var(--k-accent))",
            strokeDasharray: `${Math.max(0, pct * PX)} ${C}`,
            transform: "rotate(-90deg)",
          }}
        />
      </svg>
      <div
        className="relative grid justify-items-center"
        role="img"
        aria-label={`${value} of ${total} right`}
      >
        {children}
      </div>
    </div>
  );
}
