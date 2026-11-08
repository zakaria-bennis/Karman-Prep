/*
 * Settings, "Have a code from your tutor?". A tutor on Karman's tutor plan ($199 a month) gives
 * each student a code; up to 50 students who enter it get the Practice plan free while the
 * tutor's plan is on, and the tutor can see their progress and set homework. Once in a group,
 * this shows the group and a way to leave it. The tutor's shared link (/join/CODE) uses the same
 * form.
 */
import Link from "next/link";
import { Card, SectionHeader } from "@/components/portal";
import JoinForm from "@/components/tutor-affiliate/JoinForm";
import { LeaveGroupButton } from "@/components/tutor-affiliate/StudentGroupControls";
import { affiliateDeps } from "@/lib/tutor-affiliate/server";
import { getStudentAffiliateStatus } from "@/lib/tutor-affiliate/service";

const ID = "tutor-code";
const TITLE = "Have a code from your tutor?";

export default async function TutorCode({
  clerkId,
  locked,
}: {
  clerkId: string;
  /** An admin previewing the student: show where they stand, change nothing. */
  locked: boolean;
}) {
  const status = await getStudentAffiliateStatus(affiliateDeps, clerkId).catch(
    () => ({ state: "none" }) as const
  );

  if (status.state === "active" || status.state === "lapsed") {
    return (
      <Card id={ID}>
        <SectionHeader title={`Your tutor: ${status.tutorName}`} />
        <p className="kp-meta">
          {status.state === "active"
            ? "You have the Practice plan through your tutor. They can see your progress and give you homework."
            : "Their plan has ended, so you're on the Free plan for now. Practice comes back if they restart it."}
        </p>
        {status.state === "lapsed" && (
          <p className="kp-meta">
            <Link className="kp-link" href="/pricing">
              See plans
            </Link>
          </p>
        )}
        {!locked && <LeaveGroupButton tutorName={status.tutorName} />}
      </Card>
    );
  }

  if (locked) {
    return (
      <Card id={ID}>
        <SectionHeader title={TITLE} />
        <p className="kp-meta">This student isn&rsquo;t in a tutor&rsquo;s group.</p>
      </Card>
    );
  }

  return (
    <JoinForm
      id={ID}
      initialCode=""
      title={TITLE}
      note="Enter it here. You get the Practice plan free while your tutor's Karman plan is on."
    />
  );
}
