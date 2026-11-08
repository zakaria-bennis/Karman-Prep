// /join and /join/[code]: a student adds their tutor's code. Shows where
// they stand (in a group, the tutor's plan ended, or removed) in plain words.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner, Card, MoreLink, Panel, SectionHeader } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import { safeAuth } from "@/lib/auth/dev-auth";
import { loadStudentContext } from "@/lib/student/context";
import { affiliateDeps } from "@/lib/tutor-affiliate/server";
import { getStudentAffiliateStatus } from "@/lib/tutor-affiliate/service";
import JoinForm from "./JoinForm";
import { DismissNoticeButton, LeaveGroupButton } from "./StudentGroupControls";

export default async function JoinPage({ code }: { code: string }) {
  const { userId } = await safeAuth();
  if (!userId) {
    const back = code ? `/join/${encodeURIComponent(code)}` : "/join";
    redirect(`/auth/sign-up?redirect_url=${encodeURIComponent(back)}`);
  }
  const me = await affiliateDeps.store.userByClerkId(userId);
  if (me?.role === "affiliate_tutor") redirect("/tutor");
  if (!me) redirect("/onboarding");
  const ctx = await loadStudentContext();

  const shell = (body: React.ReactNode, banner?: React.ReactNode) => (
    <StudentPortal ctx={ctx} title="Tutor code">
      <Panel banner={banner}>{body}</Panel>
    </StudentPortal>
  );

  if (me.role !== "student") {
    return shell(
      <Card>
        <p className="kp-meta">Tutor codes are for student accounts.</p>
      </Card>
    );
  }

  const status = await getStudentAffiliateStatus(affiliateDeps, userId);

  if (status.state === "active") {
    return shell(
      <Card>
        <SectionHeader title={`You're in ${status.tutorName}'s group`} />
        <p className="kp-meta">
          You have the Practice plan through your tutor. They can see your progress and give you
          homework.
        </p>
        <div className="kp-cta-row">
          <MoreLink href="/dashboard/student">Back to Today</MoreLink>
          <LeaveGroupButton tutorName={status.tutorName} />
        </div>
      </Card>
    );
  }

  if (status.state === "lapsed") {
    return shell(
      <Card>
        <SectionHeader title={`${status.tutorName}'s plan has ended`} />
        <p className="kp-meta">
          So you&apos;re on the Free plan for now. Your work is saved, and Practice comes back if
          your tutor restarts their plan.
        </p>
        <div className="kp-cta-row">
          <Link className="kp-link" href="/pricing">
            See plans
          </Link>
          <LeaveGroupButton tutorName={status.tutorName} />
        </div>
      </Card>
    );
  }

  const banner =
    status.state === "removed" && !status.noticeSeen ? (
      <Banner>
        {status.tutorName} removed you from their group, so you&apos;re on the Free plan now. Your
        work is saved. <DismissNoticeButton linkId={status.linkId} />
      </Banner>
    ) : undefined;

  return shell(<JoinForm initialCode={code} />, banner);
}
