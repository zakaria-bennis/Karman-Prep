/*
 * Simulated student for the prototype. Maya is the same fictional student as
 * prototypes/portals/src/mock. No real student's data. Questions are Karman
 * originals written for this demo, not College Board material.
 */
window.PLANS = {
  free: { label: "Free", daily: false, tests: true, questions: 100, used: 37, upgrade: "Practice" },
  practice: { label: "Practice", daily: true, tests: true, upgrade: "Pro" },
  pro: { label: "Pro", daily: true, tests: true },
  cohort: { label: "Cohort", daily: true, tests: true, guarantee: true, homework: true, rank: { place: "1st of 6", average: 1244 }, live: { tab: "Classes", row: "First class with David", when: "Tue, Jan 5", cta: "See class details", rows: [["Class with David", "Tue, Jan 5"], ["Class with David", "Thu, Jan 7"], ["Proctored full-length test", "Sat, Jan 9"]] } },
  private: { label: "Private 1:1", daily: true, tests: true, guarantee: true, homework: true, schedule: true, live: { tab: "Schedule" } },
  school: { label: "School", daily: true, tests: true, upgrade: "Pro" },
};

window.ADDS = {
  Practice: ["Your Daily 10", "The core question pool, with written explanations", "Full-length tests and a Karman predicted score", "Parent account and updates"],
  Pro: ["Every question, including the hard mastery pool", "Video explanations, added as they're recorded"],
};

window.MAYA = {
  name: "Maya",
  today: "2026-11-06",
  sat: "2027-03-06",
  satLabel: "Sat, Mar 6",
  predicted: 1390,
  start: 1280,
  sections: { Math: 700, "Reading and Writing": 690 },
  tests: [
    { n: 1, date: "Jul 18", score: 1300 },
    { n: 2, date: "Aug 29", score: 1340 },
    { n: 3, date: "Oct 3", score: 1360 },
  ],
  nextTest: { name: "Full-length test 4", due: "Sat, Nov 14" },
  streak: 7,
  bestStreak: 12,
  tokens: 240,
  boxCost: 300,
  // Karman's approved 39 skills. Levels are simulated: 1 Learning, 2 Developing, 3 Proficient, 4 Mastered.
  focus: ["Transitions", "Nonlinear functions", "Command of Evidence"],
  skills: [{"name":"Central Ideas and Details","section":"Reading and Writing","domain":"Information and Ideas","level":3},{"name":"Command of Evidence","section":"Reading and Writing","domain":"Information and Ideas","level":2},{"name":"Inferences","section":"Reading and Writing","domain":"Information and Ideas","level":3},{"name":"Words in Context","section":"Reading and Writing","domain":"Craft and Structure","level":4},{"name":"Text Structure and Purpose","section":"Reading and Writing","domain":"Craft and Structure","level":3},{"name":"Cross-Text Connections","section":"Reading and Writing","domain":"Craft and Structure","level":2},{"name":"Rhetorical Synthesis","section":"Reading and Writing","domain":"Expression of Ideas","level":2},{"name":"Transitions","section":"Reading and Writing","domain":"Expression of Ideas","level":2},{"name":"Sentence boundaries and joining independent clauses","section":"Reading and Writing","domain":"Standard English Conventions","level":4},{"name":"Joining main and dependent clauses","section":"Reading and Writing","domain":"Standard English Conventions","level":3},{"name":"Essential versus nonessential information including names and titles","section":"Reading and Writing","domain":"Standard English Conventions","level":2},{"name":"Colons and dashes introducing explanations or lists","section":"Reading and Writing","domain":"Standard English Conventions","level":1},{"name":"Lists and series","section":"Reading and Writing","domain":"Standard English Conventions","level":4},{"name":"Unnecessary punctuation within a sentence","section":"Reading and Writing","domain":"Standard English Conventions","level":3},{"name":"Subject-verb agreement","section":"Reading and Writing","domain":"Standard English Conventions","level":4},{"name":"Pronoun-antecedent agreement","section":"Reading and Writing","domain":"Standard English Conventions","level":3},{"name":"Finite versus nonfinite verb forms","section":"Reading and Writing","domain":"Standard English Conventions","level":2},{"name":"Verb tense and aspect","section":"Reading and Writing","domain":"Standard English Conventions","level":3},{"name":"Modifier placement","section":"Reading and Writing","domain":"Standard English Conventions","level":1},{"name":"Plurals possessives and contractions","section":"Reading and Writing","domain":"Standard English Conventions","level":3},{"name":"Linear equations in one variable","section":"Math","domain":"Algebra","level":4},{"name":"Linear equations in two variables","section":"Math","domain":"Algebra","level":3},{"name":"Linear functions","section":"Math","domain":"Algebra","level":3},{"name":"Systems of two linear equations in two variables","section":"Math","domain":"Algebra","level":3},{"name":"Linear inequalities in one or two variables","section":"Math","domain":"Algebra","level":2},{"name":"Equivalent expressions","section":"Math","domain":"Advanced Math","level":3},{"name":"Nonlinear equations in one variable and systems of equations in two variables","section":"Math","domain":"Advanced Math","level":1},{"name":"Nonlinear functions","section":"Math","domain":"Advanced Math","level":2},{"name":"Ratios rates proportional relationships and units","section":"Math","domain":"Problem-Solving and Data Analysis","level":4},{"name":"Percentages","section":"Math","domain":"Problem-Solving and Data Analysis","level":4},{"name":"One-variable data: distributions and measures of center and spread","section":"Math","domain":"Problem-Solving and Data Analysis","level":3},{"name":"Two-variable data: models and scatterplots","section":"Math","domain":"Problem-Solving and Data Analysis","level":3},{"name":"Probability and conditional probability","section":"Math","domain":"Problem-Solving and Data Analysis","level":2},{"name":"Inference from sample statistics and margin of error","section":"Math","domain":"Problem-Solving and Data Analysis","level":1},{"name":"Evaluating statistical claims: observational studies and experiments","section":"Math","domain":"Problem-Solving and Data Analysis","level":1},{"name":"Area and volume","section":"Math","domain":"Geometry and Trigonometry","level":3},{"name":"Lines angles and triangles","section":"Math","domain":"Geometry and Trigonometry","level":4},{"name":"Right triangles and trigonometry","section":"Math","domain":"Geometry and Trigonometry","level":2},{"name":"Circles","section":"Math","domain":"Geometry and Trigonometry","level":2}],
  stats: [
    ["Pace", "58 s a question"],
    ["Hardest question answered right", "Cross-Text Connections"],
    ["Slowest question", "2:14, Circles"],
    ["Changed answers", "2 this week"],
    ["Set difficulty", "Medium to hard"],
    ["Misses reviewed", "11 of 14"],
    ["Skills covered", "39 of 39"],
    ["Best set", "10 of 10"],
    ["Fastest clean set", "6:12"],
    ["Longest streak", "12 days"],
  ],
  misses: 3,
  prize: { id: "glasses", name: "Reading glasses" },
};

