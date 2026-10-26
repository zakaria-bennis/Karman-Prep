"use client";

// The student's calendar on the home page: the week drawn in line work (live/week.ts) and, beside it, the
// chosen day in words. Point at a day (or tap it) to read it; at rest it shows today. The week is the
// product's own calendar for a fictional student, so its words live here like the screens' words do.
import { useEffect, useRef, useState } from "react";
import { MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { mountWeek, TODAY, type EventKind } from "./live/week";

const AT = `${MP.classStart} p.m.`;
const WEEK: { day: string; date: string; events: [EventKind, string, string][] }[] = [
  {
    day: "Monday",
    date: "February 1",
    events: [
      ["review", "One-on-one review of full-length 3, with David", "6:00 p.m."],
      ["d10", "Daily 10", "Any time today"],
    ],
  },
  {
    day: "Tuesday",
    date: "February 2",
    events: [
      ["class", "Live class: nonlinear functions", AT],
      ["d10", "Daily 10", "Any time today"],
      ["hw", "Homework: quadratic systems, 12 questions", "Due tonight"],
    ],
  },
  {
    day: "Wednesday",
    date: "February 3",
    events: [
      ["work", "Workshop: pacing the second module", AT],
      ["d10", "Daily 10", "Any time today"],
    ],
  },
  {
    day: "Thursday",
    date: "February 4",
    events: [
      ["class", "Live class: transitions", AT],
      ["d10", "Daily 10", "Any time today"],
    ],
  },
  {
    day: "Friday",
    date: "February 5",
    events: [
      ["d10", "Daily 10", "Any time today"],
      ["hw", "Homework: transitions set", "Due tonight"],
    ],
  },
  {
    day: "Saturday",
    date: "February 6",
    events: [["test", "Full-length test 4, timed, in one sitting", "9:00 a.m."]],
  },
  { day: "Sunday", date: "February 7", events: [["d10", "Daily 10", "Any time today"]] },
];
const KIND: Record<EventKind, string> = {
  class: "Live class",
  review: "One-on-one",
  work: "Workshop",
  hw: "Homework",
  d10: "Daily 10",
  test: "Full-length test",
};

export default function WeekCalendar() {
  const host = useRef<HTMLDivElement>(null);
  const [day, setDay] = useState(TODAY);
  useEffect(
    () =>
      host.current
        ? mountWeek(
            host.current,
            WEEK.map((d) => d.events.map((e) => e[0])),
            (i) => setDay(i < 0 ? TODAY : i)
          )
        : undefined,
    []
  );
  const d = WEEK[day];
  return (
    <div className="wk">
      <div className="fig wk-fig" ref={host}>
        <div
          className="hl"
          role="img"
          aria-label="The student's week as seven raised days, one block for each class, review, workshop, homework and test."
        />
      </div>
      <div className="wk-card" aria-live="polite">
        <p className="wk-d">
          <b>{d.day}</b>
          {d.date}
          {day === TODAY ? <span className="wk-today">Today</span> : null}
        </p>
        <ul>
          {d.events.map(([kind, what, when]) => (
            <li key={what} className={kind}>
              <i aria-hidden="true" />
              <span>
                <b>{what}</b>
                <small>{KIND[kind] === what ? when : `${KIND[kind]}, ${when}`}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
