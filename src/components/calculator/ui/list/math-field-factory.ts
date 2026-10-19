// How rows and bound fields create their MathField (01-interfaces-integration.md section 11; 09
// Decisions, "Fake MathFields in jsdom"). Production uses 05's adapter; component tests provide
// recording fakes, and 13's trackFields wraps whichever factory is current.

import { createContext } from "react";
import { createMathField, type MathField, type MathFieldOptions } from "../../math-field/MathField";

export type MathFieldFactory = (host: HTMLElement, options: MathFieldOptions) => MathField;

export const MathFieldFactoryContext = createContext<MathFieldFactory>(createMathField);
