// The SAT Program page (founder, 2026-11-11): four screens on a desktop, in the home page's design language
// (big serif headings on the left, on mist, with the picture beside them). 1: the outcome and the
// starting-score switch. 2: the nine weeks as a score climb, drawn week by week with every test and class
// on it. 3: what the seat is worth at Karman's own prices, beside the parent portal. 4: the promise's two
// sides, beside the "start here" box. Words: site-copy.ts, sections 21 to 24, 27 and 29. Only the small
// interactive pieces run in the browser, and they get their facts and words as props.
import { Arrow, Btn } from "@/components/site/parts";
import DaysLeft from "./DaysLeft";
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

function Tick() {
  return (
    <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

/** The example the climb is drawn for: a start just under the first band's top, and the promise for it. */
const START = G.bands[0].upTo - 50;
const GAIN = G.bands[0].cohort;
/* the plot: weeks across, the score up */
const X0 = 78;
const X1 = 700;
const Y0 = 318;
const Y1 = 70;
const WEEK = (X1 - X0) / MP.weeks;
const yOf = (gain: number) => Y0 - (gain / GAIN) * (Y0 - Y1);

/** The nine weeks as a score climb: every week has its test and its two classes on it, the line rises from
 *  the starting score to the promised one, and the last week ends on SAT day. */
function Climb() {
  const s = section(22);
  /* the plan's shape: slow at first, then steady, landing on the promise */
  const gains = Array.from({ length: MP.weeks + 1 }, (_, i) =>
    Math.round(GAIN * (i / MP.weeks) ** 1.12)
  );
  const pts = gains.map((g, i) => [X0 + i * WEEK, yOf(g)] as const);
  const line = pts
    .map(([x, y], i) =>
      i
        ? `C${(x - WEEK * 0.45).toFixed(1)} ${pts[i - 1][1].toFixed(1)} ${(x - WEEK * 0.4).toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
        : `M${x} ${y}`
    )
    .join("");
  const marks = [0, 50, 100, GAIN].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <figure className="pg-climb">
      <svg viewBox="0 0 720 440" role="img" aria-label={s.note}>
        {Array.from({ length: MP.weeks }, (_, i) => (
          <g key={i} className="wk" style={{ "--i": i } as React.CSSProperties}>
            {i % 2 ? null : (
              <rect
                className="band"
                x={X0 + i * WEEK}
                y={Y1 - 22}
                width={WEEK}
                height={Y0 - Y1 + 22}
                rx="10"
              />
            )}
            <text className="n" x={X0 + (i + 0.5) * WEEK} y={Y0 + 26} textAnchor="middle">
              {i + 1}
            </text>
            {/* the week's full test: a sheet that gets its tick as the line passes */}
            <g
              className="pg-test"
              transform={`translate(${(X0 + (i + 0.5) * WEEK - 9).toFixed(1)} ${Y0 + 42})`}
            >
              <rect width="18" height="23" rx="3.5" />
              <path className="ln" d="M4 6h10M4 10.5h10" />
              <path className="ok" d="M4.5 16l3 3 6-6.5" />
            </g>
            {/* its two live classes */}
            <circle className="cls" cx={X0 + (i + 0.27) * WEEK} cy={Y0 + 86} r="5" />
            <circle className="cls" cx={X0 + (i + 0.73) * WEEK} cy={Y0 + 86} r="5" />
          </g>
        ))}
        {marks.map((m) => (
          <g key={m}>
            <path className="g" d={`M${X0} ${yOf(m)}H${X1}`} />
            <text className="y" x={X0 - 10} y={yOf(m) + 4.5} textAnchor="end">
              {START + m}
            </text>
          </g>
        ))}
        <path className="sat" d={`M${X1} ${Y1 - 30}V${Y0}`} />
        <path className="a" d={`${line}L${X1} ${Y0}L${X0} ${Y0}Z`} />
        <path className="l" pathLength={1} d={line} />
        {pts.map(([x, y], i) => (
          <circle
            key={i}
            className="pt"
            cx={x}
            cy={y}
            r={i === MP.weeks ? 9 : 5}
            style={{ "--i": i } as React.CSSProperties}
          />
        ))}
        <text className="k" x={X0 - 10} y={Y0 + 26} textAnchor="end">
          {s.week}
        </text>
        <text className="k" x={X0 - 10} y={Y0 + 58} textAnchor="end">
          {s.test}
        </text>
        <text className="k" x={X0 - 10} y={Y0 + 90} textAnchor="end">
          {s.class}
        </text>
      </svg>
      <span className="pg-flag pg-from">
        {s.start} <b className="num">{START}</b>
      </span>
      <span className="pg-flag pg-to">
        {s.goal} <b className="num">{START + GAIN}</b>
      </span>
      <span className="pg-flag pg-sat">{s.sat}</span>
      <figcaption>{s.note}</figcaption>
    </figure>
  );
}

export default function ProgramSections() {
  const open = section(21);
  const climb = section(22);
  const portal = section(23);
  const promise = section(24);
  const close = section(27);
  const value = section(29);
  return (
    <>
      {/* 1. The outcome, and the switch: a starting score in, the promised points out */}
      <section className="pg-hero" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two">
          <div className="pg-say">
            <h1>{open.headline}</h1>
            <Actions />
          </div>
          <ProgramPromise
            ask={promise.ask}
            bands={list(promise.bands)}
            gains={G.bands.map((b) => b.cohort)}
            promise={promise.promise}
            highTitle={promise["high title"]}
            high={promise.high}
          />
        </div>
      </section>

      {/* 2. The nine weeks, as a climb */}
      <section className="sect pg-sect" id="week" aria-labelledby="week-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two pg-wide rv">
          <div className="pg-say">
            <h2 id="week-h">{climb.headline}</h2>
            <ol className="pg-moves">
              {pairs(climb.steps).map(([k, v]) => (
                <li key={k}>
                  <b>{k}</b>
                  <span>{v}</span>
                </li>
              ))}
            </ol>
          </div>
          <Climb />
        </div>
      </section>

      {/* 3. What the seat is worth, beside what the parent sees */}
      <section className="sect pg-sect" id="seat" aria-labelledby="seat-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id="seat-h">{value.headline}</h2>
            <div className="pg-bill">
              <ol>
                {value.rows.split("|").map((row, i) => {
                  const [title, detail, worth] = row.split("=").map((x) => x.trim());
                  return (
                    <li key={title} style={{ "--i": i } as React.CSSProperties}>
                      <p>
                        <b>{title}</b>
                        <span>{detail}</span>
                      </p>
                      <em className={/\d/.test(worth) ? "num" : undefined}>{worth}</em>
                    </li>
                  );
                })}
              </ol>
              <p className="pg-sum">
                <span>
                  {value["total label"]} <s className="num">{value.total}</s>
                </span>
                <span>
                  {value["price label"]} <b className="num">{value.price}</b>
                </span>
              </p>
            </div>
          </div>
          <div className="pg-say">
            <h3 className="pg-h3">{portal.headline}</h3>
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
        </div>
      </section>

      {/* 4. The promise's two sides, beside the place to start */}
      <section className="sect pg-sect pg-end" id="promise" aria-labelledby="promise-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id="promise-h">{promise.headline}</h2>
            <div className="pg-deal">
              <article className="pg-terms">
                <h3>{promise["ours title"]}</h3>
                <ul>
                  {list(promise.ours).map((x) => (
                    <li key={x}>
                      <Tick />
                      {x}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="pg-terms pg-theirs">
                <h3>{promise["terms title"]}</h3>
                <ul>
                  {list(promise.terms).map((x) => (
                    <li key={x}>
                      <Tick />
                      {x}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
            <p className="pg-small">
              {promise.grace} {promise.high}
            </p>
            <a className="more" href={ROUTES.guarantee}>
              {promise.link}
              <Arrow />
            </a>
          </div>
          <div className="pg-say" id="reserve">
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
        </div>
      </section>
    </>
  );
}
