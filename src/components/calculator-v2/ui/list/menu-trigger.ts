// How a row or column tab opens its menu (R-4, D-12, D-13): a long-press of LONG_PRESS_MS, a
// right-click, Shift+F10 or the ContextMenu key. The click that ends a long-press is consumed, so
// it does not also toggle the tab.

import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";

export const LONG_PRESS_MS = 500;

export interface MenuTrigger {
  onContextMenu(e: MouseEvent): void;
  onKeyDown(e: KeyboardEvent): void;
  onPointerDown(): void;
  onPointerUp(): void;
  onPointerLeave(): void;
}

/** `open` returns false when there is no menu to show; the browser's own menu then stays. */
export function useMenuTrigger(open: () => boolean | void): {
  trigger: MenuTrigger;
  consumeClick(): boolean;
} {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressed = useRef(false);
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);
  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    trigger: {
      onContextMenu(e) {
        if (latest.current() !== false) e.preventDefault();
      },
      onKeyDown(e) {
        if ((e.key === "F10" && e.shiftKey) || e.key === "ContextMenu") {
          if (latest.current() !== false) e.preventDefault();
        }
      },
      onPointerDown() {
        pressed.current = false;
        cancel();
        timer.current = setTimeout(() => {
          timer.current = null;
          pressed.current = latest.current() !== false;
        }, LONG_PRESS_MS);
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
    },
    consumeClick() {
      const was = pressed.current;
      pressed.current = false;
      return was;
    },
  };
}

/** Closes a popup on Escape (one KB-3 layer) and on a press outside it and its trigger. */
export function usePopupDismiss(
  open: boolean,
  id: string,
  refs: { popup: { current: HTMLElement | null }; trigger: { current: HTMLElement | null } },
  escape: { push(layer: { id: string; close(): void }): () => void } | null,
  close: (refocus: boolean) => void
): void {
  const latest = useRef(close);
  useEffect(() => {
    latest.current = close;
  });
  useEffect(() => {
    if (!open || escape === null) return;
    return escape.push({ id, close: () => latest.current(true) });
  }, [open, escape, id]);
  useEffect(() => {
    if (!open) return;
    const root = refs.popup.current?.getRootNode() as Document | ShadowRoot | undefined;
    if (root === undefined) return;
    const onPress = (e: Event) => {
      const path = e.composedPath();
      const inside = [refs.popup.current, refs.trigger.current].some(
        (el) => el !== null && path.includes(el)
      );
      if (!inside) latest.current(false);
    };
    root.addEventListener("pointerdown", onPress, { capture: true });
    return () => root.removeEventListener("pointerdown", onPress, { capture: true });
  }, [open, refs.popup, refs.trigger]);
}
