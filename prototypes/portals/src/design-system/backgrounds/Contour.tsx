import { useCallback, useRef } from "react";
import { rgba } from "../themes";
import { useThemeColors } from "../theme";
import { useCanvasLoop, type Draw } from "./useCanvasLoop";
import { BG_MAX_ALPHA } from "./alpha";

const CELL = 14; // marching-squares cell, px
const LEVELS = 7;

/** Four soft hills that drift over a slow tilt: the climb to a score. */
function height(x: number, y: number, t: number) {
  const hills = [
    [0.22 + 0.06 * Math.sin(t * 0.021), 0.3 + 0.05 * Math.cos(t * 0.017), 0.34],
    [0.72 + 0.05 * Math.cos(t * 0.015), 0.26 + 0.06 * Math.sin(t * 0.019), 0.3],
    [0.5 + 0.07 * Math.sin(t * 0.012), 0.72 + 0.05 * Math.cos(t * 0.023), 0.4],
    [0.9 + 0.04 * Math.cos(t * 0.018), 0.85 + 0.04 * Math.sin(t * 0.014), 0.28],
  ];
  let v = 0.12 * (1 - y) + 0.06 * x;
  for (const [cx, cy, r] of hills) {
    const dx = (x - cx) / r;
    const dy = (y - cy) / r;
    v += Math.exp(-(dx * dx + dy * dy));
  }
  return v;
}

/**
 * Contour lines: fine topographic iso-lines of a slowly drifting height field,
 * drawn by marching squares. The recommended pick: it says "score going up",
 * works under every account theme and does not default to stars. About 2 percent
 * of pixels at 1px.
 */
export function Contour() {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useThemeColors();
  const draw = useCallback<Draw>(
    (ctx, w, h, t) => {
      const cols = Math.ceil(w / CELL) + 1;
      const rows = Math.ceil(h / CELL) + 1;
      const f = new Float32Array(cols * rows);
      let lo = Infinity;
      let hi = -Infinity;
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const v = height(i / (cols - 1), j / (rows - 1), t);
          f[j * cols + i] = v;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      for (let k = 1; k <= LEVELS; k++) {
        const iso = lo + ((hi - lo) * k) / (LEVELS + 1);
        ctx.strokeStyle = rgba(theme.text, BG_MAX_ALPHA.contour * (k === 4 ? 1 : 0.7));
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j++)
          for (let i = 0; i < cols - 1; i++) {
            const a = f[j * cols + i];
            const b = f[j * cols + i + 1];
            const c = f[(j + 1) * cols + i + 1];
            const d = f[(j + 1) * cols + i];
            const code =
              (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
            if (code === 0 || code === 15) continue;
            const x0 = i * CELL;
            const y0 = j * CELL;
            const lerp = (p: number, q: number) => (iso - p) / (q - p || 1e-6);
            const top = [x0 + CELL * lerp(a, b), y0];
            const right = [x0 + CELL, y0 + CELL * lerp(b, c)];
            const bottom = [x0 + CELL * lerp(d, c), y0 + CELL];
            const left = [x0, y0 + CELL * lerp(a, d)];
            const seg = (p: number[], q: number[]) => {
              ctx.moveTo(p[0], p[1]);
              ctx.lineTo(q[0], q[1]);
            };
            switch (code) {
              case 1:
              case 14:
                seg(left, bottom);
                break;
              case 2:
              case 13:
                seg(bottom, right);
                break;
              case 3:
              case 12:
                seg(left, right);
                break;
              case 4:
              case 11:
                seg(top, right);
                break;
              case 5:
                seg(top, left);
                seg(bottom, right);
                break;
              case 6:
              case 9:
                seg(top, bottom);
                break;
              case 7:
              case 8:
                seg(top, left);
                break;
              case 10:
                seg(top, right);
                seg(left, bottom);
                break;
            }
          }
        ctx.stroke();
      }
    },
    [theme.text]
  );
  useCanvasLoop(ref, draw, 10);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
