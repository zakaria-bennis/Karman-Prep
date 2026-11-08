/*
 * The student Calendar (founder, 2026-11-07), in the painted shell: booked sessions with move
 * and cancel, booking a 1:1, workshops and office hours, recordings, and a month grid.
 * Ported from the approved prototype (prototypes/today-directions/screens.js, calendar()).
 * The plan decides what shows (src/lib/student/plan-gate.ts); locked parts say how to open them.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CalendarSubscribe } from "@/components/dashboard/CalendarSubscribe";
import { Card, MoreLink, Num, Panel, SectionHeader } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import BookedList, { type BookedRow } from "@/components/student-portal/calendar/BookedList";
import BookSession from "@/components/student-portal/calendar/BookSession";
import EventList, { type EventRow } from "@/components/student-portal/calendar/EventList";
import MonthGrid from "@/components/student-portal/calendar/MonthGrid";
import styles from "@/components/student-portal/calendar/calendar.module.css";
import { loadCalendar } from "@/components/student-portal/calendar/load";
import { CHANGE_WINDOW_HOURS, dateText, dayIn, whenText } from "@/lib/student/calendar";
import { loadStudentContext } from "@/lib/student/context";
import { canUse, upgradeFor } from "@/lib/student/plan-gate";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

/** The Join link shows from this long before a session starts until it ends. */
const JOIN_EARLY_MS = 30 * 60_000;

export default async function StudentCalendarPage() {
  const ctx = await loadStudentContext();
  const data = await loadCalendar(ctx);
  const now = Date.now();
  const tz = data.timeZone;
  const oneToOne = canUse(ctx.plan, "live:private");
  const workshops = canUse(ctx.plan, "live:workshops");

  const booked: BookedRow[] = data.booked.map((s) => ({
    ...s,
    when: whenText(s.start, now, tz),
    joinable: Date.parse(s.start) - now <= JOIN_EARLY_MS && Date.parse(s.end) > now,
  }));
  const events: EventRow[] = data.events.map((e) => ({ ...e, when: whenText(e.start, now, tz) }));
  const hasOneToOnes = booked.some((b) => b.kind === "private");

  let booking: ReactNode = null;
  if (oneToOne) {
    const tutor = data.tutor;
    if (!tutor) {
      booking = (
        <p className="kp-meta">
          We&rsquo;re matching you with a tutor. Booking opens here once you&rsquo;re paired.
        </p>
      );
    } else if (tutor.eventTypeId === null) {
      booking = (
        <p className="kp-meta">
          {tutor.name} is finishing their booking setup. We&rsquo;ve let the team know, and booking
          opens here once it&rsquo;s done.
        </p>
      );
    } else {
      booking = (
        <BookSession
          tutor={{ clerkId: tutor.clerkId, name: tutor.name, eventTypeId: tutor.eventTypeId }}
          preview={ctx.isImpersonating}
        />
      );
    }
  }

  const privateUpgrade = upgradeFor("live:private");
  const workshopUpgrade = upgradeFor("live:workshops");

  const side = (
    <>
      <Card>
        <MonthGrid todayKey={dayIn(now, tz)} marks={data.marks} />
        {!ctx.isImpersonating && (
          <div className={styles.feed}>
            <CalendarSubscribe audience="student" />
          </div>
        )}
      </Card>
      <Card>
        <SectionHeader title="Recordings" />
        {data.recordings.length ? (
          data.recordings.map((r) => (
            <a key={r.id} className="kp-row" href={r.url} target="_blank" rel="noopener noreferrer">
              <span>
                <b>{r.title}</b>
                <small>
                  <Num>{r.minutes}</Num> min
                </small>
              </span>
              <span>{dateText(r.start, tz)}</span>
            </a>
          ))
        ) : (
          <p className="kp-meta">Recordings of past sessions show here.</p>
        )}
      </Card>
    </>
  );

  return (
    <StudentPortal ctx={ctx} title="Calendar">
      <Panel side={side}>
        <Card>
          <SectionHeader title="Booked" note={booked.length ? <Num>{booked.length}</Num> : null} />
          {booked.length ? (
            <BookedList rows={booked} preview={ctx.isImpersonating} />
          ) : (
            <p className="kp-meta">Nothing booked yet.</p>
          )}
          {hasOneToOnes && (
            <p className={styles.note}>
              Moving or cancelling a 1:1 is free until <Num>{CHANGE_WINDOW_HOURS}</Num> hours before
              it starts. Each session can move once.
            </p>
          )}
          {booking}
          {!oneToOne && workshops && !hasOneToOnes && (
            <MoreLink href={privateUpgrade.href}>1:1 tutoring</MoreLink>
          )}
        </Card>
        <Card>
          <SectionHeader title="Workshops and office hours" />
          {!workshops ? (
            <>
              <p className="kp-meta">
                Live workshops and office hours come with the {workshopUpgrade.plan} plan and up.
              </p>
              <MoreLink href={workshopUpgrade.href}>See plans</MoreLink>
            </>
          ) : events.length ? (
            <EventList rows={events} />
          ) : (
            <p className="kp-meta">No workshops or office hours on the calendar yet.</p>
          )}
        </Card>
      </Panel>
    </StudentPortal>
  );
}
