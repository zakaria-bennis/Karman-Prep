// Streak savers, used by hand (founder, round 2, 2026-11-22: the morning after a missed day the
// student is asked whether to spend one). Pure.
//
// A streak counts days in a row. When yesterday was missed but the day before was kept, the streak
// is about to break: a student who holds a Streak saver is asked once whether to spend it. A saved
// day counts as kept, for the streak and for the coin multiplier, but adds nothing to either.
import { addDays } from "./reviews";

/** The day a saver would keep (yesterday), or null when there is nothing to save. `kept` are the
 *  days that count for a streak (practiced or already saved). */
export function dayToSave(kept: readonly string[], today: string): string | null {
  const days = new Set(kept);
  const yesterday = addDays(today, -1);
  if (days.has(today) || days.has(yesterday)) return null;
  return days.has(addDays(today, -2)) ? yesterday : null;
}
