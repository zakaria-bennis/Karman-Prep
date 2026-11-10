"use client";

// The home page's painting: today's Karman painting, fixed behind the page and travelled from the dawn sky
// to the ground at night as the visitor scrolls (lib/painting/journey.ts). The engine loads in its own
// chunk after the page is up, so the words never wait for it. The stroke-by-stroke opening plays once per
// browser session. The main button takes its colour from the light on screen. Reduced motion, or the
// footer's "Hold the painting still", keeps the camera and the wildlife still.
import { useEffect, useRef } from "react";
import { applyPaintingColors } from "@/lib/painting/colors";
import { TIMES_OF_DAY } from "@/lib/painting/light";
import { choosePainting } from "@/lib/painting/schedule";
import { motionPaused } from "../live/motion";

const PAINTED_KEY = "karman:home-painted";

export default function HomeJourney() {
  const host = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ks = document.getElementById("ks");
    const stage = host.current;
    if (!ks || !stage || !camera.current || !live.current) return;
    let disposed = false;
    let dispose: (() => void) | null = null;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const still = () => reduce.matches || motionPaused();
    const mark = () => ks.classList.toggle("still-motion", still());
    mark();

    let seen = false;
    try {
      seen = sessionStorage.getItem(PAINTED_KEY) === "1";
    } catch {
      /* the opening may play again */
    }
    const choice = choosePainting(
      new Date(),
      location.search,
      process.env.NODE_ENV !== "production"
    );
    const canvases = [...camera.current.querySelectorAll("canvas")];
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    const later = (fn: () => void) =>
      w.requestIdleCallback ? w.requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 80);

    later(async () => {
      if (disposed || !camera.current || !live.current) return;
      try {
        const { PaintedJourney } = await import("@/lib/painting/journey");
        if (disposed || !camera.current || !live.current) return;
        const journey = new PaintedJourney(
          canvases,
          camera.current,
          live.current,
          choice.scene,
          choice.season,
          still,
          {
            onPaintStart: () => stage.setAttribute("data-painting", ""),
            onReady: () => {
              stage.setAttribute("data-painted", "");
              stage.removeAttribute("data-painting");
            },
            onColors: (colors, time) => {
              applyPaintingColors(ks, colors);
              ks.dataset.light = time;
            },
          }
        );
        const onMotion = () => {
          mark();
          journey.wake();
        };
        document.addEventListener("karman:motion", onMotion);
        reduce.addEventListener("change", onMotion);
        dispose = () => {
          document.removeEventListener("karman:motion", onMotion);
          reduce.removeEventListener("change", onMotion);
          journey.dispose();
        };
        await journey.start(choice.replay || !seen);
        try {
          sessionStorage.setItem(PAINTED_KEY, "1");
        } catch {
          /* the opening may play again */
        }
      } catch (error) {
        console.error("[home-journey] the painting could not load", error);
        stage.setAttribute("data-painted", "");
      }
    });
    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);

  return (
    <div ref={host} className="stage journey" aria-hidden="true">
      <div ref={camera} className="cam">
        {TIMES_OF_DAY.map((t) => (
          <canvas key={t} data-light={t} />
        ))}
      </div>
      <div className="glow" />
      <div className="rays" />
      <div className="shade" />
      <canvas ref={live} className="life" />
    </div>
  );
}
