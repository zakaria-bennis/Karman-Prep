// ============================================================
// Vitest setup — extends `expect` with jest-dom matchers so
// component tests can do things like
//   expect(banner).toBeVisible();
//   expect(input).toHaveValue("Jane");
//
// Also wires React Testing Library's automatic DOM cleanup
// between tests — otherwise consecutive render() calls would
// leak DOM nodes across cases and "found multiple elements"
// errors would crop up. Pure-logic tests use the node env so
// `cleanup` is a no-op there.
//
// Loaded by vitest.config.ts before every test file.
// ============================================================

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { splitMathText } from "@/components/learn/math-segments";
import { installMathSplit } from "@/lib/calculator-transfer/math-split";

// The lazy transfer classifier gets MathText's splitter from its eager loader in the app
// (src/lib/calculator-transfer/math-split.ts); tests that call it directly get it here.
installMathSplit(splitMathText);

// Node 25 ships its own Web Storage global. Without `--localstorage-file` it is an empty object
// with no methods, and it shadows jsdom's `localStorage`, so `localStorage.clear()` throws in
// component tests. Point the global back at jsdom's own spec Storage for the jsdom environment.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window;
if (jsdomWindow) {
  for (const key of ["localStorage", "sessionStorage"] as const) {
    if (typeof globalThis[key]?.clear === "function") continue;
    Object.defineProperty(globalThis, key, {
      configurable: true,
      enumerable: true,
      get: () => jsdomWindow[key],
    });
  }
}

afterEach(async () => {
  cleanup();
  // React's scheduler queues its remaining work (passive-effect cleanups
  // from the unmount above) on setImmediate. When the file's last test
  // ends, Vitest tears the jsdom window down before that task runs and
  // react-dom throws "window is not defined" as an unhandled error, which
  // fails the run although every test passed. One macrotask turn lets the
  // scheduler drain while the window still exists.
  await new Promise<void>((resolve) => setImmediate(resolve));
});
