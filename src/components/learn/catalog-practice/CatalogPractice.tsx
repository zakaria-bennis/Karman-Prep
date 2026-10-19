"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import Scratchpad from "../Scratchpad";
import { AnnotationProvider } from "../quiz/PassageAnnotations";
import { CalculatorScope, CalculatorTrigger } from "@/components/calculator/CalculatorScope";
import { makeQuestionKey } from "@/components/calculator/question-key";
import { LEARN_HEADER_CLEARANCE } from "@/components/learn/learn-header";
import { QuizMenu } from "../quiz/QuizMenu";
import { PracticeTimer, HighlightTool } from "../quiz/QuizTools";
import { CatalogStudyTools } from "./CatalogStudyTools";
import { QuestionTransition } from "../quiz/QuizTools";
import CatalogQuestion from "./CatalogQuestion";
import CatalogPoolPreview from "./CatalogPoolPreview";
import type { StudentQuizQuestion } from "@/types/quiz";

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
  const shellRef = useRef<HTMLDivElement>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const previewQuestion =
    availableQuestions?.[Math.min(previewIndex, availableQuestions.length - 1)];
  const [session, setSession] = useState(initialSession);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [seen, setSeen] = useState<StudentQuizQuestion[]>(
    initialSession?.question ? [initialSession.question] : []
  );
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const shownQuestion = reviewIndex === null ? session?.question : seen[reviewIndex];
  const oldReview = shownQuestion
    ? session?.reviews.find((r) => r.questionId === shownQuestion.id)
    : null;
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<CatalogSavedReview | null>(null);
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const startedAt = useRef(Date.now());

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
    if (next.question)
      setSeen((old) =>
        old.some((q) => q.id === next.question!.id) ? old : [...old, next.question!]
      );
    setAnswer("");
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

  function submit() {
    if (!session?.question || !answer.trim() || feedback) return;
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
      setAnswer(saved.studentAnswer);
      setFeedback(saved);
    });
  }

  function next() {
    if (!session) return;
    return run(async () => {
      const resumed = await actionResumeCatalogPractice(session.id);
      requireEntrySkill(resumed, skill.id);
      accept(
        !resumed.question && !resumed.completedAt
          ? await actionCompleteCatalogPractice(session.id)
          : resumed
      );
    });
  }

  const questionKey = makeQuestionKey(
    session?.id ?? "preview",
    String(shownQuestion?.id ?? previewQuestion?.id)
  );
  return (
    <AnnotationProvider key={session?.id ?? "preview"}>
      <div
        ref={shellRef}
        className="mx-auto min-h-dvh w-full max-w-6xl px-4 pb-24 pt-24 text-ivory sm:px-8"
      >
        <CalculatorScope
          key={questionKey}
          questionKey={questionKey}
          dockTop={LEARN_HEADER_CLEARANCE}
          enabled={skill.subject === "math" && !session?.completedAt}
          open={calculatorOpen}
          onOpenChange={setCalculatorOpen}
        >
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={`/learn/${skill.subject}`}
                className="text-sm text-taupe underline underline-offset-4"
              >
                Back to skills
              </Link>
              <p className="mt-5 text-sm text-taupe">{skill.domainLabel}</p>
              <h1 className="mt-1 text-2xl font-semibold">{skill.label}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CatalogStudyTools
                bookmarks={bookmarks}
                onBookmark={(id) =>
                  setBookmarks((old) => {
                    const next = new Set(old);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                questionId={shownQuestion?.id ?? previewQuestion?.id}
                questions={session ? seen : (availableQuestions ?? [])}
                onJump={(index) => {
                  if (session)
                    setReviewIndex(seen[index]?.id === session.question?.id ? null : index);
                  else setPreviewIndex(index);
                }}
              />
              <CalculatorTrigger />
              <HighlightTool />
              <PracticeTimer startedAt={startedAt.current} />
              <QuizMenu subject={skill.subject} />
              <button
                type="button"
                onClick={() => setScratchpadOpen(true)}
                aria-pressed={scratchpadOpen}
                className="min-h-11 rounded-lg border border-bronze px-3 py-2 text-sm font-semibold"
              >
                Scratchpad
              </button>
            </div>
          </header>
          {error && (
            <p
              role="alert"
              className="mb-6 rounded-xl border border-error p-4 text-sm leading-relaxed"
            >
              {error}
            </p>
          )}
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
                  {pending
                    ? "Loading…"
                    : resumeSessionId
                      ? "Retry loading practice"
                      : "Start practice"}
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
                    This result records this session. It does not establish mastery or predict an
                    SAT score.
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
            ) : reviewIndex !== null && shownQuestion ? (
              <section className="space-y-6 rounded-2xl border border-bronze bg-surface p-5 sm:p-8">
                <CatalogQuestion
                  question={shownQuestion}
                  answer={oldReview?.studentAnswer ?? ""}
                  disabled
                  onAnswer={() => {}}
                />
                {oldReview && <SavedFeedback review={oldReview} />}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setReviewIndex(null)}
                >
                  Return to current question
                </button>
              </section>
            ) : session.question ? (
              <section className="space-y-6 rounded-2xl border border-bronze bg-surface p-5 sm:p-8">
                <p className="text-sm text-taupe">Skill practice</p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                  className="space-y-6"
                >
                  <QuestionTransition index={seen.length}>
                    <div data-question-content>
                      <CatalogQuestion
                        question={session.question}
                        answer={answer}
                        disabled={pending || !!feedback}
                        onAnswer={setAnswer}
                      />
                    </div>
                  </QuestionTransition>
                  {!feedback && (
                    <button
                      type="submit"
                      disabled={pending || !answer.trim()}
                      className="min-h-11 rounded-xl bg-gold px-6 py-3 font-semibold text-night disabled:opacity-50"
                    >
                      {pending ? "Saving…" : "Check answer"}
                    </button>
                  )}
                </form>
                {feedback && (
                  <section role="status" className="space-y-4 border-t border-bronze pt-6">
                    <h2 className="font-semibold">
                      {feedback.isCorrect ? "Correct" : "Incorrect"} · answer saved
                    </h2>
                    <SavedFeedback review={feedback} />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={next}
                      className="min-h-11 rounded-xl bg-gold px-6 py-3 font-semibold text-night disabled:opacity-50"
                    >
                      {pending
                        ? "Loading…"
                        : session.answered + 1 === session.total
                          ? "See results"
                          : "Next question"}
                    </button>
                  </section>
                )}
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
          {session && !session.completedAt && (
            <nav className="my-4 flex gap-3" aria-label="Practice questions">
              <button
                type="button"
                className="btn-secondary"
                disabled={(reviewIndex ?? seen.length - 1) <= 0}
                onClick={() => setReviewIndex((reviewIndex ?? seen.length - 1) - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={(reviewIndex === null && !feedback) || pending}
                onClick={() => {
                  if (reviewIndex !== null) {
                    setReviewIndex(reviewIndex + 1 >= seen.length - 1 ? null : reviewIndex + 1);
                  } else void next();
                }}
              >
                Next
              </button>
            </nav>
          )}
          <Scratchpad
            pageKey={shownQuestion?.id ?? previewQuestion?.id ?? "empty-preview"}
            open={scratchpadOpen}
            onClose={() => setScratchpadOpen(false)}
            constraintsRef={shellRef}
          />
        </CalculatorScope>
      </div>
    </AnnotationProvider>
  );
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
