// TEMPORARY (2026-11-12): the Private tutoring page's pricing section in five designs, for the founder to
// choose from (PrivateLab.tsx). Each is built on a different idea from pricing research and a different
// Mobbin layout:
//   1 Columns, dearest first, the recommended one raised (anchoring; WeTransfer, Dub)
//   2 Rows you pick, opening into a breakdown and the saving (default choice, loss framing; Duolingo, Hims)
//   3 The price of one session, three ways (unit price; Later)
//   4 "Everything in Private 10, plus" (stacking; Later)
//   5 One recommended card over two quiet rows (a single clear default; Chatbase)
// Every design ends on the same small step, a free call, with the promise beside the price. Words:
// site-copy.ts section 33; numbers: facts.ts. PricingRows.tsx holds the one design that needs the browser.
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { list, pairs, section } from "@/lib/marketing/site-copy";
import { PRIVATE_FACTS as F } from "./facts";
import PricingRows from "./PricingRows";

function Tick() {
  return (
    <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" />
      <path d="M5.5 10.5l3 3 6-7" />
    </svg>
  );
}

const Call = () => <Btn label={section(33).call} href="#call" />;

function Shell({ k, children }: { k: number; children: React.ReactNode }) {
  const s = section(33);
  return (
    <section className={`sect pg-sect pp pp-${k}`} id="packages" aria-labelledby="packages-h">
      <div className="mist" aria-hidden="true" />
      <div className="pg-in rv">
        <h2 id="packages-h">{s.headline}</h2>
        {children}
        <p className="pg-small pp-risk">{s.risk}</p>
      </div>
    </section>
  );
}

/** 1. Three columns, dearest first; Private 20 is raised under a coloured cap. */
function Columns() {
  const s = section(33);
  const col = (name: string, price: string, sub: string, rows: string, best = false) => (
    <article data-best={best || undefined}>
      {best ? <em>{s.best}</em> : null}
      <h3>{name}</h3>
      <p className="pp-price">
        <b className="num">{price}</b>
        <span>{sub}</span>
      </p>
      {best ? <Call /> : null}
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
  return (
    <Shell k={1}>
      <div className="pp-cols">
        {col(F.large.name, F.large.price, `${F.large.each} ${s.per}`, s["large rows"], true)}
        {col(F.small.name, F.small.price, `${F.small.each} ${s.per}`, s["small rows"])}
        {col(s["cohort name"], F.cohort.price, "", s["cohort rows"])}
      </div>
    </Shell>
  );
}

/** 3. What one session costs, three ways: singly, in ten, in twenty. */
function PerSession() {
  const s = section(33);
  const bar = (label: string, each: string, note: string, share: number, best = false) => (
    <li data-best={best || undefined} style={{ "--v": share } as React.CSSProperties}>
      <span>{label}</span>
      <i />
      <b className="num">{each}</b>
      <em>{note}</em>
    </li>
  );
  return (
    <Shell k={3}>
      <div className="pp-unit">
        <ol>
          {bar(s["more one"] ?? "One at a time", F.extra, s.per, 1)}
          {bar(
            F.small.name,
            F.small.each,
            `${F.small.price}, ${F.small.sessions} ${s.sessions}`,
            1
          )}
          {bar(
            F.large.name,
            F.large.each,
            `${F.large.price}, ${F.large.sessions} ${s.sessions}`,
            0.834,
            true
          )}
        </ol>
        <div className="pp-say">
          <p>
            {s.save} <b className="num">{F.saved}</b>
          </p>
          <span>{s.single}</span>
          <Call />
        </div>
      </div>
    </Shell>
  );
}

/** 4. Two cards; the second is the first, plus. */
function Plus() {
  const s = section(33);
  return (
    <Shell k={4}>
      <div className="pp-plus">
        <article>
          <h3>{F.small.name}</h3>
          <p className="pp-price">
            <b className="num">{F.small.price}</b>
            <span>
              {F.small.sessions} {s.sessions}
            </span>
          </p>
          <ul>
            {[...pairs(s["small rows"]).map(([, v]) => v), ...list(s.both)].map((x) => (
              <li key={x}>
                <Tick />
                {x}
              </li>
            ))}
          </ul>
        </article>
        <span className="pp-join" aria-hidden="true">
          +
        </span>
        <article data-best>
          <em>{s.best}</em>
          <h3>{F.large.name}</h3>
          <p className="pp-price">
            <b className="num">{F.large.price}</b>
            <span>
              {F.large.sessions} {s.sessions}
            </span>
          </p>
          <p className="pp-lead">{s.plus}</p>
          <ul>
            {list(s["plus rows"]).map((x) => (
              <li key={x}>
                <Tick />
                {x}
              </li>
            ))}
          </ul>
          <Call />
        </article>
      </div>
    </Shell>
  );
}

/** 5. One recommended card, then two quiet rows. */
function OneDefault() {
  const s = section(33);
  return (
    <Shell k={5}>
      <div className="pp-one">
        <article data-best>
          <div>
            <em>{s.best}</em>
            <h3>{F.large.name}</h3>
            <p className="pp-price">
              <b className="num">{F.large.price}</b>
              <span>
                {F.large.sessions} {s.sessions}, {F.large.each} {s.per}
              </span>
            </p>
            <Call />
          </div>
          <ul>
            {[...pairs(s["large rows"]).map(([, v]) => v), ...list(s.both)].map((x) => (
              <li key={x}>
                <Tick />
                {x}
              </li>
            ))}
          </ul>
        </article>
        <a className="pp-row" href="#call">
          <b>{F.small.name}</b>
          <span>
            {pairs(s["small rows"])
              .map(([, v]) => v)
              .join(" · ")}
          </span>
          <strong className="num">{F.small.price}</strong>
          <Arrow />
        </a>
        <a className="pp-row" href={ROUTES.program}>
          <b>{s["cohort name"]}</b>
          <span>
            {pairs(s["cohort rows"])
              .map(([, v]) => v)
              .join(" · ")}
          </span>
          <strong className="num">{F.cohort.price}</strong>
          <Arrow />
        </a>
      </div>
    </Shell>
  );
}

/** The five designs, in order. */
export function pricingDesigns() {
  const s = section(33);
  return [
    <Columns key={1} />,
    <Shell key={2} k={2}>
      <PricingRows
        choose={s.choose}
        best={s.best}
        per={s.per}
        sessionsWord={s.sessions}
        single={s.single}
        save={s.save}
        call={s.call}
        both={list(s.both)}
        packs={[
          { ...F.large, rows: pairs(s["large rows"]), saved: F.saved, singly: F.single },
          { ...F.small, rows: pairs(s["small rows"]) },
        ]}
      />
    </Shell>,
    <PerSession key={3} />,
    <Plus key={4} />,
    <OneDefault key={5} />,
  ];
}
