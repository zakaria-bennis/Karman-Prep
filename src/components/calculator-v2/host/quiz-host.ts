// Lazy quiz entry (01-interfaces-integration.md section 12): 11's loader imports this module and
// mounts calculator v2 inside CalculatorWindow. AR-35 limits it to the public API, focusBoundary()
// and the internal channels of 10 Decision 6 (reflow, engine, lastFocusedRow).

import { reportCalculatorError } from "@/components/calculator/report-error";
import { KarmanCalculator, lastFocusedRow } from "../KarmanCalculator";
import { CALCULATOR_V2_BUILD } from "../styles/generated";
import { exposeEngineForTests } from "../ui/hooks/dev-hooks";

export type OpenTrigger = "mouse" | "keyboard" | "touch";

export interface QuizMountOptions {
  element: HTMLElement; // shadow host inside CalculatorWindow
  frame: HTMLElement; // CalculatorWindow frame; receives DOM focus on a touch open (OI-7)
  chromeSlot: HTMLElement;
  reducedMotion: boolean; // !useQuizAnimations() (AN-13)
  announceReset: boolean; // OI-3: true only when the window stayed open across the question change
}

export interface QuizCalculatorHandle {
  readonly calculator: KarmanCalculator;
  focusOnOpen(trigger: OpenTrigger): void;
  focusBoundary(edge: "first" | "last"): void;
  setReducedMotion(value: boolean): void;
  reflow(): void; // AR-41, called by 11's loader when fonts load
  destroy(): void;
}

export function mountQuizCalculator(options: QuizMountOptions): QuizCalculatorHandle {
  const calculator = new KarmanCalculator(
    options.element,
    {
      reducedMotion: options.reducedMotion,
      onError: (error) => reportCalculatorError(error, CALCULATOR_V2_BUILD),
    },
    { chromeSlot: options.chromeSlot, announceResetOnMount: options.announceReset }
  );
  const unexpose = exposeEngineForTests(calculator.engine);
  let destroyed = false;

  return {
    calculator,
    // KB-4: the last focused row, else row 1. Task 7 gives "touch" its OI-7 branch.
    focusOnOpen() {
      calculator.focusExpression(lastFocusedRow(calculator) ?? calculator.getExpressions()[0].id);
    },
    focusBoundary(edge) {
      calculator.focusBoundary(edge);
    },
    setReducedMotion(value) {
      calculator.updateSettings({ reducedMotion: value });
    },
    reflow() {
      calculator.reflow();
    },
    // AR-60: idempotent; clears the test global before tearing the calculator down.
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unexpose();
      calculator.destroy();
    },
  };
}
