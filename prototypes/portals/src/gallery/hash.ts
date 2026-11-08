import { useEffect, useState } from "react";
import { DEFAULTS, SWITCHES } from "./routes";

export type SwitchKey = keyof typeof SWITCHES;
export type Settings = Record<SwitchKey, string> & { screen: string; bare: boolean };

export interface Route {
  path: string[];
  settings: Settings;
}

/** #/screen/student/home?plan=plus&device=phone → { path: ["screen","student","home"], settings } */
export function parseHash(hash = location.hash): Route {
  const [p, q = ""] = hash.replace(/^#\/?/, "").split("?");
  const query = new URLSearchParams(q);
  const settings = { ...DEFAULTS, screen: "", bare: false } as Settings;
  (Object.keys(SWITCHES) as SwitchKey[]).forEach((k) => {
    const v = query.get(k);
    if (v !== null && (k === "theme" || (SWITCHES[k] as readonly string[]).includes(v)))
      settings[k] = v;
  });
  settings.screen = query.get("screen") ?? "";
  settings.bare = query.get("bare") === "1";
  return { path: p.split("/").filter(Boolean), settings };
}

export function buildHash(path: string[], settings: Partial<Settings>): string {
  const q = new URLSearchParams();
  (Object.keys(SWITCHES) as SwitchKey[]).forEach((k) => {
    const v = settings[k];
    if (v && v !== DEFAULTS[k]) q.set(k, v);
  });
  if (settings.screen) q.set("screen", settings.screen);
  if (settings.bare) q.set("bare", "1");
  const s = q.toString();
  return `#/${path.join("/")}${s ? `?${s}` : ""}`;
}

export function useHash(): [Route, (path: string[], patch: Partial<Settings>) => void] {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (path: string[], patch: Partial<Settings>) => {
    location.hash = buildHash(path, { ...route.settings, ...patch });
  };
  return [route, go];
}
