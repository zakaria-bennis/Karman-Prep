/**
 * The plan ladder as data (docs/business/plan-ladder-2026-10-30.md). Prices,
 * billing and question counts are mirrored from src/lib/marketing/offer.ts
 * (PRACTICE_PLANS, MARCH_PROGRAM, PRIVATE_PACKAGES, SCHOOL_PLAN) on
 * 2026-10-31; Phase 2 reads offer.ts directly and deletes the copies here.
 * Every screen reads this through usePlan(); no plan name is hard-coded in a
 * component. "Platform" and "Plus" are working names (CONFIRM in offer.ts).
 */
export type PlanId = "free" | "platform" | "plus" | "cohort" | "private10" | "private20" | "school";
export type BundleId =
  | "quiz"
  | "calculator"
  | "daily10"
  | "challenge"
  | "fullLength"
  | "progress"
  | "planning"
  | "workshops"
  | "liveClasses"
  | "oneToOne"
  | "parent"
  | "guarantee"
  | "school";

export interface Bundle {
  id: BundleId;
  name: string;
  description: string;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  billing: "none" | "month" | "once" | "student-year";
  priceLabel: string;
  questions: number | "all";
  guarantee: boolean;
  bundles: BundleId[];
}

export const BUNDLES: Record<BundleId, Bundle> = {
  quiz: {
    id: "quiz",
    name: "Quiz engine",
    description:
      "Practice by skill, with explanations, highlight, scratch pad, timer and a mistake log.",
  },
  calculator: {
    id: "calculator",
    name: "Built-in graphing calculator",
    description: "The Desmos-style calculator the digital SAT uses, inside every math question.",
  },
  daily10: {
    id: "daily10",
    name: "Your Daily 10",
    description: "Ten minutes a day. Every missed question comes back after 2, 7 and 21 days.",
  },
  challenge: {
    id: "challenge",
    name: "Challenge question and Wordline",
    description: "One hard question a day, and the word game.",
  },
  fullLength: {
    id: "fullLength",
    name: "Full-length tests",
    description: "Timed, scored, with a Karman predicted score.",
  },
  progress: {
    id: "progress",
    name: "Progress and rewards",
    description: "Skill levels, stats, streaks, tokens, boxes, the fox.",
  },
  planning: {
    id: "planning",
    name: "Planning tools",
    description: "Score Plan, Test-Day Playbook, Ask Karman (coming 2027).",
  },
  workshops: {
    id: "workshops",
    name: "Live workshops and office hours",
    description: "With recordings and video lessons.",
  },
  liveClasses: {
    id: "liveClasses",
    name: "Live classes",
    description: "Twice a week, proctored tests, cohort chat.",
  },
  oneToOne: {
    id: "oneToOne",
    name: "1:1 sessions",
    description: "Full-length review sessions, questions to the tutor.",
  },
  parent: {
    id: "parent",
    name: "Parent account and updates",
    description: "A parent account with weekly updates.",
  },
  guarantee: {
    id: "guarantee",
    name: "Score guarantee",
    description: "+100 points or 1450, or money back. Cohort and Private 20 only.",
  },
  school: {
    id: "school",
    name: "School tools",
    description: "Classes, seat keys, school admin, teacher view, reports.",
  },
};

const PRACTICE: BundleId[] = [
  "quiz",
  "calculator",
  "daily10",
  "challenge",
  "fullLength",
  "progress",
  "planning",
  "parent",
];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "100 questions, the Challenge question and Wordline, progress and rewards.",
    price: 0,
    billing: "none",
    priceLabel: "",
    questions: 100,
    guarantee: false,
    bundles: ["quiz", "challenge", "progress"],
  },
  platform: {
    id: "platform",
    name: "Platform",
    description:
      "The practice platform: 500 questions, Your Daily 10, full-length tests, the calculator.",
    price: 29,
    billing: "month",
    priceLabel: "$29 a month",
    questions: 500,
    guarantee: false,
    bundles: PRACTICE,
  },
  plus: {
    id: "plus",
    name: "Plus",
    description: "All questions, plus live workshops and office hours.",
    price: 49,
    billing: "month",
    priceLabel: "$49 a month",
    questions: "all",
    guarantee: false,
    bundles: [...PRACTICE, "workshops"],
  },
  cohort: {
    id: "cohort",
    name: "The March SAT Program",
    description: "Five students, two live classes a week, ending on the March 6 SAT.",
    price: 995,
    billing: "once",
    priceLabel: "$995",
    questions: "all",
    guarantee: true,
    bundles: [...PRACTICE, "workshops", "liveClasses", "guarantee"],
  },
  private10: {
    id: "private10",
    name: "Private 10",
    description: "Ten hours of 1:1 sessions with a Karman tutor, booked when it suits you.",
    price: 1495,
    billing: "once",
    priceLabel: "$1,495",
    questions: "all",
    guarantee: false,
    bundles: [...PRACTICE, "workshops", "oneToOne"],
  },
  private20: {
    id: "private20",
    name: "Private 20",
    description: "Twenty hours of 1:1 sessions, with the guarantee.",
    price: 2495,
    billing: "once",
    priceLabel: "$2,495",
    questions: "all",
    guarantee: true,
    bundles: [...PRACTICE, "workshops", "oneToOne", "guarantee"],
  },
  school: {
    id: "school",
    name: "School",
    description: "A school seat: 2,000 questions and the school tools, $10 per student a year.",
    price: 10,
    billing: "student-year",
    priceLabel: "$10 per student a year",
    questions: 2000,
    guarantee: false,
    bundles: [...PRACTICE, "school"],
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
export const BUNDLE_IDS = Object.keys(BUNDLES) as BundleId[];
/** The upgrade ladder. A school seat upgrades into the family plans from the bottom. */
export const LADDER: PlanId[] = ["free", "platform", "plus", "cohort", "private10", "private20"];

export function has(plan: PlanId, bundle: BundleId): boolean {
  return PLANS[plan].bundles.includes(bundle);
}

/** The next plan up the ladder that adds the bundle, or null when none does. */
export function upgradeFor(plan: PlanId, bundle: BundleId): PlanId | null {
  if (has(plan, bundle)) return null;
  const from = LADDER.indexOf(plan);
  for (const id of LADDER.slice(from + 1)) if (has(id, bundle)) return id;
  return null;
}

console.assert(BUNDLE_IDS.length === 13, "13 bundles");
console.assert(PLAN_IDS.length === 7, "seven plan ids (six plans, Private in two sizes)");
console.assert(
  PLAN_IDS.filter((p) => PLANS[p].guarantee).join() === "cohort,private20",
  "guarantee: cohort and Private 20 only"
);
console.assert(
  PLAN_IDS.every((p) => has(p, "quiz") && has(p, "challenge") && has(p, "progress")),
  "every plan has the quiz engine, the challenge and progress"
);
console.assert(
  upgradeFor("free", "daily10") === "platform" && upgradeFor("platform", "workshops") === "plus",
  "ladder order"
);
