/*
 * The student's Settings choices as they are kept with the account (student_settings.prefs), checked
 * in one place so the portal, the save action and any screen that wants them later agree. Pure, so
 * it is safe on the client and the server.
 *
 * Each choice is one key. A screen reads the keys it knows and ignores the rest, so an older shape
 * or a key another screen adds never breaks the portal. The student's own picture is kept here too
 * (`photo`), but only the picture action writes it (settings-actions.ts).
 */
import { z } from "zod";

/** The focus music pieces (music.ts plays them). */
export const TRACKS = ["piano", "strings", "rain", "musicbox"] as const;

const percent = z.number().int().min(0).max(100);

export const PREF_SHAPE = {
  /** Sound effects as a whole, then the three kinds while it is on. */
  sounds: z.boolean(),
  soundAnswers: z.boolean(),
  soundKeys: z.boolean(),
  soundRewards: z.boolean(),
  soundVolume: percent,
  /** Focus music, on or off. */
  music: z.boolean(),
  /** Music starts by itself at `musicAt`, minutes after noon (480 is 8:00 PM). */
  musicAuto: z.boolean(),
  musicAt: z.number().int().min(0).max(719),
  musicVolume: percent,
  track: z.enum(TRACKS),
  /** Text size as a step: 0 small, 1 standard, 2 large, 3 largest. */
  textStep: z.number().int().min(0).max(3),
  /** How see-through the glass is. */
  clear: percent,
  /** Reduce motion (the site's own switch, src/lib/painting/motion.ts). */
  still: z.boolean(),
  angle: z.enum(["rad", "deg"]),
  /** Show the timer when a quiz starts. */
  showClock: z.boolean(),
  remindEmail: z.boolean(),
  remindText: z.boolean(),
  notifyChat: z.boolean(),
  remindDaily: z.boolean(),
  /** The Daily 10 reminder, minutes after midnight (960 is 4:00 PM). */
  dailyAt: z.number().int().min(0).max(1439),
  /** Extra time on the SAT: 1 is standard time. */
  extraTime: z.union([z.literal(1), z.literal(1.5), z.literal(2)]),
  theme: z.enum(["light", "dark"]),
} as const;

export type Prefs = { [K in keyof typeof PREF_SHAPE]: z.infer<(typeof PREF_SHAPE)[K]> };
export type PrefKey = keyof Prefs;
export const PREF_KEYS = Object.keys(PREF_SHAPE) as PrefKey[];

export const isPrefKey = (key: string): key is PrefKey => key in PREF_SHAPE;

/** A change to save: known keys only, each of the right kind and in range, and at least one. */
export const prefsPatchSchema = z
  .object(PREF_SHAPE)
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, "Nothing to save.");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The choices an account holds, leaving out anything unknown or out of range. */
export function readPrefs(raw: unknown): Partial<Prefs> {
  if (!isRecord(raw)) return {};
  const out: Partial<Record<PrefKey, unknown>> = {};
  for (const key of PREF_KEYS) {
    const read = PREF_SHAPE[key].safeParse(raw[key]);
    if (read.success) out[key] = read.data;
  }
  return out as Partial<Prefs>;
}

/** A picture Clerk serves (img.clerk.com, images.clerk.dev). A picture is copied from Clerk by the
 *  server, never typed in, so this is a second check on what is kept and drawn. */
export function isPhotoUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /\.clerk\.(com|dev)$/.test(url.hostname);
  } catch {
    return false;
  }
}

/** The student's own picture, if they set one. */
export const readPhoto = (raw: unknown): string | null =>
  isRecord(raw) && isPhotoUrl(raw.photo) ? raw.photo : null;

/** Light or dark when the portal opens: ?night=0 asks for light (the design page's pictures), then
 *  the student's saved choice, then dark (founder, 2026-11-18: dark by default). */
export function startsDark(night: string | null, raw: unknown): boolean {
  if (night === "0") return false;
  return readPrefs(raw).theme !== "light";
}
