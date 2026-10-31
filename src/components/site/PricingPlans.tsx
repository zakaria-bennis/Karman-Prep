"use client";

// Pricing (ported from the mock's pricing.js, brought onto the October 30 plan ladder): every paid option and
// every promise on one page. Pick the SAT your student is taking and the program card, its dates and its price
// change to match; private tutoring starts any day. Two cards only (design rule 17): the program and private
// tutoring. The practice plans and the school license follow as one band of rows (their designed version comes
// after the founder's review). The guarantee sits under them with its whole terms; then everything side by side.
// Numbers come from offer.ts, words from site-copy.ts.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CONTACT,
  formatPrice as money,
  FREE_PRACTICE_TEST as FT,
  GUARANTEE as G,
  MARCH_PROGRAM as MP,
  NEXT_PROGRAMS,
  PRACTICE_PLANS,
  PRIVATE_INCLUDES,
  PRIVATE_PACKAGES,
  SCHOOL_PLAN,
} from "@/lib/marketing/offer";
import { CALL_MINUTES, numberWord, SITE } from "@/lib/marketing/site-copy";
import { Arrow, Btn, delay, Icon } from "./parts";
import Photo from "./Photo";
import { ROUTES } from "./routes";

const noYear = (s: string) => s.replace(/, \d{4}$/, "");
const month = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });

type Cohort = {
  key: string;
  short: string;
  test: string;
  start: string;
  closes: string;
  price: number;
  was?: number;
  split?: { count: number; amount: number };
  name: string;
};
/** The programs, one per SAT date (offer.ts): the founding price for March, the regular price after. */
const DATES: Cohort[] = [
  {
    key: MP.testDate,
    short: MP.testDateShort,
    test: noYear(MP.testDateLabel),
    start: noYear(MP.startLabel),
    closes: noYear(MP.enrollmentClosesLabel),
    price: MP.price,
    was: MP.regularPrice,
    split: MP.installments,
    name: MP.name,
  },
  ...NEXT_PROGRAMS.map((p) => ({
    key: p.testDate,
    short: p.testDateShort,
    test: noYear(p.testDateLabel),
    start: p.startLabel,
    closes: p.enrollmentClosesLabel,
    price: MP.regularPrice,
    name: `The ${month(p.testDate)} SAT Program`,
  })),
];

const INCLUDES = {
  program: [
    `Two live classes a week, in a class of ${numberWord(MP.paidSeats)}`,
    `${numberWord(MP.fullLengthTests, true)} full-length practice tests`,
    "Classes built on the skills your group missed",
    "A weekly live session",
    "Your Daily 10 and our own practice questions",
    "Your cohort's group chat, answered daily",
    "A weekly update for parents",
  ],
  private: PRIVATE_INCLUDES.map((x) => x.title),
};
// what each option includes, side by side: the free test, the program, private tutoring ("" = not included)
const COMPARE: [string, string, string, string][] = [
  [
    `Live classes in a class of ${numberWord(MP.paidSeats)}`,
    "",
    `Two a week, ${MP.totalClasses} in all`,
    "",
  ],
  [
    "Full-length practice tests",
    `One shorter test, ${FT.questionCount} questions`,
    `${numberWord(MP.fullLengthTests, true)}, the first and the last proctored live`,
    "On the platform",
  ],
  [
    "One-on-one time with a Karman tutor",
    `A ${CALL_MINUTES}-minute results call`,
    "",
    "Every session",
  ],
  ["Weekly live session: test mechanics and workshops", "", "yes", "yes"],
  ["Your Daily 10 and our own practice questions", "", "yes", "yes"],
  ["Cohort group chat, answered by a tutor every day", "", "yes", ""],
  ["Updates for parents", "", "Every week", "After every session"],
  [
    `The guarantee: +${G.points} points or a ${G.orScore}`,
    "",
    "Money back or the next cohort free",
    `On ${PRIVATE_PACKAGES[1].hours} hours: free hours, then half back`,
  ],
];

