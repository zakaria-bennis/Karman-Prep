# Product screens for the site and the clips

Real screens from the portals prototype (`prototypes/portals`, the gallery on
http://127.0.0.1:5174), each in its long-time-user state, captured by
`../scripts/capture-screens.mjs` on 2026-11-01. The data is the prototype's demo
cast (Ava, Maya, David, Zakaria). The prototype's clock is fixed at Saturday
31 October 2026, 9:41 am, so every date below is relative to that day.

## Naming and sizes

`<portal>-<screen>-<state>-<device>-<mode>.png`, with a `.webp` copy (quality 90) beside each.

- `phone`: 440 x 956 points at 3x, so 1320 x 2868 px, the iPhone 17 Pro Max screen.
- `desktop`: 1440 x 900 at 2x, so 2880 x 1800 px.
- `light` and `dark`: the prototype's two modes (light is bone, never pure white).
- `<screen>-scroll-phone-<mode>`: the same phone screen with the window made tall
  enough to show everything in its scroll area at once (1320 px wide, taller). The
  clips scroll through it. The bottom bar sits at the very bottom of these.
- `geometry.json`: for every file, where the scroll area starts and ends, where the
  bottom bar sits and how far the screen scrolls. The clips read it.

## What the capture script changed on the page

Nothing in the prototype's files changed. The script only adds a stylesheet in the page:

1. The gallery's bare route (`#/screen/<portal>/<id>?bare=1`) shows the screen alone.
2. Student and parent phone screens get a 54 pt top inset in the screen's own
   colour, so the Dynamic Island sits above the top bar instead of on it. This is
   the space iOS keeps for the status bar. The status bar itself is not drawn. The
   tutor portal draws its own 9:41 status bar, so it gets no inset.
3. Every phone screen gets iOS's 34 pt home-indicator inset at the bottom.
   The prototype asks for it (`env(safe-area-inset-bottom)`) but Chromium reports 0.
4. **Panels that carry a score result or a predicted score are hidden (rule 47).**
   The screen closes up around them. Listed per screen below. If you want the real
   screen with the panel, run the script with the `hide` line removed.

## The screens

"Numbers to check" lists every figure a visitor could read as a fact or a claim.
They are the prototype's demo data, not real students.

| Files (each in phone/desktop, light/dark) | What it shows | Hidden | Numbers to check |
| --- | --- | --- | --- |
| `student-home-cohort-*`, `student-home-cohort-scroll-phone-*` | Home, the dashboard, for a March cohort student. Top: "Full-length test 2 is due today" with its button. Your Daily 10 (8 of 10 today, done at 7:52 am, 80 tokens). Due items: Linear functions practice, due Nov 2; Live class with David, Mon Nov 2, 7:00 to 8:30 pm ET. Today's set (pace, slowest question, changed answers). Scrolled: tokens and streak, Skills by level, Personal bests. | "Karman predicted score if you tested today" panel (1,220 and its ladder); the cohort panel ("Cohort average 1,210, your rank 3rd of 5"). | Daily 10 "8 of 10"; 77 s a question; 265 tokens; 5 days in a row; skill counts 0, 9, 12, 13, 5; 87% skills practised. |
| `student-classes-cohort-*`, `-scroll-phone-*` | Classes for the cohort: next live class with David and the practice due before it, This week as a calendar (live classes Tue and Thu, Test 2 today, pacing workshop Sun), Homework with due dates, the guarantee panel. | "Full-length tests" panel (it lists each test's score). | Guarantee panel: "Live classes attended 6 of 7 held, 15 of 18 needed", "1 of 5 taken", "Assigned practice done 92%, 90% needed". The guarantee terms should match offer.ts. **Prototype bug, visible: class times read "7 pm to 8 pm:30" (should be 8:30 pm).** |
| `student-classes-private-*`, `-scroll-phone-*` | Sessions for a Private student: "No session booked. Zakaria has times next week", Book your next session, hours used, This week, sessions so far, guarantee. | "Full-length tests" panel. | Hours used 35%, 7 of 20; "Sessions attended 7 of 7". |
| `student-booking-open-*` | The booking sheet open: Book a session with Zakaria, one hour on Zoom, cancel up to 24 hours before, Mon 2 to Fri 6, the day's times (5:00 pm taken). On desktop it is a side sheet over the week calendar. | As above. | "Cancel up to 24 hours before" is a policy; check it. |
| `student-booking-slot-*` | The same sheet with 6:00 pm chosen; the button reads "Book Nov 2, 6:00 pm". | As above. | None. |
| `student-practice-cohort-*`, `-scroll-phone-*` | Practice by skill: Endless mode, Time trials, then every skill of the test with its level, filter chips (All 39, Reading and Writing 20, Math 19, Needs work, Not started). | None. | Skill counts in the chips. |
| `student-progress-cohort-*`, `-scroll-phone-*` | Progress: Skills by level, the full skill list by domain, Personal bests, Practice days. | The predicted score panel at the top (1,220, the score ladder, "Days to the SAT 126"). | Skill counts; personal bests (9 of 10, 5 days). |
| `student-rewards-cohort-*`, `-scroll-phone-*` | Rewards: tokens with next mystery box, the fox wearing its prize, companions (fox, owl), streak calendar. | None. | 265 tokens, +80 today, 88%, 265 of 300. |
| `student-testreview-cohort-*`, `-scroll-phone-*` | Full-length test 1 review: every mistake, by skill, with module and question, and "Your 9 misses come back in Your Daily 10 after 2, 7 and 21 days". | The score panel (1,220, section scores, ladder). The page now opens on the mistakes list. | 9 mistakes; "after 2, 7 and 21 days" is a product claim. |
| `student-trials-cohort-*` | Time trials: the same questions with the real test's clock, pace per section, Start a time trial. | None. | 71 s a Reading and Writing question, 95 s a Math question (the real SAT pace; check). |
| `daily10-boxready-longtime-*` | Daily 10 end, the box moment: "Enough for a mystery box", the fox, Mystery box ready, Open or Save for later. | None. | 325 tokens. |
| `daily10-box-longtime-*` | "Your mystery box", the box, Tap to open. | None. | 25 tokens. |
| `daily10-burst-longtime-*` | The box breaking open (about 0.45 s after the tap). A moment caught mid-animation. | None. | None. |
| `daily10-found-longtime-*` | "You found headphones", the burst settling. | None. | None. |
| `daily10-prize-longtime-*` | The prize on the fox: Preview on your fox, Headphones, Wear it or Keep for later. | None. | None. |
| `daily10-results-longtime-*` | The calm results screen: Your Daily 10 is done, the 7 of 10 ring, the ten questions as a path, Your next step, Review the 3 you missed, Skills that moved. | Nothing hidden. | **"7 of 10", "Reading and Writing 5 of 5, Math 2 of 5".** A Daily 10 result, not an SAT score, but it is a result in a student's hands; decide whether rule 47 covers it. The tour clip avoids it. |
| `parent-home-cohort-*`, `-scroll-phone-*` | Parent home (Progress): "Ava answered 210 questions this week, 5 skills up", questions this week, skills up, mastered, the skill bars, skills that moved, This week by day (6 of 6 days so far), Coming up, Read the latest update. | The "Karman predicted score" figure (1,220, +40 since the first test). The grid closes to three cells. | 210, 579 since Oct 12, 5 skills up, 1 down, 0 of 39 mastered; questions per day 33 to 45. |
| `parent-update-cohort-*`, `-scroll-phone-*` | The weekly update, week of Oct 19 to 25: skills that moved, practice (199 questions, 6 of 7 days, Your Daily 10 6 of 7), test score ("No full-length test this week"), live classes with the missed-class flag, what's next. | None. | 199; 6 of 7; "Missed Thursday, Oct 22". |
| `parent-schedule-cohort-*`, `-scroll-phone-*` | Parent schedule: Coming up (test 2 today, workshop, weekly update, live classes, test 3, the SAT), the line "1:1 sessions is in Private 10, $1,495", the 1:1 review session with Zakaria, This week. | None. | SAT Saturday, March 6, 2027, in 126 days (matches offer.ts); $1,495 for Private 10 (matches offer.ts). |
| `tutor-class-cohort-*`, `-scroll-phone-*` | Tutor view of the December cohort's next class: the 90-minute plan for Monday Nov 2 built from what the group missed, who missed what on test 1, Join Zoom. | The Students list (it shows each student's predicted score). | "5 of 5 missed it on test 1"; 5 students, class 9 of 18 but "8 of 18 classes held"; SAT Dec 5; Zoom opens 6:55 pm; "5 seats, 1 scholarship". |

Dropped: none of the captures was broken. Earlier test runs that caught the end
screen mid-count (confetti over "314" tokens) were not kept.

## Known limits

- The long `-scroll-` captures are taken in a tall window, so the screen's faint
  contour background scrolls with the content in the clips, where on a phone it
  would stay still. It is very faint.
- The Daily 10 desktop screens are the real desktop layout, which leaves the
  canvas mostly empty around the box and fox.
- The tutor portal's bottom bar does not ask for the home-indicator inset, so its
  labels sit close to the screen's rounded corners.
- The week calendar in Classes, Sessions and the parent Schedule prints half-hour
  ends as "8 pm:30" and "12 pm:30" (a time-format bug in the prototype). It shows
  in those captures and in the calendar and tour clips. Fix it in the prototype,
  then run the capture script again.