window.SET = [
  { skill: "Transitions", section: "Reading and Writing", q: "The trail was closed for repairs all spring. ____ hikers had to take the longer route along the river.", a: ["Instead,", "As a result,", "Similarly,", "For example,"], c: 1, why: "The second sentence is a consequence of the first." },
  { skill: "Linear equations in one variable", section: "Math", q: "If 3x + 5 = 20, what is the value of x?", a: ["3", "5", "7", "15"], c: 1, why: "Subtract 5 to get 3x = 15, then divide by 3." },
  { skill: "Words in Context", section: "Reading and Writing", q: "The new library's design was so ____ that visitors often stopped just to look at it. Which word fits best?", a: ["striking", "ordinary", "hidden", "brief"], c: 0, why: "People stop to look at something that stands out." },
  { skill: "Percentages", section: "Math", q: "A jacket that costs $80 is on sale for 25% off. What is the sale price?", a: ["$20", "$55", "$60", "$75"], c: 2, why: "25% of 80 is 20, and 80 minus 20 is 60." },
  { skill: "Subject-verb agreement", section: "Reading and Writing", q: "Choose the form that completes the sentence: The box of old photographs ____ on the top shelf.", a: ["sit", "sits", "are sitting", "have sat"], c: 1, why: "The subject is box, which is singular." },
  { skill: "Nonlinear functions", section: "Math", q: "If f(x) = x² − 4, what is f(3)?", a: ["2", "5", "9", "13"], c: 1, why: "3 squared is 9, and 9 minus 4 is 5." },
  { skill: "Command of Evidence", section: "Reading and Writing", q: "A student claims that the town's bike lanes increased cycling. Which finding best supports the claim?", a: ["The lanes were painted green.", "Bike trips doubled after the lanes opened.", "Some drivers disliked the lanes.", "The town has many parks."], c: 1, why: "Only this finding links the lanes to more cycling." },
  { skill: "Lines angles and triangles", section: "Math", q: "Two angles of a triangle measure 50° and 60°. What is the third angle?", a: ["60°", "70°", "80°", "110°"], c: 1, why: "The angles add up to 180°." },
  { skill: "Inferences", section: "Reading and Writing", q: "Lena checked the forecast twice, then packed an umbrella and boots. What can be inferred?", a: ["She expects bad weather.", "She dislikes her boots.", "She lost her umbrella.", "She stays home."], c: 0, why: "Her packing points to rain." },
  { skill: "Ratios rates proportional relationships and units", section: "Math", q: "A car travels 150 miles in 3 hours. At this rate, how far does it go in 5 hours?", a: ["200 miles", "225 miles", "250 miles", "300 miles"], c: 2, why: "The rate is 50 miles an hour, and 50 times 5 is 250." },
];

