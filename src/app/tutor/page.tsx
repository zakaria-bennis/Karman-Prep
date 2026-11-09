// ============================================================
// /tutor — Tutor's home.
// Shows the cohorts this tutor leads up top, then the full
// student roster scoped to just the tutor's students (cohort
// members + 1:1 assignments). Admins see the same scoped view
// for whichever user they're impersonating; when an admin
// views as themselves (their own user), they'll naturally
// see any cohorts/assignments tied to their user row — which
// for most admins is none.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";
import { Banner, Card, MoreLink, Num, Ring, Row, SectionHeader } from "@/components/portal";
import { fetchTutorScope, fetchStudentDashboardRows } from "@/lib/supabase/queries/tutor";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";
import { getCalConnectionStatus } from "@/lib/supabase/queries/cal-oauth";
import StudentTable from "@/components/tutor/StudentTable";
import {
  cohortTopicEmptyMessage,
  cohortTopicPresentation,
} from "@/lib/learning-plan/cohort-presentation";
import { tierLabel } from "@/lib/scheduling/tiers";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { fetchUserNameAndEmail } from "@/lib/tutor-affiliate/profile";
import AffiliateHome from "@/components/tutor-affiliate/AffiliateHome";

export const metadata: Metadata = { title: "Your students" };
export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId, isImpersonating } = await resolveEffectiveClerkId(realUserId);

  if ((await fetchUserRole(userId)) === "affiliate_tutor") {
    const me = await fetchUserNameAndEmail(userId);
    return (
      <AffiliateHome
        clerkId={userId}
        firstName={me.firstName}
        email={me.email}
        readOnly={isImpersonating}
      />
    );
  }

  const scope = await fetchTutorScope(userId);
  const rows = await fetchStudentDashboardRows(scope.studentClerkIds);

  // Cal connection status drives the "Connect Cal" banner. We only show it
  // for tutors that actually have students — a brand-new tutor with no
  // assigned students doesn't need to act yet.
  const tutorUuid = await getUserUuidByClerkId(userId);
  const calStatus = tutorUuid ? await getCalConnectionStatus(tutorUuid) : null;
  const hasStudents = rows.length > 0;
  const needsCalSetup =
    hasStudents && calStatus !== null && (!calStatus.connected || !calStatus.eventTypeId);

  return (
    <>
      {needsCalSetup ? (
        <Banner>
          {!calStatus.connected
            ? "Connect Cal.com so your students can book sessions with you."
            : calStatus.needsEventTypePick
              ? "Pick which of your Cal.com event types is the Karman session."
              : "Finish setting up your booking link."}{" "}
          <Link className="kp-link" href="/tutor/settings/booking">
            {!calStatus.connected ? "Connect Cal.com" : "Pick the event type"}
          </Link>
        </Banner>
      ) : null}

      <Card>
        <SectionHeader
          title="Your cohorts"
          note={`${scope.cohorts.length} ${scope.cohorts.length === 1 ? "cohort" : "cohorts"}`}
        />
        {scope.cohorts.length === 0 ? (
          <p className="kp-meta">No cohorts yet. An admin assigns cohorts from Admin, Cohorts.</p>
        ) : (
          scope.cohorts.map((c) => {
            const topic = cohortTopicPresentation(c.status, c.current_topic);
            return (
              <Row
                key={c.id}
                href={`/tutor/cohort/${c.id}`}
                leading={
                  <Ring
                    value={c.max_size > 0 ? c.member_count / c.max_size : 0}
                    size={40}
                    width={5}
                    label={`${c.member_count} of ${c.max_size} seats filled`}
                  >
                    <Num>{c.member_count}</Num>
                  </Ring>
                }
                title={c.name}
                sub={`${tierLabel(c.tier)}, ${STATUS_LABEL[c.status]}, SAT ${formatDate(c.sat_date)}. ${
                  topic ? `${topic.label}: ${topic.topic}` : cohortTopicEmptyMessage(c.status)
                }`}
                right={
                  <>
                    <Num>{c.homework_count}</Num> homework
                  </>
                }
              />
            );
          })
        )}
      </Card>

      <Card>
        <SectionHeader
          title="Your students"
          note={`${rows.length} across cohorts and private tutoring`}
        />
        <StudentTable
          rows={rows}
          cohorts={scope.cohorts.map((c) => ({ id: c.id, name: c.name, tier: c.tier }))}
        />
        <MoreLink href="/tutor/briefing">Open today&apos;s briefing</MoreLink>
      </Card>
    </>
  );
}

const STATUS_LABEL: Record<"forming" | "active" | "completed", string> = {
  forming: "forming",
  active: "running",
  completed: "finished",
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
