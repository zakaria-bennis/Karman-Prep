"use client";

// Who teaches: the tutors' photos on a slowly turning arc (founder, 2026-11-10). The photos wait in a stack
// at the left end; when the section arrives they fan out along a half circle, which then turns like a wheel
// whose lower half is out of sight: a photo rises at the left, crosses the top and sets at the right, and
// comes round again. The title of whoever is at the top pops up in the middle of the arc. Pointing at a
// photo holds the wheel and shows that tutor's title. Every photo is on the wheel twice, opposite itself,
// so the visible half always holds the full set. Under reduced motion, or when the painting is held still,
// the arc is simply there and does not turn.
import { useEffect, useRef, useState } from "react";

/** Seconds for the wheel to move one photo along. */
const STEP_S = 3.8;
const FAN_MS = 1500;
/** The half circle inside its box: centre at the bottom middle, radii as a share of the box. */
const RX = 0.44;
const RY = 0.86;

const still = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !!document.getElementById("ks")?.classList.contains("still-motion");
const ease = (t: number) => 1 - (1 - t) ** 4;

export default function TutorArc({
  photos,
  kinds,
}: {
  /** Each photo, with the index of its kind in `kinds`. */
  photos: { src: string; kind: number }[];
  /** The kinds of tutor, as [name, line]. */
  kinds: [string, string][];
}) {
  const host = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [live, setLive] = useState(false);
  const held = useRef<number | null>(null);
  const n = photos.length;

  useEffect(() => {
    const el = host.current;
    if (!el || !n) return;
    const dots = [...el.querySelectorAll<HTMLElement>(".arc-dot")];
    const gap = 360 / dots.length;
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = performance.now();
    let turn = gap / 2;
    let fanAt = 0;
    let shown = -1;
    let seen = true;
    let arrived = false;

    const measure = () => {
      W = el.clientWidth;
      H = el.clientHeight;
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!seen || document.hidden) return;
      const hold = still();
      if (arrived && !fanAt) fanAt = now;
      const fan = hold ? 1 : fanAt ? ease(Math.min(1, (now - fanAt) / FAN_MS)) : 0;
      if (fan === 1 && !hold && held.current === null) turn = (turn + (gap / STEP_S) * dt) % 360;
      let best = -2;
      let bestAt = 0;
      dots.forEach((dot, i) => {
        /* its place on the wheel: 180 is the left end, 90 the top, 0 the right end, below that out of sight */
        const place = 180 - ((i * gap + turn) % 360);
        const a = ((180 - fan * (180 - place)) * Math.PI) / 180;
        const up = Math.sin(a);
        const first = i < n;
        /* in the stack every photo of the first set shows; on the wheel only those above the horizon */
        const onWheel = Math.min(1, Math.max(0, (up + 0.02) / 0.34));
        const opacity = first ? Math.max(onWheel, 1 - fan) : onWheel * fan;
        const x = W * (0.5 + RX * Math.cos(a)) + (first ? (1 - fan) * i * 9 : 0);
        const y = H * (1 - RY * up) - (first ? (1 - fan) * i * 6 : 0) - (1 - fan) * H * 0.12;
        const scale = 0.74 + 0.46 * Math.max(0, up) ** 1.4;
        dot.style.opacity = opacity.toFixed(3);
        dot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)}) rotate(${((1 - fan) * (i - n / 2) * 4).toFixed(2)}deg)`;
        dot.style.zIndex = String(Math.round(10 + up * 10));
        dot.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
        if (up > best) {
          best = up;
          bestAt = i;
        }
      });
      if (fan === 1) {
        const now_ = held.current ?? bestAt % n;
        if (now_ !== shown) {
          shown = now_;
          setTop(now_);
          setLive(true);
        }
      }
    };
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting), {
      rootMargin: "160px",
    });
    io.observe(el);
    /* the fan opens once a good part of the arc is on screen */
    const arrive = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        arrived = true;
        arrive.disconnect();
      },
      { threshold: 0.4 }
    );
    arrive.observe(el);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      arrive.disconnect();
      ro.disconnect();
    };
  }, [n]);

  if (!n) return null;
  const kind = kinds[photos[top % n].kind];
  return (
    <div className="arc" ref={host}>
      {[...photos, ...photos].map((p, i) => (
        <button
          key={i}
          type="button"
          className="arc-dot"
          tabIndex={i < n ? 0 : -1}
          aria-hidden={i < n ? undefined : true}
          aria-label={i < n ? kinds[p.kind][0] : undefined}
          onPointerEnter={() => (held.current = i % n)}
          onPointerLeave={() => (held.current = null)}
          onFocus={() => (held.current = i % n)}
          onBlur={() => (held.current = null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- small portrait photos */}
          <img src={p.src} alt="" decoding="async" draggable={false} />
        </button>
      ))}
      <p className="arc-title" data-live={live || undefined} aria-live="off">
        <b key={kind[0]}>{kind[0]}</b>
        <span key={`${kind[0]}-line`}>{kind[1]}</span>
      </p>
    </div>
  );
}
