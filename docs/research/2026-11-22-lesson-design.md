# Lesson design: rules from learning science for Karman's lessons, strategy quizzes and videos

Research note, 2026-11-22, for the Lessons stream. It turns learning research into rules for the 72 skill lessons, the strategy quiz that ends each one, and the voiced video for each skill. The rules feed `lessonFor`, `strategyQuizFor` and `videoFor` in `src/lib/lessons/index.ts`. No code or content was changed while writing it.

Each principle gives the finding, the sources and the rules. Evidence labels: **strong** means many studies or meta-analyses agree; **moderate** means good studies with limits; **mixed** means studies disagree, so follow the rule and watch our own data. The founder's earlier rules still apply on top: every wrong choice explained, choices named by their words (never by letter), nothing called official.

## In short

1. Teach by example: one fully worked example, then one the student finishes, then a fresh problem they solve alone.
2. Every step gets a short goal label and a reason. Reveal one step per tap.
3. Name two or three real traps per skill. Use the same trap names in the lesson, the quiz and the video.
4. Check, don't reread: one quick check inside the lesson, then a strategy quiz of at most five questions.
5. Feedback comes at once, right or wrong, and explains the mistake behind the chosen answer.
6. A picture appears only when it carries meaning. Labels sit on the picture. No decoration in the teaching area and no music under the voice.
7. Strong students can skip to the quiz. A miss sends them back to the exact part they need.
8. Videos run 3 to 5 minutes: teach, then three questions from easy to hard, with chapters, captions in their own band, and narration in step with each drawn stroke.
9. A lesson is the first exposure, not the last. Bring the skill back after a few days and again after one to two weeks.

## 1. Principles that matter most here

### 1.1 Worked examples, then faded steps (strong)

- **Finding.** Beginners learn a method faster and better by studying solved examples than by solving the same problems alone; in math the gain is medium-sized (g = 0.48 across studies). Moving from full examples to partly solved ones to independent problems ("fading") beats jumping straight from examples to problems.
- **Sources.** Sweller & Cooper 1985; Atkinson et al. 2000; Renkl & Atkinson 2003; Atkinson, Renkl & Merrill 2003; Barbieri et al. 2023; van Gog, Kester & Paas 2011; Catrambone 1998; Paas & van Merriënboer 1994; Rittle-Johnson & Star 2007.
- **Rules for Karman.**
  - Two worked examples: the first complete, the second with its last step (or last two) left to the student. Fade from the end backward. The quick check is then a fresh problem done alone.
  - Example first, matching problem right after. Never open a lesson with a cold problem for beginners.
  - Give every step a goal label of two to four words ("Find the rate", "Write the equation"). Labeled steps help students carry the method to new problems.
  - Vary the surface between examples (story, numbers, layout) but keep the same move, so students see what stays constant.
  - When two methods both work (algebra or graphing; predict-then-match or elimination), show them side by side once and say when each is faster.

### 1.2 Self-explanation prompts (moderate)

- **Finding.** Students who explain to themselves why a step works learn more (g = 0.55 across 64 reports). But stacking prompts on worked examples can overload beginners: a 2023 math meta-analysis found added prompts lowered the worked-example gain. Prompts that offer reasons to choose from work better than open text boxes.
- **Sources.** Chi et al. 1989; Bisra et al. 2018; Berthold, Eysink & Renkl 2009; Johnson & Mayer 2010; Barbieri et al. 2023.
- **Rules for Karman.**
  - One "Why?" prompt per worked example, at the key step only.
  - Make it a tap: two or three short reasons, one right, then one line of feedback.
  - Ask about the principle ("What lets us divide both sides by 4?"), not the arithmetic.
  - No prompts in the student's own steps, the check or the video. There the student is already working.

### 1.3 Retrieval practice: the quick check and the strategy quiz (strong)

- **Finding.** Recalling an idea strengthens it far more than rereading it. Testing beat restudying after two days and after a week, even though restudying looked better after five minutes. Multiple-choice quizzes work, especially when wrong choices are tempting and feedback follows; without feedback, students can later "remember" a wrong choice as true. Gains carry over to new questions mainly when practice asks for the same kind of thinking and explains answers.
- **Sources.** Roediger & Karpicke 2006; Dunlosky et al. 2013; Little et al. 2012; Marsh et al. 2007; Butler & Roediger 2008; Pan & Rickard 2018; Szpunar, Khan & Schacter 2013; Pashler et al. 2007.
- **Rules for Karman.**
  - One quick check after the examples. Low stakes: no score shown.
  - End with the strategy quiz (at most five). Its questions are new problems that make the student use the strategy, not recall the lesson's wording.
  - Feedback follows every answer, so no wrong choice is left standing.
  - In the video, a "pause and try it" moment comes before each solution. Quizzes inside recorded lectures cut mind wandering roughly in half (from about 40% of check-ins to about 20%).

### 1.4 Interleaving and telling look-alikes apart (strong for math, mixed for text)

- **Finding.** Mixing problem types makes students choose a method, which is the real skill on the SAT. In a randomized trial with 787 seventh graders, mostly mixed practice raised scores on a later surprise test from 38% to 61%. Mixing helps most when categories look alike; with word-heavy material it can hurt.
- **Sources.** Rohrer & Taylor 2007; Rohrer 2012; Rohrer et al. 2020; Brunmair & Richter 2019.
- **Rules for Karman.**
  - Inside a lesson, teach one skill in a block. Do not mix while the method is new.
  - In the strategy quiz, add one look-alike question that asks which move fits. Good pairs in our 72: the three Transitions skills; Subject-verb agreement and Pronoun agreement; Colons and dashes and Essential and extra details; Evidence from a text and Evidence from research; Percentages and Ratios and proportions; Circles and Circle equations; Solving linear equations and Number of solutions.
  - Leave heavy mixing to later practice (Daily 10, Endless), across skills the student has already studied.
  - The lesson's first part teaches how to recognize this question on sight: the cue words or the layout.
  - For Reading and Writing, mix question types, not long passages.

