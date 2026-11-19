// The student's settings (founder, 2026-11-18). Kept in this browser for now, under one key; they
// move to the student's account when the portal reads real data. Light or dark is the shell's own
// (page.tsx) and Reduce motion is the site's (src/lib/painting/motion.ts), so neither is kept here.
import { useSyncExternalStore } from "react";

export const TRACKS = ["piano", "strings", "rain", "musicbox"] as const;
export type Track = (typeof TRACKS)[number];

export type Settings = {
  /** The SAT sitting as a day ("2026-12-05"), or null for not chosen yet. */
  testDate: string | null;
  /** Extra time on the SAT: 1 is standard time. */
  extraTime: 1 | 1.5 | 2;
  sounds: boolean;
  /** 0 to 100. */
  soundVolume: number;
  music: boolean;
  /** Night music starts by itself at `musicAt`. */
  musicAuto: boolean;
  /** Minutes after noon: 480 is 8:00 PM. */
  musicAt: number;
  musicVolume: number;
  track: Track;
  /** Text size as a step: 0 small, 1 standard, 2 large, 3 largest. */
  textStep: number;
  /** How see-through the glass is, 0 to 100. */
  clear: number;
  angle: "rad" | "deg";
  showClock: boolean;
  remindEmail: boolean;
  remindText: boolean;
  notifyChat: boolean;
  remindDaily: boolean;
  /** Minutes after midnight: 960 is 4:00 PM. */
  dailyAt: number;
  name: string;
  tutorCode: string;
  apple: boolean;
  google: boolean;
};

export const DEFAULTS: Settings = {
  testDate: null,
  extraTime: 1,
  sounds: true,
  soundVolume: 70,
  music: false,
  musicAuto: false,
  musicAt: 480,
  musicVolume: 50,
  track: "piano",
  textStep: 1,
  clear: 57,
  angle: "rad",
  showClock: true,
  remindEmail: true,
  remindText: true,
  notifyChat: true,
  remindDaily: false,
  dailyAt: 960,
  name: "Maya Okafor",
  tutorCode: "",
  apple: false,
  google: false,
};

const KEY = "kp-settings";
let now: Settings = DEFAULTS;
let read = false;
const heard = new Set<() => void>();

function load(): Settings {
  if (read || typeof window === "undefined") return now;
  read = true;
  try {
    const kept = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<Settings>;
    now = { ...DEFAULTS, ...kept };
  } catch {
    now = DEFAULTS;
  }
  return now;
}

export const settings = () => load();

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  now = { ...load(), [key]: value };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(now));
  } catch {
    // a private window may not keep anything: the choice then lasts for this visit
  }
  heard.forEach((tell) => tell());
}

const listen = (tell: () => void) => {
  heard.add(tell);
  return () => heard.delete(tell);
};

export const onSettings = listen;

export function useSettings(): Settings {
  return useSyncExternalStore(listen, load, () => DEFAULTS);
}

/** The text sizes a student may choose, as how much larger the pages are drawn. */
export const TEXT_SIZES = [0.92, 1, 1.08, 1.16] as const;
export const TEXT_NAMES = ["Small", "Standard", "Large", "Largest"] as const;

/** How frosted the glass is for a given see-through setting: 57 is the portal's own 0.7. */
export const frostOf = (clear: number) => Math.round((1.5 - (clear / 100) * 1.4) * 100) / 100;

/** A time of day in words, from minutes after midnight: 1200 is "8:00 PM". */
export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** The SAT's weekend sittings a student can still choose. A stand-in list: check each against the
 *  College Board's published dates before the portal goes to students. */
export const SAT_DATES = ["2026-12-05", "2027-03-13", "2027-05-01", "2027-06-05"] as const;

export function dayName(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
