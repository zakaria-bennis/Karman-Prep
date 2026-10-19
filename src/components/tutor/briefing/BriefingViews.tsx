import Link from "next/link";
import MathText from "@/components/learn/MathText";
import type { DailyBriefing } from "@/lib/educator-briefing/daily";
import type { readStudentBriefing } from "@/lib/educator-briefing/server";

export function BriefingUnavailable() {
  return (
    <p role="status" className="rounded-xl border border-bronze bg-surface p-5 text-taupe">
      The briefing is unavailable right now. No saved work has been changed. Reload this page to try
      again.
    </p>
  );
}

export function DailyBriefingView({ briefing }: { briefing: DailyBriefing }) {
  if (!briefing.timeZone)
    return (
      <p role="status" className="rounded-xl border border-bronze bg-surface p-5 text-taupe">
        Your account timezone is unavailable, so a calendar-day briefing cannot be shown.{" "}
        <Link className="text-info underline" href="/tutor/schedule">
          Open your schedule
        </Link>
        .
      </p>
    );
  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold text-ivory">
          Briefing date
          <input
            type="date"
            name="date"
            defaultValue={briefing.day ?? ""}
            required
            className="mt-2 block min-h-11 rounded-lg border border-bronze bg-surface px-3 py-2 text-ivory"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-bronze px-4 py-2 text-sm font-semibold text-ivory"
        >
          Show day
        </button>
        <p className="text-sm text-taupe">Times in {briefing.timeZone}</p>
      </form>
      {briefing.sessions.length === 0 ? (
        <p className="rounded-xl border border-bronze p-5 text-taupe">
          No scheduled sessions with students in your current roster on this date.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {briefing.sessions.map((session) => (
            <li
              key={session.bookingId}
              className="min-w-0 rounded-xl border border-bronze bg-surface p-5"
            >
              <h2 className="break-words text-lg font-semibold text-ivory">
                {session.studentLabel}
              </h2>
              <p className="mt-2 text-sm text-taupe">
                <time dateTime={session.scheduledStart}>
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone: briefing.timeZone!,
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(session.scheduledStart))}
                </time>
              </p>
              <Link
                href={`/tutor/${encodeURIComponent(session.studentClerkId)}/briefing`}
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-info underline underline-offset-4"
              >
                View practice briefing
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type StudentBriefing = NonNullable<Awaited<ReturnType<typeof readStudentBriefing>>>;
export function StudentBriefingView({ briefing }: { briefing: StudentBriefing }) {
  return (
    <>
      <p className="text-sm text-taupe">
        The most recent 30 saved skill-practice sessions are shown. Earlier quizzes remain in the{" "}
        <Link
          href={`/tutor/${encodeURIComponent(briefing.studentClerkId)}?tab=quiz`}
          className="text-info underline"
        >
          student record
        </Link>
        .
      </p>
      <p role="note" className="rounded-xl border border-bronze bg-surface p-4 text-sm text-taupe">
        Assigned practice is not yet linked to individual tutoring sessions here. These records do
        not establish session-homework deadlines, lateness, or parent notices.
      </p>
      {briefing.attempts.length === 0 ? (
        <p className="rounded-xl border border-bronze p-5 text-taupe">
          No saved skill-practice sessions were found.
        </p>
      ) : (
        <ul className="space-y-5">
          {briefing.attempts.map((attempt) => {
            const href = `/tutor/${encodeURIComponent(briefing.studentClerkId)}/practice/${attempt.id}`;
            return (
              <li
                key={attempt.id}
                className="min-w-0 rounded-xl border border-bronze bg-surface p-5"
              >
                <p className="text-sm text-taupe">
                  {attempt.assignmentId
                    ? attempt.assignment
                      ? `Assigned practice · ${attempt.assignment.status}`
                      : "Assigned practice · details unavailable"
                    : "Independent practice"}
                </p>
                <h2 className="mt-1 break-words text-lg font-semibold text-ivory">
                  {attempt.assignment?.title ?? attempt.skillLabel}
                </h2>
                <p className="mt-2 text-sm text-taupe">
                  {attempt.answered} of {attempt.total} answers saved ·{" "}
                  {attempt.completedAt ? "Completed" : "In progress"}
                  {attempt.completedAt
                    ? attempt.score === null
                      ? " · Saved result unavailable"
                      : ` · ${attempt.score}% on this practice`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-taupe">
                  Started{" "}
                  {new Date(attempt.startedAt).toLocaleString("en-US", {
                    timeZone: "UTC",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  (UTC)
                </p>
                {attempt.missed.length === 0 ? (
                  <p className="mt-3 text-sm text-taupe">
                    No missed answers among the responses saved so far.
                  </p>
                ) : (
                  <>
                    <h3 className="mt-4 text-sm font-semibold text-ivory">
                      Recorded misses ({attempt.missed.length})
                    </h3>
                    <ul className="mt-2 space-y-3">
                      {attempt.missed.map((miss) => (
                        <li
                          key={miss.ordinal}
                          className="min-w-0 border-l-2 border-bronze pl-3 text-sm text-ivory"
                        >
                          <p className="font-semibold">Question {miss.ordinal + 1}</p>
                          <MathText
                            text={miss.questionText}
                            className="block whitespace-pre-wrap break-words"
                          />
                          <p className="mt-1 break-words text-taupe">
                            Saved answer: {miss.originalAnswer}
                          </p>
                          <Link
                            href={`${href}#question-${miss.ordinal + 1}`}
                            className="inline-flex min-h-11 items-center text-info underline underline-offset-4"
                          >
                            Review question {miss.ordinal + 1} as student
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <Link
                  href={href}
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-info underline underline-offset-4"
                >
                  Review this saved practice
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {briefing.hasMore && (
        <p className="text-sm text-taupe">
          Older skill-practice sessions are outside this briefing. Their saved history is preserved.
        </p>
      )}
    </>
  );
}
