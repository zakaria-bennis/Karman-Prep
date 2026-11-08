"use client";

// Pricing (ported from the mock's pricing.js): every paid option and every promise on one page. Pick when the
// student wants to start and the cohort card and its dates change to match; Practice, Pro and private tutoring
// start any day. The guarantee sits right under the plans with its whole terms; then everything side by side,
// then schools and tutors. Numbers come from offer.ts, words from site-copy.ts.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  formatPrice as money,
  GUARANTEE as G,
  MARCH_PROGRAM as MP,
  NEXT_PROGRAMS,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  pricePerHour,
} from "@/lib/marketing/offer";
import { numberWord, pairs, SITE } from "@/lib/marketing/site-copy";
import { Btn, delay, Icon } from "./parts";
import Photo from "./Photo";
import { ROUTES } from "./routes";

const noYear = (s: string) => s.replace(/, \d{4}$/, "");
const month = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });

type Cohort = {
  key: string;
  short: string;
  start: string;
  closes: string;
  name: string;
};
const DATES: Cohort[] = [
  {
    key: "mar",
    short: MP.startShort,
    start: noYear(MP.startLabel),
    closes: noYear(MP.enrollmentClosesLabel),
    name: `The ${month(MP.startDate)} cohort`,
  },
  ...NEXT_PROGRAMS.map((p) => ({
    key: p.id,
    short: p.startShort,
    start: p.startLabel,
    closes: p.enrollmentClosesLabel,
    name: `The ${month(p.startDate)} cohort`,
  })),
];

/** Practice and Pro share one card: pick the plan, the price and the list change. */
const SELF = [PRACTICE_PLAN, PRO_PLAN] as const;

const CLASS = MP.paidSeats;
const INCLUDES = {
  program: [
    `Two live classes a week, up to ${numberWord(CLASS)} students in one score band`,
    `${numberWord(MP.fullLengthTests, true)} full-length practice tests`,
    "A weekly live session",
    `Everything in ${PRO_PLAN.name}: every question, with video explanations as they're recorded`,
    "Your cohort's group chat, answered daily",
    "Live progress for parents, and a weekly summary",
  ],
  private: [
    "Weekly 60-minute sessions with a Karman tutor",
    "Scheduled around your week",
    `Everything in ${PRO_PLAN.name}: every question, with video explanations as they're recorded`,
    "The weekly live session",
    "A note to parents after every session",
  ],
};
const PROMISE = `+${G.pointsBelow} points, or +${G.pointsFrom} from ${G.splitAt}`;
// what each option includes, side by side: Practice and Pro, cohort, private ("" = not included)
const COMPARE: [string, string, string, string][] = [
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
    "Five, the first and the last proctored live",
    "On the platform",
  ],
  ["The weekly live session", "", "yes", "yes"],
  ["The Daily 10", "yes", "yes", "yes"],
  ["Cohort group chat, answered by a tutor every day", "", "yes", ""],
  ["Progress for parents", "On their phone", "Every week", "After every session"],
  [
    `The guarantee: ${PROMISE}`,
    "",
    "Money back or the next cohort free",
    "Free hours, then half back",
  ],
];

function Cell({ v }: { v: string }) {
  if (v === "yes")
    return (
      <span className="yes">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M3.5 8.5 6.6 11.5 12.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr">Included</span>
      </span>
    );
  if (v) return <>{v}</>;
  return (
    <span className="no">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 8h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="sr">Not included</span>
    </span>
  );
}

