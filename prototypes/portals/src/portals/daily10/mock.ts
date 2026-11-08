import {
  QUESTIONS,
  DAILY10_RESULT,
  DAILY10_TOKENS,
  REWARDS,
  BOX_COST,
  levelsFor,
  movedToday,
  weakest,
  type DemoQuestion,
  type SkillLevel,
  type Student,
  type MockState,
} from "@/mock";
import { ACCESSORIES, type AccessoryId } from "@/design-system/marks/accessories";
import { band } from "@/design-system/marks/LevelMark";

/**
 * What one finished Daily 10 looks like, built from the shared mock: the ten
 * Karman originals, Maya's answers and rewards, the seeded skill levels. Totals
 * are computed, never typed twice. The first-day set is Noah's first finish:
 * no streak yet, no box, six skills that leave Not started.
 */
export type Variant = "full" | "no-box" | "no-companion";
export type Section = DemoQuestion["section"];

export interface Answer {
  n: number;
  q: DemoQuestion;
  ok: boolean;
  hard: boolean;
  tokens: number;
}
export interface Daily10Data {
  studentId: string;
  name: string;
  first: boolean;
  answers: Answer[];
  right: number;
  total: number;
  /** How many right answers the set ended on. */
  runEnd: number;
  misses: number[];
  split: { section: Section; right: number; total: number }[];
  tokensToday: number;
  tokensBefore: number;
  tokens: number;
  boxCost: number;
  boxes: number;
  tokensAfter: number;
  streak: number;
  newCompanion: "owl" | null;
  wearing?: AccessoryId;
  owned: AccessoryId[];
  prize: AccessoryId;
  levels: SkillLevel[];
  moved: SkillLevel[];
  top: SkillLevel[];
  weakest?: SkillLevel;
}

/** Noah's first finish: 6 of 10, ending on two in a row. */
export const FIRST_FINISH = {
  answers: [true, false, false, true, true, false, true, false, true, true],
  hard: DAILY10_RESULT.hard,
};
export const ACCESSORY_IDS = Object.keys(ACCESSORIES) as AccessoryId[];
const SECTIONS: Section[] = ["Reading and Writing", "Math"];

function answersFor(pattern: boolean[], hard: boolean[]): Answer[] {
  return QUESTIONS.map((q, i) => ({
    n: i + 1,
    q,
    ok: pattern[i],
    hard: hard[i],
    tokens: pattern[i] ? (hard[i] ? 15 : 10) : 0,
  }));
}
function runEndOf(answers: Answer[]) {
  let end = answers.length - 1;
  while (end >= 0 && answers[end].ok) end--;
  return answers.length - 1 - end;
}
/** On a first finish every right answer starts its skill: Not started becomes Learning. */
export function firstFinishLevels(levels: SkillLevel[], answers: Answer[]): SkillLevel[] {
  return levels.map((s) => {
    const a = answers.find((x) => x.ok && x.q.skill === s.label);
    if (!a || s.now > 0) return s;
    const now = 18 + a.q.difficulty * 4;
    return { ...s, was: 0, now, band: band(now) };
  });
}

export function daily10For(student: Student, variant: Variant, state: MockState): Daily10Data {
  const first = student.id === "noah" || state === "first-day";
  const rewards = REWARDS[student.id] ?? REWARDS.noah;
  const answers = first
    ? answersFor(FIRST_FINISH.answers, FIRST_FINISH.hard)
    : answersFor(DAILY10_RESULT.answers, DAILY10_RESULT.hard);
  const tokensToday = answers.reduce((a, x) => a + x.tokens, 0);
  const tokensBefore = first ? 0 : variant === "no-box" ? 120 : rewards.tokensBefore;
  const tokens = tokensBefore + tokensToday;
  const boxes = Math.min(1, Math.floor(tokens / BOX_COST));
  const streak = first ? 1 : variant === "no-companion" ? 6 : rewards.streak;
  const base = levelsFor(student.id);
  const levels =
    state === "empty"
      ? base.map((s) => ({ ...s, was: s.now }))
      : first
        ? firstFinishLevels(base, answers)
        : base;
  const moved = movedToday(levels);
  const right = answers.filter((a) => a.ok).length;
  return {
    studentId: student.id,
    name: student.name,
    first,
    answers,
    right,
    total: answers.length,
    runEnd: runEndOf(answers),
    misses: answers.filter((a) => !a.ok).map((a) => a.n),
    split: SECTIONS.map((section) => {
      const qs = answers.filter((a) => a.q.section === section);
      return { section, right: qs.filter((a) => a.ok).length, total: qs.length };
    }),
    tokensToday,
    tokensBefore,
    tokens,
    boxCost: BOX_COST,
    boxes,
    tokensAfter: tokens - boxes * BOX_COST,
    streak,
    newCompanion: streak === 7 ? "owl" : null,
    wearing: first ? undefined : rewards.wearing,
    owned: first ? [] : rewards.owned,
    prize: ACCESSORY_IDS.find((a) => !rewards.owned.includes(a)) ?? "glasses",
    levels,
    moved,
    top: moved.slice(0, 3),
    weakest: weakest(levels),
  };
}

/** The question a path dot or the review row opens, with the student's result. */
export function reviewFor(d: Daily10Data, n: number) {
  return d.answers.find((a) => a.n === n) ?? d.answers[0];
}

const maya = daily10For({ id: "maya", name: "Maya" } as Student, "full", "long-time");
const noah = daily10For({ id: "noah", name: "Noah" } as Student, "full", "first-day");
console.assert(
  maya.tokensToday === DAILY10_TOKENS && maya.tokensToday === 85,
  "Maya earned 85 today"
);
console.assert(
  maya.tokens === 325 && maya.boxes === 1 && maya.tokensAfter === 25,
  "240 + 85 = 325, one box, 25 left"
);
console.assert(
  maya.right === 7 && maya.misses.join() === "2,6,7" && maya.runEnd === 3,
  "7 of 10, missed 2, 6 and 7, ended on 3 in a row"
);
console.assert(maya.split.reduce((a, s) => a + s.total, 0) === 10, "the sections add up to ten");
console.assert(
  maya.split.reduce((a, s) => a + s.right, 0) === maya.right,
  "the sections' right answers add up"
);
console.assert(maya.newCompanion === "owl" && maya.streak === 7, "day 7 earns the owl");
console.assert(maya.prize === "headphones", "the prize is the first accessory Maya does not own");
console.assert(
  maya.top.length === 3 &&
    maya.moved.every(
      (s, i, m) => i === 0 || Math.abs(m[i - 1].now - m[i - 1].was) >= Math.abs(s.now - s.was)
    ),
  "the biggest movers come first"
);
console.assert(
  noah.first &&
    noah.tokensBefore === 0 &&
    noah.tokensToday === 65 &&
    noah.boxes === 0 &&
    noah.streak === 1,
  "Noah: a first finish, 65 tokens, no box, day one"
);
console.assert(
  noah.moved.length === 6 && noah.moved.every((s) => s.was === 0 && s.band === 1),
  "six skills leave Not started on a first finish"
);
console.assert(
  daily10For({ id: "maya", name: "Maya" } as Student, "no-box", "long-time").boxes === 0,
  "the no-box variant stays under a box"
);
