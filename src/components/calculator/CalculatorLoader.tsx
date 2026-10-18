"use client";

// Loads the lazy v2 quiz host once per page and mounts it into the window's shadow host (AR-31,
// OI-28). A failed import stays failed for the page, so its panel offers "Reload page"; a mount or
// API throw keeps the loaded module, so its panel offers "Retry", which mounts again (AR-53).
// Eager module: it imports v2 code only through loadCalculatorModule() and as types (AR-1, AR-32).

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type {
  QuizCalculatorHandle,
  QuizMountOptions,
} from "@/components/calculator-v2/host/quiz-host";
import type { CalculatorLoadFailure, CalculatorLoadStatus } from "./CalculatorScope";
import { onCalculatorFontsLoaded, warmCalculatorFonts } from "./font-warmup";
import { reportCalculatorError } from "./report-error";
import styles from "./CalculatorWindow.module.css";

export type QuizHostModule = typeof import("@/components/calculator-v2/host/quiz-host");

export const LOADING_COPY = "Loading calculator…";
export const MOUNT_FAILED_COPY = "The calculator could not load.";
export const LOAD_FAILED_COPY = "The calculator could not load. Reload the page to try again.";

/** Provided by CalculatorScope (v2): the shadow host's id, which the trigger's aria-controls names. */
export const CalculatorHostIdContext = createContext<string>("karman-calculator-host");

/** The lazy quiz host import. Server renders never reach the dynamic import (AR-32). */
export function loadCalculatorModule(): Promise<QuizHostModule> {
  return typeof window === "undefined"
    ? Promise.reject(new Error("client only"))
    : import("@/components/calculator-v2/host/quiz-host");
}

let modulePromise: Promise<QuizHostModule> | null = null;

/** loadCalculatorModule() once per page; the promise is kept, a rejection included (OI-28). */
export function getCalculatorModule(): Promise<QuizHostModule> {
  if (modulePromise === null) modulePromise = loadCalculatorModule();
  return modulePromise;
}

export function resetCalculatorModuleForTests(): void {
  modulePromise = null;
}

type AnyFunction = (...args: unknown[]) => unknown;

/**
 * AR-53: wraps every function member of `handle` present now (12's applyTransfer included) and,
 * through a Proxy, every function member of `handle.calculator`. A throw calls `onThrow(error)`
 * and the call returns undefined, so no calculator error reaches React.
 */
export function guardHandle(
  handle: QuizCalculatorHandle,
  onThrow: (error: unknown) => void
): QuizCalculatorHandle {
  const guard =
    (fn: AnyFunction, self: unknown): AnyFunction =>
    (...args) => {
      try {
        return fn.apply(self, args);
      } catch (error) {
        onThrow(error);
        return undefined;
      }
    };
  const source = handle as unknown as Record<string, unknown>;
  const guarded: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    const value = source[key];
    guarded[key] = typeof value === "function" ? guard(value as AnyFunction, handle) : value;
  }
  const wrapped = new WeakMap<AnyFunction, AnyFunction>();
  guarded.calculator = new Proxy(handle.calculator, {
    get(target, property) {
      const value: unknown = Reflect.get(target, property, target);
      if (typeof value !== "function") return value;
      let forwarded = wrapped.get(value as AnyFunction);
      if (forwarded === undefined) {
        forwarded = guard(value as AnyFunction, target);
        wrapped.set(value as AnyFunction, forwarded);
      }
      return forwarded;
    },
  });
  return guarded as unknown as QuizCalculatorHandle;
}

export interface CalculatorLoaderProps {
  active: boolean;
  frame: HTMLElement | null;
  chromeSlot: HTMLElement | null;
  reducedMotion: boolean;
  announceReset: boolean;
  onStatus(status: CalculatorLoadStatus, failure: CalculatorLoadFailure | null): void;
  onHandle(handle: QuizCalculatorHandle | null): void;
  reloadPage?: () => void; // default () => window.location.reload(); tests inject a spy
}

type Phase = "loading" | "ready" | "load-failed" | "mount-failed";

