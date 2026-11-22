"use client";
// One portal activity on the real quiz screen (QuizShell), on a run the server keeps (src/lib/play):
// a skill set, the Daily 10, endless mode and a review grade each answer as it is given; a time trial
// grades its module when it is submitted or its time runs out. When the run is finished it hands the
// finished run to the player (PlayLayer.tsx), which carries the quiz into the ending.
import { useEffect, useMemo, useRef, useState } from "react";
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import { clearWorkspaces } from "@/lib/quiz/workspace";
import {
  actionAnswerRunQuestion,
  actionNoteAnswerSignals,
  actionResumeRun,
  actionSubmitRunSection,
} from "@/app/learn/quiz-run-actions";
import {
  actionFlagForTutor,
  actionQuizStudentState,
  actionRemoveTutorFlag,
  actionReportProblem,
  actionSetBookmark,
} from "@/app/learn/saved-question-actions";
import { actionGeneratedIds, actionUseSecondChance } from "@/app/learn/play-actions";
import type { RunReview, RunView } from "@/lib/assembler/run-types";
import type { NoteSignals } from "@/lib/quiz/signals";

type Saved = Record<string, "bookmark" | "tutor_flag">;

/** The student's bookmarks and whether they have a tutor, for the questions on screen. */
function useStudentState(ids: string) {
  const [student, setStudent] = useState<{ hasTutor: boolean; saved: Saved }>({
    hasTutor: false,
    saved: {},
  });
  useEffect(() => {
    if (!ids) return;
    actionQuizStudentState({ questionIds: ids.split(",") })
      .then(setStudent)
      .catch(() => undefined);
  }, [ids]);
  return student;
}

/** The admin-only "Generated" mark: asked of the server, which answers only an admin. */
function useGenerated(ids: string) {
  const [marked, setMarked] = useState<Record<string, true>>({});
  useEffect(() => {
    if (!ids) return;
    actionGeneratedIds({ questionIds: ids.split(",") })
      .then((r) => r.ok && setMarked(Object.fromEntries(r.value.map((id) => [id, true]))))
      .catch(() => undefined);
  }, [ids]);
  return marked;
}

export type RunPlayProps = {
  view: RunView;
  /** Orders each student's answer choices (the same order every time for this student). */
  seed: string;
  /** Second chances held (skill sets only). */
  secondChances?: number;
  /** Seconds each question was worked, as the quiz saw it (for a time trial's pacing). */
  onWorked?(questionId: string, ms: number): void;
  onFinished(view: RunView): void;
  onExit(): void;
  onError(text: string): void;
};

export function RunPlay(props: RunPlayProps) {
  return props.view.grading === "instant" ? <InstantPlay {...props} /> : <TimedPlay {...props} />;
}

