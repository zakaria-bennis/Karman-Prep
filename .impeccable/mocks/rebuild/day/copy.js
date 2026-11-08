// KARMAN HOME PAGE COPY, direction "One day, in colour" (round 2, 2026-11-01).
// Written for the parent. Round 1 lines were written with the Conversion Copywriter skill
// (Harry Dry's three rules: can you see it, can it be proved, could nobody else say it).
// Round 2 kept them and added only what the new screens need: the hero pill, the tab names,
// the calendar and rewards chapters, the plan links. Every price, date and claim comes
// from src/lib/marketing/offer.ts.
//
// HOW TO EDIT
// Change only the words after the colon on each line, then save and refresh the page.
// Each section starts with "## name". Keep the label before each colon ("headline:", "text:").
// A line left empty after its colon hides that line on the page.
// Square brackets mark the one coloured word or phrase in a headline: [like this]. Keep one pair at most.
// Lists use " | " between items. In rows, " = " splits the columns.
// "clock:" is the time that opens each chapter of the day. Keep it short ("3:40 p.m.").
//
// Word limits (motion-and-colour brief): headline 8 words, one subline of 14 words or fewer,
// list rows 4 or fewer. The page warns nobody if you go over, so count.
//
// House rules: no em dashes, nothing offer.ts doesn't promise, tutoring results always with
// "Karman 1:1 tutoring, median 16 weeks", no numbered lists, talk to the parent, company voice.
// CONFIRM before launch: the free test's 10:00 a.m. start, class days and times, the season
// Your Daily 10 arrives ("this winter"), the names Platform and Plus, the guarantee wording (lawyer).
//
// Alternates the copywriter kept (swap one in if you prefer it):
//   hero headline: "Ten minutes of SAT before first period." / "SAT prep that runs on her clock."
//   daily headline: "Every miss comes back to her." / "What she misses, she sees again."
//   calendar headline: "Every class and due date, one calendar."
//   class headline: "Six students, one tutor, ending March 6." / "Live on Zoom until test day."
//   rewards headline: "Ten questions, then a box to open."
//   parent headline: "You see her week without asking."
//   close headline: "Find out where she stands, free."
// Fix round 2: the Daily 10 line and the honest line now use offer.ts's own words; two lines offer.ts does
// not support were removed ("Your Daily 10 arrives this winter", the tokens line).

window.KARMAN_COPY = `
## site
title: Karman | SAT prep that fits her school day
description: SAT prep for your student: Your Daily 10 on her phone, live classes on Zoom that end on the March 6 SAT, and a weekly update for you. Free practice test Saturday, December 12.
skip: Skip to the page
nav: Her day = #daily | Live class = #class | Plans = #plans
nav test: Free practice test
nav test short: Free test
menu: Menu
close: Close
theme: Theme
theme auto: Auto
theme dark: Dark
theme light: Light

## hero
pill: Free practice test, December 12
clock: 6:50 a.m.
headline: SAT prep that fits [her school day].
text: Daily practice, live Zoom classes, weekly updates for you.
button: Take the free practice test
note: Free. About 75 minutes, live on Zoom.
alt: Maya, a high-school student, against a marigold backdrop, headphones around her neck.
tabs label: Her day in the Karman app
tabs: 6:50 = Home | 7:40 = Daily 10 | 3:40 = Calendar | 9:00 = Rewards | 9:15 = Parent
screen alts: Her Karman home screen: Your Daily 10, what's due and her next live class. | A Karman practice question: If 3x + 5 = 26, what is the value of x? | Her Classes screen: the next live class with David, and this week's calendar. | Her rewards: tokens, the next mystery box and her fox. | The parent's weekly update: skills that moved, practice, live classes, what's next.

## daily
clock: 7:40 a.m.
headline: What she misses [comes back].
text: Ten minutes a day. Every question she misses comes back after 2, 7 and 21 days.
clip alt: Your Daily 10 on her phone: If 3x + 5 = 26, what is x? She picks 6, 7 is marked right, and the explanation opens.

## calendar
clock: 3:40 p.m.
headline: Classes and homework, [one calendar].
text: Two live classes a week, and the practice due before each one.
caption: 3:40 p.m., after rehearsal
alt: A student sits on the edge of an empty school stage after rehearsal, a laptop on her knees, a cello on its stand beside her.
clip alt: Her Karman Classes screen: the next live class with David, Monday 7:00 to 8:30 pm ET, this week's classes and the homework due.

## class
clock: 7:00 p.m.
headline: A live class that ends [March 6].
text: Up to six students, twice a week on Zoom, from January 4.
link: See the March program
student: Maya
tutor: David, Karman tutor
caption: On Zoom with David, 7:04 p.m.
alt student: Maya in her bedroom in the evening, headphones on, chin on her hand, listening on a video call.
alt tutor: A tutor at his own desk at home, explaining with one hand.
clip alt: The question on the shared screen: 7 is marked right and the explanation opens.

## rewards
clock: 9:00 p.m.
headline: Ten done, [a box to open].
clip alt: The end of Your Daily 10: a mystery box opens, headphones for her fox, then her results.

## parent
clock: 9:15 p.m.
headline: Her week, [sent to you].
text: Every week of the March SAT Program.
rows: Practice time | Attendance | Test scores | What's next
alt: A parent in a navy jacket against a clay-red backdrop, calm.
clip alt: The parent's weekly update on a phone: skills that moved, 199 questions, live classes with a missed class flagged, what's next.

## plans
headline: Pick how much [help she gets].
rows: The March SAT Program = $995 = 18 live classes on Zoom, ending on the March 6 SAT. = See the program = https://karmanprep.com/program | Private 1:1 = from $1,495 = 10 or 20 hours with a Karman tutor, booked when it suits her. = See Private 1:1 = https://karmanprep.com/private-tutoring | Plus = $49 a month = Every Karman practice question. = See pricing = https://karmanprep.com/pricing | Platform = $29 a month = 500 practice questions. = See pricing = https://karmanprep.com/pricing
lead tag: Starts January 4
more: See all plans
fewer: Show fewer plans
more rows: Free = $0 = 100 practice questions. | School = $10 a student = Per year, for schools.
guarantee: The March program and Private 20 promise 100 more points or a 1450.
guarantee link: How the guarantee works
alt: A student sits cross-legged on a pine-green floor, headphones on, typing on a laptop.

## close
results: Ava = 1520 = UC Berkeley | Mateo = 1570 = Harvard | Priya = 1540 = Stanford
source: Karman 1:1 tutoring, median 16 weeks.
headline: Start with a [free practice test].
honest: If you're already scoring 1500 or higher, or your test is less than four weeks away, we'll tell you honestly that a program probably isn't the best use of your money.
button: Take the free practice test
note: Saturday, December 12, 10:00 a.m. ET. About 75 minutes, live on Zoom.

## footer
line: SAT prep that fits her school day.
links: Terms = https://karmanprep.com/terms | Privacy = https://karmanprep.com/privacy | Cookies = https://karmanprep.com/cookies
contact: hello@karmanprep.com
legal: Karman Prep, 2026.
pause: Pause motion
play: Play motion
top: Back to the top
`;
