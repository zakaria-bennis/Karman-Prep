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
  /** The founder's figure (2026-11-09). */
  averageGain: 280,
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
  /** No fixed first-class day (founder, 2026-11-08): name the week, never a weekday. */
  startLabel: "the week of January 4, 2027",
  startShort: "January 4",
  weeks: 9,
  classesPerWeek: 2,
  classMinutes: 60,
  totalClasses: 18,
  /** One every week, taken between that week's classes (founder, 2026-11-11; it was five). */
  fullLengthTests: 9,
  /** Each cohort is grouped by starting score, so a class works on the same level. */
  scoreBands: ["1000 to 1200", "1200 to 1400", "1400 to 1600"],
  /** Registration closes one week before the first class (founder, 2026-11-11). */
  enrollmentClosesLabel: "December 28, 2026",
  /** The same day as a date, for the countdown on the Program page. */
  enrollmentCloses: "2026-12-28",
  /** At most six students in a cohort, every seat paid. */
  paidSeats: 6,
  /** Paid seats already held with a deposit. The site shows the seats still open.
   *  Update as each family holds a seat. */
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
      title: "Nine full-length practice tests",
      detail:
        "One every week, taken between that week's classes. The class then goes over what the group missed.",
    },
    {
      title: "Weekly workshops, on top of the classes",
      detail:
        "Optional live sessions on test mechanics (pacing, Desmos, how the adaptive second module works) and the skills students miss most. Your student picks the ones they need.",
    },
    {
      title: "Daily 10",
      detail:
        "Ten questions a day, picked from your weakest skills. Missed questions come back until they stick.",
    },
    {
      title: "Everything in Pro",
      detail:
        "10,000+ original practice questions across all 39 SAT skills, the hard mastery questions included, with video explanations added as they're recorded.",
    },
    {
      title: "Your cohort, between classes",
      detail: "A group chat for your cohort. Questions are answered by a Karman tutor every day.",
    },
    {
      title: "A daily report for parents",
      detail: "The work done, the predicted score and a note from the tutor.",
    },
  ] satisfies ProgramInclusion[],
} as const;

/**
 * Later cohorts, named by the week they start (never a weekday; founder, 2026-11-08).
 * Registration closes one week before the first class (founder, 2026-11-11).
 */
export const NEXT_PROGRAMS = [
  {
    id: "cohort-may-2027",
    startDate: "2027-03-01",
    startLabel: "the week of March 1",
    startShort: "March 1",
    enrollmentClosesLabel: "February 22",
  },
  {
    id: "cohort-june-2027",
    startDate: "2027-04-05",
    startLabel: "the week of April 5",
    startShort: "April 5",
    enrollmentClosesLabel: "March 29",
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
      "Practice tests, Daily 10 and 10,000+ original questions, the mastery questions included, with video explanations added as they're recorded.",
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
    "Video explanations, added as they're recorded",
    "The Daily 10, ten questions a day from the skills your student misses",
    "Full-length practice tests",
    "Progress for parents on their phone",
  ],
} as const;

/** Monthly and 3-month plans renew until cancelled; cancelling stops the next payment and the plan
 *  runs to the end of the time paid for. The site says it in three words (founder, 2026-11-09). */
export const PLAN_RENEWAL = "Cancel any time.";

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

/** For tutors who sell on marketplaces like Leland. Shown only on /for-tutors, never with the
 *  family plans (founder, 2026-11-09). maxStudents counts students at the same time. */
export const TUTOR_AFFILIATE_PLAN = {
  id: "tutor-affiliate",
  name: "Tutor affiliate",
  monthly: 199,
  /** Students who redeem the tutor's code get this plan free while the tutor pays. */
  studentPlan: "practice",
  maxStudents: 40,
  summary:
    "$199 a month gives up to 40 concurrent students the Practice plan for free, with their progress and assignments in one place for you to view at any time.",
  includes: [
    "One code for up to 40 students at a time",
    "A Practice plan for each student, free while your subscription is active",
    "See each student's progress",
    "Assign work",
    "Manage your roster and remove a student",
  ],
} as const;

