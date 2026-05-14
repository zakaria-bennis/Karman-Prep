"use client";

// ============================================================
// CloudAurora — volumetric gradient blobs that drift slowly
// behind hero content. Gives the page depth and atmosphere.
// Each blob is a pure CSS radial gradient (GPU-friendly transform
// animation only). Mouse + scroll parallax layered on top.
// ============================================================

import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

interface Blob {
  color: string; // rgb triplet
  size: number; // viewport-relative % (width and height)
  x: string; // starting left
  y: string; // starting top
  driftX: number; // px amplitude
  driftY: number; // px amplitude
  duration: number; // seconds per loop
  parallaxStrength: number; // 0..1 — how much mouse/scroll moves this blob
}

const BLOBS: Blob[] = [
  // Violet — "inspire"
  {
    color: "168, 140, 255",
    size: 80,
    x: "-10%",
    y: "-20%",
    driftX: 40,
    driftY: 30,
    duration: 48,
    parallaxStrength: 0.6,
  },
  // Blue — "dream"
  {
    color: "88, 130, 255",
    size: 70,
    x: "55%",
    y: "10%",
    driftX: 50,
    driftY: 25,
    duration: 54,
    parallaxStrength: 0.9,
  },
  // Teal — "achieve"
  {
    color: "80, 220, 200",
    size: 55,
    x: "20%",
    y: "55%",
    driftX: 35,
    driftY: 40,
    duration: 62,
    parallaxStrength: 0.4,
  },
];

export default function CloudAurora() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Scroll parallax — blobs drift up slower than content
  const { scrollY } = useScroll();
  const scrollShift = useTransform(scrollY, [0, 800], [0, -120]);

  // Mouse parallax — track pointer relative to section center
  const mouseX = useRef(0);
  const mouseY = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const el = rootRef.current;
    if (!el) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;

    function onMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // -1..1 relative to center
      targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    }

    function tick() {
      // Ease toward target — 12% per frame = ~150ms to settle
      mouseX.current += (targetX - mouseX.current) * 0.12;
      mouseY.current += (targetY - mouseY.current) * 0.12;
      if (el) {
        el.style.setProperty("--mx", mouseX.current.toFixed(3));
        el.style.setProperty("--my", mouseY.current.toFixed(3));
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  return (
    <motion.div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ y: reduce ? 0 : scrollShift }}
      aria-hidden="true"
    >
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            // Parallax offset applied via CSS var, multiplied by strength.
            // max ~14px of movement keeps it subtle.
            transform: `translate3d(
              calc(var(--mx, 0) * ${14 * b.parallaxStrength}px),
              calc(var(--my, 0) * ${14 * b.parallaxStrength}px),
              0
            )`,
            left: b.x,
            top: b.y,
            width: `${b.size}%`,
            height: `${b.size}%`,
            background: `radial-gradient(circle at center,
              rgba(${b.color}, 0.28) 0%,
              rgba(${b.color}, 0.16) 25%,
              rgba(${b.color}, 0.06) 50%,
              transparent 70%)`,
            filter: "blur(60px)",
            animation: reduce
              ? undefined
              : `cloudDrift${i} ${b.duration}s ease-in-out infinite alternate`,
            willChange: "transform",
          }}
        />
      ))}

      {/* Per-blob keyframes — inlined so durations stay colocated */}
      <style>{`
        @keyframes cloudDrift0 {
          0%   { translate: 0 0; }
          50%  { translate: ${BLOBS[0].driftX}px ${BLOBS[0].driftY}px; }
          100% { translate: ${-BLOBS[0].driftX * 0.6}px ${BLOBS[0].driftY * 0.8}px; }
        }
        @keyframes cloudDrift1 {
          0%   { translate: 0 0; }
          50%  { translate: ${-BLOBS[1].driftX}px ${BLOBS[1].driftY}px; }
          100% { translate: ${BLOBS[1].driftX * 0.7}px ${-BLOBS[1].driftY * 0.5}px; }
        }
        @keyframes cloudDrift2 {
          0%   { translate: 0 0; }
          50%  { translate: ${BLOBS[2].driftX * 0.8}px ${-BLOBS[2].driftY}px; }
          100% { translate: ${-BLOBS[2].driftX}px ${BLOBS[2].driftY * 0.6}px; }
        }
      `}</style>
    </motion.div>
  );
}
