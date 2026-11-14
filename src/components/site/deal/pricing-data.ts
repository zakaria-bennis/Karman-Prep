// What the Pricing page shows, worked out on the server from offer.ts (numbers) and site-copy.ts section 58
// (words), then handed to PricingPage.tsx.
// Each plan is written the way the trade writes them (Princeton Review, PrepScholar): how it is taught, its
// name, the result it promises, the price, the button, then the facts with numbers in them.
import { ROUTES } from "@/components/site/routes";
import {
  COHORT_SCHOLARSHIP as AWARD,
  formatPrice as $,
  MARCH_PROGRAM as MP,
  NEXT_PROGRAMS,
  PRACTICE_PLAN as PP,
  PRIVATE_PACKAGES,
  PRO_PLAN as PRO,
  SAT_DATES,
} from "@/lib/marketing/offer";
import { list, section } from "@/lib/marketing/site-copy";

export interface PriceAward {
  /** On the badge. */
  badge: string;
  badgeSub: string;
  /** In the placard. */
  name: string;
  sub: string;
  parts: { amount: string; label: string }[];
  how: string[];
  close: string;
}

/** One way to pay for a self-study plan. */
export interface PriceTerm {
  label: string;
  price: string;
  unit: string;
  note: string;
  href: string;
}

/** One cohort, named by the SAT it ends on. */
export interface PriceCohort {
  sat: string;
  starts: string;
  closes: string;
  /** The scholarship is offered for this cohort. */
  award: boolean;
}

export interface PricePlan {
  id: string;
  /** How it is taught: "Live class", "One-on-one". Self-study plans carry none. */
  tag?: string;
  name: string;
  /** The guarantee, shown with a shield at the top of the card. Self-study plans carry none. */
  promise?: string;
  price?: string;
  unit?: string;
  note?: string;
  /** Self-study: 3 months first (the default), then monthly. */
  terms?: PriceTerm[];
  bullets: string[];
  cta: string;
  href: string;
  /** The plan we most want chosen on its side of the switch. */
  best?: boolean;
  /** A ribbon across the card's corner: "Save 16%". */
  ribbon?: string;
  cohorts?: PriceCohort[];
  award?: PriceAward;
}

export interface PriceProps {
  headline: string;
  sides: { self: string; tutor: string };
  self: PricePlan[];
  tutor: PricePlan[];
  words: { sat: string; starts: string; closes: string; link: string };
  links: { guarantee: string };
}

const DAY = 864e5;

/** `today` is YYYY-MM-DD: a cohort whose enrollment has closed is left out. */
export function pricingData(today: string): PriceProps {
  const s = section(58);
  const [P10, P20] = PRIVATE_PACKAGES;
  const each = (p: { price: number; hours: number }) => p.price / p.hours;
  const money = (n: number) =>
    Number.isInteger(n) ? $(n) : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const saved = $(each(P10) * P20.hours - P20.price);
  const terms = (plan: { id: string; monthly: number; threeMonths: number }): PriceTerm[] => [
    {
      label: s["term three"],
      price: $(Math.round(plan.threeMonths / 3)),
      unit: s.month,
      note: s["billed three"].replace("{total}", $(plan.threeMonths)),
      href: `${ROUTES.checkout}?plan=${plan.id}&term=quarter`,
    },
    {
      label: s["term one"],
      price: $(plan.monthly),
      unit: s.month,
      note: s["billed one"],
      href: `${ROUTES.checkout}?plan=${plan.id}&term=month`,
    },
  ];
  const call = `${ROUTES.private}#call`;
  // every cohort, with the SAT it ends on and the day its enrollment closes
  const cohorts = [
    {
      starts: MP.startShort,
      closesOn: MP.enrollmentCloses,
      closes: MP.enrollmentClosesLabel.replace(/, \d{4}$/, ""),
    },
    ...NEXT_PROGRAMS.map((p) => ({
      starts: p.startShort,
      closesOn: new Date(new Date(`${p.startDate}T12:00:00Z`).getTime() - 7 * DAY)
        .toISOString()
        .slice(0, 10),
      closes: p.enrollmentClosesLabel,
    })),
  ]
    .map((c, i) => ({ ...c, sat: SAT_DATES[i] ?? c.starts, award: i === 0 }))
    .filter((c) => c.closesOn >= today)
    .map(({ sat, starts, closes, award }) => ({ sat, starts, closes, award }));

  return {
    headline: s.headline,
    sides: { self: s.self, tutor: s.tutor },
    words: {
      sat: s.sat,
      starts: s.starts,
      closes: s.closes,
      link: s.link,
    },
    links: { guarantee: ROUTES.guarantee },
    self: [
      {
        id: PP.id,
        name: PP.name,
        terms: terms(PP),
        bullets: list(s["practice bullets"]),
        cta: s["practice button"],
        href: `${ROUTES.checkout}?plan=${PP.id}&term=quarter`,
      },
      {
        id: PRO.id,
        name: PRO.name,
        terms: terms(PRO),
        bullets: list(s["pro bullets"]),
        cta: s["pro button"],
        href: `${ROUTES.checkout}?plan=${PRO.id}&term=quarter`,
        best: true,
      },
    ],
    tutor: [
      {
        id: "cohort",
        tag: s["tag class"],
        name: MP.planName,
        promise: s["cohort line"],
        price: $(MP.price),
        unit: s["cohort unit"],
        note: s["cohort note"],
        bullets: list(s["cohort bullets"]),
        cta: s["cohort button"],
        href: ROUTES.reserve,
        best: true,
        cohorts,
        award: {
          badge: `${$(AWARD.amount)} ${s["award badge"]}`,
          badgeSub: s["award badge sub"],
          name: s["award name"],
          sub: s["award sub"].replace("{amount}", $(AWARD.amount)),
          parts: [
            { amount: $(AWARD.refund), label: s["award refund"] },
            { amount: $(AWARD.meritBonus), label: s["award bonus"] },
          ],
          how: list(s["award how"]),
          close: s["award close"],
        },
      },
      {
        id: P10.id,
        tag: s["tag one"],
        name: P10.name,
        promise: s["small line"],
        price: $(P10.price),
        unit: `${money(each(P10))} ${s["a session"]}`,
        bullets: list(s["small bullets"]),
        cta: s["private button"],
        href: call,
      },
      {
        id: P20.id,
        tag: s["tag one"],
        name: P20.name,
        promise: s["large line"],
        price: $(P20.price),
        unit: `${money(each(P20))} ${s["a session"]}`,
        bullets: list(s["large bullets"]),
        cta: s["private button"],
        href: call,
        ribbon: `${s.save} ${saved}`,
      },
    ],
  };
}
