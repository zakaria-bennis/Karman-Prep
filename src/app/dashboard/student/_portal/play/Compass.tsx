"use client";
// The strategy quiz's compass (founder, 2026-11-16): a needle of two arrowheads joined at the middle,
// one red and one blue (never a stick), no center dot, and notch marks for N, S, E, W and the four
// diagonals. `swing` sets it spinning and settling on north, as a compass does when picked up.
import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import { prefersStill } from "@/lib/painting/motion";

export function Compass({ size = 120, swing = false }: { size?: number; swing?: boolean }) {
  const needle = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    const el = needle.current;
    if (!el || !swing || prefersStill()) return;
    const tl = gsap
      .timeline()
      .fromTo(el, { rotation: -200 }, { rotation: 28, duration: 0.9, ease: "power2.out" })
      .to(el, { rotation: -12, duration: 0.5, ease: "sine.inOut" })
      .to(el, { rotation: 5, duration: 0.45, ease: "sine.inOut" })
      .to(el, { rotation: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
    gsap.set(el, { transformOrigin: "50% 50%" });
    return () => void tl.kill();
  }, [swing]);
  const notches = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="rgb(255 255 255 / 0.14)"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <circle
        cx="60"
        cy="60"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      {notches.map((a) => {
        const long = a % 90 === 0;
        return (
          <line
            key={a}
            x1="60"
            y1={long ? 8 : 10}
            x2="60"
            y2={long ? 19 : 15}
            stroke="currentColor"
            strokeOpacity={long ? 0.75 : 0.45}
            strokeWidth={long ? 3 : 2}
            strokeLinecap="round"
            transform={`rotate(${a} 60 60)`}
          />
        );
      })}
      <text
        x="60"
        y="31"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="currentColor"
        opacity="0.8"
      >
        N
      </text>
      <g ref={needle}>
        {/* north: red; south: blue; two arrowheads meeting in the middle */}
        <path d="M60 22 L71 60 L49 60 Z" fill="#e5484d" />
        <path d="M60 22 L60 60 L49 60 Z" fill="#b8282d" />
        <path d="M60 98 L49 60 L71 60 Z" fill="#3d7bff" />
        <path d="M60 98 L60 60 L71 60 Z" fill="#2457c9" />
      </g>
    </svg>
  );
}
