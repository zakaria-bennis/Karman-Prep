import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { fetchAllAttemptsForStudent } from "@/lib/supabase/queries/quiz/attempts";
import { MATH_NODES, RW_NODES } from "@/data/curriculum";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export const metadata: Metadata = { title: "Quiz history" };
export const dynamic = "force-dynamic";

export default async function StudentQuizHistoryPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(userId);
  const attempts = await fetchAllAttemptsForStudent(clerkId);
  const nodes = new Map([...RW_NODES, ...MATH_NODES].map((node) => [node.id, node]));
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-semibold text-ivory">Quiz history</h1>
        <p className="mt-2 text-sm text-taupe">
          Revisit completed practice and see your saved results.
        </p>
        {attempts.length === 0 && (
          <p className="mt-6 rounded-xl border border-bronze bg-surface p-5 text-taupe">
            No quizzes yet.{" "}
            <Link href="/learn" className="underline">
              Choose a skill to start practicing.
            </Link>
          </p>
        )}
        <ul className="mt-6 space-y-3">
          {attempts.map((attempt) => {
            const node = nodes.get(attempt.node_id);
            return (
              <li key={attempt.id} className="rounded-xl border border-bronze bg-surface p-5">
                <h2 className="font-semibold text-ivory">{node?.topic ?? "Earlier practice"}</h2>
                <p className="mt-1 text-sm text-taupe">
                  Attempt {attempt.attempt_number} · Started{" "}
                  {new Date(attempt.started_at).toLocaleDateString("en-US", {
                    timeZone: "UTC",
                    dateStyle: "medium",
                  })}
                </p>
                {attempt.completed_at ? (
                  <>
                    <p className="mt-2 text-sm text-taupe">
                      {attempt.score ?? "—"}% · {attempt.questions_correct} of{" "}
                      {attempt.questions_answered} correct
                    </p>
                    <Link
                      href={`/dashboard/student/quizzes/${attempt.id}`}
                      className="mt-3 inline-flex min-h-11 items-center text-sm text-info underline underline-offset-4"
                    >
                      Review answers
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-taupe">
                      In progress · {attempt.questions_answered} answered
                    </p>
                    {node && (
                      <Link
                        href={`/learn/earlier/${node.subject}`}
                        className="mt-3 inline-flex min-h-11 items-center text-sm text-info underline underline-offset-4"
                      >
                        Continue in practice
                      </Link>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </DashboardLayout>
  );
}