### 1.5 Spacing (strong)

- **Finding.** The same practice spread across days beats one sitting. The best gap depends on how long the memory must last: about 20 to 40% of the time until the test when the test is a week away, falling to 5 to 10% when it is a year away.
- **Sources.** Cepeda et al. 2006; Cepeda et al. 2008; Dunlosky et al. 2013; Pashler et al. 2007.
- **Rules for Karman.**
  - Treat each lesson as the first exposure. Bring one or two questions of the skill back after two to three days, again after one to two weeks, and again in the last weeks before the test.
  - For a student whose SAT is one to three months away, one to two weeks between reviews is a sensible target.
  - Any question of the skill opens the lesson's "Remember" card in one tap, so a refresher takes seconds.

### 1.6 Words, pictures and Mayer's principles (strong; redundancy mixed)

- **Finding.** People learn more from words with a relevant picture than from words alone, because verbal and visual memory support each other (dual coding). Mayer's research turns this into specific rules, below.
- **Sources.** Paivio 1986; Clark & Paivio 1991; Mayer 2021; Mayer & Moreno 2003; plus the sources in each row.

| Principle           | What the research says                                                                                                                                                                                                            | Rule for Karman                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Coherence           | Interesting but unneeded words, pictures, sounds and music lower learning (Sundararajan & Adesope 2020; Moreno & Mayer 2000).                                                                                                     | No decoration or side story in a teaching step. No music under narration. The painted world stays in the frame, never inside the figure.     |
| Signaling           | Cues that point at what matters help: highlights, arrows, bold key terms, clear headings (Schneider et al. 2018).                                                                                                                 | One highlight color marks what changed in this step. The strategy sentence is bold. A quantity keeps one color in text and figure.           |
| Redundancy          | Printing the narration word for word over a picture can hurt; two- or three-word labels on the picture help (Mayer & Johnson 2008; Trypke et al. 2023).                                                                           | In video, show math and short labels, not sentences. Captions get their own band (section 4).                                                |
| Spatial contiguity  | Words placed next to the part of the picture they describe beat words placed apart (Ginns 2006; Schroeder & Cenkci 2018).                                                                                                         | Labels go on the graph, not in a legend. On a phone, the figure stays pinned above the step text.                                            |
| Temporal contiguity | Say it while you show it (Ginns 2006; Mayer 2021).                                                                                                                                                                                | Each drawn element appears as the narrator names it. In lessons, a step's text and its figure change together.                               |
| Segmenting          | Chunks the learner moves through beat one continuous stream (Rey et al. 2019; Spanjers et al. 2012).                                                                                                                              | One step per tap in lessons. Chapters and short pauses at step ends in video.                                                                |
| Pre-training        | Learning key terms first makes the main explanation easier to follow (Mayer, Mathias & Wetzell 2002).                                                                                                                             | "Key words" (at most three) before the big idea, plus one line linking a lesson it builds on.                                                |
| Modality            | Spoken words with a picture beat printed words with a picture, mainly when the video sets the pace (Ginns 2005).                                                                                                                  | Video: narrate, do not print. Lessons are self-paced, so short written text is fine there.                                                   |
| Personalization     | A conversational style ("you", "let's") beats a formal one (Ginns, Martin & Marsh 2013).                                                                                                                                          | Write to one student. Use "you" and contractions. No textbook voice.                                                                         |
| Voice               | A natural voice beats a robotic one (Mayer, Sobko & Mautone 2003); good modern synthetic voices teach as well as human ones (Craig & Schroeder 2017).                                                                             | Use the most natural VoiceStudio voices and check that every math word is read correctly.                                                    |
| Dynamic drawing     | Watching a figure being drawn can beat seeing it finished, largely through signaling, segmenting and timing; in one experiment the gain disappeared when no hand was shown (Fiorella & Mayer 2016; Mayer, Fiorella & Stull 2020). | Build each figure stroke by stroke as it is explained. A small moving pen tip may stand in for the hand (untested, so check it in our data). |

### 1.7 Cognitive load and the expertise reversal effect (strong)

- **Finding.** Working memory holds only a few new pieces at once. Load comes from the topic itself (intrinsic: how many pieces must be handled together, called element interactivity) and from poor design (extraneous). Help that beginners need, such as full examples and a reason for every step, becomes dead weight for strong students and can even lower their learning. This is the expertise reversal effect.
- **Sources.** Sweller 1988; Sweller, van Merriënboer & Paas 2019; Pollock, Chandler & Sweller 2002; Kalyuga et al. 2003; Kalyuga 2007; Kalyuga & Sweller 2004; Salden et al. 2010.
- **Rules for Karman.**
  - One skill, one strategy, one lesson. No side trips.
  - For skills where many pieces interact (Systems in context, Nonlinear systems, Notes: writing for a goal), teach the pieces one at a time first, then together.
  - Cut extraneous load: the problem stays visible while steps change, nobody scrolls back to find it, and no new vocabulary is taught in the same lesson as a new method.
  - Offer "Take the quiz" at the top. Better still, open with one optional real-format question to try first: if it is right, offer the jump; if the student then misses quiz items, send them to the matching lesson part. A short first-step test can predict skill well (correlations up to .92 with full tests).
  - Make extra help fold away ("Show why", "Show all steps") instead of forcing it on everyone.
  - In the video, chapters let strong students jump to the hardest question.

