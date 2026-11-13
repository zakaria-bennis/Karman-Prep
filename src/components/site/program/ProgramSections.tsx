// The SAT Program page (founder, 2026-11-11): four screens on a desktop, in the home page's design language
// (big serif headings on the left, on mist, with the picture beside them). 1: the outcome and the
// starting-score switch. 2: the nine weeks as a score climb with a
// travelling marker (ScoreClimb.tsx). 3: what the seat is worth at Karman's own prices, beside a turning deck of parent-portal views (PortalDeck.tsx). 4: the promise's two
// sides, beside the "start here" box. Words: site-copy.ts, sections 21 to 24, 27 and 29. Only the small
// interactive pieces run in the browser, and they get their facts and words as props.
import { Arrow, Btn } from "@/components/site/parts";
import TimeLeft from "./TimeLeft";
import ScoreClimb from "./ScoreClimb";
import PortalDeck from "./PortalDeck";
import ProgramPromise from "./ProgramPromise";
import HeroLab from "@/components/site/hero/HeroLab";
import { ROUTES } from "@/components/site/routes";
import { GUARANTEE as G, guaranteedGain, MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { list, pairs, section, SITE } from "@/lib/marketing/site-copy";

function Tick() {
  return (
    <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

/** The student whose portal the deck shows (founder: a 1370 start), and the cohort's promise for that start. */
const PARENT_START = 1370;
const PARENT_GAIN = guaranteedGain(PARENT_START, "cohort") ?? 0;

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
      <HeroLab
        page="program"
        headline={open.headline}
        primary={{ label: open.button, href: ROUTES.pricing }}
        secondary={{ label: open["second button"], href: "#promise" }}
      >
        <ProgramPromise
          ask={promise.ask}
          bands={list(promise.bands)}
          gains={G.bands.map((b) => b.cohort)}
          promise={promise.promise}
          highTitle={promise["high title"]}
          high={promise.high}
        />
      </HeroLab>

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
          <ScoreClimb
            start={G.bands[0].upTo - 50}
            gain={G.bands[0].cohort}
            weeks={MP.weeks}
            words={{ start: climb.start, goal: climb.goal, test: climb.test, note: climb.note }}
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
                    <path d="M3 17L117 13" />
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
            <PortalDeck
              w={{
                titles: list(portal.titles),
                captions: list(portal.captions),
                homework: pairs(portal.homework),
                skills: pairs(portal.skills),
                score: {
                  startLabel: portal["score start"],
                  start: PARENT_START,
                  nowLabel: portal["score now"],
                  now: PARENT_START + PARENT_GAIN / 2,
                  goalLabel: portal["score goal"],
                  goal: PARENT_START + PARENT_GAIN,
                },
                days: list(portal.days),
                minutes: [35, 20, 45, 30, 25, 60, 15],
                timeTotal: `3 h 50 min ${portal.time}`,
                note: portal.note,
                noteFrom: portal["note from"],
                brand: SITE.logo,
                student: portal.student,
                initials: portal.initials,
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
                label={open["clock label"]}
                units={list(open.clock)}
              />
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
