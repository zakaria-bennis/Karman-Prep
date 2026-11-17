"use client";

// Karman, cross: his brows drawn down, and a paw wagging one finger from side to side. He stands at
// the top of the warning a student gets when the check catches answer-sharing (founder, 2026-11-16).
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { Fox } from "@/components/portal/Fox";
import styles from "./chat.module.css";
import { calm } from "./homeworkMotion";

export function Scold() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || calm()) return;
    const wag = gsap.fromTo(
      el.querySelector("[data-finger]"),
      { rotate: -16, svgOrigin: "44 6" },
      { rotate: 16, duration: 0.32, ease: "sine.inOut", yoyo: true, repeat: -1 }
    );
    const shake = gsap.fromTo(
      el.querySelector("[data-head]"),
      { rotate: -3 },
      {
        rotate: 3,
        duration: 0.64,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        transformOrigin: "50% 90%",
      }
    );
    return () => {
      wag.kill();
      shake.kill();
    };
  }, []);
  return (
    <span ref={ref} className={styles.scold} aria-hidden="true">
      <span data-head>
        <Fox size={112} />
      </span>
      {/* drawn over his face on the fox's own grid: lowered brows, and a firm mouth over his smile */}
      <svg viewBox="-60 -112 120 128">
        <path
          d="M-24 -40L-7 -33M24 -40L7 -33"
          fill="none"
          stroke="#24180F"
          strokeWidth="3.600"
          strokeLinecap="round"
        />
        <path d="M-6 -8h12v6h-12z" fill="#FFF8EE" />
        <path
          d="M-4 -4.500Q0 -7 4 -4.500"
          fill="none"
          stroke="#24180F"
          strokeWidth="1.900"
          strokeLinecap="round"
        />
        {/* his paw, one finger up, wagging */}
        <g data-finger>
          <rect
            x="38"
            y="-10"
            width="13"
            height="14"
            rx="5"
            fill="#F6B652"
            stroke="#CC8020"
            strokeWidth="1.400"
          />
          <rect
            x="41.500"
            y="-30"
            width="6"
            height="24"
            rx="3"
            fill="#F6B652"
            stroke="#CC8020"
            strokeWidth="1.400"
          />
          <path d="M40 -4h9M40 0h9" stroke="#CC8020" strokeWidth="1" strokeLinecap="round" />
        </g>
      </svg>
    </span>
  );
}
