// ============================================================
// KARMAN SITE COPY: every word on the marketing pages.
// Written 2026-10-25 with the Conversion Copywriter skill (the deck with
// the alternates and scores is docs/copy/copy-run on claude/site-redesign).
//
// How to edit: change the words after a label ("headline:", "text:" ...)
// and keep the label. Leave a line empty after the colon to hide it.
// Lists use " | " between items; in pairs, " = " splits left from right.
// Prices, dates and other numbers are ${...} slots filled from offer.ts:
// change those in src/lib/marketing/offer.ts, never here.
//
// Sections: 1 to 12 the home page, 21 to 27 the SAT Program, 31 to 36
// private tutoring, 41 to 45 the free practice test, 51 to 55 the
// guarantee, 61 to 65 About, 71 the FAQ, 81 to 83 the research, 90 the photos' alt text and
// captions. "## Site" holds the header, menu, footer, pricing page
// ("pricing ...") and the loading and form messages ("form ...").
//
// House rules: no em dashes, nothing the offer doesn't promise, tutoring
// results with "Karman 1:1 tutoring, median 16 weeks" (the home page's opening
// leaves it off: founder, 2026-11-10), no numbered list markers, talk to the parent.
// ============================================================

import {
  CALL_MINUTES,
  COHORT_SCHOLARSHIP as SCH,
  CONTACT,
  FREE_PLAN as FREE,
  FREE_PRACTICE_TEST as FT,
  FOUNDER,
  GUARANTEE as G,
  type GuaranteeTrack,
  guaranteeBandLabel,
  guaranteedGain,
  guaranteeMax,
  INTAKE,
  MARCH_PROGRAM as MP,
  NEXT_PROGRAMS,
  PLAN_RENEWAL,
  PRACTICE_PLAN as PP,
  PRIVATE_PACKAGES,
  PRO_PLAN as PRO,
  QUESTION_BANK as QB,
  SAT_DATES,
  SCHOOL_PLAN as SCHOOL,
  TRACK_RECORD as TR,
  TUTOR_AFFILIATE_PLAN as TA,
  formatPrice as $,
} from "./offer";

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
const WORDS_TEENS = [
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
];
/** 5 -> "five"; numbers past eighteen stay as digits. */
const w = (n: number) => WORDS[n] ?? WORDS_TEENS[n - 11] ?? String(n);
const W = (n: number) => w(n).charAt(0).toUpperCase() + w(n).slice(1);
/** 5 -> "five" (or "Five" at the start of a sentence). */
export const numberWord = (n: number, capital = false) => (capital ? W(n) : w(n));
/** "Saturday, March 6, 2027" -> "Saturday, March 6" */
const noYear = (s: string) => s.replace(/, \d{4}$/, "");
const monthOf = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const [MAY, JUNE] = NEXT_PROGRAMS;
const [P10, P20] = PRIVATE_PACKAGES;
const CLASS = MP.paidSeats;
const SEATS_LEFT = Math.max(0, MP.paidSeats - MP.paidSeatsTaken);
const START_DAY = noYear(MP.startLabel);
const CLOSES = noYear(MP.enrollmentClosesLabel);
const STARTS = [MP.startShort, MAY.startShort, JUNE.startShort];
/** The most each track promises. The target itself depends on the starting score (offer.ts, GUARANTEE). */
const UP_TO = {
  cohort: `Up to +${guaranteeMax("cohort")} points`,
  private: `Up to +${guaranteeMax("private")} points`,
} as const;
/** "1200 or lower", "1210 to 1300": the starting scores each band covers. */
const BAND_LABELS = G.bands.map((_, i) => guaranteeBandLabel(i));
const targetsFor = (track: GuaranteeTrack) =>
  G.bands.map((b, i) => `+${b[track]} from a start of ${BAND_LABELS[i]}`).join(", ");
const TARGETS = `The target depends on the starting score: ${targetsFor("cohort")}. From ${G.noGuaranteeFrom} the promise is that the score rises, or your student gets ${w(G.highStartProMonths)} months of ${PRO.name} free. A ${G.topScore} always counts.`;
/** The cohort's target for a starting score, for the worked examples. */
const cohortTarget = (start: number) => guaranteedGain(start, "cohort");
const TOP = G.bands[G.bands.length - 1];
const PROOF = `Karman's 1:1 students gained ${TR.averageGain} points on average. ${TR.sourceLabel}.`;
const SPLIT = `a ${$(MP.depositAmount)} deposit and ${w(MP.installments.count)} payments of ${$(MP.installments.amount)}`;
const PRIVATE_BONUS = G.private.packages;

