import "katex/dist/katex.min.css";
// Lazy quiz entry (01-interfaces-integration.md section 12): 11's loader imports this module and
// mounts calculator inside CalculatorWindow. AR-35 limits it to the public API, focusBoundary()
// and the internal channels of 10 Decision 6 (reflow, engine, lastFocusedRow). The KaTeX stylesheet
// is imported at document scope so its @font-face rules reach the shadow root (AR-39, AR-40).

import { reportCalculatorError } from "@/components/calculator/report-error";
import type { TransferResult, TransferTrigger } from "@/lib/calculator-transfer/payload";
import { KarmanCalculator, lastFocusedRow } from "../KarmanCalculator";
import { CALCULATOR_BUILD } from "../styles/generated";
import { applyTransfer as applyTransferPayload } from "../transfer/apply";
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
  applyTransfer(payload: unknown, trigger: TransferTrigger): TransferResult; // added by 12-transfer-core
}

export function mountQuizCalculator(options: QuizMountOptions): QuizCalculatorHandle {
  const calculator = new KarmanCalculator(
    options.element,
    {
      reducedMotion: options.reducedMotion,
      onError: (error) => reportCalculatorError(error, CALCULATOR_BUILD),
    },
    { chromeSlot: options.chromeSlot, announceResetOnMount: options.announceReset }
  );
  const unexpose = exposeEngineForTests(calculator.engine);
  let destroyed = false;

  return {
    calculator,
    // KB-4: the last focused row, else row 1. A touch or pen open only activates that row and
    // focuses the frame, so neither the keypad nor the system keyboard opens (OI-7, K-2).
    focusOnOpen(trigger) {
      const id = lastFocusedRow(calculator) ?? calculator.getExpressions()[0].id;
      if (trigger === "touch") {
        calculator.activateExpression(id);
        options.frame.focus({ preventScroll: true });
        return;
      }
      calculator.focusExpression(id);
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
    // TR-71: the bridge's payload goes through the lazy apply step with this calculator as target.
    applyTransfer: (payload, trigger) => applyTransferPayload(calculator, payload, trigger),
    // AR-60: idempotent; clears the test global before tearing the calculator down.
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unexpose();
      calculator.destroy();
    },
  };
}
