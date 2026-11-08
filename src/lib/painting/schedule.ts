/*
 * Which painting shows, and in which light. One painting a day, chosen by the date, relit for
 * the hour: dawn, day, sunset or night. In development, a query string forces both:
 *   ?paint-time=dawn|day|sunset|night   the light
 *   ?paint-scene=0..9                    the painting
 *   ?paint-season=fall|winter|spring|summer   (otherwise the painting's own season)
 *   ?paint-weather=clear|rain|snow|fog
 *   ?paint-in=1                          plays the opening again
 */
import type { TimeOfDay } from "./light";
import { PAINTING_COUNT, PAINTING_SEASONS, PAINTING_TITLES, type Season } from "./scenes";

export type { Season };
export type Weather = "clear" | "rain" | "snow" | "fog";
/** The greeting's voice follows the hour: night, morning, day or evening. */
export type Band = "night" | "morning" | "day" | "evening";

export interface PaintingChoice {
  scene: number;
  title: string;
  time: TimeOfDay;
  band: Band;
  season: Season;
  weather: Weather;
  /** Force the opening to play, even if it already played this session. */
  replay: boolean;
}

export function bandOf(hour: number): Band {
  return hour >= 22 || hour < 5 ? "night" : hour < 11 ? "morning" : hour < 17 ? "day" : "evening";
}

const TIME_OF: Record<Band, TimeOfDay> = {
  morning: "dawn",
  day: "day",
  evening: "sunset",
  night: "night",
};
const BAND_OF: Record<TimeOfDay, Band> = {
  dawn: "morning",
  day: "day",
  sunset: "evening",
  night: "night",
};

/** The day of the year, so each day gets the next painting in turn. */
export function sceneOfDay(d: Date): number {
  const day = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5);
  return ((day % PAINTING_COUNT) + PAINTING_COUNT) % PAINTING_COUNT;
}

const pick = <T extends string>(v: string | null, allowed: readonly T[]): T | null =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : null;

/**
 * The painting for this moment. `search` is the page's query string; overrides only apply
 * outside production builds.
 */
export function choosePainting(now: Date, search = "", allowOverrides = false): PaintingChoice {
  const q = allowOverrides ? new URLSearchParams(search) : new URLSearchParams();
  const forcedTime = pick(q.get("paint-time"), ["dawn", "day", "sunset", "night"] as const);
  const sceneParam = q.get("paint-scene");
  const forcedScene = sceneParam !== null && /^\d+$/.test(sceneParam) ? +sceneParam : null;
  const band = forcedTime ? BAND_OF[forcedTime] : bandOf(now.getHours());
  const time = forcedTime ?? TIME_OF[band];
  const scene = forcedScene !== null ? forcedScene % PAINTING_COUNT : sceneOfDay(now);
  return {
    scene,
    title: PAINTING_TITLES[scene],
    time,
    band,
    season:
      pick(q.get("paint-season"), ["fall", "winter", "spring", "summer"] as const) ??
      PAINTING_SEASONS[scene],
    weather: pick(q.get("paint-weather"), ["clear", "rain", "snow", "fog"] as const) ?? "clear",
    replay: q.get("paint-in") === "1",
  };
}
