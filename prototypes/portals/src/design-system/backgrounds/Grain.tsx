import { useCallback, useMemo, useRef } from "react";
import { rgba } from "../themes";
import { useThemeColors } from "../theme";
import { useCanvasLoop, seeded, type Draw } from "./useCanvasLoop";
import { BG_MAX_ALPHA } from "./alpha";

/** A time-of-day tint: warm at dawn and dusk, cool at night, none in the day. */
export function dayTint(hour: number): { color: string; alpha: number } {
  if (hour >= 5 && hour < 8) return { color: "#ffc48a", alpha: 0.05 };
  if (hour >= 17 && hour < 20) return { color: "#ffb070", alpha: 0.05 };
  if (hour >= 20 || hour < 5) return { color: "#8fb0ff", alpha: 0.05 };
  return { color: "#ffffff", alpha: 0 };
}

/**
 * Quiet grain: a flat canvas with a fine paper grain and a tint that follows the
 * hour. The grain drifts a few pixels a minute; under reduced motion it is still.
 * `hour` is passed in so screenshots are stable (the gallery clock is 09:41).
 */
export function Grain({ hour = 9 }: { hour?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useThemeColors();
  const tile = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 240;
    const g = c.getContext("2d");
    if (!g) return null;
    const r = seeded(97);
    const [tr, tg, tb] = [1, 3, 5].map((i) => parseInt(theme.text.slice(i, i + 2), 16));
    const img = g.createImageData(240, 240);
    for (let i = 0; i < img.data.length; i += 4) {
      const on = r() < 0.32;
      img.data[i] = tr;
      img.data[i + 1] = tg;
      img.data[i + 2] = tb;
      img.data[i + 3] = on ? Math.round(255 * BG_MAX_ALPHA.grain * (0.4 + r() * 0.6)) : 0;
    }
    g.putImageData(img, 0, 0);
    return c;
  }, [theme.text]);
  const draw = useCallback<Draw>(
    (ctx, w, h, t) => {
      if (!tile) return;
      const pat = ctx.createPattern(tile, "repeat");
      if (!pat) return;
      const shift = (t * 0.3) % 240;
      ctx.save();
      ctx.translate(-shift, -shift * 0.5);
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w + 240, h + 240);
      ctx.restore();
      const tint = dayTint(hour);
      if (tint.alpha > 0) {
        ctx.fillStyle = rgba(tint.color, tint.alpha);
        ctx.fillRect(0, 0, w, h);
      }
    },
    [tile, hour]
  );
  useCanvasLoop(ref, draw, 4);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
