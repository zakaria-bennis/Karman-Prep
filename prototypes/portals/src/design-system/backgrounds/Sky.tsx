import { useCallback, useMemo, useRef } from "react";
import { rgba } from "../themes";
import { useThemeColors } from "../theme";
import { useCanvasLoop, seeded, type Draw } from "./useCanvasLoop";
import { BG_MAX_ALPHA } from "./alpha";

/**
 * Night sky (rule 49): faint stars and a few lines between near ones, drifting
 * one way very slowly. Ink on bone in light mode. Under 1 percent of pixels.
 */
export function Sky() {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useThemeColors();
  const stars = useMemo(() => {
    const r = seeded(31);
    return Array.from({ length: 110 }, () => ({
      x: r(),
      y: r(),
      s: 0.7 + r() * 0.9,
      a: 0.45 + r() * 0.55,
      p: r() * Math.PI * 2,
    }));
  }, []);
  const draw = useCallback<Draw>(
    (ctx, w, h, t) => {
      const max = BG_MAX_ALPHA.sky;
      const drift = (t * 1.5) % w; // 1.5 px a second
      const pts = stars.map((s) => ({
        x: (s.x * w + drift) % w,
        y: s.y * h,
        s: s.s,
        a: s.a * (0.75 + 0.25 * Math.sin(t * 0.5 + s.p)),
      }));
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(theme.text, max * 0.45);
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 70 * 70 && (i + j) % 3 === 0) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      for (const p of pts) {
        ctx.fillStyle = rgba(theme.text, max * p.a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [stars, theme.text]
  );
  useCanvasLoop(ref, draw, 10);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
