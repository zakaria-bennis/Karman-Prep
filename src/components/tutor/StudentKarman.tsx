// The top of a tutor's student page (founder, round 2, 2026-11-22): the last exam's score change and
// its Reinforce skills first, then the weakest skills (dropped or stalled), this week's curated review
// set with one tap to send it, and a way into every answer in the student's Mistake Log. Read with the
// student portal's own loader (src/lib/portal/student-summary.ts). Server component; the page has
// already checked this tutor may see the student.
import { Card, MoreLink, Num, Row, SectionHeader } from "@/components/portal";
import { LEVEL_NAMES } from "@/lib/play/mastery";
import type { ReviewSet } from "@/lib/portal/review-sets";
import type { StudentSummary } from "@/lib/portal/student-summary";
import { SendReviewSet } from "./SendReviewSet";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function StudentKarman({
  summary,
  set,
  studentClerkId,
  firstName,
}: {
  summary: StudentSummary;
  set: ReviewSet | null;
  studentClerkId: string;
  firstName: string;
}) {
  const { lastExam, weakest, data } = summary;
  return (
    <>
      <Card label="Last exam">
        <SectionHeader title="Last exam" note={lastExam ? day(lastExam.completedAt) : undefined} />
        {lastExam ? (
          <>
            <p className="kp-title">
              <Num>{lastExam.total}</Num>
              {lastExam.change !== null && (
                <span className="kp-meta">
                  {" "}
                  {lastExam.change >= 0 ? `up ${lastExam.change}` : `down ${-lastExam.change}`} on
                  the exam before
                </span>
              )}
            </p>
            <h3 className="kp-meta">Reinforce</h3>
            {lastExam.reinforce.slice(0, 3).map((s) => (
              <Row key={s.skillId} title={s.name} right={`${s.missed} of ${s.total} missed`} />
            ))}
            {lastExam.reinforce.length > 3 && (
              <details>
                <summary className="kp-meta">See all {lastExam.reinforce.length}</summary>
                {lastExam.reinforce.slice(3).map((s) => (
                  <Row key={s.skillId} title={s.name} right={`${s.missed} of ${s.total} missed`} />
                ))}
              </details>
            )}
          </>
        ) : (
          <p className="kp-meta">No full-length exam yet.</p>
        )}
      </Card>

      <Card label="Weakest skills">
        <SectionHeader title="Weakest skills" note="dropped or stalled" />
        {weakest.length ? (
          weakest.map((w) => (
            <Row
              key={w.skill}
              title={w.skill}
              sub={`${w.reason} · ${LEVEL_NAMES[data.skills[w.skill]?.level ?? 0]}`}
              right={
                w.before !== null ? `${w.before}% to ${w.recent}% right` : `${w.recent}% right`
              }
              rightTone="late"
            />
          ))
        ) : (
          <p className="kp-meta">Nothing has dropped or stalled.</p>
        )}
      </Card>

      <Card label="Review set">
        <SectionHeader
          title="Review set"
          note={set ? `due ${day(`${set.dueOn}T12:00:00Z`)}` : undefined}
        />
        {set ? (
          <>
            <p className="kp-meta">
              <Num>{set.size}</Num> questions on {set.skills.join(", ")}.
            </p>
            {set.status === "sent" ? (
              <p className="kp-meta">Sent to {firstName}&rsquo;s Homework.</p>
            ) : (
              <SendReviewSet setId={set.id} studentClerkId={studentClerkId} firstName={firstName} />
            )}
          </>
        ) : (
          <p className="kp-meta">Nothing is due for review this week.</p>
        )}
        <MoreLink href={`/tutor/${encodeURIComponent(studentClerkId)}/answers`}>
          Every answer in {firstName}&rsquo;s Mistake Log
        </MoreLink>
      </Card>
    </>
  );
}
