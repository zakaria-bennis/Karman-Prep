import { useEffect, useState } from "react";
import { buildHash, parseHash } from "@/gallery/hash";

/**
 * In-portal navigation. The gallery keys a screen by the `screen` query (see
 * src/gallery/Stage.tsx), so a link rewrites both the path and that query,
 * keeping every gallery switch. Extra params (`id` for a student or cohort)
 * ride along; the gallery drops them when a switch changes, and a screen
 * falls back to its default object then.
 */
export const SCREENS = [
  "portal",
  "today",
  "students",
  "student",
  "cohorts",
  "class",
  "homework",
  "schedule",
  "guarantee",
  "queue",
  "earnings",
  "update",
  "notes",
] as const;
export type ScreenId = (typeof SCREENS)[number];

export function hashParam(key: string): string | null {
  const q = location.hash.split("?")[1] ?? "";
  return new URLSearchParams(q).get(key);
}

export function hrefFor(id: ScreenId, params: Record<string, string> = {}): string {
  const { settings } = parseHash();
  let h = buildHash(["screen", "tutor", id], { ...settings, portal: "tutor", screen: id });
  const q = new URLSearchParams(params).toString();
  if (q) h += (h.includes("?") ? "&" : "?") + q;
  return h;
}

export function goScreen(id: ScreenId, params: Record<string, string> = {}) {
  location.hash = hrefFor(id, params);
}

/** The current screen id from the hash, so the shell can mark the rail. */
export function currentScreen(): ScreenId {
  const s = hashParam("screen") ?? parseHash().path[2] ?? "today";
  return (SCREENS as readonly string[]).includes(s) ? (s as ScreenId) : "today";
}

export function useHashParam(key: string): string | null {
  const [v, setV] = useState(() => hashParam(key));
  useEffect(() => {
    const on = () => setV(hashParam(key));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [key]);
  return v;
}
