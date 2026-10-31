"use client";

// The home page's calendar (2026-10-26): the app's own screen for a one-on-one student, flat, as it looks on a
// computer. Two weeks of sessions, the full-length test due before each session, homework, workshops and
// office hours, with the next session and progress on all eight SAT domains beside them. It arrives in a
// stagger and the domain bars fill. Pointing at a day lifts it and reads it out in the side panel; pointing at
// a full-length test or its session draws the line between the two. The student and their week are
// fictional, so the words live here like the other screens' words do.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

type Kind = "s" | "fl" | "hw" | "ws" | "oh";
type Ev = { k: Kind; t: string; at: string; pair?: number };
const KIND: Record<Kind, string> = {
  s: "One-on-one",
  fl: "Full-length test",
  hw: "Homework due",
  ws: "Workshop",
  oh: "Office hours",
};
// pair: a full-length test and the session that reviews it share a number. t is the short chip on the grid,
// long the full line in the side card, so nothing on the grid is cut off.
type Day = { d: string; n: number; ev: (Ev & { long: string })[] };
const E = (k: Kind, t: string, long: string, at: string, pair?: number) => ({
  k,
  t,
  long,
  at,
  pair,
});
const DAYS: Day[] = [
  { d: "Mon", n: 1, ev: [E("hw", "Quadratics set", "Quadratics, 15 questions", "9:00 p.m.")] },
  { d: "Tue", n: 2, ev: [E("oh", "Office hours", "Office hours with Lin", "6:00 p.m.")] },
  {
    d: "Wed",
    n: 3,
    ev: [E("fl", "Full-length 3", "Full-length 3, before Thursday's session", "9:00 p.m.", 3)],
  },
  {
    d: "Thu",
    n: 4,
    ev: [E("s", "1:1 with David", "Math review of full-length 3 with David", "5:00 p.m.", 3)],
  },
  { d: "Fri", n: 5, ev: [E("hw", "Transitions set", "Transitions, 12 questions", "9:00 p.m.")] },
  {
    d: "Sat",
    n: 6,
    ev: [E("ws", "Pacing workshop", "Workshop: pacing the second module", "11:00 a.m.")],
  },
  { d: "Sun", n: 7, ev: [] },
  {
    d: "Mon",
    n: 8,
    ev: [E("s", "1:1 with Lin", "Reading and Writing session with Lin", "5:00 p.m.")],
  },
  {
    d: "Tue",
    n: 9,
    ev: [E("hw", "Functions set", "Nonlinear functions, 15 questions", "9:00 p.m.")],
  },
  {
    d: "Wed",
    n: 10,
    ev: [E("fl", "Full-length 4", "Full-length 4, before Thursday's session", "9:00 p.m.", 4)],
  },
  {
    d: "Thu",
    n: 11,
    ev: [E("s", "1:1 with David", "Math review of full-length 4 with David", "5:00 p.m.", 4)],
  },
  { d: "Fri", n: 12, ev: [E("oh", "Office hours", "Office hours with David", "6:00 p.m.")] },
  {
    d: "Sat",
    n: 13,
    ev: [E("ws", "Desmos workshop", "Workshop: Desmos for systems", "11:00 a.m.")],
  },
  { d: "Sun", n: 14, ev: [] },
];
const TODAY = 0;
const FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// the eight SAT domains, each on six levels, Reading and Writing first
const DOMAINS: [string, [string, number][]][] = [
  [
    "Reading and Writing",
    [
      ["Information and Ideas", 5],
      ["Craft and Structure", 4],
      ["Expression of Ideas", 5],
      ["Standard English Conventions", 3],
    ],
  ],
  [
    "Math",
    [
      ["Algebra", 6],
      ["Advanced Math", 4],
      ["Problem-Solving and Data Analysis", 5],
      ["Geometry and Trigonometry", 3],
    ],
  ],
];

