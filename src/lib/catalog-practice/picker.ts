/** One question the picker may choose: its id and its 1–7 difficulty level. */
export type PickCandidate = { questionId: string; difficulty: number };
/** One saved answer from the student's past practice in this skill. */
export type AnsweredQuestion = { questionId: string; answeredAt: string };

/**
 * FNV-1a, 32-bit, with a final avalanche step so a change in the day reshuffles the
 * whole order. Stable across servers, runtimes and database row order.
 */
export function stableHash(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/**
 * Chooses a practice session from the whole skill pool.
 *
 * 1. Questions the student has never answered come first, taken from each difficulty
 *    level in turn so the session spans the range.
 * 2. Within a level, order is a stable hash of (student, question, UTC day): the same
 *    student sees the same choice all day, and a new day reshuffles it.
 * 3. When fewer than `count` are unseen, the rest come from the least recently answered.
 *
 * Unseen questions come first, easier to harder, then any refreshers. Pure, so it can be
 * tested without a database.
 */
export function pickPracticeQuestions(
  candidates: readonly PickCandidate[],
  history: readonly AnsweredQuestion[],
  options: { studentId: string; day: string; count?: number }
): string[] {
  const count = options.count ?? 10;
  const unique = new Map<string, PickCandidate>();
  for (const item of candidates)
    if (!unique.has(item.questionId)) unique.set(item.questionId, item);

  const lastAnswered = new Map<string, number>();
  for (const answer of history) {
    const at = Date.parse(answer.answeredAt);
    if (!unique.has(answer.questionId) || !Number.isFinite(at)) continue;
    lastAnswered.set(answer.questionId, Math.max(at, lastAnswered.get(answer.questionId) ?? at));
  }

  const rank = new Map<string, number>();
  for (const id of unique.keys())
    rank.set(id, stableHash(`${options.studentId}:${id}:${options.day}`));
  const byRank = (a: PickCandidate, b: PickCandidate) =>
    rank.get(a.questionId)! - rank.get(b.questionId)! || a.questionId.localeCompare(b.questionId);

  const levels = new Map<number, PickCandidate[]>();
  const seen: PickCandidate[] = [];
  for (const item of unique.values()) {
    if (lastAnswered.has(item.questionId)) {
      seen.push(item);
      continue;
    }
    levels.set(item.difficulty, [...(levels.get(item.difficulty) ?? []), item]);
  }
  const queues = [...levels.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, items]) => items.sort(byRank));

  const picked: PickCandidate[] = [];
  // Rotate the starting level so the extra picks (beyond one per level) are not always easy.
  let turn = queues.length ? stableHash(`${options.studentId}:${options.day}`) % queues.length : 0;
  while (picked.length < count && queues.some((queue) => queue.length)) {
    const next = queues[turn % queues.length].shift();
    if (next) picked.push(next);
    turn++;
  }

  // Unseen questions run from easier to harder; refreshers follow, also easier to harder.
  const easierFirst = (items: PickCandidate[]) => {
    const order = new Map(items.map((item, index) => [item.questionId, index]));
    return items.sort(
      (a, b) => a.difficulty - b.difficulty || order.get(a.questionId)! - order.get(b.questionId)!
    );
  };
  seen.sort(
    (a, b) => lastAnswered.get(a.questionId)! - lastAnswered.get(b.questionId)! || byRank(a, b)
  );
  const refreshers = seen.slice(0, Math.max(0, count - picked.length));
  return [...easierFirst(picked), ...easierFirst(refreshers)].map((item) => item.questionId);
}
