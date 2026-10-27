"use client";
// Hosts the existing calculator for one question without changing it (spec: Calculator).
// Each question frame owns a CalculatorScope keyed by the question (its AR-58 contract); the
// top-bar button is portalled from the current frame's scope into the bar.
import { useIsPresent } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalculatorScope, useCalculator } from "@/components/calculator/CalculatorScope";
import { makeQuestionKey } from "@/components/calculator/question-key";
import shell from "./quiz-shell.module.css";
import { CalculatorIcon } from "./icons";

export const CALC_SLOT_ID = "quiz-calculator-slot";

function CalculatorButton() {
  const bridge = useCalculator();
  const present = useIsPresent();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setSlot(document.getElementById(CALC_SLOT_ID)), []);
  if (!bridge || !present || !slot) return null;
  return createPortal(
    <button
      type="button"
      className={shell.tool}
      aria-label="Toggle Karman calculator"
      aria-pressed={bridge.open}
      data-calculator-trigger=""
      onPointerEnter={bridge.prefetch}
      onFocus={bridge.prefetch}
      onClick={() => bridge.toggle()}
    >
      <CalculatorIcon />
      <span>Calculator</span>
    </button>,
    slot
  );
}

export function CalculatorFrame({
  enabled,
  attemptKey,
  questionId,
  open,
  onOpenChange,
  dockTop,
  children,
}: {
  enabled: boolean;
  attemptKey: string;
  questionId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  dockTop: number;
  children: ReactNode;
}) {
  const questionKey = makeQuestionKey(attemptKey, questionId);
  // A question that is sliding out gives up its calculator at once: one calculator on screen.
  const present = useIsPresent();
  const on = enabled && present;
  return (
    <CalculatorScope
      key={questionKey}
      questionKey={questionKey}
      enabled={on}
      open={on && open}
      onOpenChange={onOpenChange}
      dockTop={dockTop}
    >
      {children}
      {on && <CalculatorButton />}
    </CalculatorScope>
  );
}