/* The demo's clock, so the 24-hour rule always shows the same way. */
window.DEMO_NOW = "2026-11-06T18:00";

/* Homework for Cohort and Private. Due at the end of the day it is set for. */
window.HW_TYPES = {
  daily: { label: "Daily 10", icon: "star" },
  skill: { label: "Skill practice", icon: "practice", sizes: ["10 questions", "15 questions", "20 questions"], topics: ["Transitions", "Nonlinear functions", "Command of Evidence", "Percentages", "Circles"] },
  module: { label: "Module", icon: "test", sizes: ["27 questions, 32 min", "22 questions, 35 min"], topics: ["Reading and Writing, module 1", "Reading and Writing, module 2", "Math, module 1", "Math, module 2"] },
  lesson: { label: "Lesson", icon: "live", sizes: ["8 min", "12 min", "20 min"], topics: ["Nonlinear functions", "Transitions", "Command of Evidence", "Circles"] },
  trial: { label: "Time trial", icon: "timer", sizes: ["10 questions, 12 min", "20 questions, 24 min"], topics: ["Linear equations", "Percentages", "Words in Context"] },
  test: { label: "Full-length test", icon: "progress", sizes: ["98 questions, 2 hr 14 min"], topics: ["Full-length test 4", "Full-length test 5"] },
};
window.HOMEWORK = [
  { id: "h0", type: "skill", title: "Skill practice: Command of Evidence", size: "15 questions", due: "2026-11-05T23:59" },
  { id: "h1", type: "skill", title: "Skill practice: Transitions", size: "15 questions", due: "2026-11-06T23:59", note: "We missed these on Test 3. Read the sentence before the blank first." },
  { id: "h2", type: "lesson", title: "Lesson: Nonlinear functions", size: "12 min", due: "2026-11-06T23:59" },
  { id: "h3", type: "trial", title: "Time trial: Linear equations", size: "10 questions, 12 min", due: "2026-11-07T23:59" },
  { id: "h4", type: "module", title: "Reading and Writing, module 1", size: "27 questions, 32 min", due: "2026-11-08T23:59" },
  { id: "h5", type: "test", title: "Full-length test 4", size: "98 questions, 2 hr 14 min", due: "2026-11-14T23:59" },
  { id: "h6", type: "lesson", title: "Lesson: Transitions", size: "8 min", due: "2026-11-05T23:59", doneAt: "Thu, Nov 5" },
  { id: "h7", type: "trial", title: "Time trial: Percentages", size: "10 questions, 12 min", due: "2026-11-04T23:59", doneAt: "Wed, Nov 4", result: "9 of 10" },
];
/* What the algorithm would suggest to the tutor, with the reason it shows. */
window.SUGGESTIONS = [
  { id: "s1", type: "skill", title: "Skill practice: Nonlinear functions", size: "15 questions", due: "2026-11-08T23:59", why: "61% right, and it fell over the last two weeks" },
  { id: "s2", type: "trial", title: "Time trial: Words in Context", size: "10 questions, 12 min", due: "2026-11-07T23:59", why: "Accurate but slow: 84 seconds a question" },
  { id: "s3", type: "module", title: "Math, module 2", size: "22 questions, 35 min", due: "2026-11-11T23:59", why: "Last timed Math module was 5 weeks ago" },
];
window.DUE_OPTIONS = [
  ["2026-11-06T23:59", "Tonight"], ["2026-11-07T23:59", "Sat, Nov 7"], ["2026-11-08T23:59", "Sun, Nov 8"], ["2026-11-09T23:59", "Mon, Nov 9"], ["2026-11-13T23:59", "Fri, Nov 13"],
];

/* Private 1:1. Rules come from src/app/api/bookings/reschedule/route.ts. */
window.RULES = { noticeHours: 24, movesPerSession: 1, bookAheadDays: 14 };
window.CREDITS = { total: 20, used: 7 };
window.SESSIONS = [
  { id: "a", kind: "Full-length review session", at: "2026-11-07T16:00", moved: 0 },
  { id: "b", kind: "1:1 session", at: "2026-11-10T16:00", moved: 0 },
  { id: "c", kind: "1:1 session", at: "2026-11-17T16:00", moved: 1 },
];
window.PAST_SESSIONS = [
  { kind: "1:1 session", when: "Tue, Nov 3" },
  { kind: "Full-length review session", when: "Tue, Oct 27" },
  { kind: "1:1 session", when: "Tue, Oct 20" },
];
