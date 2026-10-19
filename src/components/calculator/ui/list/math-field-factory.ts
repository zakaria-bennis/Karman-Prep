// How rows and bound fields create their MathField. Production uses the adapter; component tests
// provide recording fakes, and trackFields wraps whichever factory is current.

import { createContext } from "react";
import { createMathField, type MathField, type MathFieldOptions } from "../../math-field/MathField";

export type MathFieldFactory = (host: HTMLElement, options: MathFieldOptions) => MathField;

export const MathFieldFactoryContext = createContext<MathFieldFactory>(createMathField);
