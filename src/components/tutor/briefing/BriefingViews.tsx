// The tutor's briefings, in the portal's look (student-detail.css and the portal forms), like the
// student and parent portals: one sub-card per session or saved practice inside the page's Card, a ring
// for how much of each practice was answered, and text links for every action.
import Link from "next/link";
import "../student-detail.css";
import "@/components/portal-extras/forms.css";
import { MoreLink, Num } from "@/components/portal/primitives";
import { Ring } from "@/components/portal/Ring";
import MathText from "@/components/learn/MathText";
import type { DailyBriefing } from "@/lib/educator-briefing/daily";
import type { readStudentBriefing } from "@/lib/educator-briefing/server";

export function BriefingUnavailable() {
  return (
    <p role="status" className="kp-st-empty">
      The briefing is unavailable right now. No saved work has been changed. Reload this page to try
      again.
    </p>
  );
}

export function DailyBriefingView({ briefing }: { briefing: DailyBriefing }) {
  if (!briefing.timeZone)
    return (
      <p role="status" className="kp-st-empty">
        Your account timezone is unavailable, so a calendar-day briefing cannot be shown.{" "}
        <Link className="kp-link" href="/tutor/schedule">
          Open your schedule
        </Link>
        .
      </p>
    );
  return (
    <div className="kp-st">
      <form method="get" className="kp-st-day">
        <label className="kp-field">
          <span>Briefing date</span>
          <input
            type="date"
            name="date"
            defaultValue={briefing.day ?? ""}
            required
            className="kp-input"
          />
        </label>
        <button type="submit" className="kp-st-btn">
          Show day
        </button>
        <p className="kp-meta">Times in {briefing.timeZone}</p>
      </form>
      {briefing.sessions.length === 0 ? (
        <p className="kp-st-empty">
          No scheduled sessions with students in your current roster on this date.
        </p>
      ) : (
        <ul className="kp-st-cards">
          {briefing.sessions.map((session) => (
            <li key={session.bookingId} className="kp-st-sub">
              <h2>{session.studentLabel}</h2>
              <p className="kp-meta">
                <time dateTime={session.scheduledStart}>
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone: briefing.timeZone!,
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(session.scheduledStart))}
                </time>
              </p>
              <MoreLink href={`/tutor/${encodeURIComponent(session.studentClerkId)}/briefing`}>
                View practice briefing
              </MoreLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type StudentBriefing = NonNullable<Awaited<ReturnType<typeof readStudentBriefing>>>;
export function StudentBriefingView({ briefing }: { briefing: StudentBriefing }) {
  return (
    <div className="kp-st">
      <p className="kp-meta">
        The most recent 30 saved skill-practice sessions are shown. Earlier quizzes remain in the{" "}
        <Link
          href={`/tutor/${encodeURIComponent(briefing.studentClerkId)}?tab=quiz`}
          className="kp-link"
        >
          student record
        </Link>
        .
      </p>
      <p role="note" className="kp-st-note">
        Assigned practice is not yet linked to individual tutoring sessions here. These records do
        not establish session-homework deadlines, lateness, or parent notices.
      </p>
      {briefing.attempts.length === 0 ? (
        <p className="kp-st-empty">No saved skill-practice sessions were found.</p>
      ) : (
        <ul className="kp-st-cards" data-one="">
          {briefing.attempts.map((attempt) => {
            const href = `/tutor/${encodeURIComponent(briefing.studentClerkId)}/practice/${attempt.id}`;
            return (
              <li key={attempt.id} className="kp-st-sub">
                <div className="kp-st-subhead">
                  <Ring
                    value={attempt.total ? attempt.answered / attempt.total : 0}
                    label={`${attempt.answered} of ${attempt.total} answers saved`}
                    size={52}
                  >
                    <Num>{attempt.answered}</Num>
                  </Ring>
                  <div>
                    <p className="kp-meta">
                      {attempt.assignmentId
                        ? attempt.assignment
                          ? `Assigned practice · ${attempt.assignment.status}`
                          : "Assigned practice · details unavailable"
                        : "Independent practice"}
                    </p>
                    <h2>{attempt.assignment?.title ?? attempt.skillLabel}</h2>
                  </div>
                </div>
                <p>
                  {attempt.answered} of {attempt.total} answers saved ·{" "}
                  {attempt.completedAt ? "Completed" : "In progress"}
                  {attempt.completedAt
                    ? attempt.score === null
                      ? " · Saved result unavailable"
                      : ` · ${attempt.score}% on this practice`
                    : ""}
                </p>
                <p className="kp-meta">
                  Started{" "}
                  {new Date(attempt.startedAt).toLocaleString("en-US", {
                    timeZone: "UTC",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  (UTC)
                </p>
                {attempt.missed.length === 0 ? (
                  <p className="kp-meta">No missed answers among the responses saved so far.</p>
                ) : (
                  <>
                    <h3>Recorded misses ({attempt.missed.length})</h3>
                    <ul className="kp-st-misses">
                      {attempt.missed.map((miss) => (
                        <li key={miss.ordinal}>
                          <b>Question {miss.ordinal + 1}</b>
                          <MathText text={miss.questionText} className="kp-st-text" />
                          <p className="kp-meta">Saved answer: {miss.originalAnswer}</p>
                          <Link href={`${href}#question-${miss.ordinal + 1}`} className="kp-link">
                            Review question {miss.ordinal + 1} as student
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <MoreLink href={href}>Review this saved practice</MoreLink>
              </li>
            );
          })}
        </ul>
      )}
      {briefing.hasMore && (
        <p className="kp-meta">
          Older skill-practice sessions are outside this briefing. Their saved history is preserved.
        </p>
      )}
    </div>
  );
}
