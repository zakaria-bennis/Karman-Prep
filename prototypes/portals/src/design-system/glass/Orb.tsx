import { useCallback, useRef } from "react";
import { useCanvasLoop, type Draw } from "../backgrounds/useCanvasLoop";

/**
 * The thinking orb: a small flat disc with one satellite on a tilted orbit,
 * drawn in the current text colour. It appears inside a pressed control only
 * after 400 ms (Doherty threshold). Under reduced motion it keeps turning at
 * a third of the speed instead of stopping, so "working" still reads.
 */
export function Orb({ size = 20, className }: { size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const draw = useCallback<Draw>((ctx, w, h, t) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.2;
    const color = getComputedStyle(ctx.canvas).color;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const time = reduced ? performance.now() / 1000 / 3 : t;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    const a = ((time % 1.35) / 1.35) * Math.PI * 2;
    const ox = Math.min(w, h) * 0.42;
    const oy = Math.min(w, h) * 0.15;
    const tilt = -0.42;
    const x = Math.cos(a) * ox;
    const y = Math.sin(a) * oy;
    const px = cx + x * Math.cos(tilt) - y * Math.sin(tilt);
    const py = cy + x * Math.sin(tilt) + y * Math.cos(tilt);
    ctx.globalAlpha = Math.sin(a) > 0 ? 1 : 0.55;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1.2, r * 0.3), 0, Math.PI * 2);
    ctx.fill();
  }, []);
  useCanvasLoop(ref, draw, 30);
  return (
    <span
      className={className}
      style={{ width: size, height: size, display: "inline-block", position: "relative" }}
      aria-hidden="true"
    >
      <canvas ref={ref} />
    </span>
  );
}
