# Student portal: founder decisions, 2026-11-07

From a question-and-answer session with Zakaria. These replace earlier portal notes where they
disagree. Nothing visual here is final until he approves the mockup for it.

## Screens and tabs

- **Five tabs:** Today, Homework, Library, Calendar, Progress. A tab only shows when the student's
  plan uses it.
  - Calendar shows for anyone who can book something: 1:1s, workshops or office hours.
  - The Calendar tab has an icon with a short label.
- **Each tab has one purpose, so the student knows why they're opening it.**
  - **Today:** a quick check-in on what to get done today.
  - **Library:** where the long 30 to 60 minute study sessions happen.
  - **Progress:** how the student is doing, and where they stand.
- **Rewards** (tokens, mystery boxes, the fox) stay in the product but live at the bottom of
  Progress. The main screen stays quiet.
- **Game level is light on the main screen.** Rewards exist, but aren't loud.

## Today

- **Greeting:**
  - Hundreds of rotating lines in place of "Welcome back", like Claude's app.
  - The voice mixes by time of day: calm late at night, warm in the evening, playful on weekends.
- **SAT countdown:** the date shows only as milestone lines in the greeting, at 100, 60, 30, 14 and
  7 days. In the final two weeks, Today shifts to test-day prep.
- **Order, top to bottom:**
  1. Greeting.
  2. The one main action. Your Daily 10 leads until it's done, then the next assignment does.
  3. Resume where you left off.
  4. A tutor note.
  5. Homework due.
  6. The next session.
- **No score or skills on Today.** They live on Progress and in the Library.

## Library (Khan Academy as the model)

- **Courses:** two Khan-style courses, SAT Math and SAT Reading and Writing.
  - Each course is split into Domains (the 8 College Board domains). Each skill has levels.
  - Each course page opens on Up next.
  - The course page follows Khan's side-list layout, restyled as Karman (see below).
- **Lessons:** each skill has a short video and one try-it question, before practice.
- **Tests:**
  - Domain tests, and possibly course challenges (names and scope still open).
  - Mastery check-ins: mixed reviews that bring old skills back. Open: whether the top level needs a check-in (the old rule) or only a run of 5 in practice.
  - Full-length tests, in their own Library section.
- **Practice modes:**
  - Time trials, shorter than a full-length test.
  - Endless mode: untimed and adaptive. The algorithm is still to be designed.
  - The Mistake log lives inside endless mode, not as its own mode.
- **Challenge question:**
  - Two hard questions a day, one Math and one Reading and Writing, the same for every student.
  - After answering, students see how others did and how to solve it, like Wordle.
  - It appears as a dismissible banner when the Library opens.

### Khan's function, Karman's look (2026-11-08)

The Library works like Khan Academy, but every visible part is redrawn in Karman's colors,
shapes and type. Nothing should read as a copy of Khan.

- **Names:**
  - The tab stays **Library**.
  - A course's sections are **Domains**, the College Board's word. Not Units.
  - Skill level names are still open. The founder wants some fun, and the top level must not be
    called "Mastered". He asked for ten options.
  - Names for Khan's "Unit test" and "Course challenge" are still open. He asked what each one is
    first.
- **Color:**
  - Skill levels and the main button take one hue from the day's painting. Four shades are built
    from it, and contrast is checked automatically. The painting changes daily, so the colors do too.
  - Built in the prototype (2026-11-08). Each Karman painting gives its hue, so the colors also
    change with the time of day. The main button keeps white text and is darkened until
    the text passes 4.5 to 1.
- **Shape:**
  - Cards and boxes stay square, with 4px corners.
  - Skill marks are squares, colored from the painting (picked 2026-11-08 over four paint-dab designs).
  - Progress is shown as a ring everywhere, not a bar (picked 2026-11-08).
- **Course page:**
  - It uses Khan's side list, with Domains on the left and the open Domain on the right.
  - Each course leads with a percent, shown as a ring with the number inside.
- **Up next:**
  - It picks the skill with the biggest score gain, with no reason line.
  - Work a tutor assigns lives in Homework, even when it is a single skill.
- **Lessons:**
  - The video plays inside the tinted box, with the painting behind it, and it has a full-screen
    button.
- **Skill practice:**
  - A set is 10 questions. It is adaptive within the set.
  - Leveling up needs a run of right answers in a row. The run grows with the level: 3 to reach the
    second level, 4 for the third, 5 for the top.
  - A hint is always available, but a question answered with a hint doesn't count toward the run.
  - If the set ends without the run, that's fine. The main button is to rewatch the skill video,
    and Try again is a text link beside it.
- **Level-ups:** the skill mark paints in, a small banner shows, and the fox reacts, all sized to the
  win. A single level is small, and the top level is bigger.
