// The level a student sees (founder, 2026-11-15): Not started, Learning, Understanding, Proficient.
// The engine still keeps five (src/components/portal/skill-levels.ts): its first, "New", means the
// skill has been met but nothing is earned yet, which a student sees as Not started; its top one is
// Proficient. When the level rule is rewired to his (3, 4 and 5 right within a set of 8) the engine
// will hold these four itself and this file goes.
export const SHOWN_LEVELS = ["Not started", "Learning", "Understanding", "Proficient"] as const;

/** How many of the three bars are lit for an engine level (0 to 4). */
export const shownLevel = (engine: number) => Math.max(0, Math.min(3, Math.round(engine) - 1));

export const shownLevelName = (engine: number) => SHOWN_LEVELS[shownLevel(engine)];

/** "6:12", from milliseconds; null when the stretch makes no sense as one sitting. */
export function clockOf(ms: number): string | null {
  if (!Number.isFinite(ms) || ms <= 0 || ms > 3 * 3_600_000) return null;
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** About how long a set takes at the SAT's own pace: 1:35 a question in Math, 1:11 in Reading and
 *  Writing, to the nearest minute. */
export const minutesFor = (questions: number, subject: "math" | "reading") =>
  Math.max(1, Math.round((questions * (subject === "math" ? 95 : 71)) / 60));
