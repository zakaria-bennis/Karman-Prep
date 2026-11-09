/**
 * The plan ladder as data (docs/business/plan-ladder-2026-11-08.md). Names and
 * prices mirror src/lib/marketing/offer.ts (PRACTICE_PLAN, PRO_PLAN,
 * MARCH_PROGRAM, PRIVATE_PACKAGES, SCHOOL_PLAN) as of 2026-11-08; Phase 2 reads
 * offer.ts and src/lib/plans directly and deletes the copies here. The ids match
 * the app's plan ids except private10 and private20 (private-10 and private-20 there).
 * Every screen reads this through usePlan(); no plan name is hard-coded in a
 * component.
 */
export type PlanId = "free" | "practice" | "pro" | "cohort" | "private10" | "private20" | "school";
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
    name: "The weekly live session",
    description: "Test mechanics and skill workshops, for the cohort and private students.",
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
    description:
      "+100 points (+50 from a 1400 start), or money back or a free repeat. Cohort, Private 10 and Private 20.",
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
  practice: {
    id: "practice",
    name: "Practice",
    description:
      "The core question pool with written explanations, Your Daily 10, full-length tests, the calculator.",
    price: 39,
    billing: "month",
    priceLabel: "$39 a month, or $89 for 3 months",
    questions: "all",
    guarantee: false,
    bundles: PRACTICE,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description:
      "Every question, including the hard mastery pool, and video explanations as they're recorded.",
    price: 69,
    billing: "month",
    priceLabel: "$69 a month, or $149 for 3 months",
    questions: "all",
    guarantee: false,
    bundles: PRACTICE,
  },
  cohort: {
    id: "cohort",
    name: "9-week Cohort",
    description:
      "At most six students by score band, 18 live 60-minute classes twice a week, no 1:1s.",
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
    description: "Ten hours of 1:1 sessions with a Karman tutor, with the guarantee.",
    price: 1495,
    billing: "once",
    priceLabel: "$1,495",
    questions: "all",
    guarantee: true,
    bundles: [...PRACTICE, "workshops", "oneToOne", "guarantee"],
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
    description:
      "Each student's own Practice plan and the school tools. First year free, then $8 per student a year.",
    price: 8,
    billing: "student-year",
    priceLabel: "$8 per student a year, first year free",
    questions: "all",
    guarantee: false,
    bundles: [...PRACTICE, "school"],
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
export const BUNDLE_IDS = Object.keys(BUNDLES) as BundleId[];
/** The upgrade ladder. A school seat upgrades into the family plans from the bottom. */
export const LADDER: PlanId[] = ["free", "practice", "pro", "cohort", "private10", "private20"];

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
  PLAN_IDS.filter((p) => PLANS[p].guarantee).join() === "cohort,private10,private20",
  "guarantee: the cohort and both private packages"
);
console.assert(
  PLAN_IDS.every((p) => has(p, "quiz") && has(p, "challenge") && has(p, "progress")),
  "every plan has the quiz engine, the challenge and progress"
);
console.assert(
  upgradeFor("free", "daily10") === "practice" && upgradeFor("practice", "workshops") === "cohort",
  "ladder order"
);
