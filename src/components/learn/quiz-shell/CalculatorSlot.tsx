"use client";
// Hosts the existing calculator for one question without changing it (spec: Calculator).
// Each question frame owns a CalculatorScope keyed by the question (its AR-58 contract); the
// top-bar button is portalled from the current frame's scope into the bar.
import { useIsPresent } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalculatorScope, CalculatorTrigger } from "@/components/calculator/CalculatorScope";
import { makeQuestionKey } from "@/components/calculator/question-key";

export const CALC_SLOT_ID = "quiz-calculator-slot";

/** The calculator's own toolbar button, unchanged (its focus return and opener memory are part
 * of the calculator's contract), placed in the shell's top bar. */
function CalculatorButton() {
  const present = useIsPresent();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setSlot(document.getElementById(CALC_SLOT_ID)), []);
  if (!present || !slot) return null;
  return createPortal(<CalculatorTrigger />, slot);
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
  // Founder, 2026-11-08: moving to another question plays the close in reverse (the calculator
  // drops, the question slides back), as the X does. The question sliding out keeps its scope
  // enabled so its calculator can drop, but closed, and the shared open state goes to false, so
  // the next question starts closed: never two calculators on screen.
  const present = useIsPresent();
  useEffect(() => {
    if (!present && open) onOpenChange(false);
  }, [present, open, onOpenChange]);
  // An open state carried in from the question before is not this question's open: it is
  // about to turn false (above), so the new question never rises a calculator only to drop it.
  const [carried, setCarried] = useState(open);
  useEffect(() => {
    if (!open) setCarried(false);
  }, [open]);
  const on = enabled && present;
  return (
    <CalculatorScope
      key={questionKey}
      questionKey={questionKey}
      enabled={enabled}
      open={on && open && !carried}
      onOpenChange={onOpenChange}
      dockTop={dockTop}
    >
      {children}
      {on && <CalculatorButton />}
    </CalculatorScope>
  );
}
