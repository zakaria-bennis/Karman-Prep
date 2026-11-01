import { useMemo } from "react";
import { QUESTIONS, SKILLS, TODAY, type DemoQuestion, type SkillLevel } from "@/mock";
import { readRecords } from "./telemetry";
import {
  DEFAULT_PICKER,
  TARGET_SUCCESS,
  type AnswerEvent,
  type Candidate,
  type Pick,
  type SkillState,
} from "./picker";
import type { Answered } from "./session";

/**
 * The demo question pool (the ten Karman originals in src/mock) wired to the
 * picker: skill ids from the approved labels, the student's levels as skill
 * states, and a history made of the answers this browser has recorded plus
 * two demo misses that are due to come back today, so spaced return shows.
 */
const skillId = (label: string) => SKILLS.find((s) => s.label === label)?.id ?? label;

export const POOL: Candidate[] = QUESTIONS.map((q) => ({
  id: q.id,
  skillId: skillId(q.skill),
  section: q.section,
  difficulty: q.difficulty,
}));

/** Misses from 2 and 7 days ago, so the picker has something to bring back. */
export const DEMO_HISTORY: AnswerEvent[] = [
  {
    questionId: "data-1",
    skillId: skillId("Ratios rates proportional relationships and units"),
    correct: false,
    at: "2026-10-29",
  },
  {
    questionId: "geo-1",
    skillId: skillId("Right triangles and trigonometry"),
    correct: false,
    at: "2026-10-24",
  },
];

export function skillStates(levels: SkillLevel[]): SkillState[] {
  return levels.map((s) => ({ skillId: s.id, domain: s.domain, section: s.section, level: s.now }));
}

export const questionOf = (c: Candidate) => QUESTIONS.find((q) => q.id === c.id)!;

/** A `nextQuestion` for the question view, plus the picker's reasons as they come. */
export function usePickerSession(levels: SkillLevel[], firstDay: boolean) {
  return useMemo(() => {
    const skills = skillStates(levels);
    const history: AnswerEvent[] = [
      ...(firstDay ? [] : DEMO_HISTORY),
      ...readRecords().map((r) => ({
        questionId: r.questionId,
        skillId: skillId(r.skill),
        correct: r.correct,
        at: r.answeredAt.slice(0, 10),
      })),
    ];
    const session: AnswerEvent[] = [];
    const picks: Pick[] = [];
    const next = (answered: Answered[]): DemoQuestion | null => {
      const done = answered.map((a) => ({
        questionId: a.questionId,
        skillId: skillId(a.skill),
        correct: a.correct,
        at: TODAY,
      }));
      // The session the picker sees is every answered question plus the ones served and still open.
      const served = session.filter((s) => !done.some((d) => d.questionId === s.questionId));
      const pick = DEFAULT_PICKER.pick({
        pool: POOL,
        lastAnswer: done[done.length - 1] ?? null,
        session: [...done, ...served],
        history,
        skills,
        today: TODAY,
        target: TARGET_SUCCESS,
      });
      if (!pick) return null;
      picks.push(pick);
      session.push({
        questionId: pick.candidate.id,
        skillId: pick.candidate.skillId,
        correct: false,
        at: TODAY,
      });
      return questionOf(pick.candidate);
    };
    return { next, picks, version: DEFAULT_PICKER.version };
  }, [levels, firstDay]);
}

/** A practice set for one skill: its own question first, then the rest of its section, then the other section. */
export function setFor(skill: string): DemoQuestion[] {
  const own = QUESTIONS.filter((q) => skillId(q.skill) === skill || q.skill === skill);
  const section = own[0]?.section ?? SKILLS.find((s) => s.id === skill)?.section;
  const same = QUESTIONS.filter((q) => !own.includes(q) && q.section === section);
  const other = QUESTIONS.filter((q) => !own.includes(q) && q.section !== section);
  return [...own, ...same, ...other];
}

console.assert(
  POOL.every((c) => c.skillId.startsWith("rw-") || c.skillId.startsWith("ma-")),
  "every pool question maps to an approved skill"
);
console.assert(
  setFor("rw-skill-subject-verb-agreement")[0].id === "conv-1",
  "a skill set opens with its own question"
);
