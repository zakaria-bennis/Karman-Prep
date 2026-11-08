/*
 * The student's Today, in the painted shell (founder decisions 2026-11-07 and 2026-11-08).
 * Order: greeting, the one main action, where to pick up, homework and practice. No score or
 * skills on Today: they live in Progress and the Library. The data comes from the page as before.
 */
import Link from "next/link";
import { Banner, Card, Cta, MoreLink, Num, Panel, Row, SectionHeader } from "@/components/portal";
import StudentPortal, { STUDENT_ROUTES } from "@/components/student-portal/StudentPortal";
import type { LearnDashboardData } from "@/lib/learn/dashboard";
import type { StudentContext } from "@/lib/student/context";

interface Props {
  dashboard: LearnDashboardData;
  diagnostic: { score_range_low: number; score_range_high: number } | null;
  subscription: { status: string; trial_end: string | null } | null;
  showPlacementBanner?: boolean;
  ctx: StudentContext;
}

export default function StudentDashboardClient({
  dashboard,
  diagnostic,
  subscription,
  showPlacementBanner,
  ctx,
}: Props) {
  const trialEnds =
    subscription?.status === "trialing" && subscription.trial_end
      ? new Date(subscription.trial_end).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : null;
  const next = dashboard.next;
  const review = dashboard.review;

  const banner =
    showPlacementBanner || trialEnds ? (
      <Banner>
        <div>
          {showPlacementBanner ? (
            <>
              <b>We&rsquo;re matching you with a tutor</b>
              <span style={{ display: "block", color: "var(--mute)", fontSize: 14 }}>
                Your answers are saved. Practice in the Library while we place you.
              </span>
            </>
          ) : (
            <>
              <b>Your trial ends {trialEnds}</b>
              <span style={{ display: "block", color: "var(--mute)", fontSize: 14 }}>
                Your card is charged automatically then.{" "}
                <Link className="kp-link" href="/billing">
                  Manage plan
                </Link>
              </span>
            </>
          )}
        </div>
      </Banner>
    ) : null;

  const side = (
    <>
      <Card>
        <SectionHeader title="Practice" />
        <Row
          title="SAT Reading and Writing"
          href={`${STUDENT_ROUTES.library}/reading-writing`}
          right="Open"
        />
        <Row title="SAT Math" href={`${STUDENT_ROUTES.library}/math`} right="Open" />
        {!diagnostic && <Row title="Diagnostic test" href="/diagnostic" right="Take it" />}
      </Card>
      <Card>
        <SectionHeader title="Earlier lessons" />
        {dashboard.subjects.map((s) => (
          <Row
            key={s.subject}
            title={s.subject === "reading" ? "Reading and Writing" : "Math"}
            sub={
              s.savedLessons === 0 ? (
                "Nothing saved yet"
              ) : (
                <>
                  <Num>{s.savedLessons}</Num> with saved work
                </>
              )
            }
            href={`/learn/earlier/${s.subject}`}
          />
        ))}
        <MoreLink href="/learn/history">Learning history</MoreLink>
      </Card>
    </>
  );

  return (
    <StudentPortal ctx={ctx}>
      <Panel banner={banner} side={side}>
        <section aria-labelledby="today-main">
          {next ? (
            <>
              <h2 className="kp-title" id="today-main">
                {next.title}
              </h2>
              <p className="kp-meta">{next.detail}</p>
              <Cta href={next.href}>{next.label}</Cta>
            </>
          ) : (
            <>
              <h2 className="kp-title" id="today-main">
                Daily practice
              </h2>
              <p className="kp-meta">Today&rsquo;s challenge questions and word lab</p>
              <Cta href="/learn/daily">Open daily practice</Cta>
            </>
          )}
        </section>
        {dashboard.skillHistoryStatus === "unavailable" && (
          <p role="status" className="kp-meta">
            Saved skill practice could not load. Your answers are still saved; refresh to try again.
          </p>
        )}
        {dashboard.skillHistoryStatus === "preview" && (
          <p role="status" className="kp-meta">
            Saved skill practice shows in the student&rsquo;s own account.
          </p>
        )}
        <Card>
          <SectionHeader title="Take another look" />
          {review ? (
            <Row
              title={review.title}
              sub={
                review.resultUnavailable
                  ? "Saved result unavailable"
                  : review.incorrect === null
                    ? "Saved skill practice to review"
                    : `${review.incorrect} ${review.incorrect === 1 ? "answer" : "answers"} to review`
              }
              href={review.href}
              right="Review"
            />
          ) : (
            <p className="kp-meta">
              Nothing to review yet. Missed questions from your practice land here.
            </p>
          )}
          <MoreLink href="/dashboard/student/quizzes">Quiz history</MoreLink>
        </Card>
      </Panel>
    </StudentPortal>
  );
}
