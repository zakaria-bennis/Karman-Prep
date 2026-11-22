"use client";

// The portal's own live landscape (lib/flight) in a start page's window: the Daily 10's picture of today
// (DailyWorld.tsx) and Endless mode's river (EndlessStart.tsx). Day or night follows the portal's light:
// full day in light mode, just after sunset in dark mode (founder, 2026-11-20). It drifts slowly on, and
// is held still when less motion is asked for. It never moves the page's own landscape on: a second,
// small view does not remember how far it flew. A browser that cannot draw it keeps the window's glass.
import { useEffect, useRef } from "react";
import { prefersStill } from "@/lib/painting/motion";
import styles from "./dailyStart.module.css";

export interface WorldView {
  /** How far along the endless route the picture starts. */
  from: number;
  /** One land everywhere. */
  land?: string;
  /** Or the route kept to these lands alone. */
  lands?: readonly string[];
  /** Ride down the river, just above the water. */
  river?: boolean;
}

export function WorldWindow({ from, land, lands, river }: WorldView) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const root = document.documentElement;
    let dispose: (() => void) | null = null;
    let gone = false;
    void import("@/lib/flight/engine").then(({ Flight }) => {
      if (gone) return;
      const dark = () => root.getAttribute("data-kp-mode") === "dark";
      const world = { from, land, lands, river, speed: 0.8, settled: dark() ? 0.15 : 1 };
      const flight = new Flight(el, {
        still: prefersStill,
        night: dark,
        world,
        keep: false,
        onReady: () => el.setAttribute("data-painted", ""),
      });
      if (!flight.start()) return;
      const mode = new MutationObserver(() => {
        world.settled = dark() ? 0.15 : 1;
        flight.wake();
      });
      mode.observe(root, { attributes: true, attributeFilter: ["data-kp-mode"] });
      dispose = () => {
        mode.disconnect();
        flight.dispose();
      };
    });
    return () => {
      gone = true;
      dispose?.();
    };
  }, [from, land, lands, river]);
  return <canvas ref={canvas} className={styles.world} aria-hidden="true" />;
}