export default function WeekCalendar() {
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [day, setDay] = useState(TODAY);
  const [pair, setPair] = useState(0);
  const [link, setLink] = useState("");

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          el.classList.add("in-view");
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the line from a full-length test to the session that reviews it, in the grid's own pixels
  useLayoutEffect(() => {
    const g = grid.current;
    if (!g || !pair) return setLink("");
    const a = g.querySelector<HTMLElement>(`[data-pair="${pair}"].fl`),
      b = g.querySelector<HTMLElement>(`[data-pair="${pair}"].s`);
    if (!a || !b) return setLink("");
    const o = g.getBoundingClientRect(),
      ra = a.getBoundingClientRect(),
      rb = b.getBoundingClientRect();
    const x1 = ra.left + ra.width / 2 - o.left,
      y1 = ra.top - o.top,
      x2 = rb.left + rb.width / 2 - o.left,
      y2 = rb.top - o.top;
    const lift = Math.max(28, Math.abs(x2 - x1) * 0.45);
    setLink(`M${x1} ${y1} C${x1} ${y1 - lift} ${x2} ${y2 - lift} ${x2} ${y2}`);
  }, [pair]);

  const d = DAYS[day];
  return (
    <div className="sc" ref={root}>
      <div className="mbp">
        <span className="notch" aria-hidden="true" />
        <div
          className="sc-win"
          role="img"
          aria-label="A one-on-one student's calendar for two weeks: a session with the tutor every Thursday, a full-length test due the day before each, homework, office hours and a Saturday workshop, with progress on all eight SAT domains beside it."
        >
          <div className="sc-bar">
            <i />
            <i />
            <i />
            <span>Karman · Calendar</span>
          </div>
          <div className="sc-body">
            <aside className="sc-side">
              <div className="sc-next">
                <small>Next session</small>
                <b>Thursday, 5:00 p.m.</b>
                <span>Math review of full-length 3 with David</span>
                <em>
                  <u style={{ "--p": 0.4 } as CSSProperties} />
                  Full-length 3 due Wednesday
                </em>
              </div>
              {DOMAINS.map(([area, rows], g) => (
                <div className="sc-dom" key={area}>
                  <small>{area}</small>
                  <ul>
                    {rows.map(([name, lvl], k) => (
                      <li key={name} style={{ "--k": g * 4 + k } as CSSProperties}>
                        <span>{name}</span>
                        <b className="lv" aria-hidden="true">
                          {Array.from({ length: 6 }, (_, i) => (
                            <i
                              key={i}
                              className={i < lvl ? "on" : ""}
                              style={{ "--i": i } as CSSProperties}
                            />
                          ))}
                        </b>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </aside>
            <div className="sc-main">
              <div className="sc-head">
                <b>February</b>
              </div>
              <div
                className="sc-grid"
                ref={grid}
                onPointerLeave={() => {
                  setDay(TODAY);
                  setPair(0);
                }}
              >
                {DAYS.slice(0, 7).map((x) => (
                  <span className="sc-dn" key={x.d}>
                    {x.d}
                  </span>
                ))}
                {DAYS.map((x, i) => (
                  <div
                    key={x.n}
                    className={`sc-day ${i === day ? "on" : ""} ${i === TODAY ? "today" : ""}`}
                    style={{ "--i": i } as CSSProperties}
                    onPointerEnter={() => setDay(i)}
                  >
                    <span className="sc-n">{x.n}</span>
                    {x.ev.map((e) => (
                      <span
                        key={e.t}
                        className={`sc-ev ${e.k} ${e.pair && e.pair === pair ? "lit" : ""}`}
                        data-pair={e.pair}
                        onPointerEnter={() => setPair(e.pair ?? 0)}
                        onPointerLeave={() => setPair(0)}
                      >
                        {e.t}
                      </span>
                    ))}
                  </div>
                ))}
                <svg className="sc-link" aria-hidden="true">
                  {link ? <path d={link} key={link} pathLength={1} /> : null}
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="sc-card" aria-live="polite">
        <p className="sc-d">
          <b>{FULL[day % 7]}</b>
          February {d.n}
          {day === TODAY ? <span className="sc-today">Today</span> : null}
        </p>
        {d.ev.length ? (
          <ul>
            {d.ev.map((e) => (
              <li key={e.t} className={e.k}>
                <i aria-hidden="true" />
                <span>
                  <b>{e.long}</b>
                  <small>
                    {KIND[e.k]}, {e.at}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sc-free">A free day. The Daily 10 still takes ten minutes.</p>
        )}
      </div>
    </div>
  );
}
