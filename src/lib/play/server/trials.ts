/*
 * Server only. Time trials on a skill, a domain or a section (founder, 2026-11-20: "there are skill,
 * domain and section trials, all working the same way"). A section trial is the existing one
 * (src/lib/assembler/time-trial-run.ts). A skill or domain trial is the same machinery on a smaller
 * module from the 72 skills' pools: it starts at 1.25 times the real SAT time and steps down 0.05 a
 * round to 0.75 while accuracy holds, each scope keeping its own rounds.
 */
import "server-only";
import { loadQuizAccess, PlanLimitError } from "@/lib/assembler/plan-gate";
import {
  answeredInRuns,
  findOpenRun,
  insertRun,
  latestFinishedRun,
  loadResponses,
} from "@/lib/assembler/run-store";
import type { RunView } from "@/lib/assembler/run-types";
import { buildView } from "@/lib/assembler/run-view";
import { loadBaselineAnswers, startTimeTrial } from "@/lib/assembler/time-trial-run";
import { stableHash } from "@/lib/catalog-practice/picker";
import {
  baselineAccuracy,
  DEFAULT_BASELINE,
  nextStanding,
  trialSeconds,
  type TrialStart,
} from "@/lib/student/time-trial";
import type { PlayScope } from "../types";
import { scopeKey, scopeName, skillsOf } from "./play-runs";
import { pool72 } from "./pool72";

/** Questions in a skill trial and a domain trial (a section trial is a whole module). */
export const TRIAL_SIZE = { skill: 8, domain: 12 } as const;

/** The scope's next round (or the open one), for its start page. */
export async function trialStanding(
  clerkId: string,
  scope: PlayScope
): Promise<{ start: TrialStart; open: boolean; questions: number; seconds: number }> {
  const key = scope.kind === "section" ? sectionOf(scope) : `trial:${scopeKey(scope)}`;
  const [open, finished, answers] = await Promise.all([
    findOpenRun(clerkId, "time-trial", key),
    latestFinishedRun(clerkId, "time-trial", key),
    loadBaselineAnswers(clerkId).catch(() => []),
  ]);
  const section = subjectOfScope(scope);
  const start: TrialStart = open?.form.trial
    ? { ...open.form.trial, baseline: open.form.trial.baseline ?? DEFAULT_BASELINE }
    : {
        ...nextStanding(finished?.result?.trial ?? null),
        baseline: baselineAccuracy(section, answers),
      };
  const questions = scope.kind === "section" ? undefined : TRIAL_SIZE[scope.kind];
  return {
    start,
    open: !!open,
    questions: questions ?? (section === "math" ? 22 : 27),
    seconds: trialSeconds(section, start.multiplier, questions),
  };
}

const sectionOf = (scope: PlayScope & { kind: "section" }) =>
  scope.section === "Math" ? "math" : "reading";

function subjectOfScope(scope: PlayScope): "math" | "reading" {
  if (scope.kind === "section") return sectionOf(scope);
  return skillsOf(scope)[0]?.section === "Math" ? "math" : "reading";
}

/** Starts the scope's next round, or resumes the open one. */
export async function startTrial(clerkId: string, scope: PlayScope): Promise<RunView> {
  if (scope.kind === "section") return startTimeTrial(clerkId, sectionOf(scope));
  const skills = skillsOf(scope);
  if (!skills.length) throw new Error("Practice session is unavailable");
  const key = `trial:${scopeKey(scope)}`;
  const open = await findOpenRun(clerkId, "time-trial", key);
  if (open) return buildView(open, await loadResponses(open.id));
  const access = await loadQuizAccess(clerkId);
  if (access.questionsLeft === 0)
    throw new PlanLimitError("You have used the Free plan's 100 questions.");
  const section = subjectOfScope(scope);
  const [finished, history, pool, answers] = await Promise.all([
    latestFinishedRun(clerkId, "time-trial", key),
    answeredInRuns(clerkId),
    pool72(
      skills.map((s) => s.id),
      access.maxDifficulty
    ),
    loadBaselineAnswers(clerkId).catch(() => []),
  ]);
  const start: TrialStart = {
    ...nextStanding(finished?.result?.trial ?? null),
    baseline: baselineAccuracy(section, answers),
  };
  // never-answered first, then a spread of difficulty, one question a family
  const seed = `${clerkId}:${key}:${Date.now()}`;
  const families = new Set<string>();
  const picked = [...pool.items]
    .sort(
      (a, b) =>
        (history.has(a.id) ? 1 : 0) - (history.has(b.id) ? 1 : 0) ||
        stableHash(`${seed}:${a.id}`) - stableHash(`${seed}:${b.id}`)
    )
    .filter((i) => (families.has(i.family) ? false : (families.add(i.family), true)))
    .slice(0, Math.min(TRIAL_SIZE[scope.kind], access.questionsLeft ?? TRIAL_SIZE[scope.kind]))
    .sort((a, b) => a.difficulty - b.difficulty);
  if (picked.length < 4) throw new Error("No distinct approved questions are available");
  const ids = picked.map((i) => i.id);
  const name = scopeName(scope);
  const run = await insertRun({
    studentId: clerkId,
    kind: "time-trial",
    runKey: `time-trial:${key}:${crypto.randomUUID()}`,
    scope: key,
    form: {
      title: "Time trial",
      grading: "end",
      trial: start,
      play: {
        mode: "trial",
        scope,
        skills: Object.fromEntries(picked.map((i) => [i.id, { s: i.skill72, d: i.domain72 }])),
      },
      sections: [
        {
          key: section === "reading" ? "rw1" : "m1",
          title: `${name}, round ${start.round}`,
          subject: section,
          seconds: trialSeconds(section, start.multiplier, ids.length),
          questionIds: ids,
        },
      ],
    },
    snapshots: ids.map((id) => pool.snapshots.get(id)!),
    sequence: [],
  });
  return buildView(run, []);
}
