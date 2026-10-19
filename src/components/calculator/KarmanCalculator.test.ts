// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KarmanCalculatorError } from "@/lib/calculator/core/api/errors";
import { installDomStubs } from "./__fixtures__/dom-stubs";
import type { MathField } from "./math-field/MathField";
import { CALCULATOR_BUILD, CALCULATOR_CSS } from "./styles/generated";
import type { AppProps } from "./ui/App";
import { ERROR_COPY } from "./ui/ErrorBoundary";
import { KarmanCalculator, RESET_ANNOUNCEMENT } from "./KarmanCalculator";

const s = vi.hoisted(() => ({
  props: null as AppProps | null,
  throwInApp: false,
  renders: 0,
  announced: [] as [string, unknown][],
}));

vi.mock("./ui/App", async () => {
  const { createElement, useSyncExternalStore } = await import("react");
  return {
    App(p: AppProps) {
      useSyncExternalStore(p.store.subscribe, p.store.get);
      s.props = p;
      s.renders += 1;
      if (s.throwInApp) throw new Error("app boom");
      return createElement("section", { className: "kc-app" });
    },
  };
});

vi.mock("./ui/a11y/announcer", async (importOriginal) => {
  const real = await importOriginal<typeof import("./ui/a11y/announcer")>();
  return {
    ...real,
    createAnnouncer: () => ({
      announce: (text: string, options?: unknown) => s.announced.push([text, options]),
      cancel: () => {},
      destroy: () => {},
    }),
  };
});

const FORWARDED = [
  "setExpression",
  "setExpressions",
  "removeExpression",
  "removeExpressions",
  "getExpressions",
  "getState",
  "setState",
  "setBlank",
  "setMathBounds",
  "updateSettings",
  "observe",
  "unobserve",
  "observeEvent",
  "unobserveEvent",
  "HelperExpression",
  "undo",
  "redo",
  "clearHistory",
  "canUndo",
  "canRedo",
];
const INTERNAL = [
  "subscribe",
  "getSnapshot",
  "editRow",
  "endEditGroup",
  "insertRowAfter",
  "deleteRow",
  "clearAll",
  "setRowHidden",
  "setView",
  "setFocusedRow",
];

let restoreDom: () => void = () => {};
beforeEach(() => {
  restoreDom = installDomStubs();
  Object.assign(s, { props: null, throwInApp: false, renders: 0, announced: [] });
});
afterEach(() => {
  restoreDom();
  document.body.replaceChildren();
});

function mount(): HTMLElement {
  return document.body.appendChild(document.createElement("div"));
}
function fakeField(): MathField {
  const members = ["element", "focus", "blur", "latex", "write", "cmd", "keystroke", "typedText"];
  const more = ["run", "select", "clearSelection", "selectedLatex", "reflow", "setInputMode"];
  const all = [...members, ...more, "speechText", "destroy"];
  return Object.fromEntries(all.map((name) => [name, vi.fn()])) as unknown as MathField;
}
function caught(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}
function click(el: HTMLElement, text: string): void {
  const buttons = [...el.shadowRoot!.querySelectorAll("button")];
  buttons.find((b) => b.textContent === text)!.click();
}
async function failApp(rev: number): Promise<void> {
  await vi.waitFor(() => expect(s.props).not.toBeNull()); // createRoot renders asynchronously
  s.throwInApp = true;
  const host = s.props!.host;
  s.props!.store.set({ themeRevision: rev });
  await vi.waitFor(() => expect(host.shadowRoot!.textContent).toContain(ERROR_COPY.message));
  s.throwInApp = false;
}

