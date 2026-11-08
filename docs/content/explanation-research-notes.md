# Explanation research notes

Written 2026-11-08, before the explanation guide (`explanation-guide.md`). Each finding is followed by what it means for Karman.

## What the research says

**1. Worked examples beat bare answers for novices.** Studying a solved example teaches more than solving cold or seeing only the answer, while the learner is still new to the skill. The benefit fades as skill grows (the expertise reversal effect).
Source: [Worked-example effect (overview)](https://en.wikipedia.org/wiki/Worked-example_effect).
- For us: the student reading an explanation just got it wrong, so for now they are a novice on this skill. Show the full solution path, not only the result.
- For us: the student does not need the textbook background. Expertise reversal also says steps the student can already do should be squeezed together.

**2. Subgoal labels help students carry a method to new problems.** Short labels that name what each group of steps achieves ("Write f in terms of g") help learners solve *new* problems. The labels make the structure visible and invite the student to explain it to themselves.
Sources: [Margulieux & Catrambone 2016](https://eld.bl.uk/catalog/100031120336_0x000001); [why subgoal labels work](https://escholarship.org/content/qt1d80v8hm/qt1d80v8hm.pdf?t=op9xqa).
- For us: every math step opens with a 2-6 word label that names the goal, not the arithmetic. The labels together should read like the method for the whole skill. That is what makes "the next similar question easy" (the founder's brief).

**3. Fading and self-explanation prompts help, but they belong to practice, not to the explanation.** Removing worked steps one by one, and prompting "why does this step work?", both beat a plain example.
Sources: [Renkl & Atkinson, fading](https://typeset.io/pdf/from-example-study-to-problem-solving-smooth-transitions-15tfd8h0l4.pdf); [Atkinson, Renkl & Merrill 2003 and the prompting studies](https://en.wikipedia.org/wiki/Worked-example_effect).
- For us: an explanation is read once, after an attempt. Fading needs a sequence of questions, so it is a job for the practice engine, not for this text.
- For us: we take the cheap part. The "why" in a step, and the takeaway line, prompt the student to explain the step to themselves. No questions put to the reader inside the explanation, since nobody answers them.

**4. Feedback that explains beats right/wrong. It must be specific, and in small pieces.** Elaborated feedback (what, how, why) beats verification alone. Long or vague feedback gets ignored or overwhelms the reader.
Source: [Shute 2008, Focus on Formative Feedback](https://myweb.fsu.edu/vshute/pdf/shute%202008_b.pdf).
- For us: say why the right answer is right *in this question*. Keep each piece short. Steps are separate lines, so a student can find the exact one where they went off.

**5. Naming a real error helps; making one up adds noise.** Studying why a specific wrong step is wrong (incorrect worked examples) builds understanding, mostly for weaker students. It works because the error is one students really make.
Sources: [Booth et al., LearnLab project](https://learnlab.org/research/wiki/index.php/Booth); [What Works Clearinghouse on AlgebraByExample](https://ies.ed.gov/ncee/WWC/Study/92843).
- For us: a wrong-choice line names the exact slip ("You used 1.2g, but 120% *greater* means $g + 1.2g$"). If no common slip produces a choice, write nothing for it. College Board's own "may result from conceptual or calculation errors" is the thing to avoid.

**6. Cut whatever doesn't teach. Don't say the same thing twice.** Learners do better when extra words, side facts and repeated text are removed (coherence and redundancy principles). The effect is largest for low-knowledge learners.
Sources: [Mayer, coherence principle](https://www.cambridge.org/core/books/abs/multimedia-learning/coherence-principle/4E80B70CB76E2166B76E5653EBDE7D3E); [Mayer 2020 principles summary](https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf).
- For us: the question sits on screen right next to the explanation, so never restate it. No openers ("Let's solve this"), no recap at the end, no history of the topic. The takeaway must add a reusable rule, not repeat the last step.

**7. How the best SAT explanations are written.** College Board's official explanations (digital Practice Test 10) start with the correct choice and tie it to the text or the algebra. The good wrong-choice lines name the slip: "translating the graph down, rather than up". Many math wrong choices just say "may result from conceptual or calculation errors". The reasoning is in paragraphs with no step labels.
Source: [SAT Practice Test 10 answer explanations](https://satsuite.collegeboard.org/media/pdf/sat-practice-test-10-answers-digital.pdf).
- For us: keep their discipline. R&W points to the decisive words, math uses the question's own numbers. We beat them with labeled steps, real-slip lines and a takeaway.

## What we have now (bank.jsonl, measured 2026-11-08)

- 11,413 explanations. Median 20 words, 90% under 49 words, 46 empty.
- Math is mostly a compressed chain with no "why": "3 + t/4 = 2t/3 gives 36 + 3t = 8t, so t = 7.2." It is correct, but a student who went off at the first move can't see why you clear fractions with 12.
- Pipeline text has leaked into what students see. 123 say "confirmed by a second blind solve". 51 use a broken R&W template ("best fits the specific evidence... The answer choice 'n epistolary novel...'"). 3 mention the answer key.
- R&W ones are often good one-liners that point at the evidence, but rarely say why a wrong choice fails.
- Math notation is mixed: `\(...\)`, `$...$`, `sqrt(w)`, `x^2`, `x²`. The renderer only takes `$...$` and `$$...$$`.
- The old generator prompt (`scripts/lib/explanation-prompts.mjs`) asked for 2-4 sentences on *every* choice, plus a critic and a repair pass. Its "misconception only when genuine" rule was right. Requiring all four choices pushed it toward filler, and its 3-6 sentence reasoning had no step structure.

## Decisions these notes lead to

1. Math is labeled steps, with "why" only where a student would ask.
2. A wrong-choice line only for a real, named slip. Otherwise leave it out.
3. Always end with a takeaway rule the student can reuse on the next question of this skill.
4. Never restate the question, no filler, short pieces. Most explanations are 40-110 words.
5. R&W: quote the decisive words, then one short reason per wrong choice.
6. All math goes in `$...$`. An automatic check rejects pipeline words (key, model, blind solve).
