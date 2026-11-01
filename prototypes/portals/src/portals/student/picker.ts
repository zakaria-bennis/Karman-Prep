/**
 * The endless-mode picker, one swappable module. Time trials use the same
 * picker with a clock. Replace `DEFAULT_PICKER` with a better model later; the
 * screens only know the `Picker` interface below.
 *
 * Inputs (research note 4.3): the last answer, this session, the whole history,
 * the weak skills and exposure. Rules in the first version:
 *   - aims at a 75 percent chance of success (the founder's start; tuned from data);
 *   - weak skills weigh more the more often their domain appears on the SAT;
 *   - a missed question comes back after 2, 7 and 21 days (spaced return);
 *   - no question repeats within a session or within 14 days, unless it is due;
 *   - difficulty steps up after three right in a row and down after two misses;
 *   - a little randomness so sessions never feel scripted.
 * Karman's 1 to 7 difficulty is editorial; the demo questions carry 1 to 3.
 */
export interface AnswerEvent {
  questionId: string;
  skillId: string;
  correct: boolean;
  /** ISO date, yyyy-mm-dd. */
  at: string;
}
export interface Candidate {
  id: string;
  skillId: string;
  section: "Reading and Writing" | "Math";
  difficulty: number;
}
export interface SkillState {
  skillId: string;
  domain: string;
  section: "Reading and Writing" | "Math";
  /** 0 to 100, the four-bar level. */
  level: number;
}
export interface PickerInput {
  pool: Candidate[];
  lastAnswer: AnswerEvent | null;
  session: AnswerEvent[];
  history: AnswerEvent[];
  skills: SkillState[];
  today: string;
  /** Target chance of success, 0 to 1. */
  target: number;
  random?: () => number;
}
export interface Pick {
  candidate: Candidate;
  /** The difficulty the picker was aiming at, 1 to 7. */
  aim: number;
  successChance: number;
  reason: string;
}
export interface Picker {
  version: string;
  pick(input: PickerInput): Pick | null;
}

/** College Board domain shares of each section, approximate, from the Assessment Framework. */
export const SAT_DOMAIN_SHARE: Record<string, number> = {
  "Information and Ideas": 0.26,
  "Craft and Structure": 0.28,
  "Expression of Ideas": 0.2,
  "Standard English Conventions": 0.26,
  Algebra: 0.35,
  "Advanced Math": 0.35,
  "Problem-Solving and Data Analysis": 0.15,
  "Geometry and Trigonometry": 0.15,
};
export const SPACED_RETURN_DAYS = [2, 7, 21];
export const NO_REPEAT_DAYS = 14;
export const TARGET_SUCCESS = 0.75;
export const STEP_UP_AFTER = 3;
export const STEP_DOWN_AFTER = 2;

const DAY = 86400000;
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / DAY);

/** A level of 0 to 100 as an ability on the 1 to 7 scale. */
export const abilityOf = (level: number) => 1 + (Math.max(0, Math.min(100, level)) / 100) * 6;
/** The chance a student of this ability gets a question of this difficulty right. */
export const successChance = (ability: number, difficulty: number) =>
  1 / (1 + Math.exp((difficulty - ability) / 1.2));

export function momentum(session: AnswerEvent[]): -1 | 0 | 1 {
  const last = session.slice(-STEP_UP_AFTER);
  if (last.length === STEP_UP_AFTER && last.every((a) => a.correct)) return 1;
  const two = session.slice(-STEP_DOWN_AFTER);
  if (two.length === STEP_DOWN_AFTER && two.every((a) => !a.correct)) return -1;
  return 0;
}

export const DEFAULT_PICKER: Picker = {
  version: "endless-v1 (2026-10-31)",
  pick(input) {
    const rnd = input.random ?? Math.random;
    const skillOf = new Map(input.skills.map((s) => [s.skillId, s]));
    const seenInSession = new Set(input.session.map((a) => a.questionId));
    const lastSeen = new Map<string, string>();
    const misses = new Map<string, string[]>();
    for (const a of input.history) {
      lastSeen.set(a.questionId, a.at);
      if (!a.correct) misses.set(a.questionId, [...(misses.get(a.questionId) ?? []), a.at]);
    }
    const dueForReturn = (id: string) =>
      (misses.get(id) ?? []).some((at) =>
        SPACED_RETURN_DAYS.some((d) => Math.abs(daysBetween(at, input.today) - d) <= 1)
      );
    const sectionLevel = (section: Candidate["section"]) => {
      const list = input.skills.filter((s) => s.section === section);
      return list.length ? list.reduce((a, s) => a + s.level, 0) / list.length : 30;
    };
    const lastSkill = input.lastAnswer?.skillId;
    const recentSections = input.session.slice(-3).map((a) => skillOf.get(a.skillId)?.section);
    const shift = momentum(input.session);
    const maxShare = Math.max(...Object.values(SAT_DOMAIN_SHARE));

    let best: { c: Candidate; score: number; p: number; aim: number; reason: string } | null = null;
    for (const c of input.pool) {
      if (seenInSession.has(c.id)) continue;
      const due = dueForReturn(c.id);
      const seen = lastSeen.get(c.id);
      if (seen && daysBetween(seen, input.today) < NO_REPEAT_DAYS && !due) continue;
      const skill = skillOf.get(c.skillId);
      const ability = abilityOf(skill ? skill.level : sectionLevel(c.section)) + shift;
      const aim = Math.max(1, Math.min(7, Math.round(ability - 1.3)));
      const p = successChance(ability, c.difficulty);
      const closeness = 1 - Math.min(1, Math.abs(p - input.target) / 0.5);
      const need = skill
        ? (1 - skill.level / 100) * ((SAT_DOMAIN_SHARE[skill.domain] ?? 0.2) / maxShare)
        : 0.5;
      const freshness = due ? 1 : seen ? 0.2 : 0.6;
      const variety =
        (c.skillId === lastSkill ? 0 : 0.6) +
        (recentSections.length === 3 && recentSections.every((s) => s === c.section) ? 0 : 0.4);
      const score = 0.4 * closeness + 0.3 * need + 0.2 * freshness + 0.1 * variety + rnd() * 0.05;
      const reason = due
        ? "a miss coming back"
        : need > 0.5
          ? "a weak skill the SAT asks often"
          : "near the target chance";
      if (!best || score > best.score) best = { c, score, p, aim, reason };
    }
    return best
      ? { candidate: best.c, aim: best.aim, successChance: best.p, reason: best.reason }
      : null;
  },
};

/** Seconds per question at the real test's pace, for the time trials. */
export const PACE_SECONDS: Record<Candidate["section"], number> = {
  "Reading and Writing": 71,
  Math: 95,
};

console.assert(
  Math.abs(successChance(4, 4) - 0.5) < 1e-9,
  "even odds when difficulty meets ability"
);
console.assert(momentum([]) === 0, "no momentum at the start");
console.assert(
  momentum([
    { questionId: "a", skillId: "s", correct: true, at: "2026-10-31" },
    { questionId: "b", skillId: "s", correct: true, at: "2026-10-31" },
    { questionId: "c", skillId: "s", correct: true, at: "2026-10-31" },
  ]) === 1,
  "three right in a row steps up"
);
console.assert(
  DEFAULT_PICKER.pick({
    pool: [{ id: "q", skillId: "s", section: "Math", difficulty: 2 }],
    lastAnswer: null,
    session: [{ questionId: "q", skillId: "s", correct: true, at: "2026-10-31" }],
    history: [],
    skills: [],
    today: "2026-10-31",
    target: TARGET_SUCCESS,
  }) === null,
  "never repeats within a session"
);
