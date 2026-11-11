"use client";

// Where Karman's students go: each university's own logo on a small lit lantern. The lanterns come up
// slowly from the bottom of the section, bump and bounce off one another, and fade out at the top; each one
// then waits its turn and rises again, so all thirty come round (founder, 2026-11-10). A lantern can be
// taken hold of and thrown, or tapped for a small push. They are simulated by hand: every lantern is a
// rounded box that floats upward at its own pace, and two that overlap are pushed apart and trade speed.
// Without scripts, under reduced motion, or when the painting is held still, they sit in plain rows and
// nothing moves; the class "live" marks the moving version (painted.css, .lanterns). The page lists the schools' names once for screen readers.
import { useEffect, useRef } from "react";
import type { School } from "@/lib/marketing/schools";
import SchoolLogo from "./SchoolLogo";

/** How many of the schools are drawn larger: the top twelve. */
const TOP = 12;
/** The share of the section's area the lanterns on screen may cover. */
const FILL = 0.2;
const GAP = 8;
const BOUNCE = 0.55;
const EDGE = 90;

interface Body {
  el: HTMLLIElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rise: number;
  phase: number;
  out: boolean;
  held: boolean;
}

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export default function Lanterns({ schools }: { schools: School[] }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const bodies: Body[] = [...host.querySelectorAll("li")].map((el) => ({
      el,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      w: 0,
      h: 0,
      rise: rnd(20, 32),
      phase: rnd(0, 6.28),
      out: true,
      held: false,
    }));
    /* the order they come round in */
    let queue = [...bodies].sort(() => Math.random() - 0.5);
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = 0;
    let nextAt = 0;
    let seen = false;
    let placed = false;
    let stopped = false;

    const overlaps = (b: Body, x: number, y: number) =>
      bodies.some(
        (o) =>
          o !== b &&
          !o.out &&
          Math.abs(x + b.w / 2 - (o.x + o.w / 2)) < (b.w + o.w) / 2 + GAP &&
          Math.abs(y + b.h / 2 - (o.y + o.h / 2)) < (b.h + o.h) / 2 + GAP
      );
    const area = () => bodies.reduce((sum, b) => sum + (b.out ? 0 : b.w * b.h), 0);

    /** Puts a waiting lantern at (x, y), if there is room for it there. */
    const enter = (b: Body, y: number) => {
      for (let tries = 0; tries < 14; tries++) {
        const x = rnd(0, Math.max(1, W - b.w));
        if (overlaps(b, x, y)) continue;
        Object.assign(b, { x, y, vx: rnd(-6, 6), vy: -b.rise, out: false });
        return true;
      }
      return false;
    };

    const measure = () => {
      W = host.clientWidth;
      H = host.clientHeight;
      for (const b of bodies) {
        b.w = b.el.offsetWidth;
        b.h = b.el.offsetHeight;
      }
    };

    /** The first screenful: lanterns already in the air, at every height. */
    const fill = () => {
      placed = true;
      for (const b of [...queue]) {
        if (area() + b.w * b.h > W * H * FILL) break;
        if (enter(b, rnd(-b.h * 0.3, H - b.h))) queue = queue.filter((q) => q !== b);
      }
    };

    const paint = () => {
      for (const b of bodies) {
        if (b.out) {
          b.el.style.opacity = "0";
          continue;
        }
        const fade = Math.min(1, (H - b.y) / EDGE, (b.y + b.h * 0.6) / EDGE);
        b.el.style.opacity = Math.max(0, fade).toFixed(3);
        b.el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0)`;
      }
    };

    const step = (dt: number, t: number) => {
      for (const b of bodies) {
        if (b.out || b.held) continue;
        /* it floats: always easing back to its own slow climb, with a little side-to-side drift */
        b.vy += (-b.rise - b.vy) * 1.1 * dt;
        b.vx += (Math.sin(t * 0.5 + b.phase) * 7 - b.vx) * 0.7 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx) * BOUNCE;
        } else if (b.x > W - b.w) {
          b.x = W - b.w;
          b.vx = -Math.abs(b.vx) * BOUNCE;
        }
        if (b.y > H + 20) b.vy = -Math.abs(b.vy);
        if (b.y < -b.h) {
          b.out = true;
          queue.push(b);
        }
      }
      /* two that overlap are pushed apart along the shorter way out, and trade speed along it */
      for (let i = 0; i < bodies.length; i++) {
        const a = bodies[i];
        if (a.out) continue;
        for (let j = i + 1; j < bodies.length; j++) {
          const b = bodies[j];
          if (b.out) continue;
          const dx = a.x + a.w / 2 - (b.x + b.w / 2);
          const dy = a.y + a.h / 2 - (b.y + b.h / 2);
          const ox = (a.w + b.w) / 2 + GAP - Math.abs(dx);
          const oy = (a.h + b.h) / 2 + GAP - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          const alongX = ox < oy;
          const sign = (alongX ? dx : dy) >= 0 ? 1 : -1;
          const push = (alongX ? ox : oy) * sign;
          const shareA = a.held ? 0 : b.held ? 1 : 0.5;
          const va = alongX ? a.vx : a.vy;
          const vb = alongX ? b.vx : b.vy;
          const closing = (va - vb) * sign < 0;
          const give = closing ? ((1 + BOUNCE) / 2) * (va - vb) : 0;
          if (alongX) {
            a.x += push * shareA;
            b.x -= push * (1 - shareA);
            if (!a.held) a.vx -= b.held ? give * 2 : give;
            if (!b.held) b.vx += a.held ? give * 2 : give;
          } else {
            a.y += push * shareA;
            b.y -= push * (1 - shareA);
            if (!a.held) a.vy -= b.held ? give * 2 : give;
            if (!b.held) b.vy += a.held ? give * 2 : give;
          }
        }
      }
      /* the next one in line comes up from below when there is room in the sky for it */
      if (t > nextAt && queue.length && area() + queue[0].w * queue[0].h < W * H * FILL) {
        const b = queue[0];
        if (enter(b, H - 4)) queue.shift();
        nextAt = t + rnd(0.5, 1.1);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const hold = still();
      if (hold !== stopped) {
        stopped = hold;
        if (hold) {
          /* back to plain rows, exactly as the page is without scripts */
          host.classList.remove("live");
          placed = false;
          for (const b of bodies) {
            b.out = true;
            b.held = false;
            b.el.removeAttribute("style");
          }
          queue = [...bodies].sort(() => Math.random() - 0.5);
        }
      }
      if (hold) return;
      if (!placed) {
        host.classList.add("live");
        measure();
        if (!bodies.every((b) => b.w > 0)) return;
        fill();
        paint();
      }
      /* in the air from the start, but only moving while the section is on screen */
      if (!seen || document.hidden) return;
      step(dt, now / 1000);
      paint();
    };

    /* take hold of one and throw it; a tap gives it a small push upward */
    let grab: { b: Body; dx: number; dy: number; px: number; py: number; t: number } | null = null;
    const point = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const down = (e: PointerEvent) => {
      const b = bodies.find((o) => o.el === (e.target as Element).closest("li"));
      if (!b || b.out || stopped) return;
      const [px, py] = point(e);
      b.held = true;
      b.el.dataset.held = "";
      b.vx = b.vy = 0;
      grab = { b, dx: px - b.x, dy: py - b.y, px, py, t: performance.now() };
      host.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!grab) return;
      const [px, py] = point(e);
      const now = performance.now();
      const dt = Math.max(0.008, (now - grab.t) / 1000);
      const { b } = grab;
      b.vx = b.vx * 0.5 + ((px - grab.px) / dt) * 0.5;
      b.vy = b.vy * 0.5 + ((py - grab.py) / dt) * 0.5;
      b.x = Math.min(W - b.w, Math.max(0, px - grab.dx));
      b.y = Math.min(H - b.h * 0.4, Math.max(-b.h * 0.5, py - grab.dy));
      Object.assign(grab, { px, py, t: now });
    };
    const up = () => {
      if (!grab) return;
      const { b } = grab;
      b.held = false;
      delete b.el.dataset.held;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed < 40) b.vy = -150;
      else if (speed > 900) {
        b.vx *= 900 / speed;
        b.vy *= 900 / speed;
      }
      grab = null;
    };
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerup", up);
    host.addEventListener("pointercancel", up);

    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting), {
      rootMargin: "120px",
    });
    io.observe(host);
    const ro = new ResizeObserver(() => {
      measure();
      for (const b of bodies) if (!b.out) b.x = Math.min(b.x, Math.max(0, W - b.w));
    });
    ro.observe(host);
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <ul ref={ref} className="lanterns" aria-hidden="true">
      {schools.map((s, i) => (
        <li key={s.name} data-big={i < TOP || undefined}>
          <SchoolLogo school={s} />
        </li>
      ))}
    </ul>
  );
}
