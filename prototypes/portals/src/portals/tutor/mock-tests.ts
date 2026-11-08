import { SKILLS, TODAY, levelsFor, type Skill, type SkillLevel } from "@/mock";
import { band } from "@/design-system/marks/LevelMark";
import { seeded } from "@/design-system/backgrounds/useCanvasLoop";
import { studentsOf, tutorStudentById, type TutorStudent } from "./mock";

/**
 * Full-length tests and the misses on them. A student's misses sit on their
 * lowest skills (the same levels the student portal shows), so the briefing
 * and the levels tab never disagree. The December cohort shares two weak
 * skills so the class plan has something to teach. Question refs are
 * deterministic. The March cohort has no full-length test yet (opens Jan 4).
 */
const SHARED = new Set(["maya", "noah", "lin", "sofia", "ava", "theo"]);
const PROFILES: Record<
  string,
  { floor: number; spread: number; moved: number; seed: number; started: number }
> = {
  jonah: { floor: 20, spread: 50, moved: 3, seed: 61, started: 30 },
  leila: { floor: 55, spread: 42, moved: 4, seed: 67, started: 39 },
  owen: { floor: 8, spread: 30, moved: 0, seed: 71, started: 14 },
  jamal: { floor: 25, spread: 50, moved: 4, seed: 73, started: 31 },
  chloe: { floor: 30, spread: 50, moved: 3, seed: 79, started: 33 },
  ruben: { floor: 12, spread: 45, moved: 2, seed: 83, started: 26 },
  mei: { floor: 35, spread: 52, moved: 5, seed: 89, started: 35 },
  priya: { floor: 22, spread: 48, moved: 3, seed: 91, started: 30 },
  luis: { floor: 18, spread: 40, moved: 0, seed: 131, started: 24 },
  tess: { floor: 28, spread: 42, moved: 0, seed: 137, started: 28 },
  kofi: { floor: 12, spread: 38, moved: 0, seed: 139, started: 21 },
  nora: { floor: 15, spread: 40, moved: 0, seed: 97, started: 22 },
  sam: { floor: 18, spread: 40, moved: 0, seed: 101, started: 24 },
  isla: { floor: 12, spread: 40, moved: 0, seed: 103, started: 20 },
  diego: { floor: 20, spread: 42, moved: 0, seed: 107, started: 25 },
  hana: { floor: 40, spread: 45, moved: 0, seed: 109, started: 30 },
  elliot: { floor: 50, spread: 42, moved: 0, seed: 113, started: 33 },
  zoe: { floor: 55, spread: 40, moved: 0, seed: 127, started: 36 },
};

/** The same algorithm as src/mock/skills.ts, for the students only this portal adds. */
export function tutorLevelsFor(id: string): SkillLevel[] {
  if (SHARED.has(id)) return levelsFor(id);
  const p = PROFILES[id] ?? { floor: 0, spread: 0, moved: 0, seed: 1, started: 0 };
  const r = seeded(p.seed);
  return SKILLS.map((s, i) => {
    const started = i < p.started || r() < p.started / 39;
    const now = started && p.spread ? Math.round(p.floor + r() * p.spread) : 0;
    const moved =
      started && i % Math.max(1, Math.floor(39 / Math.max(1, p.moved))) === 0 && p.moved > 0;
    const was = moved
      ? Math.max(
          0,
          Math.min(100, now + (r() < 0.7 ? -(2 + Math.round(r() * 5)) : 2 + Math.round(r() * 4)))
        )
      : now;
    return { ...s, now, was, band: band(now) };
  });
}

export interface FullLength {
  number: number;
  date: string;
  rw: number;
  math: number;
  total: number;
}
const fl = (number: number, date: string, rw: number, math: number): FullLength => ({
  number,
  date,
  rw,
  math,
  total: rw + math,
});

/** The latest scored full-length per student. Owen has only the diagnostic. */
export const LATEST: Record<string, FullLength> = {
  maya: fl(3, "2026-10-17", 690, 670),
  jonah: fl(1, "2026-10-10", 600, 580),
  leila: fl(3, "2026-10-24", 720, 700),
  jamal: fl(1, "2026-10-17", 630, 610),
  chloe: fl(1, "2026-10-17", 650, 630),
  ruben: fl(1, "2026-10-17", 570, 560),
  mei: fl(1, "2026-10-17", 670, 650),
  priya: fl(1, "2026-10-17", 620, 590),
};
/** Tests running today at the fixed clock (09:41): the briefing refreshes when they are scored. */
export const IN_PROGRESS: Record<
  string,
  { number: number; date: string; start: number; end: number }
> = {
  maya: { number: 4, date: TODAY, start: 9, end: 11.5 },
  december: { number: 2, date: TODAY, start: 10, end: 12.5 },
};
export const testsTaken = (id: string) => (LATEST[id] ? LATEST[id].number : 0);

export interface Miss {
  module: 1 | 2;
  q: number;
}
export interface MissGroup {
  skill: Skill;
  level: SkillLevel;
  count: number;
  refs: Miss[];
}
const MODULE_Q: Record<Skill["section"], number> = { "Reading and Writing": 27, Math: 22 };
const PATTERN = [3, 2, 2, 2, 1];
/** Skills the whole December cohort missed, so the class plan has a shared weakness to teach. */
const FORCED: Record<string, string[]> = {
  jamal: ["Transitions", "Linear functions"],
  chloe: ["Transitions", "Linear functions"],
  ruben: ["Transitions", "Linear functions"],
  mei: ["Transitions"],
  priya: ["Transitions", "Linear functions"],
};

