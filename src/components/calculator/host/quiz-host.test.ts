// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi, type Mock } from "vitest";
import { reportCalculatorError } from "@/components/calculator/report-error";
import { CALCULATOR_BUILD } from "../styles/generated";
import { mountQuizCalculator, type QuizMountOptions } from "./quiz-host";

type Fn = Mock<(...args: unknown[]) => unknown>;
const h = vi.hoisted(() => ({
  ctor: null as unknown as Mock<
    (
      element: HTMLElement,
      options: { reducedMotion?: boolean; onError: (error: Error) => void },
      hooks: { chromeSlot?: HTMLElement }
    ) => void
  >,
  instance: null as unknown as Record<string, Fn>,
  lastRow: null as string | null,
  unexpose: null as unknown as Fn,
}));

vi.mock("../KarmanCalculator", async () => {
  const { vi: v } = await import("vitest");
  h.ctor = v.fn();
  class KarmanCalculator {
    engine = { engine: true };
    focusExpression = v.fn();
    activateExpression = v.fn();
    focusBoundary = v.fn();
    updateSettings = v.fn();
    reflow = v.fn();
    destroy = v.fn();
    getExpressions = v.fn(() => [{ id: "1" }, { id: "2" }]);
    constructor(...args: unknown[]) {
      h.ctor(...(args as Parameters<typeof h.ctor>));
      h.instance = this as unknown as Record<string, Fn>;
    }
  }
  return { KarmanCalculator, lastFocusedRow: () => h.lastRow };
});

vi.mock("@/components/calculator/report-error", () => ({
  reportCalculatorError: vi.fn(),
}));

vi.mock("../ui/hooks/dev-hooks", async () => {
  const { vi: v } = await import("vitest");
  h.unexpose = v.fn();
  return { exposeEngineForTests: v.fn(() => h.unexpose) };
});

beforeEach(() => {
  vi.clearAllMocks();
  h.lastRow = null;
});

function opts(o: Partial<QuizMountOptions> = {}): QuizMountOptions {
  return {
    element: document.createElement("div"),
    frame: document.createElement("div"),
    chromeSlot: document.createElement("div"),
    reducedMotion: false,
    announceReset: false,
    ...o,
  };
}

const SOURCE = () => readFileSync("src/components/calculator/host/quiz-host.ts", "utf8");

it("AR-57 the quiz host reports calculator errors with CALCULATOR_BUILD", () => {
  const o = opts();
  mountQuizCalculator(o);
  const [element, options, hooks] = h.ctor.mock.calls[0];
  const error = new Error("boom");
  options.onError(error);
  expect(reportCalculatorError).toHaveBeenCalledWith(error, CALCULATOR_BUILD);
  expect([element, hooks.chromeSlot]).toEqual([o.element, o.chromeSlot]);
});

it("AN-13 reducedMotion is passed at construction and setReducedMotion updates the setting live", () => {
  const handle = mountQuizCalculator(opts({ reducedMotion: true }));
  expect(h.ctor.mock.calls[0][1].reducedMotion).toBe(true);
  handle.setReducedMotion(false);
  expect(h.instance.updateSettings).toHaveBeenCalledWith({ reducedMotion: false });
});

it("AR-35 the quiz host uses only the public API, focusBoundary and the recorded internal channels (Decision 6)", () => {
  const allowed = [
    "engine",
    "focusExpression",
    "activateExpression",
    "getExpressions",
    "updateSettings",
    "focusBoundary",
    "reflow",
    "destroy",
  ];
  expect(
    [...SOURCE().matchAll(/calculator\.(\w+)/g)]
      .map((m) => m[1])
      .filter((n) => !allowed.includes(n))
  ).toEqual([]);
  expect(SOURCE()).toMatch(
    /^import \{ KarmanCalculator, lastFocusedRow \} from "\.\.\/KarmanCalculator";$/m
  );
});

it("AR-60 the quiz handle's destroy is idempotent and clears the test global", () => {
  const handle = mountQuizCalculator(opts());
  handle.destroy();
  handle.destroy();
  expect([h.instance.destroy.mock.calls.length, h.unexpose.mock.calls.length]).toEqual([1, 1]);
});

it("KB-4 focusOnOpen for mouse or keyboard focuses the last focused row, else row 1", () => {
  const handle = mountQuizCalculator(opts());
  handle.focusOnOpen("mouse");
  expect(h.instance.focusExpression).toHaveBeenLastCalledWith("1");
  h.lastRow = "2";
  handle.focusOnOpen("keyboard");
  expect(h.instance.focusExpression).toHaveBeenLastCalledWith("2");
});

it("AR-39 quiz-host imports katex/dist/katex.min.css at document scope", () => {
  expect(SOURCE()).toMatch(/^import "katex\/dist\/katex\.min\.css";$/m);
});

it("KB-4 focusOnOpen('touch') activates the last focused row and focuses the frame (OI-7)", () => {
  const o = opts();
  const focus = vi.spyOn(o.frame, "focus");
  h.lastRow = "2";
  mountQuizCalculator(o).focusOnOpen("touch");
  expect(h.instance.activateExpression).toHaveBeenCalledWith("2");
  expect(h.instance.focusExpression).not.toHaveBeenCalled();
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
