"use client";

// The pricing page's opening, in the home page's world (founder, 2026-11-12), on the SAT Program page's frame:
// the headline on the mist, the question of when the student wants to start, then the three ways to pay as
// rounded cream cards. Pick a start and the cohort card's name and dates change to match (with its two dates
// drawn as a short timeline); Practice, Pro and private tutoring start any day. Every price comes from
// offer.ts and rolls into place when it changes; words come from site-copy.ts.
import { useEffect, useRef, useState } from "react";
import {
  formatPrice as money,
  GUARANTEE as G,
  guaranteeMax,
  MARCH_PROGRAM as MP,
  NEXT_PROGRAMS,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  pricePerHour,
} from "@/lib/marketing/offer";
import { numberWord, SITE } from "@/lib/marketing/site-copy";
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { Tick } from "@/components/site/company/parts";

const noYear = (s: string) => s.replace(/, \d{4}$/, "");
const month = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });

type Cohort = { key: string; short: string; start: string; closes: string; name: string };
export const DATES: Cohort[] = [
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

const INCLUDES = {
  program: [
    `Two live classes a week, up to ${numberWord(MP.paidSeats)} students in one score band`,
    `${numberWord(MP.fullLengthTests, true)} full-length practice tests`,
    "A weekly live session",
    `Everything in ${PRO_PLAN.name}: every question, with video explanations as they're recorded`,
    "Your cohort's group chat, answered daily",
    "A progress report for parents every day",
  ],
  private: [
    "Weekly 60-minute sessions with a Karman tutor",
    "Scheduled around your week",
    `Everything in ${PRO_PLAN.name}: every question, with video explanations as they're recorded`,
    "The weekly live session",
    "A note to parents after every session",
  ],
};

/** A price that rolls up into place when it changes (not with reduced motion). */
function Roll({ text }: { text: string }) {
  const ref = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (ref.current?.closest(".still-motion")) return;
    ref.current?.animate(
      [
        { transform: "translateY(35%)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" }
    );
  }, [text]);
  return (
    <b className="num" ref={ref}>
      {text}
    </b>
  );
}

/** A small switch of two or three choices, the picked one on a sliding pill. */
function Pick<T extends string | number>({
  name,
  label,
  options,
  value,
  onPick,
}: {
  name: string;
  label: string;
  options: [T, string][];
  value: T;
  onPick: (v: T) => void;
}) {
  const at = Math.max(
    0,
    options.findIndex(([v]) => v === value)
  );
  return (
    <div
      className="dl-pick"
      role="radiogroup"
      aria-label={label}
      style={{ "--n": options.length, "--at": at } as React.CSSProperties}
    >
      {options.map(([v, text]) => (
        <label key={String(v)}>
          <input
            type="radio"
            name={name}
            value={String(v)}
            checked={v === value}
            onChange={() => onPick(v)}
          />
          <span>{text}</span>
        </label>
      ))}
    </div>
  );
}

function Includes({ items }: { items: readonly string[] }) {
  return (
    <ul className="dl-inc">
      {items.map((x) => (
        <li key={x}>
          <Tick />
          {x}
        </li>
      ))}
    </ul>
  );
}

export default function PricingPlans() {
  const [key, setKey] = useState(DATES[0].key);
  const [split, setSplit] = useState(false);
  const [hours, setHours] = useState(0);
  const [self, setSelf] = useState(0);
  const other = key === "other";
  const d = DATES.find((x) => x.key === key) ?? DATES[0];
  const plan = SELF[self];
  const pkg = PRIVATE_PACKAGES[hours];
  const S = (k: string) => SITE[`pricing ${k}`];

  return (
    <section className="pg-hero dl-hero" id="top">
      <div className="mist" aria-hidden="true" />
      <div className="pg-in co-in co-stack">
        <div className="pg-say dl-head">
          <h1>{S("headline")}</h1>
          <p className="lede">{S("text")}</p>
          <fieldset className="dl-dates">
            <legend>{S("date question")}</legend>
            <Pick
              name="date"
              label={S("date question")}
              options={[
                ...DATES.map((x) => [x.key, x.short] as [string, string]),
                ["other", S("other date")],
              ]}
              value={key}
              onPick={setKey}
            />
          </fieldset>
          <p className="dl-other" hidden={!other}>
            {S("other note")}
          </p>
        </div>

        <div className="dl-plans" aria-label={SITE["pricing link"]}>
          <article className={`co-card dl-plan ${other ? "lift" : ""}`}>
            <h2>{S("plans title")}</h2>
            <Pick
              name="self"
              label={S("plans title")}
              options={SELF.map((p, i) => [i, p.name] as [number, string])}
              value={self}
              onPick={setSelf}
            />
            <p className="dl-price" aria-live="polite">
              <Roll text={money(plan.monthly)} />
              <span>a month, or {money(plan.threeMonths)} for 3 months</span>
            </p>
            <p className="pg-small">{S("plans note")}</p>
            <Includes items={plan.includes} />
            <div className="dl-go">
              <a className="more" href={`${ROUTES.checkout}?plan=${plan.id}&term=month`}>
                {S(`${plan.id} button`)}
                <Arrow />
              </a>
              <a className="pg-small dl-free" href={ROUTES.signUp}>
                {S("free note")}
              </a>
            </div>
          </article>

          <article className={`co-card dl-plan hot ${other ? "dim" : ""}`}>
            <a className="dl-badge" href="#guarantee">
              <b className="num">+{guaranteeMax("cohort")}</b>
              <span>{S("badge")}</span>
            </a>
            <h2 key={d.key}>{d.name}</h2>
            <Pick
              name="pay"
              label={`${S("full")} / ${S("split")}`}
              options={[
                ["full", S("full")],
                ["split", S("split")],
              ]}
              value={split ? "split" : "full"}
              onPick={(v) => setSplit(v === "split")}
            />
            <p className="dl-price" aria-live="polite">
              <Roll text={split ? money(MP.installments.amount) : money(MP.price)} />
              <span>{split ? `× ${MP.installments.count} payments. ${S("split note")}` : ""}</span>
            </p>
            <ol className="dl-when" key={`w${d.key}`}>
              <li>
                <span>Enrollment closes</span>
                <b>{d.closes}</b>
              </li>
              <li>
                <span>Classes start</span>
                <b>{d.start}</b>
              </li>
            </ol>
            <Includes items={INCLUDES.program} />
            <div className="dl-go">
              <Btn label={S("program button")} href={`${ROUTES.program}#apply`} />
              <small className="pg-small">{S("program deposit")}</small>
            </div>
          </article>

          <article className={`co-card dl-plan ${other ? "lift" : ""}`}>
            <h2>{SITE["private link"]}</h2>
            <Pick
              name="hours"
              label="Hours"
              options={PRIVATE_PACKAGES.map((p, i) => [i, `${p.hours} hours`] as [number, string])}
              value={hours}
              onPick={setHours}
            />
            <p className="dl-price" aria-live="polite">
              <Roll text={money(pkg.price)} />
              <span>{pricePerHour(pkg)} an hour</span>
            </p>
            <a className="dl-badge soft" href="#guarantee">
              <b className="num">+{guaranteeMax(G.trackOf[pkg.id])}</b>
              <span>{S("private badge")}</span>
            </a>
            <p className="pg-small">Start any time.</p>
            <Includes items={INCLUDES.private} />
            <div className="dl-go">
              <a className="more" href={`${ROUTES.private}#call`}>
                {S("private button")}
                <Arrow />
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
