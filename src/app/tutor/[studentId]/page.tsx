// ============================================================
// /tutor/[studentId] — Student detail: their progress on the 72
//   skills, then two tabs: Flagged · Quiz History
// ============================================================

import type { Metadata } from "next";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect, notFound } from "next/navigation";
import { Card, Cta, MoreLink, Num, Ring, SectionHeader } from "@/components/portal";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { getTimingAccommodation } from "@/lib/supabase/queries/quiz/saved";
import { TimingAccommodationControl } from "@/components/tutor/TimingAccommodationControl";
import { fetchStudentById } from "@/lib/supabase/queries/tutor";
import {
  fetchAllAttemptsForStudent,
  fetchFlaggedQuestionsForStudent,
  fetchResponsesForAttempt,
} from "@/lib/supabase/queries/quiz";
import StudentDetailTabs from "@/components/tutor/StudentDetailTabs";
import AffiliateStudent from "@/components/tutor-affiliate/AffiliateStudent";
import { fetchUserNameAndEmail } from "@/lib/tutor-affiliate/profile";
import { when } from "@/components/messages/Thread";
import { ActionMessage } from "@/components/school/SchoolShell";
import { recentParentNotes } from "@/lib/parent/messages";
import { postFamilyNoteAction } from "./actions";
import { StudentKarman } from "@/components/tutor/StudentKarman";
import { weekSet } from "@/lib/portal/review-sets";
import { loadStudentSummary } from "@/lib/portal/student-summary";
import { dayKey } from "@/lib/student/streak";
import { byClerkId } from "@/lib/portal/tutor-route";
import { SKILLS, type Section } from "@/app/dashboard/student/_portal/skills72";
import "@/components/portal-extras/forms.css";

export const metadata: Metadata = { title: "Student" };

interface Params {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ tab?: string; done?: string; error?: string }>;
}

export default async function StudentDetailPage({ params, searchParams }: Params) {
  const [{ studentId }, { tab: tabParam, done, error }] = await Promise.all([params, searchParams]);
  await byClerkId(studentId);

  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId, isImpersonating } = await resolveEffectiveClerkId(realUserId);

  const role = await fetchUserRole(userId);
  if (role === "affiliate_tutor") {
    const me = await fetchUserNameAndEmail(userId);
    return (
      <AffiliateStudent
        actorClerkId={userId}
        studentClerkId={decodeURIComponent(studentId)}
        tutorFirstName={me.firstName}
        tutorEmail={me.email}
        readOnly={isImpersonating}
      />
    );
  }
  if (role !== "tutor" && role !== "admin") redirect("/dashboard/student");

  if (!(await canTutorAccessStudent(userId, studentId))) notFound();

  const student = await fetchStudentById(studentId);
  if (!student) notFound();

  const [attempts, flagged, timing, familyNotes, summary] = await Promise.all([
    fetchAllAttemptsForStudent(studentId),
    fetchFlaggedQuestionsForStudent(studentId),
    getTimingAccommodation(studentId),
    recentParentNotes(student.id),
    loadStudentSummary(studentId).catch(() => null),
  ]);
  // this week's curated review set: the tutor (or an admin) is this student's teacher here
  const reviewSet = summary
    ? await weekSet(
        { clerkId: studentId, planId: summary.data.planId, hasTutor: true },
        dayKey(Date.now())
      ).catch(() => null)
    : null;

  // Preload per-attempt responses (expandable in Quiz History tab) — first 20 only for perf
  const responsesByAttempt: Record<
    string,
    Awaited<ReturnType<typeof fetchResponsesForAttempt>>
  > = {};
  for (const a of attempts.slice(0, 20)) {
    responsesByAttempt[a.id] = await fetchResponsesForAttempt(a.id);
  }

  // Summary stats
  // the 72 skills, Proficient as the student portal's Library counts them (34 RW, 38 Math)
  const proficient = (section: Section) => {
    const names = SKILLS[section].flatMap((d) => d.skills.map((k) => k.name));
    return {
      done: names.filter((n) => summary?.data.skills[n]?.level === 3).length,
      total: names.length,
    };
  };
  const reading = proficient("Reading and Writing");
  const math = proficient("Math");

  const completedAttempts = attempts.filter((a) => a.score !== null);
  const avgScore = completedAttempts.length
    ? Math.round(
        completedAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / completedAttempts.length
      )
    : null;
  const activeTab: "flagged" | "quiz" = tabParam === "quiz" ? "quiz" : "flagged";

  const name =
    [student.first_name, student.last_name].filter(Boolean).join(" ").trim() || student.email;

  return (
    <>
      <Card>
        <SectionHeader title={name} />
        {name !== student.email && <p className="kp-meta">{student.email}</p>}
        <div className="kp-staff-rings">
          <CourseRing label="Reading and Writing" proficient={reading.done} total={reading.total} />
          <CourseRing label="Math" proficient={math.done} total={math.total} />
          {avgScore !== null && (
            <div className="kp-staff-ringcell">
              <Ring value={avgScore / 100} label={`Average quiz score ${avgScore}%`}>
                <Num>{avgScore}%</Num>
              </Ring>
              <span>Average quiz score</span>
            </div>
          )}
        </div>
        <TimingAccommodationControl studentClerkId={studentId} value={timing} />
        <div className="kp-staff-links">
          <MoreLink href={`/tutor/${encodeURIComponent(studentId)}/briefing`}>
            Saved practice briefing
          </MoreLink>
          <MoreLink href="/tutor">All students</MoreLink>
        </div>
      </Card>

      {summary && (
        <StudentKarman
          summary={summary}
          set={reviewSet}
          studentClerkId={studentId}
          firstName={student.first_name?.trim() || "your student"}
        />
      )}

      <Card label="Family note" id="family-note">
        <SectionHeader title="Family note" note="they see it in Messages" />
        <ActionMessage done={done} error={error} />
        <form action={postFamilyNoteAction} className="kp-form">
          <input type="hidden" name="studentClerkId" value={studentId} />
          <label className="kp-field">
            <span>After today&rsquo;s session</span>
            <textarea
              name="body"
              className="kp-input kp-textarea"
              maxLength={4000}
              required
              placeholder="What you worked on, how it went, and what to practice before next time."
            />
          </label>
          <div className="kp-actions-row">
            <Cta type="submit">Share with the family</Cta>
            <span className="kp-meta">No email goes out.</span>
          </div>
        </form>
        {familyNotes.length > 0 && (
          <ul className="kp-notes">
            {familyNotes.map((n) => (
              <li key={n.id}>
                <div className="kp-note-head">
                  <b>{n.from ?? "A tutor"}</b>
                  <time dateTime={n.at}>{when(n.at)}</time>
                </div>
                <p className="kp-note-body">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <StudentDetailTabs
          studentId={studentId}
          attempts={attempts}
          flagged={flagged}
          responsesByAttempt={responsesByAttempt}
          activeTab={activeTab}
        />
      </Card>
    </>
  );
}

function CourseRing({
  label,
  proficient,
  total,
}: {
  label: string;
  proficient: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((proficient / total) * 100) : 0;
  return (
    <div className="kp-staff-ringcell">
      <Ring value={pct / 100} label={`${label}: ${proficient} of ${total} skills Proficient`}>
        <Num>{pct}%</Num>
      </Ring>
      <span>
        {label}
        <br />
        <small className="kp-meta">
          <Num>{proficient}</Num> of <Num>{total}</Num> Proficient
        </small>
      </span>
    </div>
  );
}
