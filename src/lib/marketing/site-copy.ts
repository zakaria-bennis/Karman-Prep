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
// Sections: 1 to 14 the home page, 21 to 27 the SAT Program, 31 to 36
// private tutoring, 41 to 45 the free practice test, 51 to 55 the
// guarantee, 61 to 65 About, 71 the FAQ, 90 the photos' alt text and
// captions. "## Site" holds the header, menu, footer, pricing page
// ("pricing ...") and the loading and form messages ("form ...").
//
// House rules: no em dashes, nothing the offer doesn't promise, tutoring
// results always with "Karman 1:1 tutoring, median 16 weeks", no numbered
// list markers, talk to the parent.
// ============================================================

import {
  CALL_MINUTES,
  CONTACT,
  FREE_PRACTICE_TEST as FT,
  FOUNDER,
  GUARANTEE as G,
  INTAKE,
  MARCH_PROGRAM as MP,
  NEXT_PROGRAMS,
  NEXT_PROGRAMS_ENROLLMENT_LABEL,
  PRIVATE_HOURLY_RATE,
  PRIVATE_PACKAGES,
  TRACK_RECORD as TR,
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
const monthBefore = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
};
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const [MAY, JUNE] = NEXT_PROGRAMS;
const [P10, P20] = PRIVATE_PACKAGES;
const CLASS = MP.paidSeats + MP.scholarshipSeats;
const SEATS_LEFT = Math.max(0, MP.paidSeats - MP.paidSeatsTaken);
const SAT_DAY = noYear(MP.testDateLabel);
const START_DAY = noYear(MP.startLabel);
const CLOSES = noYear(MP.enrollmentClosesLabel);
const TEST_DAY = noYear(FT.dateLabel);
const DATES = [MP.testDateShort, MAY.testDateShort, JUNE.testDateShort];
const PROMISE = `+${G.points} points or a ${G.orScore}`;
const PROOF = `Karman's 1:1 students gained ${TR.averageGain} points on average. ${TR.sourceLabel}.`;
const HALF_TO = G.points - 1;
const ENROLL_LATER = NEXT_PROGRAMS_ENROLLMENT_LABEL.replace(
  /^Enrollment opens/,
  "Enrollment for both opens"
);

