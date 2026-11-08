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

**The cast.** Six fictional students of 16 and 17, two parents and two tutors
are kept consistent across the whole site with Soul Cast, so a visitor meets
the same people on the homepage, the program page and the private page. The
families Karman serves are well off, and the cast's lives reflect that. Each
student has a first name, shown as a caption on the film and on its still
fallback, and never next to a score, a quote or a result (rule 47).

| Student             | Their day                                                 | Tools they show        |
| ------------------- | --------------------------------------------------------- | ---------------------- |
| The commuter        | School bus at 6:50 a.m.                                   | Daily 10               |
| The musician        | Cello at lunch rehearsal, a free moment in the music wing | Daily Question         |
| The athlete         | Soccer practice, on the bench at the water break          | Word game, cohort chat |
| The intern          | After-school internship at an architecture studio         | Question bank          |
| The night-desk one  | Homework, then the live class at dusk                     | Live classes on Zoom   |
| The private student | A packed schedule, a weekly 1:1                           | 1:1 sessions on Zoom   |

The parents show up where parents are: the school pickup line, and a lunch
break. The tutors appear only inside Zoom calls.

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
   never shows a score result (rule 47).

## 3. Shots

Prompts below are drafts to edit together. Every still uses the look notes in
section 5.

**H. Homepage hero film: "Where the SAT fits."** One weekday across six
students, 12 to 15 seconds, six cuts, muted, using Cinema Studio Video 3.0
multi-shot. It loops behind the headline. Each cut carries a small caption
with the student's first name, the time and the tool, for example "Ava, 6:50
a.m., Daily 10".

1. 6:50 a.m. The commuter on the school bus, window seat, early light, AirPods
   Pro in, working through the Daily 10 on a phone. Cuts to the Daily 10
   screen.
2. 12:40 p.m. The musician in the music wing after lunch rehearsal, cello case
   beside her, answering the Daily Question on her phone. A small smile when it
   is right.
3. 4:30 p.m. The athlete on the team bench at a water break, towel on shoulder,
   AirPods Pro in, playing the word game. Teammates sit further along the
   bench, talking to each other.
4. 5:45 p.m. The intern on a break at the architecture studio, laptop open on a
   drafting table among foam models, doing a question bank set.
5. 8:00 p.m., dusk. The night-desk student in the live class: laptop open to
   the Zoom gallery with five other students and the tutor, typing an answer
   into the chat, focused. Blue sky through the window, the desk lamp on.
6. 9:00 p.m. The private student in a 1:1 on Zoom, AirPods Max on, nodding at
   the tutor's explanation on the shared screen.

> Draft for cut 3. A 17-year-old soccer player sitting on a team bench at the
> edge of a floodlit training pitch in early spring, towel over one shoulder,
> AirPods Pro in, holding a phone low in both hands and concentrating on it.
> Further along the bench, two teammates sit and talk to each other, in soft
> focus. Late afternoon light, natural skin, true-to-life colour, documentary
> sports photography, 50mm, shallow depth of field. No logos on kit or phone.

**P. Program page: the cohort.** The live class as it really is: a Zoom
gallery of six students, each in their own place (a bedroom desk, a kitchen
counter, a library carrel), with the tutor sharing a real Karman lesson
screen. We rebuild Zoom's gallery view faithfully in code and place the
generated faces in its tiles, so every label and button is crisp. Zoom's own
logo is used only as Zoom's brand guidelines allow.

**R. Private page: the 1:1 review.** A split screen. On the left, a tutor at a
clean home setup, a microphone on a boom arm (or a desk mic angled at their
face) and a second monitor. On the right,
the private student at home, nodding and typing the fix into their notes.
Between them sits the shared screen: a hard Shakespeare question they missed,
with the tutor's annotation drawn in code. It shows exactly how Karman
tutoring works, over Zoom.

Every Shakespeare question now in the bank was imported from College Board
exam PDFs, so none can appear in an ad. Shakespeare's text is public domain,
so this is an original Karman question on it, for you to check:

> The following text is from William Shakespeare's play _Measure for Measure_,
> first performed in 1604. Isabella is pleading with Angelo, who has been given
> temporary power to govern Vienna and has sentenced her brother to death.
>
> Could great men thunder / As Jove himself does, Jove would ne'er be quiet, /
> For every pelting, petty officer / Would use his heaven for thunder, /
> Nothing but thunder! Merciful heaven, / Thou rather with thy sharp and
> sulphurous bolt / Splits the unwedgeable and gnarled oak / Than the soft
> myrtle: but man, proud man, / Drest in a little brief authority, / Most
> ignorant of what he's most assured, / His glassy essence, like an angry ape,
> / Plays such fantastic tricks before high heaven / As make the angels weep.
>
> Which choice best states the main idea of the text?
>
> A) Isabella argues that heaven punishes powerful people more harshly than it
> punishes ordinary people.
> B) Isabella suggests that people given small, temporary power often use it
> more harshly and foolishly than heaven uses its far greater power.
> C) Isabella warns Angelo that the people of Vienna will rebel if he continues
> to issue harsh sentences.
> D) Isabella claims that Angelo's authority is illegitimate because it was
> granted to him only for a short time.
>
> Correct answer: B. The student picked A, because heaven striking the oak
> rather than the myrtle reads like harsher punishment for the strong. The
> tutor's note: the oak and myrtle show heaven's restraint; the contrast is
> with "man, proud man" and his "little brief authority".

> Draft for the student side. A 16-year-old student at a bedroom desk in the
> evening, on a video call, looking at the laptop camera and nodding while
> listening, AirPods Max on, warm lamp light, a few textbooks and a water
> bottle on the desk, natural skin, documentary, 35mm. No logos.

**K. Parents.** A parent in the school pickup line, engine off, reading the
weekly parent update on their phone with a small nod. A second parent on a
lunch break, at a café table near the office. Each still takes our parent update screen
placed onto the phone.

**C. Cohort chat.** The athlete again, late evening, asking a question in the
cohort chat on the bus home, and the answer arriving. The insert shows the
real chat screen with fictional first names only, never a score.

**T. Test morning (close of the homepage).** Two to four cuts: an alarm
silenced on a phone, a parent's car at a curb in grey morning light, a
student walking in with a friend, no headphones. The last cut is the same
student walking out into daylight and texting a parent, with the messages as
the insert: "I'm outside." and then "That was the easiest test of my life."

**O. The object.** A 3D version of the logo that the loader's mesh resolves
into. On hold until the logo itself is settled: new logo directions, each
shown as a 3D object, are being mocked up in
`.impeccable/mocks/decision/logo3d/`.

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
- **Welcome lines.** Above the student dashboard, one short greeting at a time,
  chosen by time of day, day of the week and the weeks before the test: 200
  lines in `docs/design/portal-welcomes.md`.

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
  1. Cast the six students and two parents, and get your approval of the
     faces.
  2. You approve every screen we will place or insert.
  3. Draft stills for one shot per page.
  4. You approve the stills.
  5. Make the hero film last, since it costs the most.

## 7. What to decide

1. The six students' first names, or leave them to us to propose.
2. The Measure for Measure question above: approve it, or ask for another
   play.
3. The logo direction, once the 3D mockups are ready.
