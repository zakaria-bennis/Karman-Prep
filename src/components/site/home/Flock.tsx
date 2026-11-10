"use client";

// A flock of birds in the dawn sky of the home page's opening. They fly in, gather to spell the number in
// the headline, hold it for a moment, then break away and keep flying as a loose flock that steers around
// the pointer. Pressing the headline's pill (it sends "karman:flock") calls them back into the number.
// Drawn on one canvas, simulated by hand: a spring pulls each bird to its place in the number, and a slow
// flow field carries it when it is free. Under reduced motion, or when the painting is held still, the birds
// simply rest in the number.
import { useEffect, useRef } from "react";

interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  flap: number;
  size: number;
  late: number;
}

const HOLD_MS = 2600;
const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");

/** Points that fill the shape of `text`, drawn `size` px tall around (cx, cy). */
function shapeOf(text: string, cx: number, cy: number, size: number, want: number) {
  const c = document.createElement("canvas");
  const w = (c.width = Math.ceil(size * text.length * 0.72));
  const h = (c.height = Math.ceil(size * 1.1));
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return [];
  g.font = `800 ${size}px "Hanken Grotesk", system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2);
  const data = g.getImageData(0, 0, w, h).data;
  const step = Math.max(4, Math.round(size / 30));
  const pts: [number, number][] = [];
  for (let y = 0; y < h; y += step)
    for (let x = 0; x < w; x += step)
      if (data[(y * w + x) * 4 + 3] > 140)
        pts.push([
          cx - w / 2 + x + (Math.random() - 0.5) * step * 0.9,
          cy - h / 2 + y + (Math.random() - 0.5) * step * 0.9,
        ]);
  /* an even spread across the shape, whatever the count */
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts.slice(0, want);
}

export default function Flock({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const g = canvas?.getContext("2d");
    if (!canvas || !host || !g) return;
    let birds: Bird[] = [];
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = 0;
    let mode: "form" | "free" = "form";
    let since = 0;
    let seen = true;
    let disposed = false;
    const pointer = { x: -999, y: -999 };

    const layout = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* the number sits in the open sky: beside the words on a wide screen, above them otherwise */
      const stacked = W < 1100;
      const size = stacked ? Math.min(W * 0.34, 230) : Math.min(W * 0.165, 250);
      const pts = shapeOf(
        text,
        stacked ? W * 0.5 : W * 0.8,
        stacked ? H * 0.21 : H * 0.38,
        size,
        Math.round(Math.min(520, size * 2.1))
      );
      birds = pts.map(([tx, ty], i) => {
        const old = birds[i];
        return {
          x: old?.x ?? W + 40 + Math.random() * 300,
          y: old?.y ?? H * 0.1 + Math.random() * H * 0.5,
          vx: old?.vx ?? -200,
          vy: old?.vy ?? 0,
          tx,
          ty,
          flap: Math.random() * 6.28,
          size: 5 + Math.random() * 4,
          late: Math.random() * 0.9,
        };
      });
    };

    const draw = (t: number) => {
      g.clearRect(0, 0, W, H);
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = "rgba(29, 26, 34, 0.82)";
      for (const b of birds) {
        const heading = Math.atan2(b.vy, b.vx || 0.001);
        const speed = Math.min(1, Math.hypot(b.vx, b.vy) / 60);
        /* wings beat faster in flight, and settle almost flat when the bird is in its place */
        const lift = 0.35 + Math.sin(t * (6 + speed * 8) + b.flap) * (0.18 + speed * 0.4);
        g.lineWidth = b.size * 0.3;
        g.save();
        g.translate(b.x, b.y);
        g.rotate(mode === "form" && speed < 0.3 ? 0 : heading + Math.PI);
        g.beginPath();
        g.moveTo(b.size, -b.size * lift);
        g.quadraticCurveTo(b.size * 0.4, -b.size * lift * 0.2, 0, 0);
        g.quadraticCurveTo(b.size * 0.4, b.size * lift * 0.2, b.size, b.size * lift);
        g.stroke();
        g.restore();
      }
    };

    const step = (dt: number, t: number) => {
      for (const b of birds) {
        if (mode === "form") {
          if (since < b.late) continue;
          /* a spring to its place in the number: quick to arrive, no bounce left by the hold */
          b.vx += ((b.tx - b.x) * 16 - b.vx * 6.5) * dt;
          b.vy += ((b.ty - b.y) * 16 - b.vy * 6.5) * dt;
        } else {
          /* free: a slow field of currents, a drift to the right, and room around the pointer */
          const a =
            Math.sin(b.x * 0.004 + t * 0.25) + Math.cos(b.y * 0.006 - t * 0.2) + b.flap * 0.1;
          b.vx += (Math.cos(a) * 46 + 34 - b.vx) * dt * 1.4;
          b.vy += (Math.sin(a) * 30 - 6 - b.vy) * dt * 1.4;
          const dx = b.x - pointer.x;
          const dy = b.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < 130 && d > 1) {
            b.vx += (dx / d) * 900 * dt;
            b.vy += (dy / d) * 900 * dt;
          }
          if (b.x > W + 30) b.x = -30;
          if (b.x < -40) b.x = W + 20;
          if (b.y < -30) b.y = H * 0.62;
          if (b.y > H * 0.66) b.vy -= 160 * dt;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
    };

    const frame = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (!seen || document.hidden) return;
      if (still()) {
        for (const b of birds) Object.assign(b, { x: b.tx, y: b.ty, vx: 0, vy: 0 });
        mode = "form";
        draw(0);
        return;
      }
      since += dt;
      if (mode === "form" && since * 1000 > HOLD_MS + 1900) {
        mode = "free";
        since = 0;
        for (const b of birds) {
          b.vx = (Math.random() - 0.3) * 260;
          b.vy = (Math.random() - 0.6) * 220;
        }
      }
      step(dt, now / 1000);
      draw(now / 1000);
    };

    const gather = () => {
      mode = "form";
      since = 0;
      for (const b of birds) b.late = Math.random() * 0.5;
    };
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(layout);
    ro.observe(host);
    addEventListener("pointermove", move, { passive: true });
    document.addEventListener("karman:flock", gather);
    /* the number's shape landing in the headline startles them */
    const startle = () => {
      for (const b of birds) {
        b.vx += (Math.random() - 0.5) * 420;
        b.vy -= 120 + Math.random() * 260;
      }
    };
    document.addEventListener("karman:slam", startle);
    /* the number is set in the page's own face, so wait for it before shaping the flock */
    void document.fonts.ready.then(() => {
      if (disposed) return;
      layout();
      last = performance.now();
      raf = requestAnimationFrame(frame);
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      removeEventListener("pointermove", move);
      document.removeEventListener("karman:flock", gather);
      document.removeEventListener("karman:slam", startle);
    };
  }, [text]);

  return <canvas ref={ref} className="flock" aria-hidden="true" />;
}
