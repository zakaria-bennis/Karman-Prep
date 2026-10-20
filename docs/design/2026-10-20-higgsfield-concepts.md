# Higgsfield concepts, for discussion

Status: ideas only. Nothing here has been generated and no credits have been
spent (110 credits, Plus plan, on 2026-10-20). This document replaces the shot
list in `2026-10-20-reform-brief.md` Part 6. The binding rules are 41 to 48 in
`docs/design-rules.md`.

## 1. The idea: one season, wherever your student is

Karman is a digital ecosystem: live classes, practice, the Daily Question, the
word game and the 1:1 reviews all live on the phone and laptop a student
already carries. The pictures should prove that by following real-looking
students through a season, in the places they already are, with each Karman
tool on screen at the moment it would really be used.

**The cast.** Four fictional students of 16 and 17, two parents and two tutors
are kept consistent across the whole site with Soul Cast, so a visitor meets
the same people on the homepage, the program page and the private page. They
have no names on the site. Each student lives a different week:

| Student                | Their week                               | Tools they show                        |
| ---------------------- | ---------------------------------------- | -------------------------------------- |
| The athlete            | Practice after school, games on weekends | Daily Question, word game, cohort chat |
| The commuter           | Bus or train to school, part-time job    | Daily 10, question bank                |
| The night-desk student | Homework, then the 7 p.m. live class     | Live classes, full-length tests        |
| The private student    | Busy schedule, needs 1:1 time            | Weekly 1:1 sessions on Zoom            |

The parents show up where parents are: the school pickup line, a break at
work, the kitchen at night. The tutors appear only inside video calls.

**Seasons.** The film's light and wardrobe follow the open cohort, with coats
and early dark for the March test, spring light for May, and early summer for
June. The homepage hero can change with the calendar.

## 2. How screens stay readable and true

Image and video models cannot be trusted to write UI text: letters warp and
numbers drift. So no screen is left to the model.

1. **We build the screen.** Every screen is a real Karman screen rendered from
   code (the homepage mock already has the practice page, Daily Question, word
   game, live class and parent update). You read and approve each one before
   anything is generated.
2. **Stills: the screen is placed after.** The model generates the scene with
   the phone or laptop showing a plain bright screen. We then fit our approved
   screen onto it, matching its angle, light and reflections. Every word is
   exactly what you approved.
3. **Film: cut to the screen, the way Apple ads do.** A person shot (the
   athlete on the bench, thumb moving) cuts to a clean, full-frame animation of
   the real screen built in code, then back to the person. The person's
   screen in the generated shot is turned slightly away or out of focus only
   for those few frames, and the readable moment is the insert. This is
   honest, sharp at any size, and costs no credits.
4. **Screen content rules.** Practice questions are Karman's own originals,
   tool names are the real ones, and a screen in a generated person's hands
   never shows a name or a score result (rule 47).

## 3. Shots

Prompts below are drafts to edit together. Every still uses the look notes in
section 5.

**H. Homepage hero film: "Where the SAT fits."** 12 to 15 seconds, six cuts,
no voice, using Cinema Studio Video 3.0 multi-shot. It loops behind the
headline.

1. 6:50 a.m. The commuter on a bus, early light, AirPods Pro in, scrolling the
   Daily 10 on a phone. Cuts to an insert of the Daily 10 screen.
2. Lunch. Two friends at a cafeteria table, one solving the Daily Question,
   the other leaning in to see it. A small smile when it is right.
3. 4:30 p.m. The athlete on a team bench during a water break, towel on
   shoulder, AirPods in, playing the word game. Teammates blurred behind.
4. 7:00 p.m. The night-desk student in the live class: laptop open to a video
   call with five other students and a tutor, typing an answer into the chat,
   focused.
5. Saturday. A full-length practice test on a laptop at a library table, the
   timer visible, headphones on.
6. Test morning. Two students walk through school doors into daylight, phones
   away, quiet confidence.

