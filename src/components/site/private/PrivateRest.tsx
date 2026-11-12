// TEMPORARY (2026-11-12): the Private tutoring page's calendar section and closing section, five designs
// each (PrivateLab.tsx).
// Calendar: the same three steps beside the working booking calendar (BookingCalendar.tsx) in five looks:
//   1 month and times   2 week strip (phone-first)   3 the tutor's day   4 on a phone   5 month and a card
// Close: the free-call form (the site's own lead form, the same in every design) with:
//   1 the promise's two sides   2 the form alone, with three reassurances   3 three doubts answered
//   4 what happens next, in three steps   5 one dark band and the form
// Words: site-copy.ts sections 32, 35 and 36.
import LeadFormCard from "@/components/site/LeadFormCard";
import { Arrow } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { list, pairs, section } from "@/lib/marketing/site-copy";
import BookingCalendar, { type CalendarLook } from "./BookingCalendar";

function Tick() {
  return (
    <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

export function calendarDesigns(today: string) {
  const s = section(32);
  const words = {
    pickDay: s["pick day"],
    pickTime: s["pick time"],
    zone: s.zone,
    length: s.length,
    withTutor: s.with,
    confirm: s.confirm,
    booked: s.booked,
    taken: s.taken,
    none: s.none,
    move: s.move,
  };
  const looks: CalendarLook[] = ["month", "week", "day", "phone", "card"];
  return looks.map((look, i) => (
    <section
      key={look}
      className={`sect pg-sect pc pc-${i + 1}`}
      id="session"
      aria-labelledby="session-h"
    >
      <div className="mist" aria-hidden="true" />
      <div className="pg-in pg-two rv">
        <div className="pg-say">
          <h2 id="session-h">{s.headline}</h2>
          <ol className="pg-moves">
            {pairs(s.steps).map(([k, v]) => (
              <li key={k}>
                <b>{k}</b>
                <span>{v}</span>
              </li>
            ))}
          </ol>
        </div>
        <BookingCalendar look={look} w={words} today={today} />
      </div>
    </section>
  ));
}

function Form() {
  const c = section(36);
  return (
    <div className="pv-call">
      <h3 className="pg-h3">{c.headline}</h3>
      <p className="pg-small">{c.calm}</p>
      <LeadFormCard n={36} form="call" anchor="call" />
    </div>
  );
}

function Sides() {
  const p = section(35);
  return (
    <div className="pg-deal">
      <article className="pg-terms">
        <h3>{p["ours title"]}</h3>
        <ul>
          {list(p.ours).map((x) => (
            <li key={x}>
              <Tick />
              {x}
            </li>
          ))}
        </ul>
      </article>
      <article className="pg-terms pg-theirs">
        <h3>{p["terms title"]}</h3>
        <ul>
          {list(p.terms).map((x) => (
            <li key={x}>
              <Tick />
              {x}
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}

export function closeDesigns() {
  const p = section(35);
  const c = section(36);
  const link = (
    <a className="more" href={ROUTES.guarantee}>
      {p.link}
      <Arrow />
    </a>
  );
  const shell = (k: number, left: React.ReactNode, two = true) => (
    <section
      key={k}
      className={`sect pg-sect pg-end pk pk-${k}`}
      id="promise"
      aria-labelledby="promise-h"
    >
      <div className="mist" aria-hidden="true" />
      <div className={`pg-in rv ${two ? "pg-two" : ""}`}>
        {left}
        <Form />
      </div>
    </section>
  );
  return [
    shell(
      1,
      <div className="pg-say">
        <h2 id="promise-h">{p.headline}</h2>
        <Sides />
        <p className="pg-small">{p.grace}</p>
        {link}
      </div>
    ),
    shell(
      2,
      <div className="pk-top">
        <h2 id="promise-h">{c.calm}</h2>
        <ul>
          {list(c.assure).map((x) => (
            <li key={x}>
              <Tick />
              {x}
            </li>
          ))}
        </ul>
      </div>,
      false
    ),
    shell(
      3,
      <div className="pg-say">
        <h2 id="promise-h">{c.calm}</h2>
        <dl className="pk-doubts">
          {pairs(c.doubts).map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
        {link}
      </div>
    ),
    shell(
      4,
      <div className="pg-say">
        <h2 id="promise-h">{c["next title"]}</h2>
        <ol className="pg-moves">
          {pairs(c.next).map(([k, v]) => (
            <li key={k}>
              <b>{k}</b>
              <span>{v}</span>
            </li>
          ))}
        </ol>
        {link}
      </div>
    ),
    shell(
      5,
      <div className="pk-band">
        <h2 id="promise-h">{c.calm}</h2>
        <p>{p.grace}</p>
        <ul>
          {list(p.ours)
            .slice(0, 4)
            .map((x) => (
              <li key={x}>
                <Tick />
                {x}
              </li>
            ))}
        </ul>
        {link}
      </div>
    ),
  ];
}