### 1.8 Feedback (strong)

- **Finding.** Feedback that explains beats feedback that only marks right or wrong. In computer-based learning, explanations had an average effect of 0.49, showing the correct answer 0.32, and right-or-wrong alone 0.05. Explaining also helps when the student was right but unsure. Immediate feedback suits a new method; later spaced practice adds the benefits of delay.
- **Sources.** Hattie & Timperley 2007; Shute 2008; Van der Kleij, Feskens & Eggen 2015; Butler, Karpicke & Roediger 2008; Kulik & Kulik 1988; Attali 2015.
- **Rules for Karman.**
  - Show feedback at once after every check and quiz answer, right or wrong.
  - Start with the answer they picked: name the mistake that leads there, using the lesson's trap name.
  - Then say in one line why the right answer works, naming the strategy step.
  - Refer to choices by their words or values, never by letter. Answers are shuffled.
  - Quick check: one more try after a hint, then the answer (extra tries with hints helped on later similar problems). Strategy quiz: one try, then the explanation.
  - Praise the move, not the person. Never "Great job!" with nothing else.

### 1.9 Errors as learning: common traps (moderate)

- **Finding.** Mistakes followed by a clear correction are well remembered, especially confident ones. Finding and fixing errors in worked examples builds understanding, mostly once students know the basic method; beginners need the error pointed out. In one study the gain showed up a week later, not right away. Correct examples still come first: in math they give the bigger gain.
- **Sources.** Metcalfe 2017; Große & Renkl 2007; Booth et al. 2013; McLaren, Adams & Mayer 2015; Barbieri et al. 2023.
- **Rules for Karman.**
  - Every lesson has a "Traps" part with two or three named traps taken from real errors: Mistake Log data, the most-picked wrong answers in the bank, tutor notes. Each trap says what it looks like, why it tempts, and how to catch it.
  - After the correct examples, show one wrong solution by a made-up student, clearly marked as containing a mistake. Ask which step went wrong.
  - One name per trap everywhere: lesson, wrong choices, explanations, video.
  - Never show an error without the fix right after it.

## 2. The lesson template

### What strong products and students show

- **Khan Academy's SAT lessons** follow a fixed skeleton: what the question type is and what it builds on; "how do I" parts with short videos; examples with tap-to-reveal steps; guided "Try it" problems with blanks to fill (faded examples); "Your turn" practice; and a "Things to remember" recap.
- **Brilliant** often asks a question before showing a method, keeps one idea per screen, starts with the simplest useful case, answers each attempt at once, removes support during practice, and ends each lesson with a skill check.
- **Duolingo's grammar lessons** open with a short tip that stays one tap away, add no new vocabulary at the same time, run from easy to hard, and show a short "Smart Tip" right after a specific mistake. Duolingo reports fewer repeat errors (its own data).
- **SAT students on Reddit** complain most about explanations that restate the answer without showing where their reasoning failed. They trust practice that looks like the real test and distrust content that is much easier, harder or different. Some say videos alone do not stick until they practice. One post on calculator videos points out that shortcuts are not always faster; the real skill is choosing quickly which way to go. Reading and Writing students recommend hunting for the flaw in each wrong choice.

### Order and length

| Part (on-screen heading)     | What goes in it                                                                                         | Target           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------- |
| 1. Title                     | Skill name, time ("About 8 minutes"), "Start" and "Take the quiz"                                       | 1 line           |
| 2. Question type             | What the SAT asks, how to spot it, and one real-format question to try first (optional, no score)       | 40 to 70 words   |
| 3. Key words (optional)      | At most three terms, one plain line each; a link to a lesson it builds on                               | 45 words or less |
| 4. Big idea                  | The strategy in one bold sentence, then two to four numbered moves; a figure only if it carries meaning | 50 to 100 words  |
| 5. Example                   | Fully worked; one step per tap; each step has a label, the move and the reason; one "Why?" tap prompt   | 80 to 150 words  |
| 6. Your turn                 | Partly worked; the student does the last step or two before each is shown                               | 60 to 120 words  |
| 7. Traps                     | Two or three named traps, each with a mini example and the fix; one marked wrong solution               | 25 to 50 each    |
| 8. Calculator or Reading tip | When the tip saves time, how to do it, and when not to bother                                           | 30 to 80 words   |
| 9. Check                     | One new problem, instant feedback, one retry after a hint                                               | 1 question       |
| 10. Remember                 | Three bullets: the moves and the top trap; also saved as the skill's refresher card                     | 40 words or less |
| 11. Strategy quiz            | Section 3                                                                                               | 5 or fewer       |

- Total lesson text: 500 to 900 words, not counting question text. That is about 6 to 10 minutes, or about 15 with the quiz.
- Worked examples: two (full, then faded), plus the check. For skills where many pieces interact, use three: two full ones with different surfaces, then the faded one.
- Reading and Writing grammar skills follow the founder's explanation order: the rule in one plain sentence, a test that works on any sentence, then the examples.
- Write calculator tips for the graphing calculator students get on test day, and try each tip in Karman's calculator.

### Revealing steps

- A "Next step" button reveals one step. Earlier steps stay visible but dimmed; the new step is highlighted, and the figure changes with it.
- In "Your turn", the student acts (taps or types) before the step appears. A wrong try gets a hint, then a second try, then the step with its reason.
- "Show all steps" is always available for strong students. Nothing advances on a timer.

