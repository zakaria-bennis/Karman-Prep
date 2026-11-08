import type { Subject } from "@/data/curriculum";
import { stableHash } from "@/lib/catalog-practice/picker";

export type DailySubject = Extract<Subject, "math" | "reading">;

export function utcDayKey(asOf: Date): string {
  if (!Number.isFinite(asOf.getTime())) throw new Error("Invalid challenge date");
  return asOf.toISOString().slice(0, 10);
}

function requireDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid challenge date");
}

/**
 * The subject's skills in today's order. Each skill's place is a stable hash of
 * (subject, day, skill), so every server agrees and a new day rotates the order.
 */
export function rankDailySkills(
  skills: readonly { id: string; subject: Subject }[],
  subject: DailySubject,
  day: string
): string[] {
  requireDay(day);
  const score = (id: string) => stableHash(`${subject}:${day}:${id}`);
  return skills
    .filter((skill) => skill.subject === subject)
    .map((skill) => skill.id)
    .sort((a, b) => score(a) - score(b) || a.localeCompare(b));
}

/**
 * Today's question from one skill's hard pool: the lowest stable hash of
 * (subject, day, question). Independent of row order, and a question joining the pool
 * mid-day only changes the choice if it would have ranked first.
 */
export function selectDailyQuestionId(
  questionIds: readonly string[],
  subject: DailySubject,
  day: string
): string | null {
  requireDay(day);
  let best: { id: string; score: number } | null = null;
  for (const id of questionIds) {
    const score = stableHash(`${subject}:${day}:${id}`);
    if (!best || score < best.score || (score === best.score && id < best.id)) best = { id, score };
  }
  return best?.id ?? null;
}