- **Tokens:** they show only at the end of a set, as a quiet "+30 tokens" on the result screen.
- **Khan extras:**
  - Keep mastery check-ins (mixed review that brings old skills back) and skill decay (a skill
    drops a level after weeks without practice).
  - No badges.
  - Whether to have a course challenge is decided after the explanation.
- **Type:**
  - Sans (Hanken Grotesk) for ordinary text, and serif (Young Serif) for bigger moments.
  - Young Serif numbers are never used again, because the founder finds them ugly. All numbers use
    Hanken Grotesk with lining, even-width figures (picked 2026-11-08).
- **Icons:** clean line icons.
- **Question screens:** use the existing quiz engine from the Daily 10 demo. Its question layout
  and answer buttons stay. The top menu bar, the background and the margins get reworked later.

## Progress

- **Everything is visual and alive, not text.** That covers:
  - Skills by level: Mastered, Proficient, and the levels below.
  - Score and its history, and section scores.
  - Time and effort, and what moved this week.
  - Personal bests.
- **Rewards and streaks** sit at the bottom, with current and longest streak side by side.
- **Streaks** allow one planned rest day a week.

## Homework

- **Layout:** a Canvas-style list, grouped by Past due, Tonight, Tomorrow, This week, Later and Done.
- **Results:** done items show the result and open a review.
- **Notes:**
  - AI-written one-line notes appear signed by David, with no review.
  - David must agree to this in writing first.
- **Late work:** gentle nudges only. One reminder, never repeated alerts.
- **Time estimates:**
  - Counted from active time only. Pauses over 2 minutes don't count, and rushed sets are ignored.
  - Blended with all students' pace until the student has enough history.

## Calendar

- Booked sessions, with move or cancel.
- Booking a 1:1, or a spot in a workshop or office hours.
- Recordings of past sessions.

## Warmth and feel

- **Living backdrop:**
  - It flows, melts under touches and clicks, and sits behind the content.
  - It changes with time of day and season, and is never the same twice.
  - Ink in water was tried and rejected as far too distracting. Paper and grain was dropped:
    the founder prefers paintings.
  - A new picture every day, like Momentum: a library of beautiful images, one per day,
    full screen behind Today.
  - The content sits in a tinted, squared-off box laid over the picture. No left-to-right fade.
    The box is about 760 pixels wide on desktop, left of center, in two columns, so more of the
    painting shows. On desktop it runs from under the greeting to near the bottom of the screen,
    so the height is used too. The same painting and the same tinted box carry across every tab.
  - Opening: the picture is visibly painted stroke by stroke in about 3.8 seconds (founder approved,
    2026-11-08), with the brush, knife or tapping tip shown moving. Bob Ross's order: one
    coat of color first (never a black canvas), criss-cross sky, shapes back to front, texture,
    then highlights. The greeting starts typing with the first stroke and finishes with the last.
    The box slides down from the top near the end.
  - Once painted, the picture stays alive: birds, glinting water, rings on the lake, chimney smoke,
    a falling waterfall, rolling surf, drifting leaves, butterflies, mist, and at night twinkling
    stars and fireflies. Each scene has its own. Wildlife follows the hour: birds, a circling hawk,
    geese, gulls, ducks, deer, swallows, a heron, dragonflies and sailboats by day, dawn and dusk; an
    owl that perches then flies off, bats, a fox, the moon's path on the water, aurora and shooting
    stars at night.
  - Karman's own drawings need more subjects than mountains: a wave, bamboo, a moonlit lake, a
    cherry branch and a snowy forest were added for review.
  - **Source: Karman's own paintings** (founder, 2026-11-08). Museum art and Momentum-style photos
    were compared and dropped. Museum works pulled the colors to brown and gold, put their subject
    under the box, and can't come alive.
  - Nothing moves behind text the student is reading: falling leaves, snow and weather stay out
    of the greeting and the content box.
- **Real local weather:** inferred from the visitor's rough area (Cloudflare knows the city from
  the connection), with no location prompt. To be disclosed in the privacy policy.
- **Also wanted:**
  - Moments of craft, and typography as art (three type mockups requested). Headlines stay
    modest: a greeting fits on one or two lines, never one word per line.
  - Seasons, optional sound, and the fox reacting to what happens.
  - Tactile buttons, handwritten tutor notes, and ambient study sound.
  - An evening wind-down after 10 PM, personal milestones, and unlockable study rooms.
  - Live presence ("212 students practicing now") and celebrations sized to the win.
  - An accent color chosen by the student.

## Header

- The fox and streak sit in a top-right header, like a profile icon.
- Main buttons carry a chevron.

## Account menu

- SAT date and test (SAT or PSAT).
- Invite a parent.
- Sound and motion settings.
- Accent color.

## Reminders

- Session reminders by text.
- One evening reminder when homework due tonight is still open.
- A weekly recap email.

## Parents

- Parents see a bigger-picture, less detailed version of the student's view. They never see the
  specific questions a student got wrong.
- Nothing in the student's settings spells this out.
- The parent portal is designed separately.
