import { useEffect, useState } from "react";
import { buildHash, parseHash } from "@/gallery/hash";
import { DEFAULTS } from "@/gallery/routes";
import type { RailItem } from "@/design-system/components/IconRail";

/**
 * Moving between student screens keeps every gallery switch (plan, state,
 * device, theme, mode, type, background, glass, bare) in the hash, so a
 * screenshot or a tour link opens the same view. A screen's own parameters
 * (a chosen skill, a phase) ride after them and are read with useExtra().
 */
export type StudentScreen =
  | "home"
  | "daily10"
  | "practice"
  | "endless"
  | "trials"
  | "test"
  | "test-review"
  | "classes"
  | "progress"
  | "rewards"
  | "onboarding"
  | "diagnostic"
  | "settings";

export function hrefTo(id: StudentScreen, extra?: Record<string, string>): string {
  const { settings } = parseHash();
  let h = buildHash(["screen", "student", id], { ...settings, portal: "student", screen: id });
  if (extra && Object.keys(extra).length) {
    const q = new URLSearchParams(extra).toString();
    h += (h.includes("?") ? "&" : "?") + q;
  }
  return h;
}

export function goTo(id: StudentScreen, extra?: Record<string, string>) {
  location.hash = hrefTo(id, extra);
}

/** Rewrite the gallery's state switch in place, keeping every other switch and the screen's own parameters. */
function setStateParam(state: string) {
  const [p, q = ""] = location.hash.split("?");
  const s = new URLSearchParams(q);
  if (state === DEFAULTS.state) s.delete("state");
  else s.set("state", state);
  const str = s.toString();
  location.hash = `${p}${str ? `?${str}` : ""}`;
}

/** Retry after an error: the block shows its skeleton, then the data lands (the demo's stand-in for a refetch). */
export function retry() {
  setStateParam("loading");
  setTimeout(() => setStateParam("long-time"), 800);
}

/** A screen in another portal, for the hand-off to the Daily 10 end screen and the parent's view. */
export function hrefToPortal(portal: "daily10" | "parent", screen: string): string {
  const { settings } = parseHash();
  return buildHash(["screen", portal, screen], { ...settings, portal, screen });
}

export function currentScreen(): StudentScreen {
  const { settings, path } = parseHash();
  return (settings.screen || path[2] || "home") as StudentScreen;
}

/** A screen's own hash parameter, live. */
export function useExtra(key: string): string | null {
  const read = () => new URLSearchParams((location.hash.split("?")[1] ?? "").trim()).get(key);
  const [v, setV] = useState<string | null>(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return v;
}

/** The rail on desktop and iPad: six sections and Settings at the bottom. */
export const RAIL: RailItem[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "practice", label: "Practice", icon: "practice" },
  { id: "test", label: "Tests", icon: "tests" },
  { id: "classes", label: "Classes and sessions", icon: "calendar" },
  { id: "progress", label: "Progress", icon: "streak" },
  { id: "rewards", label: "Rewards", icon: "tokens" },
];
export const RAIL_BOTTOM: RailItem[] = [{ id: "settings", label: "Settings", icon: "settings" }];
/** The phone bar: five, within thumb reach. Classes and sessions open from Home's next-class row. */
export const BAR: RailItem[] = [RAIL[0], RAIL[1], RAIL[2], RAIL[4], RAIL[5]];

/** The section a screen belongs to, for the active mark. */
export function sectionOf(screen: StudentScreen): string {
  if (screen === "daily10" || screen === "endless" || screen === "trials") return "practice";
  if (screen === "test-review" || screen === "diagnostic") return "test";
  if (screen === "onboarding") return "home";
  return screen;
}

/** A per-viewer preference kept in this browser only. */
export function readPref<T extends string>(key: string, ok: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (ok as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage can be off */
  }
}
