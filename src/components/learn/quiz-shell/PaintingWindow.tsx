"use client";
// The backdrop behind the Challenge and every untimed quiz (founder, 2026-11-08: "painting window"). Today's Karman
// painting, painted once with the portal's brush strokes and then held still: no opening, no
// birds, no particles, so nothing ever moves behind text. Its hue tints the bars. The engine
// loads in its own chunk after the question is on screen.
import { useEffect, useRef } from "react";
import styles from "./quiz-shell.module.css";

export function PaintingWindow() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let gone = false;
    const run = async () => {
      const [{ choosePainting }, { renderLandscape }, { paintPicture }, colors] = await Promise.all(
        [
          import("@/lib/painting/schedule"),
          import("@/lib/painting/scenes"),
          import("@/lib/painting/painterly"),
          import("@/lib/painting/colors"),
        ]
      );
      const el = canvas.current;
      if (gone || !el) return;
      const choice = choosePainting(
        new Date(),
        window.location.search,
        process.env.NODE_ENV !== "production"
      );
      const painted = paintPicture(el, renderLandscape(choice.scene, choice.time), {
        animate: false,
      });
      const hue = colors.pictureColors(painted.final);
      const shell = el.closest<HTMLElement>("[data-quiz-shell]");
      if (hue && shell) colors.applyPaintingColors(shell, hue);
      el.dataset.ready = "true";
    };
    const t = setTimeout(() => {
      run().catch((error) => console.error("[quiz] the painting could not load", error));
    }, 60);
    return () => {
      gone = true;
      clearTimeout(t);
    };
  }, []);
  return <canvas ref={canvas} className={styles.painting} aria-hidden="true" />;
}
