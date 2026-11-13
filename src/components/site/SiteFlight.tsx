"use client";

// The background of the home page and of every page in its world: a lit landscape, fixed behind the page
// and flown as the visitor scrolls (lib/flight). The whole route runs from above the clouds to the open sea;
// the home page flies all of it, and each other page flies its own stretch (`route`, as [from, to] between
// 0 and 1), so every page has its own country and its own time of day. It follows the page's light or dark mode: flipping the
// switch in the top bar makes the sun set or rise where the visitor is. The engine loads in its own chunk
// after the page is up, so the words never wait for it. Reduced motion, or the footer's "Hold the painting
// still", stops the flying and the drifting. A browser that cannot draw it keeps the plain sky behind.
import { useEffect, useRef } from "react";
import { motionPaused } from "./live/motion";

export default function SiteFlight({ route = [0, 1] }: { route?: [number, number] }) {
  const [from, to] = route;
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
          route: [from, to],
          onReady: () => stage.setAttribute("data-painted", ""),
          onLight: (light) => {
            ks.dataset.light = light;
          },
        });
        if (!flight.start()) return;
        /* a page's opening (HeroLab.tsx asks for it with data-intro): the landscape performs, and the page
           is told the moment it begins so its headline can arrive in step */
        const open = () => {
          if (ks.dataset.intro && flight.open()) document.dispatchEvent(new Event("karman:opened"));
        };
        open();
        document.addEventListener("karman:intro", open);
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
          document.removeEventListener("karman:intro", open);
          reduce.removeEventListener("change", onChange);
          flight.dispose();
        };
      } catch (error) {
        console.error("[site-flight] the landscape could not load", error);
      }
    });
    return () => {
      disposed = true;
      dispose?.();
    };
  }, [from, to]);

  return (
    <div ref={host} className="stage flight" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
