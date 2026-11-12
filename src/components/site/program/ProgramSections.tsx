// The SAT Program page, section by section (founder's picks, 2026-11-11): the opening (three animated
// versions to choose from, switched by OpeningPicker on the development server), the comparison table, the
// weekly loop, the stack, the parent portal, the promise and the close with its "start here" box. Centred
// sections, deliberately not the home page's look. Words: site-copy.ts, sections 21 to 24, 27 and 28. Only
// the small interactive pieces run in the browser, and they get their facts and words as props.
import { Arrow, Btn } from "@/components/site/parts";
import DaysLeft from "./DaysLeft";
import OpeningPicker from "./OpeningPicker";
import ProgramPortal from "./ProgramPortal";
import ProgramPromise from "./ProgramPromise";
import ProgramStart from "./ProgramStart";
import { ROUTES } from "@/components/site/routes";
import { GUARANTEE as G, MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { list, pairs, section } from "@/lib/marketing/site-copy";

/** The two actions and the dates. The seat is reserved on the pricing page for now. */
function Actions() {
  const s = section(21);
  return (
    <div className="pg-close">
      <div className="go-row">
        <Btn label={s.button} href={ROUTES.pricing} />
        <a className="more" href="#promise">
          {s["second button"]}
          <Arrow />
        </a>
      </div>
      <p className="fine pg-dates">
        <span className="pg-days">
          <DaysLeft until={MP.enrollmentCloses} /> {s["days left"]}
        </span>
        <span>
          {s.closes}. {s.starts}
        </span>
      </p>
    </div>
  );
}

/* Small drawings, one per layer of the stack: seats, a timed test, a mistake coming back, a tutor, a
   report, the question bank, the promise. Ink line, one filled accent each. */
const ICONS = [
  <g key="seats">
    <circle className="f" cx="13" cy="15" r="5" />
    <circle cx="24" cy="15" r="5" />
    <circle cx="35" cy="15" r="5" />
    <circle cx="13" cy="31" r="5" />
    <circle cx="24" cy="31" r="5" />
    <circle cx="35" cy="31" r="5" />
  </g>,
  <g key="test">
    <circle cx="24" cy="27" r="14" />
    <path d="M24 13V8m-5 0h10" />
    <path className="s" d="M24 27V18" />
    <circle className="f" cx="24" cy="27" r="3" />
  </g>,
  <g key="back">
    <rect x="8" y="9" width="22" height="28" rx="4" />
    <path d="M14 18l6 6m0-6l-6 6" />
    <path className="s" d="M34 14a13 13 0 0 1 0 20" />
    <path className="s" d="M30 31l4 4 4-5" />
  </g>,
  <g key="tutor">
    <circle className="f" cx="24" cy="16" r="7" />
    <path d="M9 40c1-9 7-14 15-14s14 5 15 14" />
  </g>,
  <g key="report">
    <rect x="7" y="11" width="34" height="26" rx="5" />
    <path d="M8 14l16 12 16-12" />
    <circle className="f" cx="38" cy="12" r="5" />
  </g>,
  <g key="portal">
    <rect x="7" y="9" width="34" height="30" rx="5" />
    <path d="M7 18h34" />
    <rect className="f" x="13" y="24" width="9" height="9" rx="2" />
    <path d="M27 26h9m-9 6h6" />
  </g>,
  <g key="promise">
    <path d="M24 6l15 6v11c0 9-6 16-15 19C15 39 9 32 9 23V12z" />
    <path className="s" d="M16 24l6 6 11-12" />
  </g>,
];

function Tick() {
  return (
    <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

/* The four moves of a week, as small drawings: a test sheet, a class, homework, an arrow coming back. */
const MOVES = [
  <g key="test">
    <rect x="12" y="7" width="24" height="34" rx="4" />
    <path d="M18 17h12m-12 7h12m-12 7h7" />
  </g>,
  <g key="class">
    <rect x="6" y="9" width="36" height="24" rx="4" />
    <path d="M17 41h14m-7-8v8" />
    <path className="s" d="M14 25l6-7 5 4 8-8" />
  </g>,
  <g key="home">
    <rect x="9" y="9" width="30" height="30" rx="5" />
    <path className="s" d="M16 24l6 6 11-12" />
  </g>,
  <g key="back">
    <path d="M38 24a14 14 0 1 1-5-10.7" />
    <path className="s" d="M34 6v8h-8" />
  </g>,
];

/** The example the opening's pictures use: a start just under the first band's top, and the promise for it. */
const START = G.bands[0].upTo - 50;
const GAIN = G.bands[0].cohort;

/** Opening A's picture: a score line that climbs week by week to the promised gain. */
function Climb() {
  const s = section(21);
  const pts = Array.from({ length: MP.weeks + 1 }, (_, i) => {
    const t = i / MP.weeks;
    return [
      44 + i * (392 / MP.weeks),
      252 - 186 * t ** 0.9 + (i % 2 ? 7 : -3) * (i > 0 && i < MP.weeks ? 1 : 0),
    ];
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  return (
    <figure className="pg-climb">
      <svg viewBox="0 0 480 310" role="img" aria-label={s["climb note"]}>
        <path className="g" d="M44 66h392M44 128h392M44 190h392M44 252h392" />
        <path className="a" d={`${line}L436 252L44 252Z`} />
        <path className="l" pathLength={1} d={line} />
        {pts.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === MP.weeks ? 9 : 5.5}
            style={{ "--i": i } as React.CSSProperties}
          />
        ))}
        {pts.slice(1).map(([x], i) => (
          <text key={i} className="w" x={x} y={280} textAnchor="middle">
            {i + 1}
          </text>
        ))}
        <text className="w" x={44} y={280} textAnchor="middle">
          0
        </text>
        <text className="k" x={44} y={300}>
          {s["climb weeks"]}
        </text>
      </svg>
      <span className="pg-flag pg-from">
        {s["climb start"]} <b className="num">{START}</b>
      </span>
      <span className="pg-flag pg-to">
        {s["climb goal"]} <b className="num">{START + GAIN}</b>
      </span>
      <figcaption>{s["climb note"]}</figcaption>
    </figure>
  );
}

/** Opening C's picture: today's score report, and the one nine weeks from now laid over it. */
function Reports() {
  const s = section(21);
  const card = (label: string, score: number, cls: string) => (
    <div className={`pg-rep ${cls}`}>
      <span>{label}</span>
      <em>{s["report label"]}</em>
      <b className="num">{score}</b>
      <i style={{ "--v": (score - 400) / 1200 } as React.CSSProperties} />
    </div>
  );
  return (
    <figure className="pg-reports">
      {card(s.before, START, "pg-then")}
      {card(s.after, START + GAIN, "pg-next")}
      <strong className="num">+{GAIN}</strong>
      <figcaption>{s["report note"]}</figcaption>
    </figure>
  );
}

function Opening({ kind }: { kind: "climb" | "switch" | "reports" }) {
  const s = section(21);
  const p = section(24);
  return (
    <section className={`pg-hero pg-o-${kind}`} id="top">
      <div className="mist" aria-hidden="true" />
      <div className="pg-in">
        <div className="pg-say">
          <h1>{s.headline}</h1>
          <p className="lede">{s.lede}</p>
          {kind === "switch" ? null : <Actions />}
        </div>
        {kind === "climb" ? (
          <Climb />
        ) : kind === "reports" ? (
          <Reports />
        ) : (
          <>
            <ProgramPromise
              ask={p.ask}
              bands={list(p.bands)}
              gains={G.bands.map((b) => b.cohort)}
              promise={p.promise}
              highTitle={p["high title"]}
              high={p.high}
            />
            <Actions />
          </>
        )}
      </div>
    </section>
  );
}

export default function ProgramSections() {
  const open = section(21);
  const loop = section(22);
  const portal = section(23);
  const promise = section(24);
  const close = section(27);
  const cmp = section(28);
  const cols = list(cmp.columns);
  const steps = pairs(loop.steps);
  return (
    <>
      {/* 1. The outcome: three versions to choose from */}
      <OpeningPicker names={["1A. Score climb", "1B. The switch", "1C. Before and after"]}>
        {[
          <Opening key="a" kind="climb" />,
          <Opening key="b" kind="switch" />,
          <Opening key="c" kind="reports" />,
        ]}
      </OpeningPicker>

      {/* 2. Against the usual prep */}
      <section className="sect pg-sect" id="compare" aria-labelledby="compare-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in rv">
          <h2 id="compare-h">{cmp.headline}</h2>
          <table className="pg-cmp">
            <thead>
              <tr>
                <td />
                {cols.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pairs(cmp.rows).map(([label, cells], i) => (
                <tr key={label} style={{ "--i": i } as React.CSSProperties}>
                  <th scope="row">{label}</th>
                  {cells.split(";").map((c, j) => (
                    <td key={j} data-col={cols[j]}>
                      {j === 0 ? <Tick /> : null}
                      {c.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pg-small">{cmp.note}</p>
        </div>
      </section>

      {/* 3. How a week works: the loop */}
      <section className="sect pg-sect" id="week" aria-labelledby="week-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in rv">
          <h2 id="week-h">{loop.headline}</h2>
          <div className="pg-wheel">
            <div className="pg-ring" aria-hidden="true">
              <svg viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="78" />
              </svg>
              <span className="pg-orbit">
                <i />
              </span>
              {steps.map(([k], i) => (
                <span key={k} className="pg-node" style={{ "--i": i } as React.CSSProperties}>
                  <svg viewBox="0 0 48 48">{MOVES[i]}</svg>
                </span>
              ))}
              <div className="pg-core">
                <b>{loop.center}</b>
                {[0, 1, 2, 3, 4].map((i) => (
                  <u key={i} style={{ "--i": i } as React.CSSProperties} />
                ))}
              </div>
            </div>
            <ol className="pg-moves">
              {steps.map(([k, v], i) => (
                <li key={k} style={{ "--i": i } as React.CSSProperties}>
                  <b>{k}</b>
                  <span>{v}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="pg-note">{loop.note}</p>
        </div>
      </section>

      {/* 4. Everything in the seat: the stack */}
      <section className="sect pg-sect" id="seat" aria-labelledby="seat-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in rv">
          <h2 id="seat-h">{open["stack headline"]}</h2>
          <ol className="pg-stack">
            {pairs(open.stack).map(([title, line], i) => (
              <li key={title} style={{ "--i": i } as React.CSSProperties}>
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  {ICONS[i]}
                </svg>
                <p>
                  <b>{title}</b>
                  <span>{line}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. What the parent sees: the portal */}
      <section className="sect pg-sect" id="portal" aria-labelledby="portal-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in rv pg-two">
          <div className="pg-say">
            <h2 id="portal-h">{portal.headline}</h2>
            <p className="lede">{portal.text}</p>
          </div>
          <ProgramPortal
            w={{
              tabs: list(portal.tabs),
              sample: portal.sample,
              captions: [
                portal["score caption"],
                portal["skills caption"],
                portal["homework caption"],
                portal["notes caption"],
              ],
              weeks: list(portal["score weeks"]),
              skills: list(portal.skills),
              levels: list(portal.levels),
              homework: list(portal.homework),
              note: portal.note,
              noteFrom: portal["note from"],
            }}
          />
        </div>
      </section>

      {/* 6. The promise, by starting score */}
      <section className="sect pg-sect" id="promise" aria-labelledby="promise-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in rv">
          <h2 id="promise-h">{promise.headline}</h2>
          <ProgramPromise
            ask={promise.ask}
            bands={list(promise.bands)}
            gains={G.bands.map((b) => b.cohort)}
            promise={promise.promise}
            highTitle={promise["high title"]}
            high={promise.high}
          />
          <div className="pg-terms">
            <h3>{promise["terms title"]}</h3>
            <ul>
              {list(promise.terms).map((x) => (
                <li key={x}>
                  <Tick />
                  {x}
                </li>
              ))}
            </ul>
            <a className="more" href={ROUTES.guarantee}>
              {promise.link}
              <Arrow />
            </a>
          </div>
        </div>
      </section>

      {/* 7. The close: start here */}
      <section className="sect pg-sect pg-end" id="reserve" aria-labelledby="reserve-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in rv">
          <h2 id="reserve-h">{close.headline}</h2>
          <p className="lede">{close.text}</p>
          <ProgramStart
            ask={close.ask}
            field={close.field}
            show={close.show}
            bad={close.bad}
            klass={close.class}
            classBands={[...MP.scoreBands]}
            bandTops={G.bands.map((b) => b.upTo)}
            gains={G.bands.map((b) => b.cohort)}
            promise={promise.promise}
            high={promise.high}
            noScore={close["no score"]}
            action={<Actions />}
          />
          <p className="pg-bonus">{close.bonus}</p>
          <p className="pg-small">{close.later}</p>
        </div>
      </section>
    </>
  );
}
