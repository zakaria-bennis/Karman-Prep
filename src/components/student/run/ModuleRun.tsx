"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QuizShell } from "@/components/learn/quiz-shell/QuizShell";
import { modeFor } from "@/lib/quiz/mode";
import { expectedDone, formatClock, paceDelta } from "@/lib/student/time-trial";
import type { DeliveredQuestion } from "@/lib/student/preview-bank";
import type { StudentQuizReview } from "@/types/quiz";
import { actionPreviewGrade, actionPreviewGradeMany } from "@/app/student-preview/actions";
import { CloseIcon } from "../icons";
import { Layer } from "../Layer";
import r from "./run.module.css";

export type ModuleResult = {
  reviews: Record<string, StudentQuizReview>;
  /** Seconds on each question (first shown to submit or leave), by question id. */
  seconds: Record<string, number>;
  elapsedSeconds: number;
  finished: boolean;
};

type Props = {
  items: DeliveredQuestion[];
  kind: "instant" | "trial" | "test";
  title: string;
  section: string;
  /** Countdown length; omitted for an untimed (count-up) run. */
  limitSeconds?: number;
  hasTutor: boolean;
  attemptKey: string;
  onDone(result: ModuleResult): void;
  onExit(): void;
  /** Instant runs report each graded answer as it happens (points, history). */
  onGraded?(item: DeliveredQuestion, review: StudentQuizReview, seconds: number): void;
};

