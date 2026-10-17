// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installDomStubs } from "../../__fixtures__/dom-stubs";
import { KarmanCalculator } from "../../KarmanCalculator";

type Restore = () => void;
type Listener = { target: string; type: string; listener: unknown; capture: boolean };
type AnyFn = (...args: never[]) => unknown;

let restoreDom: Restore = () => {};
let untrack: Restore = () => {};
beforeEach(() => {
  restoreDom = installDomStubs();
});
afterEach(() => {
  untrack();
  untrack = () => {};
  restoreDom();
  document.body.replaceChildren();
});

function mount(): HTMLElement {
  return document.body.appendChild(document.createElement("div"));
}
function caught(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

/** Sets `target[key]` as a configurable own property; the returned function puts it back. */
function patch(target: object, key: PropertyKey, value: unknown): Restore {
  const own = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
  return () => {
    if (own === undefined) Reflect.deleteProperty(target, key);
    else Object.defineProperty(target, key, own);
  };
}
function captureOf(options: unknown): boolean {
  return typeof options === "boolean" ? options : !!(options as { capture?: boolean })?.capture;
}

/**
 * Tracks listeners on window, document and document.fonts, MutationObserver and ResizeObserver
 * targets, matchMedia list listeners, and timeouts, intervals and frames scheduled from now on.
 */
function trackResources(): {
  open(): string[];
  observers(): number;
  media(): number;
  pending(): number;
} {
  const restorers: Restore[] = [];
  const fonts = Object.assign(new EventTarget(), {
    ready: Promise.resolve(),
    check: () => true,
    load: async () => [],
  });
  restorers.push(patch(document, "fonts", fonts));

  const listeners: Listener[] = [];
  const mediaListeners: Listener[] = [];
  const track = (
    list: Listener[],
    name: string,
    target: EventTarget,
    addKey: string,
    removeKey: string
  ) => {
    const add = (target as unknown as Record<string, AnyFn>)[addKey];
    const remove = (target as unknown as Record<string, AnyFn>)[removeKey];
    if (typeof add !== "function" || typeof remove !== "function") return;
    const find = (type: string, listener: unknown, capture: boolean) =>
      list.findIndex(
        (l) =>
          l.target === name && l.type === type && l.listener === listener && l.capture === capture
      );
    restorers.push(
      patch(
        target,
        addKey,
        function (this: unknown, type: string, listener: unknown, options?: unknown) {
          const capture = captureOf(options);
          if (listener != null && find(type, listener, capture) < 0) {
            list.push({ target: name, type, listener, capture });
            const signal = (options as { signal?: AbortSignal } | undefined)?.signal;
            signal?.addEventListener("abort", () => {
              const i = find(type, listener, capture);
              if (i >= 0) list.splice(i, 1);
            });
          }
          return (add as (...a: unknown[]) => unknown).call(this, type, listener, options);
        }
      ),
      patch(
        target,
        removeKey,
        function (this: unknown, type: string, listener: unknown, options?: unknown) {
          const i = find(type, listener, captureOf(options));
          if (i >= 0) list.splice(i, 1);
          return (remove as (...a: unknown[]) => unknown).call(this, type, listener, options);
        }
      )
    );
  };
  track(listeners, "window", window, "addEventListener", "removeEventListener");
  track(listeners, "document", document, "addEventListener", "removeEventListener");
  track(listeners, "document.fonts", fonts, "addEventListener", "removeEventListener");

  const hosts = globalThis === (window as unknown) ? [globalThis] : [globalThis, window];
  const active = new Map<object, Set<unknown>>();
  for (const name of ["MutationObserver", "ResizeObserver"] as const) {
    const Base = (window as unknown as Record<string, new (cb: never) => object>)[name];
    if (typeof Base !== "function") continue;
    const Tracked = class extends (Base as new (cb: never) => {
      observe(t: unknown, o?: unknown): void;
      disconnect(): void;
      unobserve?(t: unknown): void;
    }) {
      observe(t: unknown, o?: unknown): void {
        const targets = active.get(this) ?? new Set<unknown>();
        targets.add(t);
        active.set(this, targets);
        super.observe(t, o);
      }
      unobserve(t: unknown): void {
        active.get(this)?.delete(t);
        if (active.get(this)?.size === 0) active.delete(this);
        super.unobserve?.(t);
      }
      disconnect(): void {
        active.delete(this);
        super.disconnect();
      }
    };
    for (const host of hosts) restorers.push(patch(host, name, Tracked));
  }

  const matchMedia = window.matchMedia;
  const trackedMatchMedia = (query: string) => {
    const list = matchMedia.call(window, query);
    track(mediaListeners, `media ${query}`, list, "addEventListener", "removeEventListener");
    track(mediaListeners, `media ${query}`, list, "addListener", "removeListener");
    return list;
  };
  for (const host of hosts) restorers.push(patch(host, "matchMedia", trackedMatchMedia));

  const pending = new Set<string>();
  const timers = { setTimeout, clearTimeout, setInterval, clearInterval };
  const frames = {
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  const fns: Record<string, unknown> = {
    setTimeout: (cb: (...a: unknown[]) => void, ms?: number, ...rest: unknown[]) => {
      let key = "";
      const id = timers.setTimeout(
        (...a: unknown[]) => {
          pending.delete(key);
          cb(...a);
        },
        ms,
        ...rest
      );
      key = `timer ${String(id)}`;
      pending.add(key);
      return id;
    },
    setInterval: (cb: (...a: unknown[]) => void, ms?: number, ...rest: unknown[]) => {
      const id = timers.setInterval(cb, ms, ...rest);
      pending.add(`timer ${String(id)}`);
      return id;
    },
    clearTimeout: (id: unknown) => {
      pending.delete(`timer ${String(id)}`);
      timers.clearTimeout(id as never);
    },
    clearInterval: (id: unknown) => {
      pending.delete(`timer ${String(id)}`);
      timers.clearInterval(id as never);
    },
  };
  if (typeof frames.requestAnimationFrame === "function") {
    fns.requestAnimationFrame = (cb: FrameRequestCallback) => {
      let key = "";
      const id = frames.requestAnimationFrame.call(globalThis, (t) => {
        pending.delete(key);
        cb(t);
      });
      key = `frame ${id}`;
      pending.add(key);
      return id;
    };
    fns.cancelAnimationFrame = (id: number) => {
      pending.delete(`frame ${id}`);
      frames.cancelAnimationFrame.call(globalThis, id);
    };
  }
  for (const host of hosts)
    for (const [key, fn] of Object.entries(fns)) restorers.push(patch(host, key, fn));

  untrack = () => {
    for (const restore of restorers.reverse()) restore();
  };
  return {
    open: () => listeners.map((l) => `${l.target} ${l.type}`),
    observers: () => active.size,
    media: () => mediaListeners.length,
    pending: () => pending.size,
  };
}

it("AR-60 destroy() releases listeners (document.fonts too), observers, media queries, timers, frames, the engine, the React root and shadow children, and is idempotent", async () => {
  new KarmanCalculator(mount()).destroy(); // React's one-time document listeners
  const track = trackResources();
  const el = mount();
  const calc = new KarmanCalculator(el, undefined, { announceResetOnMount: true });
  calc.updateSettings({ keypad: true });
  await vi.waitFor(() => expect(el.shadowRoot!.querySelector("[data-row-id]")).not.toBeNull());
  calc.focusExpression("1");
  const region = el.shadowRoot!.querySelector('[role="status"]')!;
  const live = globalThis.__karmanCalculatorCounters!.calculators;
  const engineDestroy = vi.spyOn(calc.engine, "destroy");
  calc.destroy();
  calc.destroy();
  expect([
    track.open(),
    track.observers(),
    track.media(),
    el.shadowRoot!.childNodes.length,
    engineDestroy.mock.calls.length,
  ]).toEqual([[], 0, 0, 0, 1]);
  expect(globalThis.__karmanCalculatorCounters!.calculators).toBe(live - 1);
  expect(caught(() => calc.getExpressions())).toMatchObject({ code: "destroyed" });
  await new Promise((r) => setTimeout(r, 600));
  expect([track.open(), track.pending(), region.textContent]).toEqual([[], 0, ""]);
}); // no late timer, frame or announcement; jsdom's engine is main-thread, so Task 6 checks the worker
