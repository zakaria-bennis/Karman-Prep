import { useEffect, type RefObject } from "react";
import { reducedMotionNow } from "../motion";

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

/**
 * Runs a drawing on a canvas sized to its parent (device pixel ratio capped at 2),
 * at a slow frame rate, paused while off screen or hidden, and drawn once and
 * left still under prefers-reduced-motion. t is seconds since start.
 */
export function useCanvasLoop(ref: RefObject<HTMLCanvasElement | null>, draw: Draw, fps = 12) {
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    let reduced = reducedMotionNow();
    const t0 = performance.now();

    const paint = (now: number) => {
      const t = reduced ? 0 : (now - t0) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.scale(dpr, dpr);
      draw(ctx, w, h, t);
    };
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      paint(performance.now());
    };
    const loop = (now: number) => {
      raf = 0;
      if (!visible || reduced || document.hidden) return;
      if (now - last >= 1000 / fps) {
        last = now;
        paint(now);
      }
      raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (!raf && visible && !reduced && !document.hidden) raf = requestAnimationFrame(loop);
    };

    size();
    const ro = new ResizeObserver(size);
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      wake();
    });
    io.observe(canvas);
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      reduced = mq.matches;
      paint(performance.now());
      wake();
    };
    mq.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", wake);
    wake();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mq.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [ref, draw, fps]);
}

/** A tiny seeded random, so a world looks the same on every load and in every screenshot. */
export function seeded(seed: number) {
  let s = seed % 2147483647 || 7;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
