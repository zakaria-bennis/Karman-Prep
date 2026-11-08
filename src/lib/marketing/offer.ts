// ============================================================
// Karman offer — the single source of truth for everything the
// marketing site says about programs, prices, dates, stats and
// the guarantee. Change a number here, never inside a component.
//
// The plan ladder (founder, 2026-11-08) is explained in
// docs/business/plan-ladder-2026-11-08.md, the reasoning in
// docs/business-plan.md. Values the founder still has to confirm
// are marked `CONFIRM:`. Server-side access rules for each plan
// live in src/lib/plans/, which reads its prices from here.
// ============================================================

export const FOUNDER = {
  name: "Zakaria Bennis",
  firstName: "Zakaria",
  credential: "99th percentile SAT",
  studentsTutored: "1,200+",
} as const;

/**
 * Karman's 1:1 tutoring track record (Zakaria's students). These came
 * from 1:1 tutoring, not the cohort program, so always show
 * `TRACK_RECORD.sourceLabel` next to them.
 */
export const TRACK_RECORD = {
  sourceLabel: "Karman 1:1 tutoring, median 16 weeks",
  averageGain: 285,
  averageBefore: 1235,
  averageAfter: 1520,
  reachedTargetPct: 94,
  medianWeeksToGoal: 16,
  rating: "4.9/5",
  studentsTutored: FOUNDER.studentsTutored,
} as const;

export const QUESTION_BANK = {
  /**
   * Original questions the site may claim. Founder target (2026-10-20):
   * 10,000+. 2,588 were live on 2026-10-19. The release preflight
   * (scripts/build/check-release-env.mjs, see docs/launch-checklist.md)
   * must refuse to publish while the live count is below this claim.
   */
  verifiedCount: "10,000+",
  /** The number the claim above must be checked against. */
  claimedMinimum: 10000,
  /** Where the bank is headed — only say "growing to", never "has". */
  targetCount: "10,000+",
  /** Selectable skills in src/data/curriculum/approved-skill-taxonomy.json. */
  skills: 39,
  difficultyLevels: 7,
} as const;

export type ProgramInclusion = { title: string; detail: string };

export const MARCH_PROGRAM = {
  id: "cohort-march-2027",
  /** Plan id in Stripe, the subscriptions table and src/lib/plans. */
  planId: "cohort",
  name: "The January cohort",
  shortName: "January cohort",
  /** The plan's name on the price list. */
  planName: "9-week Cohort",
  startDate: "2027-01-04",
  startLabel: "Monday, January 4, 2027",
  startShort: "January 4",
  weeks: 9,
  classesPerWeek: 2,
  classMinutes: 60,
  totalClasses: 18,
  fullLengthTests: 5,
  // CONFIRM: class days and times.
  scheduleLabel: "Tuesdays and Thursdays, 7:00–8:00 p.m. ET",
  classDays: ["Tuesday", "Thursday"],
  classDaysLabel: "Tuesdays and Thursdays",
  classStart: "7:00",
  classEnd: "8:00 p.m. ET",
  /** Each cohort is grouped by starting score, so a class works on the same level. */
  scoreBands: ["1000 to 1200", "1200 to 1400", "1400 to 1600"],
  // CONFIRM: enrollment deadline.
  enrollmentClosesLabel: "Wednesday, December 30, 2026",
  /** At most six students in a cohort, every seat paid. */
  paidSeats: 6,
  /** Paid seats already held with a deposit. The site shows the seats still open.
   *  CONFIRM: update as each family holds a seat. */
  paidSeatsTaken: 0,
  /** Founder, 2026-11-08: one price for every cohort. */
  price: 995,
  /** The deposit is part of the price, not extra: $95 + 3 x $300 = $995.
   *  (The old $100 deposit plus 3 x $345 made $1,135.) */
  depositAmount: 95,
  installments: { count: 3, amount: 300 },
  includes: [
    {
      title: "Two live classes a week",
      detail:
        "18 classes of 60 minutes in a group of up to six, taught by a Karman tutor. Each cohort is one score band: 1000 to 1200, 1200 to 1400, or 1400 to 1600.",
    },
    {
      title: "Five full-length practice tests",
      detail:
        "Your week-1 baseline is an official Bluebook test, proctored live. So is the last one, in week nine.",
    },
    {
      title: "A weekly live session",
      detail:
        "Test mechanics (pacing, Desmos, how the adaptive second module works), alternating with workshops on the skills students miss most.",
    },
    {
      title: "Daily 10",
      detail:
        "Ten questions a day, picked from your weakest skills. Missed questions come back until they stick.",
    },
    {
      title: "Everything in Pro",
      detail:
        "10,000+ original practice questions across all 39 SAT skills, the hard mastery questions included, with video explanations.",
    },
    {
      title: "Your cohort, between classes",
      detail: "A group chat for your cohort. Questions are answered by a Karman tutor every day.",
    },
    {
      title: "Weekly updates for parents",
      detail: "Practice time, attendance, test scores and what's next.",
    },
  ] satisfies ProgramInclusion[],
} as const;