/** A number that rolls up into place when it changes (not with reduced motion). */
function Roll({ text }: { text: string }) {
  const ref = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current?.animate(
      [
        { transform: "translateY(35%)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" }
    );
  }, [text]);
  return (
    <b className="amt" ref={ref}>
      {text}
    </b>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3 8h9.5M8.5 4 12.5 8l-4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function PricingPlans({ guarantee }: { guarantee: ReactNode }) {
  const [key, setKey] = useState(DATES[0].key);
  const [split, setSplit] = useState(false);
  const [hours, setHours] = useState(0);
  const [self, setSelf] = useState(0);
  const [compareOpen, setCompareOpen] = useState(true);
  useEffect(() => setCompareOpen(!matchMedia("(max-width: 700px)").matches), []);
  const other = key === "other";
  const d = DATES.find((x) => x.key === key) ?? DATES[0];
  const plan = SELF[self];
  const S = (k: string) => SITE[`pricing ${k}`];

  return (
    <>
      <section className="p-hero" data-light>
        <div className="in p-herogrid">
          <div className="p-words">
            <p className="eyebrow rv">{S("eyebrow")}</p>
            <h1 className="rv" style={delay(0.05)}>
              {S("headline")}
            </h1>
            <p className="lede rv" style={delay(0.1)}>
              {S("text")}
            </p>
            <fieldset className="dates rv" style={delay(0.15)}>
              <legend>{S("date question")}</legend>
              <div className="seg" role="radiogroup">
                {[...DATES.map((x) => [x.key, x.short]), ["other", S("other date")]].map(
                  ([k, label]) => (
                    <label key={k}>
                      <input
                        type="radio"
                        name="date"
                        value={k}
                        checked={key === k}
                        onChange={() => setKey(k)}
                      />
                      <span>{label}</span>
                    </label>
                  )
                )}
              </div>
            </fieldset>
          </div>
          <Photo name="pricing" className="ph-hero only-wide" />
        </div>
      </section>

      <section className="plans" data-light aria-label={SITE["pricing link"]}>
        <div className="in">
          <p className="other-note" hidden={!other}>
            {S("other note")}
          </p>
          <div className="cards">
            <article className={`plan self rv ${other ? "lift" : ""}`}>
              <h2>{S("plans title")}</h2>
              <div className="pay" role="radiogroup" aria-label={S("plans title")}>
                {SELF.map((p, i) => (
                  <label key={p.id}>
                    <input
                      type="radio"
                      name="self"
                      value={p.id}
                      checked={self === i}
                      onChange={() => setSelf(i)}
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
              <p className="price" aria-live="polite">
                <Roll text={money(plan.monthly)} />
                <span className="per">a month</span>
              </p>
              <p className="meta">{S("plans note")}</p>
              <ul>
                {plan.includes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <a className="ghost" href={`${ROUTES.billing}?plan=${plan.id}&term=month`}>
                {S(`${plan.id} button`)}
                <Arrow />
              </a>
              <p className="meta">
                <a href={ROUTES.signUp}>{S("free note")}</a>
              </p>
            </article>

            <article className={`plan program rv ${other ? "dim" : ""}`} style={delay(0.06)}>
              <a className="badge" href="#guarantee">
                <b>+{G.pointsBelow}</b>
                <span>{S("badge")}</span>
              </a>
              <h2 className="pname">{d.name}</h2>
              <div className="pay" role="radiogroup" aria-label={`${S("full")} / ${S("split")}`}>
                <label>
                  <input
                    type="radio"
                    name="pay"
                    value="full"
                    checked={!split}
                    onChange={() => setSplit(false)}
                  />
                  <span>{S("full")}</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="pay"
                    value="split"
                    checked={split}
                    onChange={() => setSplit(true)}
                  />
                  <span>{S("split")}</span>
                </label>
              </div>
              <p className="price" aria-live="polite">
                <Roll text={split ? money(MP.installments.amount) : money(MP.price)} />
                <span className="per">
                  {split ? `× ${MP.installments.count} payments. ${S("split note")}` : ""}
                </span>
              </p>
              <dl className="when">
                <div>
                  <dt>Classes start</dt>
                  <dd className="start">{d.start}</dd>
                </div>
                <div>
                  <dt>Enrollment closes</dt>
                  <dd className="closes">{d.closes}</dd>
                </div>
              </dl>
              <ul>
                {INCLUDES.program.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <div className="cta">
                <Btn label={S("program button")} href={`${ROUTES.program}#apply`} />
                <small>{S("program deposit")}</small>
              </div>
            </article>

            <article className={`plan private rv ${other ? "lift" : ""}`} style={delay(0.12)}>
              <h2>{SITE["private link"]}</h2>
              <div className="pay hours" role="radiogroup" aria-label="Hours">
                {PRIVATE_PACKAGES.map((p, i) => (
                  <label key={p.id}>
                    <input
                      type="radio"
                      name="hours"
                      value={i}
                      checked={hours === i}
                      onChange={() => setHours(i)}
                    />
                    <span>{p.hours} hours</span>
                  </label>
                ))}
              </div>
              <p className="price" aria-live="polite">
                <Roll text={money(PRIVATE_PACKAGES[hours].price)} />
                <span className="per">{pricePerHour(PRIVATE_PACKAGES[hours])} an hour</span>
              </p>
              <a className="badge g20" href="#guarantee">
                <b>+{G.pointsBelow}</b>
                <span>Both packages: {PROMISE}.</span>
              </a>
              <p className="meta">Start any time.</p>
              <ul>
                {INCLUDES.private.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <a className="ghost" href={`${ROUTES.private}#call`}>
                {S("private button")}
                <Arrow />
              </a>
            </article>
          </div>
          <Photo name="pricing" className="ph-side only-phone" />
        </div>
      </section>

      {guarantee}

      <section className="compare" data-light aria-labelledby="cmp-h">
        <div className="in">
          <h2 id="cmp-h" className="rv">
            {S("compare title")}
          </h2>
          <details
            className="cmp rv"
            open={compareOpen}
            onToggle={(e) => setCompareOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary>
              {S("compare open")}
              <Icon name="plus" />
            </summary>
            <div className="tablewrap">
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
                  <tr className="cost">
                    <th scope="row">Price</th>
                    <td>
                      {SELF.map((p) => `${money(p.monthly)} a month`).join(" or ")}
                      <br />
                      <small>
                        or {SELF.map((p) => money(p.threeMonths)).join(" or ")} for 3 months
                      </small>
                    </td>
                    <td className="hot prog-cost">{money(MP.price)}</td>
                    <td>{PRIVATE_PACKAGES.map((p) => money(p.price)).join(" or ")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
          <div className="honest">
            <p className="rv">{S("honest note")}</p>
            <p className="rv" style={delay(0.08)}>
              {S("scholarship")}
            </p>
          </div>
          <h3 className="more rv">{S("more")}</h3>
          <div className="honest">
            {pairs(`${S("schools")} | ${S("tutors")}`).map(([name, text], k) => (
              <p className="rv" style={delay(k * 0.08)} key={name}>
                <a href={k === 0 ? ROUTES.schools : ROUTES.tutors}>{name}</a>
                {`. ${text}`}
              </p>
            ))}
          </div>
          <p className="renew rv">{S("renewal")}</p>
        </div>
      </section>
    </>
  );
}
