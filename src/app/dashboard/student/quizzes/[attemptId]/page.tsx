import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { fetchCompletedQuizReview } from "@/lib/quiz-review";
import { toQuizReviewContent } from "@/lib/quiz-review-content";
import { RW_NODES, MATH_NODES } from "@/data/curriculum";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import QuizReviewQuestion from "@/components/learn/QuizReviewQuestion";
import MathText from "@/components/learn/MathText";

export const metadata: Metadata = { title: "Review quiz" };
export const dynamic = "force-dynamic";

export default async function StudentQuizReviewPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(userId);
  const { attemptId } = await params;
  const review = await fetchCompletedQuizReview(clerkId, attemptId);
  if (!review) notFound();
  const { attempt, items } = review;
  const node = [...RW_NODES, ...MATH_NODES].find((entry) => entry.id === attempt.node_id);
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link
          href="/dashboard/student/quizzes"
          className="inline-flex min-h-11 items-center text-sm text-info underline underline-offset-4"
        >
          Back to quiz history
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-ivory">
          {node?.topic ?? "Earlier practice"} — quiz review
        </h1>
        <p className="mt-2 text-taupe">
          Saved score: {attempt.score ?? "—"}% · {attempt.questions_correct} of{" "}
          {attempt.questions_answered} correct
        </p>
        <p className="mt-3 text-sm leading-relaxed text-taupe">
          Your answers and results are saved from this attempt. Questions and explanations below
          show the currently reviewed version and may have changed since you answered.
        </p>
        {items.length === 0 && (
          <p className="mt-6 text-taupe">
            Individual answers are unavailable for this earlier attempt.
          </p>
        )}
        <ol className="mt-6 space-y-4">
          {items.map(({ response, question }, index) => (
            <li
              key={response.id}
              className="min-w-0 rounded-xl border border-bronze bg-surface p-4 sm:p-6"
            >
              <h2 className="font-semibold text-ivory">
                Question {index + 1} —{" "}
                {response.is_correct ? "Correct when answered" : "Incorrect when answered"}
              </h2>
              <div className="mt-2 text-sm text-taupe">
                Saved answer: <MathText text={response.student_answer} />
              </div>
              {question ? (
                <QuizReviewQuestion question={toQuizReviewContent(question)} />
              ) : (
                <p className="mt-4 text-sm text-taupe">
                  This question is no longer available for review. Your saved result is unchanged.
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </DashboardLayout>
  );
}
