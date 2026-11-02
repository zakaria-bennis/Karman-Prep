// Window state and student preferences for the quiz calculator (AR-25, owner decisions of
// 2026-10-21). The mode, the floating place and size, and the dock width outlive one question's
// scope and the page: they are kept in localStorage, so after Next, Previous, a close or a reload
// the window reopens where it was while its content is fresh. The student's calculator settings
// (angle mode and the rest, PREFERENCE_KEYS) carry from one question's calculator to the next for
// the page session; the settings that describe one question's graph view do not. Every storage access is in try/catch, so the store also works without
// storage. Eager module: no browser global at module scope (AR-2); geometry helpers take the
// viewport as an argument.

import type { CalculatorSettings } from "@/lib/calculator/core/api/types"; // type-only (AR-1)

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
  preferences: CalculatorPreferences | null; // null until a calculator of this page reports them
}

/**
 * The settings a student keeps from question to question (owner decisions, 2026-10-21): angle and
 * complex mode, the grid, axis-number, arrow and minor-gridline toggles, the axes shown or
 * hidden, display size, the keypad shown or hidden, trace and braille. The rest reset
 * with the calculator's content: the settings that describe one question's graph view (the
 * locked viewport, the axis labels and step sizes, pi axis labels; the axis bounds are the view
 * itself), `mode` (graphing only), `reducedMotion` (set by the host) and `expressionsCollapsed`
 * (a collapsed list would hide the fresh question's empty row).
 */
export const PREFERENCE_KEYS = [
  "angleMode",
  "complex",
  "showGrid",
  "polarGrid",
  "minorGridlines",
  "arrows",
  "axisNumbers",
  "xAxis",
  "yAxis", // only `show` carries: the label and step reset (preferencesOf)
  "displaySize",
  "keypad",
  "trace",
  "pointsOfInterest",
  "brailleMode",
  "sixKeyInput",
] as const satisfies readonly (keyof CalculatorSettings)[];

export type CalculatorPreferences = Pick<CalculatorSettings, (typeof PREFERENCE_KEYS)[number]>;

/**
 * The preference subset of `settings`, copied so later changes to `settings` never leak in. An
 * axis keeps whether it shows; its label and step go back to the S-9 defaults (none, automatic).
 */
export function preferencesOf(settings: CalculatorSettings): CalculatorPreferences {
  const out: Record<string, unknown> = {};
  for (const key of PREFERENCE_KEYS) out[key] = settings[key];
  out.xAxis = { show: settings.xAxis.show, label: "", step: null };
  out.yAxis = { show: settings.yAxis.show, label: "", step: null };
  return out as CalculatorPreferences;
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
    preferences: null,
  };
}

/** The localStorage key of the window geometry (mode, restore mode, floating rect, dock width). */
export const WINDOW_STORAGE_KEY = "karman.calculator.window";

type StoredGeometry = Pick<WindowStoreState, "mode" | "restoreMode" | "floatingRect" | "dockWidth">;

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function readRect(value: unknown): WindowRect | null {
  if (typeof value !== "object" || value === null) return null;
  const { x, y, width, height } = value as Record<string, unknown>;
  return finite(x) && finite(y) && finite(width) && finite(height) && width > 0 && height > 0
    ? { x, y, width, height }
    : null;
}

/** The stored geometry, field by field; anything missing or malformed is left at its default. */
export function parseStoredGeometry(text: string | null): Partial<StoredGeometry> {
  if (text === null) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {};
  }
  if (typeof raw !== "object" || raw === null) return {};
  const fields = raw as Record<string, unknown>;
  const out: Partial<StoredGeometry> = {};
  // Full screen follows the viewport (AR-26), so it is never a mode to come back to.
  if (fields.mode === "floating" || fields.mode === "docked" || fields.mode === "maximized") {
    out.mode = fields.mode;
  }
  if (fields.restoreMode === "floating" || fields.restoreMode === "docked") {
    out.restoreMode = fields.restoreMode;
  }
  const rect = readRect(fields.floatingRect);
  if (rect) out.floatingRect = rect;
  if (finite(fields.dockWidth) && fields.dockWidth > 0) out.dockWidth = fields.dockWidth;
  return out;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // blocked storage throws on access
  }
}

function load(): Partial<StoredGeometry> {
  try {
    return parseStoredGeometry(storage()?.getItem(WINDOW_STORAGE_KEY) ?? null);
  } catch {
    return {};
  }
}

function save(next: WindowStoreState) {
  const geometry: StoredGeometry = {
    mode: next.mode === "fullscreen" ? next.restoreMode : next.mode,
    restoreMode: next.restoreMode,
    floatingRect: next.floatingRect,
    dockWidth: next.dockWidth,
  };
  try {
    storage()?.setItem(WINDOW_STORAGE_KEY, JSON.stringify(geometry));
  } catch {
    // Full or blocked storage: the page session keeps the geometry in memory.
  }
}

let state: WindowStoreState = initialState();
let hydrated = false;
const listeners = new Set<() => void>();

/** The state, read from storage on the first client access of the page. */
function current(): WindowStoreState {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    state = { ...state, ...load() };
  }
  return state;
}

export const calculatorWindowStore: {
  get(): WindowStoreState;
  set(patch: Partial<WindowStoreState>): void;
  subscribe(listener: () => void): () => void;
  resetForTests(): void;
} = {
  /** The current snapshot; a new object after every `set`, so it suits `useSyncExternalStore`. */
  get() {
    return current();
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
    const before = current();
    const next: WindowStoreState = { ...before, ...defined };
    if ((patch.mode === "floating" || patch.mode === "docked") && patch.restoreMode === undefined) {
      next.restoreMode = patch.mode;
    }
    state = next;
    const geometryChanged =
      next.mode !== before.mode ||
      next.restoreMode !== before.restoreMode ||
      next.floatingRect !== before.floatingRect ||
      next.dockWidth !== before.dockWidth;
    if (geometryChanged) save(next);
    for (const listener of [...listeners]) listener();
  },
  /** Calls `listener` after every `set`; the returned function unsubscribes it. */
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /**
   * Restores the state a first visit starts with: the stored geometry is removed and the next
   * `get` reads storage again, as after a reload. Subscribers are kept and not notified.
   */
  resetForTests() {
    try {
      storage()?.removeItem(WINDOW_STORAGE_KEY);
    } catch {
      // Blocked storage: nothing to remove.
    }
    state = initialState();
    hydrated = false;
  },
};
