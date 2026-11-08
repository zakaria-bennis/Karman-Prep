"use client";

/*
 * One painted subject picture for the Library's course choice. It composes the subject in the
 * day's light and hue (src/lib/painting/subjects), then paints it in stroke by stroke with the
 * backdrop's own brushwork (painterly.ts), so it belongs to the same painting.
 *
 * Once painted, the picture comes alive with a little of the backdrop's wildlife. Hovering it
 * (`lively`) makes it a little livelier. Reduced motion: painted at once, nothing moves.
 * Life pauses while the tab is hidden or the picture is off screen.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { choosePainting } from "@/lib/painting/schedule";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { drawSubjectLife, subjectLife } from "@/lib/painting/subjects/life";
import { renderSubject, type SubjectArt } from "@/lib/painting/subjects/scenes";
import { ctx2d } from "@/lib/painting/noise";
import { prefersStill } from "@/lib/painting/motion";
import styles from "./heroes.module.css";

const FRAME_MS = 1000 / 30;

function readTint(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const hue = parseFloat(cs.getPropertyValue("--hue"));
  const sat = parseFloat(cs.getPropertyValue("--hs"));
  return { hue: Number.isFinite(hue) ? hue : 208, sat: Number.isFinite(sat) ? sat : 55 };
}

export default function PaintedSubject({
  art,
  still,
  delay = 0,
  ms = 1700,
  brush = 2,
  lively = false,
  className,
  children,
}: {
  art: SubjectArt;
  still: boolean;
  /** Wait this long before the first stroke, in ms (to stagger two pictures). */
  delay?: number;
  /** How long the paint-in takes. */
  ms?: number;
  /** Brush size relative to the picture (see painterly.ts). */
  brush?: number;
  lively?: boolean;
  className?: string;
  /** Drawn over the painting, inside its mask (a sheen on an object). */
  children?: ReactNode;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const paint = useRef<HTMLCanvasElement>(null);
  const live = useRef<HTMLCanvasElement>(null);
  const boost = useRef(1);
  boost.current = lively ? 1.8 : 1;

  useEffect(() => {
    const el = host.current;
    const canvas = paint.current;
    /* No layout or canvas here (a test runner): the frame shows its plain color. */
    if (!el || !canvas || typeof ResizeObserver === "undefined") return;
    /* Reduced motion on the device, or "Keep the painting still" in Sound and motion. */
    const hold = still || prefersStill();
    let handle: PaintHandle | null = null;
    let raf = 0;
    let timer = 0;
    let size = "";
    let visible = true;
    let disposed = false;
    let lifeStop: (() => void) | null = null;

    const startLife = (pic: ReturnType<typeof renderSubject>, w: number, h: number) => {
      const lc = live.current;
      if (!lc || hold || !pic.life.length) return;
      const time = choosePainting(
        new Date(),
        location.search,
        process.env.NODE_ENV !== "production"
      ).time;
      const life = subjectLife(pic.life, time);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      lc.width = Math.round(w * dpr);
      lc.height = Math.round(h * dpr);
      const g = ctx2d(lc);
      const map = { X: (u: number) => u * w, Y: (v: number) => v * h, S: w / 480 };
      const t0 = performance.now();
      let last = t0;
      let alpha = 0;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden || now - last < FRAME_MS) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        alpha = Math.min(1, alpha + dt / 1.2);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        drawSubjectLife(g, life, dt * boost.current, (now - t0) / 1000, map, alpha, boost.current);
      };
      raf = requestAnimationFrame(frame);
      lifeStop = () => {
        cancelAnimationFrame(raf);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, lc.width, lc.height);
      };
    };

    const run = (animate: boolean) => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w < 8 || h < 8) return;
      const key = `${w}x${h}`;
      if (key === size) return;
      size = key;
      handle?.stop();
      lifeStop?.();
      lifeStop = null;
      const time = choosePainting(
        new Date(),
        location.search,
        process.env.NODE_ENV !== "production"
      ).time;
      const pic = renderSubject(art, time, readTint(el), h / w);
      if (pic.mask) {
        const url = `url(${pic.mask.toDataURL()})`;
        el.style.maskImage = url;
        el.style.webkitMaskImage = url;
      }
      handle = paintPicture(canvas, pic.src, {
        animate: animate && !hold,
        ms,
        width: w,
        height: h,
        brush,
        done: () => {
          if (!disposed) startLife(pic, w, h);
        },
      });
    };

    timer = window.setTimeout(() => run(true), hold ? 0 : delay);
    let resize = 0;
    const ro = new ResizeObserver(() => {
      if (!size) return;
      clearTimeout(resize);
      resize = window.setTimeout(() => run(false), 160);
    });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(el);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(resize);
      ro.disconnect();
      io.disconnect();
      handle?.stop();
      lifeStop?.();
    };
  }, [art, still, delay, ms, brush]);

  return (
    <span ref={host} className={`${styles.picture} ${className ?? ""}`} aria-hidden="true">
      <canvas ref={paint} className={styles.paint} />
      <canvas ref={live} className={styles.life} />
      {children}
    </span>
  );
}
