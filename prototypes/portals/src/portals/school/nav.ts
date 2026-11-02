import { useEffect, useState } from "react";
import { buildHash, parseHash } from "@/gallery/hash";

/**
 * In-portal navigation. The gallery keys a screen by the `screen` query (see
 * src/gallery/Stage.tsx), so a link rewrites both the path and that query and
 * keeps every gallery switch. `id` rides along for a class or a student. The
 * role comes from the gallery's role switch: teacher sees the teacher portal,
 * anything else sees the admin's.
 */
export const SCREENS = [
  "portal",
  "overview",
  "classes",
  "class",
  "students",
  "student",
  "practice",
  "keys",
  "teachers",
  "seats",
] as const;
export type ScreenId = (typeof SCREENS)[number];
export type Role = "admin" | "teacher";

export function hashParam(key: string): string | null {
  const q = location.hash.split("?")[1] ?? "";
  return new URLSearchParams(q).get(key);
}

export function hrefFor(id: ScreenId, params: Record<string, string> = {}): string {
  const { settings } = parseHash();
  let h = buildHash(["screen", "school", id], { ...settings, portal: "school", screen: id });
  const q = new URLSearchParams(params).toString();
  if (q) h += (h.includes("?") ? "&" : "?") + q;
  return h;
}

export function goScreen(id: ScreenId, params: Record<string, string> = {}) {
  location.hash = hrefFor(id, params);
}

/**
 * Writes one query into the hash in place (a filter, a tab), so a reload or a
 * shared link opens the same view, without adding a Back step for each tap.
 */
export function setHashParam(key: string, value: string | null) {
  const [path, query = ""] = location.hash.split("?");
  const q = new URLSearchParams(query);
  if (value === null) q.delete(key);
  else q.set(key, value);
  const s = q.toString();
  history.replaceState(
    history.state,
    "",
    `${location.pathname}${location.search}${path}${s ? `?${s}` : ""}`
  );
}

export function currentScreen(): ScreenId {
  const s = hashParam("screen") ?? parseHash().path[2] ?? "overview";
  return (SCREENS as readonly string[]).includes(s) ? (s as ScreenId) : "overview";
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

export function useRole(): Role {
  const role = useHashParam("role");
  return role === "teacher" ? "teacher" : "admin";
}
