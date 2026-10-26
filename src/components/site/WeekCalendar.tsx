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
// pair: a full-length test and the session that reviews it share a number
const DAYS: { d: string; n: number; ev: Ev[] }[] = [
  { d: "Mon", n: 1, ev: [{ k: "hw", t: "Quadratics, 15 questions", at: "9:00 p.m." }] },
  { d: "Tue", n: 2, ev: [{ k: "oh", t: "Office hours", at: "6:00 p.m." }] },
  { d: "Wed", n: 3, ev: [{ k: "fl", t: "Full-length 3", at: "Before Thursday", pair: 3 }] },
  {
    d: "Thu",
    n: 4,
    ev: [{ k: "s", t: "Review full-length 3 with David", at: "5:00 p.m.", pair: 3 }],
  },
  { d: "Fri", n: 5, ev: [{ k: "hw", t: "Transitions, 12 questions", at: "9:00 p.m." }] },
  { d: "Sat", n: 6, ev: [{ k: "ws", t: "Pacing the second module", at: "11:00 a.m." }] },
  { d: "Sun", n: 7, ev: [] },
  { d: "Mon", n: 8, ev: [{ k: "hw", t: "Nonlinear functions, 15 questions", at: "9:00 p.m." }] },
  { d: "Tue", n: 9, ev: [{ k: "oh", t: "Office hours", at: "6:00 p.m." }] },
  { d: "Wed", n: 10, ev: [{ k: "fl", t: "Full-length 4", at: "Before Thursday", pair: 4 }] },
  {
    d: "Thu",
    n: 11,
    ev: [{ k: "s", t: "Review full-length 4 with David", at: "5:00 p.m.", pair: 4 }],
  },
  { d: "Fri", n: 12, ev: [{ k: "hw", t: "Boundaries, 12 questions", at: "9:00 p.m." }] },
  { d: "Sat", n: 13, ev: [{ k: "ws", t: "Desmos for systems", at: "11:00 a.m." }] },
  { d: "Sun", n: 14, ev: [] },
];
const TODAY = 0;
const FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DOMAINS: [string, number][] = [
  ["Information and Ideas", 78],
  ["Craft and Structure", 64],
  ["Expression of Ideas", 82],
  ["Standard English Conventions", 55],
  ["Algebra", 88],
  ["Advanced Math", 61],
  ["Problem-Solving and Data", 73],
  ["Geometry and Trigonometry", 47],
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
              <span>Review full-length 3 with David</span>
              <em>
                <u style={{ "--p": 0.4 } as CSSProperties} />
                Full-length 3 due Wednesday
              </em>
            </div>
            <div className="sc-dom">
              <small>Progress by domain</small>
              <ul>
                {DOMAINS.map(([name, pct], k) => (
                  <li
                    key={name}
                    className={pct < 60 ? "low" : ""}
                    style={{ "--p": pct / 100, "--k": k } as CSSProperties}
                  >
                    <span>{name}</span>
                    <b>{pct}%</b>
                    <u />
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <div className="sc-main">
            <div className="sc-head">
              <b>February</b>
              <span className="sc-keys">
                {(Object.keys(KIND) as Kind[]).map((k) => (
                  <span key={k} className={k}>
                    <i />
                    {KIND[k]}
                  </span>
                ))}
              </span>
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
                  className={`sc-day${i === day ? "on" : ""}${i === TODAY ? "today" : ""}`}
                  style={{ "--i": i } as CSSProperties}
                  onPointerEnter={() => setDay(i)}
                >
                  <span className="sc-n">{x.n}</span>
                  {x.ev.map((e) => (
                    <span
                      key={e.t}
                      className={`sc-ev ${e.k}${e.pair && e.pair === pair ? "lit" : ""}`}
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
                  <b>{e.t}</b>
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
