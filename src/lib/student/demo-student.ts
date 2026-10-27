import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import type { QuizDifficultyLevel } from "@/types/quiz";
import { seededRandom } from "./assemble";
import type { StudentHomeInput, StudentResponse } from "./home-model";
import { pointsForAnswer, type PointAward } from "./skill-points";
import { nextTarget, startingTarget, type TrialRun } from "./time-trial";

/** Maya: the demo student for the founder preview. Six weeks of made-up history, built from
 *  a seed so every load looks the same. None of it is a real student or a real result. */
const STRENGTH: Record<string, number> = {
  "ma-skill-linear-equations-in-one-variable": 3.4,
  "ma-skill-linear-functions": 1.1,
  "ma-skill-percentages": 1.2,
  "ma-skill-nonlinear-functions": -0.9,
  "ma-skill-circles": -0.6,
  "ma-skill-right-triangles-and-trigonometry": -0.3,
  "rw-skill-words-in-context": 2.1,
  "rw-skill-transitions": -0.8,
  "rw-skill-command-of-evidence": -0.4,
  "rw-skill-subject-verb-agreement": 3.3,
};
const UNTOUCHED = new Set(["ma-skill-inference-from-sample-statistics-and-margin-of-error"]);

export function demoStudent(nowMs: number): StudentHomeInput {
  const rand = seededRandom(20261027);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  const responses: StudentResponse[] = [];
  const awards: PointAward[] = [];
  const skills = CATALOG_SKILLS.filter((s) => !UNTOUCHED.has(s.id));
  for (const skill of skills) {
    const ability = STRENGTH[skill.id] ?? (rand() - 0.2) * 1.6;
    const strong = (STRENGTH[skill.id] ?? 0) > 1;
    const n = strong ? 34 + Math.floor(rand() * 10) : 6 + Math.floor(rand() * 22);
    for (let i = 0; i < n; i++) {
      const ageDays = 1 + rand() * 44;
      const difficulty = (1 + Math.floor(rand() * 7)) as QuizDifficultyLevel;
      // Ability rises a little over the six weeks, so recent answers are stronger.
      const now = ability + (1 - ageDays / 44) * 0.5;
      const p = 1 / (1 + Math.exp(-(now - (difficulty - 4) * 0.55)));
      const correct = rand() < p;
      const isMath = skill.subject === "math";
      let seconds = Math.exp(Math.log(isMath ? 112 : 78) + gauss() * 0.35);
      if (rand() < 0.02) seconds = 1500 + rand() * 1500; // left the tab open
      const answeredAt = new Date(nowMs - ageDays * 86_400_000).toISOString();
      const id = `demo-${skill.id}-${i}`;
      responses.push({
        questionId: id,
        skillId: skill.id,
        correct,
        difficulty,
        answeredAt,
        seconds: Math.round(seconds),
        timed: false,
      });
      const pts = pointsForAnswer(correct, difficulty);
      if (pts) awards.push({ awardKey: id, skillId: skill.id, points: pts, createdAt: answeredAt });
    }
  }

  // Three Math trials (beat, beat, missed) and one Reading and Writing trial (beat).
  const untimed = (math: boolean) =>
    responses
      .filter((r) => r.skillId.startsWith(math ? "ma-" : "rw-"))
      .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
      .map((r) => r.seconds);
  const trialRuns: TrialRun[] = [];
  const plan = [
    { section: "math" as const, daysAgo: 12, share: 0.96, correct: 15 },
    { section: "math" as const, daysAgo: 7, share: 0.97, correct: 16 },
    { section: "math" as const, daysAgo: 3, share: 1.04, correct: 16 },
    { section: "reading" as const, daysAgo: 5, share: 0.95, correct: 20 },
  ];
  for (const step of plan) {
    const start = startingTarget(step.section, untimed(step.section === "math"), "standard");
    const prior = trialRuns.filter((r) => r.section === step.section).at(-1);
    const target = prior ? prior.nextTarget : start.seconds;
    const questions = step.section === "math" ? 22 : 27;
    const elapsedSeconds = Math.round(target * step.share);
    const verdict = nextTarget({
      target,
      goal: start.goal,
      elapsedSeconds,
      finished: true,
      correct: step.correct,
      questions,
      baselineAccuracy: 0.7,
    });
    trialRuns.push({
      id: `demo-trial-${trialRuns.length}`,
      section: step.section,
      target,
      elapsedSeconds,
      correct: step.correct,
      questions,
      beat: verdict.beat,
      nextTarget: verdict.nextTarget,
      finishedAt: new Date(nowMs - step.daysAgo * 86_400_000).toISOString(),
    });
  }

  const at = (days: number, hour: number) => {
    const d = new Date(nowMs + days * 86_400_000);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  return {
    firstName: "Maya",
    accommodation: "standard",
    satDate: "2026-12-05",
    diagnosticRange: { low: 1250, high: 1320 },
    nextClass: {
      title: "Cohort class: nonlinear functions",
      startsAt: at(2, 18),
      tutor: "David",
    },
    due: [
      {
        id: "due-1",
        title: "Nonlinear functions set",
        dueAt: at(2, 21),
        from: "David",
        href: "/practice/ma-skill-nonlinear-functions",
      },
      {
        id: "due-2",
        title: "Transitions set",
        dueAt: at(4, 21),
        from: "David",
        href: "/practice/rw-skill-transitions",
      },
    ],
    responses,
    awards,
    trialRuns,
    dailyDoneOn: null,
  };
}
