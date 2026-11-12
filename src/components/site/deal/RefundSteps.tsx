// "What you get back, by score": the cohort guarantee's three endings as a staircase of money back. Left to
// right the score climbs against the target; each column's bar is what comes back (the full price, half of
// it, nothing because the promise was kept), with the ending's own words under it. The bars rise in turn
// when the section arrives (deal.css). Amounts come from offer.ts, words from site-copy.ts section 8.
import type { CSSProperties } from "react";
import { formatPrice, MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { pairs, section } from "@/lib/marketing/site-copy";

/** "$995", or "$497.50" when there are cents (the way the guarantee's own words write half the price). */
export const usd = (n: number) =>
  Number.isInteger(n)
    ? formatPrice(n)
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RefundSteps() {
  // section 8 lists the endings best first; the staircase reads from the lowest score up
  const endings = pairs(section(8).outcomes).reverse();
  const back = [MP.price, MP.price / 2, 0];
  return (
    <figure className="co-card dl-steps">
      <ol>
        {endings.map(([result, what], k) => (
          <li key={result} style={{ "--k": k, "--v": back[k] / MP.price } as CSSProperties}>
            <p className="dl-amt">
              {back[k] ? (
                <b className="num">{usd(back[k])}</b>
              ) : (
                <svg className="pg-tick dl-kept" viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" />
                  <path d="M5.5 10.5l3 3 6-7" />
                </svg>
              )}
            </p>
            <span className="dl-bar" aria-hidden="true">
              <i />
            </span>
            <h3>{result}</h3>
            <p className="dl-what">{what}</p>
          </li>
        ))}
      </ol>
    </figure>
  );
}
