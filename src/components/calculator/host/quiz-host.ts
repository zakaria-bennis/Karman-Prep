// Lazy quiz entry: the loader imports this module and
// mounts calculator inside CalculatorWindow. AR-35 limits it to the public API, focusBoundary()
// and the internal channels of (reflow, engine, lastFocusedRow). The math uses the system Times
// stack (--kc-font-math), so no font stylesheet is imported (AR-39, AR-40).

import { reportCalculatorError } from "@/components/calculator/report-error";
import type { TransferResult, TransferTrigger } from "@/lib/calculator-transfer/payload";
import type { ThemeChoice } from "@/lib/calculator/theme/choice";
import { KarmanCalculator, lastFocusedRow } from "../KarmanCalculator";
import { preferencesOf, type CalculatorPreferences } from "../calculator-window-store";
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
  // The student's settings from the previous question's calculator (owner decision, 2026-10-21);
  // absent or null on the page's first calculator, which keeps the defaults.
  preferences?: CalculatorPreferences | null;
  onPreferences?(preferences: CalculatorPreferences): void; // after each settings change and on destroy
  // The theme until the student picks one in Settings: absent in the quiz ("auto", the site
  // theme); "classic" on the /calculator page.
  defaultTheme?: ThemeChoice;
}

export interface QuizCalculatorHandle {
  readonly calculator: KarmanCalculator;
  focusOnOpen(trigger: OpenTrigger): void;
  focusBoundary(edge: "first" | "last"): void;
  setReducedMotion(value: boolean): void;
  reflow(): void; // AR-41, called by the loader when fonts load
  destroy(): void;
  applyTransfer(payload: unknown, trigger: TransferTrigger): TransferResult;
}

export function mountQuizCalculator(options: QuizMountOptions): QuizCalculatorHandle {
  const calculator = new KarmanCalculator(
    options.element,
    {
      reducedMotion: options.reducedMotion,
      onError: (error) => reportCalculatorError(error, CALCULATOR_BUILD),
    },
    {
      chromeSlot: options.chromeSlot,
      announceResetOnMount: options.announceReset,
      defaultTheme: options.defaultTheme,
    }
  );
  // Everything else starts blank (AR-58); the carried settings are applied before the first frame.
  if (options.preferences) {
    try {
      calculator.updateSettings(options.preferences);
    } catch (error) {
      reportCalculatorError(error, CALCULATOR_BUILD); // a malformed carry keeps the defaults
    }
  }
  const report = () => options.onPreferences?.(preferencesOf(calculator.settings));
  const unobserve = calculator.observe("settings", report);
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
      // The settings observer runs once a frame, so a change in the frame of a question change is
      // reported here, before the next question's calculator reads it.
      try {
        report();
      } catch (error) {
        reportCalculatorError(error, CALCULATOR_BUILD);
      }
      unobserve();
      unexpose();
      calculator.destroy();
    },
  };
}
