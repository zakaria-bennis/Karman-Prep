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

afterEach(() => {
  cleanup();
});