it("AR-35 an open shadow root holds the styles and UI; nothing lands in the light DOM", async () => {
  const el = mount();
  const calc = new KarmanCalculator(el);
  expect([
    el.shadowRoot?.mode,
    el.shadowRoot!.querySelector("style[data-kc-base]")!.textContent,
  ]).toEqual(["open", CALCULATOR_CSS]);
  await vi.waitFor(() => expect(s.props?.engine).toBe(calc.engine));
  expect(el.shadowRoot!.querySelectorAll('[role="status"][aria-live="polite"]')).toHaveLength(1);
  expect([el.childNodes.length, /^karman-calculator-host-\d+$/.test(el.id)]).toEqual([0, true]);
});
it("AR-35 invalid options throw before the element is touched", () => {
  const el = mount();
  expect(caught(() => new KarmanCalculator(el, { angleMode: "gradians" } as never))).toBeInstanceOf(
    KarmanCalculatorError
  );
  expect([el.shadowRoot, el.dataset.karmanCalculator]).toEqual([null, undefined]);
});
it("AR-35 KarmanCalculator forwards every public engine member and no internal one", () => {
  const calc = new KarmanCalculator(mount());
  const engine = calc.engine as unknown as Record<string, (...args: unknown[]) => unknown>;
  const facade = calc as unknown as Record<string, (arg: unknown) => unknown>;
  const ARG = { id: "1" };
  for (const name of FORWARDED) {
    const spy = vi.spyOn(engine, name).mockReturnValue(name);
    expect(facade[name](ARG)).toBe(name);
    expect(spy.mock.calls[0][0]).toBe(ARG);
  }
  for (const name of ["focusExpression", "activateExpression", "focusFirstExpression"]) {
    const spy = vi.spyOn(engine, name).mockReturnValue(undefined);
    facade[name]("1");
    expect(spy).toHaveBeenCalled();
  }
  for (const g of [
    "expressionAnalysis",
    "graphpaperBounds",
    "settings",
    "focusedExpression",
    "mode",
  ])
    expect(facade[g]).toEqual(engine[g]);
  expect(INTERNAL.filter((n) => n in calc)).toEqual([]);
  expect([KarmanCalculator.apiVersion, KarmanCalculator.version]).toEqual([1, CALCULATOR_BUILD]);
});
it("AR-32 the constructor writes KARMAN_CALCULATOR_SENTINEL to element.dataset.karmanCalculator", () => {
  const el = mount();
  new KarmanCalculator(el);
  expect(el.dataset.karmanCalculator).toBe("karman-calculator:lazy-chunk");
});
it("AR-52 a render error shows the fallback; Retry remounts from engine state; Reset runs setBlank and keeps reduced motion", async () => {
  const el = mount();
  const answer = document.body.appendChild(document.createElement("p")); // the quiz's own content
  const calc = new KarmanCalculator(el, { reducedMotion: true });
  calc.setExpressions([{ id: "1", latex: "y=x" }]);
  await failApp(1);
  const renders = s.renders;
  click(el, "Retry");
  await vi.waitFor(() => expect(s.renders).toBeGreaterThan(renders));
  expect(calc.getExpressions()[0].latex).toBe("y=x");
  await failApp(2);
  const blank = vi.spyOn(calc.engine, "setBlank");
  click(el, "Reset this question's calculator");
  expect([
    blank.mock.calls.length,
    calc.getExpressions()[0].latex,
    calc.settings.reducedMotion,
    answer.isConnected,
  ]).toEqual([1, "", true, true]);
});
it("AR-57 a render error reaches options.onError once, and a throwing onError is contained", async () => {
  const onError = vi.fn<(error: Error) => void>(() => {
    throw new Error("reporter down");
  });
  new KarmanCalculator(mount(), { onError });
  await failApp(7);
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls[0][0]).toMatchObject({ message: "app boom" });
});
it("API-12 focusExpression and focusFirstExpression wait for the field; activateExpression marks the row active without DOM focus; resize re-measures", async () => {
  const el = mount();
  const calc = new KarmanCalculator(el);
  await vi.waitFor(() => expect(s.props).not.toBeNull());
  calc.setExpressions([
    { id: "1", latex: "1" },
    { id: "2", latex: "2" },
  ]);
  const [f1, f2] = [fakeField(), fakeField()];
  s.props!.focus.registerField("1", f1);
  calc.focusExpression("2");
  s.props!.focus.registerField("2", f2);
  await vi.waitFor(() => expect(f2.focus).toHaveBeenCalled());
  const seen = vi.fn();
  calc.observe("focusedExpression", seen);
  calc.activateExpression("1");
  expect([calc.engine.getSnapshot().activeRowId, vi.mocked(f1.focus).mock.calls.length]).toEqual([
    "1",
    0,
  ]);
  await vi.waitFor(() => expect(seen).toHaveBeenCalled());
  calc.focusFirstExpression();
  await vi.waitFor(() => expect(f1.focus).toHaveBeenCalled()); // row "1" is getExpressions()[0]
  el.getBoundingClientRect = () => ({ width: 700, height: 500 }) as DOMRect;
  calc.resize();
  expect([s.props!.store.get().layout, s.props!.store.get().size]).toEqual([
    "desktop",
    { width: 700, height: 500 },
  ]); // jsdom measures 0×0 (stacked) until then
});
it("A11Y-2 announceResetOnMount announces the reset once with a 500 ms delay; without it nothing is announced (OI-3)", () => {
  s.announced.length = 0;
  new KarmanCalculator(mount());
  expect(s.announced).toEqual([]);
  new KarmanCalculator(mount(), undefined, { announceResetOnMount: true });
  expect(s.announced).toEqual([[RESET_ANNOUNCEMENT, { delayMs: 500, key: "reset" }]]);
});
