"use client";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Sheets and full-screen runs render into the app's top layer, above the rail and the main
 *  column's stacking context, but still inside the app's theme variables. */
export const LAYER_ID = "student-layer";
const noop = () => () => undefined;

export function Layer({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
  const target = mounted ? document.getElementById(LAYER_ID) : null;
  return target ? createPortal(children, target) : <>{children}</>;
}

/** Escape closes the open sheet. */
export function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}
