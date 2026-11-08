/*
  Every word on the Pricing page lives in this file.

  How to edit:
  - Change the text after a label's colon. Keep the label (the word before the colon) as it is.
  - A line that starts with "## " starts a section. Leave those lines alone.
  - Keep each label on one line. Save the file and reload the page.
  - Prices, dates and the guarantee come from src/lib/marketing/offer.ts and
    docs/business/plan-ladder-2026-10-30.md. If you change one there, change it here too.
  - "price" is the number only (no $ and no comma): 1495, not $1,495.
  - "f1" to "f8" are a plan's feature lines, in order. Leave one empty to drop it.
  - "guarantee" on a plan adds the guarantee line with its seal. Only the March program and
    Private 20 carry the guarantee (offer.ts). Leave it empty on every other plan.
  - "featured: yes" puts the glow, the badge and the one marigold button on that card.
    One featured card per view.
  - Comparison rows: the row name, then one value per plan, split by "|".
    "yes" draws Karman's mark, "no" draws a faint line. Anything else is shown as written.
  - No em dashes, please (design rule 9).

  Copy written with the conversion-copywriter method (Harry Dry, marketingexamples.com);
  the run is in copy-run/.
*/
window.KARMAN_COPY = `
## meta
title: Karman | Plans and prices
description: SAT practice from $0 a month, live classes ending on the March 6 SAT, and private tutoring. Two plans carry a score guarantee.

## header
skip: Skip to content
home: Karman, home
nav_plans: Plans
nav_compare: Compare
nav_guarantee: Guarantee
nav_questions: Questions
menu: Menu
close: Close
theme_to_light: Switch to light mode
theme_to_dark: Switch to dark mode

## hero
headline: From 100 free questions to 20 hours with a tutor.
sub: Monthly practice plans you can cancel, and two tutor plans with a score guarantee.
view_label: Who is helping your teen
own: On your own
tutor: With a tutor

## plan_free
icon: free
name: Free
price: 0
suffix: a month
for: For a teen who wants to try Karman's questions before you spend anything.
cta: Start free
href: https://karmanprep.com/auth/sign-up
badge:
featured: no
f1: 100 questions
f2: Practice by skill, with explanations and a mistake log
f3: Challenge question and Wordline
f4: Streaks, tokens and the fox
guarantee:

## plan_platform
icon: platform
name: Platform
price: 29
suffix: a month, until you cancel
for: For a teen who practices most days and wants a predicted score.
cta: Get Platform
href: https://karmanprep.com/auth/sign-up
badge:
featured: no
f1: 500 questions
f2: Everything in Free
f3: Your Daily 10
f4: Full-length tests with a Karman predicted score
f5: Built-in graphing calculator
f6: Score Plan and Test-Day Playbook
f7: Parent account and updates
guarantee:

## plan_plus
icon: plus
name: Plus
price: 49
suffix: a month, until you cancel
for: For a teen who also wants live workshops and office hours.
cta: Get Plus
href: https://karmanprep.com/auth/sign-up
badge: Most complete
featured: yes
f1: Every question in the bank
f2: Everything in Platform
f3: Live workshops and office hours
f4: Recordings and video lessons
guarantee:

## plan_cohort
icon: cohort
name: March program
price: 995
suffix: founding price for 9 weeks, then $1,295
for: For a teen sitting the March 6 SAT who wants a class of up to six.
cta: Apply for a March seat
href: https://karmanprep.com/program#apply
badge: Founding price
featured: yes
f1: 18 live classes, two a week, from January 4
f2: Classes built on your group's mistakes
f3: Five full-length tests, two proctored live
f4: A weekly live session
f5: Cohort chat, answered by a tutor every day
f6: Weekly updates for parents
guarantee: Score guarantee: +100 points or a 1450

## plan_private10
icon: private
name: Private 10
price: 1495
suffix: for 10 hours with a Karman tutor
for: For a teen who wants 60-minute sessions, booked when it suits them.
cta: Book a free strategy call
href: https://karmanprep.com/private-tutoring#call
badge:
featured: no
f1: Ten 60-minute sessions
f2: Sessions go through every mistake on the latest full-length test
f3: No fixed weekly slot
f4: Everything on the platform
f5: The weekly live session
f6: A note to parents after every session
guarantee:

## plan_private20
icon: private
name: Private 20
price: 2495
suffix: for 20 hours with a Karman tutor
for: For a teen who wants twice the hours, backed by the guarantee.
cta: Book a free strategy call
href: https://karmanprep.com/private-tutoring#call
badge:
featured: no
f1: Twenty 60-minute sessions
f2: Sessions go through every mistake on the latest full-length test
f3: No fixed weekly slot
f4: Everything on the platform
f5: The weekly live session
f6: A note to parents after every session
guarantee: Score guarantee: +100 points or a 1450

## school
text: Schools pay $10 per student a year, July to June. Free from January to June 2027 for up to 10 founding schools.
link: Ask about a school license
href: mailto:hello@karmanprep.com?subject=School%20license

## moment
headline: What your teen opens after signing in.
sub: Home, Classes, a Your Daily 10 prize and Rewards, recorded in the Karman app. Classes come with the March program.
phone_alt: The Karman app on an iPhone: Home, the Classes schedule, a Your Daily 10 prize on the fox, then Rewards.

## compare
headline: What each plan includes
caption: What each plan includes
feature: Feature
yes: Included
no: Not included
own_heads: Free | Platform | Plus
own1: Questions | 100 | 500 | All
own2: Practice by skill, explanations, mistake log | yes | yes | yes
own3: Challenge question and Wordline | yes | yes | yes
own4: Streaks, tokens and the fox | yes | yes | yes
own5: Your Daily 10 | no | yes | yes
own6: Full-length tests, predicted score | no | yes | yes
own7: Built-in graphing calculator | no | yes | yes
own8: Score Plan and Test-Day Playbook | no | yes | yes
own9: Parent account and updates | no | yes | yes
own10: Live workshops and office hours | no | no | yes
tutor_heads: March program | Private 10 | Private 20
tutor1: Live classes | 18 | no | no
tutor2: 1:1 sessions with a tutor | no | 10 hours | 20 hours
tutor3: Everything on the platform | yes | yes | yes
tutor4: The weekly live session | yes | yes | yes
tutor5: Updates for parents | Weekly | After every session | After every session
tutor6: Score guarantee | yes | no | yes

## guarantee
headline: The March program promises +100 points or a 1450 on the official SAT.
sub: If the score falls short, the family chooses money back or a free seat in the next cohort.
head_result: Official result
head_remedy: What you get
r1_result: +100 or more, or 1450 and up
r1_remedy: Nothing back. The promise was kept.
r2_result: +50 to +99
r2_remedy: Half the price back, or the next cohort free.
r3_result: Under +50
r3_remedy: The full price back, or the next cohort free.
private: Private 20 carries it too: up to 6 more hours free, then half the price back if the next official SAT still falls short.
terms: The student attends 15 of the 18 classes, takes all five tests, completes 90% of the weekly practice and sits the SAT on the program's date. A student's first Karman program only; students starting at 1450 or above are not covered.
link: Read the full guarantee
href: https://karmanprep.com/guarantee

## faq
headline: Questions before you pay
q1: How are Platform and Plus billed?
a1: Every month, until you cancel.
q2: Which plans carry the score guarantee?
a2: The March program and Private 20. Free, Platform, Plus, Private 10 and School licenses do not.
q3: Can we pay for the March program in parts?
a3: Yes. Three installments of $345. A refundable $100 deposit holds a seat.
q4: When does the March program run?
a4: Classes start Monday, January 4, 2027, on Tuesdays and Thursdays, 7:00 to 8:30 p.m. ET. The program ends with the SAT on Saturday, March 6. Enrollment closes Wednesday, December 30.
q5: Is there a scholarship?
a5: One seat in every cohort is a scholarship seat, free for a student whose family can't afford the program. Write to hello@karmanprep.com.
q6: Is a program right for my teen?
a6: If your teen already scores 1500 or higher, or the test is less than four weeks away, Karman will tell you honestly that a program probably isn't the best use of your money.

## close
headline: Not sure yet? Start with the free practice test.
sub: Saturday, December 12, 10:00 a.m. ET. About 75 minutes, live on Zoom, with a predicted score and a 20-minute results call.
cta: Book the free practice test
href: https://karmanprep.com/free-practice-test

## footer
terms: Terms
privacy: Privacy
cookies: Cookies
contact: hello@karmanprep.com
theme_label: Theme
theme_auto: Auto
theme_light: Light
theme_dark: Dark
pause: Pause motion
play: Play motion
legal: © 2026 Karman Prep
`;
