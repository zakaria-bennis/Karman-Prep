// How far a signed-in student really is toward each character (Rewards). Worked out from what the
// portal already reads: skill levels, full-length exams, the best challenge streak and lifetime
// coins. A challenge the portal cannot count yet (time trials, endless runs, perfect Daily 10s,
// missed questions looked back at, the multiplier) shows no progress rather than a made-up number.
import type { Character } from "./rewardsData";
import type { Domain, Section } from "./skills72";
import type { Exam } from "./progressData";

export type Facts = {
  skills: Record<Section, Domain[]>;
  exams: readonly Exam[];
  bestStreak: number;
  lifetimeCoins: number;
};

const proficient = (domains: Domain[]) =>
  domains.reduce((n, d) => n + d.skills.filter((s) => s.level === 3).length, 0);

/** The character with the student's own progress: `done` is real, or 0 when it cannot be counted. */
export function withProgress(c: Character, f: Facts): Character {
  const all = [...f.skills["Reading and Writing"], ...f.skills.Math];
  const first = f.exams[0]?.score;
  const last = f.exams[f.exams.length - 1]?.score;
  const best = all
    .map((d) => ({ n: d.skills.filter((s) => s.level === 3).length, of: d.skills.length }))
    .sort((a, b) => b.n / b.of - a.n / a.of)[0];
  const done: Record<string, number> = {
    Karman: 1,
    Juniper: proficient(f.skills["Reading and Writing"]),
    Thistle: proficient(f.skills.Math),
    Bruno: f.bestStreak,
    Hazel: f.lifetimeCoins,
    Reed: f.exams.length,
    Willow: first !== undefined && last !== undefined ? Math.max(0, last - first) : 0,
    Flint: f.exams.length,
    Saffron: proficient(all),
  };
  if (c.name === "Rowan" && best) return { ...c, done: Math.min(best.n, best.of), of: best.of };
  return { ...c, done: Math.min(done[c.name] ?? 0, c.of) };
}
