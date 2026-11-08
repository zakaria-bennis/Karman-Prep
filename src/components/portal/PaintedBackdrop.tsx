"use client";

/*
 * The day's Karman painting, full screen behind the portal. The heavy work (rendering the
 * landscape and planning the strokes) waits until after the first paint, so the page is
 * interactive at once. The stroke-by-stroke opening plays once per browser session; later
 * pages show the finished painting. Reduced motion shows the finished painting and holds still.
 */
import { useEffect, useRef } from "react";
import { applyPaintingColors, type PaintingColors } from "@/lib/painting/colors";
import type { PaintingChoice } from "@/lib/painting/schedule";

export const PAINTED_IN_KEY = "karman:painted-in";
export const COLORS_KEY = "karman:paint-colors";

export interface BackdropEvents {
  onPaintStart?: (ms: number) => void;
  onReady?: () => void;
  onTone?: (tone: "light" | "dark" | null) => void;
}

function store(kind: "session" | "local") {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/** Remembers the colors for this band of today, so the next load starts in them. */
function rememberColors(c: PaintingColors) {
  const d = new Date();
  const h = d.getHours();
  const band = h >= 22 || h < 5 ? "night" : h < 11 ? "morning" : h < 17 ? "day" : "evening";
  try {
    store("local")?.setItem(
      COLORS_KEY,
      JSON.stringify({ k: `${d.toDateString()}:${band}`, hue: c.hue, sat: c.sat, accent: c.accent })
    );
  } catch {
    /* colors still apply for this page */
  }
}

export default function PaintedBackdrop({
  choice,
  events,
}: {
  choice: PaintingChoice;
  events: BackdropEvents;
}) {
  const host = useRef<HTMLDivElement>(null);
  const drawn = useRef<HTMLCanvasElement>(null);
  const live = useRef<HTMLCanvasElement>(null);
  const handlers = useRef(events);
  handlers.current = events;

  useEffect(() => {
    let disposed = false;
    let dispose: (() => void) | null = null;
    const session = store("session");
    const firstOpen = choice.replay || !session?.getItem(PAINTED_IN_KEY);
    /* After the first paint: idle time if the browser offers it, else a short timeout. */
    const schedule = (fn: () => void) => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      };
      if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 400 });
      else setTimeout(fn, 60);
    };
    schedule(async () => {
      if (disposed || !drawn.current || !live.current) return;
      try {
        /* The engine loads in its own chunk, after the page is up. */
        const { PaintedScene } = await import("@/lib/painting/backdrop");
        if (disposed || !drawn.current || !live.current) return;
        const scene = new PaintedScene(drawn.current, live.current, choice, {
          onPaintStart: (ms) => handlers.current.onPaintStart?.(ms),
          onReady: () => handlers.current.onReady?.(),
          onColors: (colors, tone) => {
            if (colors) {
              applyPaintingColors(document.documentElement, colors);
              rememberColors(colors);
            }
            handlers.current.onTone?.(tone);
          },
        });
        dispose = () => scene.dispose();
        await scene.start(firstOpen);
        if (disposed) return;
        host.current?.setAttribute("data-painted", "");
        try {
          session?.setItem(PAINTED_IN_KEY, "1");
        } catch {
          /* the opening may play again next time */
        }
      } catch (error) {
        console.error("[painted-backdrop] the painting could not load", error);
        handlers.current.onReady?.();
      }
    });
    return () => {
      disposed = true;
      dispose?.();
    };
  }, [choice]);

  return (
    <div ref={host} className="kp-backdrop" aria-hidden="true">
      <canvas ref={drawn} className="kp-drawn" />
      <canvas ref={live} />
    </div>
  );
}
