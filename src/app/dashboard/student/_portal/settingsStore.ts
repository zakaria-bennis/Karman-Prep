// The student's settings (founder, 2026-11-18). A signed-in student's choices are kept with their
// account (student_settings.prefs, through actionSavePrefs): the portal opens with them on any
// device, and each change is saved once the student stops moving the control. Nothing of a signed-in
// student is kept in this browser, so a shared computer never shows one student another's name or
// choices. The design page (no student) keeps its choices in this browser. Which keys there are, and
// their ranges, is src/lib/portal/prefs.ts.
import { useMemo, useSyncExternalStore } from "react";
import { stillChosen } from "@/lib/painting/motion";
import type { PortalData } from "@/lib/portal/data";
import {
  TRACKS,
  isPrefKey,
  readPhoto,
  readPrefs,
  type PrefKey,
  type Prefs,
} from "@/lib/portal/prefs";
import { usePortalData } from "./portalData";

export { TRACKS };
export type Track = (typeof TRACKS)[number];

export type Settings = Prefs & {
  /** The SAT sitting as a day ("2026-12-05"), or null for not chosen yet. */
  testDate: string | null;
  /** First and last name, as the account card shows it. */
  name: string;
  /** The student's own picture (a Clerk image), or null for Karman's default one. */
  photo: string | null;
};

export const DEFAULTS: Settings = {
  testDate: null,
  extraTime: 1,
  sounds: true,
  soundAnswers: true,
  soundKeys: true,
  soundRewards: true,
  soundVolume: 70,
  music: false,
  musicAuto: false,
  musicAt: 480,
  musicVolume: 50,
  track: "piano",
  textStep: 1,
  clear: 57,
  still: false,
  angle: "rad",
  showClock: true,
  remindEmail: true,
  remindText: true,
  notifyChat: true,
  remindDaily: false,
  dailyAt: 960,
  theme: "dark",
  name: "Maya Okafor",
  photo: null,
};

const KEY = "kp-settings";
/** One save, this long after the last change: a slider dragged end to end is one write. */
const WAIT_MS = 700;
let now: Settings = DEFAULTS;
let read = false;
/** The account whose choices are in `now` (its email), or null on the design page. */
let account: string | null = null;
const heard = new Set<() => void>();

type Saver = (patch: Partial<Prefs>) => Promise<{ ok: boolean; error?: string }>;
let saver: Saver | null = null;
let queued: Partial<Record<PrefKey, unknown>> = {};
let timer: ReturnType<typeof setTimeout> | null = null;

/** What the account holds, over the defaults: the same on the server and on the first paint. */
function fromAccount(data: Pick<PortalData, "prefs" | "name" | "testDate">): Settings {
  return {
    ...DEFAULTS,
    ...readPrefs(data.prefs),
    testDate: data.testDate,
    name: data.name,
    photo: readPhoto(data.prefs),
  };
}

/** The design page's choices, kept in this browser (its made-up name and picture are not). */
function keepCopy() {
  if (account !== null) return;
  try {
    const choices = Object.fromEntries(Object.entries(now).filter(([key]) => isPrefKey(key)));
    window.localStorage.setItem(KEY, JSON.stringify(choices));
  } catch {
    // a private window may not keep anything: the choice then lasts for this visit
  }
}

function load(): Settings {
  if (read || typeof window === "undefined") return now;
  read = true;
  try {
    const kept = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    now = { ...DEFAULTS, ...readPrefs(kept), still: stillChosen() };
  } catch {
    now = DEFAULTS;
  }
  return now;
}

/** A signed-in student's choices replace whatever was there, once per account: the first time the
 *  portal is drawn for them (a fresh copy of the same account's data changes nothing). */
function adopt(data: Pick<PortalData, "prefs" | "name" | "testDate" | "email">) {
  const who = data.email ?? data.name;
  if (typeof window === "undefined" || account === who) return;
  // anything still waiting belonged to whoever was here before: it is dropped, never sent
  if (timer) clearTimeout(timer);
  timer = null;
  queued = {};
  account = who;
  now = { ...fromAccount(data), still: readPrefs(data.prefs).still ?? stillChosen() };
  read = true;
}

export const settings = () => load();

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  now = { ...load(), [key]: value };
  keepCopy();
  if (saver && isPrefKey(key)) {
    queued = { ...queued, [key]: value };
    if (timer) clearTimeout(timer);
    timer = setTimeout(flushSettings, WAIT_MS);
  }
  heard.forEach((tell) => tell());
}

/** Sends what is waiting now (the page is being hidden or left). */
export function flushSettings() {
  if (timer) clearTimeout(timer);
  timer = null;
  const patch = queued as Partial<Prefs>;
  queued = {};
  if (!saver || Object.keys(patch).length === 0) return;
  saver(patch)
    .then((r) => {
      if (!r.ok) console.warn("[settings] not saved:", r.error);
    })
    .catch((e: unknown) => console.warn("[settings] not saved:", e));
}

/** From now on each change to a choice is also saved with the account (null stops it). */
export function saveSettingsWith(save: Saver | null) {
  if (!save) flushSettings();
  saver = save;
}

const listen = (tell: () => void) => {
  heard.add(tell);
  return () => heard.delete(tell);
};

export const onSettings = listen;

export function useSettings(): Settings {
  const real = usePortalData();
  // drawn as the page is drawn, before anything reads the choices: nothing is listening yet, so
  // nobody is told (the next read simply sees the account's choices)
  if (real) adopt(real);
  /* the server draws a signed-in student's own choices, so the first paint is already theirs */
  const first = useMemo(() => (real ? fromAccount(real) : DEFAULTS), [real]);
  return useSyncExternalStore(listen, load, () => first);
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

/** The SAT's weekend sittings, for the design page only: a signed-in student chooses from the real
 *  list (the `sat_dates` table, PortalData.satDates). */
export const SAT_DATES = ["2026-12-05", "2027-03-13", "2027-05-01", "2027-06-05"] as const;

export function dayName(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