export function CalculatorLoader(props: CalculatorLoaderProps) {
  const { active, frame, chromeSlot, reducedMotion } = props;
  const hostId = useContext(CalculatorHostIdContext);
  const [hostModule, setHostModule] = useState<QuizHostModule | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [attempt, setAttempt] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const live = useRef<QuizCalculatorHandle | null>(null);
  const guarded = useRef<QuizCalculatorHandle | null>(null);
  const disposed = useRef(false);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  // Activation: warm the fonts (never awaited), then the once-per-page import. Leaving (unmount
  // or deactivation) sets the disposed flag and destroys a live calculator.
  useEffect(() => {
    if (!active) return;
    disposed.current = false;
    void warmCalculatorFonts();
    latest.current.onStatus("loading", null);
    getCalculatorModule().then(
      (loaded) => {
        if (!disposed.current) setHostModule(() => loaded);
      },
      (error: unknown) => {
        if (disposed.current) return;
        reportCalculatorError(error, null);
        setPhase("load-failed");
        latest.current.onStatus("failed", "load");
      }
    );
    return () => {
      disposed.current = true;
      const handle = live.current;
      live.current = null;
      guarded.current = null;
      if (handle !== null) {
        try {
          handle.destroy();
        } catch (error) {
          reportCalculatorError(error, null);
        }
        latest.current.onHandle(null);
      }
    };
  }, [active]);

  // The mount runs once the module is loaded and both frame and chromeSlot exist; Retry bumps
  // `attempt` to run it again on the loaded module.
  useEffect(() => {
    const element = host.current;
    if (!active || disposed.current || live.current !== null) return;
    if (hostModule === null || frame === null || chromeSlot === null || element === null) return;
    const options: QuizMountOptions = {
      element,
      frame,
      chromeSlot,
      reducedMotion: latest.current.reducedMotion,
      announceReset: latest.current.announceReset,
    };
    let handle: QuizCalculatorHandle;
    try {
      handle = hostModule.mountQuizCalculator(options);
    } catch (error) {
      reportCalculatorError(error, null);
      setPhase("mount-failed");
      latest.current.onStatus("failed", "mount");
      return;
    }
    const fail = (error: unknown) => {
      reportCalculatorError(error, null);
      if (live.current !== handle) return;
      live.current = null;
      guarded.current = null;
      try {
        handle.destroy();
      } catch (destroyError) {
        reportCalculatorError(destroyError, null);
      }
      latest.current.onHandle(null);
      setPhase("mount-failed");
      latest.current.onStatus("failed", "mount");
    };
    live.current = handle;
    guarded.current = guardHandle(handle, fail);
    setPhase("ready");
    latest.current.onStatus("ready", null);
    latest.current.onHandle(guarded.current);
  }, [active, hostModule, frame, chromeSlot, attempt]);

  useEffect(() => {
    guarded.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // AR-41: a font load reflows the mounted calculator.
  useEffect(() => {
    if (!active) return;
    return onCalculatorFontsLoaded(() => guarded.current?.reflow());
  }, [active]);

  if (!active) return <></>;

  function retry() {
    setPhase("loading");
    latest.current.onStatus("loading", null);
    setAttempt((count) => count + 1);
  }

  function reload() {
    (props.reloadPage ?? (() => window.location.reload()))();
  }

  return (
    <>
      <div
        id={hostId}
        ref={host}
        data-calculator-host
        data-loading={phase === "ready" ? undefined : ""}
        className={styles.host}
      />
      {phase !== "ready" && (
        <div className={styles.panel} role="status">
          {phase === "loading" && <p>{LOADING_COPY}</p>}
          {phase === "load-failed" && (
            <>
              <p>{LOAD_FAILED_COPY}</p>
              <button type="button" onClick={reload}>
                Reload page
              </button>
            </>
          )}
          {phase === "mount-failed" && (
            <>
              <p>{MOUNT_FAILED_COPY}</p>
              <button type="button" onClick={retry}>
                Retry
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
