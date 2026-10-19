// The calculator facade (01-interfaces-integration.md section 12). It validates the options by
// creating the engine first (API-1), then owns an open shadow root on `element` that holds the one
// generated stylesheet, the React UI and a polite status region, so nothing lands in the light DOM
// (AR-35). It forwards every public CalculatorEngine member and none of the internal UI surface,
// adds DOM focus to API-12's focus calls, and contains render errors behind ErrorBoundary
// (AR-52) while reporting them once to options.onError, whose own failures are swallowed (AR-57).
// destroy() releases everything the calculator holds (AR-60); afterwards every public member throws
// KarmanCalculatorError "destroyed", and the internal focusBoundary and reflow do nothing.

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createEngine, type CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { KarmanCalculatorError } from "@/lib/calculator/core/api/errors";
import type {
  CalculatorOptions,
  CalculatorSettings,
  ExpressionAnalysis,
  GraphpaperBounds,
} from "@/lib/calculator/core/api/types";
import { bumpDevCounter } from "@/lib/calculator/dev-counters";
import { hostThemeCss } from "@/lib/calculator/theme/roles";
import { CALCULATOR_BUILD, CALCULATOR_CSS } from "./styles/generated";
import { App } from "./ui/App";
import { ErrorBoundary, type ErrorBoundaryProps } from "./ui/ErrorBoundary";
import { createAnnouncer, type Announcer } from "./ui/a11y/announcer";
import { focusBoundary as focusShadowBoundary } from "./ui/controller/focusables";
import { watchMediaQuery, watchPointer } from "./ui/controller/media";
import { createShellStore, type ShellStore } from "./ui/controller/shell-store";
import { installStyles, type ShadowStyles } from "./ui/controller/stylesheet";
import { watchTheme, type ThemeState } from "./ui/controller/theme-watcher";
import { whenFieldReady } from "./ui/controller/when-field-ready";
import { createEscapeStack, type EscapeStack } from "./ui/focus/escape-stack";
import { createFocusController, type FocusController } from "./ui/focus/focus-controller";
import { layoutFor, observeHostSize } from "./ui/layout/layout-size";

/** AR-32: the scan string that marks the lazy chunk; written to the host at runtime. */
export const KARMAN_CALCULATOR_SENTINEL = "karman-calculator:lazy-chunk";

/** A11Y-2, OI-3: announced when a calculator that stayed open is reset for a new question. */
export const RESET_ANNOUNCEMENT = "Calculator cleared for this question.";

export interface HostHooks {
  chromeSlot?: HTMLElement; // light-DOM title-bar slot (L-12); filled by 13-paste-standalone
  announceResetOnMount?: boolean; // OI-3
}

type Method = {
  [K in keyof CalculatorEngine]: CalculatorEngine[K] extends (...args: never[]) => unknown
    ? K
    : never;
}[keyof CalculatorEngine];
type Args<K extends Method> = Parameters<CalculatorEngine[K]>;
type Result<K extends Method> = ReturnType<CalculatorEngine[K]>;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

interface Internals {
  focus: FocusController;
}

/** 10 Decision 6: the quiz host's channel to the KB-4 reopen row, kept off the public surface. */
const internals = new WeakMap<KarmanCalculator, Internals>();
let hostCount = 0;

export class KarmanCalculator {
  static readonly version: string = CALCULATOR_BUILD;
  static readonly apiVersion = 1 as const;

  /** @internal */ readonly engine: CalculatorEngine;

  readonly #element: HTMLElement;
  readonly #shadow: ShadowRoot;
  readonly #styles: ShadowStyles;
  readonly #announcer: Announcer;
  readonly #focus: FocusController;
  readonly #escape: EscapeStack;
  readonly #store: ShellStore;
  readonly #root: Root;
  readonly #chromeSlot: HTMLElement | null;
  readonly #report: (error: Error) => void;
  readonly #measure: () => void;
  readonly #disposers: (() => void)[] = [];
  #reducedMotion: boolean;
  #reflows = 0;
  #cancelFieldWait: () => void = () => {};
  #destroyed = false;

