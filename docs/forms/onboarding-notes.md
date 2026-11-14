# What Duolingo's onboarding taught us, and how Karman uses it

Founder, 2026-11-13: study Duolingo's onboarding with REA, Agent Reach and Mobbin, and apply it to ours.

## How it was studied

- **Mobbin:** Duolingo's iOS onboarding flow (20 screens) and its question screens.
- **REA and a scripted browser:** Duolingo's public web sign-up, walked screen by screen on 2026-11-13 for
  the Math course, stopping before any account was made.
- **Agent Reach and web reading:** what Duolingo's own people say (Gina Gotthilf at First Round, the Duolingo
  blog, Jorge Mazal and Jackson Shuttleworth with Lenny Rachitsky) and what critics say (growth.design, The
  Decision Lab).

## What Duolingo does (web, Math, as walked)

1. "I want to learn..." The course is chosen first. No account.
2. The mascot says hello, in two short screens.
3. "What best describes you?" Two choices.
4. "How can Duolingo Math help?" The reason, as six choices.
5. "How did you hear about Duolingo?"
6. "What's your daily learning goal?" 5, 10, 15 or 20 minutes, each with a name (Casual to Intense).
7. A screen that explains reminders before the browser asks permission.
8. "Let's pick a starting point!" The level is chosen, not tested.
9. Two screens of encouragement.
10. The first lesson starts. Still no account.

One question to a screen. A progress bar that starts part-filled. The button is at the bottom and stays grey
until something is picked. On the iPhone app the daily-goal button reads "I'm committed", the mascot answers
the level ("Since you know a few words, let's start at..."), and the name and email are asked only after the
first lesson, one field to a screen.

## What Duolingo's people say works

- Value before sign-up: moving sign-up after the first lessons raised daily users by about 20% (Gotthilf).
- A calm "Later" beat a large "Discard my progress" button. No shaming.
- Small daily goals. High goals were a barrier to the habit (Duolingo blog).
- A button that names the commitment beat "Continue" (Shuttleworth; no figure given).
- "Check your level" doubled the takers of what used to be called a placement test in Japan.
- Encouragement about effort raised 14-day retention by about 7% (Gotthilf).
- Explain reminders before asking, and ask after a first win.
- A badge for signing up did nothing. Reward real achievements.

## What does not transfer

Duolingo is free and self-serve, and its numbers are about daily use. A parent paying $995 needs trust,
clarity and the price in view, so the Reserve a seat form keeps its own rules (`form-rules.md`): email first,
no mascot, no game mechanics on the way to payment. Critics also fault Duolingo for guilt messages and for
upsell screens stacked after a lesson; Karman uses neither.

## How Karman uses it

Founder, 2026-11-13: keep the direction, but make it ours. It must live in the home page's world (the
ever-moving painted landscape), it must not read as a copy of Duolingo, and the companions are the earnable
faces from the quiz engine (`src/components/rewards/animals.ts`), never redrawn. The fox is Karman. The owl
is Ollie.

**The idea that is ours: a flight seen through a bird's eyes.** No bird is drawn. The visitor has the bird's
view, and the live landscape itself moves forward with every answer (`karman:fly`; SiteFlight's
`drive="steps"`). Progress is a dotted trail with a marker. Karman does the talking, in flight words ("Where
are we taking off from?", "Where do we land?", "We've landed."), Ollie is beside him on the big moments, and
the whole crew cheers at the end.

**Where it is used**

1. **Registration, right after payment** (`src/components/site/reserve/RegistrationFlight.tsx`, on
   `/reserve/welcome`). The buttons on the Pricing, SAT Program and Private tutoring pages lead to people who
   have already decided. The founder chose "pay first" (2026-11-13) after the research in `form-rules.md`
   and the round on this exact question: before payment the form asks only what payment needs (who, email,
   names, the SAT date, how to pay); the five questions that get the student started (starting score, goal,
   what is hardest, class times, a note) come straight after, as the flight. Then the account.
2. **The plan-finder for visitors who have not decided** (`src/app/onboarding`): Get started opens it, it
   ends in a plan, and the account is asked for at the end.

| Learned from Duolingo                             | How Karman does it                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Questions before any account                      | Get started opens the intake; the account is asked for at the end, to save the plan |
| A guide that reacts                               | Karman speaks at each step and answers the scores with the distance to fly          |
| One question to a screen, progress always visible | The same, on a frosted card over the landscape; the trail starts part-flown         |
| Level is self-described                           | "Where are we taking off from? A rough idea is fine."                               |
| Small daily goals with names                      | 10, 20, 30 or 45 minutes a day: Light, Steady, Serious, All in                      |
| The button names the commitment                   | "That's my pace" (not Duolingo's wording)                                           |
| A calm way out                                    | "Later. Show me every plan and price"                                               |
| Button in thumb reach                             | The main button is fixed to the bottom of the screen on phones                      |
| Answers are used                                  | Every answer feeds the plan, and the reasons are listed on the last screen          |

**The companions** (`src/components/rewards/animals.ts`): Karman the fox and Ollie the owl are the founder's
names. The other four have working names until he confirms them: Pip the bunny, Mochi the cat, Bruno the
bear, Scout the wolf pup.

Not built yet: a first practice question before the account, a reminder step, sound, and a moving hand-over
between the intake and the next page (today the next page simply opens on the same stretch of landscape).

## Update, 2026-11-14 (founder's review)

This supersedes anything above that disagrees with it.

- Karman the fox guides alone. Ollie is not in the plan-finder or the registration flight.
- The plan-finder asks only what a test prep company needs to place a student: who it is for, which SAT
  month (no PSAT, no exact days), latest score, goal score, hours a week, how they study best, what helps
  when they miss a question, and whether they prepped before. Words: `src/app/onboarding/_steps/shared.ts`.
- Study time is asked in hours a week (2 to 3, 4 to 6, 7 to 10, more than 10), not Duolingo-style daily
  minutes. The fox cites the College Board and Khan Academy finding that 20 hours of practice went with an
  average 115-point gain.
- Scores are typed (400 to 1600, in tens) into a pill whose label rises, with a slider under it.
- Progress is segmented, one segment a question, pinned under the header. Each question is centred.
- The plan: the cohort is the default; private tutoring only when the cohort cannot get the student there;
  Pro before Practice. The rules are at the top of `src/lib/onboarding/recommend-plan.ts`.
- A private-tutoring plan leads to `/call`, the call booking by itself (first name, last name, email, phone).
- No dashes in questions or answers. "Improved", never "moved".
