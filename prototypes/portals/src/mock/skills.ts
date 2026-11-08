import taxonomy from "./taxonomy.json";
import { band, type Band } from "@/design-system/marks/LevelMark";
import { seeded } from "@/design-system/backgrounds/useCanvasLoop";

/** The 39 approved skills with their exact labels, domains and sections. */
export interface Skill {
  id: string;
  label: string;
  domain: string;
  section: "Reading and Writing" | "Math";
}
export interface SkillLevel extends Skill {
  now: number;
  was: number;
  band: Band;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const SKILLS: Skill[] = taxonomy.domains.flatMap((d) =>
  d.skills.map((label) => ({
    id: `${d.section === "Math" ? "ma" : "rw"}-skill-${slug(label)}`,
    label,
    domain: d.label,
    section: d.section as Skill["section"],
  }))
);
export const DOMAINS = [...new Set(SKILLS.map((s) => s.domain))];

/** Per-student levels, seeded so screenshots are stable. Profiles: a floor, a spread and how many moved today. */
const PROFILES: Record<
  string,
  { floor: number; spread: number; moved: number; seed: number; started: number }
> = {
  maya: { floor: 52, spread: 44, moved: 7, seed: 11, started: 39 },
  noah: { floor: 0, spread: 0, moved: 0, seed: 2, started: 0 },
  lin: { floor: 22, spread: 50, moved: 4, seed: 23, started: 31 },
  sofia: { floor: 35, spread: 50, moved: 5, seed: 37, started: 36 },
  ava: { floor: 18, spread: 52, moved: 6, seed: 41, started: 29 },
  theo: { floor: 10, spread: 45, moved: 3, seed: 53, started: 24 },
};

export function levelsFor(studentId: string): SkillLevel[] {
  const p = PROFILES[studentId] ?? PROFILES.noah;
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

/** Skills that moved today, biggest change first; the end screen shows the top three. */
export function movedToday(levels: SkillLevel[]) {
  return levels
    .filter((s) => s.now !== s.was)
    .sort((a, b) => Math.abs(b.now - b.was) - Math.abs(a.now - a.was));
}

export function weakest(levels: SkillLevel[]) {
  return levels.filter((s) => s.now > 0).sort((a, b) => a.now - b.now)[0];
}

export function byBand(levels: SkillLevel[]) {
  return [0, 1, 2, 3, 4].map((b) => ({
    band: b as Band,
    count: levels.filter((s) => s.band === b).length,
  }));
}

console.assert(SKILLS.length === 39, "39 skills");
console.assert(
  SKILLS.filter((s) => s.section === "Math").length === 19 &&
    SKILLS.filter((s) => s.section !== "Math").length === 20,
  "19 Math, 20 Reading and Writing"
);
console.assert(DOMAINS.length === 8, "8 domains");
console.assert(
  levelsFor("noah").every((s) => s.now === 0),
  "a first-day student has nothing started"
);
console.assert(
  byBand(levelsFor("maya")).reduce((a, b) => a + b.count, 0) === 39,
  "bands add up to 39"
);