### Pictures

- Use a figure only when it carries meaning: a graph, a number line, a table with the needed cell marked, a geometry figure, or a sentence with its parts bracketed and colored.
- Test each figure: would the step be harder to follow without it? If not, cut it.
- At most one figure per step. Labels on the figure. The same color means the same thing all lesson long.
- Draw in code. No stock art, no AI images, no decoration inside the teaching area.

### On a phone

- One step per screen: about 60 words at most, plus an optional figure.
- The problem stays pinned at the top and can fold to one line.
- A figure takes at most about 40% of the screen height. The "Next" button sits at the bottom, within thumb reach.
- Body text at least 16 px, math at least 18 px. Answer buttons are full width and at least 44 px tall.
- No sideways scrolling. Break long equations at the equals sign or shrink them slightly; never cut inside an expression.
- No hover-only content. With reduced motion on, steps fade in instead of sliding.
- On desktop, the figure sits on the left and the steps on the right, still one step at a time.
- Keep text short and chunked: people understand informational text a little less on screens than on paper, more so when rushed (Delgado et al. 2018).

### Reading level

- Aim for a tenth grader or lower (Flesch-Kincaid grade 8 to 10) for lesson text. SAT sample passages are exempt: they must match the test.
- Sentences average 15 words or fewer, and none runs over 25. One idea per sentence.
- Define each term on first use, then keep using the same word for the same thing.
- No idioms; many students are still learning English. Write numbers as digits.
- Keep problem setups short. Longer, wordier math problems lower scores, more for some groups of students (Walkington, Clinton & Shivraj 2018).
- American spelling ("practice"). Calm, plain and honest: say "usually" when a shortcut does not always work.

## 3. The strategy quiz

The quiz practices choosing and using the lesson's strategy. It does not test the lesson's wording. It plugs into `strategyQuizFor(skillId)`: at most five items, each `{ text, choices, right, why, subject }`.

### Five question types, easy to hard

1. **Apply** (easiest): the structure of "Your turn" with a new story and new numbers.
2. **First step**: "What should you do first?" Every choice is a real first move; only one leads to the answer.
3. **Spot the trap**: a made-up student's work or a tempting answer. "Where did the mistake happen?" or "Why is this answer wrong?"
4. **Look-alike**: two similar questions, or one from a neighbor skill. "Which question needs this strategy?" For Math it can be "Is this faster by hand or with the calculator?"
5. **Full SAT question** (hardest): test format, medium to hard, needing the whole strategy.

Keep that order. Early success keeps students going, and simple before complex suits a skill that is still new (Pollock, Chandler & Sweller 2002).

### Writing the choices

- Four choices, like the SAT. Every wrong choice comes from a real mistake, ideally one of the lesson's named traps (Haladyna, Downing & Rodriguez 2002; Gierl et al. 2017).
- If you cannot find three real mistakes, use three choices instead of a filler. Three good choices work about as well as four (Rodriguez 2005).
- All choices plausible, similar in length and form, with no overlap. Number choices go from smallest to largest, as on the SAT; ideally answer shuffling leaves them in that order.
- Exactly one best answer, confirmed by a second solver working alone.
- No clues: the longest choice is not always right, no grammar mismatch with the stem, no "always" or "never" giveaways, and no stem words echoed only in the right answer.

### Example: Percentages

Rows 2 to 4 show two of the three wrong choices.

| #   | Type          | Question                                                                             | Right                                                      | Wrong choices, and the mistake behind each                                                               |
| --- | ------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Apply         | A $40 jacket is 25% off. What is the sale price?                                     | $30                                                        | $10 (found the discount, not the price); $50 (added 25%); $39.75 (took off 25 cents)                     |
| 2   | First step    | A price rises 20%, then falls 20%. What should you do first to find the final price? | Turn each change into a multiplier: 1.2 and 0.8            | Add 20 and subtract 20 (thinks they cancel); find 20% of 20% (stacks the percents)                       |
| 3   | Spot the trap | Leo says the price ends where it started. Why is he wrong?                           | The drop is 20% of the higher price, so it takes away more | The rise is 20% of the higher price (wrong whole); he forgot to divide by 100 (a real slip, but not his) |
| 4   | Look-alike    | Which question asks for a percent change?                                            | Sales went from 50 to 60. By what percent did they grow?   | 60 of 200 students walk. What percent walk? (percent of a total); boys to girls is 3 to 5 (a ratio)      |
| 5   | Full SAT      | After a 15% discount, a bike costs $340. What was the price before the discount?     | $400                                                       | $391 (added 15% of $340); $289 (took 15% off again); $355 (treated 15% as $15)                           |

### Writing the explanation (`why`)

1. **The move:** one sentence naming the strategy step that solves it.
2. **The work:** the one to three key steps (Math), or the exact words in the passage that decide it (Reading and Writing).
3. **The tempting wrong answer:** the mistake that leads there, by its trap name.
4. **Every other wrong answer:** one short line each.

Keep it to about 100 words. Name choices by their words or values, never by letter. If the data shape later allows one line per choice, show the line for the chosen answer first.

Example `why` for question 5: "Work backward from the sale price. After 15% off, $340 is 85% of the original, so the original was 340 ÷ 0.85 = $400. The tempting $391 adds 15% of $340, but the 15% came off the original price, not off $340. $289 takes 15% off a second time. $355 treats 15% as 15 dollars."

### What to avoid

