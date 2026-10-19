// Live media-query and pointer watchers for the calculator shell (10 Task 2). The facade feeds
// their values into the shell store: prefers-reduced-motion (AR-38, AN-13) and the coarse or
// fine pointer that the keypad policy reads (K-2, 10 Decision 5). `window` satisfies
// MediaQuerySource; tests pass ui/controller/__fixtures__/fake-media.ts instead.

/** A running watcher: `initial` is the value when watching began; later values reach only the callback. */
export type Watch<T> = { initial: T; dispose(): void };
export type Pointer = "fine" | "coarse";
export interface MediaQuerySource {
  matchMedia(query: string): MediaQueryList;
}

export const COARSE_POINTER_QUERY = "(any-pointer: coarse)";

/** Follows one media query live: `on` hears each later `change`; `dispose` removes the listener. */
export function watchMediaQuery(
  m: MediaQuerySource,
  q: string,
  on: (v: boolean) => void
): Watch<boolean> {
  const list = m.matchMedia(q);
  const listener = (event: MediaQueryListEvent) => on(event.matches);
  list.addEventListener("change", listener);
  return {
    initial: list.matches,
    dispose: () => list.removeEventListener("change", listener),
  };
}

/**
 * 10 Decision 5: the pointer is coarse when `(any-pointer: coarse)` matches or a touch or pen
 * `pointerdown` reaches `target` (capture phase). It never returns to fine, so `on` hears
 * `"coarse"` at most once.
 */
export function watchPointer(
  m: MediaQuerySource,
  target: EventTarget,
  on: (p: Pointer) => void
): Watch<Pointer> {
  let current: Pointer = "fine";
  const becomeCoarse = () => {
    if (current === "coarse") return;
    current = "coarse";
    on("coarse");
  };
  const media = watchMediaQuery(m, COARSE_POINTER_QUERY, (matches) => {
    if (matches) becomeCoarse();
  });
  if (media.initial) current = "coarse";
  const onPointerDown = (event: Event) => {
    const { pointerType } = event as PointerEvent;
    if (pointerType === "touch" || pointerType === "pen") becomeCoarse();
  };
  target.addEventListener("pointerdown", onPointerDown, { capture: true });
  return {
    initial: current,
    dispose() {
      media.dispose();
      target.removeEventListener("pointerdown", onPointerDown, { capture: true });
    },
  };
}
