"use client";

// Birds in the dawn sky of the home page's opening: two or three small flocks, far off, crossing the sky
// and gone. They are background and nothing else. They spell nothing and they take no notice of the pointer
// (founder, 2026-11-10). Drawn on one canvas. Under reduced motion, or when the painting is held still, they
// hang where they are.
import { useEffect, useRef } from "react";

interface Bird {
  /** Its place in the flock, in px behind and beside the leader. */
  ox: number;
  oy: number;
  flap: number;
  sway: number;
  size: number;
}

interface FlockOf {
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  climb: number;
  depth: number;
  birds: Bird[];
}

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** A loose V: the leader in front, the rest trailing back on two uneven arms. */
function makeFlock(W: number, H: number, at?: number): FlockOf {
  const dir = Math.random() < 0.7 ? 1 : -1;
  const depth = rnd(0.55, 1);
  const count = Math.round(rnd(7, 15));
  const gap = 20 * depth;
  const birds: Bird[] = [];
  for (let i = 0; i < count; i++) {
    const arm = i % 2 ? 1 : -1;
    const row = Math.ceil(i / 2);
    birds.push({
      ox: -row * gap * rnd(0.85, 1.3),
      oy: arm * row * gap * rnd(0.35, 0.75) + rnd(-5, 5),
      flap: rnd(0, 6.28),
      sway: rnd(0, 6.28),
      size: (5 + Math.random() * 3) * depth,
    });
  }
  const span = (count / 2) * gap * 1.4;
  return {
    x: at ?? (dir > 0 ? -span - 30 : W + span + 30),
    y: rnd(H * 0.1, H * 0.46),
    dir,
    speed: rnd(26, 46) * depth,
    climb: rnd(-5, 2),
    depth,
    birds,
  };
}

export default function Flock() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const g = canvas?.getContext("2d");
    if (!canvas || !host || !g) return;
    let flocks: FlockOf[] = [];
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = 0;
    let nextAt = 0;
    let seen = true;

    const layout = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* one flock is already on its way across when the page opens, in the open sky beside the words */
      if (!flocks.length) flocks = [makeFlock(W, H, W * rnd(0.55, 0.8))];
    };

    const draw = (t: number) => {
      g.clearRect(0, 0, W, H);
      g.lineCap = "round";
      g.lineJoin = "round";
      for (const f of flocks) {
        g.strokeStyle = `rgba(29, 26, 34, ${(0.34 + f.depth * 0.42).toFixed(2)})`;
        for (const b of f.birds) {
          const x = f.x + b.ox * f.dir + Math.sin(t * 0.7 + b.sway) * 4;
          const y = f.y + b.oy + Math.cos(t * 0.9 + b.sway) * 3;
          /* a few slow beats, then a glide */
          const beat = Math.sin(t * 5.2 + b.flap);
          const lift = 0.42 + beat * 0.34 * (0.55 + 0.45 * Math.sin(t * 0.6 + b.sway));
          g.lineWidth = Math.max(1, b.size * 0.28);
          g.beginPath();
          g.moveTo(x - b.size * f.dir, y - b.size * lift);
          g.quadraticCurveTo(x - b.size * 0.4 * f.dir, y - b.size * lift * 0.2, x, y);
          g.quadraticCurveTo(
            x - b.size * 0.4 * f.dir,
            y + b.size * lift * 0.2,
            x - b.size * f.dir,
            y + b.size * lift
          );
          g.stroke();
        }
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!seen || document.hidden) return;
      const t = now / 1000;
      if (still()) return draw(0);
      for (const f of flocks) {
        f.x += f.speed * f.dir * dt;
        f.y += f.climb * dt;
      }
      flocks = flocks.filter((f) => f.x > -500 && f.x < W + 500 && f.y > -80);
      if (flocks.length < 3 && t > nextAt) {
        flocks.push(makeFlock(W, H));
        nextAt = t + rnd(5, 11);
      }
      draw(t);
    };

    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(layout);
    ro.observe(host);
    layout();
    last = performance.now();
    nextAt = last / 1000 + rnd(2, 4);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="flock" aria-hidden="true" />;
}
