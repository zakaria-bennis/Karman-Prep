// The five worked examples, each placed on the guarantee's three endings. One row per student: the
// starting score and the SAT, then a lane from no gain to past the target, shaded by ending (all back, half
// back, kept), with the student's dot sliding to where their gain landed against their own target. The
// gains and targets are worked out from offer.ts (guaranteedGain), so the picture and the words cannot drift
// apart. Words: site-copy.ts sections 8 and 52.
import type { CSSProperties } from "react";
import { guaranteedGain } from "@/lib/marketing/offer";
import { pairs, section } from "@/lib/marketing/site-copy";

/** The lane runs from no gain to one and a half times the target: half the target sits at a third, the
 *  target at two thirds (deal.css draws the three endings at those marks). */
const SPAN = 1.5;

/** "Baseline 1180, SAT 1340" -> the gain, the cohort target and where it lands on the lane (0 to 1). */
export function placeExample(label: string) {
  const m = label.match(/Baseline (\d{3,4}), SAT (\d{3,4})/);
  if (!m) return null;
  const [base, sat] = [Number(m[1]), Number(m[2])];
  const target = guaranteedGain(base, "cohort");
  if (!target) return null;
  const gain = sat - base;
  return { base, sat, gain, target, at: Math.max(0, Math.min(1, gain / target / SPAN)) };
}

export default function ExampleTrack() {
  const zones = pairs(section(8).outcomes)
    .map(([r]) => r)
    .reverse();
  const rows = pairs(section(52).rows);
  return (
    <div className="co-card dl-track">
      <p className="dl-zones" aria-hidden="true">
        {zones.map((z) => (
          <span key={z}>{z}</span>
        ))}
      </p>
      <ol>
        {rows.map(([label, out], k) => {
          const p = placeExample(label);
          return (
            <li key={label} style={{ "--k": k } as CSSProperties}>
              <p className="dl-who">
                <b>{label}</b>
                <span>{out}</span>
              </p>
              {p ? (
                <span className="dl-lane" aria-hidden="true">
                  <i style={{ "--x": p.at } as CSSProperties}>
                    <em className="num">+{p.gain}</em>
                  </i>
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
