// jsdom-only DOM stubs for calculator component tests (01-interfaces-runtime.md section 8.1;
// 00-index.md section 4, "Test layout"). jsdom has no ResizeObserver, no matchMedia and no canvas
// backend, so installDomStubs() puts inert stand-ins in their place and returns a function that
// puts the originals back. A stub ResizeObserver only records its targets: nothing resizes until a
// test calls triggerResize. Never imported by production code.

type Size = { width: number; height: number };

/** Each observed element and the stub observers watching it, shared by every stub instance. */
const observersByTarget = new Map<Element, Set<StubResizeObserver>>();

class StubResizeObserver implements ResizeObserver {
  private readonly callback: ResizeObserverCallback;
  private readonly targets = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    this.targets.add(target);
    const observers = observersByTarget.get(target) ?? new Set<StubResizeObserver>();
    observersByTarget.set(target, observers);
    observers.add(this);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
    const observers = observersByTarget.get(target);
    observers?.delete(this);
    if (observers?.size === 0) observersByTarget.delete(target);
  }

  disconnect(): void {
    for (const target of [...this.targets]) this.unobserve(target);
  }

  /** Runs the callback with one entry, as a browser does after a layout changes a target. */
  notify(entry: ResizeObserverEntry): void {
    this.callback([entry], this);
  }
}

/** A query result that never matches; its listener methods accept and ignore listeners. */
function stubMatchMedia(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  };
}

/**
 * Replaces `target[key]` with `value`. The returned function puts back the own property as it
 * was, or deletes it when there was none (jsdom has no own ResizeObserver or matchMedia).
 */
function replaceProperty<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K]
): () => void {
  const own = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
  return () => {
    if (own === undefined) Reflect.deleteProperty(target, key);
    else Object.defineProperty(target, key, own);
  };
}

/**
 * Installs a ResizeObserver that only records its targets, a matchMedia whose results never match,
 * and an HTMLCanvasElement.prototype.getContext that returns null. The returned function restores
 * all three as they were at install time (a test's own later replacement included) and forgets
 * every recorded target; calling it again does nothing.
 */
export function installDomStubs(): () => void {
  observersByTarget.clear();
  const restorers = [
    replaceProperty(globalThis, "ResizeObserver", StubResizeObserver),
    replaceProperty(window, "matchMedia", stubMatchMedia),
    replaceProperty(HTMLCanvasElement.prototype, "getContext", () => null),
  ];
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (const restore of restorers.reverse()) restore();
    observersByTarget.clear();
  };
}

/**
 * Calls each stub observer of `target` with one entry whose contentRect, borderBoxSize and
 * contentBoxSize all have `size`. Like WebKit, the entry has no devicePixelContentBoxSize.
 */
export function triggerResize(target: Element, size: Size): void {
  const observers = observersByTarget.get(target);
  if (observers === undefined) return;
  for (const observer of [...observers]) observer.notify(resizeEntry(target, size));
}

function resizeEntry(target: Element, { width, height }: Size): ResizeObserverEntry {
  const box: ResizeObserverSize = { inlineSize: width, blockSize: height };
  const entry: Omit<ResizeObserverEntry, "devicePixelContentBoxSize"> = {
    target,
    contentRect: new DOMRectReadOnly(0, 0, width, height),
    borderBoxSize: [box],
    contentBoxSize: [box],
  };
  return entry as ResizeObserverEntry;
}
