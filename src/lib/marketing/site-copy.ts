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
// guarantee, 61 to 65 About, 71 the FAQ, 90 the photos' alt text and
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
  NEXT_PROGRAMS_ENROLLMENT_LABEL,
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
const TARGETS = `The target depends on the starting score: ${targetsFor("cohort")}. From ${G.noGuaranteeFrom} there is no guarantee, and we tell you before you pay. A ${G.topScore} always counts.`;
/** The cohort's target for a starting score, for the worked examples. */
const cohortTarget = (start: number) => guaranteedGain(start, "cohort");
const TOP = G.bands[G.bands.length - 1];
const PROOF = `Karman's 1:1 students gained ${TR.averageGain} points on average. ${TR.sourceLabel}.`;
const SPLIT = `a ${$(MP.depositAmount)} deposit and ${w(MP.installments.count)} payments of ${$(MP.installments.amount)}`;
const PRIVATE_BONUS = G.private.packages;
const ENROLL_LATER = NEXT_PROGRAMS_ENROLLMENT_LABEL.replace(
  /^Enrollment opens/,
  "Enrollment for both opens"
);

export const SITE_COPY = `
## 1 Opening
headline: Our average student gains ${TR.averageGain} points. Yours doesn't have to be average.
text: We built the SAT prep we wish we'd had: overqualified tutors, a portal that knows exactly what your student gets wrong, and a guarantee with our money on the line.
button: Start free
button note: ${FREE.questionLimit} practice questions and a full-length practice test. No card. No catch.
second button: See pricing

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
headline: Six ways we make a skill stick, because one would be lazy.
ways: Skill practice = A practice set for every skill on the SAT. Three right in a row moves a skill up a level. | Written explanations = Every question shows the method, step by step. No "the answer is C, good luck." | The Daily 10 = Ten questions a day, pulled from whatever your student keeps missing. | The Challenge = Two hard questions a day, the same two for every student. Bragging rights included. | Full-length practice tests = Timed like the real thing and scored like the real thing, minus the Saturday morning panic. | Live teaching = Classes of ${w(CLASS)} and private one-on-one, with a tutor who has seen every answer before saying hello.
research link: See the research we built it on
found label: The finding
study label: The study
built label: What we built from it

## 8 Guarantee
headline: The score goes up, or we pay you back.
text: You've seen guarantees with a trapdoor in the fine print. Ours doesn't have one. Your student does the work, the score goes up, or the money comes back to you. Here is the whole deal, on one line.
promise: ${UP_TO.cohort}
promise note: ${TARGETS} Measured from an SAT or PSAT score from the last ${G.baselineMonths} months, or from a week-1 Bluebook practice test we proctor live.
line start: Starting score
line weeks: ${W(MP.weeks)} weeks of work
line end: The SAT
outcomes: The target or more = The promise was kept. Nothing back. | Half the target or more = Half the price back (${usd(MP.price / 2)}), or the next cohort free. You choose. | Under half the target = The full ${$(MP.price)} back, or the next cohort free. You choose.
we do title: Our side
we do: ${W(MP.classesPerWeek)} live classes a week, in a group of up to ${w(CLASS)} | ${W(MP.fullLengthTests)} full-length practice tests | A weekly live session | The Daily 10 and every question on the platform, with video explanations as they're recorded | Live progress for parents, and a weekly summary
you do title: Your student's side
you do: Attend at least ${G.minClassesAttended} of the ${MP.totalClasses} live classes, live | Take all ${w(MP.fullLengthTests)} full-length tests, each in one timed sitting | Do at least ${G.practicePct}% of the weekly practice, tracked on the dashboard | Sit the SAT within ${G.satWithinDays} days of the last class
covers: These are the cohort's terms | ${PRIVATE_PACKAGES[0].name} and ${PRIVATE_PACKAGES[1].name} carry the guarantee too, with their own terms: half back on ${PRIVATE_PACKAGES[0].name}; free hours, then half back on ${PRIVATE_PACKAGES[1].name} | A student's first Karman program, once per student | Paid in full, or every installment paid on time
claim: Within ${G.claimDays} days of scores coming out, email us the College Board score report. One email. Nothing is taken out of a refund.
link: The guarantee, with worked examples

## 9 Universities
headline: We're twelve for twelve.
text: The top 12 universities in the country have one thing in common: a Karman student on campus. Plenty of the schools right behind them do too.

## 10 Your number
headline: ${UP_TO.private}, or your money back.
text: Your student does the work, the score goes up, or the money comes back to you.
stamp unit: points
stamp ring: or your money back
outcomes: They hit it. = Promise kept. You owe us a high five. | They came close. = Half your money comes back. | Not even close. = All of your money comes back.
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
asks: What if the score doesn't go up? = Then your money comes back. All of it if we miss by a lot, half if we miss by a little. Or your student keeps going with us for free. | Who's teaching my kid? = People who are overqualified on purpose. PhD students, medical students, published writers, peer-reviewed researchers and professors. | How much time does it take? = About ten minutes a day. In the cohort, add ${w(MP.classesPerWeek)} live classes a week. Get one wrong and your tutor is updated before you finish reading this sentence. | Can we try it first? = Yes, and it costs nothing. Start free. ${FREE.questionLimit} practice questions and a full-length practice test, with no card. | How many points do you promise? = It depends on where your student starts. ${UP_TO.private} on ${P20.name}, and ${UP_TO.cohort.toLowerCase()} on the cohort and ${P10.name}. From a start of ${G.noGuaranteeFrom} there is no guarantee, and we tell you before you pay. | What does it cost? = Nothing to start. ${PP.name} is ${$(PP.monthly)} a month, ${PRO.name} is ${$(PRO.monthly)}, the ${w(MP.weeks)}-week cohort is ${$(MP.price)}, and private tutoring starts at ${$(P10.price)}. | Does the tutor know what my kid gets wrong? = Every answer. Each one your student gives reaches their tutor before the next session. | What does my student have to do? = Show up and do the work. At least ${G.minClassesAttended} of the ${MP.totalClasses} live classes, all ${w(MP.fullLengthTests)} full-length tests, ${G.practicePct}% of the weekly practice, and an SAT within ${G.satWithinDays} days of the last class. | When does the next cohort start? = The week of ${MP.startShort}. After that, cohorts start the weeks of ${MAY.startShort} and ${JUNE.startShort}.

## 14 Receipts
headline: We keep the receipts.

## 21 Program: opening
headline: ${W(CLASS)} students, ${w(MP.classesPerWeek)} live classes a week, ${w(MP.weeks)} weeks.
text: Classes grouped by score band (${MP.scoreBands.join(", ")}), ${w(MP.fullLengthTests)} full-length tests, and the guarantee printed in full. Classes start ${START_DAY}.
button: Apply for a seat
button note: Enrollment closes ${CLOSES}.
facts: ${$(MP.price)} = The whole program, all in | ${CLASS} = Students per class, at most | ${MP.totalClasses} = Live classes of ${MP.classMinutes} minutes | ${MP.fullLengthTests} = Full-length practice tests

## 22 Program: a week
headline: What a week looks like.
rows: Twice a week = A live class, ${MP.classMinutes} minutes | Once a week = The live session: test mechanics, or a workshop on the skills students miss most | Every day = The Daily 10, about ten minutes | Every week = Your update: skills, attendance, practice done, test scores

## 23 Program: the nine weeks
headline: ${W(MP.fullLengthTests)} tests in ${w(MP.weeks)} weeks.
rows: Week 1 = A baseline: a Bluebook practice test, proctored live | Weeks 3 to 7 = Three more full-length tests, each in one timed sitting | Week ${MP.weeks} = The last full-length, proctored live, and a plan for test day

## 24 Program: who it's for
headline: Built for an 11th grader with room to grow.
text: It fits a student with a score they want to raise and a few months before their SAT. If your student is already at ${INTAKE.scoreFrom}, or their SAT is less than ${w(INTAKE.minWeeks)} weeks away, we'll say so before you pay: a program probably isn't the best use of your money.
card title: A ${$(SCH.amount)} scholarship in every cohort.
card text: The student with the top SAT score in each cohort gets ${$(SCH.amount)}: the ${$(SCH.refund)} back, plus ${$(SCH.meritBonus)}.

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

## 27 Program: later dates
headline: Can't start in ${monthOf(MP.startDate)}? ${MAY.startShort} or ${JUNE.startShort}.
text: The next cohorts start ${MAY.startLabel} and ${JUNE.startLabel}. ${ENROLL_LATER}

## 31 Private: opening
headline: One student, one tutor, every mistake worked through.
text: Weekly 60-minute sessions. Each one starts from your student's latest full-length test and goes through every mistake. ${P10.hours} hours for ${$(P10.price)}, or ${P20.hours} hours for ${$(P20.price)}, both with the guarantee.
button: Book a call with ${FOUNDER.firstName}
button note: ${CALL_MINUTES} minutes with you, your student and ${FOUNDER.firstName}. Every private student starts here.

## 32 Private: a session
headline: Every session starts with a test, not a worksheet.
rows: Before = Your student takes a full-length test, or we pick the skill holding them back | During = 60 minutes on every question they missed: what happened and how to fix it | After = A note to you: what you worked on, what improved and what comes next

## 33 Private: packages
headline: Two packages, both with the guarantee.
small package: ${P10.name} = ${P10.hours} hours, ${$(P10.price)}. For a focused push on one section. Comes with the guarantee: ${UP_TO.cohort.toLowerCase()}, set by the starting score. If not, half the price back (${usd(P10.price / 2)}).
large package: ${P20.name} = ${P20.hours} hours, ${$(P20.price)}. Comes with the guarantee: ${UP_TO.private.toLowerCase()}, set by the starting score. If not, up to ${PRIVATE_BONUS[P20.id].bonusHours} more hours free, then half the price back.
includes: Everything in ${PRO.name}: every question, with video explanations as they're recorded | The weekly live session | A note to parents after every session

## 34 Private: track record
headline: This is how we have always tutored.
text: Karman's 1:1 students gained ${TR.averageGain} points on average, and ${TR.reachedTargetPct}% reached their target score.
proof: ${TR.sourceLabel}. ${FOUNDER.studentsTutored} students.

## 35 Private: guarantee terms
headline: What the guarantee asks of your student.
rows: Every session = Cancelling with less than ${G.private.cancelHours} hours' notice counts as a missed session | Full-length tests = ${W(PRIVATE_BONUS[P10.id].fullLengthTests)} on ${P10.name}, ${w(PRIVATE_BONUS[P20.id].fullLengthTests)} on ${P20.name} | The SAT = Within ${G.private.satWithinDays} days of the last session

## 36 Private: close
headline: Every private student starts with a call.
text: You, your student and ${FOUNDER.firstName}, Karman's founder, on one video call. We talk about the target, the test date and how much time your student has each week. Then we tell you honestly whether private tutoring fits, how many hours make sense, and when a tutor is free.
form email: Your email
form latest: Latest SAT or PSAT score
form latest help: Leave it empty if they haven't taken one yet.
form date: When is their SAT?
form date options: ${SAT_DATES.join(" | ")} | Another date | Not sure yet
form button: Request the call
form done title: Request received.
form done text: We'll email you times for the ${CALL_MINUTES}-minute call with ${FOUNDER.firstName}.

## 41 Test: opening
headline: A full-length practice SAT, free, whenever you're ready.
text: ${FT.questionCount} questions written by Karman, timed like the real test: two Reading and Writing modules, two Math modules. Then a score report, a breakdown by domain and an optional ${FT.callMinutes}-minute call.
facts: Any time = No set date | ${FT.durationLabel} = ${FT.questionCount} questions | On Karman = Bluebook-style | $0 = No card needed

## 42 Test: the form
headline: Get the test link.
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
headline: What you get back.
rows: A score report = Where your student stands today | A breakdown by domain = Which of the eight SAT domains cost the most points | A ${FT.callMinutes}-minute call = Optional: a Karman tutor walks you through it and answers questions

## 44 Test: the sitting
headline: How it runs.
rows: Start = Whenever you have the time, from your Karman account | Reading and Writing = Two timed modules | Math = Two timed modules, with a calculator | Done = Your results come with a link to book the call

## 45 Test: honest note
headline: An estimate, not a prediction.
text: It's built from our own questions, not the College Board's, so the score is an estimate. We show it so you can judge the quality of our questions before you pay for anything.
button: Send me the link

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
rows: ${P10.name} = ${UP_TO.cohort}, set by the starting score. If not: half the price back (${usd(P10.price / 2)}) | ${P20.name} = ${UP_TO.private}, set by the starting score. If not: up to ${PRIVATE_BONUS[P20.id].bonusHours} more hours free, then half the price back if the next SAT still falls short | ${PP.name} and ${PRO.name} = No guarantee. No tutor teaches your student every week | Free practice test = No guarantee. It's free

## 55 Guarantee: claim
headline: Claiming takes one email.
text: Within ${G.claimDays} days of scores coming out, send the College Board score report to ${G.claimEmail}. No mailed paper reports, no fees.
button: Take the free practice test


## 56 Guarantee: targets
headline: The target, by starting score.
rows: ${BAND_LABELS[0]} = +${G.bands[0].cohort} on the cohort and ${P10.name}. +${G.bands[0].private} on ${P20.name} | ${BAND_LABELS[1]} = +${G.bands[1].cohort} on the cohort and ${P10.name}. +${G.bands[1].private} on ${P20.name} | ${BAND_LABELS[2]} = +${G.bands[2].cohort} on the cohort and ${P10.name}. +${G.bands[2].private} on ${P20.name} | ${BAND_LABELS[3]} = +${G.bands[3].cohort} on the cohort and ${P10.name}. +${G.bands[3].private} on ${P20.name} | ${G.noGuaranteeFrom} or higher = No guarantee. We tell you before you pay

## 61 About: opening
headline: Test prep that shows its work.
text: Karman prints every rule of its guarantee where you can read it, and shows parents and tutors every answer a student gives.

## 62 About: three things
headline: Three things we won't do.
rows: Keep tutors guessing = Every answer your student gives reaches their tutor before the next session | Hide the rules = The guarantee's terms sit on the home page, in full, next to the promise | Stop watching after you pay = Parents get the same numbers the guarantee is measured on, every week

## 63 About: how we teach
headline: A test, then an hour on every mistake.
text: Karman began as one-on-one tutoring. The method hasn't changed: a timed full-length test, then a review of every question missed. The programs add what research keeps backing: spaced review of mistakes, mixed practice and small groups.
proof: ${PROOF}

## 64 About: our own rules
headline: Rules we hold our own marketing to.
list: No testimonials until real ones exist | Every result says where it came from | Score estimates are always ranges | No countdown timers or fake deadlines | Every cohort's results published, dropouts included, once 15 to 20 SAT scores exist

## 65 About: close
headline: Start with one Saturday.
text: The free practice test shows you our questions, our proctoring and our feedback before you spend anything.
button: Take the free practice test

## 71 FAQ
headline: Straight answers.
qa: What does the ${monthOf(MP.startDate)} cohort cost, all in? = ${$(MP.price)}, or ${SPLIT}. There is no materials fee and no platform fee. | Is the ${$(MP.depositAmount)} deposit refundable? = Yes. It holds the seat after your call with ${FOUNDER.firstName}, and it counts toward the ${$(MP.price)}. | Why is there a call before I can pay? = Every class has ${w(MP.paidSeats)} seats, so ${FOUNDER.firstName} meets each student and parent first. We want to know the goal and whether the program is the right fit before anyone pays. | Who teaches the classes? = A Karman tutor teaches the live classes. The cohort has no one-on-one sessions; private tutoring does. | What's the difference between ${PP.name} and ${PRO.name}? = ${PP.name} (${$(PP.monthly)} a month) is the core question pool with written explanations. ${PRO.name} (${$(PRO.monthly)} a month) adds the hard mastery questions, and video explanations, added as they're recorded. | What if my student misses a class? = The guarantee counts live attendance: at least ${G.minClassesAttended} of the ${MP.totalClasses} classes. A recording doesn't count toward it. | Which SAT counts for the guarantee? = On the cohort, any SAT taken within ${G.satWithinDays} days of the last class. On private tutoring, within ${G.private.satWithinDays} days of the last session. | My student already scores high. Is that covered? = Up to ${TOP.upTo}, yes. From a start of ${BAND_LABELS[3]} the target is +${TOP.cohort} points on the cohort and ${P10.name}, and +${TOP.private} on ${P20.name}. From ${G.noGuaranteeFrom} there is no guarantee, and we tell you before you pay. | Do you use real College Board questions? = The baseline is a Bluebook practice test from the College Board. Everything else, including the free practice test and the Daily 10, is written by Karman. | How do I claim the guarantee? = Email the College Board score report to ${G.claimEmail} within ${G.claimDays} days of scores coming out.

## 81 Research: opening
headline: Why Karman is built the way it is.
text: Every habit we ask of your student comes from studies you can read yourself. Here they are, what each one found, and where it shows up in the program.
button: Take the free practice test
curve once: Read once
curve spaced: Recalled, spread out
curve memory: What sticks
curve time: Weeks of practice

## 82 Research: the studies
headline: Six findings, and what we built from each.
retrieval name: Recall beats rereading
retrieval found: Students who practiced recalling a passage remembered more of it a week later than students who spent the same time rereading it.
retrieval karman: The Daily 10 asks your student to answer, never to review notes.
retrieval source: Roediger and Karpicke, Psychological Science, 2006
spacing name: Spread it out
spacing found: Reviews spread over days and weeks held up far better than the same reviews crammed together, and the best gap grew with how long the memory had to last.
spacing karman: A missed question comes back days later, then again after a longer gap.
spacing source: Cepeda and colleagues, Psychological Science, 2008
review name: Two techniques stand out
review found: A review of ten common study techniques rated only two as highly useful: practice testing and practice spread out over time. Highlighting and rereading rated low.
review karman: Practice tests and spaced daily practice carry the program. Highlighting doesn't appear anywhere.
review source: Dunlosky and colleagues, Psychological Science in the Public Interest, 2013
mixed name: Mix the problem types
mixed found: Students who practiced shuffled math problems did much better on a later test than students who practiced one type at a time, because they had to choose the method.
mixed karman: Homework and the Daily 10 mix skills, like the SAT does.
mixed source: Rohrer and Taylor, Instructional Science, 2007
feedback name: Feedback on the task
feedback found: Feedback that says what went wrong and what to do next is among the strongest influences on learning. Praise on its own does very little.
feedback karman: In private tutoring, an hour one-on-one on each missed question after every full-length test.
feedback source: Hattie and Timperley, Review of Educational Research, 2007
tutoring name: Attention changes results
tutoring found: Students taught one-on-one, with checks and corrections along the way, did far better than students taught in a regular class.
tutoring karman: Private tutoring, and classes of six where every student answers out loud.
tutoring source: Bloom, Educational Researcher, 1984
read link: Read the study

## 83 Research: close
headline: See it working before you pay.
text: The free practice test uses the same questions and the same feedback. You'll see the score range, the domains and the call before you spend anything.
button: Take the free practice test

## 101 Schools: opening
headline: A ${PP.name} plan for every student. The first year is free.
text: Every student gets a ${PP.name} plan of their own: the core question pool across all ${QB.skills} SAT skills, written explanations, the Daily 10 and full-length practice tests. It is not a shared pool. After the first year, ${$(SCHOOL.pricePerStudentPerYear)} per student a year.
button: Email us about your school
button note: Free for the first year. No card.
facts: ${$(0)} = The first year | ${$(SCHOOL.pricePerStudentPerYear)} = Per student a year, after that | ${QB.skills} = SAT skills covered | ${QB.difficultyLevels} = Difficulty levels

## 102 Schools: what each student gets
headline: What each student gets.
rows: Their own plan = Their own account, practice history and Daily 10. No shared logins and no shared question pool | The core question pool = Practice across all ${QB.skills} SAT skills, with a written explanation for every question | The Daily 10 = Ten questions a day, picked from the skills each student misses | Full-length practice tests = Timed, on the platform, with a breakdown by domain

## 103 Schools: how it starts
headline: How it starts.
rows: Write to us = Your school's name and roughly how many students | We set it up = Your students get a link to join with their own accounts | The first year = Free | After that = ${$(SCHOOL.pricePerStudentPerYear)} per student a year, invoiced once a year

## 104 Schools: close
headline: Start with a free year.
text: Email us your school's name and roughly how many students. We'll set it up and send your students their link.
button: Email us about your school

## 111 Tutors: opening
headline: One code gives up to ${TA.maxStudents} of your students Karman.
text: For tutors who sell on marketplaces like Leland. ${$(TA.monthly)} a month. Your students redeem your code and get the ${PP.name} plan free while you subscribe, and you see how each of them is doing.
button: Start as a tutor affiliate
button note: ${$(TA.monthly)} a month. Cancel any time.
facts: ${$(TA.monthly)} = A month, per tutor | ${TA.maxStudents} = Students on one code | ${$(0)} = For your students, while you subscribe | ${QB.skills} = SAT skills covered

## 112 Tutors: what your students get
headline: What your students get.
rows: The ${PP.name} plan = The core question pool across all ${QB.skills} SAT skills, with written explanations | The Daily 10 = Ten questions a day, picked from the skills they miss | Full-length practice tests = Timed, on the platform | Free = For as long as your subscription is active

## 113 Tutors: what you get
headline: Admin rights over your students.
rows: See their progress = Every answer, every skill and every test score | Assign work = Practice for one student or the whole roster | Manage your roster = Up to ${TA.maxStudents} students on your code | Remove a student = The seat opens for someone else

## 114 Tutors: close
headline: Your students practice. You see every answer.
text: ${$(TA.monthly)} a month for up to ${TA.maxStudents} students. When you stop, your students keep their accounts and move to the Free plan.
button: Start as a tutor affiliate

## 90 Photos
program alt: A student at her desk in the evening, in a live online class on her laptop, earbuds in, smiling at something the tutor said.
private alt: A tutor at home, mid-explanation to a student on a video call, one hand raised to make the point.
test alt: A student at a kitchen table, chin on his hand, working through a timed practice test on a laptop.
guarantee alt: A parent on the sofa in the evening, reading on a phone, a cup of tea beside them.
about alt: Three teammates on a gym bench during a break at practice, one showing another something on her phone.
pricing alt: A parent and her daughter at a kitchen counter, looking at a laptop together, the daughter pointing at something.
lin alt: A tutor at her desk at home, mid-explanation on a video call, one hand open as she makes a point.
daily alt: A runner on the bleachers after practice, answering questions on his phone, a towel beside him.
start alt: A student just home from school, backpack still on one shoulder, opening her laptop at the kitchen counter.
call alt: A mother and her daughter side by side at the dining table, listening closely on a video call.
bus alt: A student in a window seat on the bus, earbuds in, working through questions on his phone.

## Site
logo: Karman
free test link: Free practice test
start free: Start free
calculator link: Calculator
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
close: Close
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
form error name: Add your student's first name, so the proctor can check them in.
form error network: That didn't go through because the connection dropped. Your answers are still here.
form error server: That didn't go through on our side. Your answers are still here. Try again in a minute, or write to ${CONTACT.general}.
form retry: Try again
pricing headline: The full price, before you talk to anyone.
pricing text: Nothing is added later: no materials fee, no platform fee.
pricing date question: When does your student want to start?
pricing other date: Another time
pricing guarantee headline: What you get back, by score.
pricing badge: ${UP_TO.cohort}, or money back or the next cohort free.
pricing private badge: ${P10.name}: up to +${guaranteeMax("cohort")}. ${P20.name}: up to +${guaranteeMax("private")}.
pricing guarantee text: Half or all of the price back, or the next cohort free, depending on the score. You choose. Every rule is listed below.
pricing compare title: What each option includes
pricing compare open: Compare everything, line by line
pricing program button: Apply for a seat
pricing program deposit: Apply, then a ${CALL_MINUTES}-minute call with ${FOUNDER.firstName}, your student and you. If there's a seat and it fits, a ${$(MP.depositAmount)} refundable deposit holds it. It counts toward the ${$(MP.price)}.
pricing plans title: ${PP.name} and ${PRO.name}
pricing practice button: Start ${PP.name}
pricing pro button: Start ${PRO.name}
pricing plans note: No guarantee: it covers the cohort and private tutoring, where a tutor teaches every week.
pricing renewal: ${PLAN_RENEWAL}
pricing free note: Or start free: ${FREE.questionLimit} questions and ${w(FREE.fullLengthTests)} full-length test, no card.
pricing private button: Book a call with ${FOUNDER.firstName}
pricing other note: ${PP.name}, ${PRO.name} and private tutoring start any day.
pricing full: Pay in full
pricing split: ${MP.installments.count} payments
pricing split note: After the ${$(MP.depositAmount)} deposit
pricing more: Schools and tutors
pricing schools: ${SCHOOL.name} = Free for the first year, then ${$(SCHOOL.pricePerStudentPerYear)} per student a year. Every student gets a ${PP.name} plan of their own.
pricing tutors: ${TA.name} = ${$(TA.monthly)} a month. One code gives up to ${TA.maxStudents} of your students ${PP.name}, free while you subscribe.
pricing guarantee link: The guarantee, with worked examples
pricing honest note: If you're already scoring ${INTAKE.scoreFrom} or higher, or your test is less than ${w(INTAKE.minWeeks)} weeks away, we'll tell you honestly that a program probably isn't the best use of your money.
pricing scholarship: The student with the top SAT score in every cohort gets a ${$(SCH.amount)} scholarship: the ${$(SCH.refund)} back, plus ${$(SCH.meritBonus)}.
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

/** "a | b | c" -> ["a", "b", "c"] */
export function list(s: string | undefined): string[] {
  return (s ?? "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** "a = b | c = d" -> [["a", "b"], ["c", "d"]] */
export function pairs(s: string | undefined): [string, string][] {
  return list(s).map((x) => {
    const [a, ...b] = x.split(" = ");
    return [a.trim(), b.join(" = ").trim()];
  });
}
