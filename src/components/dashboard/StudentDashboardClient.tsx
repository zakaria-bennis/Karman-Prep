/*
 * The student's Today, in the painted shell (founder decisions 2026-11-07 and 2026-11-08).
 * Order: greeting, the one main action, where to pick up, homework and practice. No score or
 * skills on Today: they live in Progress and the Library. The data comes from the page as before.
 */
import Link from "next/link";
import { Banner, Card, Cta, MoreLink, Num, Panel, Row, SectionHeader } from "@/components/portal";
import JoinButton from "@/components/student-portal/JoinButton";
import StudentPortal, { STUDENT_ROUTES } from "@/components/student-portal/StudentPortal";
import type { LearnDashboardData } from "@/lib/learn/dashboard";
import type { StudentContext } from "@/lib/student/context";

interface Props {
  dashboard: LearnDashboardData;
  diagnostic: { score_range_low: number; score_range_high: number } | null;
  subscription: { status: string; trial_end: string | null } | null;
  showPlacementBanner?: boolean;
  ctx: StudentContext;
  /** Open homework due soonest (null: no tutor can assign work). */
  due?: { key: string; title: string; href: string | null; due: string; late: boolean }[] | null;
  /** The next sessions and live events (null: the plan books nothing). */
  comingUp?:
    | { key: string; title: string; sub: string; when: string; join: string | null }[]
    | null;
  /** The one main button: the Daily 10 until it's done today, then the next assignment. */
  main: { title: string; meta: string; label: string; href: string };
}

export default function StudentDashboardClient({
  dashboard,
  diagnostic,
  subscription,
  showPlacementBanner,
  ctx,
  due = null,
  comingUp = null,
  main,
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
      {due && (
        <Card label="Homework">
          <SectionHeader
            title="Homework"
            note={
              ctx.homeworkOpen ? (
                <>
                  <Num>{ctx.homeworkOpen}</Num> open
                </>
              ) : undefined
            }
          />
          {due.length === 0 ? (
            <p className="kp-meta">Nothing due this week.</p>
          ) : (
            due.map((h) => (
              <Row
                key={h.key}
                title={h.title}
                href={h.href ?? undefined}
                right={h.due}
                rightTone={h.late ? "late" : undefined}
              />
            ))
          )}
          <MoreLink href={STUDENT_ROUTES.homework}>See all homework</MoreLink>
        </Card>
      )}
      {comingUp && comingUp.length > 0 && (
        <Card label="Coming up">
          <SectionHeader title="Coming up" />
          {comingUp.map((c) =>
            c.join ? (
              <div key={c.key} className="kp-row">
                <span>
                  <b>{c.title}</b>
                  <small>
                    {c.sub} · {c.when}
                  </small>
                </span>
                <JoinButton href={c.join} what={c.title} />
              </div>
            ) : (
              <Row
                key={c.key}
                title={c.title}
                sub={c.sub}
                href={STUDENT_ROUTES.calendar}
                right={c.when}
              />
            )
          )}
        </Card>
      )}
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
          <h2 className="kp-title" id="today-main">
            {main.title}
          </h2>
          <p className="kp-meta">{main.meta}</p>
          <Cta href={main.href}>{main.label}</Cta>
          {next && next.href !== main.href && (
            <MoreLink href={next.href}>
              {next.label}: {next.title}
            </MoreLink>
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
