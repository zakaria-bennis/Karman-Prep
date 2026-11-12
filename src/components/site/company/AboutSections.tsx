// The About page, in the home page's world (founder, 2026-11-11: every page "relates to the home page", and the
// landscape keeps travelling from one page to the next). Built on the SAT Program page's frame (program.css):
// big serif headings on mist, rounded cream cards, Start free as the main action. 1: the claim and the track
// record. 2: three things we refuse to do, struck out as they arrive. 3: how we teach, as a loop. 4: the rules
// we hold our own marketing to. 5: the close. Words: site-copy.ts, sections 61 to 65. Styles: company.css.
import type { CSSProperties } from "react";
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { list, pairs, section } from "@/lib/marketing/site-copy";
import { Close, Tick } from "./parts";

export default function AboutSections() {
  const open = section(61);
  const refuse = section(62);
  const how = section(63);
  const rules = section(64);
  const close = section(65);
  return (
    <>
      {/* 1. The claim, beside the track record and where it comes from */}
      <section className="pg-hero" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two co-in">
          <div className="pg-say">
            <h1>{open.headline}</h1>
            <p className="lede">{open.text}</p>
            <div className="pg-close">
              <div className="go-row">
                <Btn label={open.button} href={ROUTES.signUp} />
                <a className="more" href="#how">
                  {open["second button"]}
                  <Arrow />
                </a>
              </div>
            </div>
          </div>
          <figure className="co-card ab-stat">
            <b className="num">{open.stat}</b>
            <svg
              className="ab-swoosh"
              viewBox="0 0 240 24"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path pathLength={1} d="M4 16C46 6 88 20 128 11s74-4 108 1" />
            </svg>
            <figcaption>
              <span>{open["stat label"]}</span>
              <small>{open["stat source"]}</small>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 2. Three things we refuse to do: each title is struck out as its card arrives */}
      <section className="sect pg-sect" id="refuse" aria-labelledby="refuse-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in co-stack rv">
          <h2 id="refuse-h">{refuse.headline}</h2>
          <ul className="ab-refuse">
            {pairs(refuse.rows).map(([title, instead], k) => (
              <li className="co-card" key={title} style={{ "--k": k } as CSSProperties}>
                <h3>
                  <s>{title}</s>
                </h3>
                <p>{instead}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. How we teach: the words, beside the loop every mistake goes round */}
      <section className="sect pg-sect" id="how" aria-labelledby="how-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two co-in rv">
          <div className="pg-say">
            <h2 id="how-h">{how.headline}</h2>
            <p className="lede">{how.text}</p>
            <p className="pg-small">{how.proof}</p>
            <a className="more" href={ROUTES.research}>
              {how.link}
              <Arrow />
            </a>
          </div>
          <div className="co-card ab-loop">
            <svg viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M38 98C2 98 2 2 38 2" />
            </svg>
            <ol className="pg-moves">
              {pairs(how.loop).map(([k, v]) => (
                <li key={k}>
                  <b>{k}</b>
                  <span>{v}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 4. The rules we hold our own marketing to */}
      <section className="sect pg-sect" id="rules" aria-labelledby="rules-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two co-in rv">
          <div className="pg-say">
            <h2 id="rules-h">{rules.headline}</h2>
            <p className="pg-note">{rules.note}</p>
          </div>
          <div className="pg-terms ab-rules">
            <ul>
              {list(rules.list).map((x) => (
                <li key={x}>
                  <Tick />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Close
        id="start"
        headline={close.headline}
        text={close.text}
        button={close.button}
        second={{ label: close["second button"], href: ROUTES.test }}
      />
    </>
  );
}
