"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExamPreview } from "./exam-data";
import ExamModuleScreen, { sectionName } from "./ExamModuleScreen";
import ExamResults from "./ExamResults";

// The exam runs entirely in the browser: answers and progress live in React state and are
// mirrored to localStorage so a reload does not lose them. Nothing is sent to a server.

type Phase = "intro" | "module" | "review" | "break" | "results";

interface Progress {
  phase: Phase;
  moduleIndex: number;
  index: number;
  /** Epoch ms when the current module's (or the break's) time runs out. */
  deadline: number | null;
  answers: Record<string, string>;
  marked: string[];
}

const BREAK_MINUTES = 10;
const fresh: Progress = {
  phase: "intro",
  moduleIndex: 0,
  index: 0,
  deadline: null,
  answers: {},
  marked: [],
};

function load(key: string): Progress {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...fresh, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    /* Storage blocked or unreadable: start fresh. */
  }
  return fresh;
}

export default function ExamPreviewClient({ exam }: { exam: ExamPreview }) {
  const storageKey = `karman-exam-preview:${exam.examId}:${exam.version}`;
  const [progress, setProgress] = useState<Progress | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setProgress(load(storageKey)), [storageKey]);
  useEffect(() => {
    if (!progress) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      /* Keep the attempt in memory when storage is blocked. */
    }
  }, [progress, storageKey]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const update = useCallback((change: (p: Progress) => Progress) => {
    setProgress((p) => (p ? change(p) : p));
  }, []);

  const startModule = useCallback(
    (moduleIndex: number) =>
      update((p) => ({
        ...p,
        phase: "module",
        moduleIndex,
        index: 0,
        deadline: Date.now() + exam.modules[moduleIndex].minutes * 60_000,
      })),
    [exam.modules, update]
  );

  const submitModule = useCallback(
    () =>
      update((p) => {
        const nextIndex = p.moduleIndex + 1;
        if (nextIndex >= exam.modules.length) return { ...p, phase: "results", deadline: null };
        const breakBetween =
          exam.modules[p.moduleIndex].section !== exam.modules[nextIndex].section;
        if (breakBetween)
          return {
            ...p,
            phase: "break",
            moduleIndex: nextIndex,
            index: 0,
            deadline: Date.now() + BREAK_MINUTES * 60_000,
          };
        return {
          ...p,
          phase: "module",
          moduleIndex: nextIndex,
          index: 0,
          deadline: Date.now() + exam.modules[nextIndex].minutes * 60_000,
        };
      }),
    [exam.modules, update]
  );

  const secondsLeft = progress?.deadline
    ? Math.max(0, Math.ceil((progress.deadline - now) / 1000))
    : 0;
  const timedOut =
    !!progress?.deadline &&
    secondsLeft === 0 &&
    (progress.phase === "module" || progress.phase === "review" || progress.phase === "break");
  useEffect(() => {
    if (!timedOut || !progress) return;
    if (progress.phase === "break") startModule(progress.moduleIndex);
    else submitModule();
  }, [timedOut, progress, startModule, submitModule]);

  useEffect(() => {
    if (progress?.phase !== "module" && progress?.phase !== "review") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [progress?.phase]);

  if (!progress) return <div className="min-h-screen bg-night" />;

  const restart = () => {
    if (window.confirm("Clear every answer and start the exam again?")) setProgress(fresh);
  };

  if (progress.phase === "results")
    return <ExamResults exam={exam} answers={progress.answers} onRestart={restart} />;

  const mod = exam.modules[progress.moduleIndex];
  const moduleLabel = `${sectionName(mod.section)} · Module ${mod.module}`;

  if (progress.phase === "intro" || progress.phase === "break") {
    const isBreak = progress.phase === "break";
    return (
      <div className="min-h-screen bg-night px-4 py-12 text-ivory sm:px-6">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-taupe">
            Exam preview · dev only
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {isBreak ? "Break" : `${exam.examId.replace(/_/g, " ")}`}
          </h1>
          {isBreak ? (
            <p className="mt-4 text-sm leading-relaxed text-taupe">
              Up next: {moduleLabel}. The break ends on its own in{" "}
              <span className="font-semibold tabular-nums text-ivory">
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </span>
              .
            </p>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-taupe">
                The captured exam, taken the way a student takes it: four timed modules in order,
                then your answers against the printed key. Nothing is saved except in this browser.
              </p>
              <ol className="mt-6 space-y-2">
                {exam.modules.map((m) => (
                  <li
                    key={`${m.section}-${m.module}`}
                    className="flex justify-between rounded-xl border border-bronze bg-surface px-4 py-3 text-sm"
                  >
                    <span>
                      {sectionName(m.section)} · Module {m.module}
                    </span>
                    <span className="text-taupe">
                      {m.questions.length} questions · {m.minutes} min
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-taupe">Source package: {exam.version}</p>
            </>
          )}
          <div className="mt-8 flex flex-wrap justify-end gap-3">
            {!isBreak && Object.keys(progress.answers).length > 0 && (
              <button type="button" className="btn-secondary" onClick={restart}>
                Clear answers
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={() => startModule(progress.moduleIndex)}
            >
              {isBreak ? "Resume testing" : `Start ${moduleLabel}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ExamModuleScreen
      mod={mod}
      moduleKey={`exam-preview-${progress.moduleIndex}`}
      moduleLabel={moduleLabel}
      index={Math.min(progress.index, mod.questions.length - 1)}
      reviewing={progress.phase === "review"}
      answers={progress.answers}
      marked={progress.marked}
      secondsLeft={secondsLeft}
      onAnswer={(questionId, answer) =>
        update((p) => ({ ...p, answers: { ...p.answers, [questionId]: answer } }))
      }
      onToggleMark={(questionId) =>
        update((p) => ({
          ...p,
          marked: p.marked.includes(questionId)
            ? p.marked.filter((id) => id !== questionId)
            : [...p.marked, questionId],
        }))
      }
      onNavigate={(index) => update((p) => ({ ...p, phase: "module", index }))}
      onReview={() => update((p) => ({ ...p, phase: "review" }))}
      onSubmitModule={submitModule}
    />
  );
}
