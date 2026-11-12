// The guarantee's whole deal, in the SAT Program page's language (program.css: pg-deal, pg-terms, pg-tick):
// our side on the dark card, the student's side on the cream one, then who it covers and how to claim.
// Shared by the pricing page and the guarantee page, so the rules are the same words on both. Words:
// site-copy.ts section 8.
import type { ReactNode } from "react";
import { list, section } from "@/lib/marketing/site-copy";
import { Tick } from "@/components/site/company/parts";
import RefundSteps from "./RefundSteps";

export default function GuaranteeTerms() {
  const g = section(8);
  const covers = list(g.covers);
  return (
    <div className="dl-terms">
      <div className="pg-deal">
        <article className="pg-terms">
          <h3>{g["we do title"]}</h3>
          <ul>
            {list(g["we do"]).map((x) => (
              <li key={x}>
                <Tick />
                {x}
              </li>
            ))}
          </ul>
        </article>
        <article className="pg-terms pg-theirs">
          <h3>{g["you do title"]}</h3>
          <ul>
            {list(g["you do"]).map((x) => (
              <li key={x}>
                <Tick />
                {x}
              </li>
            ))}
          </ul>
        </article>
      </div>
      <ul className="dl-covers">
        {covers.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <p className="pg-small">{g.claim}</p>
    </div>
  );
}

/** The guarantee as one section: the words beside what comes back (RefundSteps), then both sides of the
 *  deal. The pricing page passes its own headline and text; the guarantee page uses section 8's. */
export function DealSection({
  id,
  headline,
  text,
  after,
}: {
  id: string;
  headline: string;
  text: string;
  /** A link under the words. */
  after?: ReactNode;
}) {
  return (
    <section className="sect pg-sect co-tall" id={id} aria-labelledby={`${id}-h`}>
      <div className="mist" aria-hidden="true" />
      <div className="pg-in co-in co-stack">
        <div className="pg-in pg-two rv">
          <div className="pg-say">
            <h2 id={`${id}-h`}>{headline}</h2>
            <p className="lede">{text}</p>
            <p className="pg-small">{section(8)["promise note"]}</p>
            {after}
          </div>
          <RefundSteps />
        </div>
        <div className="rv">
          <GuaranteeTerms />
        </div>
      </div>
    </section>
  );
}
