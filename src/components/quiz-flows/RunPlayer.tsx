"use client";
// Drives the shared quiz screen (QuizShell) for every quiz flow: the Daily 10, practice sets and
// Domain quizzes grade each answer; full-length tests and the diagnostic grade each timed section.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import { clearWorkspaces } from "@/lib/quiz/workspace";
import {
  actionFlagForTutor,
  actionQuizStudentState,
  actionReportProblem,
  actionSetBookmark,
} from "@/app/learn/saved-question-actions";
import {
  actionAnswerRunQuestion,
  actionResumeRun,
  actionSubmitRunSection,
  type RunActionResult,
} from "@/app/learn/quiz-run-actions";
import type { RunReview, RunView } from "@/lib/assembler/run-types";
import { LevelBanner } from "./LevelBanner";
import { FlowFrame, Message } from "./FlowFrame";
import { RunEnd } from "./RunEnd";
import type { ShellUser } from "./types";

type Change = { skill: string; from: number; to: number } | null;

export function RunPlayer({
  user,
  open,
  initial = null,
  intro,
  exitHref,
  lessonHref = null,
  againHref,
  title,
}: {
  user: ShellUser;
  /** The heading on loading and error screens. */
  title: string;
  /** Starts or resumes the run (a server action bound to this flow). */
  open: () => Promise<RunActionResult<RunView>>;
  initial?: RunView | null;
  /** Shown before a timed run starts; the player opens the run when the student continues. */
  intro?: (start: () => void, pending: boolean) => ReactNode;
  exitHref: string;
  lessonHref?: string | null;
  againHref?: string;
}) {
  const [run, setRun] = useState<RunView | null>(initial);
  const [error, setError] = useState<{ text: string; limit?: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [started, setStarted] = useState(!intro || !!initial);
  const busy = useRef(false);

  const call = useCallback(async <T,>(work: () => Promise<RunActionResult<T>>) => {
    if (busy.current) return null;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await work();
      if (!result.ok) {
        setError({ text: result.error, limit: result.limit });
        return null;
      }
      return result.value;
    } catch {
      setError({ text: "We could not reach Karman. Check your connection and try again." });
      return null;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, []);

  const begin = useCallback(async () => {
    setStarted(true);
    const next = await call(open);
    if (next) setRun(next);
  }, [call, open]);

  useEffect(() => {
    if (!run && started) void begin();
    // Open once on arrival; later opens come from the student's own action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!started && intro)
    return (
      <FlowFrame user={user} title={title}>
        {intro(() => void begin(), pending)}
      </FlowFrame>
    );
  if (!run)
    return (
      <FlowFrame user={user} title={title}>
        {error ? (
          <Message
            title={error.limit ? "That is the end of the Free plan" : "Something went wrong"}
            text={error.text}
            action={
              error.limit
                ? { href: "/billing", label: "See plans" }
                : { onClick: () => void begin(), label: "Try again" }
            }
            back={{ href: exitHref, label: "Back" }}
          />
        ) : (
          <Message title="Getting your questions ready" text="One moment." busy />
        )}
      </FlowFrame>
    );
  if (run.completedAt)
    return (
      <RunEnd
        user={user}
        run={run}
        exitHref={exitHref}
        lessonHref={lessonHref}
        againHref={againHref}
      />
    );
  return run.grading === "instant" ? (
    <InstantRun
      run={run}
      setRun={setRun}
      call={call}
      error={error?.text ?? null}
      exitHref={exitHref}
    />
  ) : (
    <TimedRun
      run={run}
      setRun={setRun}
      call={call}
      error={error?.text ?? null}
      exitHref={exitHref}
      user={user}
    />
  );
}

type Caller = <T>(work: () => Promise<RunActionResult<T>>) => Promise<T | null>;

function useStudentState(ids: string) {
  const [student, setStudent] = useState<{
    hasTutor: boolean;
    saved: Record<string, "bookmark" | "tutor_flag">;
  }>({ hasTutor: false, saved: {} });
  useEffect(() => {
    if (!ids) return;
    actionQuizStudentState({ questionIds: ids.split(",") })
      .then(setStudent)
      .catch(() => undefined);
  }, [ids]);
  return student;
}

function errorBox(text: string | null) {
  return text ? (
    <p role="alert" className="mt-4 rounded-xl border border-error p-4 text-sm leading-relaxed">
      {text}
    </p>
  ) : null;
}

function InstantRun({
  run,
  setRun,
  call,
  error,
  exitHref,
}: {
  run: RunView;
  setRun(view: RunView): void;
  call: Caller;
  error: string | null;
  exitHref: string;
}) {
  const router = useRouter();
  const section = run.sections[0];
  const [shown, setShown] = useState(run);
  const [extra, setExtra] = useState<Record<string, RunReview>>({});
  const [after, setAfter] = useState<{ view: RunView; change: Change } | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const startedAt = useRef(Date.now());
  const questions = shown.sections[0].questions;
  const answeredIndex = questions.findIndex((q) => !shown.reviews[q.id] && !extra[q.id]);
  const currentIndex = answeredIndex === -1 ? questions.length - 1 : answeredIndex;
  const student = useStudentState(questions.map((q) => q.id).join(","));

  function submit(questionId: string, answer: string) {
    if (after || !answer.trim()) return;
    return void call(() =>
      actionAnswerRunQuestion({
        runId: run.id,
        questionId,
        answer,
        seconds: Math.min(86400, Math.max(0, Math.round((Date.now() - startedAt.current) / 1000))),
        usedHint: false,
      })
    ).then((saved) => {
      if (!saved) return;
      setExtra((old) => ({ ...old, [questionId]: saved.review }));
      setAfter({ view: saved.view, change: saved.change });
    });
  }

  function next() {
    if (after) {
      if (after.view.completedAt) clearWorkspaces(run.id);
      setRun(after.view);
      setShown(after.view);
      setAfter(null);
      setReviewIndex(null);
      startedAt.current = Date.now();
      return;
    }
    void call(() => actionResumeRun({ runId: run.id })).then((view) => {
      if (view) {
        setRun(view);
        setShown(view);
      }
    });
  }

  const reviews = { ...shown.reviews, ...extra };
  const current = questions[currentIndex];
  const reviewed = current ? reviews[current.id] : undefined;
  const index = reviewIndex ?? (reviewed && after ? currentIndex : currentIndex);
  const subject =
    run.kind === "daily-ten"
      ? (current && shown.sections[0].topics[current.id] && current.subject) || section.subject
      : section.subject;
  return (
    <QuizShell
      mode={modeFor(run.kind === "daily-ten" ? "daily" : "catalog", { hasTutor: student.hasTutor })}
      questions={questions}
      total={section.total}
      attemptKey={run.id}
      index={index}
      section={run.kind === "daily-ten" ? "Daily 10" : run.title}
      /* Only a skill's own practice names its topic: anywhere else it gives the answer away
         (founder, 2026-11-08). */
      topic={
        run.kind === "practice-set" && current ? shown.sections[0].topics[current.id] : undefined
      }
      reviews={reviews}
      saved={student.saved}
      hasCalculator={subject === "math"}
      onNavigate={(i) => {
        if (i > currentIndex) return void next();
        setReviewIndex(i === currentIndex ? null : i);
      }}
      onSubmit={(id, answer) => submit(id, answer)}
      onFinish={() => next()}
      onExit={() => router.push(exitHref)}
      onToggleBookmark={(id, on) => actionSetBookmark({ questionId: id, on })}
      onFlagForTutor={(id, note) =>
        actionFlagForTutor({ questionId: id, nodeId: run.scope ?? run.kind, note: note || null })
      }
      onReportProblem={(id, note) =>
        actionReportProblem({ questionId: id, nodeId: run.scope ?? run.kind, note })
      }
      feedback={
        <>
          {/* Level news waits for the end of a mixed run: mid-run it names the skill being
              tested and can discourage after a miss (founder, 2026-11-08). */}
          {after?.change && index === currentIndex && run.kind === "practice-set" && (
            <LevelBanner change={after.change} />
          )}
          {errorBox(error)}
        </>
      }
    />
  );
}

function TimedRun({
  run,
  setRun,
  call,
  error,
  exitHref,
  user,
}: {
  run: RunView;
  setRun(view: RunView): void;
  call: Caller;
  error: string | null;
  exitHref: string;
  user: ShellUser;
}) {
  const router = useRouter();
  const sectionIndex = run.current ?? 0;
  const section = run.sections[sectionIndex];
  const [index, setIndex] = useState(0);
  const [breakDone, setBreakDone] = useState<string | null>(null);
  const answers = useRef<Record<string, string>>({});
  const startedAt = useRef(Date.now());
  const student = useStudentState(section.questions.map((q) => q.id).join(","));
  const onBreak = section.breakBefore && breakDone !== section.key && sectionIndex > 0;

  useEffect(() => {
    setIndex(0);
    answers.current = {};
    startedAt.current = Date.now();
  }, [section.key]);

  function finish() {
    void call(() =>
      actionSubmitRunSection({
        runId: run.id,
        sectionKey: section.key,
        answers: answers.current,
        seconds: Math.min(86400, Math.round((Date.now() - startedAt.current) / 1000)),
      })
    ).then((view) => {
      if (!view) return;
      clearWorkspaces(`${run.id}:${section.key}`);
      setRun(view);
    });
  }

  if (onBreak)
    return (
      <FlowFrame user={user} title={run.title}>
        <Message
          title="Take a break"
          text={`You finished ${run.sections[sectionIndex - 1].title.replace(/, Module \d/, "")}. Stand up, drink some water, and come back when you are ready. ${section.title} is next.`}
          action={{ onClick: () => setBreakDone(section.key), label: `Start ${section.title}` }}
          back={{ href: exitHref, label: "Save and leave" }}
        />
      </FlowFrame>
    );
  return (
    <QuizShell
      mode={modeFor(run.kind === "diagnostic" ? "diagnostic" : "timed", {
        baseSeconds: section.seconds ?? 60,
        hasTutor: student.hasTutor,
      })}
      questions={section.questions}
      total={section.total}
      attemptKey={`${run.id}:${section.key}`}
      index={index}
      section={section.title}
      topic={undefined}
      reviews={{}}
      saved={student.saved}
      hasCalculator={section.subject === "math"}
      onNavigate={setIndex}
      onSelectAnswer={(id, answer) => {
        if (answer) answers.current[id] = answer;
        else delete answers.current[id];
      }}
      onFinish={() => finish()}
      onExit={() => router.push(exitHref)}
      onToggleBookmark={(id, on) => actionSetBookmark({ questionId: id, on })}
      onFlagForTutor={(id, note) =>
        actionFlagForTutor({ questionId: id, nodeId: run.kind, note: note || null })
      }
      onReportProblem={(id, note) =>
        actionReportProblem({ questionId: id, nodeId: run.kind, note })
      }
      feedback={errorBox(error)}
    />
  );
}
