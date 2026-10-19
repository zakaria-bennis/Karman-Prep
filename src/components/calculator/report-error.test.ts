// AR-57 (03's contribution; owner 10): the quiz host's onError hook sends calculator exceptions to
// Sentry as a new Error that carries only a safe name, a known code, stack frame lines and the
// calculator tags, never LaTeX, row content, question text or answers.
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock("@sentry/nextjs", () => ({ captureException: mocks.capture }));

import { reportCalculatorError } from "./report-error";

type Hint = { tags: { calculator: string; build: string } };

/** The last captureException call's `[err, hint]`. */
function sent(): [Error, Hint] {
  const call = mocks.capture.mock.lastCall;
  if (!call) throw new Error("captureException was not called");
  return call as [Error, Hint];
}

/** Stands in for KarmanCalculatorError without importing lazy calculator code (AR-1). */
class KarmanCalculatorError extends Error {
  name = "KarmanCalculatorError";
  code = "unsupported";
}

beforeEach(() => {
  mocks.capture.mockReset();
});

it("AR-57 reportCalculatorError sends only the error name, its code and the calculator tags", async () => {
  reportCalculatorError(new KarmanCalculatorError("y=\\frac{1}{2} row 3"), "abc123");
  await vi.dynamicImportSettled();
  const [err, hint] = sent();
  expect(err.message).toBe("KarmanCalculatorError: unsupported");
  expect(hint).toEqual({ tags: { calculator: "quiz", build: "abc123" } });
  expect(JSON.stringify([err.message, err.stack, hint])).not.toMatch(/frac|row 3/);
});

it("AR-57 the stack keeps only frame lines, so a multi-line message cannot leak", async () => {
  const e = new TypeError("x^{2}\nquestion text\nanswer B");
  reportCalculatorError(e, null);
  await vi.dynamicImportSettled();
  const [err, hint] = sent();
  expect(err.message).toBe("TypeError");
  expect(hint.tags.build).toBe("unknown");
  const lines = (err.stack ?? "").split("\n");
  expect(lines[0]).toBe("Error: TypeError");
  expect(lines.slice(1)).toEqual((e.stack ?? "").split("\n").filter((l) => /^\s+at\s/.test(l)));
  expect(err.stack).not.toMatch(/x\^|question text|answer B/);
});

it("AR-57 non-Error values, odd names and unknown codes are reduced to safe names", async () => {
  reportCalculatorError("y=x^2", "b");
  await vi.dynamicImportSettled();
  expect(sent()[0].message).toBe("UnknownError");
  reportCalculatorError(Object.assign(new Error("m"), { name: "y = 2x + 1", code: "row-7" }), "b");
  await vi.dynamicImportSettled();
  expect(sent()[0].message).toBe("Error");
});

it("AR-57 a throwing Sentry client never escapes the reporter", async () => {
  mocks.capture.mockImplementationOnce(() => {
    throw new Error("Sentry is unavailable");
  });
  expect(() => reportCalculatorError(new Error("x"), "b")).not.toThrow();
  await vi.dynamicImportSettled();
  expect(mocks.capture).toHaveBeenCalledTimes(1);
});
