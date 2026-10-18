"use client";

// AR-7: the calculator version resolved once per request on the server
// (`resolveCalculatorVersion`, AR-6) and handed to client code. The learn
// layout and the diagnostic page mount the provider; `CalculatorScope` reads
// the hook. A scope with no provider (tests, admin previews) uses v1, and the
// version is fixed for the life of the page, so it never changes mid-question.
//
// The resolver is a server module: this file imports it for types only.

import { createContext, useContext, useState, type JSX, type ReactNode } from "react";
import type { CalculatorVersion } from "@/lib/calculator-version";

const CalculatorVersionContext = createContext<CalculatorVersion>("v1");

export function CalculatorVersionProvider(props: {
  version: CalculatorVersion;
  children: ReactNode;
}): JSX.Element {
  // Keeps the first version: a later re-render with another value is ignored.
  const [version] = useState(() => props.version);
  return (
    <CalculatorVersionContext.Provider value={version}>
      {props.children}
    </CalculatorVersionContext.Provider>
  );
}

/** The page's calculator version; "v1" without a provider. */
export function useCalculatorVersion(): CalculatorVersion {
  return useContext(CalculatorVersionContext);
}
