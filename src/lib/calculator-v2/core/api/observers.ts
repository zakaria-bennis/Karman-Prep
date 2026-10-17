// API-8 observers and the engine's change notification (07 Decisions 10, 13 and 14): callbacks run
// after the change commits, at most once per animation frame per name. Package-internal.

import type { PixelSize, Viewport } from "../../plot/viewport";
import type { WorkerToMain } from "../../worker/protocol";
import { KarmanCalculatorError } from "./errors";
import { sameViewport } from "./state";
import type { ChangeEvent, ObservableName } from "./types";

/**
 * Named callbacks. Every name marked dirty since the last frame runs its callbacks once in the next
 * frame, in the order the names were marked; one frame is scheduled however many marks it takes.
 * After `dispose()` nothing is added, marked or run.
 */
export class ObserverRegistry<N extends string> {
  private readonly scheduleFrame: (cb: () => void) => void;
  private readonly callbacks = new Map<N, Set<() => void>>();
  private readonly dirty = new Set<N>();
  private scheduled = false;
  private disposed = false;

  constructor(scheduleFrame: (cb: () => void) => void) {
    this.scheduleFrame = scheduleFrame;
  }

  /** Adds `cb` under `name`; the returned function removes that one callback. */
  add(name: N, cb: () => void): () => void {
    if (!this.disposed) {
      const set = this.callbacks.get(name) ?? new Set();
      this.callbacks.set(name, set.add(cb));
    }
    return () => this.remove(name, cb);
  }

  /** Removes `cb` from `name`, or every callback of `name` when `cb` is omitted. */
  remove(name: N, cb?: () => void): void {
    if (cb === undefined) this.callbacks.delete(name);
    else this.callbacks.get(name)?.delete(cb);
  }

  markDirty(name: N): void {
    if (this.disposed) return;
    this.dirty.add(name);
    if (this.scheduled) return;
    this.scheduled = true;
    this.scheduleFrame(() => this.flush());
  }

  dispose(): void {
    this.disposed = true;
    this.callbacks.clear();
    this.dirty.clear();
  }

  /** Runs each dirty name's callbacks once; a callback removed meanwhile does not run. */
  private flush(): void {
    this.scheduled = false;
    const names = [...this.dirty];
    this.dirty.clear();
    for (const name of names) {
      for (const cb of [...(this.callbacks.get(name) ?? [])]) {
        if (!this.disposed && this.callbacks.get(name)?.has(cb)) cb();
      }
    }
  }
}

/** The API-8 names, and the internal ones: "change" events and frame-time subscriber runs. */
type EngineName = ObservableName | "change" | "snapshot";
type ChangeCallback = (event: ChangeEvent) => void;

const OBSERVABLE_NAMES: ReadonlySet<unknown> = new Set<ObservableName>([
  "expressionAnalysis",
  "graphpaperBounds",
  "settings",
  "focusedExpression",
  "mode",
]);

function invalid(method: string, text: string): never {
  throw new KarmanCalculatorError("invalid-argument", `${method}: ${text}`);
}

/** API-13: an API-8 name, or invalid-argument. */
function observable(name: unknown, method: string): ObservableName {
  if (!OBSERVABLE_NAMES.has(name)) invalid(method, `unknown name ${String(name)}`);
  return name as ObservableName;
}

/** API-13: "change", the one event name, or invalid-argument. */
function changeEvent(name: unknown, method: string): void {
  if (name !== "change") invalid(method, `unknown event ${String(name)}`);
}

/** API-13: a function, or undefined where the callback is optional; else invalid-argument. */
function callbackOf<F>(callback: unknown, method: string, optional = false): F {
  if (typeof callback !== "function" && !(optional && callback === undefined)) {
    invalid(method, "callback must be a function");
  }
  return callback as F;
}

/**
 * The engine's notification (Decision 13). `subscribe` listeners run synchronously after a commit
 * made by a method call and once per frame after worker-driven changes. API-8 observers and
 * "change" events run once per frame per name; a change event carries the frame's latest revision
 * and is user-initiated when any change in the frame was (Decision 10). A frame whose revision did
 * not move sends no change event.
 */
export class EngineObservers {
  private readonly registry: ObserverRegistry<EngineName>;
  private readonly revision: () => number;
  private readonly listeners = new Set<() => void>();
  private readonly changeCallbacks = new Set<ChangeCallback>();
  private userInitiated = false;
  private sentRevision: number;
  private bounds: { viewport: Viewport; size: PixelSize } | null = null;

  constructor(scheduleFrame: (cb: () => void) => void, revision: () => number) {
    this.registry = new ObserverRegistry(scheduleFrame);
    this.revision = revision;
    this.sentRevision = revision();
    this.registry.add("snapshot", () => this.runListeners());
    this.registry.add("change", () => this.sendChange());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  observe(name: ObservableName, callback: () => void): () => void {
    return this.registry.add(observable(name, "observe"), callbackOf(callback, "observe"));
  }

  unobserve(name: ObservableName, callback?: () => void): void {
    this.registry.remove(observable(name, "unobserve"), callbackOf(callback, "unobserve", true));
  }

  observeEvent(name: "change", callback: ChangeCallback): () => void {
    changeEvent(name, "observeEvent");
    const fn = callbackOf<ChangeCallback>(callback, "observeEvent");
    this.changeCallbacks.add(fn);
    return () => {
      this.changeCallbacks.delete(fn);
    };
  }

  unobserveEvent(name: "change", callback?: ChangeCallback): void {
    changeEvent(name, "unobserveEvent");
    const fn = callbackOf<ChangeCallback | undefined>(callback, "unobserveEvent", true);
    if (fn === undefined) this.changeCallbacks.clear();
    else this.changeCallbacks.delete(fn);
  }

  markDirty(name: ObservableName): void {
    this.registry.markDirty(name);
  }

  /**
   * API-8: marks graphpaperBounds when the viewport or the graph size differs from the last noted
   * one. The first call only records them.
   */
  noteBounds(viewport: Viewport, size: PixelSize): void {
    const last = this.bounds;
    this.bounds = { viewport, size };
    if (last === null) return;
    const sameSize = last.size.width === size.width && last.size.height === size.height;
    if (!sameSize || !sameViewport(last.viewport, viewport)) {
      this.registry.markDirty("graphpaperBounds");
    }
  }

  /** After a commit made by a method call: queues the change event, then runs the subscribers. */
  committed(userInitiated: boolean): void {
    this.userInitiated ||= userInitiated;
    this.registry.markDirty("change");
    this.runListeners();
  }

  /**
   * After an accepted worker result: the subscribers run in the next frame, and an accepted value
   * or overrun also marks expressionAnalysis.
   */
  workerChanged(type: WorkerToMain["type"]): void {
    this.registry.markDirty("snapshot");
    if (type === "value" || type === "overrun") this.registry.markDirty("expressionAnalysis");
  }

  dispose(): void {
    this.registry.dispose();
    this.listeners.clear();
    this.changeCallbacks.clear();
  }

  private runListeners(): void {
    for (const listener of [...this.listeners]) listener();
  }

  private sendChange(): void {
    const revision = this.revision(),
      isUserInitiated = this.userInitiated;
    this.userInitiated = false;
    if (revision === this.sentRevision) return;
    this.sentRevision = revision;
    for (const callback of [...this.changeCallbacks]) {
      if (this.changeCallbacks.has(callback)) callback({ revision, isUserInitiated });
    }
  }
}
