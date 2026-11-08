"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buildStudentHome, sectionOf, type StudentHomeInput } from "@/lib/student/home-model";
import { pointsForAnswer } from "@/lib/student/skill-points";
import {
  formatClock,
  nextTarget,
  type TrialRun,
  type TrialSection,
  type TrialVerdict,
} from "@/lib/student/time-trial";
import type { DeliveredQuestion } from "@/lib/student/preview-bank";
import type { QuizDifficultyLevel } from "@/types/quiz";
import { addToHistory, useMergedInput } from "../preview-store";
import { TrialChart } from "../TrialChart";
import { ModuleRun, type ModuleResult } from "./ModuleRun";
import { ResultActions, ResultsFrame } from "./Results";
import { Locked } from "./Locked";
import { assignmentState } from "@/lib/student/unlocks";
import x from "./results.module.css";

const NAME: Record<TrialSection, string> = { math: "Math", reading: "Reading and Writing" };

/** Untimed accuracy over the same window the starting target uses. */
export function baselineAccuracy(input: StudentHomeInput, section: TrialSection): number | null {
  const rs = input.responses
    .filter((r) => !r.timed && sectionOf(r.skillId) === section)
    .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
    .slice(0, 120);
  return rs.length < 10 ? null : rs.filter((r) => r.correct).length / rs.length;
}

export function TrialRunner({
  items,
  input,
  section,
  base,
  assignmentId,
}: {
  items: DeliveredQuestion[];
  input: StudentHomeInput;
  section: TrialSection;
  base: string;
  assignmentId: string | null;
}) {
  const router = useRouter();
  const merged = useMergedInput(input);
  // Start only after this browser's own history is read, so the target is the real one.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [frozen, setFrozen] = useState<{ target: number; goal: number; steps: number[] } | null>(
    null
  );
  const [result, setResult] = useState<{
    run: TrialRun;
    verdict: TrialVerdict;
    steps: number[];
  } | null>(null);
  const [runKey] = useState(() => `preview:trial:${Date.now()}`);

  useEffect(() => {
    if (!ready || frozen) return;
    const t = buildStudentHome(merged, Date.now(), base).trials[section];
    setFrozen({ target: t.target, goal: t.goal, steps: t.steps });
  }, [ready, frozen, merged, base, section]);

  if (items.length === 0) {
    return (
      <ResultsFrame trial>
        <p className={x.verdict}>No published questions are ready for this section yet.</p>
        <ResultActions primary={{ href: `${base}/time-trial`, label: "Back" }} />
      </ResultsFrame>
    );
  }
  if (!frozen) return null;
  const assignment = merged.assignments.find(
    (a) => a.id === assignmentId && a.kind === "time_trial"
  );
  const state = assignment ? assignmentState(assignment, Date.now()) : null;
  if (!result && state !== "open") {
    return (
      <Locked
        a={assignment && state ? { ...assignment, state } : undefined}
        back={`${base}/time-trial`}
        trial
      />
    );
  }

  if (result) {
    const { run, verdict, steps } = result;
    const diff = run.target - run.elapsedSeconds;
    return (
      <ResultsFrame trial>
        <span className={x.eyebrow}>Time Trial · {NAME[section]}</span>
        <p className={x.big}>{formatClock(run.elapsedSeconds)}</p>
        <p className={x.verdict}>
          {verdict.beat ? (
            <>
              Beat {formatClock(run.target)} by {formatClock(diff)}. Next target{" "}
              <strong>{formatClock(verdict.nextTarget)}</strong>.
            </>
          ) : verdict.reason === "rushed" ? (
            <>
              Fast, but accuracy dropped. Target holds at{" "}
              <strong>{formatClock(verdict.nextTarget)}</strong>.
            </>
          ) : (
            <>
              {formatClock(-diff)} over. Target holds at{" "}
              <strong>{formatClock(verdict.nextTarget)}</strong>.
            </>
          )}
        </p>
        <dl className={x.facts}>
          <div>
            <dt>Right</dt>
            <dd>
              {run.correct} of {run.questions}
            </dd>
          </div>
          <div>
            <dt>Goal</dt>
            <dd>{formatClock(frozen.goal)}</dd>
          </div>
          <div>
            <dt>Trials</dt>
            <dd>{steps.length - 1}</dd>
          </div>
        </dl>
        <div className={x.panel}>
          <TrialChart steps={steps} goal={frozen.goal} height={120} />
        </div>
        <ResultActions primary={{ href: base, label: "Back to home" }} />
      </ResultsFrame>
    );
  }

  const finish = (m: ModuleResult) => {
    const correct = items.filter((it) => m.reviews[it.question.id]?.isCorrect).length;
    const verdict = nextTarget({
      target: frozen.target,
      goal: frozen.goal,
      elapsedSeconds: m.elapsedSeconds,
      finished: m.finished,
      correct,
      questions: items.length,
      baselineAccuracy: baselineAccuracy(merged, section),
    });
    const finishedAt = new Date().toISOString();
    const run: TrialRun = {
      id: runKey,
      section,
      target: frozen.target,
      elapsedSeconds: m.elapsedSeconds,
      correct,
      questions: items.length,
      beat: verdict.beat,
      nextTarget: verdict.nextTarget,
      finishedAt,
    };
    addToHistory({
      completions: assignmentId ? { [assignmentId]: finishedAt } : {},
      trialRuns: [run],
      responses: items
        .filter((it) => m.reviews[it.question.id])
        .map((it) => ({
          questionId: it.question.id,
          skillId: it.skillId,
          correct: m.reviews[it.question.id].isCorrect,
          difficulty: it.difficulty as QuizDifficultyLevel,
          answeredAt: finishedAt,
          seconds: m.seconds[it.question.id] ?? 1,
          timed: true,
        })),
      awards: items.flatMap((it) => {
        const pts = pointsForAnswer(
          !!m.reviews[it.question.id]?.isCorrect,
          it.difficulty as QuizDifficultyLevel
        );
        return pts
          ? [
              {
                awardKey: `trial:${runKey}:${it.question.id}`,
                skillId: it.skillId,
                points: pts,
                createdAt: finishedAt,
              },
            ]
          : [];
      }),
    });
    setResult({
      run,
      verdict,
      steps: [...frozen.steps.slice(0, -1), frozen.target, verdict.nextTarget],
    });
  };

  return (
    <ModuleRun
      items={items}
      kind="trial"
      title={NAME[section]}
      section={`${NAME[section]} · Time Trial`}
      limitSeconds={frozen.target}
      hasTutor
      attemptKey={runKey}
      onExit={() => router.push(`${base}/time-trial`)}
      onDone={finish}
    />
  );
}