/**
 * Later cohorts, named by the week they start. Classes start on a Monday and
 * applications close the Wednesday before. CONFIRM: start and close dates.
 */
export const NEXT_PROGRAMS = [
  {
    id: "cohort-may-2027",
    startDate: "2027-03-01",
    startLabel: "Monday, March 1",
    startShort: "March 1",
    enrollmentClosesLabel: "Wednesday, February 24",
  },
  {
    id: "cohort-june-2027",
    startDate: "2027-04-05",
    startLabel: "Monday, April 5",
    startShort: "April 5",
    enrollmentClosesLabel: "Wednesday, March 31",
  },
] as const;
/** Official SAT dates families can name on the call and test forms (College Board 2026-27 calendar,
 *  checked 2026-10-20). Only asked, never sold against. */
export const SAT_DATES = ["March 6", "May 1", "June 5"] as const;

export const NEXT_PROGRAMS_ENROLLMENT_LABEL = "Enrollment opens in February.";

/** The free strategy call before private tutoring, and the fit call before a program seat. */
export const CALL_MINUTES = 20;

/** Founder, 2026-11-08. Both packages carry the guarantee (see GUARANTEE.private). */
export const PRIVATE_PACKAGES = [
  { id: "private-10", name: "Private 10", hours: 10, price: 1495 },
  { id: "private-20", name: "Private 20", hours: 20, price: 2495 },
] as const;