- "All of the above" and "None of the above".
- NOT or EXCEPT in the question. If one is truly needed, put it in bold capitals.
- Trick wording, double negatives, and tiny details that decide the answer by accident.
- Questions about the lesson's own words ("What did we call the second move?").
- Reusing a lesson example with new numbers anywhere except question 1.
- One question that gives away another.
- Calling any question or test "official".

## 4. The video

### Length: 3 to 5 minutes

- In 6.9 million edX viewing sessions, median watch time topped out at about 6 minutes whatever the video's length, and students often stopped before halfway in videos over 9 minutes. In problem walk-throughs they watched 2 to 3 minutes on average, then came back to rewatch and skim (Guo, Kim & Rubin 2014).
- Reviews recommend 6 minutes or less (Brame 2016). Karman's videos sit beside a lesson the student can read instead, so shorter is safer.
- So: aim for about 4 minutes and never more than 5. Add chapters (Teach, Question 1, Question 2, Question 3, Recap) so students can jump and rewatch.

### Pacing

- About 150 to 170 spoken words a minute. In the edX data the average was 156, and faster speakers held attention better. Calm is not slow: brisk sentences, then a pause.
- Pause about half a second to a second after each step, and two seconds after "Pause and try it". Pauses at meaningful breaks help learning from animations (Spanjers et al. 2012).
- Offer speed control (0.75x to 2x) and a 10-second back button. Lectures watched at up to 2x lost little in one study, though that may not hold for technical material (Murphy et al. 2022).
- Never autoplay.

### Narration and animation together

- Write the script first, then the storyboard: one sentence, one visual change.
- Each element appears as the narrator names it, not before and not after.
- Highlight the active part and dim finished steps. One thing moves at a time. Keep the layout still; do not slide things around.
- Show the question as it looks on test day first, then zoom to the part being worked.
- End each question on a still frame with the full solution visible for two to three seconds, so a paused frame works as a worked example.
- Draw strokes in the order a person would write them, with a small pen tip leading the line (an untested stand-in for a hand; see section 1.6).
- No background music under narration; a soft sound at the start and end at most. If Karman the fox appears, keep him to the start and end, or have him point at the step. Never animate him while a step is being explained.

### Captions

- Every video has captions, timed to the spoken words. Captions are an accessibility requirement (WCAG 2.2, criterion 1.2.2). They also serve students watching with the sound off and students still learning English (Mayer, Fiorella & Stull 2020; Gernsbacher 2015).
- Turn them on by default. One tap turns them off, and the choice is remembered.
- Captions sit in their own band under the drawing, never over the math. At most two lines of about 32 to 42 characters each. Captions follow the spoken words, but write math as symbols (x², √) so lines stay short.
- The catch: text over a narrated picture competes for the eyes (Trypke et al. 2023). That is why the drawing carries only short labels and captions never cover it. Track how many students turn captions off and compare their quiz scores.

### Three questions

- Easy, then medium, then real SAT difficulty, each with a different surface.
- Question 2 shows the main trap: the narrator names the tempting answer and shows why it fails.
- Question 3 uses the calculator or reading tip where it truly helps.
- Each question: show it; say "Pause and try it"; solve step by step with labels; name the trap; confirm the answer; give a one-line takeaway.
- For Reading and Writing, allow reading time: show the passage, say "Pause and read it", then highlight the lines that matter before solving.

### Voice

- Calm, warm and conversational: "you", "let's", contractions. Natural, human-like voices only.
- No fake excitement. An "enthusiastic" synthetic voice taught no better than a neutral one (Liew et al. 2023).
- One voice per video. Alternate the calm male and calm female voices across videos, as the founder asked.
- Keep one pronunciation list for every script: "negative" for signs, "minus" for subtraction, "f of x", "x squared", "the square root of".
- Say "on test day", never the name of the College Board's app. Listen to every video in full before it ships.

### Timing plan for a 4-minute video (about 600 words at 160 words a minute, plus pauses)

| Time      | Chapter    | What happens                                                                      | Words |
| --------- | ---------- | --------------------------------------------------------------------------------- | ----- |
| 0:00-0:10 | Open       | Skill name; one sentence on what the question asks and what the student will gain | 25    |
| 0:10-1:00 | Teach      | The big idea as two or three moves, built up on one tiny example                  | 125   |
| 1:00-1:45 | Question 1 | Easy. Pause and try; solve in two or three steps; takeaway                        | 105   |
| 1:45-2:45 | Question 2 | Medium, new surface; the tempting wrong answer and why it fails                   | 145   |
| 2:45-3:45 | Question 3 | SAT level; the calculator or reading tip where it helps                           | 145   |
| 3:45-4:05 | Recap      | The moves and the main trap; "Now try the strategy quiz"                          | 50    |

- 3-minute version: open and recap 15 seconds, teach 40, questions 30, 45 and 50.
- 5-minute version: open and recap 25 seconds, teach 70, questions 50, 70 and 85.
- Reading and Writing videos: add 5 to 10 seconds of reading time per question.

## 5. Checklist

A writer answers yes to every line before a lesson ships.

