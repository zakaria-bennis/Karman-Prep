# Explanation guide

How every Karman student explanation is written. The generator script uses this as the core of its prompt, and a reviewer uses the checklist at the end. The reasons behind each rule are in `explanation-research-notes.md`. Samples: `audit-out/skill-taxonomy/explanation-samples.md`.

## Who reads it, and what it is for

A high schooler who just answered this question, usually wrong. They read it to find the step where they went off. Then they read it again to make the next question of this skill easy. So every explanation does three things, in this order:

1. Shows the path to the given correct answer, in steps they can check against their own work.
2. Names the slip behind a wrong choice, but only when a real, common slip produces it.
3. Leaves one reusable rule for the next question of this skill.

## Hard rules (all subjects)

1. **Reach the given correct answer exactly.** Same value, same form, same letter. If your work doesn't reach it, don't explain something else. Set `problem` and stop.
2. **Stay on this question.** Use its own numbers, names and words. Never a generic version ("a number", "the variable") when the question has a name for it.
3. **Never restate the question.** It is on screen next to the explanation. Quote only the words or numbers a step uses.
4. **SAT-level methods only.** Algebra, linear, quadratic and exponential functions, systems, ratios, percents, basic statistics and probability, plane geometry, right-triangle trig, circles, and Desmos. No calculus, no matrices, no Vieta formulas by name, no tricks a student wouldn't see in class.
5. **Never mention** the answer key, the model, the solver, "verified", "blind solve", College Board or the source of the question.
6. **Banned words:** simply, just, obviously, clearly, easy, trivially, of course, note that, it is important to.
7. **No openers or recaps.** Don't start with "Let's", "To solve this", or "The answer is C". Don't end by restating the answer. The app already shows the correct answer.
8. **Math notation renders with KaTeX.** Inline math goes in `$...$`. Use `$$...$$` only for a long equation on its own line. Never use `\(...\)`, `sqrt()`, `^` outside `$`, or Unicode `²`. Money is never a bare `$`: write "741 dollars" or `$\$741$`.
9. **One idea per sentence.** Sentences under about 20 words. Plain words. Name a term only if the student needs it again (for example "discriminant"), and say what it means in a few words the first time.
10. **Can't see it, don't guess.** If the question needs a figure or table you weren't given, set `problem` to say so and write nothing else.

## Voice

A calm tutor sitting next to the student. Say "you", use short sentences, and use the present tense. Never sound surprised or impressed, and never blame the student. Wrong-choice lines describe what the student did ("If you solve for $x$ and stop, you get 22."), not a verdict on them.

## Math (multiple choice and student-produced response)

**Shape.** 1-5 numbered steps, an optional Desmos line, wrong-choice lines, and a takeaway.

- **Each step is `Label: work`.** The label is 2-6 words and names the goal of the step, not the arithmetic. Good: "Get the absolute value alone". Bad: "Subtract 1". Never a bare operation (Combine, Reduce, Add, Simplify, Distribute): start with a purpose verb such as Get, Find, Match or Write. The labels together should read like the method for this skill.
- **The work** shows the move in the question's own numbers, in `$...$`. Show each line a student would write. Combine lines a strong student does in their head.
- **Add the why** (a few words, after "because" or a dash) only where a student would ask "why that move?". Examples: why clear fractions with 12, why the x-coefficients must match, why reject a root. Don't explain arithmetic.
- **The last step lands on the answer:** the value, and for multiple choice the letter, as in "so $r = \frac{5}{21}$" or "That is 0.22, choice B."
- **Before the last step,** check what the question asks for. If it asks for $2(x-3)$ or $x - 22$, the steps solve for that, not for $x$.
- **Desmos line** (`desmos`): only when Desmos is truly faster than the algebra. Examples: an intersection, a messy quadratic or system, an equation you can test against the choices with a graph, or a regression. Say exactly what to type and what to read off, in one or two sentences. Otherwise set it to `null`. It sits after the steps, which always show the full algebra too.
- **Wrong choices** (`wrong_choices`, multiple choice only): add a line for a choice only if a specific, common slip produces exactly that value. Redo the slip yourself and confirm it lands on the choice. Write one sentence of 20 words or fewer, saying what the student did. Leave out any choice with no real slip, and use `null` if none qualify. Never write "this may result from a calculation error."
- **Student-produced response:** `wrong_choices` is `null`. If one slip is very common (dropping a negative root, giving a percent as a decimal), put it in `common_slip`, one sentence. Otherwise use `null`. If the answer can be entered in more than one form, the last step can name them: "Enter $5/21$ or $.2380$."
- **Takeaway:** one sentence the student can use on a _different_ question of this skill. It states the rule or the first move. It is not a recap of this answer. Good: "When a question asks for an expression, solve for that expression; don't stop at $x$."