export const SITE_COPY = `
## 1 Opening
headline: Our average student gains ${TR.averageGain} points. Yours doesn't have to be average.
text: We built the SAT prep we wish we'd had: overqualified tutors, a portal that knows exactly what your student gets wrong, and a guarantee with our money on the line.
button: Start free
button note: ${FREE.questionLimit} practice questions and a full-length practice test. No card. No catch.
second button: How the promise works

## 2 Live classes
headline: ${W(CLASS)} students, so nobody hides in the back row.
feature title: ${W(MP.classesPerWeek)} live classes a week, cameras on.
feature text: ${W(MP.totalClasses)} classes of ${MP.classMinutes} minutes, ${w(MP.classesPerWeek)} a week. Small enough that every student answers out loud.
card title: Plus a weekly live session.
card text: Pacing, Desmos and how the adaptive second module works, alternating with workshops on the skills students miss most.

## 3 One-on-one reviews
headline: Want one-on-one? An hour on what went wrong.
feature title: Every mistake, one by one.
feature text: In private tutoring, your student's tutor opens the test they just took and works through each question they missed until the method makes sense.

## 5 The free portal
headline: It's free to start. So start.
text: Sign up and your student is inside the portal right away, with ${FREE.questionLimit} practice questions and a full-length practice test with a score report. You watch the progress from your phone. No card. Nothing to cancel. The only thing you can lose is the excuse.
button: Start free
student tab: What your student sees
parent tab: What you see
switch label: Whose screen

## 6 How we teach
headline: Seven ways we make a skill stick, because one would be lazy.
ways: Skill practice = A practice set for every skill on the SAT. Three right in a row moves a skill up a level. | Written explanations = Every question shows the method, step by step. No "the answer is C, good luck." | The Daily 10 = Ten questions a day, pulled from whatever your student keeps missing. | The Challenge = Two hard questions a day, the same two for every student. Bragging rights included. | Time trials = One section against the clock. It starts at 1.25 times the real SAT time and tightens by 5% a round, down to 0.75, as long as accuracy holds. | Full-length practice tests = Timed like the real thing and scored like the real thing, minus the Saturday morning panic. | Live teaching = Classes of ${w(CLASS)} and private one-on-one, with a tutor who has seen every answer before saying hello.
research link: See the research we built it on
art words: Today | Day 2 | Day 7 | Day 21 | 3 in a row | Got it right | Got it wrong | Most common slip | Pace | Accuracy | Score | Reading and Writing | Math | Your turn

## 8 Guarantee
headline: The score goes up, or we pay you back.
text: You've seen guarantees with a trapdoor in the fine print. Ours doesn't have one. Your student does the work, the score goes up, or the money comes back to you. Here is the whole deal, on one line.
promise: ${UP_TO.cohort}
promise note: ${TARGETS} Measured from an SAT or PSAT score from the last ${G.baselineMonths} months, or, for a student with no score yet, from a placement test we proctor live.
line start: Starting score
line weeks: ${W(MP.weeks)} weeks of work
line end: The SAT
outcomes: The target or more = The promise was kept. Nothing back. | Half the target or more = Half the price back (${usd(MP.price / 2)}), or the next cohort free. You choose. | Under half the target = The full ${$(MP.price)} back, or the next cohort free. You choose.
we do title: Our side
we do: ${W(MP.classesPerWeek)} live classes a week, in a group of up to ${w(CLASS)} | ${W(MP.fullLengthTests)} full-length practice tests | A weekly live session | The Daily 10 and every question on the platform, with video explanations as they're recorded | A progress report for parents every day
you do title: Your student's side
you do: Attend at least ${G.minClassesAttended} of the ${MP.totalClasses} live classes, live | Take all ${w(MP.fullLengthTests)} full-length tests, each in one timed sitting | Do at least ${G.practicePct}% of the weekly practice, tracked on the dashboard | Sit the SAT your cohort ends on
covers: These are the cohort's terms | ${PRIVATE_PACKAGES[0].name} and ${PRIVATE_PACKAGES[1].name} carry the guarantee too, with their own terms: half back or ${w(PRIVATE_BONUS[P10.id].freeSessions)} free sessions on ${PRIVATE_PACKAGES[0].name}; half back or ${w(PRIVATE_BONUS[P20.id].freeSessions)} free sessions on ${PRIVATE_PACKAGES[1].name} | A student's first Karman program, once per student | Paid in full, or every installment paid on time
claim: Within ${G.claimDays} days of the test, email us the College Board score report. One email. Nothing is taken out of a refund.
link: The guarantee, with worked examples

## 9 Universities
headline: We're twelve for twelve.
text: The top 12 universities in the country have one thing in common: a Karman student on campus. Plenty of the schools right behind them do too.

## 10 Your number
headline: ${UP_TO.private}, or your money back.
text: Your student does the work, the score goes up, or the money comes back to you.
stamp unit: points
stamp ring: or your money back
outcomes: They hit the target. = Say the target is +${G.bands[0].private}. The score goes up ${G.bands[0].private} or more: promise kept. You owe us a high five. We'll settle for a nice review. | They got at least halfway. = The score goes up ${G.bands[0].private / 2} to ${G.bands[0].private - 10}. Half your money comes back. Our tutors still get to eat. | They got less than halfway. = The score goes up less than ${G.bands[0].private / 2}. All of your money comes back. Our tutors eat instant noodles and think about what they did.
link: The guarantee, in full

## 12 Tutors
headline: Our tutors are overqualified. That's the point.
credentials: PhD students = Research by day. Your student's algebra by night. | Medical students = They got through the MCAT. The SAT doesn't scare them. | Published writers = Edited by professionals. They fix a comma splice in their sleep. | Peer-reviewed researchers = Published in their own fields. | Professors = Teaching is already the day job.

## 13 Their doubts
headline: Go on. Ask us the hard ones.
label: Questions parents ask
box: Pick a question out of the sky
typing: Karman is typing
delivered: Delivered
read: Read
asks: What if the score doesn't go up? = Then your money comes back. All of it if we miss by a lot, half if we miss by a little. Or your student keeps going with us for free. | Who's teaching my kid? = People who are overqualified on purpose. PhD students, medical students, published writers, peer-reviewed researchers and professors. | How much time does it take? = About ten minutes a day. In the cohort, add ${w(MP.classesPerWeek)} live classes a week. Get one wrong and your tutor is updated before you finish reading this sentence. | Can we try it first? = Yes, and it costs nothing. Start free. ${FREE.questionLimit} practice questions and a full-length practice test, with no card. | How many points do you promise? = It depends on where your student starts. ${UP_TO.private} on ${P20.name}, and ${UP_TO.cohort.toLowerCase()} on the cohort and ${P10.name}. From a start of ${G.noGuaranteeFrom} the promise is that the score rises, or your student gets ${w(G.highStartProMonths)} months of ${PRO.name} free. | What does it cost? = Nothing to start. ${PP.name} is ${$(PP.monthly)} a month, ${PRO.name} is ${$(PRO.monthly)}, the ${w(MP.weeks)}-week cohort is ${$(MP.price)}, and private tutoring starts at ${$(P10.price)}. | Does the tutor know what my kid gets wrong? = Every answer. Each one your student gives reaches their tutor before the next session. | What does my student have to do? = Show up and do the work. At least ${G.minClassesAttended} of the ${MP.totalClasses} live classes, all ${w(MP.fullLengthTests)} full-length tests, ${G.practicePct}% of the weekly practice, and the SAT their cohort ends on. | When does the next cohort start? = The week of ${MP.startShort}. After that, cohorts start the weeks of ${MAY.startShort} and ${JUNE.startShort}.

## 14 Receipts
headline: We keep the receipts.
sample note: Sample rows for now. Real students, and the texts they really sent, go here once they say yes.

## 21 Program: opening
text: Classes grouped by score band (${MP.scoreBands.join(", ")}), ${w(MP.fullLengthTests)} full-length tests, and the guarantee printed in full. Classes start ${START_DAY}.
headline: A higher SAT score in ${w(MP.weeks)} weeks.
button: Reserve a seat
second button: How the promise works
closes: Registration closes ${CLOSES}.
starts: Classes start ${START_DAY}.
clock label: Registration closes in
clock: days | hours | min | sec

## 22 Program: the climb
headline: ${W(MP.fullLengthTests)} tests in ${w(MP.weeks)} weeks. Each one shows us what to fix next.
steps: The test = Every week your student sits a full practice test, timed like the real SAT. | The two classes = Their tutor has the results before class, and teaches the questions the group missed. | The homework = Each student drills their own misses. A skill still missed is assigned again the next week.
start: Latest SAT score
goal: The score we promise
test: Test
note: Drawn for a start of ${G.bands[0].upTo - 50}, where the promise is +${G.bands[0].cohort}. It shows the plan, not a student's result.

## 29 Program: the value
headline: What the seat is worth, at our own prices.
rows: ${MP.totalClasses} live classes, ${MP.classMinutes} minutes each = Your student gets ${MP.totalClasses} hours of live instruction from an expert in the field. = ${$(MP.totalClasses * (P10.price / P10.hours))} | ${PRO.name}, for the whole program and the weeks before it = Every question, the Daily 10 and the weekly workshops. = ${$(PRO.threeMonths)} | ${W(MP.fullLengthTests)} full-length practice tests = One a week, gone through in class. = Complimentary | Cohort chat and after-hours support = Questions answered between classes. = Complimentary | A report for you, every day = Work done, predicted score, a note from the tutor. = Complimentary
total: ${$(MP.totalClasses * (P10.price / P10.hours) + PRO.threeMonths)}
price label: The ${w(MP.weeks)}-week cohort
price: ${$(MP.price)}

## 23 Program: the portal
headline: And you see what the tutor sees.
titles: Homework | Skills | Score | Practice | Notes
captions: What was assigned, and what's been done. | Every skill, and the level your student has reached. | One predicted score, updated as they work. | How long they practised, day by day. | A few sentences from their tutor, every day.
homework: Daily 10 = 6 of 7 days | Flashcards = 40 of 40 cards | Strategy check = Passed | Time trial = Due Friday
skills: Linear equations = Mastered | Words in context = Strong | Comma rules = Getting there | Ratios and rates = Needs work | Inference = Strong
score start: Started at
score now: Predicted today
score goal: Promised
days: M | T | W | T | F | S | S
time: this week
note: Good focus in class today. Two misses on punctuation, both the same comma rule, so I've added a short set on it. Pacing is better: the math module was done with four minutes to spare.
note from: Zeeshawn, tutor
student: Amira
initials: A

## 24 Program: the promise
headline: A promise with two sides.
ours title: Our side
ours: A class of ${w(CLASS)} at your student's level | ${W(MP.classesPerWeek)} live classes every week | A full practice test every week | Homework built from their own mistakes | One tutor from start to finish | A report to you every day
ask: Their latest SAT score
bands: ${G.bands.map((b, i) => (i === 0 ? `Up to ${b.upTo}` : `${G.bands[i - 1].upTo + 10} to ${b.upTo}`)).join(" | ")} | ${G.noGuaranteeFrom} and up
promise: points in ${w(MP.weeks)} weeks, or your money back.
high title: It goes up
high: From ${G.noGuaranteeFrom}, we promise the score rises. If it doesn't, your student gets three months of ${PRO.name} free.
terms title: Your student's side of it
terms: Attend ${G.minClassesAttended} of the ${MP.totalClasses} live classes | Take all ${w(MP.fullLengthTests)} practice tests | Do ${G.practicePct}% of the weekly practice | Take the same SAT as their cohort
grace: One class can be made up at a workshop, and one test can be a week late.
link: The guarantee, in full

## 25 Program: how to join
headline: Every family starts with a call with ${FOUNDER.firstName}.
rows: Apply = Two minutes: your email, the latest score and the score they want | A ${CALL_MINUTES}-minute call = You, your student and ${FOUNDER.firstName}, Karman's founder, on one video call. We talk about the goal, the test date and how much time your student really has | Hear back = We tell you honestly whether the program fits and whether there's a seat. A ${$(MP.depositAmount)} refundable deposit holds it, and counts toward the ${$(MP.price)}
seats: ${SEATS_LEFT} of ${MP.paidSeats} seats open in the ${monthOf(MP.startDate)} cohort
button note: At most ${w(MP.paidSeats)} students per class, each class one score band.
form email: Your email
form latest: Latest SAT or PSAT score
form latest help: Leave it empty if they haven't taken one yet.
form target: The score they want
form date: When would they start?
form date options: ${STARTS.join(" | ")}
form button: Send the application
form done title: Application received.
form done text: We'll email you to set up the ${CALL_MINUTES}-minute call with ${FOUNDER.firstName}. Nothing is charged until you hold the seat.

## 26 Program: price
headline: ${$(MP.price)}, or ${SPLIT}.
text: The same price for every cohort, and the deposit is part of it. Nothing is added later: no materials fee, no platform fee.

## 27 Program: close
bonus: Reserve now and your student gets ${PRO.name} and a personal prep plan to use before class begins.
later: Can't start in ${monthOf(MP.startDate)}? The next cohorts start the weeks of ${MAY.startShort} and ${JUNE.startShort}.

## 31 Private: opening
headline: Up to ${guaranteeMax("private")} points higher, with a tutor who works around your week.
button: Schedule a free call
second button: See our packages

## 32 Private: booking
headline: Your student books their own sessions.
points: Around the week you actually have = Practice ran late, a test on Thursday, a free Sunday afternoon. They pick whichever open hour works for the family. | No fees to cancel or reschedule = You or your student can move a session, or book another, whenever you need to. No hidden fees.
pick day: Pick a day
pick time: Pick a time
earlier: Earlier days
later: Later days
confirm: Confirm session
booked: You're booked.
none: No open times this day

## 33 Private: packages
headline: Two ways to work one-on-one.
small package: ${P10.name} = ${$(P10.price)}
large package: ${P20.name} = ${$(P20.price)}
small lead: Everything in ${PRO.name}, plus
small bullets: ${W(P10.hours)} 60-minute sessions, once a week | A tutor from our team of PhD and medical students | Book and reschedule your own sessions | A full practice test every week | Personalized homework that adapts to their weak spots | Session recordings and recaps | Session statuses sent within 24 hours after each class | Direct iMessage or WhatsApp texting with your tutor | ${UP_TO.cohort}, or half back / ${PRIVATE_BONUS[P10.id].freeSessions} free sessions
large lead: Everything in ${P10.name}, plus
large bullets: ${P20.hours} sessions | No limit on sessions per week | Our best guarantee: ${UP_TO.private.charAt(0).toLowerCase()}${UP_TO.private.slice(1)} | ${PRIVATE_BONUS[P20.id].freeSessions} free sessions if we miss
save: Save
per: a session
call: Schedule a free call
link: The guarantee, in full

## 36 Private: close
headline: Schedule a free call.
form first: First name
form last: Last name
form phone: Phone
form email: Email
form button: Schedule my call
form done title: You're on the calendar.
form done text: ${FOUNDER.firstName} will text you to confirm.

## 41 Test: opening
headline: A full-length practice SAT. Free, whenever you're ready.
text: ${FT.questionCount} questions written by Karman, timed like the real test: two Reading and Writing modules, two Math modules. Then a score report, a breakdown by domain and an optional ${FT.callMinutes}-minute call with a Karman tutor. It comes with the free plan, so start free and it's waiting in the portal.
button: Start free
second button: Or email me the link
facts: Any time = No set date | ${FT.durationLabel} = ${FT.questionCount} questions | Online = No proctor, no drive | ${$(0)} = No card needed

## 42 Test: the form
headline: Rather have the link by email?
form email: Your email
form email help: Your results go here.
form name: Student's first name
form grade: Grade
form grade options: 9th | 10th | 11th | 12th
form date: Which SAT are they planning to take?
form date options: ${SAT_DATES.join(" | ")} | Not sure yet
form button: Send me the link
form privacy: We use your email for this test, its results and occasional emails from Karman. You can unsubscribe at any time.
form done title: You're in.
form done text: We'll email you the link to start the test from ${CONTACT.general}, with a way to book the results call when you're done.

## 43 Test: what you get
headline: You get more than a number.
rows: A score report = Where your student stands today | A breakdown by domain = Which of the eight SAT domains cost the most points | A ${FT.callMinutes}-minute call = Optional: a Karman tutor walks you through it and answers questions
sample: Sample report. A made-up student, the real layout.
score: Estimated score
sections: Reading and Writing | Math
domains: Information and Ideas | Craft and Structure | Expression of Ideas | Standard English Conventions | Algebra | Advanced Math | Problem-Solving and Data Analysis | Geometry and Trigonometry
weakest: Costing the most points
call: Book the ${FT.callMinutes}-minute call

## 44 Test: the sitting
headline: How it runs. The kitchen table works fine.
rows: Start = Whenever you have the time, from your Karman account | Reading and Writing = Two timed modules | Math = Two timed modules, with a calculator | Done = Your results come with a link to book the call
module: Module
total: ${FT.durationLabel}, ${FT.questionCount} questions.

## 45 Test: honest note
headline: An estimate, not a prophecy.
text: It's built from our own questions, not the College Board's, so the score is an estimate. We hand it over free so you can judge our questions before you pay us a cent.
button: Start free
button note: The test comes with the free plan, along with ${FREE.questionLimit} practice questions. No card.

## 51 Guarantee: opening
headline: ${UP_TO.private}, or your money back.
text: The target depends on where your student starts and how they're taught: ${UP_TO.private.toLowerCase()} on ${P20.name}, ${UP_TO.cohort.toLowerCase()} on the cohort and ${P10.name}. The cohort's whole deal is on this page, and nowhere else adds a rule. The private packages' rules are on the private tutoring page, in full.

## 52 Guarantee: examples
headline: Five students, worked through.
rows: Baseline 1180, SAT 1340 = +160, with a +${cohortTarget(1180)} target. The promise was kept. Nothing back | Baseline 1180, SAT 1280 = +100, more than half of +${cohortTarget(1180)}. Half back (${usd(MP.price / 2)}), or the next cohort free | Baseline 1180, SAT 1230 = +50, under half of +${cohortTarget(1180)}. The full ${$(MP.price)} back, or the next cohort free | Baseline 1420, SAT 1480 = +60. From a start of ${BAND_LABELS[3]} the target is +${cohortTarget(1420)}. The promise was kept | Baseline 1450, SAT 1480 = +30, more than half of +${cohortTarget(1450)}. Half back (${usd(MP.price / 2)}), or the next cohort free

## 53 Guarantee: what we won't add
headline: What you won't find in our terms.
list: A "good faith" clause we get to judge | A quota on answering polls in class | A rule that every session be on the same device | Fees taken out of a refund | A line saying a claim may not be approved

## 54 Guarantee: private and exclusions
headline: Private tutoring and what isn't covered.
rows: ${P10.name} = ${UP_TO.cohort}, set by the starting score. One session a week. If we miss: half the price back (${usd(P10.price / 2)}) or ${w(PRIVATE_BONUS[P10.id].freeSessions)} free sessions. You choose | ${P20.name} = ${UP_TO.private}, set by the starting score. As many sessions a week as you want. If we miss: half the price back (${usd(P20.price / 2)}) or ${w(PRIVATE_BONUS[P20.id].freeSessions)} free sessions. You choose | Your side on private tutoring = Attend every session. Take the full practice test each week. Do ${G.practicePct}% of the weekly practice. Sit the SAT within ${G.private.satWithinDays} days of the last session. Moving a session with ${G.private.cancelHours} hours' notice never counts against the promise | ${PP.name} and ${PRO.name} = No guarantee. No tutor teaches your student every week | Free practice test = No guarantee. It's free

## 55 Guarantee: claim
headline: Claiming takes one email.
text: Within ${G.claimDays} days of the test, send the College Board score report to ${G.claimEmail}. No mailed paper reports, no fees.
button: Take the free practice test


## 56 Guarantee: targets
headline: The target, by starting score.
rows: ${BAND_LABELS[0]} = +${G.bands[0].cohort} on the cohort and ${P10.name}. +${G.bands[0].private} on ${P20.name} | ${BAND_LABELS[1]} = +${G.bands[1].cohort} on the cohort and ${P10.name}. +${G.bands[1].private} on ${P20.name} | ${BAND_LABELS[2]} = +${G.bands[2].cohort} on the cohort and ${P10.name}. +${G.bands[2].private} on ${P20.name} | ${BAND_LABELS[3]} = +${G.bands[3].cohort} on the cohort and ${P10.name}. +${G.bands[3].private} on ${P20.name} | ${G.noGuaranteeFrom} or higher = No guarantee. We tell you before you pay

## 58 Pricing
headline: Pick how your student preps.
self: Self-study
tutor: With a tutor
tag class: Live class
tag one: One-on-one
month: a month
term three: 3 months
term one: Monthly
billed three: billed {total} every 3 months
billed one: billed every month
practice bullets: ${QB.practiceCount.toLocaleString("en-US")}+ questions covering every SAT skill | ${W(QB.practiceTests)} full-length practice tests | A written explanation for every question | The Daily 10: ten questions a day from the skills they miss | One predicted SAT score, updated as they practice | The built-in graphing calculator | Progress for parents on their phone
practice button: Start ${PP.name}
pro bullets: Everything in ${PP.name} | ${QB.proExtraCount.toLocaleString("en-US")}+ more questions, the two hardest levels | ${W(QB.proTests)} full-length practice tests | Workshops and live office hours every week
pro button: Start ${PRO.name}
cohort line: ${UP_TO.cohort}, or your money back.
cohort bullets: Everything in ${PRO.name} | A group of ${w(CLASS)} at your student's level | ${MP.totalClasses} hours of live class | A full practice test every week
cohort unit: ${w(MP.weeks)} weeks
cohort note: or ${SPLIT}
cohort button: Reserve a seat
sat: Their SAT
starts: Classes start
closes: Enrollment closes
small line: ${UP_TO.cohort}, or half back / ${PRIVATE_BONUS[P10.id].freeSessions} free sessions.
small bullets: Everything in ${PRO.name} | ${P10.hours} hours one-on-one, once a week | Book and reschedule your own sessions | A full practice test every week
large line: Our best guarantee: ${UP_TO.private.charAt(0).toLowerCase()}${UP_TO.private.slice(1)}.
large bullets: Everything in ${P10.name} | ${P20.hours} hours one-on-one, no limit on sessions per week | A personalized study plan | Priority booking | ${PRIVATE_BONUS[P20.id].freeSessions} free sessions if we miss
save: Save
a session: a session
private button: Schedule a free call
link: The guarantee, in full
award badge: scholarship
award badge sub: One student per cohort wins it
award name: The Summit Scholarship
award sub: {amount} awarded to the top student of every cohort.
award refund: Your full program, refunded
award bonus: Extra, for your student's hard work
award how: Send us the score report within one month of scores coming out. | Both amounts are paid straight to the parent's bank account one month after scores come out. | Open to the ${MP.shortName}.
award close: Close

## 61 About: opening
headline: We show our work. All of it.
text: Karman prints every rule of its guarantee where you can read it, and shows parents and tutors every answer a student gives. No black box. No "just trust us."
button: Start free
second button: See how we teach
stat: +${TR.averageGain}
stat label: points, on average, for our 1:1 students
stat source: ${TR.sourceLabel}

## 62 About: three things
headline: Three things we refuse to do.
rows: Keep tutors guessing = Every answer your student gives reaches their tutor before the next session. | Hide the rules = The guarantee's terms are one click from the home page, in full, with worked examples. | Go quiet after you pay = Parents get the same numbers the guarantee is measured on, every day.

## 63 About: how we teach
headline: A test, then an hour on every mistake.
text: We started as one-on-one tutoring. The method hasn't changed: a timed full-length test, then a review of every question missed. The programs add what research keeps backing: spaced review of mistakes, mixed practice and small groups.
proof: ${PROOF}
loop: The test = Timed like the real SAT. | The review = Every missed question, one by one, until the method makes sense. | The practice = Their own misses, mixed with other skills, like the SAT does. | The comeback = A missed question comes back days later, then again after a longer gap.
link: See the research we built it on

## 64 About: our own rules
headline: Rules we hold our own marketing to.
list: No testimonials until real ones exist | Every result says where it came from | Score estimates are always ranges | No fake deadlines and no made-up scarcity | Every cohort's results published, dropouts included, once 15 to 20 SAT scores exist
note: Catch us breaking one and you can quote this page back at us.

## 65 About: close
headline: Start free. Judge us after.
text: Your student gets ${FREE.questionLimit} practice questions and a full-length practice test. You see exactly how we teach before you spend a dollar. No card. No catch.
button: Start free
second button: Or take the free practice test

## 71 FAQ
headline: Ask us anything. We text back.
text: Tap a question in the sky. We answer it the way we'd answer you on the phone: straight, short, and with the real numbers.
label: Questions parents ask
box: Pick a question out of the sky
typing: Karman is typing
delivered: Delivered
read: Read
all headline: Every answer, in one place.
all text: For the parents who'd rather read it all than chase clouds. Same answers, nothing hidden.
groups: The money | The promise | The classes | Getting started
money: What does the ${monthOf(MP.startDate)} cohort cost, all in? = ${$(MP.price)}, or ${SPLIT}. There is no materials fee and no platform fee. | Is the ${$(MP.depositAmount)} deposit refundable? = Yes. It holds the seat after your call with ${FOUNDER.firstName}, and it counts toward the ${$(MP.price)}. | What's the difference between ${PP.name} and ${PRO.name}? = ${PP.name} (${$(PP.monthly)} a month) is the core question pool with written explanations. ${PRO.name} (${$(PRO.monthly)} a month) adds the hard mastery questions, and video explanations, added as they're recorded. | Can we pay for three months at once? = Yes. ${PP.name} is ${$(PP.threeMonths)} for three months and ${PRO.name} is ${$(PRO.threeMonths)}. ${PLAN_RENEWAL} | Is there a scholarship? = Yes. The student with the top SAT score in every cohort gets a ${$(SCH.amount)} scholarship: the ${$(SCH.refund)} back, plus ${$(SCH.meritBonus)}.
promise: How many points do you promise? = It depends on where your student starts. ${UP_TO.private} on ${P20.name}, and ${UP_TO.cohort.toLowerCase()} on the cohort and ${P10.name}. | What if the score doesn't go up enough? = Then money comes back. On the cohort: half the target or more, and half the price comes back or the next cohort is free. Under half, the full price comes back or the next cohort is free. You choose. | What does my student have to do? = Show up and do the work. At least ${G.minClassesAttended} of the ${MP.totalClasses} live classes, all ${w(MP.fullLengthTests)} full-length tests, ${G.practicePct}% of the weekly practice, and the SAT their cohort ends on. | Which SAT counts for the guarantee? = On the cohort, the SAT the cohort ends on. On private tutoring, within ${G.private.satWithinDays} days of the last session. | My student already scores high. Is that covered? = Up to ${TOP.upTo}, yes. From a start of ${BAND_LABELS[3]} the target is +${TOP.cohort} points on the cohort and ${P10.name}, and +${TOP.private} on ${P20.name}. From ${G.noGuaranteeFrom} the promise is that the score rises, or your student gets ${w(G.highStartProMonths)} months of ${PRO.name} free. | How do I claim the guarantee? = Email the College Board score report to ${G.claimEmail} within ${G.claimDays} days of the test.
classes: Who teaches the classes? = A Karman tutor teaches the live classes. The cohort has no one-on-one sessions; private tutoring does. | How big are the classes? = ${W(MP.paidSeats)} students at most. Each cohort is one score band (${MP.scoreBands.join(", ")}), so the whole class works at the same level. | What if my student misses a class? = The guarantee counts live attendance: at least ${G.minClassesAttended} of the ${MP.totalClasses} classes. A recording doesn't count toward it. One class can be made up at a workshop, and one test can be a week late. | When does the next cohort start? = The week of ${MP.startShort}. Registration closes ${CLOSES}. After that, cohorts start the weeks of ${MAY.startShort} and ${JUNE.startShort}. | What do I see as a parent? = A report every day on the cohort: the work done, the predicted score and a note from the tutor.
start: Can we try it first? = Yes, and it costs nothing. Start free. ${FREE.questionLimit} practice questions and a full-length practice test, with no card. | Why is there a call before I can pay? = Every class has ${w(MP.paidSeats)} seats, so ${FOUNDER.firstName} meets each student and parent first. We want to know the goal and whether the program is the right fit before anyone pays. | Do you use real College Board questions? = The baseline is a Bluebook practice test from the College Board. Everything else, including the free practice test and the Daily 10, is written by Karman. | My student is already at ${INTAKE.scoreFrom}. Should we buy a program? = Honestly, maybe not. If your student is already scoring ${INTAKE.scoreFrom} or higher, or the SAT is less than ${w(INTAKE.minWeeks)} weeks away, we'll tell you a program probably isn't the best use of your money.
close headline: Still deciding? Start free. It's the fastest answer.
close text: ${FREE.questionLimit} practice questions and a full-length practice test. No card. Nothing to cancel.
button: Start free

## 81 Research: opening
headline: Seven ways we teach. The science behind every one.
text: Every habit we ask of your student comes from studies you can read yourself. Here is each way we make a skill stick, what the research found, and the link to check our homework.
button: Start free
second button: See the seven ways
shelf: The reading list
shelf note: Six studies. Seven ways. Every one a click away.

## 82 Research: the studies
headline: Show your work? Gladly.
text: Each way we teach, the study behind it and what that study found. Read the originals. They're better than a sales page.
why: Answering beats rereading. So every skill gets a practice set, not a summary to skim. | A miss is only useful if your student knows why. Every explanation says what went wrong and what to do next. | A missed question comes back days later, then again after a longer gap, mixed in with other skills. | Two hard questions a day means your student recalls, every day, instead of cramming once. | A timed section is a practice test, and practice testing is one of the two techniques the research rates highest. | Practice tests carry the program. Highlighting and rereading don't appear anywhere. | Attention and fast correction: classes of ${w(CLASS)} where every student answers out loud, and private one-on-one.
studies label: The research
retrieval name: Recall beats rereading
retrieval found: Students who practiced recalling a passage remembered more of it a week later than students who spent the same time rereading it.
retrieval source: Roediger and Karpicke, Psychological Science, 2006
spacing name: Spread it out
spacing found: Reviews spread over days and weeks held up far better than the same reviews crammed together, and the best gap grew with how long the memory had to last.
spacing source: Cepeda and colleagues, Psychological Science, 2008
review name: Two techniques stand out
review found: A review of ten common study techniques rated only two as highly useful: practice testing and practice spread out over time. Highlighting and rereading rated low.
review source: Dunlosky and colleagues, Psychological Science in the Public Interest, 2013
mixed name: Mix the problem types
mixed found: Students who practiced shuffled math problems did much better on a later test than students who practiced one type at a time, because they had to choose the method.
mixed source: Rohrer and Taylor, Instructional Science, 2007
feedback name: Feedback on the task
feedback found: Feedback that says what went wrong and what to do next is among the strongest influences on learning. Praise on its own does very little.
feedback source: Hattie and Timperley, Review of Educational Research, 2007
tutoring name: Attention changes results
tutoring found: Students taught one-on-one, with checks and corrections along the way, did far better than students taught in a regular class.
tutoring source: Bloom, Educational Researcher, 1984
read link: Read the study

## 83 Research: close
headline: See it working before you pay.
text: The free plan runs on the same questions and the same feedback: ${FREE.questionLimit} practice questions and a full-length practice test. No card.
button: Start free
second button: Take the free practice test

## 101 Schools: opening
headline: Real SAT prep for every student. The first year is on us.
text: Every student gets a ${PP.name} plan of their own: the core question pool across all ${QB.skills} SAT skills, written explanations, the Daily 10 and full-length practice tests. Not a shared pool. Not a shared login. After the first year, ${$(SCHOOL.pricePerStudentPerYear)} per student a year.
button: Book a call about your school
button note: Free for the first year. No card.
second button: See the school view

## 102 Schools: what each student gets
headline: Every student gets the real thing, not a demo.
rows: Their own plan = Their own account, practice history and Daily 10. No shared logins and no shared question pool | The core question pool = Practice across all ${QB.skills} SAT skills, with a written explanation for every question | The Daily 10 = Ten questions a day, picked from the skills each student misses | Full-length practice tests = Timed, on the platform, with a breakdown by domain

## 103 Schools: how it starts
headline: You book one call. We do the rest.
rows: Book a call = Two short steps, under a minute: your school, then how to reach you | We set it up = Your students get a link to join with their own accounts | The first year = Free | After that = ${$(SCHOOL.pricePerStudentPerYear)} per student a year, invoiced once a year

## 104 Schools: close
headline: Start with a free year. Yes, free.
text: Tell us about your school and how to reach you. We'll call, set it up and send your students their link.
button: Book a call about your school

## 111 Tutors: opening
headline: One code puts up to ${TA.maxStudents} of your students on Karman.
text: For tutors who sell on marketplaces like Leland, or on their own. ${$(TA.monthly)} a month. Your students redeem your code and get the ${PP.name} plan free while you subscribe. You keep teaching, we keep them practicing, and you see every answer.
button: Start as a tutor affiliate
button note: ${$(TA.monthly)} a month. ${PLAN_RENEWAL}
second button: See your dashboard

## 112 Tutors: what your students get
headline: Your students get the ${PP.name} plan. You pick up the tab.
rows: The ${PP.name} plan = The core question pool across all ${QB.skills} SAT skills, with written explanations | The Daily 10 = Ten questions a day, picked from the skills they miss | Full-length practice tests = Timed, on the platform | Free = For as long as your subscription is active

## 113 Tutors: what you get
headline: You get admin rights. Use them.
rows: See their progress = Every answer, every skill and every test score | Assign work = Practice for one student or the whole roster | Manage your roster = Up to ${TA.maxStudents} students on your code | Remove a student = The seat opens for someone else

## 114 Tutors: close
headline: Your students practice. You see every answer.
text: ${$(TA.monthly)} a month for up to ${TA.maxStudents} students. When you stop, your students keep their accounts and move to the Free plan.
button: Start as a tutor affiliate

## 140 Schools: the sum
ask: How many students?
unit: students
first: The first year
after: Every year after
after note: ${$(SCHOOL.pricePerStudentPerYear)} per student, invoiced once a year.
family: A family pays ${$(PP.monthly)} a month for the same plan. Your students get it for ${$(SCHOOL.pricePerStudentPerYear)} a year.

## 141 Schools: the school view
headline: And you see every class at once.
titles: Classes | Join code | Roster | Homework | Your plan
captions: Every class, its code, and how many students have joined. | One code per class. Students type it, or tap the link. | Each student's progress, domain by domain. | What you assigned, and how many have done it. | What it costs, and when.
classes: Period 2 SAT Prep = 4KQ7RM = 28 | Period 4 SAT Prep = 9TXH3P = 31 | Junior seminar = M6CZ2W = 24 | After-school club = R8DJ5N = 12
students: students
code label: Code
code help: Share the link, or students type the code when they join.
copy code: Copy code
copy link: Copy link
roster title: Period 2 SAT Prep
roster: Maya = 72 | Diego = 64 | Priya = 58 | Sam = 81 | Noor = 47
homework: Linear equations = Due Friday = 22 | Words in context = Due Monday = 9 | Full practice test = Due next week = 3
done: done
plan title: Free for the first year
plan text: Then ${$(SCHOOL.pricePerStudentPerYear)} per student a year. Each student has a ${PP.name} plan of their own.
seats: Students with a seat
school: Your school
initials: YS
sample: A sample school. Every name and number here is made up.

## 142 Tutors: the sum
ask: Students on your code
unit: students
per: Your cost per student, a month
alone: If each paid for the ${PP.name} plan on their own
alone unit: a month, all together
note: One price, ${$(TA.monthly)} a month, for up to ${TA.maxStudents} students at a time.

## 143 Tutors: the dashboard
headline: Your whole roster, on one screen.
titles: Your code | Students | Assign | Skills
captions: Share one code. Everyone who joins lands on your roster. | Everyone on your code, with progress at a glance. | Practice for one student or the whole roster. | Every skill, for every student, as they work.
code: TUTR-8KQ2
code help: Students type it when they sign up, or tap your link.
seats: seats used
left: left
roster: Maya = 72 = Today | Diego = 64 = Today | Priya = 58 = Yesterday | Sam = 81 = Monday
assign title: Sent to
assign: Comma rules = Everyone | Linear equations = Diego | Inference = Priya | Full practice test = Everyone
skills student: Diego
skills: Linear equations = Mastered | Words in context = Strong | Comma rules = Getting there | Ratios and rates = Needs work | Inference = Strong
tutor: You
initials: Y
sample: A sample roster. Every name and number here is made up.

## 144 Tutors: teach for us
text: Rather teach for Karman? Our own tutors start in January, and ${FOUNDER.firstName} trains every one of them himself.
link: Write to us

## 90 Photos
program alt: A student at her desk in the evening, in a live online class on her laptop, earbuds in, smiling at something the tutor said.
private alt: A tutor at home, mid-explanation to a student on a video call, one hand raised to make the point.
test alt: A student at a kitchen table, chin on his hand, working through a timed practice test on a laptop.
guarantee alt: A parent on the sofa in the evening, reading on a phone, a cup of tea beside them.
about alt: Three teammates on a gym bench during a break at practice, one showing another something on her phone.
lin alt: A tutor at her desk at home, mid-explanation on a video call, one hand open as she makes a point.
daily alt: A runner on the bleachers after practice, answering questions on his phone, a towel beside him.
start alt: A student just home from school, backpack still on one shoulder, opening her laptop at the kitchen counter.
call alt: A mother and her daughter side by side at the dining table, listening closely on a video call.
bus alt: A student in a window seat on the bus, earbuds in, working through questions on his phone.

## Site
logo: Karman
free test link: Free practice test
start free: Get started
program link: The SAT Program
private link: Private tutoring
schools link: Schools
tutors link: For tutors
pricing link: Pricing
guarantee link: The guarantee
faq link: FAQ
about link: About
research link: The research
sign in link: Sign in
terms link: Terms of Service
privacy link: Privacy Policy
cookies link: Cookie Policy
refunds link: Refund Policy
email: ${CONTACT.general}
footer programs: Programs
footer tools: Free tools
footer company: Company
footer legal: Legal
footer follow: Follow
facebook link: Facebook
instagram link: Instagram
tiktok link: TikTok
youtube link: YouTube
sat note: SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, Karman Prep.
menu: Menu
pause: Hold the painting still
play: Let the painting move
dark mode: Dark mode
light mode: Light mode
not found title: This page isn't here.
not found text: The address may be mistyped, or the page has moved. These are the pages people look for most.
not found home: Go to the home page
error title: Something went wrong on our side.
error text: The page didn't load. Try again, or come back in a minute.
error retry: Try again
form sending: Sending
form error score: SAT and PSAT scores run from 320 to 1600, in steps of 10.
form error target: Add the score they're aiming for, between 400 and 1600.
form error email: That email looks incomplete. It needs an @ and a domain, like name@gmail.com.
form error name: Add your student's first name, so we know whose test it is.
form error your name: Add your name, so we know who to ask for.
form error phone: Add a phone number we can reach you on, with the area code.
form error slot: Pick a day and a time for the call.
form error network: That didn't go through because the connection dropped. Your answers are still here.
form error server: That didn't go through on our side. Your answers are still here. Try again in a minute, or write to ${CONTACT.general}.
form retry: Try again
pricing practice button: Start ${PP.name}
pricing pro button: Start ${PRO.name}
`;

/* ---------- reading the copy ---------- */

export type CopySection = Record<string, string>;

function parse(text: string) {
  const sections: Record<number, CopySection> = {};
  const site: CopySection = {};
  let cur: CopySection | null = null;
  for (const raw of text.split("\n")) {
    const h2 = raw.match(/^##\s+(\d+|Site)\b/);
    if (h2) {
      cur = h2[1] === "Site" ? null : (sections[Number(h2[1])] = {});
      continue;
    }
    const kv = raw.match(/^\s*([a-z ]+):\s*(.*)$/i);
    if (!kv) continue;
    (cur ?? site)[kv[1].trim().toLowerCase()] = kv[2].trim();
  }
  return { sections, site };
}

const PARSED = parse(SITE_COPY);

/** One numbered section's labels. Missing labels read as "". */
export function section(n: number): CopySection {
  return PARSED.sections[n] ?? {};
}

/** The header, menu, footer, pricing and form words. */
export const SITE: CopySection = PARSED.site;

export { list, pairs } from "./site-copy-format";
