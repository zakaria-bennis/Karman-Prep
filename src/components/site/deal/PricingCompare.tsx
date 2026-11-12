"use client";

// Everything side by side: what each way to pay includes, line by line, on one cream card (deal.css). Open on
// a wide screen; folded on a phone, where the table scrolls inside its card. Numbers come from offer.ts.
import { useEffect, useState } from "react";
import {
  formatPrice as money,
  GUARANTEE as G,
  guaranteeMax,
  MARCH_PROGRAM as MP,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
} from "@/lib/marketing/offer";
import { numberWord, SITE } from "@/lib/marketing/site-copy";

const SELF = [PRACTICE_PLAN, PRO_PLAN] as const;
const CLASS = MP.paidSeats;

/** What each option includes: Practice and Pro, cohort, private ("" = not included). */
export const COMPARE: [string, string, string, string][] = [
  [
    `Live classes in a group of up to ${numberWord(CLASS)}`,
    "",
    `Two a week, ${MP.totalClasses} in all, ${MP.classMinutes} minutes each`,
    "",
  ],
  [
    "One-on-one time with a Karman tutor",
    "",
    "",
    `Every session, ${PRIVATE_PACKAGES.map((p) => p.hours).join(" or ")} hours`,
  ],
  [
    "Questions",
    `${PRACTICE_PLAN.name}: the core pool. ${PRO_PLAN.name}: every question, mastery included`,
    "Every question, mastery included",
    "Every question, mastery included",
  ],
  [
    "Explanations",
    `${PRACTICE_PLAN.name}: written. ${PRO_PLAN.name}: written, plus video as it's recorded`,
    "Written, plus video as it's recorded",
    "Written, plus video as it's recorded",
  ],
  [
    "Full-length practice tests",
    "On the platform",
    "Five, each in one timed sitting",
    "On the platform",
  ],
  ["The weekly live session", "", "yes", "yes"],
  ["The Daily 10", "yes", "yes", "yes"],
  ["Cohort group chat, answered by a tutor every day", "", "yes", ""],
  ["Progress for parents", "On their phone", "Every week", "After every session"],
  [
    "The guarantee, set by the starting score",
    "",
    `Up to +${guaranteeMax("cohort")} points. Money back or the next cohort free`,
    `${PRIVATE_PACKAGES[0].name}: up to +${guaranteeMax("cohort")}, half back or ${G.private.packages["private-10"].freeSessions} free sessions. ${PRIVATE_PACKAGES[1].name}: up to +${guaranteeMax("private")}, half back or ${G.private.packages["private-20"].freeSessions} free sessions`,
  ],
];

function Cell({ v }: { v: string }) {
  if (v === "yes")
    return (
      <span className="dl-yes">
        <svg className="pg-tick" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="10" />
          <path d="M5.5 10.5l3 3 6-7" />
        </svg>
        <span className="sr">Included</span>
      </span>
    );
  if (v) return <>{v}</>;
  return (
    <span className="dl-no">
      <i aria-hidden="true" />
      <span className="sr">Not included</span>
    </span>
  );
}

export default function PricingCompare() {
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(!matchMedia("(max-width: 700px)").matches), []);
  const S = (k: string) => SITE[`pricing ${k}`];
  return (
    <details
      className="co-card dl-compare"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>
        {S("compare open")}
        <i aria-hidden="true" />
      </summary>
      <div className="dl-table">
        <table>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr">Feature</span>
              </th>
              <th scope="col">{S("plans title")}</th>
              <th scope="col" className="hot">
                {SITE["program link"]}
              </th>
              <th scope="col">{SITE["private link"]}</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((r) => (
              <tr key={r[0]}>
                <th scope="row">{r[0]}</th>
                <td>
                  <Cell v={r[1]} />
                </td>
                <td className="hot">
                  <Cell v={r[2]} />
                </td>
                <td>
                  <Cell v={r[3]} />
                </td>
              </tr>
            ))}
            <tr className="dl-cost">
              <th scope="row">Price</th>
              <td>
                {SELF.map((p) => (
                  <span key={p.id}>
                    {p.name}: {money(p.monthly)} a month
                    <small> or {money(p.threeMonths)} for 3 months</small>
                  </span>
                ))}
              </td>
              <td className="hot">
                <b className="num">{money(MP.price)}</b>
              </td>
              <td>{PRIVATE_PACKAGES.map((p) => money(p.price)).join(" or ")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  );
}