  constructor(element: HTMLElement, options?: CalculatorOptions, hooks?: HostHooks) {
    // 1. Validate by creating the engine (API-1) before the element is touched.
    const report = (error: Error) => {
      try {
        options?.onError?.(error);
      } catch {
        // AR-57: a failing reporter must not take the calculator down with it.
      }
    };
    this.#report = report;
    this.engine = createEngine({ ...options, onError: report });
    this.#reducedMotion = options?.reducedMotion ?? false;
    this.#element = element;
    this.#chromeSlot = hooks?.chromeSlot ?? null;

    // 2. AR-32 sentinel; A11Y-7 needs an id on the host.
    element.dataset.karmanCalculator = KARMAN_CALCULATOR_SENTINEL;
    element.id ||= `karman-calculator-host-${++hostCount}`;

    // 3–5. Shadow root, styles, React container and the one polite status region. TH-15: the
    // theme watcher re-resolves the skin live; Watch.initial never reaches onTheme, and later
    // changes arrive in a microtask or a media change task, after #styles and #store are assigned.
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    shadow.replaceChildren();
    this.#shadow = shadow;
    const onTheme = (t: ThemeState) => {
      this.#styles.setSkinCss(hostThemeCss(t.skin));
      this.#store.set({ skin: t.skin, themeRevision: t.revision + this.#reflows });
    };
    const theme = watchTheme(document.documentElement, window, onTheme);
    this.#styles = installStyles(shadow, CALCULATOR_CSS);
    this.#styles.setSkinCss(hostThemeCss(theme.initial.skin));
    const container = document.createElement("div");
    container.className = "kc-root";
    const region = document.createElement("div");
    region.className = "kc-sr-only";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    shadow.append(container, region);
    this.#announcer = createAnnouncer(region);

    // 6. Controllers and the shell store.
    this.#focus = createFocusController(this.engine);
    this.#escape = createEscapeStack();
    this.#store = createShellStore({
      size: { width: 0, height: 0 },
      layout: "stacked",
      skin: theme.initial.skin,
      themeRevision: theme.initial.revision,
      reducedMotionMedia: false,
      pointer: "fine",
    });

    // 7. Browser watchers feed the store; the theme watcher is disposed last.
    this.#disposers.push(theme.dispose);
    const size = observeHostSize(element, (next) =>
      this.#store.set({ size: next, layout: layoutFor(next) })
    );
    this.#disposers.push(size.dispose);
    this.#measure = size.measure;
    size.measure();
    const motion = watchMediaQuery(window, REDUCED_MOTION_QUERY, (matches) =>
      this.#store.set({ reducedMotionMedia: matches })
    );
    this.#disposers.push(motion.dispose);
    const pointer = watchPointer(window, shadow, (next) => this.#store.set({ pointer: next }));
    this.#disposers.push(pointer.dispose);
    this.#store.set({ reducedMotionMedia: motion.initial, pointer: pointer.initial });

    // 8. React root; caught errors reach onError through ErrorBoundary.componentDidCatch.
    this.#root = createRoot(container, {
      onCaughtError: () => {},
      onUncaughtError: (error) => report(error instanceof Error ? error : new Error(String(error))),
    });
    this.#render();

    // 9. Dev counter and the internal channel.
    bumpDevCounter("calculators", 1);
    internals.set(this, { focus: this.#focus });

    // 10. A11Y-2, OI-3: only a calculator that stayed open across the question change announces.
    if (hooks?.announceResetOnMount) {
      this.#announcer.announce(RESET_ANNOUNCEMENT, { delayMs: 500, key: "reset" });
    }
  }

  #render(): void {
    const app = createElement(App, {
      engine: this.engine,
      host: this.#element,
      store: this.#store,
      focus: this.#focus,
      escape: this.#escape,
      announcer: this.#announcer,
      chromeSlot: this.#chromeSlot,
    });
    const boundary: Omit<ErrorBoundaryProps, "children"> = {
      host: this.#element,
      onError: this.#report,
      onReset: () => this.#resetFromBoundary(),
    };
    // createElement's third argument supplies the required children prop.
    this.#root.render(createElement(ErrorBoundary, boundary as ErrorBoundaryProps, app));
  }

  /** AR-52 Reset: this question's calculator only, keeping the reduced-motion setting. */
  #resetFromBoundary(): void {
    this.engine.setBlank();
    this.engine.updateSettings({ reducedMotion: this.#reducedMotion });
  }

  /** The engine, or a "destroyed" error once destroy() has run (AR-60). */
  #live(): CalculatorEngine {
    if (this.#destroyed) {
      throw new KarmanCalculatorError("destroyed", "The calculator was destroyed.");
    }
    return this.engine;
  }

  /** Runs `run` on the row's field once it mounts; a newer request cancels the pending one. */
  #whenField(id: string, run: () => void): void {
    this.#cancelFieldWait();
    this.#cancelFieldWait = whenFieldReady(this.#focus, id, run);
  }

  // ── public API: forwarded to the engine (API-2 to API-13), every argument passed through ──

  setExpression(...args: Args<"setExpression">): Result<"setExpression"> {
    return this.#live().setExpression(...args);
  }
  setExpressions(...args: Args<"setExpressions">): Result<"setExpressions"> {
    return this.#live().setExpressions(...args);
  }
  removeExpression(...args: Args<"removeExpression">): Result<"removeExpression"> {
    return this.#live().removeExpression(...args);
  }
  removeExpressions(...args: Args<"removeExpressions">): Result<"removeExpressions"> {
    return this.#live().removeExpressions(...args);
  }
  getExpressions(...args: Args<"getExpressions">): Result<"getExpressions"> {
    return this.#live().getExpressions(...args);
  }
  getState(...args: Args<"getState">): Result<"getState"> {
    return this.#live().getState(...args);
  }
  setState(...args: Args<"setState">): Result<"setState"> {
    return this.#live().setState(...args);
  }
  setBlank(...args: Args<"setBlank">): Result<"setBlank"> {
    return this.#live().setBlank(...args);
  }
  setMathBounds(...args: Args<"setMathBounds">): Result<"setMathBounds"> {
    return this.#live().setMathBounds(...args);
  }
  updateSettings(...args: Args<"updateSettings">): Result<"updateSettings"> {
    const result = this.#live().updateSettings(...args);
    const reducedMotion = args[0]?.reducedMotion;
    if (typeof reducedMotion === "boolean") this.#reducedMotion = reducedMotion;
    return result;
  }
  observe(...args: Args<"observe">): Result<"observe"> {
    return this.#live().observe(...args);
  }
  unobserve(...args: Args<"unobserve">): Result<"unobserve"> {
    return this.#live().unobserve(...args);
  }
  observeEvent(...args: Args<"observeEvent">): Result<"observeEvent"> {
    return this.#live().observeEvent(...args);
  }
  unobserveEvent(...args: Args<"unobserveEvent">): Result<"unobserveEvent"> {
    return this.#live().unobserveEvent(...args);
  }
  HelperExpression(...args: Args<"HelperExpression">): Result<"HelperExpression"> {
    return this.#live().HelperExpression(...args);
  }
  undo(...args: Args<"undo">): Result<"undo"> {
    return this.#live().undo(...args);
  }
  redo(...args: Args<"redo">): Result<"redo"> {
    return this.#live().redo(...args);
  }
  clearHistory(...args: Args<"clearHistory">): Result<"clearHistory"> {
    return this.#live().clearHistory(...args);
  }
  canUndo(...args: Args<"canUndo">): Result<"canUndo"> {
    return this.#live().canUndo(...args);
  }
  canRedo(...args: Args<"canRedo">): Result<"canRedo"> {
    return this.#live().canRedo(...args);
  }
  get expressionAnalysis(): Readonly<Record<string, ExpressionAnalysis>> {
    return this.#live().expressionAnalysis;
  }
  get graphpaperBounds(): GraphpaperBounds {
    return this.#live().graphpaperBounds;
  }
  get settings(): CalculatorSettings {
    return this.#live().settings;
  }
  get focusedExpression(): string | null {
    return this.#live().focusedExpression;
  }
  get mode(): "graphing" {
    return this.#live().mode;
  }

  // ── API-12: engine state plus DOM focus ──

  /** Makes the row active and puts DOM focus into its MathField once the field has mounted. */
  focusExpression(id: string): void {
    this.#live().focusExpression(id);
    this.#whenField(id, () => this.#focus.focusRow(id, "end"));
  }

  /** focusExpression for the first row. */
  focusFirstExpression(): void {
    this.#live().focusFirstExpression();
    const id = this.engine.getExpressions()[0]?.id;
    if (typeof id === "string") this.#whenField(id, () => this.#focus.focusRow(id, "end"));
  }

  /** Makes the row active; DOM focus stays out of its MathField. */
  activateExpression(id: string): void {
    this.#live().activateExpression(id);
    this.#whenField(id, () => this.#focus.activateRow(id));
  }

  /** Re-measures the host at once (the layout follows its width, AR-29). */
  resize(): void {
    this.#live();
    this.#measure();
  }

  /** @internal AR-28 sentinels: focus the first or last tabbable element of the calculator. */
  focusBoundary(edge: "first" | "last"): void {
    if (this.#destroyed) return;
    focusShadowBoundary(this.#shadow, edge);
  }

  /** @internal AR-41: reflow every MathField, then redraw the canvas. */
  reflow(): void {
    if (this.#destroyed) return;
    for (const field of this.#focus.fields()) field.reflow();
    this.#reflows += 1; // counted so a later theme change keeps the revision increasing
    this.#store.set({ themeRevision: this.#store.get().themeRevision + 1 });
  }

  /** AR-60: releases the React root, watchers, announcer, styles and engine; idempotent. */
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#cancelFieldWait();
    this.#root.unmount();
    for (const dispose of [...this.#disposers].reverse()) dispose();
    this.#disposers.length = 0;
    this.#announcer.destroy();
    this.#styles.dispose();
    this.engine.destroy();
    this.#shadow.replaceChildren();
    delete this.#element.dataset.reducedMotion;
    bumpDevCounter("calculators", -1);
  }
}

/** @internal FocusController.lastFocusedRowId() of `calculator` (KB-4's reopen row, Decision 6). */
export function lastFocusedRow(calculator: KarmanCalculator): string | null {
  return internals.get(calculator)?.focus.lastFocusedRowId() ?? null;
}