/** The free practice test (founder, 2026-11-09): no live proctored sitting. A family takes a
 *  full-length practice test on Karman whenever they like, then can book a results call. */
export const FREE_PRACTICE_TEST = {
  id: "practice-test-self-paced",
  name: "Free practice test",
  questionCount: 98,
  durationLabel: "About 2 hours 14 minutes",
  /** The optional results call after the test. */
  callMinutes: 20,
  format: "A full-length practice SAT: two Reading and Writing modules and two Math modules.",
  delivery: "On Karman, any time.",
  includes: [
    "A score report",
    "A domain-by-domain breakdown",
    "An optional 20-minute results call with a Karman tutor",
  ],
} as const;

export const DIAGNOSTIC = {
  questionCount: 35,
  durationLabel: "About 35 minutes",
} as const;

/**
 * The guarantee (see docs/business/guarantee.md). The Cohort, Private 10 and Private 20 carry it.
 *
 * - The rules (who is covered, what the student does, what comes back, how to claim) are the founder's
 *   of 2026-11-08, reviewed by a lawyer (founder, 2026-11-09).
 * - The targets are tiered by starting score and by how the student is taught (founder, 2026-11-09, the
 *   same day, replacing "+100, or +50 from 1400"). Private 20 carries the full numbers; the cohort and
 *   Private 10 carry the smaller ones, because one tutor is shared or the hours are few. From
 *   `noGuaranteeFrom` there is no guarantee, and the family is told before paying. The lawyer has not yet
 *   re-read the targets.
 */