const sectionMisses = (score: number) => Math.round((800 - score) / 16);

function refsFor(section: Skill["section"], n: number): Miss[] {
  const Q = MODULE_Q[section];
  const first = Math.ceil(n / 2);
  const out: Miss[] = [];
  for (let k = 0; k < n; k++) {
    const module = (k < first ? 1 : 2) as 1 | 2;
    const j = k < first ? k : k - first;
    const per = k < first ? first : n - first;
    out.push({ module, q: 2 + Math.round((j * (Q - 4)) / Math.max(1, per - 1)) });
  }
  return out;
}

function pick(
  levels: SkillLevel[],
  section: Skill["section"],
  n: number,
  forced: string[]
): MissGroup[] {
  const inSection = levels.filter((s) => s.section === section);
  const first = forced
    .map((label) => inSection.find((s) => s.label === label))
    .filter((s): s is SkillLevel => !!s);
  const rest = inSection
    .filter((s) => !first.includes(s))
    .sort((a, b) => a.now - b.now || a.label.localeCompare(b.label));
  const order = [...first, ...rest];
  const refs = refsFor(section, n);
  const out: MissGroup[] = [];
  let left = n;
  let used = 0;
  for (let i = 0; left > 0 && i < order.length; i++) {
    const count = Math.min(i < first.length ? 2 : (PATTERN[i - first.length] ?? 1), left);
    out.push({ skill: order[i], level: order[i], count, refs: refs.slice(used, used + count) });
    left -= count;
    used += count;
  }
  return out.sort((a, b) => b.count - a.count || a.level.now - b.level.now);
}

/** Every miss on the latest full-length, grouped by skill, weakest first within equal counts. */
export function missesFor(id: string): MissGroup[] {
  const t = LATEST[id];
  if (!t) return [];
  const levels = tutorLevelsFor(id);
  const forced = FORCED[id] ?? [];
  return [
    ...pick(levels, "Math", sectionMisses(t.math), forced),
    ...pick(levels, "Reading and Writing", sectionMisses(t.rw), forced),
  ];
}
export const missCount = (groups: MissGroup[]) => groups.reduce((a, g) => a + g.count, 0);
/** Misses in the last five questions of a module: the pacing signal. */
export const lateMisses = (groups: MissGroup[]) =>
  groups.reduce((a, g) => a + g.refs.filter((r) => r.q >= MODULE_Q[g.skill.section] - 4).length, 0);
export const refLabel = (r: Miss) => `M${r.module} q${r.q}`;

export interface ClassSkill {
  skill: Skill;
  missedBy: { student: TutorStudent; count: number; level: SkillLevel }[];
  total: number;
}
/** The skills most of a cohort missed on its latest full-length, most students first. */
export function classFocus(cohortId: string): ClassSkill[] {
  const students = studentsOf(cohortId).filter((s) => LATEST[s.id]);
  const by = new Map<string, ClassSkill>();
  for (const s of students)
    for (const g of missesFor(s.id)) {
      const row = by.get(g.skill.id) ?? { skill: g.skill, missedBy: [], total: 0 };
      row.missedBy.push({ student: s, count: g.count, level: g.level });
      row.total += g.count;
      by.set(g.skill.id, row);
    }
  return [...by.values()].sort(
    (a, b) =>
      b.missedBy.length - a.missedBy.length ||
      b.total - a.total ||
      a.skill.label.localeCompare(b.skill.label)
  );
}
/** Ninety minutes: three shared skills, then practice at each student's own difficulty, then the close. */
export const CLASS_MINUTES = { skills: [25, 20, 20], practice: 20, close: 5 };
export const levelOf = (studentId: string, skillId: string) =>
  tutorLevelsFor(studentId).find((s) => s.id === skillId)!;
export const studentLevels = (id: string) => tutorLevelsFor(tutorStudentById(id)?.id ?? id);

console.assert(
  Object.entries(LATEST).every(
    ([id, t]) => Math.abs(t.total - (tutorStudentById(id)?.predicted ?? 0)) <= 60
  ),
  "a test score sits within 60 of the predicted score"
);
console.assert(
  missCount(missesFor("maya")) === 15,
  `Maya missed 15 on test 3, got ${missCount(missesFor("maya"))}`
);
console.assert(
  missesFor("maya").every((g) => g.refs.length === g.count),
  "every miss has a question ref"
);
console.assert(
  classFocus("december")[0]?.missedBy.length === 5,
  "the whole December cohort missed the top skill"
);
console.assert(
  classFocus("march").length === 0 && !LATEST.ava,
  "the March cohort has no test yet, so no class plan"
);
console.assert(
  CLASS_MINUTES.skills.reduce((a, b) => a + b, 0) + CLASS_MINUTES.practice + CLASS_MINUTES.close ===
    90,
  "a class is 90 minutes"
);
console.assert(
  tutorLevelsFor("owen").filter((s) => s.now > 0).length < 20,
  "Owen has barely started"
);
