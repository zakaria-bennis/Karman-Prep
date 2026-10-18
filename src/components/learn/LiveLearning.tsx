import Link from "next/link";
import { CalendarDays, Video } from "lucide-react";
import type { StudentCalendarData } from "@/lib/learn/week-calendar";
import { resolveCalendarTimeZone } from "@/lib/learn/week-calendar";

export interface LiveLearningProps {
  /** Existing learner calendar contract. Its sessions are personal bookings, not workshops. */
  calendar?: StudentCalendarData;
  asOf?: string;
  preferredTimeZone?: string | null;
}

function bookedSessions(calendar: StudentCalendarData | undefined, asOf: string) {
  if (!calendar || calendar.sessions.state !== "ready") return [];
  return calendar.sessions.items
    .filter((session) => Number.isFinite(Date.parse(session.scheduled_start)))
    .filter((session) => session.scheduled_start >= asOf)
    .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
    .slice(0, 3);
}

export default function LiveLearning({
  calendar,
  asOf = new Date().toISOString(),
  preferredTimeZone = null,
}: LiveLearningProps) {
  const timeZone = resolveCalendarTimeZone(preferredTimeZone);
  const sessions = bookedSessions(calendar, asOf);
  return (
    <section
      aria-labelledby="live-learning-heading"
      className="bg-night px-5 py-12 text-ivory sm:px-8"
    >
      <div className="mx-auto max-w-6xl border-t border-bronze pt-8">
        <div className="flex items-start gap-4">
          <Video className="mt-1 h-6 w-6 shrink-0 text-gold" aria-hidden="true" />
          <div>
            <h2 id="live-learning-heading" className="type-display-m">
              Learn together, live
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-taupe">
              Drop-in office hours and focused workshops are planned for live help with SAT
              questions. Dates and access details will appear here when confirmed.
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="border border-bronze bg-surface p-5 sm:p-6">
            <h3 className="font-plex-serif text-xl text-ivory">Office hours</h3>
            <p className="mt-2 text-sm leading-relaxed text-taupe">
              Bring a question and work through it with an educator in a live drop-in session.
            </p>
            <p className="mt-5 border-t border-bronze pt-4 text-sm text-taupe" role="status">
              No office hours are scheduled yet.
            </p>
          </div>
          <div className="border border-bronze bg-surface p-5 sm:p-6">
            <h3 className="font-plex-serif text-xl text-ivory">Workshops</h3>
            <p className="mt-2 text-sm leading-relaxed text-taupe">
              Focus on one SAT topic with guided examples and time to ask questions.
            </p>
            <p className="mt-5 border-t border-bronze pt-4 text-sm text-taupe" role="status">
              No workshops are scheduled yet.
            </p>
          </div>
        </div>
        {calendar && (
          <div className="mt-8 border-t border-bronze pt-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-gold" aria-hidden="true" />
              <h3 className="font-plex-serif text-xl text-ivory">Your booked tutor sessions</h3>
            </div>
            {calendar.sessions.state === "unavailable" ? (
              <p className="mt-3 text-sm text-taupe" role="status">
                Your booked sessions could not load. Check your schedule to try again.
              </p>
            ) : sessions.length === 0 ? (
              <p className="mt-3 text-sm text-taupe">No upcoming tutor sessions are booked.</p>
            ) : (
              <ul className="mt-4 divide-y divide-bronze border-y border-bronze">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ivory">Tutor session</p>
                      <p className="mt-1 text-xs text-taupe">
                        {new Intl.DateTimeFormat("en-US", {
                          timeZone,
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(session.scheduled_start))}{" "}
                        {timeZone}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/dashboard/student/schedule"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-gold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
            >
              View your schedule
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