export const GUARANTEE = {
  /** From this starting score there is no points target. The promise is that the score rises; if it does
   *  not, the student gets `highStartProMonths` months of Pro free (founder, 2026-11-11; cohort and private). */
  noGuaranteeFrom: 1460,
  highStartProMonths: 3,
  /** Starting score up to `upTo`: points promised on each track. */
  bands: [
    { upTo: 1200, private: 200, cohort: 150 },
    { upTo: 1300, private: 160, cohort: 120 },
    { upTo: 1400, private: 120, cohort: 80 },
    { upTo: 1450, private: 60, cohort: 40 },
  ],
  /** Which track each plan is on. */
  trackOf: { cohort: "cohort", "private-10": "cohort", "private-20": "private" },
  /** A 1600 always counts as reaching the target. */
  topScore: 1600,
  /** Plans that carry it. */
  planIds: ["cohort", "private-10", "private-20"],
  /** Live classes the student must attend, out of MARCH_PROGRAM.totalClasses. */
  minClassesAttended: 15,
  /** Share of the assigned weekly practice that must be done. */
  practicePct: 90,
  /** The SAT must be taken within this many days of the last class. */
  /** A cohort student sits the SAT their cohort ends on (founder, 2026-11-11), and may make up one test a
   *  week late and one missed class at a workshop. One of each, no more. */
  lateTestsAllowed: 1,
  classMakeUpsAllowed: 1,
  /** How recent an SAT or PSAT score must be to serve as the baseline. */
  baselineMonths: 6,
  /** Days after scores come out to send the claim. */
  /** Days after sitting the SAT to send the score (founder, 2026-11-11; it was 30 days after scores came out). */
  claimDays: 60,
  baseline:
    "an SAT or PSAT score from the last 6 months, or, for a student with no score yet, a placement test proctored live by Karman",
  /** What the family gets, by SAT result. The family chooses money or a seat. */
  outcomes: [
    { result: "The target or more, or a 1600", remedy: "Nothing back. The promise was kept." },
    {
      result: "Half the target or more",
      remedy:
        "Private 10: half the price back. Private 20: up to 6 more hours free, then half the price back if the next SAT still falls short.",
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
    "Sit the SAT within 60 days of the last class.",
  ],
  eligibility: [
    "A student's first Karman program, once per student.",
    "Paid in full, or every installment paid on time.",
  ],
  claim:
    "Within 30 days of scores coming out, email the College Board score report to guarantee@karmanprep.com.",
  claimEmail: "guarantee@karmanprep.com",
  /** Private 10 and Private 20: the same targets, made good with free hours, then money. */
  private: {
    cancelHours: 24,
    satWithinDays: 30,
    packages: {
      /** Founder, 2026-11-08: half the price back, no extra hours. */
      "private-10": { bonusHours: 0, fullLengthTests: 2 },
      "private-20": { bonusHours: 6, fullLengthTests: 4 },
    },
    requirements: [
      "Attend every session. Cancelling with less than 24 hours' notice counts as a missed session.",
      "Take the full-length practice tests in your package: two on Private 10, four on Private 20.",
      "Sit the SAT within 30 days of the last session.",
    ],
    remedy:
      "Free extra hours (3 on Private 10, 6 on Private 20). If the next SAT still falls short, half the price back.",
  },
} as const;

export type GuaranteeTrack = "cohort" | "private";
export type GuaranteePlanId = keyof typeof GUARANTEE.trackOf;

/** Points promised for a starting score on a track, or null when there is no guarantee. */
export function guaranteedGain(start: number, track: GuaranteeTrack): number | null {
  if (start >= GUARANTEE.noGuaranteeFrom) return null;
  const band = GUARANTEE.bands.find((b) => start <= b.upTo);
  return band ? band[track] : null;
}

/** The most a track promises: the lowest band's number. */
export function guaranteeMax(track: GuaranteeTrack): number {
  return GUARANTEE.bands[0][track];
}

/** SAT scores move in tens, so a band that ends at 1200 is followed by one that starts at 1210. */
const SCORE_STEP = 10;

/** "1200 or lower", "1210 to 1300": the starting scores band `i` covers. */
export function guaranteeBandLabel(i: number): string {
  const band = GUARANTEE.bands[i];
  return i === 0
    ? `${band.upTo} or lower`
    : `${GUARANTEE.bands[i - 1].upTo + SCORE_STEP} to ${band.upTo}`;
}

/** Who we tell, before they pay, that a program probably isn't worth their money. */
export const INTAKE = { scoreFrom: 1500, minWeeks: 4 } as const;

export const INTAKE_NOTE =
  "If you're already scoring 1500 or higher, or your SAT is less than four weeks away, we'll tell you honestly that a program probably isn't the best use of your money.";

/**
 * The cohort scholarship (founder decision 2026-11-08): one award to the
 * top-scoring student in each cohort, paid as a refund of the cohort price plus a
 * merit bonus for the rest. The full rules are the "Cohort Scholarship" section of
 * /terms (src/lib/scholarship/terms-section.ts). The app pays the refund of what
 * the family actually paid and makes up the rest with the bonus.
 * Reviewed by a lawyer; the refund plus a bank transfer for the rest (founder, 2026-11-09).
 */
export const COHORT_SCHOLARSHIP = {
  amount: 1500,
  /** The refund part: the cohort price. */
  refund: MARCH_PROGRAM.price,
  /** The merit bonus part: the award minus the refund. */
  meritBonus: Math.max(0, 1500 - MARCH_PROGRAM.price),
  /** The official SAT must be taken on or after the first class and within this many days of the last. */
  satWithinDays: 60,
  /** Days after official scores come out to upload the score report. */
  claimDays: 30,
  /** Days after approval to pay. */
  payWithinDays: 30,
} as const;

export const CONTACT = {
  general: "hello@karmanprep.com",
  support: "support@karmanprep.com",
  billing: "billing@karmanprep.com",
} as const;

/** Karman's own pages elsewhere. The handle is @KarmanPrep on all four (founder, 2026-11-11). */
export const SOCIALS = {
  facebook: "https://www.facebook.com/KarmanPrep",
  instagram: "https://www.instagram.com/KarmanPrep",
  tiktok: "https://www.tiktok.com/@KarmanPrep",
  youtube: "https://www.youtube.com/@KarmanPrep",
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
  "practice-test-self-paced",
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
