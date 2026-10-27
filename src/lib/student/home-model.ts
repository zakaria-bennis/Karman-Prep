import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import type { TimingAccommodation } from "@/lib/quiz/timer";
import type { ConfidenceBand, QuizDifficultyLevel } from "@/types/quiz";
import { estimateSkill, BAND_ORDER } from "./mastery";
import { summarisePoints, type PointAward } from "./skill-points";
import {
  currentTarget,
  startingTarget,
  type StartingTarget,
  type TrialRun,
  type TrialSection,
} from "./time-trial";

export type StudentResponse = {
  questionId: string;
  skillId: string;
  correct: boolean;
  difficulty: QuizDifficultyLevel;
  answeredAt: string;
  seconds: number;
  /** True for Time Trial and test answers; only untimed answers set the Time Trial start. */
  timed: boolean;
};

export type StudentHomeInput = {
  firstName: string;
  accommodation: TimingAccommodation;
  satDate: string | null;
  diagnosticRange: { low: number; high: number } | null;
  nextClass: { title: string; startsAt: string; tutor: string } | null;
  due: { id: string; title: string; dueAt: string; from: string; href: string }[];
  responses: StudentResponse[];
  awards: PointAward[];
  trialRuns: TrialRun[];
  dailyDoneOn: string | null;
};

export type SkillView = {
  id: string;
  label: string;
  band: ConfidenceBand | null;
  mastery: number;
  answered: number;
  points: number;
  weekPoints: number;
  lastPractised: string | null;
};

export type TrialView = {
  section: TrialSection;
  target: number;
  goal: number;
  start: StartingTarget;
  /** Target before each run, then the current one: the squeeze, oldest first. */
  steps: number[];
  runs: number;
  last: TrialRun | null;
};

export type StudentHome = {
  firstName: string;
  satDate: string | null;
  satDays: number | null;
  diagnosticRange: { low: number; high: number } | null;
  dailyDone: boolean;
  primary: { label: string; href: string };
  domains: { id: string; label: string; subject: "math" | "reading"; skills: SkillView[] }[];
  weakest: SkillView[];
  trials: Record<TrialSection, TrialView>;
  points: { total: number; week: number };
  nextClass: StudentHomeInput["nextClass"];
  due: StudentHomeInput["due"];
  answered: number;
};

const DAY = 86_400_000;
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function buildStudentHome(
  input: StudentHomeInput,
  nowMs: number,
  base: string
): StudentHome {
  const points = summarisePoints(input.awards, nowMs);
  const bySkill = new Map<string, StudentResponse[]>();
  for (const r of input.responses) bySkill.set(r.skillId, [...(bySkill.get(r.skillId) ?? []), r]);

  const skillView = (id: string, label: string): SkillView => {
    const rs = bySkill.get(id) ?? [];
    const est = estimateSkill(
      rs.map((r) => ({
        correct: r.correct,
        difficulty: r.difficulty,
        ageDays: (nowMs - Date.parse(r.answeredAt)) / DAY,
      }))
    );
    const p = points.bySkill.get(id);
    return {
      id,
      label,
      band: est.band,
      mastery: est.mastery,
      answered: rs.length,
      points: p?.total ?? 0,
      weekPoints: p?.week ?? 0,
      lastPractised: rs.reduce<string | null>(
        (m, r) => (m === null || r.answeredAt > m ? r.answeredAt : m),
        null
      ),
    };
  };

  const domains = SKILL_DOMAINS.map((d) => ({
    id: d.id,
    label: d.label,
    subject: d.subject as "math" | "reading",
    skills: CATALOG_SKILLS.filter((s) => s.domainId === d.id).map((s) => skillView(s.id, s.label)),
  }));
  const all = domains.flatMap((d) => d.skills);
  const rank = (s: SkillView) => BAND_ORDER.indexOf(s.band) * 1000 + s.mastery;
  const weakest = all
    .filter((s) => s.band !== null)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 2);

  const trial = (section: TrialSection): TrialView => {
    const untimed = input.responses
      .filter((r) => !r.timed && sectionOf(r.skillId) === section)
      .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
      .map((r) => r.seconds);
    const start = startingTarget(section, untimed, input.accommodation);
    const runs = input.trialRuns
      .filter((r) => r.section === section)
      .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
    const target = currentTarget(section, runs, start);
    return {
      section,
      target,
      goal: start.goal,
      start,
      steps: [...runs.map((r) => r.target), target],
      runs: runs.length,
      last: runs.at(-1) ?? null,
    };
  };

  const dailyDone = input.dailyDoneOn === dayKey(nowMs);
  const satDays = input.satDate
    ? Math.max(
        0,
        Math.round(
          (Date.parse(`${input.satDate}T00:00:00Z`) - Date.parse(`${dayKey(nowMs)}T00:00:00Z`)) /
            DAY
        )
      )
    : null;
  const focus = weakest[0];
  return {
    firstName: input.firstName,
    satDate: input.satDate,
    satDays,
    diagnosticRange: input.diagnosticRange,
    dailyDone,
    primary:
      dailyDone && focus
        ? { label: `Practise ${focus.label}`, href: `${base}/practice/${focus.id}` }
        : { label: "Start your Daily 10", href: `${base}/daily` },
    domains,
    weakest,
    trials: { reading: trial("reading"), math: trial("math") },
    points: { total: points.total, week: points.week },
    nextClass: input.nextClass,
    due: [...input.due].sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    answered: input.responses.length,
  };
}

export function sectionOf(skillId: string): TrialSection {
  return skillId.startsWith("ma-") ? "math" : "reading";
}