export function ModuleRun(p: Props) {
  const [index, setIndex] = useState(0);
  const [reviews, setReviews] = useState<Record<string, StudentQuizReview>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grading, setGrading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const [startMs] = useState(() => Date.now());
  const startedAt = useRef(startMs);
  const shown = useRef<Record<string, number>>({});
  const spent = useRef<Record<string, number>>({});
  const enteredAt = useRef(0);
  const elapsed = useElapsed(startMs);
  const done = useRef(false);

  const q = p.items[index];
  useEffect(() => {
    if (!q) return;
    shown.current[q.question.id] ??= Date.now();
    const id = q.question.id;
    const at = Date.now();
    enteredAt.current = at;
    const ledger = spent.current;
    return () => {
      ledger[id] = (ledger[id] ?? 0) + (Date.now() - at) / 1000;
    };
  }, [q]);

  const secondsFor = (id: string) => Math.max(1, Math.round(spent.current[id] ?? 0));

  async function finish(finished: boolean) {
    if (done.current) return;
    done.current = true;
    if (q)
      spent.current[q.question.id] =
        (spent.current[q.question.id] ?? 0) + (Date.now() - enteredAt.current) / 1000;
    setGrading(true);
    let all = reviews;
    if (p.kind !== "instant") {
      const list = p.items
        .filter((it) => answers[it.question.id])
        .map((it) => ({
          skillId: it.skillId,
          questionId: it.question.id,
          answer: answers[it.question.id],
        }));
      all = await actionPreviewGradeMany(list);
    }
    const seconds = Object.fromEntries(
      p.items.map((it) => [it.question.id, secondsFor(it.question.id)])
    );
    p.onDone({
      reviews: all,
      seconds,
      elapsedSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      finished,
    });
  }

  // A full-length module ends at zero, like the real test. A Time Trial runs into overtime.
  const left = p.limitSeconds !== undefined ? p.limitSeconds - elapsed : null;
  useEffect(() => {
    if (p.kind === "test" && left !== null && left <= 0) void finish(true);
  });

  const answered = Object.keys(answers).length;
  const pace =
    p.kind === "trial" && p.limitSeconds
      ? paceDelta(answered, elapsed, p.limitSeconds, p.items.length)
      : 0;
  const ghost =
    p.kind === "trial" && p.limitSeconds
      ? expectedDone(elapsed, p.limitSeconds, p.items.length)
      : 0;
  const clock =
    left === null ? formatClock(elapsed) : left >= 0 ? formatClock(left) : `+${formatClock(-left)}`;

  return (
    <Layer>
      <div className={`${r.run} ${p.kind === "trial" ? r.trial : ""}`} data-run={p.kind}>
        <header className={r.band}>
          <button
            type="button"
            className={r.exit}
            onClick={() => setLeaving(true)}
            aria-label="Leave"
          >
            <CloseIcon size={20} />
          </button>
          <div className={r.bandTitle}>
            {p.kind === "trial" && <span className={r.badge}>Time Trial</span>}
            <span className={r.title}>{p.title}</span>
          </div>
          <div className={r.bandRight}>
            <AnimatePresence>
              {toast && (
                <motion.span
                  key={toast.key}
                  className={r.toast}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
                >
                  {toast.text}
                </motion.span>
              )}
            </AnimatePresence>
            {p.kind === "trial" && (
              <span className={r.pace} data-ahead={pace >= 0}>
                {pace === 0 ? "On pace" : pace > 0 ? `${pace} ahead` : `${-pace} behind`}
              </span>
            )}
            <span
              className={r.clock}
              data-over={left !== null && left < 0}
              data-low={left !== null && left >= 0 && left <= 300}
              role="timer"
              aria-label={
                left === null
                  ? `Elapsed ${clock}`
                  : left >= 0
                    ? `${clock} left`
                    : `${clock} over target`
              }
            >
              {clock}
            </span>
          </div>
          {p.kind === "trial" && (
            <div className={r.track} aria-hidden="true">
              <span className={r.ghost} style={{ left: `${(ghost / p.items.length) * 100}%` }} />
              <motion.span
                className={r.runner}
                animate={{ left: `${(answered / p.items.length) * 100}%` }}
                transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              />
            </div>
          )}
          <AnimatePresence>
            {leaving && (
              <motion.div
                className={r.leave}
                role="alertdialog"
                aria-label="Leave this run"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              >
                <span>
                  {p.kind === "trial"
                    ? "Leave? This trial will not count."
                    : "Leave? Answers so far are kept."}
                </span>
                <button type="button" className={r.leaveYes} onClick={p.onExit}>
                  Leave
                </button>
                <button
                  type="button"
                  className={r.leaveNo}
                  onClick={() => setLeaving(false)}
                  autoFocus
                >
                  Stay
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
        <div className={r.stage}>
          <QuizShell
            mode={
              p.kind === "instant"
                ? modeFor("daily", { hasTutor: p.hasTutor })
                : modeFor("timed", { baseSeconds: p.limitSeconds ?? 1, hasTutor: p.hasTutor })
            }
            questions={p.items.map((it) => it.question)}
            attemptKey={p.attemptKey}
            hideClock
            index={index}
            section={p.section}
            onNavigate={setIndex}
            reviews={reviews}
            loading={grading}
            onSelectAnswer={(id, answer) =>
              setAnswers(({ [id]: _old, ...rest }) => (answer ? { ...rest, [id]: answer } : rest))
            }
            onSubmit={async (id, answer) => {
              const it = p.items.find((x) => x.question.id === id);
              if (!it) return;
              const seconds = Math.max(
                1,
                Math.round((Date.now() - (shown.current[id] ?? Date.now())) / 1000)
              );
              const review = await actionPreviewGrade({
                skillId: it.skillId,
                questionId: id,
                answer,
              });
              if (!review) return;
              setReviews((all) => ({ ...all, [id]: review }));
              setAnswers((all) => ({ ...all, [id]: answer }));
              p.onGraded?.(it, review, seconds);
              if (review.isCorrect)
                setToast({ key: Date.now(), text: `+${it.difficulty >= 5 ? 15 : 10}` });
            }}
            onFinish={() => void finish(true)}
            onToggleBookmark={() => undefined}
            onFlagForTutor={() => undefined}
          />
        </div>
      </div>
    </Layer>
  );
}

function useElapsed(startMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.floor((now - startMs) / 1000));
}
