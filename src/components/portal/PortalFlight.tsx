"use client";

/*
 * The home page's flown landscape behind every portal (founder, 2026-11-12: "on all the websites,
 * sub pages, portals, and homepage"). The same engine as the public site (lib/flight, SiteFlight):
 * scrolling flies a stretch of the route, and day or night follows the portal's mode
 * (`data-kp-mode` on the root, which follows the device unless somebody flipped the switch).
 * Reduce motion, the device's or the one in Settings, holds it still. The engine loads in its own
 * chunk after the page is up; a browser that cannot draw it keeps the plain sky behind.
 */
import { useEffect, useRef } from "react";
import { MOTION_EVENT, prefersStill } from "@/lib/painting/motion";

/** The stretch every portal flies: late morning over the valleys, calm behind dense pages. */
export const PORTAL_ROUTE: [number, number] = [0.3, 0.5];

export default function PortalFlight({ route = PORTAL_ROUTE }: { route?: [number, number] }) {
  const [from, to] = route;
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const stage = host.current;
    const el = canvas.current;
    if (!stage || !el) return;
    let disposed = false;
    let dispose: (() => void) | null = null;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");

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
          still: prefersStill,
          night: () => root.getAttribute("data-kp-mode") === "dark",
          route: [from, to],
          onReady: () => stage.setAttribute("data-painted", ""),
        });
        if (!flight.start()) return;
        const wake = () => flight.wake();
        const mode = new MutationObserver(wake);
        mode.observe(root, { attributes: true, attributeFilter: ["data-kp-mode"] });
        window.addEventListener(MOTION_EVENT, wake);
        reduce.addEventListener("change", wake);
        dispose = () => {
          mode.disconnect();
          window.removeEventListener(MOTION_EVENT, wake);
          reduce.removeEventListener("change", wake);
          flight.dispose();
        };
      } catch (error) {
        console.error("[portal-flight] the landscape could not load", error);
      }
    });
    return () => {
      disposed = true;
      dispose?.();
    };
  }, [from, to]);

  return (
    <div ref={host} className="kp-backdrop kp-flight" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
