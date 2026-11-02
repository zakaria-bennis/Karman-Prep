import { useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { WeekCalendar } from "@/design-system/components/Calendar";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { useToast } from "@/design-system/components/Toast";
import { Icon } from "@/design-system/icons";
import { WEEK_DATES, TODAY_INDEX, fmtDate } from "@/mock";
import { TextLink } from "./Shell";
import { PlanLocked } from "./PlanSheet";
import { BookingSheet, slotLabel, type Slot } from "./Booking";
import { GuaranteeBlock, TestsBlock } from "./ClassesParts";
import { SESSIONS, OFFICE_HOURS, dayDate } from "./mock-schedule";
import { hoursFor, hoursOf } from "./mock";
import type { StudentView } from "./view";

/*
 * The private student's screen: the next session, booked by the student
 * through the slot sheet, the hours used, this week, the sessions so far,
 * the tests and (on Private 20) the guarantee. Plus's screen: office hours,
 * the recording, and the live classes it does not have as one locked panel.
 */
export function Private({ v }: { v: StudentView }) {
  const toast = useToast();
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<Slot | null>(null);
  const hours = hoursFor(v.plan);
  const tutor = v.tutor ?? "your tutor";
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="grid gap-5">
        <Panel as="section" aria-label="Next session" className="grid gap-3 p-4 sm:p-5">
          {booked ? (
            <>
              <p className="text-body font-semibold">
                Next session with {tutor}: {slotLabel(booked)}.
              </p>
              <p className="text-dense text-muted">
                One hour on Zoom. The link arrives the day before.
              </p>
              <div>
                <TextLink onClick={() => setBooked(null)}>Change the time</TextLink>
              </div>
            </>
          ) : (
            <>
              <p className="text-body font-semibold">
                No session booked. {tutor} has times next week.
              </p>
              <div>
                <GlassButton variant="primary" className="k-sheen" onClick={() => setBooking(true)}>
                  Book your next session
                </GlassButton>
              </div>
            </>
          )}
          <ProgressBar
            value={SESSIONS.length}
            max={hours}
            label="Hours used"
            endLabel={`${SESSIONS.length} of ${hours}`}
          />
        </Panel>
        <Panel as="section" aria-label="This week" className="p-4">
          <h2 className="pb-3 text-section">This week</h2>
          <WeekCalendar
            events={v.events}
            dates={WEEK_DATES}
            today={TODAY_INDEX}
            {...hoursOf(v.events)}
          />
        </Panel>
      </div>
      <div className="grid gap-5">
        <Panel as="section" aria-label="Past sessions" className="px-4 py-2">
          <h2 className="pb-1 pt-2 text-section">Sessions so far</h2>
          <List total={`${SESSIONS.length} hours`}>
            {[...SESSIONS]
              .reverse()
              .slice(0, 4)
              .map((s) => (
                <Row
                  key={s.id}
                  title={s.title}
                  sub={{ kind: "date", text: `${fmtDate(s.date)}, ${s.time}` }}
                />
              ))}
          </List>
        </Panel>
        <TestsBlock v={v} />
        <GuaranteeBlock v={v} />
      </div>
      <BookingSheet
        open={booking}
        onClose={() => setBooking(false)}
        tutor={tutor}
        onBook={(s) => {
          setBooked(s);
          toast.push({
            title: "Session booked",
            detail: `${slotLabel(s)} with ${tutor}.`,
            kind: "success",
          });
        }}
      />
    </div>
  );
}

export function Workshops({ v }: { v: StudentView }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <Panel as="section" aria-label="This week" className="p-4">
        <h2 className="pb-3 text-section">This week</h2>
        <WeekCalendar
          events={v.events}
          dates={WEEK_DATES}
          today={TODAY_INDEX}
          {...hoursOf(v.events)}
        />
      </Panel>
      <div className="grid gap-5">
        <Panel className="px-4 py-2">
          <List>
            <Row
              title="Office hours"
              sub={{
                kind: "date",
                text: `Next ${dayDate(OFFICE_HOURS.next)}, ${OFFICE_HOURS.time}`,
              }}
              leading={<Icon name="calendar" size={20} />}
            />
            <Row
              title="Pacing workshop recording"
              sub={{ kind: "date", text: `Recorded ${fmtDate("2026-10-25")}` }}
              leading={<Icon name="play" size={20} />}
            />
          </List>
        </Panel>
        <PlanLocked bundle="liveClasses">
          <Panel className="p-4">
            <h2 className="text-section">Live classes</h2>
            <p className="mt-1 text-dense">
              Two live classes a week with the cohort's tutor, ending on your SAT date.
            </p>
          </Panel>
        </PlanLocked>
      </div>
    </div>
  );
}
