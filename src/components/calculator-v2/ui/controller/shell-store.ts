// The shell store (01-interfaces-integration.md section 12): the browser-fed state the facade
// shares with React (size and layout, AR-29; skin and theme revision, TH-15; reduced-motion media,
// AR-38; pointer, K-2). `set` compares each patched key with the current value (`size` by width
// and height) and notifies subscribers only when one differs, so an unchanged patch keeps the same
// state object for useSyncExternalStore.

import type { PixelSize } from "@/lib/calculator-v2/plot/viewport";
import type { SkinId } from "@/lib/calculator-v2/theme/skins";
import type { Pointer } from "./media";

export interface ShellState {
  size: PixelSize;
  layout: "desktop" | "stacked";
  skin: SkinId;
  themeRevision: number;
  reducedMotionMedia: boolean;
  pointer: Pointer;
}
export interface ShellStore {
  get(): ShellState;
  set(patch: Partial<ShellState>): void;
  subscribe(l: () => void): () => void;
}

/** True when `patch` leaves `key` as it is (absent, undefined or an equal value). */
function unchanged(state: ShellState, patch: Partial<ShellState>, key: keyof ShellState): boolean {
  const value = patch[key];
  if (value === undefined) return true;
  if (key === "size") {
    const size = value as PixelSize;
    return size.width === state.size.width && size.height === state.size.height;
  }
  return Object.is(value, state[key]);
}

export function createShellStore(initial: ShellState): ShellStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const keys = (Object.keys(patch) as (keyof ShellState)[]).filter(
        (key) => !unchanged(state, patch, key)
      );
      if (keys.length === 0) return;
      state = { ...state, ...Object.fromEntries(keys.map((key) => [key, patch[key]])) };
      for (const listener of [...listeners]) listener();
    },
    subscribe(l) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}
