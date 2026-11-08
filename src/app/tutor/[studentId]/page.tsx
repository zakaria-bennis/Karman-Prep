// ============================================================
// /tutor/[studentId] — Student detail with 4 tabs:
//   Skills Overview · Tutor Controls · Flagged · Quiz History
// ============================================================

import type { Metadata } from "next";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect, notFound } from "next/navigation";
import { Card, MoreLink, Num, Ring, SectionHeader } from "@/components/portal";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { getTimingAccommodation } from "@/lib/supabase/queries/quiz/saved";
import { TimingAccommodationControl } from "@/components/tutor/TimingAccommodationControl";
import { fetchStudentById, fetchNodeStatuses } from "@/lib/supabase/queries/tutor";
import {
  fetchAllAttemptsForStudent,
  fetchFlaggedQuestionsForStudent,
  fetchResponsesForAttempt,
} from "@/lib/supabase/queries/quiz";
import { RW_NODES, MATH_NODES, currentAtmosphere } from "@/data/curriculum";
import StudentDetailTabs from "@/components/tutor/StudentDetailTabs";
import AffiliateStudent from "@/components/tutor-affiliate/AffiliateStudent";
import { fetchUserNameAndEmail } from "@/lib/tutor-affiliate/profile";

export const metadata: Metadata = { title: "Student" };

interface Params {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function StudentDetailPage({ params, searchParams }: Params) {
  const [{ studentId }, { tab: tabParam }] = await Promise.all([params, searchParams]);

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

  const [statuses, attempts, flagged, timing] = await Promise.all([
    fetchNodeStatuses(studentId),
    fetchAllAttemptsForStudent(studentId),
    fetchFlaggedQuestionsForStudent(studentId),
    getTimingAccommodation(studentId),
  ]);

  // Preload per-attempt responses (expandable in Quiz History tab) — first 20 only for perf
  const responsesByAttempt: Record<
    string,
    Awaited<ReturnType<typeof fetchResponsesForAttempt>>
  > = {};
  for (const a of attempts.slice(0, 20)) {
    responsesByAttempt[a.id] = await fetchResponsesForAttempt(a.id);
  }

  // Summary stats
  const statusMap = new Map(statuses.map((s) => [s.node_id, s]));
  const readingMastered = RW_NODES.filter((n) => statusMap.get(n.id)?.status === "mastered").length;
  const mathMastered = MATH_NODES.filter((n) => statusMap.get(n.id)?.status === "mastered").length;
  const tiersDone =
    (RW_NODES.filter((n) => n.tier === 1).every(
      (n) => statusMap.get(n.id)?.status === "mastered"
    ) &&
    MATH_NODES.filter((n) => n.tier === 1).every((n) => statusMap.get(n.id)?.status === "mastered")
      ? 1
      : 0) +
    (RW_NODES.filter((n) => n.tier === 2).every(
      (n) => statusMap.get(n.id)?.status === "mastered"
    ) &&
    MATH_NODES.filter((n) => n.tier === 2).every((n) => statusMap.get(n.id)?.status === "mastered")
      ? 1
      : 0) +
    (RW_NODES.filter((n) => n.tier === 3).every(
      (n) => statusMap.get(n.id)?.status === "mastered"
    ) &&
    MATH_NODES.filter((n) => n.tier === 3).every((n) => statusMap.get(n.id)?.status === "mastered")
      ? 1
      : 0);
  const atmo = currentAtmosphere(tiersDone);

  const completedAttempts = attempts.filter((a) => a.score !== null);
  const avgScore = completedAttempts.length
    ? Math.round(
        completedAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / completedAttempts.length
      )
    : null;
  const lastActive =
    statuses
      .map((s) => s.updated_at)
      .sort()
      .reverse()[0] ?? null;

  const activeTab = (tabParam ?? "skills") as "skills" | "controls" | "flagged" | "quiz";

  const name =
    [student.first_name, student.last_name].filter(Boolean).join(" ").trim() || student.email;

  return (
    <>
      <Card>
        <SectionHeader title={name} note={atmo} />
        {name !== student.email && <p className="kp-meta">{student.email}</p>}
        <div className="kp-staff-rings">
          <CourseRing label="Reading and Writing" mastered={readingMastered} total={50} />
          <CourseRing label="Math" mastered={mathMastered} total={50} />
          {avgScore !== null && (
            <div className="kp-staff-ringcell">
              <Ring value={avgScore / 100} label={`Average quiz score ${avgScore}%`}>
                <Num>{avgScore}%</Num>
              </Ring>
              <span>Average quiz score</span>
            </div>
          )}
        </div>
        {lastActive && (
          <p className="kp-meta">Last active {new Date(lastActive).toLocaleString()}</p>
        )}
        <TimingAccommodationControl studentClerkId={studentId} value={timing} />
        <p>
          <MoreLink href={`/tutor/${encodeURIComponent(studentId)}/briefing`}>
            Saved practice briefing
          </MoreLink>{" "}
          <MoreLink href="/tutor">All students</MoreLink>
        </p>
      </Card>

      <Card>
        <StudentDetailTabs
          studentId={studentId}
          statuses={statuses}
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
  mastered,
  total,
}: {
  label: string;
  mastered: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  return (
    <div className="kp-staff-ringcell">
      <Ring value={pct / 100} label={`${label}: ${mastered} of ${total} skills mastered`}>
        <Num>{pct}%</Num>
      </Ring>
      <span>
        {label}
        <br />
        <small className="kp-meta">
          <Num>{mastered}</Num> of <Num>{total}</Num> mastered
        </small>
      </span>
    </div>
  );
}