function InstantPlay({ view, seed, secondChances = 0, onFinished, onExit, onError }: RunPlayProps) {
  const [shown, setShown] = useState(view);
  const [extra, setExtra] = useState<Record<string, RunReview>>({});
  const [after, setAfter] = useState<RunView | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [rescued, setRescued] = useState<Record<string, true>>({});
  const [chances, setChances] = useState(secondChances);
  const busy = useRef(false);
  const startedAt = useRef(Date.now());
  const section = shown.sections[0];
  const questions = section.questions;
  const reviews = { ...shown.reviews, ...extra };
  const open = questions.findIndex((q) => !reviews[q.id]);
  const currentIndex = open === -1 ? questions.length - 1 : open;
  const ids = questions.map((q) => q.id).join(",");
  const student = useStudentState(ids);
  const generated = useGenerated(ids);
  const endless = isEndless(shown);
  const misses = Object.values(reviews).filter((r) => !r.isCorrect).length;

  async function submit(questionId: string, answer: string) {
    if (busy.current || after || !answer.trim()) return;
    busy.current = true;
    try {
      const saved = await actionAnswerRunQuestion({
        runId: shown.id,
        questionId,
        answer,
        seconds: Math.min(86400, Math.max(0, Math.round((Date.now() - startedAt.current) / 1000))),
        usedHint: false,
      });
      if (!saved.ok) return onError(saved.error);
      setExtra((old) => ({ ...old, [questionId]: saved.value.review }));
      setAfter(saved.value.view);
    } catch {
      onError("We could not reach Karman. Check your connection and try again.");
    } finally {
      busy.current = false;
    }
  }

  async function next() {
    if (after) {
      if (after.completedAt) {
        clearWorkspaces(shown.id);
        return onFinished(after);
      }
      setShown(after);
      setAfter(null);
      setReviewIndex(null);
      startedAt.current = Date.now();
      return;
    }
    const resumed = await actionResumeRun({ runId: shown.id }).catch(() => null);
    if (!resumed?.ok) return onError(resumed?.error ?? "We could not reach Karman.");
    if (resumed.value.completedAt) return onFinished(resumed.value);
    setShown(resumed.value);
  }

  const index = reviewIndex ?? currentIndex;
  const current = questions[currentIndex];
  const daily = shown.kind === "daily-ten";
  const isSet = shown.kind === "practice-set" && !endless && shown.scope?.startsWith("set72:");
  return (
    <QuizShell
      mode={modeFor(daily ? "daily" : "skill", { hasTutor: student.hasTutor })}
      questions={questions}
      total={endless ? questions.length : section.total}
      attemptKey={shown.id}
      onSignals={(signals: NoteSignals) => void actionNoteAnswerSignals(signals)}
      index={index}
      section={daily ? "Daily 10" : endless ? "Endless" : shown.title}
      // only a skill's own set names its topic: anywhere else it gives the answer away
      topic={isSet && current ? shown.title : undefined}
      reviews={reviews}
      saved={student.saved}
      hasCalculator={(current?.subject ?? section.subject) === "math"}
      shuffleSeed={seed}
      generated={generated}
      endless={endless ? { hearts: 3, lost: Math.min(3, misses) } : undefined}
      rescued={rescued}
      rescue={
        isSet && chances > 0 && !Object.keys(rescued).length
          ? {
              left: chances,
              onUse: async (questionId: string) => {
                const r = await actionUseSecondChance({ runId: shown.id, questionId });
                if (!r.ok) {
                  onError(r.error);
                  return false;
                }
                setRescued({ [questionId]: true });
                setChances((n) => n - 1);
                // a set that already finished comes back with its level worked out again
                if (after?.completedAt && r.value.completedAt) setAfter(r.value);
                return true;
              },
            }
          : undefined
      }
      onNavigate={(i) => {
        if (i > currentIndex) return void next();
        setReviewIndex(i === currentIndex ? null : i);
      }}
      onSubmit={(id, answer) => submit(id, answer)}
      onFinish={() => void next()}
      onExit={onExit}
      onToggleBookmark={(id, on) => actionSetBookmark({ questionId: id, on })}
      onRemoveTutorFlag={(id) => actionRemoveTutorFlag({ questionId: id })}
      onFlagForTutor={(id, note) =>
        actionFlagForTutor({
          questionId: id,
          nodeId: shown.scope ?? shown.kind,
          note: note || null,
        })
      }
      onReportProblem={(id, note) =>
        actionReportProblem({ questionId: id, nodeId: shown.scope ?? shown.kind, note })
      }
    />
  );
}

/** An endless run's scope starts "endless:" (src/lib/play/server/play-runs.ts). */
export const isEndless = (view: Pick<RunView, "scope">) => !!view.scope?.startsWith("endless:");

function TimedPlay({ view, seed, onWorked, onFinished, onExit, onError }: RunPlayProps) {
  const section = view.sections[view.current ?? 0];
  const [index, setIndex] = useState(0);
  const answers = useRef<Record<string, string>>({});
  const startedAt = useRef(Date.now());
  const busy = useRef(false);
  const ids = useMemo(() => section.questions.map((q) => q.id).join(","), [section.questions]);
  const student = useStudentState(ids);
  const generated = useGenerated(ids);

  async function finish() {
    if (busy.current) return;
    busy.current = true;
    try {
      const done = await actionSubmitRunSection({
        runId: view.id,
        sectionKey: section.key,
        answers: answers.current,
        seconds: Math.min(86400, Math.round((Date.now() - startedAt.current) / 1000)),
      });
      if (!done.ok) return onError(done.error);
      clearWorkspaces(`${view.id}:${section.key}`);
      onFinished(done.value);
    } catch {
      onError("We could not reach Karman. Check your connection and try again.");
    } finally {
      busy.current = false;
    }
  }

  return (
    <QuizShell
      mode={modeFor("timed", { baseSeconds: section.seconds ?? 60, hasTutor: student.hasTutor })}
      questions={section.questions}
      total={section.total}
      attemptKey={`${view.id}:${section.key}`}
      onSignals={(signals: NoteSignals) => {
        void actionNoteAnswerSignals(signals);
        for (const item of signals.items) onWorked?.(item.questionId, item.activeMs);
      }}
      index={index}
      section="Time trial"
      reviews={{}}
      saved={student.saved}
      hasCalculator={section.subject === "math"}
      shuffleSeed={seed}
      generated={generated}
      onNavigate={setIndex}
      onSelectAnswer={(id, answer) => {
        if (answer) answers.current[id] = answer;
        else delete answers.current[id];
      }}
      onFinish={() => void finish()}
      onExit={onExit}
      onToggleBookmark={(id, on) => actionSetBookmark({ questionId: id, on })}
      onRemoveTutorFlag={(id) => actionRemoveTutorFlag({ questionId: id })}
      onFlagForTutor={(id, note) =>
        actionFlagForTutor({ questionId: id, nodeId: view.kind, note: note || null })
      }
      onReportProblem={(id, note) =>
        actionReportProblem({ questionId: id, nodeId: view.kind, note })
      }
    />
  );
}
