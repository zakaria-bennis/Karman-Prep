"use client";

// The Daily 10's picture of today (DailyStart.tsx): the portal's own live landscape (lib/flight), real
// sunlight and shade, trees, meadows in flower, water, in a window of its own (founder, 2026-11-20:
// "photorealistic light and more intricate details in the flora and fauna", no drawn eclipse of a
// moon). A different land every day, dealt from the date, from the greenest ones; day or night follows
// the portal's light like the landscape behind every page. It drifts slowly on; held still when less
// motion is asked for. A browser that cannot draw it keeps the window's plain glass.
import { useEffect, useRef } from "react";
import { prefersStill } from "@/lib/painting/motion";
import styles from "./dailyStart.module.css";

/** The lands with the most life in them: flowers, trees, water. */
const LANDS = [
  "flower-fields",
  "alpine-valley",
  "blossom-grove",
  "green-hills",
  "lavender-fields",
  "autumn-forest",
  "pine-forest",
  "wetlands",
  "rice-terraces",
  "lagoon",
  "savanna",
  "bamboo-forest",
];

export function DailyWorld({ day }: { day: Date }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const seed = day.getFullYear() * 400 + day.getMonth() * 32 + day.getDate();
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const root = document.documentElement;
    let dispose: (() => void) | null = null;
    let gone = false;
    void import("@/lib/flight/engine").then(({ Flight }) => {
      if (gone) return;
      const flight = new Flight(el, {
        still: prefersStill,
        night: () => root.getAttribute("data-kp-mode") === "dark",
        world: { land: LANDS[seed % LANDS.length], from: 40 + (seed % 89) * 5, speed: 0.8 },
        keep: false,
        onReady: () => el.setAttribute("data-painted", ""),
      });
      if (!flight.start()) return;
      const mode = new MutationObserver(() => flight.wake());
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
  }, [seed]);
  return <canvas ref={canvas} className={styles.world} aria-hidden="true" />;
}
