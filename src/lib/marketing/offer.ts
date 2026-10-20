// ============================================================
// Karman offer — the single source of truth for everything the
// marketing site says about programs, prices, dates, stats and
// the guarantee. Change a number here, never inside a component.
//
// The reasoning behind these numbers lives in
// docs/business-plan.md. Values the founder still has to confirm
// are marked `CONFIRM:`.
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
  /** Live original questions, rounded down (2,588 live on 2026-10-19). */
  verifiedCount: "2,500+",
  /** Where the bank is headed — only say "growing to", never "has". */
  targetCount: "10,000+",
  /** Selectable skills in src/data/curriculum/approved-skill-taxonomy.json. */
  skills: 39,
  difficultyLevels: 7,
} as const;

export type ProgramInclusion = { title: string; detail: string };

export const MARCH_PROGRAM = {
  id: "cohort-march-2027",
  name: "The March SAT Program",
  shortName: "March program",
  testDate: "2027-03-06",
  testDateLabel: "Saturday, March 6, 2027",
  testDateShort: "March 6",
  startDate: "2027-01-04",
  startLabel: "Monday, January 4, 2027",
  startShort: "January 4",
  weeks: 9,
  classesPerWeek: 2,
  classMinutes: 90,
  totalClasses: 18,
  fullLengthTests: 5,
  reviewMinutes: 60,
  // CONFIRM: class days and times.
  scheduleLabel: "Tuesdays and Thursdays, 7:00–8:30 p.m. ET",
  // CONFIRM: enrollment deadline.
  enrollmentClosesLabel: "Wednesday, December 30, 2026",
  paidSeats: 5,
  scholarshipSeats: 1,
  /** Founding price — the March 2027 cohort only. */
  price: 995,
  /** Price for later cohorts. */
  regularPrice: 1295,
  installments: { count: 3, amount: 345 },
  depositAmount: 100,
  includes: [
    {
      title: "Two live classes a week",
      detail: "18 classes of 90 minutes in a group of up to six, taught by Zakaria.",
    },
    {
      title: "Five full-length practice tests",
      detail:
        "Your week-1 baseline is an official Bluebook test, proctored live. So is the dress rehearsal a week before the SAT.",
    },
    {
      title: "A 60-minute 1:1 after every full-length",
      detail: "Zakaria goes through every mistake with you — what happened and how to fix it.",
    },
    {
      title: "A weekly live session",
      detail:
        "Test mechanics — pacing, Desmos, how the adaptive second module works — alternating with workshops on the skills students miss most.",
    },
    {
      title: "Daily 10",
      detail: "Ten minutes a day. Every question you miss comes back after 2, 7 and 21 days.",
    },
    {
      title: "2,500+ original practice questions",
      detail: "Across all 39 SAT skills at seven difficulty levels.",
    },
    {
      title: "Your cohort, between classes",
      detail: "A group chat for your cohort. Questions to Zakaria are answered every day.",
    },
    {
      title: "Weekly updates for parents",
      detail: "Practice time, attendance, test scores and what's next.",
    },
  ] satisfies ProgramInclusion[],
} as const;

export const NEXT_PROGRAMS = [
  { testDateLabel: "Saturday, May 1, 2027", testDateShort: "May 1" },
  { testDateLabel: "Saturday, June 5, 2027", testDateShort: "June 5" },
] as const;
export const NEXT_PROGRAMS_ENROLLMENT_LABEL = "Enrollment opens in February.";

export const PRIVATE_HOURLY_RATE = 145;

export const PRIVATE_PACKAGES = [
  { id: "private-10", name: "Private 10", hours: 10, price: 1450 },
  { id: "private-20", name: "Private 20", hours: 20, price: 2900 },
] as const;

export const PRIVATE_INCLUDES: ProgramInclusion[] = [
  {
    title: "Weekly 60-minute sessions with Zakaria",
    detail:
      "Each session goes through every mistake on your latest full-length, or targets the skill holding you back.",
  },
  {
    title: "Scheduled around your test date",
    detail: "Start whenever you're ready. Hours are planned backward from the SAT you're taking.",
  },
  {
    title: "Everything on the platform",
    detail: "Practice tests, Daily 10 and 2,500+ original questions.",
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

export const FREE_PRACTICE_TEST = {
  id: "practice-test-2026-12-12",
  name: "Free practice test",
  dateLabel: "Saturday, December 12, 2026",
  dateShort: "December 12",
  // CONFIRM: start time.
  timeLabel: "10:00 a.m. ET",
  durationLabel: "About 75 minutes",
  questionCount: 49,
  format: "One Reading & Writing module and one Math module — about 49 questions.",
  delivery: "Live on Zoom, proctored by Zakaria.",
  cadence: "Every month.",
  includes: [
    "An estimated score range",
    "A domain-by-domain breakdown",
    "A 20-minute results call with Zakaria",
  ],
} as const;

export const DIAGNOSTIC = {
  questionCount: 35,
  durationLabel: "About 35 minutes",
} as const;

export const GUARANTEE = {
  points: 50,
  baseline: "an official Bluebook practice test, proctored live in your first week",
  requirements: [
    "Take the proctored baseline test in your first week.",
    "Attend at least 80% of live classes and every 1:1 session.",
    "Complete all five full-length practice tests.",
    "Complete your assigned weekly practice.",
    "Sit for the official SAT on your program's test date.",
    "Send us your official College Board score report within 30 days of receiving it.",
  ],
  remedy:
    "If your official score isn't at least 50 points above your baseline, your next cohort is free.",
  claimEmail: "guarantee@karmanprep.com",
} as const;

export const INTAKE_NOTE =
  "If you're already scoring 1500 or higher, or your test is less than four weeks away, we'll tell you honestly that a program probably isn't the best use of your money.";

export const SCHOLARSHIP = {
  summary:
    "One seat in every cohort is a scholarship seat, free for a student whose family can't afford the program.",
  contactEmail: "hello@karmanprep.com",
} as const;

export const CONTACT = {
  general: "hello@karmanprep.com",
  support: "support@karmanprep.com",
} as const;

/**
 * Enrollment links. Both are optional: when unset, CTAs fall back
 * to the on-site lead form (see LeadForm).
 */
export const ENROLL_LINKS = {
  /** Stripe Payment Link for the $100 refundable cohort deposit. */
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
  "private",
  "scholarship",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** "$1,295" — whole dollars, US formatting. */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
