// The Private tutoring page (2026-11-12): four screens on a desktop, in the home page's design language,
// following the SAT Program page. 1: the outcome, and the promise by starting score. 2: a session, beside a
// week of open slots with one being booked (the family picks the hour). 3: the two packages side by side.
// 4: the promise's two sides, beside the form to schedule a free call. Words: site-copy.ts, sections 31 to
// 33, 35 and 36. Only the switch and the form run in the browser.
import LeadFormCard from "@/components/site/LeadFormCard";
import { Arrow, Btn } from "@/components/site/parts";
import ProgramPromise from "@/components/site/program/ProgramPromise";
import { ROUTES } from "@/components/site/routes";
import { GUARANTEE as G } from "@/lib/marketing/offer";
import { list, pairs, section } from "@/lib/marketing/site-copy";

function Tick() {
  return (
    <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

/* which slots of the week are open (day, time), and the one that gets booked */
const OPEN = ["0-1", "0-3", "1-0", "2-2", "3-1", "3-2", "4-0", "5-1", "5-2", "6-3"];
const PICK = "3-2";

/** A week of the tutor's open hours; one of them is picked and becomes the family's. */
function Slots() {
  const s = section(32);
  const days = list(s.days);
  const times = list(s.times);
  return (
    <figure className="pv-cal" aria-hidden="true">
      <div className="pv-grid" style={{ "--d": days.length } as React.CSSProperties}>
        <span />
        {days.map((d) => (
          <b key={d}>{d}</b>
        ))}
        {times.map((t, r) => [
          <em key={t}>{t}</em>,
          ...days.map((d, c) => {
            const id = `${c}-${r}`;
            const state = id === PICK ? "pick" : OPEN.includes(id) ? "open" : undefined;
            return (
              <i key={id} data-s={state}>
                {state === "pick" ? <u>{s.yours}</u> : state ? s.open : null}
              </i>
            );
          }),
        ])}
        <span className="pv-hand" />
      </div>
      <p className="pv-done">
        <Tick />
        {s.picked}
      </p>
      <figcaption>{s.move}</figcaption>
    </figure>
  );
}

function Pack({ head, rows, best }: { head: string; rows: string; best?: string }) {
  const [name, rest = ""] = head.split(" = ");
  const [count, price] = rest.split(", ");
  return (
    <article className="pv-pack" data-best={best ? "" : undefined}>
      {best ? <em>{best}</em> : null}
      <h3>{name}</h3>
      <p className="pv-price">
        <b className="num">{price}</b>
        <span>{count}</span>
      </p>
      <dl>
        {pairs(rows).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export default function PrivateSections() {
  const open = section(31);
  const session = section(32);
  const packs = section(33);
  const promise = section(35);
  return (
    <>
      {/* 1. The outcome, and the promise by starting score */}
      <section className="pg-hero" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two">
          <div className="pg-say">
            <h1>{open.headline}</h1>
            <div className="pg-close">
              <div className="go-row">
                <Btn label={open.button} href="#call" />
                <a className="more" href="#packages">
                  {open["second button"]}
                  <Arrow />
                </a>
              </div>
              <p className="fine">{open.note}</p>
            </div>
          </div>
          <ProgramPromise
            ask={open.ask}
            bands={[
              ...G.bands.map((b, i) =>
                i === 0 ? `Up to ${b.upTo}` : `${G.bands[i - 1].upTo + 10} to ${b.upTo}`
              ),
              `${G.noGuaranteeFrom} and up`,
            ]}
            gains={G.bands.map((b) => b.private)}
            promise={open.promise}
            highTitle={open["high title"]}
            high={open.high}
          />
        </div>
      </section>

      {/* 2. A session, on the family's calendar */}
      <section className="sect pg-sect" id="session" aria-labelledby="session-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id="session-h">{session.headline}</h2>
            <ol className="pg-moves">
              {pairs(session.steps).map(([k, v]) => (
                <li key={k}>
                  <b>{k}</b>
                  <span>{v}</span>
                </li>
              ))}
            </ol>
          </div>
          <Slots />
        </div>
      </section>

      {/* 3. The two packages */}
      <section className="sect pg-sect" id="packages" aria-labelledby="packages-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in rv">
          <h2 id="packages-h">{packs.headline}</h2>
          <div className="pv-packs">
            <Pack head={packs["small package"]} rows={packs["small rows"]} />
            <Pack head={packs["large package"]} rows={packs["large rows"]} best={packs.best} />
            <div className="pv-both">
              <ul>
                {list(packs.both).map((x) => (
                  <li key={x}>
                    <Tick />
                    {x}
                  </li>
                ))}
              </ul>
              <p className="pg-small">{packs.cohort}</p>
              <a className="more" href={ROUTES.program}>
                {packs["cohort link"]}
                <Arrow />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 4. The promise's two sides, beside the free call */}
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
            <p className="pg-small">{promise.grace}</p>
            <a className="more" href={ROUTES.guarantee}>
              {promise.link}
              <Arrow />
            </a>
          </div>
          <div className="pv-call">
            <h3 className="pg-h3">{section(36).headline}</h3>
            <p className="pg-small">{open.note}</p>
            <LeadFormCard n={36} form="call" anchor="call" />
          </div>
        </div>
      </section>
    </>
  );
}