1. Does the lesson teach one skill and one strategy, with nothing off topic?
2. Is the strategy stated in one bold sentence, followed by two to four numbered moves?
3. Does "Question type" show how to recognize this question on sight?
4. Is the first example fully worked, and does the student finish the second (its last step or two)?
5. Does every step have a two-to-four-word goal label and a reason?
6. Do the examples differ in story, numbers or layout while using the same move?
7. Is there at most one "Why?" prompt per example, answered with a tap?
8. Does "Traps" name two or three real mistakes, each with how to catch it, plus one marked wrong solution?
9. Is every figure needed, labeled in place, drawn in code and free of decoration?
10. Does the tip say when it helps and when it does not?
11. Is the check a new problem with instant, explained feedback and one retry after a hint?
12. Is the lesson text 500 to 900 words, at a tenth-grade level or lower, with sentences averaging 15 words or fewer?
13. Is each term defined once and then used the same way every time?
14. Does every step fit a 375-pixel-wide phone screen with no sideways scrolling and the problem still in view?
15. Can a strong student skip to the quiz, open all steps at once, and jump to any video chapter?
16. Does the strategy quiz have five or fewer questions, easy to hard: apply, first step, spot the trap, look-alike, full SAT question?
17. Does every wrong choice come from a real mistake, with plausible, parallel choices that do not overlap?
18. Does every explanation give the move, then explain every wrong choice (the most tempting first), naming choices by their words?
19. Are "all of the above", "none of the above", NOT or EXCEPT questions and trick wording all absent?
20. Has a second solver, working alone, matched every answer key?
21. Is the video 3 to 5 minutes, with chapters, three questions from easy to SAT level, and a "pause and try it" before each solution?
22. Does each drawn element appear exactly when the narrator names it, with no music under the voice?
23. Are captions on by default, in their own band, clear of the math, and true to the narration (math written as symbols)?
24. Do the lesson, quiz and video avoid calling anything "official" and avoid naming the College Board's app?
25. Has someone clicked through the whole lesson on a phone and on a desktop, and watched the full video with sound?

## 6. Sources

Research:

