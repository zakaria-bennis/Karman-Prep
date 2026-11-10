import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { fetchCompletedQuizReview } from "@/lib/quiz-review";
import { toQuizReviewContent } from "@/lib/quiz-review-content";
import { RW_NODES, MATH_NODES } from "@/data/curriculum";
import { Card, Panel } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import { loadStudentContext } from "@/lib/student/context";
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
  const [ctx, review] = await Promise.all([
    loadStudentContext(),
    fetchCompletedQuizReview(clerkId, attemptId),
  ]);
  if (!review) notFound();
  const { attempt, items } = review;
  const node = [...RW_NODES, ...MATH_NODES].find((entry) => entry.id === attempt.node_id);
  return (
    <StudentPortal ctx={ctx} title={`${node?.topic ?? "Earlier practice"}: quiz review`}>
      <Panel label="Quiz review">
        <Link
          href="/dashboard/student/quizzes"
          className="kp-link inline-flex min-h-11 items-center"
        >
          Back to quiz history
        </Link>
        <p className="kp-meta">
          Saved score: {attempt.score ?? "—"}% · {attempt.questions_correct} of{" "}
          {attempt.questions_answered} correct
        </p>
        <p className="kp-meta">
          Your answers and results are saved from this attempt. Questions and explanations below
          show the currently reviewed version and may have changed since you answered.
        </p>
        {items.length === 0 && (
          <p className="kp-meta">Individual answers are unavailable for this earlier attempt.</p>
        )}
        <ol className="space-y-4">
          {items.map(({ response, question }) => (
            <li key={response.id} className="min-w-0">
              <Card>
                <h2 className="kp-title">
                  Saved response —{" "}
                  {response.is_correct ? "Correct when answered" : "Incorrect when answered"}
                </h2>
                <div className="kp-meta">
                  Saved answer: <MathText text={response.student_answer} />
                </div>
                {question ? (
                  <QuizReviewQuestion question={toQuizReviewContent(question)} />
                ) : (
                  <p className="kp-meta">
                    This question is no longer available for review. Your saved result is unchanged.
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ol>
      </Panel>
    </StudentPortal>
  );
}
