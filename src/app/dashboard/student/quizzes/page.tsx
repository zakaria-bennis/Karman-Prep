import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { fetchAllAttemptsForStudent } from "@/lib/supabase/queries/quiz/attempts";
import { MATH_NODES, RW_NODES } from "@/data/curriculum";
import { Card, Panel, SectionHeader } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import { loadStudentContext } from "@/lib/student/context";
import { loadOwnCatalogPracticeHistory } from "@/lib/catalog-practice/history-server";
import SavedPracticeHistory from "@/components/learn/catalog-practice/SavedPracticeHistory";

export const metadata: Metadata = { title: "Quiz history" };
export const dynamic = "force-dynamic";

export default async function StudentQuizHistoryPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(userId);
  const [ctx, attempts, skillHistory] = await Promise.all([
    loadStudentContext(),
    fetchAllAttemptsForStudent(clerkId),
    loadOwnCatalogPracticeHistory(),
  ]);
  const nodes = new Map([...RW_NODES, ...MATH_NODES].map((node) => [node.id, node]));
  return (
    <StudentPortal ctx={ctx} title="Quiz history">
      <Panel label="Quiz history">
        <p className="kp-meta">Revisit completed practice and see your saved results.</p>
        {attempts.length === 0 &&
          skillHistory.status === "ready" &&
          skillHistory.sessions.length === 0 && (
            <p className="kp-meta">
              No quizzes yet.{" "}
              <Link href="/learn" className="kp-link">
                Choose a skill to start practicing.
              </Link>
            </p>
          )}
        <SavedPracticeHistory history={skillHistory} />
        <Card label="Earlier quizzes">
          <SectionHeader title="Earlier quizzes" />
          {attempts.length === 0 && <p className="kp-meta">No earlier quizzes saved.</p>}
          <ul className="space-y-4">
            {attempts.map((attempt) => {
              const node = nodes.get(attempt.node_id);
              return (
                <li key={attempt.id}>
                  <h3 className="kp-title">{node?.topic ?? "Earlier practice"}</h3>
                  <p className="kp-meta">
                    Attempt {attempt.attempt_number} · Started{" "}
                    {new Date(attempt.started_at).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                      dateStyle: "medium",
                    })}
                  </p>
                  {attempt.completed_at ? (
                    <>
                      <p className="kp-meta">
                        {attempt.score ?? "—"}% · {attempt.questions_correct} of{" "}
                        {attempt.questions_answered} correct
                      </p>
                      <Link
                        href={`/dashboard/student/quizzes/${attempt.id}`}
                        className="kp-link inline-flex min-h-11 items-center"
                      >
                        Review answers
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="kp-meta">In progress · {attempt.questions_answered} answered</p>
                      {node && (
                        <Link
                          href={`/learn/earlier/${node.subject}?resume=${encodeURIComponent(attempt.id)}`}
                          className="kp-link inline-flex min-h-11 items-center"
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
        </Card>
      </Panel>
    </StudentPortal>
  );
}