- Atkinson, R. K., Derry, S. J., Renkl, A., & Wortham, D. (2000). Learning from examples: Instructional principles from the worked examples research. _Review of Educational Research, 70_(2), 181-214.
- Atkinson, R. K., Renkl, A., & Merrill, M. M. (2003). Transitioning from studying examples to solving problems: Effects of self-explanation prompts and fading worked-out steps. _Journal of Educational Psychology, 95_(4), 774-783.
- Attali, Y. (2015). Effects of multiple-try feedback and question type during mathematics problem solving on performance in similar problems. _Computers & Education, 86_, 260-267.
- Barbieri, C. A., Miller-Cotto, D., Clerjuste, S. N., & Chawla, K. (2023). A meta-analysis of the worked examples effect on mathematics performance. _Educational Psychology Review, 35_, 11.
- Berthold, K., Eysink, T. H. S., & Renkl, A. (2009). Assisting self-explanation prompts are more effective than open prompts when learning with multiple representations. _Instructional Science, 37_(4), 345-363.
- Bisra, K., Liu, Q., Nesbit, J. C., Salimi, F., & Winne, P. H. (2018). Inducing self-explanation: A meta-analysis. _Educational Psychology Review, 30_(3), 703-725.
- Booth, J. L., Lange, K. E., Koedinger, K. R., & Newton, K. J. (2013). Using example problems to improve student learning in algebra: Differentiating between correct and incorrect examples. _Learning and Instruction, 25_, 24-34.
- Brame, C. J. (2016). Effective educational videos: Principles and guidelines for maximizing student learning from video content. _CBE—Life Sciences Education, 15_(4), es6.
- Brunmair, M., & Richter, T. (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. _Psychological Bulletin, 145_(11), 1029-1052.
- Butler, A. C., Karpicke, J. D., & Roediger, H. L. (2008). Correcting a metacognitive error: Feedback increases retention of low-confidence correct responses. _Journal of Experimental Psychology: Learning, Memory, and Cognition, 34_(4), 918-928.
- Butler, A. C., & Roediger, H. L. (2008). Feedback enhances the positive effects and reduces the negative effects of multiple-choice testing. _Memory & Cognition, 36_(3), 604-616.
- Catrambone, R. (1998). The subgoal learning model: Creating better examples so that students can solve novel problems. _Journal of Experimental Psychology: General, 127_(4), 355-376.
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. _Psychological Bulletin, 132_(3), 354-380.
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. _Psychological Science, 19_(11), 1095-1102.
- Chi, M. T. H., Bassok, M., Lewis, M. W., Reimann, P., & Glaser, R. (1989). Self-explanations: How students study and use examples in learning to solve problems. _Cognitive Science, 13_(2), 145-182.
- Clark, J. M., & Paivio, A. (1991). Dual coding theory and education. _Educational Psychology Review, 3_(3), 149-210.
- Craig, S. D., & Schroeder, N. L. (2017). Reconsidering the voice effect when learning from a virtual human. _Computers & Education, 114_, 193-205.
- Delgado, P., Vargas, C., Ackerman, R., & Salmerón, L. (2018). Don't throw away your printed books: A meta-analysis on the effects of reading media on reading comprehension. _Educational Research Review, 25_, 23-38.
- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. _Psychological Science in the Public Interest, 14_(1), 4-58.
- Fiorella, L., & Mayer, R. E. (2016). Effects of observing the instructor draw diagrams on learning from multimedia messages. _Journal of Educational Psychology, 108_(4), 528-546.
- Gernsbacher, M. A. (2015). Video captions benefit everyone. _Policy Insights from the Behavioral and Brain Sciences, 2_(1), 195-202.
- Gierl, M. J., Bulut, O., Guo, Q., & Zhang, X. (2017). Developing, analyzing, and using distractors for multiple-choice tests in education: A comprehensive review. _Review of Educational Research, 87_(6), 1082-1116.
- Ginns, P. (2005). Meta-analysis of the modality effect. _Learning and Instruction, 15_(4), 313-331.
- Ginns, P. (2006). Integrating information: A meta-analysis of the spatial contiguity and temporal contiguity effects. _Learning and Instruction, 16_(6), 511-525.
- Ginns, P., Martin, A. J., & Marsh, H. W. (2013). Designing instructional text in a conversational style: A meta-analysis. _Educational Psychology Review, 25_(4), 445-472.
- Große, C. S., & Renkl, A. (2007). Finding and fixing errors in worked examples: Can this foster learning outcomes? _Learning and Instruction, 17_(6), 612-634.
- Guo, P. J., Kim, J., & Rubin, R. (2014). How video production affects student engagement: An empirical study of MOOC videos. _Proceedings of the First ACM Conference on Learning @ Scale_, 41-50.
- Haladyna, T. M., Downing, S. M., & Rodriguez, M. C. (2002). A review of multiple-choice item-writing guidelines for classroom assessment. _Applied Measurement in Education, 15_(3), 309-333.
- Hattie, J., & Timperley, H. (2007). The power of feedback. _Review of Educational Research, 77_(1), 81-112.
- Johnson, C. I., & Mayer, R. E. (2010). Applying the self-explanation principle to multimedia learning in a computer-based game-like environment. _Computers in Human Behavior, 26_(6), 1246-1252.
- Kalyuga, S. (2007). Expertise reversal effect and its implications for learner-tailored instruction. _Educational Psychology Review, 19_(4), 509-539.
- Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). The expertise reversal effect. _Educational Psychologist, 38_(1), 23-31.
- Kalyuga, S., & Sweller, J. (2004). Measuring knowledge to optimize cognitive load factors during instruction. _Journal of Educational Psychology, 96_(3), 558-568.
- Kulik, J. A., & Kulik, C.-L. C. (1988). Timing of feedback and verbal learning. _Review of Educational Research, 58_(1), 79-97.
- Liew, T. W., et al. (2023). I am Alexa, your virtual tutor!: The effects of Amazon Alexa's text-to-speech voice enthusiasm in a multimedia learning environment. _Education and Information Technologies, 28_. https://doi.org/10.1007/s10639-022-11255-6
- Little, J. L., Bjork, E. L., Bjork, R. A., & Angello, G. (2012). Multiple-choice tests exonerated, at least of some charges: Fostering test-induced learning and avoiding test-induced forgetting. _Psychological Science, 23_(11), 1337-1344.
- Marsh, E. J., Roediger, H. L., Bjork, R. A., & Bjork, E. L. (2007). The memorial consequences of multiple-choice testing. _Psychonomic Bulletin & Review, 14_(2), 194-199.
- Mayer, R. E. (2021). _Multimedia learning_ (3rd ed.). Cambridge University Press.
- Mayer, R. E., Fiorella, L., & Stull, A. (2020). Five ways to increase the effectiveness of instructional video. _Educational Technology Research and Development, 68_(3), 837-852.
- Mayer, R. E., & Johnson, C. I. (2008). Revising the redundancy principle in multimedia learning. _Journal of Educational Psychology, 100_(2), 380-386.
- Mayer, R. E., Mathias, A., & Wetzell, K. (2002). Fostering understanding of multimedia messages through pre-training. _Journal of Experimental Psychology: Applied, 8_(3), 147-154.
- Mayer, R. E., & Moreno, R. (2003). Nine ways to reduce cognitive load in multimedia learning. _Educational Psychologist, 38_(1), 43-52.
- Mayer, R. E., Sobko, K., & Mautone, P. D. (2003). Social cues in multimedia learning: Role of speaker's voice. _Journal of Educational Psychology, 95_(2), 419-425.
- McLaren, B. M., Adams, D. M., & Mayer, R. E. (2015). Delayed learning effects with erroneous examples: A study of learning decimals with a web-based tutor. _International Journal of Artificial Intelligence in Education, 25_(4), 520-542.
- Metcalfe, J. (2017). Learning from errors. _Annual Review of Psychology, 68_, 465-489.
- Moreno, R., & Mayer, R. E. (2000). A coherence effect in multimedia learning: The case for minimizing irrelevant sounds in the design of multimedia instructional messages. _Journal of Educational Psychology, 92_(1), 117-125.
- Murphy, D. H., Hoover, K. M., Agadzhanyan, K., Kuehn, J. C., & Castel, A. D. (2022). Learning in double time: The effect of lecture video speed on immediate and delayed comprehension. _Applied Cognitive Psychology, 36_(1), 69-82.
- Paas, F., & van Merriënboer, J. J. G. (1994). Variability of worked examples and transfer of geometrical problem-solving skills: A cognitive-load approach. _Journal of Educational Psychology, 86_(1), 122-133.
- Paivio, A. (1986). _Mental representations: A dual coding approach_. Oxford University Press.
- Pan, S. C., & Rickard, T. C. (2018). Transfer of test-enhanced learning: Meta-analytic review and synthesis. _Psychological Bulletin, 144_(7), 710-756.
- Pashler, H., Bain, P. M., Bottge, B. A., Graesser, A., Koedinger, K., McDaniel, M., & Metcalfe, J. (2007). _Organizing instruction and study to improve student learning_ (NCER 2007-2004). Institute of Education Sciences. https://ies.ed.gov/ncee/WWC/Docs/PracticeGuide/20072004.pdf
- Pollock, E., Chandler, P., & Sweller, J. (2002). Assimilating complex information. _Learning and Instruction, 12_(1), 61-86.
- Renkl, A., & Atkinson, R. K. (2003). Structuring the transition from example study to problem solving in cognitive skill acquisition: A cognitive load perspective. _Educational Psychologist, 38_(1), 15-22.
- Rey, G. D., Beege, M., Nebel, S., Wirzberger, M., Schmitt, T. H., & Schneider, S. (2019). A meta-analysis of the segmenting effect. _Educational Psychology Review, 31_(2), 389-419.
- Rittle-Johnson, B., & Star, J. R. (2007). Does comparing solution methods facilitate conceptual and procedural knowledge? An experimental study on learning to solve equations. _Journal of Educational Psychology, 99_(3), 561-574.
- Rodriguez, M. C. (2005). Three options are optimal for multiple-choice items: A meta-analysis of 80 years of research. _Educational Measurement: Issues and Practice, 24_(2), 3-13.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. _Psychological Science, 17_(3), 249-255.
- Rohrer, D. (2012). Interleaving helps students distinguish among similar concepts. _Educational Psychology Review, 24_(3), 355-367.
- Rohrer, D., Dedrick, R. F., Hartwig, M. K., & Cheung, C.-N. (2020). A randomized controlled trial of interleaved mathematics practice. _Journal of Educational Psychology, 112_(1), 40-52.
- Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning. _Instructional Science, 35_(6), 481-498.
- Salden, R. J. C. M., Aleven, V., Schwonke, R., & Renkl, A. (2010). The expertise reversal effect and worked examples in tutored problem solving. _Instructional Science, 38_(3), 289-307.
- Schneider, S., Beege, M., Nebel, S., & Rey, G. D. (2018). A meta-analysis of how signaling affects learning with media. _Educational Research Review, 23_, 1-24.
- Schroeder, N. L., & Cenkci, A. T. (2018). Spatial contiguity and spatial split-attention effects in multimedia learning environments: A meta-analysis. _Educational Psychology Review, 30_(3), 679-701.
- Shute, V. J. (2008). Focus on formative feedback. _Review of Educational Research, 78_(1), 153-189.
- Spanjers, I. A. E., van Gog, T., Wouters, P., & van Merriënboer, J. J. G. (2012). Explaining the segmentation effect in learning from animations: The role of pausing and temporal cueing. _Computers & Education, 59_(2), 274-280.
- Sundararajan, N., & Adesope, O. (2020). Keep it coherent: A meta-analysis of the seductive details effect. _Educational Psychology Review, 32_(3), 707-734.
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. _Cognitive Science, 12_(2), 257-285.
- Sweller, J., & Cooper, G. A. (1985). The use of worked examples as a substitute for problem solving in learning algebra. _Cognition and Instruction, 2_(1), 59-89.
- Sweller, J., van Merriënboer, J. J. G., & Paas, F. (2019). Cognitive architecture and instructional design: 20 years later. _Educational Psychology Review, 31_(2), 261-292.
- Szpunar, K. K., Khan, N. Y., & Schacter, D. L. (2013). Interpolated memory tests reduce mind wandering and improve learning of online lectures. _Proceedings of the National Academy of Sciences, 110_(16), 6313-6317.
- Trypke, M., Stebner, F., & Wirth, J. (2023). Two types of redundancy in multimedia learning: A literature review. _Frontiers in Psychology, 14_, 1148035.
- Van der Kleij, F. M., Feskens, R. C. W., & Eggen, T. J. H. M. (2015). Effects of feedback in a computer-based learning environment on students' learning outcomes: A meta-analysis. _Review of Educational Research, 85_(4), 475-511.
- van Gog, T., Kester, L., & Paas, F. (2011). Effects of worked examples, example-problem, and problem-example pairs on novices' learning. _Contemporary Educational Psychology, 36_(3), 212-218.
- Walkington, C., Clinton, V., & Shivraj, P. (2018). How readability factors are differentially associated with performance for students of different backgrounds when solving mathematics word problems. _American Educational Research Journal, 55_(2), 362-414.
- W3C (2023). Web Content Accessibility Guidelines (WCAG) 2.2, success criterion 1.2.2, Captions (Prerecorded). https://www.w3.org/TR/WCAG22/#captions-prerecorded

