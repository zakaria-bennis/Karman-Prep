import type { Subject } from "@/data/curriculum";

export type DailySubject = Extract<Subject, "math" | "reading">;

/** A reviewed, version-bound candidate supplied by the editorial receipt. */
export interface DailyCandidate {
  subject: DailySubject;
  questionId: string;
  skillId: string;
  payloadSha256: string;
}

export function utcDayKey(asOf: Date): string {
  if (!Number.isFinite(asOf.getTime())) throw new Error("Invalid challenge date");
  return asOf.toISOString().slice(0, 10);
}

/** Stable across servers and database row ordering; a new day rotates the choice. */
export function selectDailyCandidate(
  candidates: readonly DailyCandidate[],
  subject: DailySubject,
  day: string
): DailyCandidate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid challenge date");
  const eligible = candidates
    .filter((candidate) => candidate.subject === subject)
    .sort((a, b) =>
      `${a.questionId}:${a.payloadSha256}`.localeCompare(`${b.questionId}:${b.payloadSha256}`)
    );
  if (new Set(eligible.map((candidate) => candidate.questionId)).size !== eligible.length) {
    throw new Error("Daily candidate identity is ambiguous");
  }
  if (eligible.length === 0) return null;
  let hash = 2166136261;
  for (const character of `${subject}:${day}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return eligible[(hash >>> 0) % eligible.length];
}
