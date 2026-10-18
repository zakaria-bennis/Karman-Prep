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
