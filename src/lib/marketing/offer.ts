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
  classDays: ["Tuesday", "Thursday"],
  classDaysLabel: "Tuesdays and Thursdays",
  classStart: "7:00",
  classEnd: "8:30 p.m. ET",
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
      detail: "18 classes of 90 minutes in a group of up to six, taught by a Karman tutor.",
    },
    {
      title: "Five full-length practice tests",
      detail:
        "Your week-1 baseline is an official Bluebook test, proctored live. So is the dress rehearsal a week before the SAT.",
    },
    {
      title: "A 60-minute 1:1 after every full-length",
      detail:
        "Your tutor goes through every mistake with your student: what happened and how to fix it.",
    },
    {
      title: "A weekly live session",
      detail:
        "Test mechanics (pacing, Desmos, how the adaptive second module works), alternating with workshops on the skills students miss most.",
    },
    {
      title: "Daily 10",
      detail: "Ten minutes a day. Every question you miss comes back after 2, 7 and 21 days.",
    },
    {
      title: "10,000+ original practice questions",
      detail: "Across all 39 SAT skills.",
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
 * Later cohorts. SAT dates are official (College Board 2026-27 calendar,
 * checked 2026-10-20). Start and close dates follow the March rhythm: classes
 * start on a Monday 61 days before the test, applications close the Wednesday
 * before. CONFIRM: start and close dates for May and June.
 */
export const NEXT_PROGRAMS = [
  {
    id: "cohort-may-2027",
    testDate: "2027-05-01",
    testDateLabel: "Saturday, May 1, 2027",
    testDateShort: "May 1",
    startDate: "2027-03-01",
    startLabel: "Monday, March 1",
    enrollmentClosesLabel: "Wednesday, February 24",
  },
  {
    id: "cohort-june-2027",
    testDate: "2027-06-05",
    testDateLabel: "Saturday, June 5, 2027",
    testDateShort: "June 5",
    startDate: "2027-04-05",
    startLabel: "Monday, April 5",
    enrollmentClosesLabel: "Wednesday, March 31",
  },
] as const;
export const NEXT_PROGRAMS_ENROLLMENT_LABEL = "Enrollment opens in February.";

export const PRIVATE_HOURLY_RATE = 145;
/** The free strategy call before private tutoring, and the fit call before a program seat. */
export const CALL_MINUTES = 20;

export const PRIVATE_PACKAGES = [
  { id: "private-10", name: "Private 10", hours: 10, price: 1450 },
  { id: "private-20", name: "Private 20", hours: 20, price: 2900 },
] as const;

export const PRIVATE_INCLUDES: ProgramInclusion[] = [
  {
    title: "Weekly 60-minute sessions with a Karman tutor",
    detail:
      "Each session goes through every mistake on your latest full-length, or targets the skill holding you back.",
  },
  {
    title: "Scheduled around your test date",
    detail: "Start whenever you're ready. Hours are planned backward from the SAT you're taking.",
  },
  {
    title: "Everything on the platform",
    detail: "Practice tests, Daily 10 and 10,000+ original questions.",
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
 * The guarantee (proposed 2026-10-25, see docs/business/guarantee.md).
 * CONFIRM: lawyer review before launch.
 */
export const GUARANTEE = {
  points: 100,
  orScore: 1450,
  /** Students starting at or above this are not covered (told before enrolling). */
  excludedFrom: 1450,
  /** The two bands below the promise: from this gain, half back; under it, everything back. */
  halfBackFrom: 50,
  /** Live classes the student must attend, out of MARCH_PROGRAM.totalClasses. */
  minClassesAttended: 15,
  /** Share of the assigned weekly practice that must be done. */
  practicePct: 90,
  /** Hours' notice that makes rescheduling a one-on-one review fine. */
  rescheduleHours: 24,
  /** If the SAT is cancelled (or with a doctor's note), the next official SAT within this many days counts. */
  fallbackSatDays: 60,
  /** How recent an official SAT or PSAT must be to serve as the baseline. */
  baselineMonths: 6,
  /** Days after scores come out to send the claim. */
  claimDays: 30,
  baseline:
    "an official SAT or PSAT from the last 6 months, or the week-1 Bluebook test, proctored live by Karman",
  /** What the family gets, by official result. The family chooses money or a seat. */
  outcomes: [
    { result: "+100 or more, or 1450 and up", remedy: "Nothing back. The promise was kept." },
    { result: "+50 to +99", remedy: "Half the price back, or the next cohort free. You choose." },
    { result: "Under +50", remedy: "The full price back, or the next cohort free. You choose." },
  ],
  requirements: [
    "Attend at least 15 of the 18 live classes, live.",
    "Complete all five one-on-one reviews. Rescheduling with 24 hours' notice is fine.",
    "Take all five full-length practice tests, each in one timed sitting, in the week it's assigned.",
    "Complete at least 90% of the assigned weekly practice.",
    "Sit the official SAT on the program's test date, or the next one within 60 days if it's cancelled or with a doctor's note.",
  ],
  eligibility: [
    "A student's first Karman program, once per student.",
    "Students starting at 1450 or above are not covered.",
    "Paid in full, or every installment paid on time.",
  ],
  claim:
    "Within 30 days of scores coming out, email the official College Board score report to guarantee@karmanprep.com.",
  claimEmail: "guarantee@karmanprep.com",
  private20: {
    points: 100,
    orScore: 1450,
    bonusHours: 6,
    cancelHours: 24,
    fullLengthTests: 4,
    satWithinDays: 30,
    requirements: [
      "Attend every session. Cancelling with less than 24 hours' notice counts as a missed session.",
      "Take four full-length practice tests.",
      "Sit the official SAT within 30 days of the last session.",
    ],
    remedy:
      "Up to 6 more hours free. If the next official SAT still falls short, half the price back.",
  },
} as const;

/** Who we tell, before they pay, that a program probably isn't worth their money. */
export const INTAKE = { scoreFrom: 1500, minWeeks: 4 } as const;

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
  "cohort-may-2027",
  "cohort-june-2027",
  "private",
  "scholarship",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** "$1,295" — whole dollars, US formatting. */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
