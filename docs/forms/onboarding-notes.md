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

| Duolingo                                  | Karman                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| Questions before any account              | Get started opens the intake; the account is asked for at the end, to save the plan           |
| The mascot guides and reacts              | The fox says how long it takes, speaks at each step and answers the scores with the gap       |
| One question to a screen, bar part-filled | The same; the bar starts at 10%                                                               |
| Level is self-described                   | "Where are you starting from? A rough idea is fine."                                          |
| Small daily goals with names              | 10, 20, 30 or 45 minutes a day: Light, Steady, Serious, All in                                |
| The button names the commitment           | "I'm committed" on the daily minutes                                                          |
| A calm way out                            | "Later. Show me every plan and price"                                                         |
| Button in thumb reach                     | The main button is fixed to the bottom of the screen on phones                                |
| Answers are used                          | Every answer feeds the plan recommendation, and the reasons are listed on the last screen     |
| First win, then the account               | The plan is the first win. A first practice question before sign-up is the next step to build |

Not built yet: a first practice question before the account, the reminder step, and sound or haptics.