**Length (words, steps + Desmos + takeaway; wrong-choice lines and `common_slip` extra, up to 20 each):** aim for the low end. Difficulty 1-2: about 30-40. Difficulty 3: 25-60. Medium (4-5): 45-90. Hard (6-7): 60-120. Never over 150. Go shorter when the question is one or two moves. A 2-step explanation is fine. Don't pad to reach a minimum.

## R&W reading questions

Covers information and ideas, craft and structure, transitions and rhetorical synthesis.
**Shape:** evidence, then reasoning, then why each wrong choice fails, then the takeaway.

- **`evidence`**: the exact words in the passage that decide the answer, quoted word for word (the script checks they appear in the passage). Use the shortest quote that decides it, one or two short pieces with "…" between them. Each piece must keep its meaning from the passage: never cut a negation (not, neither, nor, no, never) or a qualifier out of the quote. Transitions: the end of the sentence before and the start of the sentence after. Rhetorical synthesis: the goal named in the question, plus the note or notes that meet it.
- **`reasoning`**: 1-3 sentences on how those words lead to the correct choice. Name the relationship (contrast, cause, example, claim and support) when that is what decides it. Words in context: say what the word must mean here, then match it.
- **`wrong_choices`**: one line for **each** wrong choice, 15 words or fewer, giving the specific reason it fails against _this_ passage. For example: "goes beyond the text", "the passage says the opposite: decarcinized groups have few living relatives", or "right topic, but doesn't follow from frog crabs". Don't write "not supported" with no reason.
- **`takeaway`**: one sentence on how to approach this question type next time. Good: "For 'most logically completes', the answer is what the last example shows, not a bigger claim." Not a summary of the passage.

**Length:** evidence + reasoning + takeaway, 35-90 words. Difficulty 1-2: about 45-55. Words in context and easy questions go to the low end.

## R&W grammar questions (Standard English Conventions)

Covers boundaries, punctuation, agreement, verb forms and tense, pronouns, modifiers, and possessives.
**Shape:** rule, test, applied, wrong choices, takeaway.

- **`rule`**: the convention in plain words, one sentence, no jargon the student can't use. Good: "A verb matches its subject, not the closest noun." The rule must hold for every sentence, not only this one. Example: "Each clause needs one main verb; -ing and to-forms cannot be it."
- **`test`**: the check the student runs on any sentence, one sentence. For example: "Cross out everything between the subject and the blank, then read the subject with each verb."
- **`applied`**: the test run on _this_ sentence, with its own words. Show the shortened sentence where that helps: "Such lists … reveal the daily minutiae."
- **`wrong_choices`**: one line for each wrong choice, 15 words or fewer, naming the error first: "comma splice", "'reveals' is singular", "no main verb". Then add a few words of why if the label alone wouldn't help.
- **`takeaway`**: how to spot this trap next time, not the rule again. Good: "Long descriptions between subject and verb are there to hide the subject."

**Length:** rule + test + applied + takeaway, 35-80 words.

## Output schema

Every object also carries `problem: string | null`. It stays null unless rule 1 or 10 stops you, and then every other field is empty or null.

```
math:    { steps: string[1..5], desmos: string|null, wrong_choices: {A?,B?,C?,D?: string}|null,
           common_slip: string|null, takeaway: string }
reading: { evidence: string, reasoning: string, wrong_choices: {three wrong letters: string}, takeaway: string }
grammar: { rule: string, test: string, applied: string, wrong_choices: {three wrong letters: string}, takeaway: string }
```

The app numbers the steps and puts a plain newline between them. Don't write "1." inside a step. The step label is the text before the first ": ".

## Automatic checks (script, before any human sees it)

- The final step contains the key's value (math) and letter (multiple choice), and `wrong_choices` has no key for the correct letter.
- Each piece of an `evidence` quote (split on "…") is found word for word in the passage or question text.
- None of the banned words or pipeline words from rules 5 and 6 appear, and there is no `\(`, `sqrt(`, `²` or bare money `$`.
- Every `$` opens and closes a pair, and the text renders in KaTeX without error.
- Word counts stay inside the limits.

## Reviewer checklist (yes / no; any "no" sends it back)

1. Does it reach the given correct answer exactly, with the right letter?
2. Is every number, name and quote taken from this question, with the question not restated?
3. Is every math step correct when you redo it, using SAT-level methods only?
4. Math: does each step have a goal label, with a "why" wherever a student would ask? Grammar: are the rule and the test stated in plain words?
5. Does each wrong-choice line name a real slip that produces exactly that choice (math), or a specific reason tied to this passage (R&W)?
6. Is the Desmos line there only when it is truly faster, and is it exact enough to follow?
7. Would the takeaway help on a _different_ question of this skill?
8. Is it within the length target, with no filler, openers, recaps or banned words?
9. Does it render cleanly (math in `$...$`, money not a bare `$`)?
10. Could a high schooler who got it wrong find where they went off, without outside help?
