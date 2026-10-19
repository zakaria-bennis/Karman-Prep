// Page-session window state for the quiz calculator (AR-25): the mode, the floating place and
// size, and the dock width outlive one question's scope, so after Next or Previous the window
// reopens where it was while its content is fresh. The store is module state, so it survives
// client-side navigation and is lost on a full reload. Eager module: no browser global at module
// scope (AR-2); geometry helpers take the viewport as an argument.

export type WindowMode = "floating" | "docked" | "maximized" | "fullscreen";

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowStoreState {
  mode: WindowMode | null; // current or last mode
  restoreMode: "floating" | "docked";
  floatingRect: WindowRect | null;
  dockWidth: number | null;
  displaySize: "default" | "large" | null; // written from Phase 4
  reverseContrast: boolean | null; // written from Phase 4
}

export interface ViewportSize {
  width: number;
  height: number;
}

/** The floating start position (AR-22). */
export const FLOATING_ORIGIN = { x: 16, y: 64 } as const;
/** The minimum floating size (AR-22). */
export const FLOATING_MIN_SIZE = { width: 360, height: 280 } as const;
/** Arrow-key step for the move handle, the grip and the splitter. */
export const WINDOW_KEY_STEP = 16; // AR-22, AR-23, KB-10
/** Gap between the dock and the viewport edge, and between the dock and the workspace. */
export const DOCK_MARGIN = 12; /* AR-23 */
export const DOCK_MIN_WIDTH = 400;

/** The default floating size: `min(880px, 100vw - 32px)` by `min(600px, 100dvh - 80px)`. */
const FLOATING_DEFAULT_SIZE = { width: 880, height: 600 } as const;
const FLOATING_VIEWPORT_INSET = { width: 32, height: 80 } as const;
/** AR-23: the default dock width is `clamp(400px, 45vw, 720px)`. */
const DOCK_DEFAULT_SHARE = 0.45;
const DOCK_DEFAULT_MAX_WIDTH = 720;
/** AR-23: the dock never grows past `min(900px, 100vw - 480px)`. */
const DOCK_MAX_WIDTH = 900;
const DOCK_VIEWPORT_RESERVE = 480;

/** The floating window's first place and size in `viewport` (AR-22). */
export function defaultFloatingRect(viewport: ViewportSize): WindowRect {
  return {
    x: FLOATING_ORIGIN.x,
    y: FLOATING_ORIGIN.y,
    width: Math.min(FLOATING_DEFAULT_SIZE.width, viewport.width - FLOATING_VIEWPORT_INSET.width),
    height: Math.min(
      FLOATING_DEFAULT_SIZE.height,
      viewport.height - FLOATING_VIEWPORT_INSET.height
    ),
  };
}

/** `value` limited to `[min, max]`; the minimum wins when the range is empty. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * `rect` kept inside `viewport` (AR-22): the size between 360 × 280 and the viewport, then the
 * position between 0 and the viewport less that size. As with a CSS `min-width` and position
 * clamp, the minimum size and the 0 edge win in a viewport too small for both.
 */
export function clampFloatingRect(rect: WindowRect, viewport: ViewportSize): WindowRect {
  const width = clamp(rect.width, FLOATING_MIN_SIZE.width, viewport.width);
  const height = clamp(rect.height, FLOATING_MIN_SIZE.height, viewport.height);
  return {
    x: clamp(rect.x, 0, viewport.width - width),
    y: clamp(rect.y, 0, viewport.height - height),
    width,
    height,
  };
}

/** The dock's default width, `clamp(400px, 45vw, 720px)` rounded to whole pixels (AR-23). */
export function defaultDockWidth(viewportWidth: number): number {
  return Math.round(
    Math.min(DOCK_DEFAULT_MAX_WIDTH, Math.max(DOCK_MIN_WIDTH, DOCK_DEFAULT_SHARE * viewportWidth))
  );
}

/** `width` kept between 400 px and `min(900px, 100vw - 480px)`, never below 400 (AR-23). */
export function clampDockWidth(width: number, viewportWidth: number): number {
  const max = Math.max(
    DOCK_MIN_WIDTH,
    Math.min(DOCK_MAX_WIDTH, viewportWidth - DOCK_VIEWPORT_RESERVE)
  );
  return clamp(width, DOCK_MIN_WIDTH, max);
}

/**
 * The mode the window shows: full screen while the viewport asks for it (AR-26), else the stored
 * mode when it is floating, docked or maximized, else the mode to restore.
 */
export function windowModeFor(state: WindowStoreState, fullScreen: boolean): WindowMode {
  if (fullScreen) return "fullscreen";
  if (state.mode === "floating" || state.mode === "docked" || state.mode === "maximized") {
    return state.mode;
  }
  return state.restoreMode;
}

function initialState(): WindowStoreState {
  return {
    mode: null,
    restoreMode: "floating",
    floatingRect: null,
    dockWidth: null,
    displaySize: null,
    reverseContrast: null,
  };
}

let state: WindowStoreState = initialState();
const listeners = new Set<() => void>();

export const calculatorWindowStore: {
  get(): WindowStoreState;
  set(patch: Partial<WindowStoreState>): void;
  subscribe(listener: () => void): () => void;
  resetForTests(): void;
} = {
  /** The current snapshot; a new object after every `set`, so it suits `useSyncExternalStore`. */
  get() {
    return state;
  },
  /**
   * Merges `patch` (keys whose value is `undefined` are absent) into a new snapshot and notifies
   * every subscriber. A patch that sets the mode to floating or docked without a `restoreMode` also
   * makes that mode the one to restore (AR-26); maximized and full screen keep it.
   */
  set(patch) {
    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    ) as Partial<WindowStoreState>;
    const next: WindowStoreState = { ...state, ...defined };
    if ((patch.mode === "floating" || patch.mode === "docked") && patch.restoreMode === undefined) {
      next.restoreMode = patch.mode;
    }
    state = next;
    for (const listener of [...listeners]) listener();
  },
  /** Calls `listener` after every `set`; the returned function unsubscribes it. */
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Restores the state a fresh page starts with. Subscribers are kept and not notified. */
  resetForTests() {
    state = initialState();
  },
};
