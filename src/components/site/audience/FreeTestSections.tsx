// The Free practice test page (founder, 2026-11-11: every page in the home page's world), for parents.
// Three screens on a desktop, in the SAT Program page's language: 1, the offer and Start free, beside how the
// sitting runs as a rail a marker travels down; 2, what comes back, beside a drawn sample score report
// (made-up numbers, labelled as such); 3, the honest note and Start free, beside the form that emails the
// test link (LeadFormCard, posting through the existing lead action, unchanged). Start free stays the main
// action. Never call the test "official". Words: site-copy.ts sections 41 to 45.
import type { CSSProperties } from "react";
import CountUp from "@/components/site/CountUp";
import LeadFormCard from "@/components/site/LeadFormCard";
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { list, pairs, section, SITE } from "@/lib/marketing/site-copy";
import { TickCard } from "./bits";

/** The sample report's made-up student: section scores, and how full each domain's bar is. */
const SAMPLE = { scores: [600, 580], fills: [0.78, 0.66, 0.72, 0.46, 0.7, 0.52, 0.61, 0.38] };

function Report() {
  const r = section(43);
  const sections = list(r.sections);
  const domains = list(r.domains);
  const weakest = SAMPLE.fills.indexOf(Math.min(...SAMPLE.fills));
  const half = Math.ceil(domains.length / 2);
  return (
    <figure className="au-report">
      <header>
        <b>{SITE.logo}</b>
        <span className="au-chip">{r.score}</span>
      </header>
      <div className="au-report-top">
        {/* The scores count up as the report arrives, with the domain bars filling beside them. */}
        <CountUp>{SAMPLE.scores[0] + SAMPLE.scores[1]}</CountUp>
        <p>
          {sections.map((s, i) => (
            <span key={s}>
              {s} <CountUp>{SAMPLE.scores[i]}</CountUp>
            </span>
          ))}
        </p>
      </div>
      <div className="au-domains">
        {[0, 1].map((col) => (
          <ul key={col} aria-label={sections[col]}>
            {domains.slice(col * half, col * half + half).map((d, j) => {
              const i = col * half + j;
              return (
                <li
                  key={d}
                  data-low={i === weakest || undefined}
                  style={{ "--v": SAMPLE.fills[i], "--i": i } as CSSProperties}
                >
                  <span>{d}</span>
                  <i />
                  {i === weakest ? <em>{r.weakest}</em> : null}
                </li>
              );
            })}
          </ul>
        ))}
      </div>
      <p className="au-report-call">
        <span aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h6A2.5 2.5 0 0 1 14 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 3 14.5zM14 8.5l3.5-2v7l-3.5-2" />
          </svg>
        </span>
        {r.call}
      </p>
      <figcaption>{r.sample}</figcaption>
    </figure>
  );
}

/** How the sitting runs: four stops on a rail, a marker travelling down it; the two timed sections show
 *  their two modules each. */
function Rail() {
  const s = section(44);
  const stops = pairs(s.rows);
  return (
    <div className="au-rail">
      <ol>
        {stops.map(([k, v], i) => (
          <li key={k} style={{ "--i": i } as CSSProperties}>
            <b>{k}</b>
            <span>{v}</span>
            {i === 1 || i === 2 ? (
              <span className="au-mods" aria-hidden="true">
                <i>{s.module} 1</i>
                <i>{s.module} 2</i>
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="au-rail-total">{s.total}</p>
    </div>
  );
}

export default function FreeTestSections() {
  const open = section(41);
  const form = section(42);
  const back = section(43);
  const runs = section(44);
  const note = section(45);
  return (
    <>
      {/* 1. The offer and Start free, beside how the sitting runs */}
      <section className="pg-hero au-hero" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two">
          <div className="pg-say">
            <h1>{open.headline}</h1>
            <p className="lede">{open.text}</p>
            <div className="pg-close">
              <div className="go-row">
                <Btn label={open.button} href={ROUTES.start} />
                <a className="more" href="#seat">
                  {open["second button"]}
                  <Arrow />
                </a>
              </div>
            </div>
            <dl className="au-facts">
              {pairs(open.facts).map(([a, b]) => (
                <div key={a}>
                  <dt>{a}</dt>
                  <dd>{b}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="pg-say">
            <h2 className="pg-h3">{runs.headline}</h2>
            <Rail />
          </div>
        </div>
      </section>

      {/* 2. What comes back, beside a sample report */}
      <section className="sect pg-sect" id="report" aria-labelledby="report-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id="report-h">{back.headline}</h2>
            <TickCard rows={pairs(back.rows)} />
          </div>
          <Report />
        </div>
      </section>

      {/* 3. The honest note and Start free, beside the form that emails the link */}
      <section className="sect pg-sect pg-end" id="close" aria-labelledby="close-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id="close-h">{note.headline}</h2>
            <p className="lede">{note.text}</p>
            <div className="go-row">
              <Btn label={note.button} href={ROUTES.start} />
            </div>
            <p className="fine">{note["button note"]}</p>
          </div>
          <LeadFormCard
            n={42}
            form="seat"
            anchor="seat"
            heading={form.headline}
            className="au-form"
          />
        </div>
      </section>
    </>
  );
}
