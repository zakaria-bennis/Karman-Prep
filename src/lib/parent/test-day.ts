/*
 * Test day for the parent (founder, 2026-11-12): how many days to the SAT the student picked in
 * their settings, the score to aim for and the gap left, and the real College Board scores a
 * parent types in to sit next to the predicted one. Pure, so it is unit-tested.
 */
import { z } from "zod";

/** The first digital SAT in the US. Older paper scores are on another scale of difficulty. */
export const FIRST_DIGITAL_SAT = "2024-03-09";

const section = z.coerce
  .number({ message: "Each section is a number from 200 to 800." })
  .int("Each section is a whole number.")
  .min(200, "Each section is at least 200.")
  .max(800, "Each section is at most 800.")
  .refine((n) => n % 10 === 0, "SAT section scores end in 0.");

export const officialScoreInput = (today: string) =>
  z.object({
    studentId: z.string().uuid(),
    testDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the test date.")
      .refine((d) => d >= FIRST_DIGITAL_SAT, "Only digital SAT scores (March 2024 on).")
      .refine((d) => d <= today, "That test date hasn't happened yet."),
    readingWriting: section,
    math: section,
  });

export interface OfficialScore {
  testDate: string;
  readingWriting: number;
  math: number;
  total: number;
}

export interface TestDay {
  /** Whole days from today to the test; 0 on the day. Null with no date or a past date. */
  daysLeft: number | null;
  testDate: string | null;
  /** The score to aim for: the guarantee's target when the plan has one. */
  target: number | null;
  /** Points between the best score so far (official or predicted) and the target. */
  gap: number | null;
  /** The score the gap is measured from. */
  from: { score: number; kind: "official" | "predicted" } | null;
}

function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

export function testDay(input: {
  today: string;
  testDate: string | null;
  target: number | null;
  predicted: number | null;
  official: readonly OfficialScore[];
}): TestDay {
  const daysLeft =
    input.testDate && input.testDate >= input.today
      ? dayNumber(input.testDate) - dayNumber(input.today)
      : null;
  const bestOfficial = input.official.reduce<number | null>(
    (m, s) => (m === null || s.total > m ? s.total : m),
    null
  );
  const from =
    bestOfficial !== null && (input.predicted === null || bestOfficial >= input.predicted)
      ? { score: bestOfficial, kind: "official" as const }
      : input.predicted !== null
        ? { score: input.predicted, kind: "predicted" as const }
        : null;
  return {
    daysLeft,
    testDate: daysLeft === null ? null : input.testDate,
    target: input.target,
    gap: input.target !== null && from ? Math.max(0, input.target - from.score) : null,
    from,
  };
}

/** "Today", "Tomorrow", "In 23 days". */
export function daysLeftLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
