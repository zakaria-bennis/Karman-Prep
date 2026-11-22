// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi, type Mock } from "vitest";
import { reportCalculatorError } from "@/components/calculator/report-error";
import { DEFAULT_SETTINGS } from "@/lib/calculator/core/api/types";
import { PREFERENCE_KEYS, preferencesOf } from "../calculator-window-store";
import { CALCULATOR_BUILD } from "../styles/generated";
import {
  KEPT_LIMIT,
  forgetKeptCalculatorsForTests,
  keptCalculator,
  mountQuizCalculator,
  type QuizMountOptions,
} from "./quiz-host";

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
  unobserve: null as unknown as Fn,
  settings: {} as Record<string, unknown>,
  throwSettings: false,
  throwState: false,
  state: { expressions: [] } as Record<string, unknown>,
}));

vi.mock("../KarmanCalculator", async () => {
  const { vi: v } = await import("vitest");
  h.ctor = v.fn();
  class KarmanCalculator {
    engine = { engine: true };
    focusExpression = v.fn();
    activateExpression = v.fn();
    focusBoundary = v.fn();
    updateSettings = v.fn(() => {
      if (h.throwSettings) throw new Error("invalid");
    });
    reflow = v.fn();
    destroy = v.fn();
    getExpressions = v.fn(() => [{ id: "1" }, { id: "2" }]);
    getState = v.fn(() => h.state);
    setState = v.fn(() => {
      if (h.throwState) throw new Error("invalid state");
    });
    observe = v.fn(() => h.unobserve);
    get settings() {
      return h.settings;
    }
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
  h.unobserve = vi.fn();
  h.throwSettings = false;
  h.throwState = false;
  h.settings = { ...DEFAULT_SETTINGS, angleMode: "degrees", reducedMotion: true };
  h.state = { expressions: [] };
  forgetKeptCalculatorsForTests();
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
    "getState",
    "setState",
    "updateSettings",
    "observe",
    "settings",
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

it("AR-39 quiz-host imports no font stylesheet: the math uses the system Times stack", () => {
  expect(SOURCE()).not.toMatch(/katex/i);
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

it("the previous question's settings are applied at mount; changes and destroy report them back (owner, 2026-10-21)", () => {
  const carried = preferencesOf({ ...DEFAULT_SETTINGS, angleMode: "degrees", keypad: true });
  const onPreferences = vi.fn();
  const handle = mountQuizCalculator(opts({ preferences: carried, onPreferences }));
  expect(h.instance.updateSettings).toHaveBeenCalledWith(carried);
  const [[name, callback]] = h.instance.observe.mock.calls as [[string, () => void]];
  expect(name).toBe("settings");
  callback();
  const reported = onPreferences.mock.calls[0][0];
  expect(Object.keys(reported).sort()).toEqual([...PREFERENCE_KEYS].sort());
  expect(reported).toMatchObject({ angleMode: "degrees" });
  expect(reported).not.toHaveProperty("reducedMotion");
  handle.destroy();
  expect(onPreferences).toHaveBeenCalledTimes(2);
  expect(h.unobserve).toHaveBeenCalledTimes(1);
});

it("a first calculator (no carried settings) keeps the defaults, and a malformed carry is reported, not thrown", () => {
  mountQuizCalculator(opts());
  expect(h.instance.updateSettings).not.toHaveBeenCalled();
  h.throwSettings = true;
  const bad = { angleMode: "gradians" } as unknown as ReturnType<typeof preferencesOf>;
  expect(() => mountQuizCalculator(opts({ preferences: bad }))).not.toThrow();
  expect(reportCalculatorError).toHaveBeenCalledTimes(1);
});

it("a bookmarked question keeps its calculator: kept on destroy, back on the next visit, before the carried settings (founder, 2026-11-17)", () => {
  // the loader's live props: `memory` is the question's key while it is bookmarked
  const live = { current: { memory: undefined as string | undefined } };
  h.state = { expressions: [{ id: "1", latex: "y=2x" }] };
  const first = mountQuizCalculator(opts({ live }));
  live.current.memory = "run:q3"; // bookmarked while the calculator was in use
  first.destroy();
  expect(keptCalculator("run:q3")).toBe(h.state);
  const carried = preferencesOf({ ...DEFAULT_SETTINGS, angleMode: "degrees" });
  mountQuizCalculator(opts({ live, preferences: carried }));
  expect(h.instance.setState).toHaveBeenCalledWith(h.state);
  // the student's latest settings are applied after the kept state, so they win
  expect(h.instance.setState.mock.invocationCallOrder[0]).toBeLessThan(
    h.instance.updateSettings.mock.invocationCallOrder[0]
  );
});

it("a question that is not bookmarked starts clean and keeps nothing, and a kept calculator is not announced as cleared (AR-58, OI-3)", () => {
  const live = { current: { memory: undefined as string | undefined } };
  mountQuizCalculator(opts({ live })).destroy();
  mountQuizCalculator(opts({ live, announceReset: true }));
  expect(h.instance.setState).not.toHaveBeenCalled();
  expect(h.ctor.mock.lastCall?.[2]).toMatchObject({ announceResetOnMount: true });
  const kept = { current: { memory: "run:q5" } };
  mountQuizCalculator(opts({ live: kept })).destroy();
  mountQuizCalculator(opts({ live: kept, announceReset: true }));
  expect(h.ctor.mock.lastCall?.[2]).toMatchObject({ announceResetOnMount: false });
});

it("a kept state that no longer loads is reported and the calculator starts clean; the page keeps at most KEPT_LIMIT", () => {
  const live = (memory: string) => ({ current: { memory } });
  mountQuizCalculator(opts({ live: live("run:bad") })).destroy();
  h.throwState = true;
  expect(() => mountQuizCalculator(opts({ live: live("run:bad") }))).not.toThrow();
  expect(reportCalculatorError).toHaveBeenCalledTimes(1);
  h.throwState = false;
  for (let i = 0; i <= KEPT_LIMIT; i++)
    mountQuizCalculator(opts({ live: live(`run:${i}`) })).destroy();
  expect(keptCalculator("run:bad")).toBeUndefined();
  expect(keptCalculator("run:0")).toBeUndefined();
  expect(keptCalculator(`run:${KEPT_LIMIT}`)).toBeDefined();
});