> Draft for cut 3. A 17-year-old soccer player sitting on a team bench at the
> edge of a floodlit training pitch in early spring, towel over one shoulder,
> AirPods Pro in, holding a phone low in both hands and concentrating on it,
> teammates stretching in soft focus behind. Late afternoon light, natural
> skin, true-to-life colour, documentary sports photography, 50mm, shallow
> depth of field. No logos on kit or phone.

**P. Program page: the cohort.** A 6-tile video-call grid of students on a
live class, each in their own place (a bedroom desk, a kitchen counter, a
library carrel), with the tutor sharing a real Karman lesson screen. The grid
frame and shared screen are our own code, and only the faces in the tiles are
generated, so the call looks like Karman's class rather than a Zoom
screenshot.

**R. Private page: the 1:1 review.** A split screen. On the left, a tutor at a
clean home setup with a good microphone and a second monitor. On the right,
the private student at home, nodding and writing the fix down. Between them
sits the real shared screen: the missed question from their last practice
test, with the tutor's annotation drawn in code. It shows exactly how Karman
tutoring works, over Zoom.

> Draft for the student side. A 16-year-old student at a bedroom desk in the
> evening, on a video call, looking at the laptop camera and nodding while
> listening, AirPods Max on, warm lamp light, a few textbooks and a water
> bottle on the desk, natural skin, documentary, 35mm. No logos.

**K. Parents.** A parent in the school pickup line, engine off, reading the
weekly parent update on their phone with a small nod. A second parent on a
break at work, standing by a window. Each still takes our parent update screen
placed onto the phone.

**C. Cohort chat.** The athlete again, late evening, asking a question in the
cohort chat on the bus home, and the answer arriving. The insert shows the
real chat screen with fictional first names only, never a score.

**T. Test morning (close of the homepage).** Two to four cuts: an alarm
silenced on a phone, a parent's car at a curb in grey morning light, a
student taking AirPods out and walking in. The last cut is the same student
walking out into daylight and texting "Done." to a parent, with that message
as the insert.

**O. The object (optional brand piece).** A 3D Folded Line K, made with Meshy
or Hunyuan 3D, that the loader's mesh resolves into. It is kept small, as the
brand's signature rather than a page section.

## 4. Portal welcome moments, rethought

These are built in code from the person's own data, not generated, so they are
personal and useful and cost no credits. Each one lasts about 3 seconds, plays
once, and ends on the first real action.

- **Student.** The test date settles into place with the days left, the first
  live class time appears under it, and today's Daily Question card slides up,
  ready to answer. The first action is answering it.
- **Parent.** "Here is what you will see every week": the first weekly update
  assembles from the student's real schedule, with the date it first arrives.
  The first action is choosing how to receive it (email or text).
- **Tutor.** Today's sessions line up, each with the student's test date. The
  next student's most recent missed questions are already open. The first
  action is opening that session.
- **Optional, real footage.** A 10-second recorded hello from the student's
  actual tutor, filmed with a phone. Real people, so nothing is generated.

## 5. Look, without a fixed palette

Colour is not limited to the site palette (rule 48). Every picture should
share one grade:

- true-to-life colour and natural skin, with the feel of a documentary sports
  or tech ad
- clean natural light and real practical lights, with soft contrast
- no teal-and-orange grade, no heavy haze, no lens flares and no neon

The look should feel like one shoot by one crew.

## 6. Cost and order

- **Free in the web app's unlimited mode:** Soul 2.0, Nano Banana Pro,
  GPT Image 2, Seedream 4.5 and Seedance 2.0. Use these for casting and
  drafting stills, and for most short clips.
- **Paid in credits:** Cinema Studio Video 3.0 (the hero film), Kling, and
  the 3D models. Confirm each price on the Generate button.
- **Order:**
  1. Cast the four students and two parents, and get your approval of the
     faces.
  2. You approve every screen we will place or insert.
  3. Draft stills for one shot per page.
  4. You approve the stills.
  5. Make the hero film last, since it costs the most.

## 7. What to decide

1. The four student types and two parents: keep, swap or add (a student who
   plays music, works a job, or another sport).
2. Whether the hero film is the six-cut day (H), or one student's season told
   across weeks.
3. Whether the 3D K object (O) stays.