/** "$149.50" for Private 10: the package price over its hours, cents only when there are some. */
export function pricePerHour(pkg: { price: number; hours: number }): string {
  const perHour = pkg.price / pkg.hours;
  return Number.isInteger(perHour)
    ? formatPrice(perHour)
    : `$${perHour.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const PRIVATE_INCLUDES: ProgramInclusion[] = [
  {
    title: "Weekly 60-minute sessions with a Karman tutor",
    detail:
      "Each session goes through every mistake on your latest full-length, or targets the skill holding you back.",
  },
  {
    title: "Scheduled around your week",
    detail: "Start whenever you're ready, at times that fit your student's week.",
  },
  {
    title: "Everything in Pro",
    detail:
      "Practice tests, Daily 10 and 10,000+ original questions, the mastery questions included, with video explanations.",
  },
  {
    title: "The weekly live session",
    detail: "Test mechanics and skill workshops, with everyone in the program.",
  },
  {
    title: "A note to parents after every session",
    detail: "What you worked on, what improved and what comes next.",
  },
];

/** Every plan id, the same everywhere: the site, Stripe lookup keys, the
 *  subscriptions table and src/lib/plans (founder, 2026-11-08). */
export const PLAN_IDS = [
  "free",
  "practice",
  "pro",
  "cohort",
  "private-10",
  "private-20",
  "school",
  "tutor-affiliate",
] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** Free: 100 questions in total, plus one free full-length test. No card, no guarantee. */
export const FREE_PLAN = {
  id: "free",
  name: "Free",
  price: 0,
  questionLimit: 100,
  fullLengthTests: 1,
  includes: ["100 practice questions in total", "One full-length practice test"],
} as const;

/** The core question pool with written explanations. No guarantee. */
export const PRACTICE_PLAN = {
  id: "practice",
  name: "Practice",
  monthly: 39,
  /** One payment for three months. */
  threeMonths: 89,
  pool: "core",
  explanations: "written",
  includes: [
    "The core question pool, across all 39 SAT skills",
    "Written explanations for every question",
    "The Daily 10, ten questions a day from the skills your student misses",
    "Full-length practice tests",
    "Progress for parents on their phone",
  ],
} as const;

/** Every question, the hard mastery pool included, with video explanations. No guarantee. */
export const PRO_PLAN = {
  id: "pro",
  name: "Pro",
  monthly: 69,
  /** One payment for three months. */
  threeMonths: 149,
  pool: "mastery",
  explanations: "video",
  includes: [
    "Every question, including the hard mastery pool",
    "Video explanations, as well as written ones",
    "The Daily 10, ten questions a day from the skills your student misses",
    "Full-length practice tests",
    "Progress for parents on their phone",
  ],
} as const;

/** Monthly and 3-month plans renew until cancelled; cancelling stops the next payment.
 *  CONFIRM: renewal wording. */
export const PLAN_RENEWAL =
  "Monthly and 3-month plans renew until you cancel. Cancel any time and the plan runs to the end of the time you paid for.";

/** School licenses: every student gets a Practice plan of their own, not a shared pool. */
export const SCHOOL_PLAN = {
  id: "school",
  name: "Schools",
  pricePerStudentPerYear: 8,
  /** The first year costs nothing. */
  firstYearFree: true,
  studentPlan: "practice",
  includes: [
    "A Practice plan for every student, their own, not a shared pool",
    "The core question pool with written explanations",
    "The Daily 10 and full-length practice tests",
    "A school view of every student's progress",
  ],
} as const;

/** For tutors who sell on marketplaces like Leland. CONFIRM: affiliate terms before launch. */
export const TUTOR_AFFILIATE_PLAN = {
  id: "tutor-affiliate",
  name: "Tutor affiliate",
  monthly: 199,
  /** Students who redeem the tutor's code get this plan free while the tutor pays. */
  studentPlan: "practice",
  maxStudents: 50,
  includes: [
    "One code for up to 50 students",
    "A Practice plan for each student, free while your subscription is active",
    "See each student's progress",
    "Assign work",
    "Manage your roster and remove a student",
  ],
} as const;

export const FREE_PRACTICE_TEST = {
  id: "practice-test-2026-12-12",
  name: "Free practice test",
  dateLabel: "Saturday, December 12, 2026",
  dateShort: "December 12",
  // CONFIRM: start time.
  timeLabel: "10:00 a.m. ET",
  durationLabel: "About 75 minutes",
  minutes: 75,
  questionCount: 49,
  /** The results call after the test. */
  callMinutes: 20,
  format: "One Reading and Writing module and one Math module, about 49 questions.",
  delivery: "Live on Zoom, with a live proctor.",
  cadence: "Every month.",
  includes: [
    "An estimated score range",
    "A domain-by-domain breakdown",
    "A 20-minute results call with a Karman tutor",
  ],
} as const;

export const DIAGNOSTIC = {
  questionCount: 35,
  durationLabel: "About 35 minutes",
} as const;

/**
 * The guarantee (founder, 2026-11-08; see docs/business/guarantee.md). The
 * Cohort, Private 10 and Private 20 carry it. The target depends on the
 * starting score. CONFIRM: lawyer review before launch.
 */
export const GUARANTEE = {
  /** Baselines under this score aim for `pointsBelow`; at or above it, `pointsFrom`. */
  splitAt: 1400,
  pointsBelow: 100,
  pointsFrom: 50,
  /** A 1600 always counts as reaching the target (a 1560 can't gain 50). */
  topScore: 1600,
  /** Plans that carry it. */
  planIds: ["cohort", "private-10", "private-20"],
  /** Live classes the student must attend, out of MARCH_PROGRAM.totalClasses. */
  minClassesAttended: 15,
  /** Share of the assigned weekly practice that must be done. */
  practicePct: 90,
  /** The official SAT must be taken within this many days of the last class. */
  satWithinDays: 60,
  /** How recent an official SAT or PSAT must be to serve as the baseline. */
  baselineMonths: 6,
  /** Days after scores come out to send the claim. */
  claimDays: 30,
  baseline:
    "an official SAT or PSAT from the last 6 months, or the week-1 Bluebook test, proctored live by Karman",
  /** What the family gets, by official result. The family chooses money or a seat. */
  outcomes: [
    { result: "The target or more, or a 1600", remedy: "Nothing back. The promise was kept." },
    {
      result: "Half the target or more",
      remedy: "Half the price back, or the next cohort free. You choose.",
    },
    {
      result: "Under half the target",
      remedy: "The full price back, or the next cohort free. You choose.",
    },
  ],
  requirements: [
    "Attend at least 15 of the 18 live classes, live.",
    "Take all five full-length practice tests, each in one timed sitting, in the week it's assigned.",
    "Complete at least 90% of the assigned weekly practice.",
    "Sit the official SAT within 60 days of the last class.",
  ],
  eligibility: [
    "A student's first Karman program, once per student.",
    "Paid in full, or every installment paid on time.",
  ],
  claim:
    "Within 30 days of scores coming out, email the official College Board score report to guarantee@karmanprep.com.",
  claimEmail: "guarantee@karmanprep.com",
  /** Private 10 and Private 20: the same targets, made good with free hours, then money. */
  private: {
    cancelHours: 24,
    satWithinDays: 30,
    packages: {
      "private-10": { bonusHours: 3, fullLengthTests: 2 },
      "private-20": { bonusHours: 6, fullLengthTests: 4 },
    },
    requirements: [
      "Attend every session. Cancelling with less than 24 hours' notice counts as a missed session.",
      "Take the full-length practice tests in your package: two on Private 10, four on Private 20.",
      "Sit the official SAT within 30 days of the last session.",
    ],
    remedy:
      "Free extra hours (3 on Private 10, 6 on Private 20). If the next official SAT still falls short, half the price back.",
  },
} as const;

/** "+100 points" under a 1400 start, "+50 points" from 1400. */
export function guaranteeTarget(baseline: number): number {
  return baseline < GUARANTEE.splitAt ? GUARANTEE.pointsBelow : GUARANTEE.pointsFrom;
}

/** Who we tell, before they pay, that a program probably isn't worth their money. */
export const INTAKE = { scoreFrom: 1500, minWeeks: 4 } as const;

export const INTAKE_NOTE =
  "If you're already scoring 1500 or higher, or your SAT is less than four weeks away, we'll tell you honestly that a program probably isn't the best use of your money.";

/**
 * The scholarship (founder, 2026-11-08): $1,500 to the top-scoring student in
 * each cohort, paid as a refund of the cohort price plus a merit bonus.
 * The upload, check, review queue and payout are built in the admin portal.
 */
export const SCHOLARSHIP = {
  amount: 1500,
  /** The cohort price, refunded. */
  refund: MARCH_PROGRAM.price,
  /** Paid on top of the refund: 995 + 505 = 1,500. */
  meritBonus: 1500 - MARCH_PROGRAM.price,
  contactEmail: "hello@karmanprep.com",
} as const;

export const CONTACT = {
  general: "hello@karmanprep.com",
  support: "support@karmanprep.com",
  billing: "billing@karmanprep.com",
} as const;

/**
 * Enrollment links. Both are optional: when unset, CTAs fall back
 * to the on-site lead form (see LeadForm).
 */
export const ENROLL_LINKS = {
  /** Stripe Payment Link for the $95 refundable cohort deposit (part of the $995). */
  cohortDepositUrl: process.env.NEXT_PUBLIC_COHORT_DEPOSIT_URL || null,
  /** Cal.com (or similar) link for a free private-tutoring strategy call. */
  strategyCallUrl: process.env.NEXT_PUBLIC_STRATEGY_CALL_URL || null,
} as const;

/** Every value the public lead form may send as `source`. */
export const LEAD_SOURCES = [
  "coming-soon",
  "newsletter",
  "practice-test-2026-12-12",
  "cohort-march-2027",
  "cohort-may-2027",
  "cohort-june-2027",
  "private",
  "scholarship",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** "$1,495" — whole dollars, US formatting. */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
