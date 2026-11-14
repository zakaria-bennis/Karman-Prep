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

## How Karman's intake uses it (`src/app/onboarding`)

Founder, 2026-11-13: keep the direction, but make it ours. It must live in the home page's world (the
ever-moving painted landscape), it must not read as a copy of Duolingo, and the companions are there to use.
The fox is Karman. The owl is Ollie.

**The idea that is ours: the intake is a flight.** Ollie the owl flies the route across the live landscape,
and every answer is a leg of it: the landscape itself moves forward each time (`karman:fly`, SiteFlight's
`drive="steps"`). Progress is not a bar but a dotted trail that Ollie flies along. Karman the fox rides along
and does the talking, in flight words: "Where are we taking off from?", "Where do you want to land?", "We've
landed." When the plan is shown the whole crew cheers, and the landscape has reached the country of the page
the plan leads to (Reserve a seat, the call, or Pricing), so the same view is there when the visitor arrives.

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
