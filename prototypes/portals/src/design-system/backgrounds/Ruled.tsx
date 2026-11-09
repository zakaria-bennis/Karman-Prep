import { useCallback, useRef } from "react";
import { rgba } from "../themes";
import { useThemeColors } from "../theme";
import { useCanvasLoop, type Draw } from "./useCanvasLoop";
import { BG_MAX_ALPHA } from "./alpha";

const PITCH = 56; // wide, like exam paper seen from a chair
const STEP = 7; // seconds per rule for the travelling highlight

/**
 * Ruled field: faint horizontal rules at a wide pitch, and one slow highlight
 * that travels down the page one rule at a time. About 1.8 percent of pixels.
 */
export function Ruled() {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useThemeColors();
  const draw = useCallback<Draw>(
    (ctx, w, h, t) => {
      const max = BG_MAX_ALPHA.ruled;
      const rows = Math.ceil(h / PITCH) + 1;
      const pos = (t / STEP) % rows; // which rule is lit, fractional
      ctx.lineWidth = 1;
      for (let i = 0; i < rows; i++) {
        const y = Math.round(i * PITCH + PITCH * 0.6) + 0.5;
        const dist = Math.min(
          Math.abs(i - pos),
          Math.abs(i - pos + rows),
          Math.abs(i - pos - rows)
        );
        const lit = Math.max(0, 1 - dist); // fades between neighbours
        ctx.strokeStyle = rgba(theme.text, max * (0.45 + 0.55 * lit));
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    },
    [theme.text]
  );
  useCanvasLoop(ref, draw, 8);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
