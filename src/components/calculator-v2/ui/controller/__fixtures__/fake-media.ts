// Test-only MediaQuerySource (10 Task 2). Each query keeps a `matches` value and a set of
// `change` listeners; `set` fires `change` only when the value changes, and `listeners()` counts
// the listeners still attached across every query, so a test can check that `dispose` removed
// them. Never imported by production code.

import type { MediaQuerySource } from "../media";

type ChangeListener = EventListenerOrEventListenerObject;

export function fakeMedia(
  initial: Record<string, boolean> = {}
): MediaQuerySource & { set(q: string, matches: boolean): void; listeners(): number } {
  const values = new Map<string, boolean>(Object.entries(initial));
  const listenerSets = new Map<string, Set<ChangeListener>>();
  const listenersOf = (query: string) => {
    let set = listenerSets.get(query);
    if (set === undefined) {
      set = new Set();
      listenerSets.set(query, set);
    }
    return set;
  };

  return {
    matchMedia(query) {
      const list = {
        get matches() {
          return values.get(query) ?? false;
        },
        media: query,
        onchange: null,
        addEventListener(type: string, listener: ChangeListener | null) {
          if (type === "change" && listener !== null) listenersOf(query).add(listener);
        },
        removeEventListener(type: string, listener: ChangeListener | null) {
          if (type === "change" && listener !== null) listenersOf(query).delete(listener);
        },
        addListener(listener: ChangeListener | null) {
          list.addEventListener("change", listener);
        },
        removeListener(listener: ChangeListener | null) {
          list.removeEventListener("change", listener);
        },
        dispatchEvent: () => false,
      };
      return list as unknown as MediaQueryList;
    },
    set(query, matches) {
      if ((values.get(query) ?? false) === matches) return;
      values.set(query, matches);
      const event = { type: "change", matches, media: query } as unknown as MediaQueryListEvent;
      for (const listener of [...listenersOf(query)]) {
        if (typeof listener === "function") listener(event);
        else listener.handleEvent(event);
      }
    },
    listeners: () => [...listenerSets.values()].reduce((count, set) => count + set.size, 0),
  };
}
