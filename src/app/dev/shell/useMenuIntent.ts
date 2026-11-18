// When the desktop menu opens. It opens when the pointer rests on it, not when it only passes
// over: coming back to the browser from another screen sweeps the pointer across the left edge, and
// that used to open it (founder, 2026-11-16). It also shuts when the pointer leaves the page or the
// window loses focus, since the menu is told of no "leave" then.
import { useEffect, useRef } from "react";

export function useMenuIntent(setOpen: (open: boolean) => void, held: boolean) {
  const opening = useRef(0);
  const openSoon = () => {
    window.clearTimeout(opening.current);
    opening.current = window.setTimeout(() => setOpen(true), 110);
  };
  const notYet = () => window.clearTimeout(opening.current);
  useEffect(() => {
    if (held) return;
    const shut = () => {
      window.clearTimeout(opening.current);
      setOpen(false);
    };
    const gone = () => document.hidden && shut();
    window.addEventListener("blur", shut);
    document.documentElement.addEventListener("mouseleave", shut);
    document.addEventListener("visibilitychange", gone);
    return () => {
      window.removeEventListener("blur", shut);
      document.documentElement.removeEventListener("mouseleave", shut);
      document.removeEventListener("visibilitychange", gone);
    };
  }, [held, setOpen]);
  return { openSoon, notYet };
}
