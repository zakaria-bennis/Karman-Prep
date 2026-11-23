# Portal copy rules

How the words in the student portal are written: start pages, buttons, labels, empty states and
errors. Read this before adding or changing any text in `src/app/dashboard/student/_portal/`,
`src/components/learn/exam/` or `src/app/learn/`.

## The founder's rules (these win over every guide below)

1. **Headings are one or two words.** "Rules", "Checklist", "Today", "Predicted score".
2. **No subtitle unless the student needs it to act.** If a line under a heading only restates the
   heading, or describes the feature, delete it.
3. **Say how much, not what sort of thing it is.** "8 questions", "3 misses end the run", not
   "A short set across your skills".
4. **Readable at a glance.** Charts and labels make sense without a sentence beside them.
5. **No line or choice that says nothing.** "Pick the plan that fits." goes. So does "Everything is
   ready for you."
6. **American spelling.** "practice", never "practise".
7. **No em dashes or en dashes in UI text.** Use a period, a comma or a colon.
8. **Never call a practice test "official".** "Official" is only for the real SAT and the College
   Board score report.
9. **"Correct" and "missed", never "incorrect".**

## From the industry guides

1. **Cut every word that does not help the student act.** Shorter is better; give just enough to
   decide. _Microsoft Writing Style Guide, "Top 10 tips": "Bigger ideas, fewer words" and "Be brief"._
2. **Lead with what matters.** Put the key word first so a scanning eye catches it ("3 misses end the
   run", not "If you miss three, the run ends"). _Microsoft, "Get to the point fast"; Nielsen Norman
   Group, microcontent._
3. **Write for scanning.** People scan before they read; one idea per line, short lines, lists over
   paragraphs. _Nielsen Norman Group, "Concise, scannable and objective" (concise text tested 58% more
   usable; all three together 124%)._
4. **Facts, not promotion.** No hype, boasting or claims the screen cannot back up. _Nielsen Norman
   Group, same study ("objective" text 27% more usable)._
5. **Numerals for numbers.** "3 misses", "10 questions", "2 full-length exams", except where a number
   is part of a name (Daily 10). _GOV.UK style guide, "Numbers"; Material Design writing guidance._
6. **Buttons start with a verb and say what happens.** "Start Daily 10", "Add hours", "Use a Streak
   saver". Not "OK", not "Continue" when something more exact fits. _Apple Human Interface
   Guidelines, Writing; Material Design, buttons._
7. **Name the result on destructive buttons.** "Delete my account", "Leave the group", with a plain
   "Keep" or "Stay" beside it. _Apple HIG, alerts and writing._
8. **Empty states say what is missing, then the one step that fills it, if there is one.** "No
   bookmarks yet. Bookmark a question to keep it here." No praise for work that never existed.
   _Apple HIG, Writing; Material Design, empty states._
9. **Errors say what happened and what to do, without blame or jargon.** "That didn't go through. No
   coins were spent. Try again." Never a database or stack message. _Apple HIG, Writing; GOV.UK,
   error messages._
10. **Write like you talk to the student.** Plain words, contractions ("didn't", "you're"), second
    person. _Microsoft, "Write like you speak" and "Project friendliness"; GOV.UK, plain English._
11. **Sentence case everywhere.** Capitalize only the first word and names (Daily 10, Mistake Log,
    Exam pass). _Microsoft, "When in doubt, don't capitalize"; Material Design._
12. **No end period on headings, buttons, labels or single-phrase notes.** Use a period only when
    there are full sentences. _Microsoft, "Use end punctuation in the right places"; Apple HIG._
13. **One term for one thing.** A skill set is always a skill set; coins are never tokens. _Apple
    HIG, Writing; Material Design, "Be consistent"._
14. **Don't explain what the screen already shows.** If the icon, the number or the layout says it,
    the words do not repeat it. _Nielsen Norman Group, microcontent; Material Design, "Be concise"._

## Quick check before shipping a line

- Would the student miss it if it were gone? If not, delete it.
- Can it be a number? Make it one.
- Is the heading more than two words? Shorten it.
- Does it promise or claim anything the product does not do today? Cut it.
