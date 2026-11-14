// The guarantee page, in the home page's world (founder, 2026-11-12: every page matches the home page), built
// on the SAT Program page's frame (program.css: pg-hero, pg-sect, pg-two) like About and the FAQ.
// 1: the promise, beside the target for every starting score as a chart you can point at (TargetChart).
// 2: what comes back, as a staircase of money (RefundSteps), then both sides of the deal (GuaranteeTerms).
// 3: five students, each placed on the three endings (ExampleTrack). 4: private tutoring and what isn't
// covered. 5: what you won't find in our terms, struck out. 6: claiming. Words: site-copy.ts sections 8 and
// 51 to 56, word for word; numbers: offer.ts. Styles: deal.css.
import type { CSSProperties } from "react";
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { Close } from "@/components/site/company/parts";
import { GUARANTEE as G, PRIVATE_PACKAGES } from "@/lib/marketing/offer";
import { list, pairs, section } from "@/lib/marketing/site-copy";
import ExampleTrack from "./ExampleTrack";
import { DealSection } from "./GuaranteeTerms";
import TargetChart, { type TargetBand } from "./TargetChart";

/** The bands of section 56, with the points each track promises from offer.ts. */
export function targetBands(): TargetBand[] {
  return pairs(section(56).rows).map(([label, text], i) => {
    const b = G.bands[i];
    return b ? { label, text, cohort: b.cohort, private: b.private } : { label, text };
  });
}

/** `opening` is off while the trial openings stand in for the first section (GuaranteeOpeners.tsx). */
export default function GuaranteeSections({ opening = true }: { opening?: boolean }) {
  const open = section(51);
  const deal = section(8);
  const examples = section(52);
  const refuse = section(53);
  const priv = section(54);
  const claim = section(55);
  const targets = section(56);
  const [P10, P20] = PRIVATE_PACKAGES;
  return (
    <>
      {/* 1. The promise, beside the target for each starting score */}
      {opening ? (
        <section className="pg-hero" id="top">
          <div className="mist" aria-hidden="true" />
          <div className="pg-in pg-two co-in">
            <div className="pg-say">
              <h1>{open.headline}</h1>
              <p className="lede">{open.text}</p>
              <div className="pg-close">
                <div className="go-row">
                  <Btn label={claim.button} href={ROUTES.test} />
                  <a className="more" href="#examples">
                    {deal.link}
                    <Arrow />
                  </a>
                </div>
              </div>
            </div>
            <div className="pg-say">
              <h2 className="pg-h3">{targets.headline}</h2>
              <TargetChart
                bands={targetBands()}
                legend={[`The cohort and ${P10.name}`, P20.name]}
                ask={section(24).ask}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* 2. What comes back, by score, then both sides of the deal */}
      <DealSection id="deal" headline={deal.headline} text={deal.text} />

      {/* 3. Five students, each placed on the three endings */}
      <section className="sect pg-sect" id="examples" aria-labelledby="examples-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in co-stack rv">
          <h2 id="examples-h">{examples.headline}</h2>
          <ExampleTrack />
        </div>
      </section>

      {/* 4. Private tutoring, and what isn't covered */}
      <section className="sect pg-sect" id="private" aria-labelledby="private-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two co-in rv">
          <div className="pg-say">
            <h2 id="private-h">{priv.headline}</h2>
          </div>
          <dl className="co-card dl-rows">
            {pairs(priv.rows).map(([k, v], i) => (
              <div key={k} style={{ "--i": i } as CSSProperties}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 5. What you won't find in our terms: each one struck out as it arrives */}
      <section className="sect pg-sect" id="refuse" aria-labelledby="refuse-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in co-stack rv">
          <h2 id="refuse-h">{refuse.headline}</h2>
          <ul className="ab-refuse dl-refuse">
            {list(refuse.list).map((x, k) => (
              <li className="co-card" key={x} style={{ "--k": k } as CSSProperties}>
                <h3>
                  <s>{x}</s>
                </h3>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Close
        id="claim"
        headline={claim.headline}
        text={claim.text}
        button={claim.button}
        href={ROUTES.test}
      />
    </>
  );
}
