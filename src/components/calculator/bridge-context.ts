"use client";

// The quiz calculator bridge's context and its reader. CalculatorScope provides the context and
// re-exports useCalculator; the lazy Transfer control (TransferControl.tsx) imports useCalculator
// from here. AR-33: a value import of CalculatorScope from the lazy Transfer chunk moves eager
// modules out of the quiz routes' shared chunk (CalculatorSourceAction and MathText among them),
// so the lazy chunk reads the bridge through this module only. Eager: types only from the scope.

import { createContext, useContext } from "react";
import type { CalculatorBridge } from "./CalculatorScope"; // type-only

export const CalculatorBridgeContext = createContext<CalculatorBridge | null>(null);

export function useCalculator(): CalculatorBridge | null {
  return useContext(CalculatorBridgeContext);
}
