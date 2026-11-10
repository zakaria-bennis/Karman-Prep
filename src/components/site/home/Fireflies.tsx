"use client";

// Fireflies over the grass in the night that closes the home page. They wander on slow currents, pulse, and
// drift toward the pointer when it is near, as fireflies do toward a light. One canvas, simulated by hand,
// drawn only while the section is on screen. Still under reduced motion or when the painting is held still.
import { useEffect, useRef } from "react";

interface Fly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
}

export default function Fireflies() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const g = canvas?.getContext("2d");
    if (!canvas || !host || !g) return;
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = performance.now();
    let seen = false;
    let flies: Fly[] = [];
    const pointer = { x: -999, y: -999 };
    const still = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !!document.getElementById("ks")?.classList.contains("still-motion");
    const layout = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const want = W < 760 ? 16 : 34;
      flies = Array.from(
        { length: want },
        (_, i) =>
          flies[i] ?? {
            x: Math.random() * W,
            y: H * (0.35 + Math.random() * 0.65),
            vx: 0,
            vy: 0,
            phase: Math.random() * 6.28,
            size: 1.6 + Math.random() * 1.8,
          }
      );
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (!seen || document.hidden) return;
      const t = now / 1000;
      g.clearRect(0, 0, W, H);
      if (still()) return;
      for (const f of flies) {
        const a = Math.sin(f.x * 0.006 + t * 0.4 + f.phase) + Math.cos(f.y * 0.008 - t * 0.3);
        f.vx += (Math.cos(a) * 26 - f.vx) * dt * 1.2;
        f.vy += (Math.sin(a) * 18 - 4 - f.vy) * dt * 1.2;
        const dx = pointer.x - f.x;
        const dy = pointer.y - f.y;
        const d = Math.hypot(dx, dy);
        if (d < 280 && d > 24) {
          f.vx += (dx / d) * 150 * dt;
          f.vy += (dy / d) * 150 * dt;
        }
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.x < -20) f.x = W + 10;
        if (f.x > W + 20) f.x = -10;
        if (f.y < H * 0.12) f.vy += 60 * dt;
        if (f.y > H + 10) f.y = H * 0.5;
        const glow = 0.35 + (Math.sin(t * 2.2 + f.phase) * 0.5 + 0.5) * 0.65;
        const halo = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 7);
        halo.addColorStop(0, `rgba(255, 236, 150, ${0.55 * glow})`);
        halo.addColorStop(1, "rgba(255, 236, 150, 0)");
        g.fillStyle = halo;
        g.beginPath();
        g.arc(f.x, f.y, f.size * 7, 0, 6.29);
        g.fill();
        g.fillStyle = `rgba(255, 250, 215, ${glow})`;
        g.beginPath();
        g.arc(f.x, f.y, f.size, 0, 6.29);
        g.fill();
      }
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
    layout();
    addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      removeEventListener("pointermove", move);
    };
  }, []);
  return <canvas ref={ref} className="fireflies" aria-hidden="true" />;
}
