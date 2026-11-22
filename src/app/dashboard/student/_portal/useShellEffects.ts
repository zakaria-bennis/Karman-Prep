"use client";

// Small effects the portal's frame (Shell.tsx) runs, kept here so the frame stays readable.
import { useEffect } from "react";

/** The desktop rail: a wide screen with a pointer that can hover. */
const RAIL = "(min-width: 960px) and (hover: hover)";

/** Light or dark on the page, and the lit look. */
export function useMode(dark: boolean) {
  useEffect(() => {
    document.documentElement.setAttribute("data-kp-mode", dark ? "dark" : "light");
    document.documentElement.setAttribute("data-kp-look", "lit");
  }, [dark]);
}

/** Whether the desktop rail is shown, following the screen as it changes. */
export function useRail(setRail: (rail: boolean) => void) {
  useEffect(() => {
    const m = matchMedia(RAIL);
    const set = () => setRail(m.matches);
    set();
    m.addEventListener("change", set);
    return () => m.removeEventListener("change", set);
  }, [setRail]);
}

/** Escape steps back out of a number's page to Progress. */
export function useEscapeStat(inStat: boolean, dir: { current: number }, close: () => void) {
  useEffect(() => {
    if (!inStat) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      dir.current = -1;
      close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inStat]);
}
