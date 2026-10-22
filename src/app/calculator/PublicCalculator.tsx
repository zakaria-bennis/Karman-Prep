"use client";

// The calculator area of /calculator. It reuses the quiz's CalculatorLoader (the one lazy import of
// the calculator, with its loading and Retry panels) inside a plain frame that fills the space
// below the bar. The skin is pinned to "classic" and nothing is saved, so every visit starts blank.

import { useEffect, useRef, useState } from "react";
import type { QuizCalculatorHandle } from "@/components/calculator/host/quiz-host"; // type-only
import { CalculatorLoader } from "@/components/calculator/CalculatorLoader";
import "@/components/calculator/calculator-chrome.generated.css"; // the --kcc-* tokens of the panels
import styles from "./calculator-page.module.css";

const COARSE_POINTER = "(pointer: coarse)";
const ISOLATED_KEY_EVENTS = ["keydown", "keyup", "keypress"] as const;

export function PublicCalculator() {
  const frameRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [chromeSlot, setChromeSlot] = useState<HTMLDivElement | null>(null);
  const [handle, setHandle] = useState<QuizCalculatorHandle | null>(null);

  useEffect(() => {
    setFrame(frameRef.current);
    setChromeSlot(slotRef.current);
  }, []);

  // As in the quiz window, no key event leaves the calculator for the page.
  useEffect(() => {
    if (frame === null) return;
    const stop = (event: Event) => event.stopPropagation();
    for (const type of ISOLATED_KEY_EVENTS) frame.addEventListener(type, stop);
    return () => {
      for (const type of ISOLATED_KEY_EVENTS) frame.removeEventListener(type, stop);
    };
  }, [frame]);

  // Once ready, row 1 takes focus so typing starts at once. On a touch screen the row is only
  // activated, so neither the keypad nor the system keyboard opens until the visitor taps.
  useEffect(() => {
    if (handle === null) return;
    const touch = window.matchMedia?.(COARSE_POINTER).matches ?? false;
    handle.focusOnOpen(touch ? "touch" : "keyboard");
  }, [handle]);

  return (
    <div
      ref={frameRef}
      className={styles.frame}
      data-public-calculator=""
      tabIndex={-1}
      role="region"
      aria-label="Graphing calculator"
    >
      <div ref={slotRef} className={styles.slot} data-calculator-title-slot="" />
      <CalculatorLoader
        active
        frame={frame}
        chromeSlot={chromeSlot}
        reducedMotion={false}
        announceReset={false}
        skin="classic"
        onStatus={() => {}}
        onHandle={setHandle}
      />
    </div>
  );
}
