"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CatalogSkill } from "@/data/curriculum/skill-catalog";
import {
  actionStartCatalogPractice,
  actionResumeCatalogPractice,
  actionSubmitCatalogPractice,
  actionCompleteCatalogPractice,
} from "@/app/learn/catalog-quiz-actions";
import {
  catalogPracticeError,
  catalogSessionHref,
  requireEntrySkill,
  type CatalogStudentSession,
  type CatalogSavedReview,
} from "@/lib/catalog-practice/student-entry";
import MathText from "../MathText";
import { modeFor } from "@/lib/quiz/mode";
import { clearWorkspaces } from "@/lib/quiz/workspace";
import {
  actionFlagForTutor,
  actionQuizStudentState,
  actionReportProblem,
  actionSetBookmark,
} from "@/app/learn/saved-question-actions";
import { QuizShell } from "../quiz-shell/QuizShell";
import CatalogPoolPreview from "./CatalogPoolPreview";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

export default function CatalogPractice({
  skill,
  initialSession,
  initialError = null,
  resumeSessionId,
  assignmentId,
  availableQuestions,
}: {
  skill: CatalogSkill;
  initialSession: CatalogStudentSession | null;
  initialError?: string | null;
  resumeSessionId?: string;
  assignmentId?: string;
  availableQuestions?: StudentQuizQuestion[];
}) {
  const router = useRouter();
  const [previewIndex, setPreviewIndex] = useState(0);
  const [session, setSession] = useState(initialSession);
  // Questions by their position in the session; positions answered before a resume stay empty.
  const [seen, setSeen] = useState<(StudentQuizQuestion | undefined)[]>(() =>
    placed([], initialSession)
  );
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<CatalogSavedReview | null>(null);
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);
  const [student, setStudent] = useState<{
    hasTutor: boolean;
    saved: Record<string, "bookmark" | "tutor_flag">;
  }>({ hasTutor: false, saved: {} });
  const busy = useRef(false);
  const startedAt = useRef(Date.now());

  const ids = seen.flatMap((q) => (q ? [q.id] : [])).join(",");
  useEffect(() => {
    if (!ids) return;
    actionQuizStudentState({ questionIds: ids.split(",") })
      .then(setStudent)
      .catch(() => undefined);
  }, [ids]);

  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(catalogPracticeError(cause));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function accept(next: CatalogStudentSession) {
    requireEntrySkill(next, skill.id);
    setSession(next);
    setReviewIndex(null);
    setSeen((old) => placed(old, next));
    setFeedback(null);
    startedAt.current = Date.now();
  }

  function start() {
    return run(async () => {
      const next = await actionStartCatalogPractice({ skillId: skill.id, assignmentId });
      accept(next);
      router.replace(catalogSessionHref(skill.id, next.id), { scroll: false });
    });
  }

  function retryResume() {
    return run(async () => {
      if (resumeSessionId) accept(await actionResumeCatalogPractice(resumeSessionId));
    });
  }

  function submit(questionId: string, answer: string) {
    if (!session?.question || session.question.id !== questionId || !answer.trim() || feedback)
      return;
    const current = session.question;
    return run(async () => {
      const saved = await actionSubmitCatalogPractice({
        sessionId: session.id,
        questionId: current.id,
        answer,
        responseTimeSeconds: Math.min(
          86400,
          Math.max(0, Math.round((Date.now() - startedAt.current) / 1000))
        ),
      });
      if (saved.questionId !== current.id) throw new Error("Practice session is unavailable");
      // Use the server's saved first response even after a retry or another open tab.
      setFeedback(saved);
    });
  }

  function next() {
    if (!session) return;
    return run(async () => {
      const resumed = await actionResumeCatalogPractice(session.id);
      requireEntrySkill(resumed, skill.id);
      if (!resumed.question && !resumed.completedAt) {
        const done = await actionCompleteCatalogPractice(session.id);
        clearWorkspaces(session.id);
        accept(done);
      } else accept(resumed);
    });
  }

  const reviews: Record<string, StudentQuizReview> = {};
  for (const r of session?.reviews ?? []) reviews[r.questionId] = r;
  if (feedback) reviews[feedback.questionId] = feedback;
  const position = session ? Math.min(session.answered, session.total - 1) : 0;
  const currentIndex = session?.question ? session.answered : position;
  const errorBox = error && (
    <p role="alert" className="mb-6 rounded-xl border border-error p-4 text-sm leading-relaxed">
      {error}
    </p>
  );

  if (session && !session.completedAt && seen.some(Boolean) && (session.question || feedback))
    return (
      <QuizShell
        mode={modeFor("catalog", { hasTutor: student.hasTutor })}
        questions={seen as StudentQuizQuestion[]}
        total={session.total}
        attemptKey={session.id}
        index={reviewIndex ?? currentIndex}
        section={skill.subject === "reading" ? "Reading and Writing" : "Math"}
        topic={skill.label}
        reviews={reviews}
        saved={student.saved}
        hasCalculator={skill.subject === "math"}
        onNavigate={(i) => {
          if (i > currentIndex) return void next();
          setReviewIndex(i === currentIndex ? null : i);
        }}
        onSubmit={(id, answer) => submit(id, answer)}
        onFinish={() => void next()}
        onExit={() => router.push(`/learn/${skill.subject}`)}
        onToggleBookmark={(id, on) => actionSetBookmark({ questionId: id, on })}
        onFlagForTutor={(id, note) =>
          actionFlagForTutor({ questionId: id, nodeId: skill.id, note: note || null })
        }
        onReportProblem={(id, note) =>
          actionReportProblem({ questionId: id, nodeId: skill.id, note })
        }
        feedback={errorBox}
      />
    );

  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-4 pb-24 pt-24 text-ivory sm:px-8">
      <header className="mb-8">
        <Link
          href={`/learn/${skill.subject}`}
          className="text-sm text-taupe underline underline-offset-4"
        >
          Back to skills
        </Link>
        <p className="mt-5 text-sm text-taupe">{skill.domainLabel}</p>
        <h1 className="mt-1 text-2xl font-semibold">{skill.label}</h1>
      </header>
      {errorBox}
      <div aria-busy={pending}>
        {!session ? (
          <section className="rounded-2xl border border-bronze bg-surface p-6">
            <h2 className="text-lg font-semibold">
              {resumeSessionId
                ? "Resume saved practice"
                : assignmentId
                  ? "Assigned practice"
                  : "Practice this skill"}
            </h2>
            <p className="my-4 text-sm leading-relaxed text-taupe">
              {resumeSessionId
                ? "Your saved practice is kept in your account. Retry loading it below."
                : "Work through up to ten reviewed questions. Your answers are saved as you go. You can leave and resume from this page."}
            </p>
            <button
              type="button"
              disabled={pending || availableQuestions?.length === 0}
              onClick={resumeSessionId ? retryResume : start}
              className="min-h-11 rounded-xl bg-gold px-6 py-3 font-semibold text-night disabled:opacity-50"
            >
              {pending ? "Loading…" : resumeSessionId ? "Retry loading practice" : "Start practice"}
            </button>
            {availableQuestions && (
              <CatalogPoolPreview
                questions={availableQuestions}
                onReload={() => router.refresh()}
                navigation={{ index: previewIndex, onChange: setPreviewIndex }}
              />
            )}
          </section>
        ) : session.completedAt ? (
          <section className="space-y-6 rounded-2xl border border-bronze bg-surface p-6">
            <div>
              <h2 className="text-xl font-semibold">Practice complete</h2>
              <p className="mt-3 text-3xl font-semibold">{session.score}%</p>
              <p className="mt-2 text-sm text-taupe">
                This practice only · {session.answered} of {session.total} questions answered
              </p>
              <p className="mt-3 text-sm leading-relaxed text-taupe">
                This result records this session. It does not establish mastery or predict an SAT
                score.
              </p>
            </div>
            <ol className="space-y-4" aria-label="Saved answers">
              {session.reviews.map((review) => (
                <li key={review.questionId} className="rounded-xl border border-bronze p-4">
                  <p className="font-semibold">
                    Saved response · {review.isCorrect ? "Correct" : "Incorrect"}
                  </p>
                  <SavedFeedback review={review} />
                </li>
              ))}
            </ol>
            <Link
              href={`/learn/${skill.subject}`}
              className="inline-block min-h-11 rounded-xl border border-bronze px-4 py-3"
            >
              Choose another skill
            </Link>
          </section>
        ) : (
          <section className="space-y-4 rounded-2xl border border-bronze bg-surface p-6">
            <h2 className="font-semibold">All {session.total} answers are saved</h2>
            <p className="text-sm text-taupe">Finish this session to see your result.</p>
            <button
              type="button"
              disabled={pending}
              onClick={next}
              className="min-h-11 rounded-xl bg-gold px-6 py-3 font-semibold text-night disabled:opacity-50"
            >
              {pending ? "Loading…" : "See results"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

/** Puts a session's current question at its position in the session. */
function placed(
  old: (StudentQuizQuestion | undefined)[],
  next: CatalogStudentSession | null
): (StudentQuizQuestion | undefined)[] {
  if (!next?.question) return old;
  const out = old.slice();
  out[next.answered] = next.question;
  return out;
}

function SavedFeedback({ review }: { review: CatalogSavedReview }) {
  return (
    <div className="mt-3 space-y-3 text-sm leading-relaxed">
      <p>
        Your saved answer: <MathText text={review.studentAnswer} />
      </p>
      <p>
        Correct answer: <MathText text={review.correct_answer} />
      </p>
      {review.explanation_text && (
        <MathText text={review.explanation_text} className="block whitespace-pre-wrap" />
      )}
      {review.explanation_per_choice &&
        Object.entries(review.explanation_per_choice).map(([letter, explanation]) =>
          explanation ? (
            <div key={letter}>
              <p className="font-semibold">Choice {letter}</p>
              <MathText text={explanation} className="block whitespace-pre-wrap" />
            </div>
          ) : null
        )}
    </div>
  );
}