/** The practice plans and the school license (offer.ts, plan ladder 2026-10-30), one row each. */
const PLAN_ROWS = [
  ...PRACTICE_PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    price:
      p.billing === "month" ? `${money(p.price)} ${SITE["pricing per month"]}` : money(p.price),
    what:
      p.questions === "all"
        ? SITE["pricing every question"]
        : `${p.questions.toLocaleString("en-US")} questions`,
    href: `${ROUTES.signUp}?plan=${p.id}`,
  })),
  {
    id: SCHOOL_PLAN.id,
    name: SCHOOL_PLAN.name,
    price: `${money(SCHOOL_PLAN.pricePerStudentPerYear)} ${SITE["pricing per student"]}`,
    what: `${SCHOOL_PLAN.questions.toLocaleString("en-US")} questions per student, ${SCHOOL_PLAN.term}. ${SCHOOL_PLAN.pilot.label}.`,
    href: `mailto:${CONTACT.general}?subject=${encodeURIComponent("School license")}`,
  },
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

export default function PricingPlans({ guarantee }: { guarantee: ReactNode }) {
  const [key, setKey] = useState(DATES[0].key);
  const [split, setSplit] = useState(false);
  const [hours, setHours] = useState(0);
  const [compareOpen, setCompareOpen] = useState(true);
  useEffect(() => setCompareOpen(!matchMedia("(max-width: 700px)").matches), []);
  const other = key === "other";
  const d = DATES.find((x) => x.key === key) ?? DATES[0];
  const paySplit = Boolean(d.split) && split;
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
            <article className={`plan program rv ${other ? "dim" : ""}`}>
              <a className="badge" href="#guarantee">
                <b>+{G.points}</b>
                <span>{S("badge")}</span>
              </a>
              <h2 className="pname">{d.name}</h2>
              <div
                className="pay"
                role="radiogroup"
                aria-label={`${S("full")} / ${S("split")}`}
                hidden={!d.split}
              >
                <label>
                  <input
                    type="radio"
                    name="pay"
                    value="full"
                    checked={!paySplit}
                    onChange={() => setSplit(false)}
                  />
                  <span>{S("full")}</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="pay"
                    value="split"
                    checked={paySplit}
                    onChange={() => setSplit(true)}
                  />
                  <span>{S("split")}</span>
                </label>
              </div>
              <p className="price" aria-live="polite">
                <Roll text={paySplit && d.split ? money(d.split.amount) : money(d.price)} />
                <s className="was">{d.was && !paySplit ? money(d.was) : ""}</s>
                <span className="per">
                  {paySplit && d.split ? `× ${d.split.count} payments` : ""}
                </span>
              </p>
              <dl className="when">
                <div>
                  <dt>Classes start</dt>
                  <dd className="start">{d.start}</dd>
                </div>
                <div>
                  <dt>Ends on the SAT</dt>
                  <dd className="test">{d.test}</dd>
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

            <article className={`plan private rv ${other ? "lift" : ""}`} style={delay(0.08)}>
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
                <span className="per">for {PRIVATE_PACKAGES[hours].hours} hours</span>
              </p>
              <a className="badge g20" href="#guarantee" hidden={hours !== 1}>
                <b>+{G.private20.points}</b>
                <span>
                  On {PRIVATE_PACKAGES[1].hours} hours: +{G.private20.points} points or a{" "}
                  {G.private20.orScore}.
                </span>
              </a>
              <p className="meta">{S("private note")}</p>
              <ul>
                {INCLUDES.private.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <a className="ghost" href={`${ROUTES.private}#call`}>
                {S("private button")}
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
              </a>
            </article>
          </div>
          <Photo name="pricing" className="ph-side only-phone" />

          <div className="plans-band rv" style={delay(0.12)}>
            <h2>{S("plans title")}</h2>
            <p>{S("plans text")}</p>
            <ul>
              {PLAN_ROWS.map((r) => (
                <li key={r.id}>
                  <b>{r.name}</b>
                  <span className="amt">{r.price}</span>
                  <span className="what">{r.what}</span>
                  <a className="lk" href={r.href}>
                    {S(`plan ${r.id} button`)}
                    <Arrow />
                  </a>
                </li>
              ))}
            </ul>
          </div>
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
                    <th scope="col">{SITE["free test link"]}</th>
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
                    <td>{money(0)}</td>
                    <td className="hot prog-cost">{money(d.price)}</td>
                    <td>From {money(PRIVATE_PACKAGES[0].price)}</td>
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
        </div>
      </section>
    </>
  );
}
