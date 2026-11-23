"use client";

// Karman, cross: his brows drawn down, shaking his head no (just his face, no hand). He stands at
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
    // he shakes his head: no. Three turns, a rest, and again.
    const shake = gsap
      .timeline({ repeat: -1, repeatDelay: 0.9 })
      .to(el, { x: -9, rotate: -7, duration: 0.16, ease: "sine.inOut" })
      .to(el, { x: 9, rotate: 7, duration: 0.3, ease: "sine.inOut", yoyo: true, repeat: 3 })
      .to(el, { x: 0, rotate: 0, duration: 0.22, ease: "sine.out" });
    return () => {
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
      </svg>
    </span>
  );
}
