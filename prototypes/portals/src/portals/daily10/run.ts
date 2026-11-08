import { useEffect, useRef } from "react";
import { EASE, easeOut, easeInOut, reducedMotionNow } from "@/design-system/motion";

/**
 * The end screen's motion run, ported from prototypes/daily10-end/core.js
 * (makeCtx): a cancellable script context with wait, tween, the Apple-style
 * spring integrator (response in seconds, damping ratio, lifted verbatim), a
 * throttled count and a reduced-motion gate on every Web Animations call. A
 * sequence is one async function; cancelling the run rejects its next step.
 */
export { easeOut, easeInOut };

export class Cancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "Cancelled";
  }
}

export interface Run {
  alive(): boolean;
  cancel(): void;
  wait(ms: number): Promise<void>;
  tween(ms: number, fn: (k: number) => void, ease?: (k: number) => number): Promise<void>;
  spring(
    from: number,
    to: number,
    fn: (v: number) => void,
    response?: number,
    damping?: number
  ): Promise<void>;
  /** Counts from one value to another, calling set at most every `every` ms (and at the end). */
  count(
    from: number,
    to: number,
    ms: number,
    set: (v: number) => void,
    every?: number
  ): Promise<void>;
  /** el.animate with the reduced-motion gate: under reduced motion the final frame applies at once. */
  anim(
    el: Element | null | undefined,
    frames: Keyframe[],
    opts: KeyframeAnimationOptions
  ): Animation | null;
}

export function createRun(): Run {
  let on = true;
  const alive = () => on;
  const reduced = () => reducedMotionNow();
  const wait = (ms: number) =>
    new Promise<void>((res, rej) =>
      setTimeout(() => (on ? res() : rej(new Cancelled())), reduced() ? Math.min(ms, 60) : ms)
    );
  const tween = (dur: number, fn: (k: number) => void, ease: (k: number) => number = easeOut) =>
    new Promise<void>((res, rej) => {
      if (!on) return rej(new Cancelled());
      if (reduced()) {
        fn(1);
        return res();
      }
      const t0 = performance.now();
      const f = (t: number) => {
        if (!on) return rej(new Cancelled());
        const k = Math.min(1, (t - t0) / dur);
        fn(ease(k));
        if (k < 1) requestAnimationFrame(f);
        else res();
      };
      requestAnimationFrame(f);
    });
  // Apple-style spring: response in seconds, damping ratio (1 = no overshoot)
  const spring = (from: number, to: number, fn: (v: number) => void, response = 0.4, damping = 1) =>
    new Promise<void>((res, rej) => {
      if (!on) return rej(new Cancelled());
      if (reduced()) {
        fn(to);
        return res();
      }
      const k = Math.pow((2 * Math.PI) / response, 2);
      const c = (4 * Math.PI * damping) / response;
      let x = from;
      let v = 0;
      let last = performance.now();
      const f = (t: number) => {
        if (!on) return rej(new Cancelled());
        const dt = Math.min(0.032, (t - last) / 1000);
        last = t;
        v += (k * (to - x) - c * v) * dt;
        x += v * dt;
        fn(x);
        if (Math.abs(to - x) > 0.002 * Math.max(1, Math.abs(to - from)) || Math.abs(v) > 0.02)
          requestAnimationFrame(f);
        else {
          fn(to);
          res();
        }
      };
      requestAnimationFrame(f);
    });
  const count = (from: number, to: number, ms: number, set: (v: number) => void, every = 70) => {
    let last = 0;
    return tween(ms, (k) => {
      const now = performance.now();
      if (k === 1 || now - last > every) {
        last = now;
        set(from + (to - from) * k);
      }
    });
  };
  const anim = (
    el: Element | null | undefined,
    frames: Keyframe[],
    opts: KeyframeAnimationOptions
  ) => {
    if (!el || !on) return null;
    const r = reduced();
    return el.animate(frames, {
      ...opts,
      duration: r ? 1 : opts.duration,
      delay: r ? 0 : opts.delay,
    });
  };
  return { alive, cancel: () => void (on = false), wait, tween, spring, count, anim };
}

/** Runs a sequence and swallows its cancellation. */
export async function script(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    if (!(e instanceof Cancelled)) throw e;
  }
}

/**
 * Waits for a real tap: `bind` receives the resolver a button calls. The wait
 * ends with Cancelled if the run stops first (the prototype's check loop).
 */
export function waitTap<T>(run: Run, bind: (res: (v: T) => void) => void): Promise<T> {
  return new Promise<T>((res, rej) => {
    let done = false;
    bind((v) => {
      done = true;
      res(v);
    });
    const check = () => {
      if (done) return;
      if (!run.alive()) rej(new Cancelled());
      else setTimeout(check, 200);
    };
    check();
  });
}

/** The end screen's arrival: a short rise and fade (End.fade). */
export function fadeIn(run: Run, el: Element | null | undefined, delay = 0) {
  return run.anim(
    el,
    [
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "none" },
    ],
    { duration: 420, delay, fill: "both", easing: EASE }
  );
}

/** A page leaves: it shrinks a little and fades (P.leave "shrink"). */
export function leave(run: Run, el: HTMLElement | null) {
  if (!el) return Promise.resolve();
  return run.tween(380, (k) => {
    el.style.transform = `scale(${1 - 0.06 * k})`;
    el.style.opacity = String(1 - k);
  });
}

/**
 * Starts a sequence on mount and cancels it on unmount. The run is created
 * inside the effect, so StrictMode's double invocation gets a fresh run.
 */
export function useScript(fn: (run: Run) => Promise<void>, deps: unknown[] = []) {
  const ref = useRef<Run | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    const run = createRun();
    ref.current = run;
    void script(() => fnRef.current(run));
    return () => {
      run.cancel();
      if (ref.current === run) ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
