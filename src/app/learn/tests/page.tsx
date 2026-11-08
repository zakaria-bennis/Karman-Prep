import type { Metadata } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, Num, Panel, PortalShell, Row, SectionHeader } from "@/components/portal";
import { STUDENT_MENU, STUDENT_NAV } from "@/components/dashboard/StudentDashboardClient";
import { loadFlowUser } from "@/components/quiz-flows/load-user";
import { SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import { FULL_LENGTH_FORMS } from "@/lib/assembler/forms";
import { loadQuizAccess } from "@/lib/assembler/plan-gate";
import type { RunResult } from "@/lib/assembler/run-types";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tests and quizzes" };

type Saved = { run_key: string; completed_at: string | null; result: RunResult | null };

/** Full-length practice tests, the diagnostic and the Domain quizzes, with where each stands. */
export default async function TestsPage() {
  const { clerkId, user } = await loadFlowUser("/learn/tests");
  const [access, saved] = await Promise.all([
    loadQuizAccess(clerkId).catch(() => null),
    (createAdminClient() as unknown as SupabaseClient)
      .from("quiz_runs")
      .select("run_key, completed_at, result")
      .eq("student_id", clerkId)
      .in("kind", ["full-test", "diagnostic"])
      .then(({ data }) => (data ?? []) as Saved[]),
  ]);
  const byKey = new Map(saved.map((row) => [row.run_key, row]));
  const status = (key: string, locked: boolean) => {
    const row = byKey.get(key);
    if (row?.completed_at && row.result?.predicted)
      return { right: `${row.result.predicted.total}`, href: true };
    if (row) return { right: "Resume", href: true };
    if (locked) return { right: "Practice plan", href: false };
    return { right: "Start", href: true };
  };
  const freeTestsLeft = access?.fullTestsLeft ?? null;
  return (
    <PortalShell
      portal="Student"
      nav={STUDENT_NAV}
      name={user.name}
      accountDetail={user.email}
      menu={STUDENT_MENU}
      home="/dashboard/student"
      title="Tests and quizzes"
      streak={user.streak ? { days: user.streak, href: "/learn/daily-ten" } : undefined}
    >
      <Panel>
        <Card>
          <SectionHeader title="Full-length practice tests" note={`${FULL_LENGTH_FORMS}`} />
          {Array.from({ length: FULL_LENGTH_FORMS }, (_, i) => i + 1).map((form) => {
            const key = `full-test:${form}`;
            const locked = freeTestsLeft === 0 && !byKey.has(key);
            const st = status(key, locked);
            return (
              <Row
                key={form}
                title={`Practice test ${form}`}
                sub={
                  st.right === "Start" || st.right === "Resume" || locked
                    ? undefined
                    : "Predicted score"
                }
                right={
                  st.right === "Start" || st.right === "Resume" || locked ? (
                    st.right
                  ) : (
                    <Num>{st.right}</Num>
                  )
                }
                href={st.href ? `/learn/test/${form}` : "/billing"}
              />
            );
          })}
        </Card>
        <Card>
          <SectionHeader title="Diagnostic" />
          <Row
            title="Where to start"
            right={status("diagnostic:1", false).right}
            href="/learn/diagnostic"
          />
        </Card>
        {(["reading", "math"] as const).map((subject) => (
          <Card key={subject}>
            <SectionHeader
              title={subject === "math" ? "Math quizzes" : "Reading and Writing quizzes"}
            />
            {SKILL_DOMAINS.filter((d) => d.subject === subject).map((domain) => (
              <Row
                key={domain.id}
                title={domain.label}
                right="12 questions"
                href={`/learn/domain/${domain.id}`}
              />
            ))}
          </Card>
        ))}
      </Panel>
    </PortalShell>
  );
}