export const SITE_COPY = `
## 1 Opening
headline: Real tutors teach it. Daily practice makes it stick.
text: Live SAT classes of ${w(CLASS)} and private one-on-one tutoring, taught by PhD students, quants and university professors. Between sessions, ten minutes of research-backed practice a day, and a tutor who sees every answer.
proof: ${PROOF}
button: Take the free practice test
button note: Free. ${TEST_DAY}, live on Zoom.
second button: See pricing

## 2 Live classes
headline: ${W(CLASS)} students, so nobody hides in the back row.
feature title: ${W(MP.classesPerWeek)} live classes a week, cameras on.
feature text: ${W(MP.totalClasses)} classes of ${MP.classMinutes} minutes, ${MP.classDaysLabel} from ${MP.classStart} to ${MP.classEnd}. Small enough that every student answers out loud.
card title: Plus a weekly live session.
card text: Pacing, Desmos and how the adaptive second module works, alternating with workshops on the skills students miss most.

## 3 One-on-one reviews
headline: After every practice test, an hour on what went wrong.
feature title: Every mistake, one by one.
feature text: ${W(MP.fullLengthTests)} full-length tests. After each one, ${MP.reviewMinutes} minutes one-on-one with a Karman tutor, working through every question your student missed until the method makes sense.

## 4 Daily practice
headline: Ten questions a day, picked from what your student gets wrong.
feature title: The Daily 10.
feature text: Every day, ten questions built around your student's weakest skills. The ones they miss come back until they stick, answered again, never just reread. About ten minutes, on the bus or before bed.
research link: Explore the research behind our design

## 5 Progress
headline: Your tutor starts every session already knowing what went wrong.
feature text: Every answer your student gives, on homework, the Daily 10 and every full-length test, reaches the tutor the moment it's given: the choice they picked, how long it took, and which of the eight SAT domains is slipping. No session opens with "so, what was hard this week?" You follow the same progress from your phone.

## 6 Study tools
headline: Small games between sets, built to make it stick.
text: For the five minutes on the bus or between classes. Each one asks your student to recall, not reread.
tools: Wordline = Today's SAT word in six tries. | Flashcards = Roots, prefixes and suffixes, so a new word can be worked out on test day. | Word Lab = One SAT word a day, used in a sentence of your own. | Daily Challenge = One hard question a day, with the full method after.

## 8 Guarantee
eyebrow: The Karman guarantee
headline: If your student does the work and the score doesn't rise, we pay you back.
text: You may have paid for SAT prep before and watched the score sit still. Then the refund turned out to hang on a rule nobody mentioned. It happens a lot in this industry. Here is our whole deal, on one line.
promise: ${PROMISE}
promise note: Measured from an official SAT or PSAT from the last ${G.baselineMonths} months, or from a week-1 Bluebook test we proctor live.
line start: Starting score
line weeks: ${W(MP.weeks)} weeks of work
line end: SAT day
line hint: Point at an ending to read it.
outcomes: +${G.points} or more, or ${G.orScore} and up = The promise was kept. Nothing back. | +${G.halfBackFrom} to +${HALF_TO} = Half the price back (${usd(MP.price / 2)}), or the next cohort free. You choose. | Under +${G.halfBackFrom} = The full ${$(MP.price)} back, or the next cohort free. You choose.
we do title: Our side
we do: ${W(MP.classesPerWeek)} live classes a week, in a group of up to ${w(CLASS)} | ${W(MP.fullLengthTests)} full-length practice tests | A ${MP.reviewMinutes}-minute one-on-one after every full-length | A weekly live session | The Daily 10 and our own practice questions | Live progress for parents, and a weekly summary
you do title: Your student's side
you do: Attend at least ${G.minClassesAttended} of the ${MP.totalClasses} live classes, live | Take all ${w(MP.fullLengthTests)} full-length tests, each in one timed sitting | Complete all ${w(MP.fullLengthTests)} one-on-one reviews (rescheduling with ${G.rescheduleHours} hours' notice is fine) | Do at least ${G.practicePct}% of the weekly practice, tracked on the dashboard | Sit the official SAT on the program's test date
covers: A student's first Karman program, once per student | Not for students starting at ${G.excludedFrom} or above | Paid in full, or every installment paid on time
claim: Within ${G.claimDays} days of scores coming out, email us the official College Board score report. One email. Nothing is taken out of a refund.
link: The guarantee, with worked examples

## 9 Campus film
headline: What the ${w(MP.weeks)} weeks are for.

## 11 The close
headline: See their score range before you spend a dollar.
text: ${FT.dateShort} at ${FT.timeLabel}, live on Zoom with a proctor. About ${FT.minutes} minutes, ${FT.questionCount} of our own questions, then an estimated score range, a breakdown by domain and a ${FT.callMinutes}-minute call to go through it.
objection: Already scoring ${INTAKE.scoreFrom}, or under ${w(INTAKE.minWeeks)} weeks from the test? We'll tell you a program probably isn't worth your money.
button: Take the free practice test
button note: Free. No card needed.
line note: 100 km up, where the sky ends and space begins.

## 12 Tutors
eyebrow: Our tutors
headline: Tutors you would hire for something harder than the SAT.
text: The people teaching your student do serious math and reading for a living. They teach because they're good at explaining it.
credentials: PhD students = Doing research at university level | Quants = Building mathematical models for a living | Market analysts = Reading data against a deadline, every day | Published researchers = Peer-reviewed work in their own fields | University professors = Teaching is already their profession | Certified tutors = Certified by the Association of Test Preparation, Admissions, and Private Tutoring

## 13 Ways to learn
eyebrow: Ways to learn
headline: A class, a private tutor, or a free test first.
text: Every option ends on your student's SAT date. Pick the one that fits, or start with the free test and decide after.
program title: The SAT Program
program text: ${W(MP.weeks)} weeks in a class of ${w(CLASS)}: live classes, ${w(MP.fullLengthTests)} full-length tests with a one-on-one review after each, and the guarantee.
program price: ${$(MP.price)}
program note: Founding price. Next class starts ${START_DAY}.
program seats: ${SEATS_LEFT} of ${MP.paidSeats} seats open
program link: About the SAT Program
private title: Private tutoring
private text: One tutor, one student, a plan built back from the test date. ${P10.hours} or ${P20.hours} hours, or by the hour.
private price: From ${$(P10.price)}
private note: ${P10.hours} hours, or ${$(PRIVATE_HOURLY_RATE)} an hour
private link: About private tutoring
free title: The free practice test
free text: About ${FT.minutes} minutes live on Zoom with a proctor, an estimated score range and a ${FT.callMinutes}-minute call.
free price: Free
free note: ${TEST_DAY}
free link: Save a seat
pricing link: See all pricing

## 14 Calendar
headline: The next session, what's due and how every skill is moving, on one screen.
text: A one-on-one student's calendar: each session, the full-length test due before it, homework, workshops and office hours, beside progress on all eight SAT domains. Point at a day, or at a test, to see what it leads to.

## 21 Program: opening
eyebrow: ${MP.name}
headline: ${W(MP.weeks)} weeks, ending ${SAT_DAY}.
text: ${W(CLASS)} students, ${w(MP.classesPerWeek)} live classes a week, ${w(MP.fullLengthTests)} full-length tests with a one-on-one hour after each, and the guarantee printed in full. Classes start ${START_DAY}.
button: Apply for a seat
button note: Enrollment closes ${CLOSES}.
facts: ${$(MP.price)} = Founding price, ${monthOf(MP.testDate)} only | ${CLASS} = Students per class, ${w(MP.scholarshipSeats)} on scholarship | ${MP.totalClasses} = Live classes of ${MP.classMinutes} minutes | ${MP.fullLengthTests} = Full-length tests, each with a one-on-one review

## 22 Program: a week
headline: What a week looks like.
text: Every week has the same shape, so it fits around practice, games and homework.
rows: ${MP.classDays[0]}, ${MP.classStart} p.m. ET = Live class, ${MP.classMinutes} minutes | ${MP.classDays[1]}, ${MP.classStart} p.m. ET = Live class, ${MP.classMinutes} minutes | Once a week = The live session: test mechanics, or a workshop on the skills students miss most | Every day = The Daily 10, about ten minutes | Every week = Your update: skills, attendance, practice done, test scores

## 23 Program: the nine weeks
headline: ${W(MP.fullLengthTests)} tests, ${w(MP.fullLengthTests)} reviews, one SAT.
rows: ${MP.startShort} = A baseline: an official Bluebook test, proctored live, then the first one-on-one review | ${monthOf(MP.startDate)} and ${monthBefore(MP.testDate)} = Three more full-length tests, each followed by its one-on-one hour | Late ${monthBefore(MP.testDate)} = The dress rehearsal, proctored live, about a week before the SAT | ${SAT_DAY} = The SAT

## 24 Program: who it's for
headline: Built for an 11th grader with room to grow.
text: It fits a student with a spring SAT and a score they want to raise. If your student is already at ${INTAKE.scoreFrom}, or the test is less than ${w(INTAKE.minWeeks)} weeks away, we'll say so before you pay: a program probably isn't the best use of your money.
card title: One seat in every cohort is free.
card text: The scholarship seat goes to a student whose family can't afford the program. Write to ${CONTACT.general}.

## 25 Program: how to join
headline: Every family starts with a call with ${FOUNDER.firstName}.
rows: Apply = Two minutes: your email, the latest score and the score they want | A ${CALL_MINUTES}-minute call = You, your student and ${FOUNDER.firstName}, Karman's founder, on one video call. We talk about the goal, the test date and how much time your student really has | Hear back = We tell you honestly whether the program fits and whether there's a seat. A ${$(MP.depositAmount)} refundable deposit holds it
seats: ${SEATS_LEFT} of ${MP.paidSeats} seats open for ${monthOf(MP.testDate)}
button note: ${W(MP.paidSeats)} paid seats and ${w(MP.scholarshipSeats)} scholarship seat per class.
form email: Your email
form latest: Latest SAT or PSAT score
form latest help: Leave it empty if they haven't taken one yet.
form target: The score they want
form date: Which SAT are they taking?
form date options: ${DATES.join(" | ")}
form button: Send the application
form done title: Application received.
form done text: We'll email you to set up the ${CALL_MINUTES}-minute call with ${FOUNDER.firstName}. Nothing is charged until you hold the seat.

## 26 Program: price
headline: ${$(MP.price)}, or ${w(MP.installments.count)} payments of ${$(MP.installments.amount)}.
text: The founding price, for the ${monthOf(MP.testDate)} cohort only. Later cohorts are ${$(MP.regularPrice)}. Nothing is added later: no materials fee, no platform fee.

## 27 Program: later dates
headline: Not ${monthOf(MP.testDate)}? ${MAY.testDateShort} and ${JUNE.testDateShort}.
text: The ${monthOf(MAY.testDate)} cohort starts ${MAY.startLabel}. The ${monthOf(JUNE.testDate)} cohort starts ${JUNE.startLabel}. ${ENROLL_LATER}

## 31 Private: opening
eyebrow: Private tutoring
headline: One student, one tutor, planned back from the test.
text: Weekly 60-minute sessions. Each one starts from your student's latest full-length test and goes through every mistake. ${$(PRIVATE_HOURLY_RATE)} an hour, in packages of ${P10.hours} or ${P20.hours}.
button: Book a call with ${FOUNDER.firstName}
button note: ${CALL_MINUTES} minutes with you, your student and ${FOUNDER.firstName}. Every private student starts here.

## 32 Private: a session
headline: Every session starts with a test, not a worksheet.
rows: Before = Your student takes a full-length test, or we pick the skill holding them back | During = 60 minutes on every question they missed: what happened and how to fix it | After = A note to you: what you worked on, what improved and what comes next

## 33 Private: packages
headline: Two packages. One price per hour.
small package: ${P10.name} = ${P10.hours} hours, ${$(P10.price)}. For a focused push on one section. No guarantee: ${w(P10.hours)} hours is too few to promise a result.
large package: ${P20.name} = ${P20.hours} hours, ${$(P20.price)}. Comes with the guarantee: ${PROMISE}, or up to ${G.private20.bonusHours} more hours free, then half the price back.
includes: The full practice platform and the Daily 10 | The weekly live session | A note to parents after every session

## 34 Private: track record
headline: This is how we have always tutored.
text: Karman's 1:1 students gained ${TR.averageGain} points on average, from ${TR.averageBefore} to ${TR.averageAfter}, and ${TR.reachedTargetPct}% reached their target score.
proof: ${TR.sourceLabel}. ${FOUNDER.studentsTutored} students.

## 35 Private: guarantee terms
headline: What ${P20.name} asks of your student.
rows: Every session = Cancelling with less than ${G.private20.cancelHours} hours' notice counts as a missed session | ${W(G.private20.fullLengthTests)} full-length tests = Taken across the ${P20.hours} hours | The SAT = Within ${G.private20.satWithinDays} days of the last session

## 36 Private: close
headline: Every private student starts with a call.
text: You, your student and ${FOUNDER.firstName}, Karman's founder, on one video call. We talk about the target, the test date and how much time your student has each week. Then we tell you honestly whether private tutoring fits, how many hours make sense, and when a tutor is free.
form email: Your email
form latest: Latest SAT or PSAT score
form latest help: Leave it empty if they haven't taken one yet.
form date: When is their SAT?
form date options: ${DATES.join(" | ")} | Another date | Not sure yet
form button: Request the call
form done title: Request received.
form done text: We'll email you times for the ${CALL_MINUTES}-minute call with ${FOUNDER.firstName}.

## 41 Test: opening
eyebrow: Free practice test
headline: A proctored practice SAT, free, on ${FT.dateShort}.
text: ${FT.minutes} minutes on Zoom with a live proctor. ${FT.questionCount} questions written by Karman: one Reading and Writing module, one Math module. Then a score range, a breakdown by domain and a ${FT.callMinutes}-minute call.
facts: ${TEST_DAY} = ${FT.timeLabel} | ${FT.durationLabel} = ${FT.questionCount} questions | Live on Zoom = With a proctor | $0 = No card needed

## 42 Test: the form
headline: Save your student's seat.
form email: Your email
form email help: The Zoom link and the results go here.
form name: Student's first name
form grade: Grade
form grade options: 9th | 10th | 11th | 12th
form date: Which SAT are they planning to take?
form date options: ${DATES.join(" | ")} | Not sure yet
form button: Save the seat
form privacy: We use your email for this test and its results. Nothing else unless you ask.
form done title: The seat is saved.
form done text: Check your inbox for the Zoom link. It comes from ${CONTACT.general}.

## 43 Test: what you get
headline: What you get back.
rows: A score range = An estimate, given as a range, never a single number | A breakdown by domain = Which of the eight SAT domains cost the most points | A ${FT.callMinutes}-minute call = A Karman tutor walks you through it and answers questions

## 44 Test: the sitting
headline: How the sitting runs.
rows: Join the Zoom = At ${FT.timeLabel}. The proctor checks everyone in | Reading and Writing = One timed module | Math = One timed module, with Desmos | Done = Your results come with a link to book the call

## 45 Test: honest note
headline: An estimate, not a prediction.
text: It's half the length of the SAT and built from our own questions, so the range is an estimate. That's why it's a range. We show it so you can judge the quality of our questions before you pay for anything.
button: Save the seat

## 51 Guarantee: opening
eyebrow: The Karman guarantee
headline: ${PROMISE}, or your money back.
text: This page and the home page say the same thing. Nothing on any other page adds a rule.

## 52 Guarantee: examples
headline: Four students, worked through.
rows: Baseline 1180, SAT 1300 = +120. The promise was kept. Nothing back | Baseline 1180, SAT 1250 = +70. Half back (${usd(MP.price / 2)}), or the next cohort free | Baseline 1180, SAT 1210 = +30. The full ${$(MP.price)} back, or the next cohort free | Baseline 1400, SAT ${G.orScore} = +${G.orScore - 1400}, but ${G.orScore} was reached. The promise was kept

## 53 Guarantee: what we won't add
headline: What you won't find in our terms.
list: A "good faith" clause we get to judge | A quota on answering polls in class | A rule that every session be on the same device | Fees taken out of a refund | A line saying a claim may not be approved

## 54 Guarantee: private and exclusions
headline: Private tutoring and what isn't covered.
rows: ${P20.name} = ${PROMISE}. If not: up to ${G.private20.bonusHours} more hours free, then half the price back if the next official SAT still falls short | ${P10.name} = No guarantee. ${W(P10.hours)} hours is too few to promise a result | Free practice test = No guarantee. It's free

## 55 Guarantee: claim
headline: Claiming takes one email.
text: Within ${G.claimDays} days of scores coming out, send the official College Board score report to ${G.claimEmail}. No mailed paper reports, no fees.
button: Take the free practice test

## 61 About: opening
eyebrow: About Karman
headline: SAT prep should have a finish line.
text: Karman sells programs that end on one official SAT date, prints every rule of its guarantee where you can read it, and tells parents every week whether the work got done.

## 62 About: three things
headline: Three things we won't do.
rows: Sell open-ended hours = Every program ends on a test date, and private packages are planned back from one | Hide the rules = The guarantee's terms sit on the home page, in full, next to the promise | Stop watching after you pay = Parents get the same numbers the guarantee is measured on, every week

## 63 About: how we teach
headline: A test, then an hour on every mistake.
text: Karman began as one-on-one tutoring. The method hasn't changed: a timed full-length test, then a review of every question missed. The programs add what research keeps backing: spaced review of mistakes, mixed practice and small groups.
proof: ${PROOF}

## 64 About: our own rules
headline: Rules we hold our own marketing to.
list: No testimonials until real ones exist | Every result says where it came from | Score estimates are always ranges | No countdown timers or fake deadlines | Every cohort's results published, dropouts included, once 15 to 20 official scores exist

## 65 About: close
headline: Start with one Saturday.
text: The free practice test shows you our questions, our proctoring and our feedback before you spend anything.
button: Take the free practice test

## 71 FAQ
eyebrow: Questions
headline: Straight answers.
qa: What does the ${monthOf(MP.testDate)} program cost, all in? = ${$(MP.price)}, or ${w(MP.installments.count)} payments of ${$(MP.installments.amount)}. There is no materials fee and no platform fee. | Is the ${$(MP.depositAmount)} deposit refundable? = Yes. It holds the seat after your call with ${FOUNDER.firstName}. | Why is there a call before I can pay? = Every class has ${w(MP.paidSeats)} paid seats, so ${FOUNDER.firstName} meets each student and parent first. We want to know the goal and whether the program is the right fit before anyone pays. | Who teaches the classes? = A Karman tutor teaches the live classes and runs the one-on-one reviews. | What if my student misses a class? = The guarantee counts live attendance: at least ${G.minClassesAttended} of the ${MP.totalClasses} classes. A recording doesn't count toward it. | What if the ${monthOf(MP.testDate)} SAT is cancelled? = The next official SAT within ${G.fallbackSatDays} days counts for the guarantee. A doctor's note works the same way. | My student is already at ${G.excludedFrom}. Can they join? = Yes, but the guarantee doesn't cover students starting at ${G.excludedFrom} or above, and we say so before you enroll. | Do you use real College Board questions? = The baseline is an official Bluebook test. Everything else, including the free practice test and the Daily 10, is written by Karman. | How do I claim the guarantee? = Email the official College Board score report to ${G.claimEmail} within ${G.claimDays} days of scores coming out.

## 81 Research: opening
eyebrow: The research
headline: Why Karman is built the way it is.
text: Every habit we ask of your student comes from studies you can read yourself. Here they are, what each one found, and where it shows up in the program.
button: Take the free practice test
curve once: Read once
curve spaced: Recalled, spread out
curve memory: What sticks
curve time: The weeks before the SAT

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
feedback karman: After every full-length test, an hour one-on-one on each missed question.
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

## 90 Photos
program alt: A student at her desk in the evening, in a live online class on her laptop, earbuds in, smiling at something the tutor said.
program caption: A live class, from her own desk.
private alt: A tutor at home, mid-explanation to a student on a video call, one hand raised to make the point.
private caption: One tutor, one student, a plan that ends on the test date.
test alt: A student at a kitchen table, chin on his hand, working through a timed practice test on a laptop.
test caption: ${FT.minutes} minutes, timed, from home. A proctor watches the clock.
guarantee alt: A parent on the sofa in the evening, reading on a phone, a cup of tea beside them.
guarantee caption: Every term is on this page. Nothing to ask for.
about alt: Three teammates on a gym bench during a break at practice, one showing another something on her phone.
about caption: Daily 10 fits in a break at practice.
pricing alt: A parent and her daughter at a kitchen counter, looking at a laptop together, the daughter pointing at something.
pricing caption: Every price is here, so the talk at home is short.

## Site
logo: Karman
free test link: Free practice test
calculator link: Calculator
program link: The SAT Program
private link: Private tutoring
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
footer company: Karman
footer legal: Legal
menu: Menu
close: Close
pause: Pause the film
play: Play the film
dark mode: Dark mode
light mode: Light mode
loading film: The film is on its way.
form sending: Sending
form error score: SAT and PSAT scores run from 320 to 1600, in steps of 10.
form error target: Add the score they're aiming for, between 400 and 1600.
form error email: That email looks incomplete. It needs an @ and a domain, like name@gmail.com.
form error name: Add your student's first name, so the proctor can check them in.
form error network: That didn't go through because the connection dropped. Your answers are still here.
form error server: That didn't go through on our side. Your answers are still here. Try again in a minute, or write to ${CONTACT.general}.
form retry: Try again
pricing eyebrow: Pricing
pricing headline: The full price, before you talk to anyone.
pricing text: Pick your student's SAT date and see what the program costs, what it includes and what the guarantee covers. Nothing is added later.
pricing date question: Which SAT is your student taking?
pricing other date: Another date
pricing guarantee headline: What you get back, by score.
pricing badge: ${PROMISE}, or your money back.
pricing guarantee text: Half or all of the price back, or the next cohort free, depending on the score. You choose. Five rules apply, all listed below.
pricing compare title: What each option includes
pricing compare open: Compare everything, line by line
pricing free button: Book the free test
pricing program button: Apply for a seat
pricing program deposit: Apply, then a ${CALL_MINUTES}-minute call with ${FOUNDER.firstName}, your student and you. If there's a seat and it fits, a ${$(MP.depositAmount)} refundable deposit holds it.
pricing private button: Book a call with ${FOUNDER.firstName}
pricing other note: Every program ends on ${MP.testDateShort}, ${MAY.testDateShort} or ${JUNE.testDateShort}. For any other date, private tutoring is planned back from it.
pricing full: Pay in full
pricing split: ${MP.installments.count} payments
pricing guarantee link: The guarantee, with worked examples
pricing honest note: If you're already scoring ${INTAKE.scoreFrom} or higher, or your test is less than ${w(INTAKE.minWeeks)} weeks away, we'll tell you honestly that a program probably isn't the best use of your money.
pricing scholarship: One seat in every cohort is a scholarship seat, free for a student whose family can't afford the program.
credits: Night sky: International Gemini Observatory/NOIRLab/NSF/AURA (CC BY 4.0). Earth from orbit: NASA.
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
