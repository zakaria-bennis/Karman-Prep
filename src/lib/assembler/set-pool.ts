/*
 * The frozen question pool of a practice set: spread across difficulty, never-answered
 * questions first, one question per family. Pure; split out of runs.ts.
 */

/** How many questions a practice set may draw its 10 from. */
export const SET_POOL_LIMIT = 42;

export interface PoolItem {
  id: string;
  family: string;
  difficulty: number;
}

export function practiceSetPool(
  items: readonly PoolItem[],
  answered: { has(id: string): boolean },
  limit = SET_POOL_LIMIT
): string[] {
  const byDifficulty = new Map<number, string[]>();
  const usedFamilies = new Set<string>();
  const sorted = [...items].sort(
    (a, b) =>
      (answered.has(a.id) ? 1 : 0) - (answered.has(b.id) ? 1 : 0) || a.id.localeCompare(b.id)
  );
  for (const item of sorted) {
    if (usedFamilies.has(item.family)) continue;
    usedFamilies.add(item.family);
    byDifficulty.set(item.difficulty, [...(byDifficulty.get(item.difficulty) ?? []), item.id]);
  }
  const pool: string[] = [];
  for (let round = 0; pool.length < limit; round++) {
    let added = false;
    for (const ids of byDifficulty.values())
      if (ids[round] && pool.length < limit) {
        pool.push(ids[round]);
        added = true;
      }
    if (!added) break;
  }
  return pool;
}
