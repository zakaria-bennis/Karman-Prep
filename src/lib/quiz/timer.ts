export type TimingAccommodation = "standard" | "time_and_half" | "double";

const MULTIPLIER: Record<TimingAccommodation, number> = {
  standard: 1,
  time_and_half: 1.5,
  double: 2,
};

export const WARNING_SECONDS = 300;

export function limitSeconds(base: number, accommodation: TimingAccommodation): number {
  return Math.floor(base * MULTIPLIER[accommodation]);
}

/** Seconds left, measured from the server's start time so a reload never resets the clock. */
export function remaining(startedAtMs: number, nowMs: number, limit: number): number {
  return Math.max(0, limit - Math.floor((nowMs - startedAtMs) / 1000));
}

export type TimerAnnouncement = "5 minutes left" | "1 minute left" | "Time is up";

export function announcementFor(prev: number, next: number): TimerAnnouncement | null {
  if (prev > 300 && next <= 300) return "5 minutes left";
  if (prev > 60 && next <= 60) return "1 minute left";
  if (prev > 0 && next <= 0) return "Time is up";
  return null;
}

export function forceShow(secondsLeft: number): boolean {
  return secondsLeft <= WARNING_SECONDS;
}
