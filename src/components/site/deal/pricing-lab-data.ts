// What the simple Pricing page shows, worked out on the server from offer.ts (numbers) and site-copy.ts
// section 58 (words), then handed to PricingLab.tsx.
import { ROUTES } from "@/components/site/routes";
import {
  COHORT_SCHOLARSHIP,
  formatPrice as $,
  guaranteeMax,
  MARCH_PROGRAM as MP,
  NEXT_PROGRAMS,
  PRACTICE_PLAN as PP,
  PRIVATE_PACKAGES,
  PRO_PLAN as PRO,
} from "@/lib/marketing/offer";
import { list, section, SITE } from "@/lib/marketing/site-copy";

export interface LabPlan {
  id: string;
  name: string;
  line: string;
  price: string;
  unit: string;
  note?: string;
  bullets: string[];
  cta: string;
  href: string;
  /** The plan we recommend on its side of the switch. */
  best?: boolean;
  /** For the side-by-side table. */
  teach: string;
  promise: string;
  /** The cohort only: its start dates, and the scholarship badge. */
  cohorts?: { starts: string; closes: string }[];
  award?: string;
}

export interface LabProps {
  headline: string;
  sides: { self: string; tutor: string };
  self: LabPlan[];
  tutor: LabPlan[];
  rows: string[];
  words: { starts: string; closes: string; freeNote: string; link: string };
  links: { free: string; guarantee: string };
}

export function pricingLabData(): LabProps {
  const s = section(58);
  const [P10, P20] = PRIVATE_PACKAGES;
  const each = (p: { price: number; hours: number }) => p.price / p.hours;
  const money = (n: number) =>
    Number.isInteger(n) ? $(n) : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const saved = Math.floor((1 - each(P20) / each(P10)) * 100);
  const term = (monthly: number, three: number) => ({
    price: $(monthly),
    unit: s.month,
    note: `${s.or} ${$(three)} ${s["three months"]}`,
  });
  const s2 = s.points;
  const call = `${ROUTES.private}#call`;
  return {
    headline: s.headline,
    sides: { self: s.self, tutor: s.tutor },
    rows: list(s.rows),
    words: {
      starts: s.starts,
      closes: s.closes,
      freeNote: SITE["pricing free note"],
      link: s.link,
    },
    links: { free: ROUTES.signUp, guarantee: ROUTES.guarantee },
    self: [
      {
        id: PP.id,
        name: PP.name,
        line: s["practice line"],
        ...term(PP.monthly, PP.threeMonths),
        bullets: list(s["practice bullets"]),
        cta: s["practice button"],
        href: `${ROUTES.checkout}?plan=${PP.id}&term=month`,
        teach: s["teach none"],
        promise: s["promise none"],
      },
      {
        id: PRO.id,
        name: PRO.name,
        line: s["pro line"],
        ...term(PRO.monthly, PRO.threeMonths),
        bullets: list(s["pro bullets"]),
        cta: s["pro button"],
        href: `${ROUTES.checkout}?plan=${PRO.id}&term=month`,
        best: true,
        teach: s["teach none"],
        promise: s["promise none"],
      },
    ],
    tutor: [
      {
        id: "cohort",
        name: MP.planName,
        line: s["cohort line"],
        price: $(MP.price),
        unit: s["cohort unit"],
        bullets: list(s["cohort bullets"]),
        cta: s["cohort button"],
        href: ROUTES.program,
        teach: s["teach group"],
        promise: `+${guaranteeMax("cohort")} ${s2}`,
        cohorts: [
          { starts: MP.startShort, closes: MP.enrollmentClosesLabel.replace(/, \d{4}$/, "") },
          ...NEXT_PROGRAMS.map((p) => ({ starts: p.startShort, closes: p.enrollmentClosesLabel })),
        ],
        award: `${$(COHORT_SCHOLARSHIP.amount)} ${s.award}`,
      },
      {
        id: P10.id,
        name: P10.name,
        line: s["small line"],
        price: $(P10.price),
        unit: `${money(each(P10))} ${s["a session"]}`,
        bullets: list(s["small bullets"]),
        cta: s["private button"],
        href: call,
        teach: s["teach one"],
        promise: `+${guaranteeMax("cohort")} ${s2}`,
      },
      {
        id: P20.id,
        name: P20.name,
        line: s["large line"],
        price: $(P20.price),
        unit: `${money(each(P20))} ${s["a session"]}`,
        bullets: [...list(s["large bullets"]), `${s.save} ${saved}% ${s["a session"]}`],
        cta: s["private button"],
        href: call,
        best: true,
        teach: s["teach one"],
        promise: `+${guaranteeMax("private")} ${s2}`,
      },
    ],
  };
}
