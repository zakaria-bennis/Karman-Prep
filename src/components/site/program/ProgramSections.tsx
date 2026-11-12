// The SAT Program page (founder, 2026-11-11): four screens on a desktop, in the home page's design language
// (big serif headings on the left, on mist, with the picture beside them). 1: the outcome and the
// starting-score switch. 2: how a week works, with the week's test and its fixes (WeekFix.tsx). 3: what the seat is worth at Karman's own prices, beside the parent portal. 4: the promise's two
// sides, beside the "start here" box. Words: site-copy.ts, sections 21 to 24, 27 and 29. Only the small
// interactive pieces run in the browser, and they get their facts and words as props.
import { Arrow, Btn } from "@/components/site/parts";
import TimeLeft from "./TimeLeft";
import WeekFix from "./WeekFix";
import ProgramPortal from "./ProgramPortal";
import ProgramPromise from "./ProgramPromise";
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
      <p className="fine">
        {s.closes} {s.starts}
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
          <WeekFix
            sheet={climb.sheet}
            week={climb.week}
            of={climb.of}
            fix={climb.fix}
            skills={list(climb.skills)}
            clear={climb.clear}
          />
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
                <span className="pg-was">
                  <s className="num">{value.total}</s>
                  <svg viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M3 21C22 9 34 24 52 13s26 11 40-1 16 6 25-3" />
                  </svg>
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
              first={2}
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
            <div className="pg-start">
              <TimeLeft
                until={MP.enrollmentCloses}
                words={list(open.timer) as [string, string, string]}
              />
              <p className="pg-h3">{open.closes}</p>
              <p className="lede">{open.starts}</p>
              <div className="go-row">
                <Btn label={open.button} href={ROUTES.pricing} />
              </div>
            </div>
            <p className="pg-bonus">{close.bonus}</p>
            <p className="pg-small">{close.later}</p>
          </div>
        </div>
      </section>
    </>
  );
}