Products and students (read 2026-11-22):

- Khan Academy, SAT Math lesson "Linear inequality word problems". https://www.khanacademy.org/test-prep/v2-sat-math/x0fcc98a58ba3bea7:algebra-medium/x0fcc98a58ba3bea7:linear-inequality-word-problems-medium/a/v2-sat-lesson-linear-inequality-word-problems
- Brilliant, "How Brilliant teaches math and helps understanding stick". https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/
- Duolingo blog (2020), "Language rules: Learning grammar on Duolingo". https://blog.duolingo.com/language-rules-learning-grammar-on-duolingo/
- Duolingo blog (2021), "Duolingo grammar skills improve in 2021". https://blog.duolingo.com/duolingo-grammar-skills-improvements-2021
- Reddit threads: r/digitalSATs on unclear answer explanations (https://www.reddit.com/r/digitalSATs/comments/1qh1e50/); r/Sat on College Board reading explanations (https://www.reddit.com/r/Sat/comments/moco0a/); r/Sat on understanding reading logic (https://www.reddit.com/r/Sat/comments/iqo323/); r/Sat on a tutor advising against Khan Academy (https://www.reddit.com/r/Sat/comments/1e35p3v/); r/Sat on learning the calculator (https://www.reddit.com/r/Sat/comments/1whmvdp/); r/TheSATprep calculator video list (https://www.reddit.com/r/TheSATprep/comments/1wx7gpn/).
