// The pricing page, in the home page's world (founder, 2026-11-12), on the SAT Program page's frame like
// About and the FAQ. 1: the headline, when to start, and the three ways to pay (PricingPlans). 2: the
// guarantee, as what comes back by score beside its words, then both sides of the deal (DealSection).
// 3: everything side by side (PricingCompare). 4: schools and tutors, beside the honest notes. Every price
// comes from offer.ts, every word from site-copy.ts. Styles: deal.css.
import type { CSSProperties } from "react";
import { Arrow } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { pairs, SITE } from "@/lib/marketing/site-copy";
import { DealSection } from "./GuaranteeTerms";
import PricingCompare from "./PricingCompare";
import PricingPlans from "./PricingPlans";

export default function PricingSections() {
  const S = (k: string) => SITE[`pricing ${k}`];
  return (
    <>
      <PricingPlans />

      <DealSection
        id="guarantee"
        headline={S("guarantee headline")}
        text={S("guarantee text")}
        after={
          <a className="more" href={ROUTES.guarantee}>
            {S("guarantee link")}
            <Arrow />
          </a>
        }
      />

      <section className="sect pg-sect" id="compare" aria-labelledby="compare-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in co-stack rv">
          <h2 id="compare-h">{S("compare title")}</h2>
          <PricingCompare />
        </div>
      </section>

      <section className="sect pg-sect" id="more" aria-labelledby="more-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two co-in rv">
          <div className="pg-say">
            <h2 id="more-h">{S("more")}</h2>
            <dl className="co-card dl-rows">
              {pairs(`${S("schools")} | ${S("tutors")}`).map(([name, text], i) => (
                <div key={name} style={{ "--i": i } as CSSProperties}>
                  <dt>
                    <a href={i === 0 ? ROUTES.schools : ROUTES.tutors}>{name}</a>
                  </dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            <p className="pg-small">{S("renewal")}</p>
          </div>
          <div className="dl-notes">
            <p className="co-card">{S("honest note")}</p>
            <p className="pg-bonus">{S("scholarship")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
