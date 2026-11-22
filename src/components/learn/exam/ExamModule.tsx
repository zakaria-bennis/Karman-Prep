"use client";
// One module of a full-length exam on the quiz screen (QuizShell, unchanged): its countdown with hide and
// show, the question navigator, mark for review, the check-your-work page, and the calculator and
// reference sheet in Math. The clock comes from the server's deadline, so a reload or another device
// shows the same time left. Every answer and the time spent on each question are saved as the student
// works (every few seconds) and when the module is submitted or runs out.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import {
  clearWorkspaces,
  emptyWorkspace,
  loadWorkspaces,
  saveWorkspaces,
} from "@/lib/quiz/workspace";
import type { ModuleView } from "@/lib/exams/service";
import s from "./exam.module.css";

type Entry = { answer: string | null; seconds: number; changes: number; flagged: boolean };

const SAVE_EVERY_MS = 15_000;

export function ExamModule({
  sittingId,
  module,
  serverNow,
  onSave,
  onSubmit,
}: {
  sittingId: string;
  module: ModuleView;
  serverNow: string;
  onSave(answers: (Entry & { questionId: string })[]): Promise<void>;
  onSubmit(answers: (Entry & { questionId: string })[]): Promise<void>;
}) {
  const router = useRouter();
  const attemptKey = `${sittingId}:${module.key}`;
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const entries = useRef<Record<string, Entry>>({});
  const dirty = useRef(false);

  // The module's start on this device's clock: the server's deadline, corrected for clock drift.
  const startedAtMs = useMemo(() => {
    const drift = Date.now() - new Date(serverNow).getTime();
    return new Date(module.deadline).getTime() + drift - module.seconds * 1000;
  }, [module.deadline, module.seconds, serverNow]);

  // What the server already holds (another device, a reload): seed the answers and the screen's memory.
  useMemo(() => {
    const seeded: Record<string, Entry> = {};
    for (const q of module.questions) {
      const saved = module.saved[q.id];
      seeded[q.id] = {
        answer: saved?.answer ?? null,
        seconds: saved?.seconds ?? 0,
        changes: saved?.changes ?? 0,
        flagged: saved?.flagged ?? false,
      };
    }
    entries.current = seeded;
    if (typeof window === "undefined") return;
    const stored = loadWorkspaces(attemptKey);
    let changed = false;
    for (const q of module.questions) {
      const saved = module.saved[q.id];
      if (!saved || stored[q.id]) continue;
      stored[q.id] = { ...emptyWorkspace(), answer: saved.answer, markedForReview: saved.flagged };
      changed = true;
    }
    if (changed) saveWorkspaces(attemptKey, stored);
  }, [attemptKey, module.questions, module.saved]);

  const list = () =>
    Object.entries(entries.current).map(([questionId, e]) => ({ questionId, ...e }));

  // Save as the student works; a failed save simply waits for the next one.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!dirty.current || submitting) return;
      dirty.current = false;
      void onSave(list()).catch(() => {
        dirty.current = true;
      });
    }, SAVE_EVERY_MS);
    return () => clearInterval(timer);
  }, [onSave, submitting]);

  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(list());
      clearWorkspaces(attemptKey);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <QuizShell
        mode={modeFor("timed", { baseSeconds: module.seconds, hasTutor: false })}
        questions={module.questions}
        total={module.questions.length}
        attemptKey={attemptKey}
        index={index}
        section={module.title}
        reviews={{}}
        startedAtMs={startedAtMs}
        hasCalculator={module.section === "math"}
        onNavigate={setIndex}
        onSelectAnswer={(id, answer) => {
          const e = entries.current[id];
          if (!e) return;
          if (e.answer !== answer) e.changes = Math.min(999, e.changes + 1);
          e.answer = answer;
          dirty.current = true;
        }}
        onSignals={(signals) => {
          for (const item of signals.items) {
            const e = entries.current[item.questionId];
            if (!e) continue;
            e.seconds = Math.max(e.seconds, Math.round(item.activeMs / 1000));
            e.flagged = item.marked;
            dirty.current = true;
          }
        }}
        onFinish={() => void finish()}
        onExit={() => {
          if (dirty.current) void onSave(list());
          router.push("/learn/tests");
        }}
      />
      {submitting && (
        <div className={s.veil} role="status">
          Saving your answers…
        </div>
      )}
    </>
  );
}
