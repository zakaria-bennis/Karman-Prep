import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import type { TrialSection } from "./time-trial";

/** College Board domain weights per section (share of questions in a module). */
export const DOMAIN_WEIGHTS: Record<TrialSection, Record<string, number>> = {
  reading: { info_ideas: 0.26, craft_structure: 0.28, expression_ideas: 0.2, conventions: 0.26 },
  math: { algebra: 0.35, advanced_math: 0.35, data_analysis: 0.15, geometry: 0.15 },
};

export type PoolItem = { id: string; skillId: string; difficulty: number };

/** Deterministic generator so a set can be rebuilt from its seed. */
export function seededRandom(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Largest-remainder split of `count` across weights. */
export function apportion(count: number, weights: Record<string, number>): Record<string, number> {
  const keys = Object.keys(weights);
  const total = keys.reduce((n, k) => n + weights[k], 0);
  const raw = keys.map((k) => ({ k, v: (count * weights[k]) / total }));
  const out = Object.fromEntries(raw.map(({ k, v }) => [k, Math.floor(v)]));
  let left = count - Object.values(out).reduce((n, v) => n + v, 0);
  for (const { k } of [...raw].sort((a, b) => (b.v % 1) - (a.v % 1))) {
    if (left-- <= 0) break;
    out[k] += 1;
  }
  return out;
}

/** A module: questions across domains by College Board weight, across skills, easy to hard
 *  within each domain, and never the same question twice. */
export function assembleModule(
  section: TrialSection,
  pool: readonly PoolItem[],
  count: number,
  seed: number,
  exclude: ReadonlySet<string> = new Set()
): PoolItem[] {
  const rand = seededRandom(seed);
  const skills = new Map(CATALOG_SKILLS.map((s) => [s.id, s]));
  const fresh = pool.filter((q) => !exclude.has(q.id));
  const usable = fresh.length >= count ? fresh : [...pool];
  const byDomain = new Map<string, PoolItem[]>();
  for (const q of usable) {
    const domain = skills.get(q.skillId)?.domainId;
    if (!domain || !(domain in DOMAIN_WEIGHTS[section])) continue;
    byDomain.set(domain, [...(byDomain.get(domain) ?? []), q]);
  }
  const quota = apportion(count, DOMAIN_WEIGHTS[section]);
  const picked: PoolItem[] = [];
  for (const domain of Object.keys(DOMAIN_WEIGHTS[section])) {
    picked.push(...spreadPick(byDomain.get(domain) ?? [], quota[domain], rand));
  }
  // A thin domain gives its places to the rest of the section.
  if (picked.length < count) {
    const taken = new Set(picked.map((q) => q.id));
    const rest = shuffle(
      [...byDomain.values()].flat().filter((q) => !taken.has(q.id)),
      rand
    );
    picked.push(...rest.slice(0, count - picked.length));
  }
  // Bluebook modules run easier to harder within each domain block; keep domain order.
  return picked;
}

/** Round-robin across skills, aiming for an even spread of difficulty, sorted easy to hard. */
function spreadPick(items: PoolItem[], n: number, rand: () => number): PoolItem[] {
  if (n <= 0 || items.length === 0) return [];
  const bySkill = new Map<string, PoolItem[]>();
  for (const q of shuffle(items, rand))
    bySkill.set(q.skillId, [...(bySkill.get(q.skillId) ?? []), q]);
  const queues = shuffle([...bySkill.values()], rand).map((qs) =>
    qs.sort((a, b) => a.difficulty - b.difficulty)
  );
  const out: PoolItem[] = [];
  for (let round = 0; out.length < n && queues.some((q) => q.length); round++) {
    for (const q of queues) {
      if (out.length >= n || q.length === 0) continue;
      // Alternate taking from the easy and hard ends so each skill gives a range.
      out.push((round % 2 === 0 ? q.shift() : q.pop())!);
    }
  }
  return out.sort((a, b) => a.difficulty - b.difficulty);
}

/** Your Daily 10: per section, three from the weakest skills, one hard (5+), the rest mixed. */
export function assembleDaily(
  pool: readonly PoolItem[],
  weakSkills: readonly string[],
  perSection: number,
  seed: number
): PoolItem[] {
  const rand = seededRandom(seed);
  const used = new Set<string>();
  const take = (candidates: PoolItem[], n: number) => {
    const out = shuffle(
      candidates.filter((q) => !used.has(q.id)),
      rand
    ).slice(0, n);
    out.forEach((q) => used.add(q.id));
    return out;
  };
  const weak = pool.filter((q) => weakSkills.includes(q.skillId) && q.difficulty <= 5);
  const hard = pool.filter((q) => q.difficulty >= 5);
  const picks = [...take(weak, Math.min(3, perSection))];
  picks.push(...take(hard, 1));
  picks.push(...take([...pool], perSection - picks.length));
  return picks.sort((a, b) => a.difficulty - b.difficulty);
}
