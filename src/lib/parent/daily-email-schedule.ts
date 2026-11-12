/*
 * When the parent's daily email goes out (founder, 2026-11-12: "a brief on progress of the student
 * at like probably 7 to 8 p.m. They can also adjust when they get their daily email in their own
 * portal settings"). A parent picks a local time on the half hour from 5 PM to 10 PM, or off; with
 * nothing saved it is 7:30 PM in the parent's time zone. Pure, so the cron and the settings page
 * agree, and so the dry-run default can be tested.
 */
import { safeTimeZone } from "@/lib/daily-ten/day";

export const DAILY_EMAIL_TIMES = [
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
] as const;
export type DailyEmailTime = (typeof DAILY_EMAIL_TIMES)[number];
export const DEFAULT_DAILY_EMAIL_TIME: DailyEmailTime = "19:30";

/** A saved choice: a time, or null for off. `undefined` (no row yet) means the default. */
export type DailyEmailChoice = DailyEmailTime | null;

export function isDailyEmailTime(value: unknown): value is DailyEmailTime {
  return typeof value === "string" && (DAILY_EMAIL_TIMES as readonly string[]).includes(value);
}

/** The time that applies: the saved one, the default when nothing is saved, null when off. */
export function effectiveDailyEmailTime(saved: string | null | undefined): DailyEmailChoice {
  if (saved === undefined) return DEFAULT_DAILY_EMAIL_TIME;
  if (saved === null) return null;
  return isDailyEmailTime(saved) ? saved : DEFAULT_DAILY_EMAIL_TIME;
}

/** "19:30" as "7:30 PM". */
export function dailyEmailTimeLabel(time: DailyEmailTime): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Minutes since local midnight at `now` in `zone`. */
export function localMinutes(now: Date, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(zone),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/**
 * The every-2-minutes cron runs the daily email only on its first tick of each half hour (UTC
 * minute 0-1 or 30-31). Every choice sits on the half hour, so each window is checked once a day.
 */
export function isDailyEmailTick(now: Date): boolean {
  const m = now.getUTCMinutes();
  return m < 2 || (m >= 30 && m < 32);
}

/** True when the parent's chosen local time falls in the half hour that starts now. */
export function isDueNow(choice: DailyEmailChoice, now: Date, zone: string): boolean {
  if (!choice) return false;
  const [h, m] = choice.split(":").map(Number);
  const at = h * 60 + m;
  const local = localMinutes(now, zone);
  return local >= at && local < at + 30;
}

/**
 * Sending is OFF unless DAILY_PARENT_EMAIL is exactly "on". Anything else, including no value,
 * is a dry run: count and log, never send, never write the send log.
 */
export function dailyEmailMode(env: Record<string, string | undefined>): "send" | "dry-run" {
  return env.DAILY_PARENT_EMAIL === "on" ? "send" : "dry-run";
}
