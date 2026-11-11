"use client";

// The home page's background: a lit landscape, fixed behind the page and flown from above the clouds to
// the open sea as the visitor scrolls (lib/flight). It follows the page's light or dark mode: flipping the
// switch in the top bar makes the sun set or rise where the visitor is. The engine loads in its own chunk
// after the page is up, so the words never wait for it. Reduced motion, or the footer's "Hold the painting
// still", stops the flying and the drifting. A browser that cannot draw it keeps the plain sky behind.
import { useEffect, useRef } from "react";
import { motionPaused } from "../live/motion";

export default function HomeFlight() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ks = document.getElementById("ks");
    const stage = host.current;
    const el = canvas.current;
    if (!ks || !stage || !el) return;
    let disposed = false;
    let dispose: (() => void) | null = null;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const still = () => reduce.matches || motionPaused();
    const mark = () => ks.classList.toggle("still-motion", still());
    mark();

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    const later = (fn: () => void) =>
      w.requestIdleCallback ? w.requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 80);

    later(async () => {
      if (disposed) return;
      try {
        const { Flight } = await import("@/lib/flight/engine");
        if (disposed) return;
        const flight = new Flight(el, {
          still,
          night: () => ks.dataset.mode === "dark",
          onReady: () => stage.setAttribute("data-painted", ""),
          onLight: (light) => {
            ks.dataset.light = light;
          },
        });
        if (!flight.start()) return;
        const onChange = () => {
          mark();
          flight.wake();
        };
        const mode = new MutationObserver(onChange);
        mode.observe(ks, { attributes: true, attributeFilter: ["data-mode"] });
        document.addEventListener("karman:motion", onChange);
        reduce.addEventListener("change", onChange);
        dispose = () => {
          mode.disconnect();
          document.removeEventListener("karman:motion", onChange);
          reduce.removeEventListener("change", onChange);
          flight.dispose();
        };
      } catch (error) {
        console.error("[home-flight] the landscape could not load", error);
      }
    });
    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);

  return (
    <div ref={host} className="stage flight" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
