// /tutor/[studentId]/answers: every answer in the student's Mistake Log, for their tutor (founder,
// round 2, 2026-11-22): each sitting, newest first, with every question, the student's answer and the
// right one. Read with the student portal's own loader (src/lib/portal/mistakes.ts).
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, MoreLink, Num, SectionHeader } from "@/components/portal";
import { safeAuth } from "@/lib/auth/dev-auth";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { loadSittings } from "@/lib/portal/mistakes";
import { byClerkId } from "@/lib/portal/tutor-route";
import { between } from "@/lib/portal/progress";
import { dayKey } from "@/lib/student/streak";
import { fetchStudentById } from "@/lib/supabase/queries/tutor";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import "@/components/tutor/student-detail.css";

export const metadata: Metadata = { title: "Every answer" };
export const dynamic = "force-dynamic";

const LETTERS = "ABCDEFGH";
const shown = (choices: string[], i: number) =>
  i >= 0 && i < choices.length ? `${LETTERS[i]}. ${choices[i]}` : "No answer";

export default async function AnswersPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId: raw } = await params;
  const studentId = decodeURIComponent(raw);
  await byClerkId(studentId, "/answers");
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  if (!(await canTutorAccessStudent(clerkId, studentId))) notFound();
  const student = await fetchStudentById(studentId);
  if (!student) notFound();

  const today = dayKey(Date.now());
  const db = createAdminClient() as unknown as SupabaseClient;
  // each sitting's day as days from today (0 today, less than 0 before)
  const sittings = await loadSittings(db, studentId, (at) => -between(dayKey(at), today));
  const dateOf = (d: number) =>
    new Date(Date.parse(`${today}T12:00:00Z`) + d * 86_400_000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  const name =
    [student.first_name, student.last_name].filter(Boolean).join(" ").trim() || student.email;
  const answers = sittings.reduce((n, s) => n + s.asked.length, 0);
  const missed = sittings.reduce((n, s) => n + s.asked.filter((q) => !q.right).length, 0);

  return (
    <Card>
      <SectionHeader
        title="Every answer"
        note={
          <>
            {name}: <Num>{answers}</Num> answers, <Num>{missed}</Num> missed
          </>
        }
      />
      {sittings.length === 0 && <p className="kp-meta">No answers yet.</p>}
      {sittings.map((s, i) => {
        const right = s.asked.filter((q) => q.right).length;
        return (
          <details key={s.id} open={i === 0} className="kp-answers">
            <summary>
              <b>{s.name}</b>{" "}
              <span className="kp-meta">
                {dateOf(s.day)} · {right} of {s.asked.length} right
                {s.score ? ` · scored ${s.score}` : ""}
              </span>
            </summary>
            <ol>
              {s.asked.map((q) => (
                <li key={q.id}>
                  <p>
                    <b>{q.skill}</b> <span className="kp-meta">{q.right ? "Right" : "Missed"}</span>
                    {q.flagged && <span className="kp-meta"> · flagged for you</span>}
                  </p>
                  <p className="kp-meta">{q.sample.prompt.slice(0, 280)}</p>
                  {q.sample.typed ? (
                    <p>
                      Answered {q.sample.typed.given || "nothing"}; right answer{" "}
                      {q.sample.typed.correct}
                    </p>
                  ) : (
                    <p>
                      Answered {shown(q.sample.choices, q.picked)}
                      {!q.right && <>; right answer {shown(q.sample.choices, q.sample.answer)}</>}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </details>
        );
      })}
      <MoreLink href={`/tutor/${encodeURIComponent(studentId)}`}>Back to {name}</MoreLink>
    </Card>
  );
}
