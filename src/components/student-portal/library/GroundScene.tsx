"use client";

/*
 * The Library's shared end state behind the box (founder, 2026-11-08: every opening animation
 * leads "to the same library card at the end"): the chosen subject's ground scene, the parabola
 * bridge and lake for Math or the meadow and open book for Reading and Writing (scenes.ts),
 * painted with the backdrop's brushwork in the day's light, full screen behind the box.
 *
 * Both scenes are painted once the page is ready, out of sight, so any intro can land on one
 * (stage-context.ts). Switching course cross-fades between them. Once shown, the scene has its
 * quiet life (birds, glints, petals, letter leaves); reduced motion holds it still.
 */
import { useEffect, useRef } from "react";
import { choosePainting } from "@/lib/painting/schedule";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { prefersStill } from "@/lib/painting/motion";
import { ctx2d } from "@/lib/painting/noise";
import type { TimeOfDay } from "@/lib/painting/light";
import { drawPaintingLife, paintingLife, type PaintingLife } from "@/lib/painting/library/life";
import { renderLibraryScene, type LibraryPicture } from "@/lib/painting/library/scenes";
import { layoutFor, type Slug } from "@/lib/painting/library/seam";
import styles from "./stage.module.css";

const SLUGS: Slug[] = ["math", "reading-writing"];

function readTint() {
  const cs = getComputedStyle(document.documentElement);
  const hue = parseFloat(cs.getPropertyValue("--hue"));
  const sat = parseFloat(cs.getPropertyValue("--hs"));
  return { hue: Number.isFinite(hue) ? hue : 208, sat: Number.isFinite(sat) ? sat : 55 };
}

/** Where the box opens from on a ground: the bridge's crown or the open book (fractions). */
export function groundAnchor(slug: Slug, w: number, h: number): [number, number] {
  const pic = renderAnchors[`${slug}:${layoutFor(w, h)}`];
  return pic ?? [0.5, 0.6];
}
const renderAnchors: Record<string, [number, number]> = {};

export default function GroundScene({ ready, shown }: { ready: boolean; shown: Slug | null }) {
  const host = useRef<HTMLDivElement>(null);
  const cv = useRef<Record<string, HTMLCanvasElement | null>>({});
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    const el = host.current;
    if (!ready || !el || typeof ResizeObserver === "undefined") return;
    const hold = prefersStill();
    const dev = process.env.NODE_ENV !== "production";
    const time: TimeOfDay = choosePainting(new Date(), location.search, dev).time;
    const handles: PaintHandle[] = [];
    let painted = "";
    let raf = 0;
    let resize = 0;
    const pics: Partial<Record<Slug, LibraryPicture>> = {};
    const lives: Partial<Record<Slug, PaintingLife>> = {};

    const paint = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w < 8 || h < 8 || `${w}x${h}` === painted) return;
      painted = `${w}x${h}`;
      handles.splice(0).forEach((p) => p.stop());
      const lay = layoutFor(w, h);
      const tint = readTint();
      for (const s of SLUGS) {
        const pic = renderLibraryScene(s, lay, time, tint, h / w);
        pics[s] = pic;
        delete lives[s];
        if (pic.math) {
          const b = pic.math.bridge;
          renderAnchors[`${s}:${lay}`] = [b.cx, b.base - b.rise];
        } else if (pic.reading) {
          const b = pic.reading.book;
          renderAnchors[`${s}:${lay}`] = [b.cx, b.by - b.ph];
        }
        const c = cv.current[s];
        if (c) handles.push(paintPicture(c, pic.src, { animate: false, width: w, height: h }));
      }
      const lc = cv.current.live;
      if (!lc || hold) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      lc.width = Math.round(w * dpr);
      lc.height = Math.round(h * dpr);
    };

    /* Life for the scene on show. */
    const life = () => {
      const lc = cv.current.live;
      if (!lc || hold) return;
      const g = ctx2d(lc);
      const t0 = performance.now();
      let last = t0;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (document.hidden || now - last < 1000 / 30) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const dpr = lc.width / Math.max(1, w);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        const s = shownRef.current;
        const pic = s ? pics[s] : null;
        if (!s || !pic) return;
        lives[s] ??= paintingLife(pic.life, time, "Georgia, serif");
        const S = Math.min(1.6, Math.max(0.8, Math.sqrt(w * h) / 760));
        drawPaintingLife(
          g,
          lives[s],
          dt,
          (now - t0) / 1000,
          {
            X: (u) => u * w,
            Y: (v) => v * h,
            S,
          },
          1
        );
      };
      raf = requestAnimationFrame(frame);
    };

    const timer = window.setTimeout(() => {
      try {
        paint();
        life();
      } catch (error) {
        console.error("[library] the ground scenes could not load", error);
      }
    }, 0);
    const ro = new ResizeObserver(() => {
      if (!painted) return;
      clearTimeout(resize);
      resize = window.setTimeout(paint, 180);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      clearTimeout(resize);
      cancelAnimationFrame(raf);
      ro.disconnect();
      handles.forEach((p) => p.stop());
    };
  }, [ready]);

  return (
    <div
      ref={host}
      className={styles.groundScene}
      data-shown={shown ?? undefined}
      aria-hidden="true"
    >
      {SLUGS.map((s) => (
        <canvas
          key={s}
          ref={(c) => {
            cv.current[s] = c;
          }}
          className={styles.paint}
          data-ground={s}
        />
      ))}
      <canvas
        ref={(c) => {
          cv.current.live = c;
        }}
        className={styles.paint}
      />
    </div>
  );
}
