import { SKILLS, TODAY, addDays, levelsFor, studentById, type SkillLevel } from "@/mock";
import { band, type Band } from "@/design-system/marks/LevelMark";
import { seeded } from "@/design-system/backgrounds/useCanvasLoop";

/**
 * Ridgeview High's students on school seats, beside the shared cast (Theo is
 * the one shared student on a Ridgeview seat). Every student is fictional and
 * generated from a seed, so screenshots are stable and no real student's
 * data is ever shown. Hues are identity tints, 60 degrees apart down a list.
 */
export interface SchoolStudent {
  id: string;
  name: string;
  initials: string;
  hue: number;
  grade: 11 | 12;
  classId: string | null;
  /** The seat key that let them in. */
  keyId: string;
  /** ISO date the seat was taken. */
  joined: string;
  seed: number;
  /** Level profile: a floor, a spread, how many skills moved today, how many started. */
  floor: number;
  spread: number;
  moved: number;
  started: number;
  questionsWeek: number;
  /** Your Daily 10 sets done this week, of the five school days. */
  daily10Week: number;
  questionsTotal: number;
  lastActive: string | null;
  predicted: number | null;
  baseline: number | null;
  parentLinked: string | null;
}

const NAMES =
  "Aiden Bella Caleb Daria Ezra Farah Gavin Hazel Idris Jade Kian Luna Mateo Nadia Omar Priya Quinn Rosa Sami Tara Uma Vikram Wren Ximena Yara Zane Amara Bo Cora Dev Elena Finn Greta Hugo Imani Jonas Kira Leo Mira Nico Olive Paz Reza Sana Tomas Una Vera Wade Xavi Yusuf Zara Ari Brooke Cyrus Dina Eli Freya Gus Hana Ivan Juno Kofi Lila Marco Nia Oscar Pia Rafa Sol Tess Ulla Vince Willa Yael Zed Anya Bram Celia Dax Esme Flor Gil Hope Ines Jed Kai Lena Milo Noor Otis Pilar Rami Sade Teo Ulric Viv Wes Xena Yoni Zuri Adi Bea Cal Dee Edo Fay Gio Hal Ike Joy Kit Lou".split(
    " "
  );

/** The LCG's first values follow the seed closely, so each stream is run in before use. */
const warm = (r: () => number) => {
  for (let i = 0; i < 6; i++) r();
  return r;
};

/** id, class and key for each seat, in the order the seats were taken. */
export interface SeatSpec {
  classId: string | null;
  keyId: string;
  count: number;
  floor: number;
  joined: string;
}

export function buildStudents(specs: SeatSpec[], seedBase: number, today = TODAY): SchoolStudent[] {
  const out: SchoolStudent[] = [];
  let n = 0;
  for (const spec of specs) {
    for (let k = 0; k < spec.count; k++) {
      const name = NAMES[n % NAMES.length];
      const id = `${name.toLowerCase()}${n >= NAMES.length ? n : ""}`;
      const r = warm(seeded(seedBase + n * 7919));
      const active = r() < (spec.classId ? 0.8 : 0.48);
      const questionsWeek = active ? 6 + Math.round(r() * 42) : 0;
      const daily10Week = active ? Math.min(5, Math.round(questionsWeek / 10)) : 0;
      const weeksIn = Math.max(
        1,
        Math.round((Date.parse(today) - Date.parse(spec.joined)) / 6048e5)
      );
      const started = Math.min(39, 6 + Math.round(r() * 10) + weeksIn * 2);
      const floor = spec.floor + Math.round(r() * 26);
      const hasTest = weeksIn >= 6 && r() < 0.45;
      const baseline = hasTest ? 880 + Math.round(r() * 40) * 10 : null;
      out.push({
        id,
        name,
        initials: name[0],
        hue: ((k * 60) % 360) + (spec.classId ? 0 : 30),
        grade: r() < 0.7 ? 11 : 12,
        classId: spec.classId,
        keyId: spec.keyId,
        joined: addDays(spec.joined, Math.round(r() * 6)),
        seed: seedBase + n * 7,
        floor,
        spread: 48,
        moved: active ? 1 + Math.round(r() * 3) : 0,
        started,
        questionsWeek,
        daily10Week,
        questionsTotal: questionsWeek * 2 + Math.round(r() * 60) * weeksIn,
        lastActive: active
          ? addDays(today, -Math.round(r() * 4))
          : weeksIn > 2
            ? addDays(today, -(8 + Math.round(r() * 20)))
            : null,
        predicted: baseline ? baseline + 20 + Math.round(r() * 6) * 10 : null,
        baseline,
        parentLinked: r() < 0.6 ? addDays(spec.joined, 2 + Math.round(r() * 9)) : null,
      });
      n++;
    }
  }
  return out;
}

/** Theo from the shared cast takes the first Period 3 seat, with his own shared levels and score. */
export function withTheo(list: SchoolStudent[], classId: string, keyId: string): SchoolStudent[] {
  const t = studentById("theo");
  const theo: SchoolStudent = {
    id: "theo",
    name: t.name,
    initials: t.initials,
    hue: t.hue,
    grade: t.grade,
    classId,
    keyId,
    joined: t.since,
    seed: 53,
    floor: 10,
    spread: 45,
    moved: 3,
    started: 24,
    questionsWeek: 31,
    daily10Week: 4,
    questionsTotal: 412,
    lastActive: addDays(TODAY, -1),
    predicted: t.predicted,
    baseline: t.baseline,
    parentLinked: "2026-09-04",
  };
  const i = list.findIndex((s) => s.classId === classId);
  return i < 0 ? [theo, ...list] : [...list.slice(0, i), theo, ...list.slice(i + 1)];
}

/** The same algorithm as src/mock/skills.ts, from the student's own profile. */
export function schoolLevelsFor(s: SchoolStudent): SkillLevel[] {
  if (s.id === "theo") return levelsFor("theo");
  const r = warm(seeded(s.seed * 104729));
  return SKILLS.map((sk, i) => {
    const started = i < s.started || r() < s.started / 39;
    const now = started ? Math.round(s.floor + r() * s.spread) : 0;
    const moved = started && s.moved > 0 && i % Math.max(1, Math.floor(39 / s.moved)) === 0;
    const was = moved
      ? Math.max(
          0,
          Math.min(100, now + (r() < 0.7 ? -(2 + Math.round(r() * 5)) : 2 + Math.round(r() * 4)))
        )
      : now;
    return { ...sk, now, was, band: band(now) };
  });
}

/** One band for a student: the band of their mean level over the skills they have started. Not started is 0. */
export function summaryBand(levels: SkillLevel[]): Band {
  const started = levels.filter((l) => l.now > 0);
  if (!started.length) return 0;
  return band(Math.round(started.reduce((a, l) => a + l.now, 0) / started.length));
}

/** For a class: each skill with how many students sit under Proficient on it, most first. */
export function skillsToTeach(students: SchoolStudent[]) {
  const by = SKILLS.map((sk) => ({ skill: sk, under: 0, notStarted: 0 }));
  for (const s of students) {
    const levels = schoolLevelsFor(s);
    levels.forEach((l, i) => {
      if (l.now === 0) by[i].notStarted++;
      else if (l.band < 3) by[i].under++;
    });
  }
  return by.sort((a, b) => b.under - a.under || a.skill.label.localeCompare(b.skill.label));
}

console.assert(new Set(NAMES).size === NAMES.length, "every generated student name is distinct");
console.assert(NAMES.length >= 112, "enough names for the year-end roster");
